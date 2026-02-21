/**
 * Parse and validate an integer ID from a string.
 * Returns the parsed integer or null if invalid.
 */
function parseId(value) {
  const id = parseInt(value, 10);
  if (isNaN(id) || id <= 0) return null;
  return id;
}

/**
 * Sanitize error logging — only log message in production, full error in dev.
 */
function logError(label, err) {
  if (process.env.NODE_ENV === 'production') {
    console.error(`${label}:`, err.message);
  } else {
    console.error(`${label}:`, err);
  }
}

module.exports = { parseId, logError };
