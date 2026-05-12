
import {
  CATEGORY_QUERY_DEFAULTS,
} from './category.constants';
import {
  ICategoryDocument,
  ICategoryQuery,
  ICreateCategoryPayload,
  IUpdateCategoryPayload,
} from './category.interface';
import Category from './category.models';
import { normalizeCategoryName } from './category.utils';
import AppError from '../../errorHelpers/AppError';
import { HTTP_STATUS } from '../../utils/HTTP_STATUS_CODE';

// ─────────────────────────────────────────────────────────────────────────────
// Creates a user-defined custom category.
// ─────────────────────────────────────────────────────────────────────────────
const createCategory = async (
  userId: string,
  payload: ICreateCategoryPayload,
): Promise<ICategoryDocument> => {

  const normalizedName = normalizeCategoryName(payload?.name);

  const existingSystemCategory = await Category.findOne({
    name: normalizedName,
    isSystem: true,
    isActive: true,
  });

  if (existingSystemCategory) {
    throw new AppError(
      HTTP_STATUS.CONFLICT,
      'This category already exists as a system category'
    );
  }
  const existingUserCategory = await Category.findOne({
    name: normalizedName,
    userId: userId,
    isSystem: false,
    isActive: true,
  });

  if (existingUserCategory) {
    throw new AppError(
      HTTP_STATUS.CONFLICT,
      'You already created this category'
    );
  }

  const category = await Category.create({
    userId,
    ...payload,
    isSystem: false, // users can never create system categories
  });

  return category;
};

// ─────────────────────────────────────────────────────────────────────────────
// Returns all categories visible to a user:
//   • Their own custom categories (userId matches)
//   • System categories (isSystem === true / userId === null)
// ─────────────────────────────────────────────────────────────────────────────
const getAllCategories = async (
  userId: string,
  query: ICategoryQuery,
): Promise<{ data: ICategoryDocument[]; total: number }> => {
  const {
    type,
    isActive,
    includeSystem = true,
    page = CATEGORY_QUERY_DEFAULTS.PAGE,
    limit = CATEGORY_QUERY_DEFAULTS.LIMIT,
  } = query;

  const sanitisedLimit = Math.min(limit, CATEGORY_QUERY_DEFAULTS.MAX_LIMIT);
  const skip = (page - 1) * sanitisedLimit;

  // Build filter: always scope to the requesting user OR system-wide.
  const filter: Record<string, unknown> = {
    $or: [
      { userId },
      ...(includeSystem ? [{ isSystem: true }] : []),
    ],
  };

  if (type) filter.type = type;

  // Only filter by isActive when explicitly requested.
  // Default: return both active and inactive so users can manage their list.
  if (isActive !== undefined) filter.isActive = isActive;

  const [data, total] = await Promise.all([
    Category.find(filter)
      .sort({ isSystem: -1, name: 1 }) // system first, then alphabetical
      .skip(skip)
      .limit(sanitisedLimit)
      .lean<ICategoryDocument[]>(),
    Category.countDocuments(filter),
  ]);

  return { data, total };
};

// ─────────────────────────────────────────────────────────────────────────────
// Fetches a single category, verifying the requester has read access.
// System categories are readable by anyone; custom categories only by owner.
// ─────────────────────────────────────────────────────────────────────────────
const getCategoryById = async (
  categoryId: string,
  userId: string,
): Promise<ICategoryDocument> => {
  const canAccess = await Category.isOwnerOrSystem(categoryId, userId);

  // Non-system category belongs to a different user — deny read.
  if (!canAccess) {
    throw new AppError(HTTP_STATUS.FORBIDDEN, 'Access to this category is forbidden');
  }

  const category = await Category.findById(categoryId).lean<ICategoryDocument>();
  if (!category) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Category not found');
  }

  return category;
};

// ─────────────────────────────────────────────────────────────────────────────
// Updates a user-owned category.  System categories are immutable by design —
// mutations would silently break analytics for all other users who share them.
// ─────────────────────────────────────────────────────────────────────────────
const updateCategory = async (
  categoryId: string,
  userId: string,
  payload: IUpdateCategoryPayload,
): Promise<ICategoryDocument> => {

  const canAccess = await Category.isOwnerOrSystem(categoryId, userId);

  if (!canAccess) {
    throw new AppError(HTTP_STATUS.FORBIDDEN, 'You do not have permission to update this category');
  }
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Category not found');
  }

  // Immutability guard for system categories.
  if (category.isSystem) {
    throw new AppError(
      HTTP_STATUS.FORBIDDEN,
      'System categories cannot be modified',
    );
  }

  // Ownership guard for custom categories.
  // if (!category.userId?.equals(userId)) {
  //   throw new AppError(
  //     HTTP_STATUS.FORBIDDEN,
  //     'You do not have permission to update this category',
  //   );
  // }

  // Apply only the provided fields — partial update (PATCH semantics).
  Object.assign(category, payload);
  await category.save();

  return category;
};

// ─────────────────────────────────────────────────────────────────────────────
// deleteCategory
// Soft-deletes by setting isActive = false.
// ─────────────────────────────────────────────────────────────────────────────
const deleteCategory = async (
  categoryId: string,
  userId: string,
): Promise<void> => {

  const canAccess = await Category.isOwnerOrSystem(categoryId, userId);

  if (!canAccess) {
    throw new AppError(HTTP_STATUS.FORBIDDEN, 'You do not have permission to delete this category');
  }
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Category not found');
  }

  if (category.isSystem) {
    throw new AppError(
      HTTP_STATUS.FORBIDDEN,
      'System categories cannot be deleted',
    );
  }

  // if (!category.userId?.equals(userId)) {
  //   throw new AppError(
  //     HTTP_STATUS.FORBIDDEN,
  //     'You do not have permission to delete this category',
  //   );
  // }

  // Soft delete — set inactive, do not remove the document.
  category.isActive = false;
  await category.save();
};

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────
export const categoryService = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};