const { supabase } = require('../lib/supabase');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Auth error:', error?.message);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Attach complete user object (id, email, metadata) to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Middleware error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

module.exports = requireAuth;
