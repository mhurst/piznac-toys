const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { logError } = require('./validate');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const prefix = req.uploadPrefix || 'file';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    // Only allow whitelisted extensions (double-checked here after fileFilter)
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error('Invalid file extension'), false);
    }
    cb(null, `${prefix}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = ALLOWED_MIMETYPES.includes(file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.includes(ext);

  if (mimeOk && extOk) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpg, png, gif, webp) are allowed'), false);
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

function cleanupFiles(files) {
  for (const file of files) {
    try {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch (_) { /* best effort */ }
  }
}

// Post-upload middleware: optimize images for web and archive originals
async function optimizeImages(req, res, next) {
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
        .resize(1200, null, { withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(webpPath);

      fs.unlinkSync(originalPath);

      file.filename = webpFilename;
      file.path = webpPath;
    }
    next();
  } catch (err) {
    cleanupFiles(files);
    logError('optimizeImages error', err);
    res.status(500).json({ error: 'Image processing failed' });
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
      cleanupFiles(files);
      logError('optimizeImagesAt error', err);
      res.status(500).json({ error: 'Image processing failed' });
    }
  };
}

module.exports = { upload, setPrefix, optimizeImages, optimizeImagesAt, UPLOADS_DIR };
