const express = require('express');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { upload, setPrefix, optimizeImagesAt, UPLOADS_DIR } = require('../middleware/upload');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/users — list all users with figure counts (admin only)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        avatar: true,
        bio: true,
        createdAt: true,
        _count: { select: { collection: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(users);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:id/collection — public collection
router.get('/:id/collection', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { toylineId, search, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const where = { userId };
    const figureWhere = {};

    if (toylineId) figureWhere.toyLineId = parseInt(toylineId);
    if (search) figureWhere.name = { contains: search };

    if (Object.keys(figureWhere).length > 0) {
      where.figure = figureWhere;
    }

    const [items, total] = await Promise.all([
      prisma.userFigure.findMany({
        where,
        skip,
        take,
        orderBy: { figure: { name: 'asc' } },
        include: {
          figure: {
            include: {
              series: { select: { name: true } },
              toyLine: { select: { name: true, slug: true } },
              photos: { where: { isPrimary: true }, take: 1 },
              _count: { select: { accessories: true } },
            },
          },
        },
      }),
      prisma.userFigure.count({ where }),
    ]);

    const figures = items.map((uf) => ({
      ...uf.figure,
      primaryPhoto: uf.figure.photos[0] || null,
      accessoryCount: uf.figure._count.accessories,
    }));

    res.json({
      figures,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / take),
    });
  } catch (err) {
    console.error('Get user collection error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:id — public profile
router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      select: {
        id: true,
        name: true,
        avatar: true,
        bio: true,
        createdAt: true,
        _count: { select: { collection: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Get user profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/:id/role — change user role (admin only)
router.put('/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const userId = parseInt(req.params.id);

    if (!['ADMIN', 'MEMBER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Guard against demoting the last admin
    if (role !== 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      const target = await prisma.user.findUnique({ where: { id: userId } });
      if (target && target.role === 'ADMIN' && adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot demote the last admin' });
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, name: true, role: true, active: true },
    });
    res.json(user);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    console.error('Update role error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/:id/status — enable/disable user (admin only)
router.put('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { active } = req.body;
    const userId = parseInt(req.params.id);

    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'active must be a boolean' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { active },
      select: { id: true, email: true, name: true, role: true, active: true },
    });
    res.json(user);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/:id — delete user (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (userId === req.userId) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Clean up avatar file
    if (user.avatar) {
      const avatarPath = path.join(UPLOADS_DIR, user.avatar);
      if (fs.existsSync(avatarPath)) fs.unlinkSync(avatarPath);
    }

    await prisma.user.delete({ where: { id: userId } });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/avatar — upload avatar (authenticated)
router.post('/avatar', requireAuth, setPrefix('avatar'), upload.single('avatar'), optimizeImagesAt(300), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Delete old avatar file
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user && user.avatar) {
      const oldPath = path.join(UPLOADS_DIR, user.avatar);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: { avatar: req.file.filename },
      select: { avatar: true },
    });

    res.json({ avatar: updated.avatar });
  } catch (err) {
    console.error('Upload avatar error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/avatar — remove own avatar (authenticated)
router.delete('/avatar', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user && user.avatar) {
      const avatarPath = path.join(UPLOADS_DIR, user.avatar);
      if (fs.existsSync(avatarPath)) fs.unlinkSync(avatarPath);
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: { avatar: null },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete avatar error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/bio — update own bio (authenticated)
router.put('/bio', requireAuth, async (req, res) => {
  try {
    const { bio } = req.body;

    if (bio && bio.length > 500) {
      return res.status(400).json({ error: 'Bio must be 500 characters or less' });
    }

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: { bio: bio || null },
      select: { bio: true },
    });

    res.json({ bio: updated.bio });
  } catch (err) {
    console.error('Update bio error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
