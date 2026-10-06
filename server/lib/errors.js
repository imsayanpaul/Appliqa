const isProduction = process.env.NODE_ENV === 'production';

// User-safe description of an unexpected error. Raw messages (database
// details, upstream API responses) are only exposed outside production.
const publicMessage = (error) => {
  const status = error?.status || error?.statusCode;
  if (status === 429 || /quota|rate limit|resource.?exhausted/i.test(error?.message || '')) {
    return 'The service is busy right now. Please try again in a minute.';
  }
  if (!isProduction && error?.message) return error.message;
  return 'Something went wrong on our end. Please try again.';
};

// Log the full error server-side and send a 500 with a safe body
const sendServerError = (res, error, label = 'Internal server error') => {
  console.error(`${label}:`, error);
  res.status(500).json({ error: label, message: publicMessage(error) });
};

module.exports = { publicMessage, sendServerError };
