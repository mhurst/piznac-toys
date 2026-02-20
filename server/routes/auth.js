const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { JWT_SECRET, requireAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const admin = await prisma.admin.findUnique({ where: { email } });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, admin.password);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ adminId: admin.id }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, email: admin.email });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/profile — get current admin info (requires auth)
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({ where: { id: req.adminId } });
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    res.json({ id: admin.id, email: admin.email });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/profile — update email and/or password (requires auth)
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    const admin = await prisma.admin.findUnique({ where: { id: req.adminId } });
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    // Must provide current password to make any changes
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required' });
    }

    const valid = await bcrypt.compare(currentPassword, admin.password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const data = {};

    if (email && email !== admin.email) {
      data.email = email;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }
      data.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(data).length === 0) {
      return res.json({ message: 'No changes made', email: admin.email });
    }

    const updated = await prisma.admin.update({
      where: { id: req.adminId },
      data,
    });

    // Issue a fresh token in case email changed
    const token = jwt.sign({ adminId: updated.id }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ message: 'Profile updated', email: updated.email, token });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
