const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const prefix = req.uploadPrefix || 'file';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${prefix}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Middleware to set the filename prefix before multer runs
function setPrefix(prefix) {
  return (req, res, next) => {
    req.uploadPrefix = prefix;
    next();
  };
}

// Post-upload middleware: optimize images for web and archive originals
async function optimizeImages(req, res, next) {
  // Handle both upload.single() (req.file) and upload.array() (req.files)
  const files = req.files || (req.file ? [req.file] : []);
  if (files.length === 0) return next();

  try {
    for (const file of files) {
      const originalPath = file.path;
      const webpFilename = file.filename.replace(/\.\w+$/, '.webp');
      const webpPath = path.join(UPLOADS_DIR, webpFilename);

      // Read into buffer so the file handle is released
      const buffer = fs.readFileSync(originalPath);

      // Resize + convert to WebP for web use
      await sharp(buffer)
        .rotate()
        .resize(1200, null, { withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(webpPath);

      // Remove the raw upload
      fs.unlinkSync(originalPath);

      // Update file info so downstream code uses the webp version
      file.filename = webpFilename;
      file.path = webpPath;
    }
    next();
  } catch (err) {
    console.error('optimizeImages error:', err);
    res.status(500).json({ error: 'Image processing failed', details: err.message });
  }
}

// Factory version: optimize images at a custom max width
function optimizeImagesAt(maxWidth) {
  return async (req, res, next) => {
    const files = req.files || (req.file ? [req.file] : []);
    if (files.length === 0) return next();

    try {
      for (const file of files) {
        const originalPath = file.path;
        const webpFilename = file.filename.replace(/\.\w+$/, '.webp');
        const webpPath = path.join(UPLOADS_DIR, webpFilename);

        const buffer = fs.readFileSync(originalPath);

        await sharp(buffer)
          .rotate()
          .resize(maxWidth, null, { withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(webpPath);

        fs.unlinkSync(originalPath);

        file.filename = webpFilename;
        file.path = webpPath;
      }
      next();
    } catch (err) {
      console.error('optimizeImagesAt error:', err);
      res.status(500).json({ error: 'Image processing failed', details: err.message });
    }
  };
}

module.exports = { upload, setPrefix, optimizeImages, optimizeImagesAt, UPLOADS_DIR };
