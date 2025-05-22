import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../shared/constants';
import { storage } from '../storage';

// Secret key for signing JWTs
const JWT_SECRET = process.env.JWT_SECRET || 'barogrip-jwt-secret';
// JWT expiration time (default: 24 hours)
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';

// Generate a JWT token for the user
export const generateToken = (userId: number, role: UserRole): string => {
  return jwt.sign(
    { 
      userId, 
      role,
      // Include issuedAt to help with token invalidation
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );
};

// Validate JWT token from the Authorization header
export const validateJWT = async (req: Request, res: Response, next: NextFunction) => {
  // Skip JWT validation if user is already authenticated via session
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number, role: UserRole, iat: number };
    
    // Check if user exists
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token - user not found' });
    }
    
    // Check if token was issued before password was changed (token invalidation)
    if (user.passwordChangedAt) {
      const passwordChangedTimestamp = Math.floor(new Date(user.passwordChangedAt).getTime() / 1000);
      if (decoded.iat < passwordChangedTimestamp) {
        return res.status(401).json({ message: 'Token expired due to password change' });
      }
    }
    
    // Set user on request object
    req.user = user;
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token' });
    } 
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    // For any other errors
    return res.status(500).json({ message: 'Failed to authenticate token' });
  }
};

// Enhanced role-based access control with JWT support
export const hasRoleJWT = (roles: UserRole | UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // If not authenticated via session or JWT
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    const userRole = req.user.role as UserRole;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: 'You do not have permission to access this resource',
        requiredRoles: allowedRoles,
        yourRole: userRole
      });
    }
    
    next();
  };
};

// API key validation for third-party integrations
export const validateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({ message: 'API key is required' });
  }
  
  try {
    // In a real implementation, you would validate the API key against a database
    // This is a simplified example
    const isValid = await storage.validateApiKey(apiKey);
    
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid API key' });
    }
    
    // You can also set user context based on the API key
    const apiKeyData = await storage.getApiKeyData(apiKey);
    if (apiKeyData && apiKeyData.userId) {
      const user = await storage.getUser(apiKeyData.userId);
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    console.error('API key validation error:', error);
    return res.status(500).json({ message: 'Error validating API key' });
  }
};