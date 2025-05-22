import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Generic rate limiter that can be used across the application
export const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 429,
    message: 'Too many requests, please try again later.'
  },
  // Don't rate limit requests in development mode
  skip: (req) => process.env.NODE_ENV === 'development'
});

// More restrictive limiter for authentication-related endpoints
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 auth requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many authentication attempts, please try again later.'
  },
  skip: (req) => process.env.NODE_ENV === 'development'
});

// Special limiter for resource-intensive operations like heatmap generation
export const heatmapGenerationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 heatmap generations per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many heatmap generation requests, please try again after 5 minutes.'
  },
  skip: (req) => process.env.NODE_ENV === 'development',
  keyGenerator: (req) => {
    // Use user ID from session if available for more granular rate limiting
    return req.user?.id 
      ? `user_${req.user.id}` 
      : req.ip || 'unknown';
  }
});

// Advanced API rate limiter with user-specific quotas
export const apiRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Define rate limits based on user role
  const limits: Record<string, { max: number, windowMs: number }> = {
    'DOCTOR': { max: 1000, windowMs: 60 * 60 * 1000 }, // 1000 requests per hour
    'PATIENT': { max: 500, windowMs: 60 * 60 * 1000 }, // 500 requests per hour
    'ADMIN': { max: 2000, windowMs: 60 * 60 * 1000 }, // 2000 requests per hour
    'default': { max: 100, windowMs: 60 * 60 * 1000 } // 100 requests per hour for unauthenticated
  };

  // Skip in development mode
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  // Get user role from authenticated session
  const userRole = req.user?.role || 'default';
  const { max, windowMs } = limits[userRole] || limits['default'];

  // Apply role-specific rate limiter
  const roleLimiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 429,
      message: `Rate limit exceeded for your account level. Please try again later.`
    },
    keyGenerator: (req) => {
      return req.user?.id 
        ? `user_${req.user.id}` 
        : req.ip || 'unknown';
    }
  });

  return roleLimiter(req, res, next);
};