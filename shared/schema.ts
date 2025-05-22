import { relations, sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  real,
  json,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";
import { ScanStatus, UserRole, AuditAction, ReportFormat } from "./constants";

// User model for both patients and doctors
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default(UserRole.PATIENT), // patient, doctor, admin
  sessionToken: text("session_token"),
  sessionExpiry: timestamp("session_expiry"),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  // 2FA fields
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorBackupCodes: json("two_factor_backup_codes"),
  // Account lockout & security
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIp: text("last_login_ip"),
  passwordChangedAt: timestamp("password_changed_at"),
  forcePasswordChange: boolean("force_password_change").default(false),
  // User preferences
  preferences: json("preferences"),
  language: text("language").default("en"),
});

// Relations for users
export const usersRelations = relations(users, ({ many }) => ({
  patientProfiles: many(patientProfiles),
  doctorProfiles: many(doctorProfiles),
  scans: many(scans),
}));

// Patient profile with additional medical information
export const patientProfiles = pgTable("patient_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  age: integer("age"),
  gender: text("gender"),
  height: real("height"), // in cm
  weight: real("weight"), // in kg
  shoeSize: text("shoe_size"),
  shoeSizeUnit: text("shoe_size_unit").default("UK"),
  usedOrthopedicInsoles: boolean("used_orthopedic_insoles").default(false),
  hasDiabetes: boolean("has_diabetes").default(false),
  hasHeelSpur: boolean("has_heel_spur").default(false),
  footPain: text("foot_pain"),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Relations for patient profiles
export const patientProfilesRelations = relations(
  patientProfiles,
  ({ one }) => ({
    user: one(users, {
      fields: [patientProfiles.userId],
      references: [users.id],
    }),
  })
);

// Doctor profile
export const doctorProfiles = pgTable("doctor_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  specialty: text("specialty"),
  license: text("license"),
  hospital: text("hospital"),
  bio: text("bio"),
  googleMeetLink: text("google_meet_link"),
  zoomLink: text("zoom_link"),
  preferredConsultationPlatform: text("preferred_consultation_platform").default("google_meet"), // google_meet, zoom
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Relations for doctor profiles
export const doctorProfilesRelations = relations(
  doctorProfiles,
  ({ one }) => ({
    user: one(users, {
      fields: [doctorProfiles.userId],
      references: [users.id],
    }),
  })
);

// Scan model
export const scans = pgTable("scans", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull().default(ScanStatus.QUEUED),
  statusMessage: text("status_message"), 
  errorType: text("error_type"), // See ErrorType enum
  retryCount: integer("retry_count").default(0),
  processStartedAt: timestamp("process_started_at"),
  processCompletedAt: timestamp("process_completed_at"),
  objUrl: text("obj_url"),
  stlUrl: text("stl_url"),
  thumbnailUrl: text("thumbnail_url"),
  // Pressure distribution analysis
  pressureDataPoints: json("pressure_data_points"), // Raw pressure data points
  leftPressureHeatmapUrl: text("left_pressure_heatmap_url"),
  rightPressureHeatmapUrl: text("right_pressure_heatmap_url"),
  pressureAnalysisResults: json("pressure_analysis_results"), // Detailed pressure analysis
  // Diagnosis and measurements
  aiDiagnosis: text("ai_diagnosis"),
  aiDiagnosisDetails: json("ai_diagnosis_details"), // Detailed JSON results
  // Enhanced with confidence scores and fallback info
  aiConfidence: real("ai_confidence"),
  aiConfidenceLevel: text("ai_confidence_level"), // HIGH, MEDIUM, LOW, VERY_LOW
  doctorReviewNeeded: boolean("doctor_review_needed").default(false),
  doctorReviewReason: text("doctor_review_reason"),
  doctorReviewed: boolean("doctor_reviewed").default(false),
  doctorReviewedAt: timestamp("doctor_reviewed_at"),
  doctorNotes: text("doctor_notes"),
  doctorId: integer("doctor_id").references(() => users.id),
  // Medical coding
  icd10Codes: json("icd10_codes"), // Array of ICD-10 codes
  // Foot measurements
  footLength: real("foot_length"),
  footWidth: real("foot_width"),
  archHeight: real("arch_height"),
  instepHeight: real("instep_height"),
  // Advanced measurements with confidence
  advancedMeasurements: json("advanced_measurements"), // Detailed measurements with confidence
  // Versioning & history
  currentVersionNumber: integer("current_version_number").default(1),
  previousVersionId: integer("previous_version_id"),
  // Compliance & security
  isEncrypted: boolean("is_encrypted").default(false), // For HIPAA compliance
  encryptionDetails: json("encryption_details"), // For HIPAA compliance
  piiMasked: boolean("pii_masked").default(false),
  // Report customization
  reportLanguage: text("report_language").default("en"),
  reportConfigurationId: integer("report_configuration_id"),
  // Timestamps
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Relations for scans
export const scansRelations = relations(scans, ({ one, many }) => ({
  patient: one(users, {
    fields: [scans.patientId],
    references: [users.id],
  }),
  doctor: one(users, {
    fields: [scans.doctorId],
    references: [users.id],
  }),
  prescriptions: many(prescriptions),
  versions: many(scanVersions),
  reportConfiguration: one(reportConfigurations, {
    fields: [scans.reportConfigurationId],
    references: [reportConfigurations.id],
  }),
  previousVersion: one(scans, {
    fields: [scans.previousVersionId],
    references: [scans.id],
  }),
}));

// Prescription model
export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  scanId: integer("scan_id")
    .notNull()
    .references(() => scans.id, { onDelete: "cascade" }),
  doctorId: integer("doctor_id")
    .notNull()
    .references(() => users.id),
  patientId: integer("patient_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  recommendedProduct: text("recommended_product"),
  recommendedExercises: text("recommended_exercises"),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Relations for prescriptions
export const prescriptionsRelations = relations(
  prescriptions,
  ({ one }) => ({
    scan: one(scans, {
      fields: [prescriptions.scanId],
      references: [scans.id],
    }),
    doctor: one(users, {
      fields: [prescriptions.doctorId],
      references: [users.id],
    }),
    patient: one(users, {
      fields: [prescriptions.patientId],
      references: [users.id],
    }),
  })
);

// Scan images (raw captures before processing)
export const scanImages = pgTable("scan_images", {
  id: serial("id").primaryKey(),
  scanId: integer("scan_id")
    .notNull()
    .references(() => scans.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  position: text("position").notNull(), // angle/position description
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Relations for scan images
export const scanImagesRelations = relations(scanImages, ({ one }) => ({
  scan: one(scans, {
    fields: [scanImages.scanId],
    references: [scans.id],
  }),
}));

// Consultations for video meetings between doctors and patients
export const consultations = pgTable("consultations", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id")
    .notNull()
    .references(() => users.id),
  patientId: integer("patient_id")
    .notNull()
    .references(() => users.id),
  scheduledTime: timestamp("scheduled_time").notNull(),
  duration: integer("duration").notNull().default(30), // in minutes
  meetingLink: text("meeting_link").notNull(),
  platform: text("platform").notNull().default("google_meet"), // google_meet, zoom
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled
  notes: text("notes"),
  scanId: integer("scan_id").references(() => scans.id), // Optional related scan
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Relations for consultations
export const consultationsRelations = relations(consultations, ({ one }) => ({
  doctor: one(users, {
    fields: [consultations.doctorId],
    references: [users.id],
  }),
  patient: one(users, {
    fields: [consultations.patientId],
    references: [users.id],
  }),
  scan: one(scans, {
    fields: [consultations.scanId],
    references: [scans.id],
  }),
}));

// API keys for third-party integrations and secure API access
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  apiKey: text("api_key").notNull().unique(),
  description: text("description").notNull(),
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used"),
  expiresAt: timestamp("expires_at"),
  permissions: json("permissions"), // Array of allowed operations
  ipRestrictions: json("ip_restrictions"), // Array of allowed IPs
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Relations for API keys
export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

// Audit logs for security and compliance
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(), // from AuditAction enum
  resource: text("resource").notNull(), // e.g., 'user', 'scan', 'prescription'
  resourceId: text("resource_id"), // e.g., user.id, scan.id as string
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  details: json("details"), // Additional details about the action
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Relations for audit logs
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Scan versions for historical tracking
export const scanVersions = pgTable("scan_versions", {
  id: serial("id").primaryKey(),
  scanId: integer("scan_id")
    .notNull()
    .references(() => scans.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  changedBy: integer("changed_by").references(() => users.id),
  changeReason: text("change_reason"),
  scanData: jsonb("scan_data").notNull(), // Full copy of scan data at this version
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Relations for scan versions
export const scanVersionsRelations = relations(scanVersions, ({ one }) => ({
  scan: one(scans, {
    fields: [scanVersions.scanId],
    references: [scans.id],
  }),
  changedByUser: one(users, {
    fields: [scanVersions.changedBy],
    references: [users.id],
  }),
}));

// Report configuration for multilingual support and branding
export const reportConfigurations = pgTable("report_configurations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  language: text("language").notNull().default("en"),
  logoUrl: text("logo_url"),
  headerText: text("header_text"),
  footerText: text("footer_text"),
  hospitalName: text("hospital_name"),
  hospitalAddress: text("hospital_address"),
  contactInfo: text("contact_info"),
  signatureImageUrl: text("signature_image_url"),
  colorPrimary: text("color_primary").default("#3B82F6"), // Default blue
  colorSecondary: text("color_secondary").default("#1E40AF"),
  fontFamily: text("font_family").default("Arial, sans-serif"),
  includeIcd10Codes: boolean("include_icd10_codes").default(true),
  includeDoctorCredentials: boolean("include_doctor_credentials").default(true),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Relations for report configurations
export const reportConfigurationsRelations = relations(
  reportConfigurations,
  ({ one }) => ({
    user: one(users, {
      fields: [reportConfigurations.userId],
      references: [users.id],
    }),
  })
);

// Error logs for tracking application errors
export const errorLogs = pgTable("error_logs", {
  id: serial("id").primaryKey(),
  errorCode: text("error_code").notNull(),
  errorMessage: text("error_message").notNull(),
  stackTrace: text("stack_trace"),
  userId: integer("user_id").references(() => users.id),
  scanId: integer("scan_id").references(() => scans.id),
  severity: text("severity").notNull().default("error"), // error, warning, info
  resolved: boolean("resolved").default(false),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Relations for error logs
export const errorLogsRelations = relations(errorLogs, ({ one }) => ({
  user: one(users, {
    fields: [errorLogs.userId],
    references: [users.id],
  }),
  scan: one(scans, {
    fields: [errorLogs.scanId],
    references: [scans.id],
  }),
  resolvedByUser: one(users, {
    fields: [errorLogs.resolvedBy],
    references: [users.id],
  }),
}));

// Types for TypeScript
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type PatientProfile = typeof patientProfiles.$inferSelect;
export type InsertPatientProfile = typeof patientProfiles.$inferInsert;

export type DoctorProfile = typeof doctorProfiles.$inferSelect;
export type InsertDoctorProfile = typeof doctorProfiles.$inferInsert;

export type Scan = typeof scans.$inferSelect;
export type InsertScan = typeof scans.$inferInsert;

export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = typeof prescriptions.$inferInsert;

export type ScanImage = typeof scanImages.$inferSelect;
export type InsertScanImage = typeof scanImages.$inferInsert;

export type Consultation = typeof consultations.$inferSelect;
export type InsertConsultation = typeof consultations.$inferInsert;

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

export type ScanVersion = typeof scanVersions.$inferSelect;
export type InsertScanVersion = typeof scanVersions.$inferInsert;

export type ReportConfiguration = typeof reportConfigurations.$inferSelect;
export type InsertReportConfiguration = typeof reportConfigurations.$inferInsert;

export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = typeof errorLogs.$inferInsert;
