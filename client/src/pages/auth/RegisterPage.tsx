import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Doctor-specific registration fields
interface DoctorFields {
  specialty: string;
  licenseNumber: string;
  clinic: string;
  yearsOfExperience: string;
}

// Patient-specific registration fields
interface PatientFields {
  dateOfBirth: string;
  gender: string;
  phoneNumber: string;
  emergencyContact: string;
}

const RegisterPage: React.FC = () => {
  // Common registration fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'doctor' | 'patient'>('patient');
  
  // Role-specific fields
  const [doctorFields, setDoctorFields] = useState<DoctorFields>({
    specialty: '',
    licenseNumber: '',
    clinic: '',
    yearsOfExperience: ''
  });
  
  const [patientFields, setPatientFields] = useState<PatientFields>({
    dateOfBirth: '',
    gender: '',
    phoneNumber: '',
    emergencyContact: ''
  });
  
  // UI state
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const { user, register, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);
  
  // Clear form errors when component mounts
  useEffect(() => {
    clearError();
    setFormError('');
  }, [clearError]);
  
  // Check password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }
    
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 1;
    
    // Character variety checks
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    setPasswordStrength(strength);
  }, [password]);
  
  // Update doctor fields
  const handleDoctorFieldChange = (field: keyof DoctorFields, value: string) => {
    setDoctorFields(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Update patient fields
  const handlePatientFieldChange = (field: keyof PatientFields, value: string) => {
    setPatientFields(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    // Basic validation
    if (!email || !password || !confirmPassword || !fullName) {
      setFormError('Please fill in all required fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    
    if (passwordStrength < 3) {
      setFormError('Please use a stronger password');
      return;
    }
    
    // Role-specific validation
    if (role === 'doctor') {
      if (!doctorFields.licenseNumber || !doctorFields.specialty) {
        setFormError('Please fill in all required doctor information');
        return;
      }
    } else {
      if (!patientFields.dateOfBirth || !patientFields.phoneNumber) {
        setFormError('Please fill in all required patient information');
        return;
      }
    }
    
    try {
      setSubmitting(true);
      
      // Prepare registration data based on role
      const registrationData = {
        email,
        password,
        fullName,
        role,
        ...(role === 'doctor' ? doctorFields : patientFields)
      };
      
      await register(registrationData);
      // Redirect is handled by the first useEffect
    } catch (err) {
      console.error('Registration failed:', err);
      // Error is set by the auth context
    } finally {
      setSubmitting(false);
    }
  };
  
  // Get password strength color
  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Registration Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-600 text-white text-xl font-bold mb-4">B</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create an Account</h1>
            <p className="text-gray-600">Join Barogrip's advanced foot scanning platform</p>
          </div>
          
          {/* Error message */}
          {(error || formError) && (
            <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg">
              {formError || error}
            </div>
          )}
          
          {/* Role selection tabs */}
          <div className="flex mb-6 border rounded-lg overflow-hidden">
            <button
              type="button"
              className={`flex-1 py-2 px-4 text-sm font-medium text-center ${role === 'patient' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
              onClick={() => setRole('patient')}
            >
              I'm a Patient
            </button>
            <button
              type="button"
              className={`flex-1 py-2 px-4 text-sm font-medium text-center ${role === 'doctor' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
              onClick={() => setRole('doctor')}
            >
              I'm a Doctor
            </button>
          </div>
          
          {/* Registration Form */}
          <form className="space-y-5" onSubmit={handleRegister}>
            {/* Common fields */}
            <div className="grid grid-cols-1 gap-5">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name*</label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="John Smith"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address*</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password*</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                  required
                />
                
                {/* Password strength meter */}
                {password && (
                  <div className="mt-2">
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getPasswordStrengthColor()}`} 
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      ></div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {passwordStrength <= 1 ? 'Weak' : 
                       passwordStrength <= 3 ? 'Moderate' : 'Strong'} password
                    </p>
                  </div>
                )}
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password*</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            
            {/* Doctor-specific fields */}
            {role === 'doctor' && (
              <div className="border-t pt-5 space-y-5">
                <h3 className="text-lg font-medium text-gray-900">Doctor Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-1">Specialty*</label>
                    <input
                      type="text"
                      id="specialty"
                      value={doctorFields.specialty}
                      onChange={(e) => handleDoctorFieldChange('specialty', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Podiatrist"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-1">License Number*</label>
                    <input
                      type="text"
                      id="licenseNumber"
                      value={doctorFields.licenseNumber}
                      onChange={(e) => handleDoctorFieldChange('licenseNumber', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="ABC123456"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="clinic" className="block text-sm font-medium text-gray-700 mb-1">Clinic/Hospital</label>
                    <input
                      type="text"
                      id="clinic"
                      value={doctorFields.clinic}
                      onChange={(e) => handleDoctorFieldChange('clinic', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Medical Center Name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="yearsOfExperience" className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                    <input
                      type="number"
                      id="yearsOfExperience"
                      value={doctorFields.yearsOfExperience}
                      onChange={(e) => handleDoctorFieldChange('yearsOfExperience', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="5"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Patient-specific fields */}
            {role === 'patient' && (
              <div className="border-t pt-5 space-y-5">
                <h3 className="text-lg font-medium text-gray-900">Patient Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth*</label>
                    <input
                      type="date"
                      id="dateOfBirth"
                      value={patientFields.dateOfBirth}
                      onChange={(e) => handlePatientFieldChange('dateOfBirth', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      id="gender"
                      value={patientFields.gender}
                      onChange={(e) => handlePatientFieldChange('gender', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">Phone Number*</label>
                    <input
                      type="tel"
                      id="phoneNumber"
                      value={patientFields.phoneNumber}
                      onChange={(e) => handlePatientFieldChange('phoneNumber', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="+1 (555) 123-4567"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                    <input
                      type="text"
                      id="emergencyContact"
                      value={patientFields.emergencyContact}
                      onChange={(e) => handlePatientFieldChange('emergencyContact', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Name: (555) 987-6543"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-center mt-4">
              <input
                id="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                I agree to the <Link to="/terms" className="text-indigo-600 hover:text-indigo-500">Terms of Service</Link> and <Link to="/privacy" className="text-indigo-600 hover:text-indigo-500">Privacy Policy</Link>
              </label>
            </div>
            
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
            
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
      
      {/* Hero Image Side - visible only on larger screens */}
      <div className="hidden lg:block lg:w-1/2 bg-indigo-600 relative">
        <div className="absolute inset-0 flex flex-col justify-center p-12 text-white">
          <h2 className="text-4xl font-bold mb-6">Join Our Medical Platform</h2>
          <p className="text-xl mb-8">
            {role === 'doctor' 
              ? 'Provide advanced foot care with AI-powered analysis and recommendations for your patients.' 
              : 'Get personalized foot care recommendations and track your progress with our advanced technology.'}
          </p>
          <ul className="space-y-4">
            {role === 'doctor' ? (
              <>
                <li className="flex items-center">
                  <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Advanced diagnostic tools
                </li>
                <li className="flex items-center">
                  <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Patient management system
                </li>
                <li className="flex items-center">
                  <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  AI-powered treatment recommendations
                </li>
              </>
            ) : (
              <>
                <li className="flex items-center">
                  <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Personalized foot care
                </li>
                <li className="flex items-center">
                  <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Track your progress over time
                </li>
                <li className="flex items-center">
                  <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Easy appointment scheduling
                </li>
              </>
            )}
          </ul>
        </div>
        <div className="absolute bottom-4 right-4 text-white opacity-70 text-sm">
          © 2025 Barogrip Medical Technologies
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;