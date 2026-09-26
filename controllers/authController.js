const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '30d',
    }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required',
      });
    }

    const userExists = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (userExists) {
      return res.status(400).json({
        message: 'User already exists',
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role || 'user',
    });

    await ActivityLog.create({
      user: user._id,
      action: 'REGISTER',
      details: `New user registered: ${user.email}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      phone: user.phone,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('REGISTER ERROR:', error);

    res.status(500).json({
      message: error.message || 'Server error',      error: process.env.NODE_ENV === 'production'
        ? undefined
        : error.message,
    });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    console.log('LOGIN ATTEMPT:', cleanEmail);

    // Find user
    const user = await User.findOne({
      email: cleanEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    // Check active status
    if (user.isActive === false) {
      return res.status(403).json({
        message:
          'Your account has been deactivated. Contact an administrator.',
      });
    }

    // Check password
    const passwordMatch = await user.matchPassword(password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Activity log
    try {
      await ActivityLog.create({
        user: user._id,
        action: 'LOGIN',
        details: `User logged in: ${user.email}`,
        ipAddress: req.ip,
      });
    } catch (activityError) {
      // Do not fail login if activity logging fails
      console.error('ACTIVITY LOG ERROR:', activityError);
    }

    // Generate token
    const token = generateToken(user._id);

    console.log('LOGIN SUCCESS:', user.email);

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      phone: user.phone,
      token,
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error);

    return res.status(500).json({
      message: error.message || 'Server error',      error: process.env.NODE_ENV === 'production'
        ? undefined
        : error.message,
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('GET ME ERROR:', error);

    res.status(500).json({
      message: error.message || 'Server error',    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    if (req.body.name) {
      user.name = req.body.name;
    }

    if (req.body.phone !== undefined) {
      user.phone = req.body.phone;
    }

    if (req.body.email && req.body.email !== user.email) {
      const newEmail = req.body.email.toLowerCase().trim();

      const emailExists = await User.findOne({
        email: newEmail,
        _id: { $ne: user._id },
      });

      if (emailExists) {
        return res.status(400).json({
          message: 'Email already in use',
        });
      }

      user.email = newEmail;
    }

    const updatedUser = await user.save();

    await ActivityLog.create({
      user: user._id,
      action: 'PROFILE_UPDATE',
      details: `User updated profile: ${user.email}`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      profilePicture: updatedUser.profilePicture,
      phone: updatedUser.phone,
    });
  } catch (error) {
    console.error('UPDATE PROFILE ERROR:', error);

    res.status(500).json({
      message: error.message || 'Server error',    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'New password must be at least 6 characters',
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    await ActivityLog.create({
      user: user._id,
      action: 'PASSWORD_CHANGE',
      details: `User changed password: ${user.email}`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('CHANGE PASSWORD ERROR:', error);

    res.status(500).json({
      message: error.message || 'Server error',    });
  }
};

// @desc    Upload profile picture
// @route   PUT /api/auth/profile-picture
// @access  Private
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'Please upload an image file',
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    user.profilePicture = `/uploads/profiles/${req.file.filename}`;

    await user.save();

    await ActivityLog.create({
      user: user._id,
      action: 'PROFILE_PICTURE_UPDATE',
      details: `User updated profile picture: ${user.email}`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      profilePicture: user.profilePicture,
    });
  } catch (error) {
    console.error('PROFILE PICTURE ERROR:', error);

    res.status(500).json({
      message: error.message || 'Server error',    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  changePassword,
  uploadProfilePicture,
};
