// Scan status constants
export enum ScanStatus {
  UPLOADING = 'uploading',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  ANALYZING = 'analyzing',
  GENERATING_MODEL = 'generating_model',
  COMPLETE = 'complete',
  ERROR = 'error',
  RETRY = 'retry'
}

// Error types
export enum ErrorType {
  UPLOAD_ERROR = 'upload_error',
  SERVER_ERROR = 'server_error',
  PROCESSING_ERROR = 'processing_error',
  TIMEOUT_ERROR = 'timeout_error',
  IMAGE_QUALITY_ERROR = 'image_quality_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  PERMISSION_ERROR = 'permission_error'
}

// User roles
export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  ADMIN = 'admin'
}

// Session constants
export const SESSION_TIMEOUT_MINUTES = 30;
export const TOKEN_EXPIRY_DAYS = 7;

// Error messages
export const ERROR_MESSAGES = {
  [ErrorType.UPLOAD_ERROR]: 'Failed to upload scan. Please check your connection and try again.',
  [ErrorType.SERVER_ERROR]: 'Server error occurred. Our team has been notified.',
  [ErrorType.PROCESSING_ERROR]: 'An error occurred while processing your scan. Please try again.',
  [ErrorType.TIMEOUT_ERROR]: 'The request timed out. Please try again later.',
  [ErrorType.IMAGE_QUALITY_ERROR]: 'The scan images don\'t meet quality requirements. Please retake with better lighting.',
  [ErrorType.AUTHENTICATION_ERROR]: 'Authentication error. Please log in again.',
  [ErrorType.PERMISSION_ERROR]: 'You don\'t have permission to access this resource.'
};

// Progress indicators for different scan statuses
export const SCAN_PROGRESS = {
  [ScanStatus.UPLOADING]: 10,
  [ScanStatus.QUEUED]: 20,
  [ScanStatus.PROCESSING]: 40,
  [ScanStatus.ANALYZING]: 60,
  [ScanStatus.GENERATING_MODEL]: 80,
  [ScanStatus.COMPLETE]: 100,
  [ScanStatus.ERROR]: 0,
  [ScanStatus.RETRY]: 5
};

// Status descriptions for user display
export const STATUS_DESCRIPTIONS = {
  [ScanStatus.UPLOADING]: 'Uploading your scan images...',
  [ScanStatus.QUEUED]: 'Scan queued for processing...',
  [ScanStatus.PROCESSING]: 'Processing your 3D foot scan...',
  [ScanStatus.ANALYZING]: 'Analyzing foot structure and biomechanics...',
  [ScanStatus.GENERATING_MODEL]: 'Generating 3D foot model...',
  [ScanStatus.COMPLETE]: 'Scan complete! View your results.',
  [ScanStatus.ERROR]: 'An error occurred during processing.',
  [ScanStatus.RETRY]: 'Retrying scan processing...'
};

// Validation constants
export const MAX_SCAN_IMAGE_SIZE_MB = 10;
export const ALLOWED_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png'];
export const MAX_SCAN_IMAGES = 20;
export const MIN_SCAN_IMAGES = 5;

// API endpoints
export const API_ENDPOINTS = {
  SCAN_UPLOAD: '/api/scans/upload',
  SCAN_STATUS: '/api/scans/:id/status',
  SCAN_RESULTS: '/api/scans/:id/results',
  SCAN_RETRY: '/api/scans/:id/retry',
  USER_PROFILE: '/api/user/profile',
  DOCTOR_PATIENTS: '/api/doctor/patients',
  PATIENT_SCANS: '/api/patient/:id/scans',
  PRESCRIPTIONS: '/api/prescriptions',
  CONSULTATIONS: '/api/consultations'
};

// Export/report formats
export const EXPORT_FORMATS = {
  PDF: 'pdf',
  CSV: 'csv',
  JSON: 'json'
};

// Client feature flags
export const FEATURES = {
  ENABLE_ONBOARDING: true,
  ENABLE_SCAN_RETRY: true,
  ENABLE_DOCTOR_EXPORT: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_DATA_ENCRYPTION: true,
  ENABLE_AUTO_RETRY: true,
  ENABLE_ADVANCED_MEASUREMENTS: true
};

// Advanced foot measurement types
export enum AdvancedMeasurementType {
  PHOTOPLETHYSMOGRAPHY = 'photoplethysmography',
  HIND_FOOT_VALGUS_ANGLE = 'hind_foot_valgus_angle',
  HIND_FOOT_VARUS_ANGLE = 'hind_foot_varus_angle',
  FOOT_POSTURE_INDEX = 'foot_posture_index',
  ARCH_HEIGHT_INDEX = 'arch_height_index',
  ARCH_RIGIDITY_INDEX = 'arch_rigidity_index',
  MEDIAL_LONGITUDINAL_ARCH_ANGLE = 'medial_longitudinal_arch_angle',
  CHIPPAUX_SMIRAK_INDEX = 'chippaux_smirak_index',
  VALGUS_INDEX = 'valgus_index',
  ARCH_ANGLE = 'arch_angle'
}

// Advanced measurement descriptions for user display
export const ADVANCED_MEASUREMENT_DESCRIPTIONS = {
  [AdvancedMeasurementType.PHOTOPLETHYSMOGRAPHY]: 'Blood flow analysis using color changes in tissue',
  [AdvancedMeasurementType.HIND_FOOT_VALGUS_ANGLE]: 'Angle between calcaneus vertical axis and lower leg vertical axis (valgus)',
  [AdvancedMeasurementType.HIND_FOOT_VARUS_ANGLE]: 'Angle between calcaneus vertical axis and lower leg vertical axis (varus)',
  [AdvancedMeasurementType.FOOT_POSTURE_INDEX]: 'Composite score of foot posture based on multiple observations',
  [AdvancedMeasurementType.ARCH_HEIGHT_INDEX]: 'Ratio of arch height to truncated foot length',
  [AdvancedMeasurementType.ARCH_RIGIDITY_INDEX]: 'Ratio of seated to standing arch height index',
  [AdvancedMeasurementType.MEDIAL_LONGITUDINAL_ARCH_ANGLE]: 'Angle between medial calcaneus, navicular tuberosity, and 1st metatarsal head',
  [AdvancedMeasurementType.CHIPPAUX_SMIRAK_INDEX]: 'Ratio of minimum midfoot width to maximum forefoot width',
  [AdvancedMeasurementType.VALGUS_INDEX]: 'Percentage ratio of lateral/medial areas of footprint',
  [AdvancedMeasurementType.ARCH_ANGLE]: 'Angle formed by medial border of footprint'
};

// Security & Compliance
export enum AuditAction {
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_REGISTER = 'user_register',
  USER_UPDATE = 'user_update',
  USER_DELETE = 'user_delete',
  SCAN_CREATE = 'scan_create',
  SCAN_VIEW = 'scan_view',
  SCAN_UPDATE = 'scan_update',
  SCAN_DELETE = 'scan_delete',
  PRESCRIPTION_CREATE = 'prescription_create',
  PRESCRIPTION_VIEW = 'prescription_view',
  PRESCRIPTION_UPDATE = 'prescription_update',
  PRESCRIPTION_DELETE = 'prescription_delete',
  REPORT_EXPORT = 'report_export',
  DATA_EXPORT = 'data_export',
  SETTINGS_CHANGE = 'settings_change',
  API_ACCESS = 'api_access',
  FAILED_LOGIN = 'failed_login',
  USER_IMPERSONATION = 'user_impersonation'
}

// Report formats
export enum ReportFormat {
  PDF = 'pdf',
  HTML = 'html',
  JSON = 'json'
}

// Report languages
export enum ReportLanguage {
  ENGLISH = 'en',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de',
  ITALIAN = 'it',
  PORTUGUESE = 'pt',
  CHINESE = 'zh',
  JAPANESE = 'ja',
  KOREAN = 'ko',
  HINDI = 'hi',
  ARABIC = 'ar'
}

// Confidence score thresholds
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.9,    // 90% and above is high confidence
  MEDIUM: 0.7,  // 70-89% is medium confidence
  LOW: 0.5,     // 50-69% is low confidence
  VERY_LOW: 0.3 // below 50% is very low confidence
};

// ICD-10 codes for common foot conditions
export const ICD10_CODES = {
  FLAT_FOOT: 'M21.4',
  HIGH_ARCH: 'Q66.7',
  PLANTAR_FASCIITIS: 'M72.2',
  HALLUX_VALGUS: 'M20.1',
  HALLUX_RIGIDUS: 'M20.2',
  HAMMER_TOE: 'M20.4',
  METATARSALGIA: 'M77.4',
  HEEL_SPUR: 'M77.3',
  ANKLE_SPRAIN: 'S93.4',
  ACHILLES_TENDINITIS: 'M76.6'
};

// PII masking fields - used to determine which fields should be masked in logs
export const PII_FIELDS = [
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