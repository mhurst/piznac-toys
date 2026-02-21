const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/collection — list current user's collection
router.get('/', requireAuth, async (req, res) => {
  try {
    const { toylineId, seriesId, search, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { userId: req.userId };
    const figureWhere = {};

    if (toylineId) figureWhere.toyLineId = parseInt(toylineId);
    if (seriesId) figureWhere.seriesId = parseInt(seriesId);
    if (search) figureWhere.name = { contains: search, mode: 'insensitive' };

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
              tags: { include: { tag: true } },
              photos: { orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }] },
              accessories: {
                include: {
                  userStatuses: { where: { userId: req.userId } },
                },
              },
            },
          },
        },
      }),
      prisma.userFigure.count({ where }),
    ]);

    const figures = items.map((uf) => ({
      ...uf.figure,
      tags: uf.figure.tags.map((ft) => ft.tag),
      primaryPhoto: uf.figure.photos.find((p) => p.isPrimary) || uf.figure.photos.find((p) => p.userId === null) || uf.figure.photos[0] || null,
      accessoryCount: uf.figure.accessories.length,
      ownedAccessoryCount: uf.figure.accessories.filter((a) => a.userStatuses.length > 0).length,
      inCollection: true,
      collectionNotes: uf.notes,
      accessories: uf.figure.accessories.map((a) => ({
        ...a,
        owned: a.userStatuses.length > 0,
        userStatuses: undefined,
      })),
    }));

    res.json({
      figures,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / take),
    });
  } catch (err) {
    console.error('Error fetching collection:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/collection/stats — user's collection stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const [ownedFigures, ownedAccessories] = await Promise.all([
      prisma.userFigure.count({ where: { userId: req.userId } }),
      prisma.userAccessory.count({ where: { userId: req.userId } }),
    ]);

    const totalAccessories = await prisma.accessory.count({
      where: {
        figure: {
          collectors: { some: { userId: req.userId } },
        },
      },
    });

    res.json({
      ownedFigures,
      ownedAccessories,
      totalAccessoriesInCollection: totalAccessories,
      completionPercent: totalAccessories > 0
        ? Math.round((ownedAccessories / totalAccessories) * 100)
        : 0,
    });
  } catch (err) {
    console.error('Error fetching collection stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/collection/figures/:figureId — add figure to collection
router.post('/figures/:figureId', requireAuth, async (req, res) => {
  try {
    const figureId = parseInt(req.params.figureId);

    const figure = await prisma.figure.findUnique({ where: { id: figureId } });
    if (!figure) return res.status(404).json({ error: 'Figure not found' });

    const userFigure = await prisma.userFigure.create({
      data: {
        userId: req.userId,
        figureId,
        notes: req.body.notes || null,
      },
    });

    res.status(201).json(userFigure);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Figure already in collection' });
    }
    console.error('Error adding to collection:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/collection/figures/:figureId — remove figure from collection
router.delete('/figures/:figureId', requireAuth, async (req, res) => {
  try {
    const figureId = parseInt(req.params.figureId);

    // Delete related UserAccessory records for this figure's accessories
    const accessories = await prisma.accessory.findMany({
      where: { figureId },
      select: { id: true },
    });
    const accessoryIds = accessories.map((a) => a.id);

    if (accessoryIds.length > 0) {
      await prisma.userAccessory.deleteMany({
        where: {
          userId: req.userId,
          accessoryId: { in: accessoryIds },
        },
      });
    }

    await prisma.userFigure.delete({
      where: {
        userId_figureId: {
          userId: req.userId,
          figureId,
        },
      },
    });

    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Figure not in collection' });
    }
    console.error('Error removing from collection:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/collection/figures/:figureId — update personal notes
router.put('/figures/:figureId', requireAuth, async (req, res) => {
  try {
    const figureId = parseInt(req.params.figureId);

    const updated = await prisma.userFigure.update({
      where: {
        userId_figureId: {
          userId: req.userId,
          figureId,
        },
      },
      data: { notes: req.body.notes || null },
    });

    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Figure not in collection' });
    }
    console.error('Error updating collection notes:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/collection/accessories/:accessoryId — mark accessory as owned
router.post('/accessories/:accessoryId', requireAuth, async (req, res) => {
  try {
    const accessoryId = parseInt(req.params.accessoryId);

    const accessory = await prisma.accessory.findUnique({
      where: { id: accessoryId },
      select: { id: true, figureId: true },
    });
    if (!accessory) return res.status(404).json({ error: 'Accessory not found' });

    // Auto-add figure to collection if not already there
    await prisma.userFigure.upsert({
      where: {
        userId_figureId: {
          userId: req.userId,
          figureId: accessory.figureId,
        },
      },
      update: {},
      create: {
        userId: req.userId,
        figureId: accessory.figureId,
      },
    });

    const userAccessory = await prisma.userAccessory.create({
      data: {
        userId: req.userId,
        accessoryId,
      },
    });

    res.status(201).json(userAccessory);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Accessory already marked as owned' });
    }
    console.error('Error marking accessory owned:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/collection/accessories/:accessoryId — unmark accessory as owned
router.delete('/accessories/:accessoryId', requireAuth, async (req, res) => {
  try {
    const accessoryId = parseInt(req.params.accessoryId);

    await prisma.userAccessory.delete({
      where: {
        userId_accessoryId: {
          userId: req.userId,
          accessoryId,
        },
      },
    });

    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Accessory not marked as owned' });
    }
    console.error('Error unmarking accessory:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
