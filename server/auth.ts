import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import * as crypto from "crypto";
import { promisify } from "util";
import { authenticator } from "otplib";
import * as qrcode from "qrcode";
import { storage } from "./storage";
import { User as SelectUser } from "../shared/schema";
import { UserRole, SESSION_TIMEOUT_MINUTES, AuditAction } from "../shared/constants";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(crypto.scrypt);

// Password hashing functions
async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // If the stored password is empty or undefined, authentication fails
  if (!stored) {
    console.log("Stored password is empty or undefined");
    return false;
  }

  // If the stored password doesn't have a salt (no dot), compare directly
  if (!stored.includes('.')) {
    console.log("Using direct password comparison");
    return supplied === stored;
  }

  try {
    // Regular hashed password comparison
    const [hashed, salt] = stored.split(".");
    if (!salt) {
      console.log("No salt found in stored password");
      return false;
    }
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return crypto.timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

// Setup authentication for Express
// Middleware for route protection
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}

// Role-based access control middleware
export function hasRole(role: UserRole | UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const roles = Array.isArray(role) ? role : [role];
    const userRole = req.user.role;
    
    if (!roles.includes(userRole as UserRole)) {
      return res.status(403).json({ 
        message: "You don't have permission to access this resource"
      });
    }
    
    next();
  };
}

// Token-based access validation for encrypted resources
export function validateResourceToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: "Resource access token required" });
  }
  
  // In a real implementation, you would validate the token against a database
  // For now, we'll just pass it through
  req.body.accessToken = token;
  next();
}

// 2FA Helper Functions
async function generateTwoFactorSecret(userId: number, email: string): Promise<string> {
  // Generate a unique secret for the user
  const secret = authenticator.generateSecret();
  
  // Store the secret in the database
  await storage.updateUser(userId, {
    twoFactorSecret: secret,
    twoFactorEnabled: false, // Not enabled until verified
    twoFactorBackupCodes: JSON.stringify(generateBackupCodes())
  });
  
  return secret;
}

function generateBackupCodes(count = 10): string[] {
  const codes = [];
  for (let i = 0; i < count; i++) {
    // Generate a random 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}

function generateQRCodeUrl(secret: string, email: string): string {
  const serviceName = 'Barogrip';
  return authenticator.keyuri(email, serviceName, secret);
}

async function verifyTwoFactorToken(secret: string, token: string): Promise<boolean> {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    console.error('Error verifying 2FA token:', error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "barogrip-session-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * SESSION_TIMEOUT_MINUTES, // Convert minutes to milliseconds
      httpOnly: true,
      sameSite: 'lax'
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local strategy - supports both username and email login
  passport.use(
  new LocalStrategy(
    {
      usernameField: "username", // Changed to username to match client
      passwordField: "password",
    },
    async (username, password, done) => {
      try {
        console.log("Attempting to authenticate user:", username);
        
        // Try to find by username first
        let user = await storage.getUserByUsername(username);
        
        // If not found, try to find by email (for backward compatibility)
        if (!user) {
          user = await storage.getUserByEmail(username);
        }
        
        // If still not found, return error
        if (!user) {
          console.log("User not found:", username);
          return done(null, false, { message: "Incorrect username/email or password" });
        }
        
        console.log("User found, comparing passwords");
        console.log("Password from database:", user.password ? "exists" : "missing");
        
        const passwordMatches = await comparePasswords(password, user.password);
        console.log("Password match result:", passwordMatches);
        
        if (!passwordMatches) {
          console.log("Password does not match");
          return done(null, false, { message: "Incorrect username/email or password" });
        }
        
        console.log("Authentication successful for user:", user.username);
        return done(null, user);
      } catch (err) {
        console.error("Authentication error:", err);
        return done(err);
      }
    }
  )
);
  // Serialize and deserialize user
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Authentication routes
  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }

      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(req.body.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already in use" });
      }

      // Create new user
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      // Create profile based on role
      if (req.body.role === "patient") {
        await storage.createPatientProfile({
          userId: user.id,
          age: req.body.age,
          gender: req.body.gender,
          height: req.body.height,
          weight: req.body.weight,
          shoeSize: req.body.shoeSize,
          shoeSizeUnit: req.body.shoeSizeUnit,
          usedOrthopedicInsoles: req.body.usedOrthopedicInsoles,
          hasDiabetes: req.body.hasDiabetes,
          hasHeelSpur: req.body.hasHeelSpur,
          footPain: req.body.footPain,
        });
      } else if (req.body.role === "doctor") {
        await storage.createDoctorProfile({
          userId: user.id,
          specialty: req.body.specialty,
          license: req.body.license,
          hospital: req.body.hospital,
          bio: req.body.bio,
        });
      }

      // Log the user in
      req.login(user, async (err) => {
        if (err) return next(err);

        // Create audit log for registration
        await storage.createAuditLog(
          user.id,
          AuditAction.USER_REGISTER,
          'user',
          user.id.toString(),
          { role: user.role },
          req.ip,
          req.headers['user-agent']
        );

        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", async (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        // Log failed login attempt if we can identify a username
        if (req.body.username) {
          // Try to find the user to log the ID if possible
          const attemptedUser = await storage.getUserByUsername(req.body.username);
          if (attemptedUser) {
            await storage.createAuditLog(
              attemptedUser.id,
              AuditAction.FAILED_LOGIN,
              'user',
              attemptedUser.id.toString(),
              { reason: 'invalid_credentials' },
              req.ip,
              req.headers['user-agent']
            );
          } else {
            // Log with null user ID for non-existent username
            await storage.createAuditLog(
              null,
              AuditAction.FAILED_LOGIN,
              'user',
              'unknown',
              { 
                reason: 'invalid_credentials',
                attempted_username: req.body.username 
              },
              req.ip,
              req.headers['user-agent']
            );
          }
        }
        
        return res.status(401).json({ message: info.message || "Authentication failed" });
      }
      
      // Create a secure session token
      const sessionToken = crypto.randomBytes(64).toString('hex');
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + SESSION_TIMEOUT_MINUTES);
      
      // Update user with session token
      storage.updateUserSession(user.id, sessionToken, expiry)
        .then(async () => {
          req.login(user, async (err) => {
            if (err) return next(err);
            
            // Create audit log for successful login
            await storage.createAuditLog(
              user.id,
              AuditAction.USER_LOGIN,
              'user',
              user.id.toString(),
              { method: 'password' },
              req.ip,
              req.headers['user-agent']
            );
            
            // Return user without password
            const { password, ...userWithoutPassword } = user;
            res.json({
              ...userWithoutPassword,
              sessionTokenExpiry: expiry
            });
          });
        })
        .catch(next);
    })(req, res, next);
  });

  app.post("/api/logout", isAuthenticated, async (req, res, next) => {
    try {
      // Clear the session token in the database
      if (req.user) {
        const userId = req.user.id;
        
        // Create audit log for logout
        await storage.createAuditLog(
          userId,
          AuditAction.USER_LOGOUT,
          'user',
          userId.toString(),
          null,
          req.ip,
          req.headers['user-agent']
        );
        
        await storage.clearUserSession(userId);
      }
      
      // Destroy the session
      req.logout((err) => {
        if (err) return next(err);
        req.session.destroy((err) => {
          if (err) return next(err);
          res.clearCookie('connect.sid');
          res.status(200).json({ message: "Logged out successfully" });
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    // Return user without password
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  // Password reset route
  app.post("/api/forgot-password", async (req, res, next) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);
      
      // Always return success even if email doesn't exist (security best practice)
      if (!user) {
        return res.status(200).json({ message: "If an account with that email exists, a password reset link has been sent." });
      }

      // In a real implementation, you would generate a token, store it, and send an email
      // For now, we'll just acknowledge the request
      res.status(200).json({ 
        message: "If an account with that email exists, a password reset link has been sent."
      });
    } catch (error) {
      next(error);
    }
  });

  // 2FA setup endpoint - initiates 2FA setup process
  app.post("/api/2fa/setup", isAuthenticated, async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Generate a new secret and save it (not enabled until verified)
      const secret = await generateTwoFactorSecret(req.user.id, req.user.email);
      
      // Generate the QR code URL to be displayed to the user
      const otpAuthUrl = generateQRCodeUrl(secret, req.user.email);
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await qrcode.toDataURL(otpAuthUrl);
      
      // Create audit log
      await storage.createAuditLog(
        req.user.id,
        AuditAction.SETTINGS_CHANGE,
        'user',
        req.user.id.toString(),
        { action: '2fa_setup_initiated' },
        req.ip,
        req.headers['user-agent']
      );
      
      // Return the QR code and secret
      res.json({
        message: "2FA setup initiated. Scan the QR code with your authenticator app.",
        qrCode: qrCodeDataUrl,
        secret,
        otpAuthUrl
      });
    } catch (error) {
      next(error);
    }
  });

  // 2FA verification endpoint - completes 2FA setup by verifying the first token
  app.post("/api/2fa/verify", isAuthenticated, async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      
      // Verify the token against the user's saved secret
      const user = await storage.getUser(req.user.id);
      
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ message: "2FA setup not initiated" });
      }
      
      const isValid = await verifyTwoFactorToken(user.twoFactorSecret, token);
      
      if (!isValid) {
        return res.status(400).json({ message: "Invalid token" });
      }
      
      // Enable 2FA for the user
      await storage.updateUser(user.id, {
        twoFactorEnabled: true
      });
      
      // Regenerate backup codes and return them
      const backupCodes = generateBackupCodes();
      await storage.updateUser(user.id, {
        twoFactorBackupCodes: JSON.stringify(backupCodes)
      });
      
      // Create audit log
      await storage.createAuditLog(
        req.user.id,
        AuditAction.SETTINGS_CHANGE,
        'user',
        req.user.id.toString(),
        { action: '2fa_enabled' },
        req.ip,
        req.headers['user-agent']
      );
      
      res.json({
        message: "2FA enabled successfully",
        backupCodes
      });
    } catch (error) {
      next(error);
    }
  });

  // 2FA verification during login
  app.post("/api/2fa/validate", async (req, res, next) => {
    try {
      const { username, token, backupCode } = req.body;
      
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }
      
      if (!token && !backupCode) {
        return res.status(400).json({ message: "Token or backup code is required" });
      }
      
      // Find the user
      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.getUserByEmail(username);
      }
      
      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return res.status(400).json({ message: "Invalid request" });
      }
      
      let isValid = false;
      
      // Check if using token or backup code
      if (token) {
        // Verify TOTP token
        isValid = await verifyTwoFactorToken(user.twoFactorSecret, token);
      } else if (backupCode && user.twoFactorBackupCodes) {
        // Verify backup code
        const storedBackupCodes = JSON.parse(user.twoFactorBackupCodes);
        const index = storedBackupCodes.indexOf(backupCode);
        
        if (index !== -1) {
          // Remove the used backup code and save
          storedBackupCodes.splice(index, 1);
          await storage.updateUser(user.id, {
            twoFactorBackupCodes: JSON.stringify(storedBackupCodes)
          });
          isValid = true;
        }
      }
      
      if (!isValid) {
        // Log failed 2FA attempt
        await storage.createAuditLog(
          user.id,
          AuditAction.FAILED_LOGIN,
          'user',
          user.id.toString(),
          { reason: '2fa_failed' },
          req.ip,
          req.headers['user-agent']
        );
        
        return res.status(400).json({ message: "Invalid authentication code" });
      }
      
      // Create a secure session token
      const sessionToken = crypto.randomBytes(64).toString('hex');
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + SESSION_TIMEOUT_MINUTES);
      
      // Update user with session token
      await storage.updateUserSession(user.id, sessionToken, expiry);
      
      // Complete login
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Log successful 2FA login
        storage.createAuditLog(
          user.id,
          AuditAction.USER_LOGIN,
          'user',
          user.id.toString(),
          { method: '2fa' },
          req.ip,
          req.headers['user-agent']
        );
        
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.json({
          ...userWithoutPassword,
          sessionTokenExpiry: expiry
        });
      });
    } catch (error) {
      next(error);
    }
  });

  // Get 2FA status
  app.get("/api/2fa/status", isAuthenticated, (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    res.json({
      enabled: !!req.user.twoFactorEnabled,
      configured: !!req.user.twoFactorSecret
    });
  });

  // Disable 2FA
  app.post("/api/2fa/disable", isAuthenticated, async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Require password verification to disable 2FA
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: "Password is required to disable 2FA" });
      }
      
      // Verify password
      const isPasswordValid = await comparePasswords(password, req.user.password);
      
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Invalid password" });
      }
      
      // Disable 2FA
      await storage.updateUser(req.user.id, {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null
      });
      
      // Create audit log
      await storage.createAuditLog(
        req.user.id,
        AuditAction.SETTINGS_CHANGE,
        'user',
        req.user.id.toString(),
        { action: '2fa_disabled' },
        req.ip,
        req.headers['user-agent']
      );
      
      res.json({ message: "2FA disabled successfully" });
    } catch (error) {
      next(error);
    }
  });
}

// Export hash function for use elsewhere
export { hashPassword };
