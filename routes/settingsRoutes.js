const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const ActivityLog = require('../models/ActivityLog');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get settings
// @route   GET /api/settings
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Update settings
// @route   PUT /api/settings
// @access  Private/Admin
router.put('/', protect, admin, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    settings.siteName = req.body.siteName !== undefined ? req.body.siteName : settings.siteName;
    settings.allowRegistration = req.body.allowRegistration !== undefined ? req.body.allowRegistration : settings.allowRegistration;
    settings.maxUsersLimit = req.body.maxUsersLimit !== undefined ? req.body.maxUsersLimit : settings.maxUsersLimit;
    settings.maintenanceMode = req.body.maintenanceMode !== undefined ? req.body.maintenanceMode : settings.maintenanceMode;
    settings.sessionTimeout = req.body.sessionTimeout !== undefined ? req.body.sessionTimeout : settings.sessionTimeout;

    await settings.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'SETTINGS_UPDATE',
      details: 'Admin updated system settings',
      ipAddress: req.ip
    });

    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
