import crypto from 'crypto';
import {
  users,
  patientProfiles,
  doctorProfiles,
  scans,
  prescriptions,
  scanImages,
  consultations,
  apiKeys,
  auditLogs,
  scanVersions,
  type User,
  type InsertUser,
  type PatientProfile,
  type InsertPatientProfile,
  type DoctorProfile,
  type InsertDoctorProfile,
  type Scan,
  type InsertScan,
  type Prescription,
  type InsertPrescription,
  type ScanImage,
  type InsertScanImage,
  type Consultation,
  type InsertConsultation,
  type AuditLog,
  type InsertAuditLog,
  type ScanVersion,
  type InsertScanVersion,
} from "../shared/schema";
import { ScanStatus, UserRole, AuditAction } from "../shared/constants";
import { db } from "./db";
import { and, asc, eq, inArray, like, sql, desc, or, isNull, ne } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  updateUserSession(id: number, token: string, expiry: Date): Promise<User | undefined>;
  clearUserSession(id: number): Promise<void>;
  validateUserRole(userId: number, role: UserRole): Promise<boolean>;
  validateApiKey(apiKey: string): Promise<boolean>;
  getApiKeyData(apiKey: string): Promise<{ userId: number, role: UserRole } | undefined>;
  generateApiKey(userId: number, description: string): Promise<string>;
  revokeApiKey(apiKey: string): Promise<boolean>;
  
  // Patient profile methods
  getPatientProfile(userId: number): Promise<PatientProfile | undefined>;
  createPatientProfile(profile: InsertPatientProfile): Promise<PatientProfile>;
  updatePatientProfile(userId: number, profile: Partial<PatientProfile>): Promise<PatientProfile | undefined>;
  
  // Doctor profile methods
  getDoctorProfile(userId: number): Promise<DoctorProfile | undefined>;
  createDoctorProfile(profile: InsertDoctorProfile): Promise<DoctorProfile>;
  updateDoctorProfile(userId: number, profile: Partial<DoctorProfile>): Promise<DoctorProfile | undefined>;
  
  // Scan methods
  createScan(scan: InsertScan): Promise<Scan>;
  getScan(id: number): Promise<Scan | undefined>;
  getPatientScans(patientId: number): Promise<Scan[]>;
  getPatientScansByStatus(patientId: number, status: ScanStatus | ScanStatus[]): Promise<Scan[]>;
  getRecentScans(limit: number): Promise<Scan[]>;
  updateScan(id: number, updates: Partial<Scan>): Promise<Scan | undefined>;
  updateScanStatus(id: number, status: ScanStatus, message?: string): Promise<Scan | undefined>;
  retryScan(id: number): Promise<Scan | undefined>;
  getScansInProcessing(): Promise<Scan[]>;
  searchScans(query: string, patientId?: number, status?: ScanStatus[]): Promise<Scan[]>;
  encryptScanData(id: number): Promise<boolean>;
  decryptScanData(id: number, accessToken: string): Promise<boolean>;
  
  // Prescription methods
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  getPatientPrescriptions(patientId: number): Promise<Prescription[]>;
  getScanPrescriptions(scanId: number): Promise<Prescription[]>;
  exportPrescriptionToPDF(id: number, language?: string): Promise<string>; // Returns the file URL
  exportPrescriptionToCSV(id: number): Promise<string>; // Returns the file URL
  exportPatientScansToCSV(patientId: number): Promise<string>; // Returns the file URL
  
  // Scan image methods
  addScanImage(image: InsertScanImage): Promise<ScanImage>;
  getScanImages(scanId: number): Promise<ScanImage[]>;
  getScanImagesCount(scanId: number): Promise<number>;
  
  // Consultation methods
  createConsultation(consultation: InsertConsultation): Promise<Consultation>;
  getConsultation(id: number): Promise<Consultation | undefined>;
  getDoctorConsultations(doctorId: number): Promise<Consultation[]>;
  getPatientConsultations(patientId: number): Promise<Consultation[]>;
  updateConsultation(id: number, updates: Partial<Consultation>): Promise<Consultation | undefined>;
  getUpcomingConsultations(userId: number, role: UserRole): Promise<Consultation[]>;
  
  // Audit logging methods
  createAuditLog(userId: number | null, action: AuditAction, resource: string, resourceId?: string, details?: any, ipAddress?: string, userAgent?: string): Promise<void>;
  getAuditLogs(filter?: { userId?: number, action?: AuditAction, resource?: string, resourceId?: string, startDate?: Date, endDate?: Date }): Promise<AuditLog[]>;
  getRecentUserActions(userId: number, limit?: number): Promise<AuditLog[]>;
  
  // Session store
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // Audit logging methods implementation
  async createAuditLog(
    userId: number | null, 
    action: AuditAction, 
    resource: string, 
    resourceId?: string, 
    details?: any, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<void> {
    try {
      // Mask PII data in details if present
      const maskedDetails = details ? this.maskPIIData(details) : null;
      
      await db
        .insert(auditLogs)
        .values({
          userId,
          action,
          resource,
          resourceId,
          details: maskedDetails,
          ipAddress,
          userAgent,
          createdAt: new Date(),
        });
    } catch (error) {
      console.error('Error creating audit log:', error);
      // Don't throw - audit logs should never block business logic
    }
  }

  // Helper method to mask PII data in audit logs
  private maskPIIData(data: any): any {
    // Import PII fields from constants
    const PII_FIELDS = [
      'fullName', 
      'email', 
      'password', 
      'address', 
      'phoneNumber', 
      'dateOfBirth',
      'ssn',
      'insuranceNumber',
      'ipAddress'
    ];

    // If data is not an object, return it as is
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    // Clone the data to avoid modifying the original
    const maskedData = Array.isArray(data) ? [...data] : { ...data };

    // If it's an array, recursively mask each item
    if (Array.isArray(maskedData)) {
      return maskedData.map(item => this.maskPIIData(item));
    }

    // If it's an object, mask PII fields and recursively process nested objects
    for (const key in maskedData) {
      if (PII_FIELDS.includes(key)) {
        // Replace with masked version
        const value = maskedData[key];
        if (typeof value === 'string') {
          // Mask all but first and last few characters
          const length = value.length;
          if (length > 6) {
            maskedData[key] = value.substring(0, 2) + '*'.repeat(length - 4) + value.substring(length - 2);
          } else {
            maskedData[key] = '*'.repeat(length);
          }
        } else {
          maskedData[key] = '***MASKED***';
        }
      } else if (typeof maskedData[key] === 'object' && maskedData[key] !== null) {
        // Recursively mask nested objects
        maskedData[key] = this.maskPIIData(maskedData[key]);
      }
    }

    return maskedData;
  }

  async getAuditLogs(filter?: { 
    userId?: number, 
    action?: AuditAction, 
    resource?: string, 
    resourceId?: string, 
    startDate?: Date, 
    endDate?: Date 
  }): Promise<AuditLog[]> {
    try {
      let query = db.select().from(auditLogs);
      
      // Apply filters if provided
      if (filter) {
        const conditions = [];
        
        if (filter.userId !== undefined) {
          conditions.push(eq(auditLogs.userId, filter.userId));
        }
        
        if (filter.action !== undefined) {
          conditions.push(eq(auditLogs.action, filter.action));
        }
        
        if (filter.resource !== undefined) {
          conditions.push(eq(auditLogs.resource, filter.resource));
        }
        
        if (filter.resourceId !== undefined) {
          conditions.push(eq(auditLogs.resourceId, filter.resourceId));
        }
        
        if (filter.startDate !== undefined) {
          conditions.push(sql`${auditLogs.createdAt} >= ${filter.startDate}`);
        }
        
        if (filter.endDate !== undefined) {
          conditions.push(sql`${auditLogs.createdAt} <= ${filter.endDate}`);
        }
        
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
      }
      
      // Order by most recent first
      return await query.orderBy(desc(auditLogs.createdAt));
    } catch (error) {
      console.error('Error retrieving audit logs:', error);
      return [];
    }
  }

  async getRecentUserActions(userId: number, limit: number = 10): Promise<AuditLog[]> {
    try {
      return await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, userId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Error retrieving recent user actions:', error);
      return [];
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserSession(id: number, token: string, expiry: Date): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        sessionToken: token,
        sessionExpiry: expiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async clearUserSession(id: number): Promise<void> {
    await db
      .update(users)
      .set({
        sessionToken: null,
        sessionExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async validateUserRole(userId: number, role: UserRole): Promise<boolean> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, userId),
        eq(users.role, role)
      ));
    return !!user;
  }

  async getPatientProfile(userId: number): Promise<PatientProfile | undefined> {
    const [profile] = await db
      .select()
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, userId));
    return profile;
  }

  async createPatientProfile(profile: InsertPatientProfile): Promise<PatientProfile> {
    const [createdProfile] = await db
      .insert(patientProfiles)
      .values(profile)
      .returning();
    return createdProfile;
  }

  async updatePatientProfile(
    userId: number,
    profile: Partial<PatientProfile>
  ): Promise<PatientProfile | undefined> {
    const [updatedProfile] = await db
      .update(patientProfiles)
      .set({
        ...profile,
        updatedAt: new Date(),
      })
      .where(eq(patientProfiles.userId, userId))
      .returning();
    return updatedProfile;
  }

  async getDoctorProfile(userId: number): Promise<DoctorProfile | undefined> {
    const [profile] = await db
      .select()
      .from(doctorProfiles)
      .where(eq(doctorProfiles.userId, userId));
    return profile;
  }

  async createDoctorProfile(profile: InsertDoctorProfile): Promise<DoctorProfile> {
    const [createdProfile] = await db
      .insert(doctorProfiles)
      .values(profile)
      .returning();
    return createdProfile;
  }

  async updateDoctorProfile(
    userId: number,
    profile: Partial<DoctorProfile>
  ): Promise<DoctorProfile | undefined> {
    const [updatedProfile] = await db
      .update(doctorProfiles)
      .set({
        ...profile,
        updatedAt: new Date(),
      })
      .where(eq(doctorProfiles.userId, userId))
      .returning();
    return updatedProfile;
  }

  async createScan(scan: InsertScan): Promise<Scan> {
    const [createdScan] = await db.insert(scans).values(scan).returning();
    return createdScan;
  }

  async getScan(id: number): Promise<Scan | undefined> {
    // Select specific columns to avoid issues with missing columns in the database schema
    // This handles the case where pressureDataPoints might not exist in the actual database
    const [scan] = await db.select({
      id: scans.id,
      patientId: scans.patientId,
      status: scans.status,
      statusMessage: scans.statusMessage,
      errorType: scans.errorType,
      retryCount: scans.retryCount,
      processStartedAt: scans.processStartedAt,
      processCompletedAt: scans.processCompletedAt,
      objUrl: scans.objUrl,
      stlUrl: scans.stlUrl,
      thumbnailUrl: scans.thumbnailUrl,
      aiDiagnosis: scans.aiDiagnosis,
      aiDiagnosisDetails: scans.aiDiagnosisDetails,
      aiConfidence: scans.aiConfidence,
      doctorNotes: scans.doctorNotes,
      doctorId: scans.doctorId,
      footLength: scans.footLength,
      footWidth: scans.footWidth,
      archHeight: scans.archHeight,
      instepHeight: scans.instepHeight,
      isEncrypted: scans.isEncrypted,
      encryptionDetails: scans.encryptionDetails,
      createdAt: scans.createdAt,
      updatedAt: scans.updatedAt
    })
    .from(scans)
    .where(eq(scans.id, id));
    
    return scan;
  }

  async getPatientScans(patientId: number): Promise<Scan[]> {
    const patientScans = await db
      .select()
      .from(scans)
      .where(eq(scans.patientId, patientId))
      .orderBy(desc(scans.createdAt));
    return patientScans;
  }

  async getRecentScans(limit: number): Promise<Scan[]> {
    const recentScans = await db
      .select()
      .from(scans)
      .orderBy(desc(scans.createdAt))
      .limit(limit);
    return recentScans;
  }

  async updateScan(id: number, updates: Partial<Scan>): Promise<Scan | undefined> {
    const [updatedScan] = await db
      .update(scans)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(scans.id, id))
      .returning();
    return updatedScan;
  }

  async updateScanStatus(id: number, status: ScanStatus, message?: string): Promise<Scan | undefined> {
    const updates: any = {
      status,
      updatedAt: new Date(),
    };

    if (message) {
      updates.statusMessage = message;
    }

    // Set timestamps based on status
    if (status === ScanStatus.PROCESSING) {
      updates.processStartedAt = new Date();
    } else if (
      status === ScanStatus.COMPLETE ||
      status === ScanStatus.ERROR
    ) {
      updates.processCompletedAt = new Date();
    }

    const [updatedScan] = await db
      .update(scans)
      .set(updates)
      .where(eq(scans.id, id))
      .returning();
    return updatedScan;
  }

  async retryScan(id: number): Promise<Scan | undefined> {
    const [scan] = await db
      .select()
      .from(scans)
      .where(eq(scans.id, id));

    if (!scan || scan.status !== ScanStatus.ERROR) {
      return undefined;
    }

    const [updatedScan] = await db
      .update(scans)
      .set({
        status: ScanStatus.QUEUED,
        statusMessage: 'Retry requested',
        retryCount: (scan.retryCount || 0) + 1,
        processStartedAt: null,
        processCompletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(scans.id, id))
      .returning();
    return updatedScan;
  }

  async getPatientScansByStatus(patientId: number, status: ScanStatus | ScanStatus[]): Promise<Scan[]> {
    if (Array.isArray(status)) {
      return db
        .select()
        .from(scans)
        .where(
          and(
            eq(scans.patientId, patientId),
            inArray(scans.status, status as string[])
          )
        )
        .orderBy(desc(scans.createdAt));
    }

    return db
      .select()
      .from(scans)
      .where(
        and(
          eq(scans.patientId, patientId),
          eq(scans.status, status)
        )
      )
      .orderBy(desc(scans.createdAt));
  }

  async getScansInProcessing(): Promise<Scan[]> {
    // Find scans that have been in processing status for more than 1 hour
    // These might be stuck and require manual intervention
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    return db
      .select()
      .from(scans)
      .where(
        and(
          eq(scans.status, ScanStatus.PROCESSING),
          sql`${scans.processStartedAt} < ${oneHourAgo}`
        )
      )
      .orderBy(asc(scans.processStartedAt));
  }

  async searchScans(query: string, patientId?: number, status?: ScanStatus[]): Promise<Scan[]> {
    const conditions = [];

    // Add search condition
    if (query && query.trim() !== '') {
      conditions.push(
        or(
          like(scans.aiDiagnosis, `%${query}%`),
          like(scans.doctorNotes, `%${query}%`),
          like(scans.statusMessage, `%${query}%`)
        )
      );
    }

    // Add patient condition if specified
    if (patientId) {
      conditions.push(eq(scans.patientId, patientId));
    }

    // Add status condition if specified
    if (status && status.length > 0) {
      conditions.push(inArray(scans.status, status as string[]));
    }

    // If no conditions were added, return all scans
    if (conditions.length === 0) {
      return db
        .select()
        .from(scans)
        .orderBy(desc(scans.createdAt))
        .limit(100);
    }

    // Build AND of all conditions
    return db
      .select()
      .from(scans)
      .where(and(...conditions))
      .orderBy(desc(scans.createdAt))
      .limit(100);
  }

  async getScanImagesCount(scanId: number): Promise<number> {
    const images = await db
      .select({ count: sql<number>`count(*)` })
      .from(scanImages)
      .where(eq(scanImages.scanId, scanId));
    
    return images[0]?.count || 0;
  }

  async encryptScanData(id: number): Promise<boolean> {
    try {
      // Simulated encryption for now
      const [updatedScan] = await db
        .update(scans)
        .set({
          isEncrypted: true,
          encryptionDetails: JSON.stringify({
            encryptedAt: new Date(),
            algorithm: 'AES-256-GCM',
          }),
          updatedAt: new Date(),
        })
        .where(eq(scans.id, id))
        .returning();
      return !!updatedScan;
    } catch (error) {
      console.error('Error encrypting scan data:', error);
      return false;
    }
  }

  async decryptScanData(id: number, accessToken: string): Promise<boolean> {
    try {
      // Validate access token logic would go here
      const [updatedScan] = await db
        .update(scans)
        .set({
          isEncrypted: false,
          encryptionDetails: null,
          updatedAt: new Date(),
        })
        .where(eq(scans.id, id))
        .returning();
      return !!updatedScan;
    } catch (error) {
      console.error('Error decrypting scan data:', error);
      return false;
    }
  }

  async exportPrescriptionToPDF(id: number): Promise<string> {
    // Simulated PDF export - in real implementation this would use a PDF library
    return `/api/prescriptions/${id}/pdf`;
  }

  async exportPrescriptionToCSV(id: number): Promise<string> {
    // Simulated CSV export
    return `/api/prescriptions/${id}/csv`;
  }

  async exportPatientScansToCSV(patientId: number): Promise<string> {
    // Simulated CSV export
    return `/api/patients/${patientId}/scans/csv`;
  }

  async createPrescription(prescription: InsertPrescription): Promise<Prescription> {
    const [createdPrescription] = await db
      .insert(prescriptions)
      .values(prescription)
      .returning();
    return createdPrescription;
  }

  async getPatientPrescriptions(patientId: number): Promise<Prescription[]> {
    return db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.patientId, patientId))
      .orderBy(desc(prescriptions.createdAt));
  }

  async getScanPrescriptions(scanId: number): Promise<Prescription[]> {
    return db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.scanId, scanId))
      .orderBy(desc(prescriptions.createdAt));
  }

  async addScanImage(image: InsertScanImage): Promise<ScanImage> {
    const [createdImage] = await db
      .insert(scanImages)
      .values(image)
      .returning();
    return createdImage;
  }

  async getScanImages(scanId: number): Promise<ScanImage[]> {
    return db
      .select()
      .from(scanImages)
      .where(eq(scanImages.scanId, scanId));
  }

  async createConsultation(consultation: InsertConsultation): Promise<Consultation> {
    const [createdConsultation] = await db
      .insert(consultations)
      .values(consultation)
      .returning();
    return createdConsultation;
  }

  async getConsultation(id: number): Promise<Consultation | undefined> {
    const [consultation] = await db
      .select()
      .from(consultations)
      .where(eq(consultations.id, id));
    return consultation;
  }

  async getDoctorConsultations(doctorId: number): Promise<Consultation[]> {
    return db
      .select()
      .from(consultations)
      .where(eq(consultations.doctorId, doctorId))
      .orderBy(desc(consultations.scheduledTime));
  }

  async getPatientConsultations(patientId: number): Promise<Consultation[]> {
    return db
      .select()
      .from(consultations)
      .where(eq(consultations.patientId, patientId))
      .orderBy(desc(consultations.scheduledTime));
  }

  async updateConsultation(id: number, updates: Partial<Consultation>): Promise<Consultation | undefined> {
    const [updatedConsultation] = await db
      .update(consultations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(consultations.id, id))
      .returning();
    return updatedConsultation;
  }

  async getUpcomingConsultations(userId: number, role: UserRole): Promise<Consultation[]> {
    const query = role === UserRole.DOCTOR 
      ? eq(consultations.doctorId, userId)
      : eq(consultations.patientId, userId);
    
    // Calculate current date
    const now = new Date();
    
    return db
      .select()
      .from(consultations)
      .where(and(
        query,
        sql`${consultations.scheduledTime} > ${now}`
      ))
      .orderBy(asc(consultations.scheduledTime))
      .limit(10);
  }

  // API key methods
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const [key] = await db
        .select()
        .from(apiKeys)
        .where(and(
          eq(apiKeys.apiKey, apiKey),
          eq(apiKeys.isActive, true),
          or(
            isNull(apiKeys.expiresAt),
            sql`${apiKeys.expiresAt} > NOW()`
          )
        ));
      
      if (!key) {
        return false;
      }
      
      // Update last used timestamp
      await db
        .update(apiKeys)
        .set({
          lastUsed: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(apiKeys.id, key.id));
      
      return true;
    } catch (error) {
      console.error('Error validating API key:', error);
      return false;
    }
  }
  
  async getApiKeyData(apiKey: string): Promise<{ userId: number, role: UserRole } | undefined> {
    try {
      const [key] = await db
        .select()
        .from(apiKeys)
        .where(and(
          eq(apiKeys.apiKey, apiKey),
          eq(apiKeys.isActive, true),
          or(
            isNull(apiKeys.expiresAt),
            sql`${apiKeys.expiresAt} > NOW()`
          )
        ));
      
      if (!key) {
        return undefined;
      }
      
      // Get user information to include role
      const user = await this.getUser(key.userId);
      if (!user) {
        return undefined;
      }
      
      return {
        userId: key.userId,
        role: user.role as UserRole,
      };
    } catch (error) {
      console.error('Error getting API key data:', error);
      return undefined;
    }
  }
  
  async generateApiKey(userId: number, description: string): Promise<string> {
    try {
      // Generate a secure random API key
      const apiKeyBytes = crypto.randomBytes(32);
      const apiKey = apiKeyBytes.toString('hex');
      
      // Create a record in the database
      const [keyRecord] = await db
        .insert(apiKeys)
        .values({
          userId,
          apiKey,
          description,
          isActive: true,
          // Default permissions and IP restrictions can be set here
          permissions: JSON.stringify(['read']), // Default to read-only
          ipRestrictions: JSON.stringify([]), // No IP restrictions by default
          // Set expiry one year from now by default
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      
      return apiKey;
    } catch (error) {
      console.error('Error generating API key:', error);
      throw new Error('Failed to generate API key');
    }
  }
  
  async revokeApiKey(apiKey: string): Promise<boolean> {
    try {
      // Update the API key to be inactive
      const result = await db
        .update(apiKeys)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(apiKeys.apiKey, apiKey))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error('Error revoking API key:', error);
      return false;
    }
  }

  // Scan versioning methods
  async createScanVersion(scanId: number, changedBy: number, changeReason: string): Promise<ScanVersion> {
    // Get the current scan data
    const scan = await this.getScan(scanId);
    
    if (!scan) {
      throw new Error(`Scan with ID ${scanId} not found`);
    }
    
    // Get the current version number
    const currentVersion = scan.currentVersionNumber || 1;
    
    // Create a new version record
    const [scanVersion] = await db
      .insert(scanVersions)
      .values({
        scanId,
        versionNumber: currentVersion,
        changedBy,
        changeReason,
        scanData: scan as any // Store the full scan object as JSON
      } as InsertScanVersion)
      .returning();
    
    // Update the scan with the new version number
    await db
      .update(scans)
      .set({
        currentVersionNumber: currentVersion + 1,
        updatedAt: new Date()
      })
      .where(eq(scans.id, scanId));
    
    // Create audit log
    await this.createAuditLog(
      changedBy,
      AuditAction.SCAN_UPDATE,
      'scan',
      scanId.toString(),
      { 
        action: 'version_created', 
        versionNumber: currentVersion,
        reason: changeReason
      }
    );
    
    return scanVersion;
  }
  
  async getScanVersions(scanId: number): Promise<ScanVersion[]> {
    return db
      .select()
      .from(scanVersions)
      .where(eq(scanVersions.scanId, scanId))
      .orderBy(desc(scanVersions.versionNumber));
  }
  
  async getScanVersion(scanId: number, versionNumber: number): Promise<ScanVersion | undefined> {
    const [version] = await db
      .select()
      .from(scanVersions)
      .where(
        and(
          eq(scanVersions.scanId, scanId),
          eq(scanVersions.versionNumber, versionNumber)
        )
      );
    
    return version;
  }
  
  async restoreScanVersion(scanId: number, versionNumber: number, userId: number): Promise<Scan | undefined> {
    // Get the version to restore
    const version = await this.getScanVersion(scanId, versionNumber);
    
    if (!version) {
      throw new Error(`Version ${versionNumber} of scan ${scanId} not found`);
    }
    
    // Get the current scan
    const currentScan = await this.getScan(scanId);
    
    if (!currentScan) {
      throw new Error(`Scan with ID ${scanId} not found`);
    }
    
    // First create a version of the current state
    await this.createScanVersion(
      scanId, 
      userId, 
      `Automatic version before restoring to version ${versionNumber}`
    );
    
    // Extract the scan data from the version
    const versionData = version.scanData as any;
    
    // Remove properties that should not be restored
    delete versionData.id;
    delete versionData.createdAt;
    delete versionData.updatedAt;
    delete versionData.currentVersionNumber;
    
    // Update the scan with the version data
    const [updatedScan] = await db
      .update(scans)
      .set({
        ...versionData,
        currentVersionNumber: (currentScan.currentVersionNumber || 1) + 1, // Increment version
        updatedAt: new Date()
      })
      .where(eq(scans.id, scanId))
      .returning();
    
    // Create audit log for version restoration
    await this.createAuditLog(
      userId,
      AuditAction.SCAN_UPDATE,
      'scan',
      scanId.toString(),
      { 
        action: 'version_restored', 
        restoredVersion: versionNumber,
        newVersionNumber: currentScan.currentVersionNumber + 1
      }
    );
    
    return updatedScan;
  }
  
  async compareScanVersions(scanId: number, version1: number, version2: number): Promise<Record<string, any>> {
    const v1 = await this.getScanVersion(scanId, version1);
    const v2 = await this.getScanVersion(scanId, version2);
    
    if (!v1 || !v2) {
      throw new Error(`One or both versions not found for scan ${scanId}`);
    }
    
    const data1 = v1.scanData as any;
    const data2 = v2.scanData as any;
    
    // Compare the two versions and identify differences
    const differences: Record<string, { old: any; new: any }> = {};
    
    // Compare all properties except metadata ones
    const excludeFields = ['id', 'createdAt', 'updatedAt', 'currentVersionNumber'];
    
    for (const key of Object.keys(data1)) {
      if (excludeFields.includes(key)) continue;
      
      if (JSON.stringify(data1[key]) !== JSON.stringify(data2[key])) {
        differences[key] = {
          old: data1[key],
          new: data2[key]
        };
      }
    }
    
    return differences;
  }
}

export const storage = new DatabaseStorage();