/**
 * Rate Limiting Middleware
 * Provides configurable rate limiting per route category
 */

const rateLimitMap = new Map();

// Rate limit configurations per route category
const RATE_LIMITS = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts, please try again later',
  },
  hr: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: 'Too many HR requests, please slow down',
  },
  attendance: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute (bulk operations)
    message: 'Too many attendance requests, please slow down',
  },
  default: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests, please slow down',
  },
};

/**
 * Create rate limiter middleware
 * @param {string} category - Rate limit category (auth, hr, attendance, default)
 * @returns {Function} Express middleware
 */
const rateLimiter = (category = 'default') => {
  const config = RATE_LIMITS[category] || RATE_LIMITS.default;
  
  return (req, res, next) => {
    const key = `${category}:${req.ip}:${req.user?.id || 'anonymous'}`;
    const now = Date.now();
    
    // Get or create rate limit entry
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, {
        count: 0,
        resetTime: now + config.windowMs,
      });
    }
    
    const entry = rateLimitMap.get(key);
    
    // Reset if window expired
    if (now > entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + config.windowMs;
    }
    
    // Check limit
    if (entry.count >= config.max) {
      return res.status(429).json({
        error: config.message,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      });
    }
    
    // Increment count
    entry.count++;
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));
    
    next();
  };
};

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

module.exports = {rateLimiter, RATE_LIMITS};
