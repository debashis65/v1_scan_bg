import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface LocationState {
  from?: {
    pathname: string;
  };
}

const LoginPage: React.FC = () => {
  // State for login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'doctor' | 'patient' | 'admin'>('patient');
  const [rememberMe, setRememberMe] = useState(false);
  
  // UI state
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { user, login, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      const locationState = location.state as LocationState;
      const destination = locationState?.from?.pathname || '/';
      navigate(destination, { replace: true });
    }
  }, [user, navigate, location]);
  
  // Clear form errors when component mounts
  useEffect(() => {
    clearError();
    setFormError('');
  }, [clearError]);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!email || !password) {
      setFormError('Please fill in all fields');
      return;
    }
    
    try {
      setSubmitting(true);
      await login(email, password);
      // Navigation is handled by the first useEffect
    } catch (err) {
      console.error('Login failed:', err);
      // Error is set by the auth context
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Login Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-600 text-white text-xl font-bold mb-4">B</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Barogrip</h1>
            <p className="text-gray-600">Sign in to your account</p>
          </div>
          
          {/* Error message */}
          {(error || formError) && (
            <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg">
              {formError || error}
            </div>
          )}
          
          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="email@example.com"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="••••••••"
                required
              />
            </div>
            
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">I am a</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'doctor' | 'patient' | 'admin')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">Remember me</label>
              </div>
              <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Forgot password?</a>
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
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
            
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/auth/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Register now
                </Link>
              </p>
            </div>
          </form>
          
          <div className="mt-6 text-center text-xs text-gray-500">
            <Link to="/privacy" className="hover:text-indigo-500">Privacy Policy</Link>
            <span className="mx-2">•</span>
            <Link to="/terms" className="hover:text-indigo-500">Terms of Use</Link>
          </div>
        </div>
      </div>
      
      {/* Hero Image Side - visible only on larger screens */}
      <div className="hidden lg:block lg:w-1/2 bg-indigo-600 relative">
        <div className="absolute inset-0 flex flex-col justify-center p-12 text-white">
          <h2 className="text-4xl font-bold mb-6">Advanced Foot Scanning Technology</h2>
          <p className="text-xl mb-8">Barogrip provides cutting-edge AI-powered foot scanning and analysis for podiatrists and patients.</p>
          <ul className="space-y-4">
            <li className="flex items-center">
              <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Precise 3D foot scanning
            </li>
            <li className="flex items-center">
              <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              AI-powered analysis
            </li>
            <li className="flex items-center">
              <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Orthotics recommendations
            </li>
            <li className="flex items-center">
              <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Patient progress tracking
            </li>
          </ul>
        </div>
        <div className="absolute bottom-4 right-4 text-white opacity-70 text-sm">
          © 2025 Barogrip Medical Technologies
        </div>
      </div>
    </div>
  );
};

export default LoginPage;