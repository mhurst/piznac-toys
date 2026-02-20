const express = require('express');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const { upload, setPrefix, optimizeImages } = require('../middleware/upload');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/photos/upload/:figureId — upload photos (admin)
router.post('/upload/:figureId', requireAuth, setPrefix('figure'), upload.array('photos', 10), optimizeImages, async (req, res) => {
  try {
    const figureId = parseInt(req.params.figureId);

    const figure = await prisma.figure.findUnique({
      where: { id: figureId },
      include: { photos: true },
    });

    if (!figure) {
      for (const file of req.files) {
        fs.unlinkSync(file.path);
      }
      return res.status(404).json({ error: 'Figure not found' });
    }

    const hasPhotos = figure.photos.length > 0;

    const photos = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const photo = await prisma.photo.create({
        data: {
          filename: file.filename,
          isPrimary: !hasPhotos && i === 0,
          figureId,
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

// PUT /api/photos/:id/primary — set as primary photo (admin)
router.put('/:id/primary', requireAuth, async (req, res) => {
  try {
    const photoId = parseInt(req.params.id);

    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
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

// DELETE /api/photos/:id — delete photo (admin)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const photo = await prisma.photo.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', photo.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (photo.isPrimary) {
      const nextPhoto = await prisma.photo.findFirst({
        where: { figureId: photo.figureId, id: { not: photo.id } },
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
