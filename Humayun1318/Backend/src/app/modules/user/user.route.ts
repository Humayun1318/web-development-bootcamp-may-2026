import { Router } from 'express';
import { userController } from './user.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { userValidation } from './user.validation';
// import checkAuth from '../../middlewares/checkAuth';


const router = Router();

// ─────────────────────────────────────────────
// Public Routes
// ─────────────────────────────────────────────
router.post('/register', validateRequest(userValidation.registerSchema), userController.register);

// ─────────────────────────────────────────────
// User (Authenticated)
// ─────────────────────────────────────────────
router.get(
    '/me',
    //   checkAuth(UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
    userController.getMe,
);

router.patch(
    '/me',
    //   checkAuth(UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
    validateRequest(userValidation.updateProfileSchema),
    userController.updateProfile,
);

router.patch(
    '/change-password',
    //   checkAuth(UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
    userController.changePassword,
);

router.delete(
    '/me',
    //   checkAuth(UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
    userController.deleteOwnAccount,
);

// ─────────────────────────────────────────────
// Admin Routes
// ─────────────────────────────────────────────
router.get(
    '/',
    //   checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
    userController.getAllUsers,
);

router.get(
    '/:id',
    //   checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
    userController.getUserById,
);

router.patch(
    '/:id/status',
    //   checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
    userController.updateUserStatus,
);

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────
export const userRoutes = router;