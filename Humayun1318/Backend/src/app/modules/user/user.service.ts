import { Types } from 'mongoose';
import {
  USER_QUERY_DEFAULTS,
  UserStatus,
} from './user.constants';
import {
  IChangePasswordPayload,
  IRegisterPayload,
  IUpdateProfilePayload,
  IUserDocument,
  IUserQuery,
} from './user.interface';
import AppError from '../../errorHelpers/AppError';
import User from './user.models';
import { HTTP_STATUS } from '../../utils/HTTP_STATUS_CODE';

// ─────────────────────────────────────────────────────────────────────────────
// register
// ─────────────────────────────────────────────────────────────────────────────
const register = async (
  payload: IRegisterPayload,
) => {
  // Check for duplicate email before hitting the unique index.
  const emailTaken = await User.isEmailTaken(payload.email);
  if (emailTaken) {
    throw new AppError(
      HTTP_STATUS.CONFLICT,
      'An account with this email address already exists',
    );
  }

  // The pre-save hook hashes the password — we pass the plain-text value here.
  const user = await User.create(payload);

  // const tokens: IAuthTokens = {
  //   accessToken: generateAccessToken(user._id, user.role),
  //   refreshToken: generateRefreshToken(user._id),
  // };

  return { user, tokens: null };
};

// ─────────────────────────────────────────────────────────────────────────────
// login
// ─────────────────────────────────────────────────────────────────────────────
// const login = async (
//   payload: ILoginPayload,
// ): Promise<{ user: Omit<IUserDocument, 'password'>; tokens: IAuthTokens }> => {
//   // findByEmail includes .select('+password') — the only place we need the hash.
//   const user = await User.findByEmail(payload.email);

//   // Use a generic error message for both "not found" and "wrong password"
//   // to prevent user enumeration attacks.
//   if (!user) {
//     throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Invalid email or password');
//   }

//   if (!user.isLoginAllowed()) {
//     throw new AppError(
//       HTTP_STATUS.FORBIDDEN,
//       'Your account has been suspended. Please contact support.',
//     );
//   }

//   const passwordMatch = await user.comparePassword(payload.password);
//   if (!passwordMatch) {
//     throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Invalid email or password');
//   }

//   const tokens: IAuthTokens = {
//     accessToken: generateAccessToken(user._id, user.role),
//     refreshToken: generateRefreshToken(user._id),
//   };

//   return { user: sanitiseUser(user.toObject()), tokens };
// };

// ─────────────────────────────────────────────────────────────────────────────
// getMe — fetch the requesting user's own profile
// ─────────────────────────────────────────────────────────────────────────────
const getMe = async (userId: Types.ObjectId): Promise<IUserDocument> => {
  const user = await User.findById(userId);

  if (!user || user.status === UserStatus.DELETED) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'User not found');
  }

  return user;
};

// ─────────────────────────────────────────────────────────────────────────────
// updateProfile
// ─────────────────────────────────────────────────────────────────────────────
const updateProfile = async (
  userId: Types.ObjectId,
  payload: IUpdateProfilePayload,
): Promise<IUserDocument> => {
  const user = await User.findById(userId);

  if (!user || user.status === UserStatus.DELETED) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'User not found');
  }

  Object.assign(user, payload);
  await user.save();

  return user;
};

// ─────────────────────────────────────────────────────────────────────────────
// changePassword
// ─────────────────────────────────────────────────────────────────────────────
const changePassword = async (
  userId: Types.ObjectId,
  payload: IChangePasswordPayload,
): Promise<void> => {
  // Explicitly select password because it has select:false on the schema.
  const user = await User.findById(userId).select('+password');

  if (!user) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'User not found');
  }

  const currentPasswordMatch = await user.comparePassword(payload.currentPassword);
  if (!currentPasswordMatch) {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Current password is incorrect');
  }

  // Assign plain-text — the pre-save hook will hash it before persisting.
  user.password = payload.newPassword;
  await user.save();
};

// ─────────────────────────────────────────────────────────────────────────────
// deleteOwnAccount — soft delete by the user themselves
// ─────────────────────────────────────────────────────────────────────────────
const deleteOwnAccount = async (
  userId: Types.ObjectId,
  password: string,
): Promise<void> => {
  const user = await User.findById(userId).select('+password');

  if (!user) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'User not found');
  }

  // Require password confirmation before soft-deleting the account.
  const match = await user.comparePassword(password);
  if (!match) {
    throw new AppError(
      HTTP_STATUS.UNAUTHORIZED,
      'Password confirmation failed. Account was not deleted.',
    );
  }

  user.status = UserStatus.DELETED;
  await user.save();
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin: getAllUsers
// ─────────────────────────────────────────────────────────────────────────────
const getAllUsers = async (
  query: IUserQuery,
): Promise<{ data: IUserDocument[]; total: number }> => {
  const {
    role,
    status,
    search,
    page = USER_QUERY_DEFAULTS.PAGE,
    limit = USER_QUERY_DEFAULTS.LIMIT,
  } = query;

  const sanitisedLimit = Math.min(limit, USER_QUERY_DEFAULTS.MAX_LIMIT);
  const skip = (page - 1) * sanitisedLimit;

  const filter: Record<string, unknown> = {};

  if (role) filter.role = role;
  if (status) filter.status = status;

  // Search across name and email using a case-insensitive regex.
  // For production scale, replace with a $text index search.
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [data, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(sanitisedLimit)
      .lean<IUserDocument[]>(),
    User.countDocuments(filter),
  ]);

  return { data, total };
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin: getUserById
// ─────────────────────────────────────────────────────────────────────────────
const getUserById = async (userId: string): Promise<IUserDocument> => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'User not found');
  }

  return user;
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin: updateUserStatus — suspend / reactivate / soft-delete
// ─────────────────────────────────────────────────────────────────────────────
const updateUserStatus = async (
  targetUserId: string,
  status: string,
): Promise<IUserDocument> => {
  const user = await User.findById(targetUserId);

  if (!user) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'User not found');
  }

  user.status = status as IUserDocument['status'];
  await user.save();

  return user;
};

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────
export const userService = {
  register,
  getMe,
  updateProfile,
  changePassword,
  deleteOwnAccount,
  getAllUsers,
  getUserById,
  updateUserStatus,
};