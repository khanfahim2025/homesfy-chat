export function requireApiKey(req, res, next) {
  const apiKey = (req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '') || '').trim();
  const expectedKey = (process.env.WIDGET_CONFIG_API_KEY || '').trim();

  if (!expectedKey || expectedKey === '') {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️  WIDGET_CONFIG_API_KEY not set');
    }
    return next();
  }

  if (!apiKey || apiKey === '') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key required. Provide X-API-Key header or Authorization: Bearer <key>',
    });
  }

  if (apiKey !== expectedKey) {
    // Log mismatch for debugging (but don't expose keys)
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️  API key mismatch:', {
        receivedLength: apiKey.length,
        expectedLength: expectedKey.length,
        keysMatch: apiKey === expectedKey,
        // Don't log actual keys for security
      });
    }
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid API key. The API key provided does not match the server configuration.',
      hint: process.env.NODE_ENV !== 'production' 
        ? 'Check that WIDGET_CONFIG_API_KEY in server .env matches the key in dashboard localStorage' 
        : undefined,
    });
  }

  next();
}

