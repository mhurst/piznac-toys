const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const { JWT_SECRET, COOKIE_OPTIONS, requireAuth, requireAdmin } = require('../middleware/auth');
const { parseId } = require('../middleware/validate');

const router = express.Router();
const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password validation — enforce on new passwords only (register, change, reset)
function validatePassword(password) {
  if (!password || password.length < 12) {
    return 'Password must be at least 12 characters';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain a lowercase letter';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain an uppercase letter';
  }
  if (!/\d/.test(password)) {
    return 'Password must contain a number';
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return 'Password must contain a special character';
  }
  return null;
}

function setTokenCookie(res, token) {
  res.cookie('token', token, COOKIE_OPTIONS);
}

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.active) {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    setTokenCookie(res, token);

    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/register — register with invite code
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, name, inviteCode } = req.body;

    if (!email || !password || !inviteCode) {
      return res.status(400).json({ error: 'Email, password, and invite code are required' });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const invite = await prisma.invite.findUnique({ where: { code: inviteCode } });

    if (!invite) {
      return res.status(400).json({ error: 'Invalid invite code' });
    }

    if (invite.usedById) {
      return res.status(400).json({ error: 'Invite code already used' });
    }

    if (invite.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invite code has expired' });
    }

    if (invite.email && invite.email !== email) {
      return res.status(400).json({ error: 'Invite code is for a different email' });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
      },
    });

    await prisma.invite.update({
      where: { id: invite.id },
      data: { usedById: user.id },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    setTokenCookie(res, token);

    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/logout — clear auth cookie
router.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ success: true });
});

// GET /api/auth/profile — get current user info
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar, bio: user.bio });
  } catch (err) {
    console.error('Profile error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/profile — update email, name, and/or password
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { email, name, currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required' });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const data = {};

    if (email && email !== user.email) {
      data.email = email;
    }

    if (name !== undefined && name !== user.name) {
      data.name = name || null;
    }

    if (newPassword) {
      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }
      data.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    }

    if (Object.keys(data).length === 0) {
      return res.json({ message: 'No changes made', email: user.email, name: user.name });
    }

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data,
    });

    const token = jwt.sign({ userId: updated.id }, JWT_SECRET, { expiresIn: '24h' });
    setTokenCookie(res, token);

    res.json({ message: 'Profile updated', email: updated.email, name: updated.name });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    console.error('Profile update error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/invites — create invite (admin only)
router.post('/invites', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email } = req.body;

    const code = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await prisma.invite.create({
      data: {
        code,
        email: email || null,
        createdById: req.userId,
        expiresAt,
      },
    });

    res.status(201).json(invite);
  } catch (err) {
    console.error('Create invite error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/invites — list invites (admin only)
router.get('/invites', requireAuth, requireAdmin, async (req, res) => {
  try {
    const invites = await prisma.invite.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        usedBy: { select: { id: true, email: true, name: true } },
      },
    });
    res.json(invites);
  } catch (err) {
    console.error('List invites error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/auth/invites/:id — delete unused invite (admin only)
router.delete('/invites/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });

    const invite = await prisma.invite.findUnique({ where: { id } });
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    if (invite.usedById) return res.status(400).json({ error: 'Cannot delete a used invite' });

    await prisma.invite.delete({ where: { id: invite.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete invite error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/forgot-password — request password reset email
router.post('/forgot-password', strictLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Always return 200 to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    // Generate token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
      },
    });

    // Send email via Resend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

    if (process.env.RESEND_API_KEY) {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.FROM_EMAIL || 'noreply@piznac.com';

      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: 'Piznac Toys - Password Reset',
        html: `<p>You requested a password reset.</p><p><a href="${resetLink}">Click here to reset your password</a></p><p>This link expires in 1 hour.</p><p>If you didn't request this, you can safely ignore this email.</p>`,
      });
    } else {
      console.log('RESEND_API_KEY not set. Reset link:', resetLink);
    }

    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/reset-password — reset password with token
router.post('/reset-password', strictLimiter, async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: 'Email, token, and new password are required' });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    // Find valid (unused, unexpired) reset tokens for this user
    const resets = await prisma.passwordReset.findMany({
      where: {
        userId: user.id,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    // Check each token (they're bcrypt-hashed so we must compare individually)
    let matchedReset = null;
    for (const reset of resets) {
      const valid = await bcrypt.compare(token, reset.token);
      if (valid) {
        matchedReset = reset;
        break;
      }
    }

    if (!matchedReset) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    // Update password and mark token as used
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await prisma.passwordReset.update({
      where: { id: matchedReset.id },
      data: { used: true },
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
