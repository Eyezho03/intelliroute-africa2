const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  uploadAvatar,
  getDrivers,
  getFleetManagers,
  getBusinessUsers
} = require('../controllers/users');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Protect all routes
router.use(protect);

// Get specific user types (available to all authenticated users)
router.get('/drivers', getDrivers);
router.get('/fleet-managers', getFleetManagers);
router.get('/business-users', getBusinessUsers);

// Admin only routes
router.use(authorize('admin'));

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

// Avatar upload
router.put('/:id/avatar', upload.single('avatar'), uploadAvatar);

module.exports = router;
