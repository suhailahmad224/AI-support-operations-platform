const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  updateMyProfile,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const {
  validateCreateUser,
  validateUpdateUser,
  validateUpdateMyProfile,
} = require('../validators/userValidator');

// Profile self-management routes (must precede /:id)
router.get('/profile/me', protect, (req, res, next) => {
  req.params.id = req.user._id.toString();
  return getUserById(req, res, next);
});
router.put('/profile/me', protect, validateUpdateMyProfile, updateMyProfile);

// Admin-only User Management
router.get('/', protect, authorize('admin'), getUsers);
router.post('/', protect, authorize('admin'), validateCreateUser, createUser);

router.get('/:id', protect, getUserById);
router.put('/:id', protect, authorize('admin'), validateUpdateUser, updateUser);
router.patch('/:id/status', protect, authorize('admin'), toggleUserStatus);
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
