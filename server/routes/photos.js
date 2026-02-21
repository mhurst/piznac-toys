const express = require('express');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { upload, setPrefix, optimizeImages } = require('../middleware/upload');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/photos/upload/:figureId — upload photos
// Admin: catalog photos (userId=null), isPrimary logic applies
// Regular user: personal photos (userId=req.userId), must have figure in collection, never primary
router.post('/upload/:figureId', requireAuth, setPrefix('figure'), upload.array('photos', 10), optimizeImages, async (req, res) => {
  try {
    const figureId = parseInt(req.params.figureId);

    const figure = await prisma.figure.findUnique({
      where: { id: figureId },
      include: { photos: { where: { userId: null } } },
    });

    if (!figure) {
      for (const file of req.files) {
        fs.unlinkSync(file.path);
      }
      return res.status(404).json({ error: 'Figure not found' });
    }

    const isAdmin = req.userRole === 'ADMIN';
    const catalogUpload = isAdmin && req.body.catalog === 'true';

    // Non-admin users must have figure in their collection
    if (!isAdmin) {
      const inCollection = await prisma.userFigure.findUnique({
        where: {
          userId_figureId: {
            userId: req.userId,
            figureId,
          },
        },
      });
      if (!inCollection) {
        for (const file of req.files) {
          fs.unlinkSync(file.path);
        }
        return res.status(403).json({ error: 'Figure must be in your collection to upload photos' });
      }
    }

    const hasCatalogPhotos = figure.photos.length > 0;

    const photos = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const photo = await prisma.photo.create({
        data: {
          filename: file.filename,
          isPrimary: catalogUpload && !hasCatalogPhotos && i === 0,
          figureId,
          userId: catalogUpload ? null : req.userId,
        },
      });
      photos.push(photo);
    }

    res.status(201).json(photos);
  } catch (err) {
    console.error('Error uploading photos:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/photos/:id/primary — set as primary photo (admin only, catalog photos only)
router.put('/:id/primary', requireAuth, requireAdmin, async (req, res) => {
  try {
    const photoId = parseInt(req.params.id);

    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
    });
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    if (photo.userId !== null) {
      return res.status(400).json({ error: 'Only catalog photos can be set as primary' });
    }

    await prisma.photo.updateMany({
      where: { figureId: photo.figureId, isPrimary: true },
      data: { isPrimary: false },
    });

    const updated = await prisma.photo.update({
      where: { id: photoId },
      data: { isPrimary: true },
    });

    res.json(updated);
  } catch (err) {
    console.error('Error setting primary photo:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/photos/:id — delete photo
// Admin can delete catalog photos (userId=null)
// Users can delete their own photos (userId=req.userId)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const photo = await prisma.photo.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Authorization check
    if (photo.userId === null) {
      // Catalog photo — admin only
      if (req.userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can delete catalog photos' });
      }
    } else if (photo.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this photo' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', photo.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (photo.isPrimary) {
      const nextPhoto = await prisma.photo.findFirst({
        where: { figureId: photo.figureId, id: { not: photo.id }, userId: null },
      });
      if (nextPhoto) {
        await prisma.photo.update({
          where: { id: nextPhoto.id },
          data: { isPrimary: true },
        });
      }
    }

    await prisma.photo.delete({ where: { id: photo.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting photo:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
