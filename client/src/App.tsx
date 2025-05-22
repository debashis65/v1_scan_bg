import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Doctor pages
import DoctorDashboard from './pages/doctor/DashboardPage';
import PatientDetailPage from './pages/doctor/PatientDetailPage';

// Patient pages
import PatientDashboard from './pages/patient/DashboardPage';

// Common pages
import ScanDetailPage from './pages/scan/ScanDetailPage';
import NotFoundPage from './NotFoundPage';

// Protected Route component
const ProtectedRoute: React.FC<{
  element: React.ReactNode;
  allowedRoles?: string[];
}> = ({ element, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user.role === 'doctor') {
      return <Navigate to="/doctor" replace />;
    } else if (user.role === 'patient') {
      return <Navigate to="/patient" replace />;
    } else {
      return <Navigate to="/admin" replace />;
    }
  }

  return <>{element}</>;
};

// Main Router component
const AppRouter: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Auth routes */}
      <Route 
        path="/auth/login" 
        element={user ? (user.role === 'doctor' ? <Navigate to="/doctor" /> : <Navigate to="/patient" />) : <LoginPage />} 
      />
      <Route 
        path="/auth/register" 
        element={user ? (user.role === 'doctor' ? <Navigate to="/doctor" /> : <Navigate to="/patient" />) : <RegisterPage />} 
      />

      {/* Doctor routes */}
      <Route 
        path="/doctor" 
        element={<ProtectedRoute element={<DoctorDashboard />} allowedRoles={['doctor']} />}
      />
      <Route 
        path="/patients/:id" 
        element={<ProtectedRoute element={<PatientDetailPage />} allowedRoles={['doctor']} />}
      />

      {/* Patient routes */}
      <Route 
        path="/patient" 
        element={<ProtectedRoute element={<PatientDashboard />} allowedRoles={['patient']} />}
      />

      {/* Common routes */}
      <Route 
        path="/scans/:id" 
        element={<ProtectedRoute element={<ScanDetailPage />} allowedRoles={['doctor', 'patient']} />}
      />

      {/* Redirect from root based on user role */}
      <Route 
        path="/" 
        element={
          user ? (
            user.role === 'doctor' ? (
              <Navigate to="/doctor" replace />
            ) : (
              <Navigate to="/patient" replace />
            )
          ) : (
            <Navigate to="/auth/login" replace />
          )
        } 
      />

      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

// Main App component with providers
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;