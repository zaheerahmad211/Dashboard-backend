const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get all activity logs
// @route   GET /api/activity
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const { action, page = 1, limit = 20 } = req.query;
    const query = {};

    if (action && action !== 'all') {
      query.action = action;
    }

    const total = await ActivityLog.countDocuments(query);
    const logs = await ActivityLog.find(query)
      .populate('user', 'name email profilePicture')
      .sort({ timestamp: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      logs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get recent activity (for dashboard widget)
// @route   GET /api/activity/recent
// @access  Private
router.get('/recent', protect, async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .populate('user', 'name email profilePicture')
      .sort({ timestamp: -1 })
      .limit(10);

    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
