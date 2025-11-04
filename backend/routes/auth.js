const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'scrapi-jwt-secret-key-change-in-production';

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, fullName, organization } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      fullName: fullName || '',
      organization: organization || '',
      lastLogin: new Date()
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data without password
    const userData = {
      id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      plan: user.plan,
      usage: user.usage,
      notifications: user.notifications,
      createdAt: user.createdAt
    };

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data without password
    const userData = {
      id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      plan: user.plan,
      usage: user.usage,
      notifications: user.notifications,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };

    res.json({
      message: 'Login successful',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userData = {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      fullName: req.user.fullName,
      plan: req.user.plan,
      usage: req.user.usage,
      notifications: req.user.notifications,
      createdAt: req.user.createdAt,
      lastLogin: req.user.lastLogin
    };

    res.json({ user: userData });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { fullName, username } = req.body;
    const user = req.user;

    if (username && username !== user.username) {
      // Check if username is already taken
      const existingUser = await User.findOne({ username, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      user.username = username;
    }

    if (fullName !== undefined) {
      user.fullName = fullName;
    }

    await user.save();

    const userData = {
      id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      plan: user.plan,
      usage: user.usage
    };

    res.json({
      message: 'Profile updated successfully',
      user: userData
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get user with password
    const user = await User.findById(req.userId);

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash and save new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Generate API token
router.post('/api-tokens', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Token name is required' });
    }

    const user = await User.findById(req.userId);
    
    // Generate unique token
    const token = `scrapi_${uuidv4().replace(/-/g, '')}`;

    user.apiTokens.push({
      name,
      token,
      createdAt: new Date()
    });

    await user.save();

    res.status(201).json({
      message: 'API token created successfully',
      token: {
        name,
        token,
        createdAt: user.apiTokens[user.apiTokens.length - 1].createdAt
      }
    });
  } catch (error) {
    console.error('Generate API token error:', error);
    res.status(500).json({ error: 'Failed to generate API token' });
  }
});

// Get API tokens
router.get('/api-tokens', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    // Return tokens with masked values except for recent ones
    const tokens = user.apiTokens.map(t => ({
      id: t._id,
      name: t.name,
      token: `${t.token.substring(0, 12)}...${t.token.substring(t.token.length - 4)}`,
      createdAt: t.createdAt,
      lastUsed: t.lastUsed
    }));

    res.json({ tokens });
  } catch (error) {
    console.error('Get API tokens error:', error);
    res.status(500).json({ error: 'Failed to get API tokens' });
  }
});

// Delete API token
router.delete('/api-tokens/:tokenId', authMiddleware, async (req, res) => {
  try {
    const { tokenId } = req.params;
    const user = await User.findById(req.userId);

    user.apiTokens = user.apiTokens.filter(t => t._id.toString() !== tokenId);
    await user.save();

    res.json({ message: 'API token deleted successfully' });
  } catch (error) {
    console.error('Delete API token error:', error);
    res.status(500).json({ error: 'Failed to delete API token' });
  }
});

// Update notifications
router.put('/notifications', authMiddleware, async (req, res) => {
  try {
    const { email, platform, actorRuns, billing } = req.body;
    const user = await User.findById(req.userId);

    if (email !== undefined) user.notifications.email = email;
    if (platform !== undefined) user.notifications.platform = platform;
    if (actorRuns !== undefined) user.notifications.actorRuns = actorRuns;
    if (billing !== undefined) user.notifications.billing = billing;

    await user.save();

    res.json({
      message: 'Notification preferences updated successfully',
      notifications: user.notifications
    });
  } catch (error) {
    console.error('Update notifications error:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

module.exports = router;
