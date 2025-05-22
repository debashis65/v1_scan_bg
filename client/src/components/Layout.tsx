import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Icons (imported from a component library like Lucide React in a real implementation)
const DashboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const PatientsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const AppointmentsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ScansIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  // Function to get the initials from the user's name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  // Get navigation items based on user role
  const getNavItems = () => {
    // Common navigation items for all users
    const commonItems = [
      {
        name: 'Dashboard',
        path: '/',
        icon: <DashboardIcon />,
      },
      {
        name: 'Appointments',
        path: '/appointments',
        icon: <AppointmentsIcon />,
      },
      {
        name: 'Scans',
        path: '/scans',
        icon: <ScansIcon />,
      },
      {
        name: 'Settings',
        path: '/settings',
        icon: <SettingsIcon />,
      },
    ];
    
    // Doctor-specific navigation items
    if (user?.role === 'doctor') {
      // Add Patients to the beginning of the navigation
      return [
        commonItems[0], // Dashboard
        {
          name: 'Patients',
          path: '/patients',
          icon: <PatientsIcon />,
        },
        ...commonItems.slice(1) // The rest of the common items
      ];
    }
    
    return commonItems;
  };

  // Get the navigation items
  const navItems = getNavItems();

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      // Redirect is handled by the auth context
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar for desktop */}
      <div className={`hidden md:flex md:flex-shrink-0 ${sidebarOpen ? 'md:w-64' : 'md:w-20'} transition-all duration-300`}>
        <div className="flex flex-col w-full bg-indigo-700">
          {/* Sidebar header */}
          <div className="flex items-center h-16 px-4 bg-indigo-800">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 bg-white rounded-lg">
                <span className="text-xl font-bold text-indigo-700">B</span>
              </div>
              {sidebarOpen && <span className="ml-3 text-xl font-semibold text-white">Barogrip</span>}
            </div>
          </div>

          {/* Sidebar content */}
          <div className="flex flex-col flex-grow px-4 pt-5 pb-4 overflow-y-auto">
            <div className="flex-grow mt-5">
              <nav className="flex-1 space-y-2">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path || 
                                  (item.path !== '/' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                        isActive
                          ? 'text-white bg-indigo-800'
                          : 'text-indigo-100 hover:bg-indigo-600'
                      }`}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {sidebarOpen && <span>{item.name}</span>}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* User profile section */}
            {user && (
              <div className="pt-4 pb-3 border-t border-indigo-800">
                <div className="flex items-center px-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-indigo-900 flex items-center justify-center text-white font-semibold">
                      {user.fullName ? getInitials(user.fullName) : user.username?.substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                  {sidebarOpen && (
                    <div className="ml-3">
                      <div className="text-base font-medium text-white">{user.fullName || user.username}</div>
                      <div className="text-sm font-medium text-indigo-200">{user.email}</div>
                    </div>
                  )}
                </div>
                <div className="mt-3 px-2">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-3 py-2 text-sm font-medium text-indigo-100 rounded-md hover:bg-indigo-600"
                  >
                    <LogoutIcon />
                    {sidebarOpen && <span className="ml-3">Sign out</span>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
          <div className="relative flex flex-col w-full max-w-xs pb-12 overflow-y-auto bg-indigo-700 shadow-xl">
            {/* Mobile sidebar header */}
            <div className="flex items-center justify-between h-16 px-4 bg-indigo-800">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-white rounded-lg">
                  <span className="text-xl font-bold text-indigo-700">B</span>
                </div>
                <span className="ml-3 text-xl font-semibold text-white">Barogrip</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-white focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mobile sidebar content */}
            <div className="flex-1 px-4 pt-5 pb-4">
              <nav className="flex-1 space-y-2">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path || 
                                   (item.path !== '/' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                        isActive
                          ? 'text-white bg-indigo-800'
                          : 'text-indigo-100 hover:bg-indigo-600'
                      }`}
                    >
                      <span className="mr-3">{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* User profile in mobile sidebar */}
              {user && (
                <div className="pt-4 pb-3 mt-6 border-t border-indigo-800">
                  <div className="flex items-center px-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-indigo-900 flex items-center justify-center text-white font-semibold">
                        {user.fullName ? getInitials(user.fullName) : user.username?.substring(0, 2).toUpperCase()}
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-white">{user.fullName || user.username}</div>
                      <div className="text-sm font-medium text-indigo-200">{user.email}</div>
                    </div>
                  </div>
                  <div className="mt-3 px-2">
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-3 py-2 text-sm font-medium text-indigo-100 rounded-md hover:bg-indigo-600"
                    >
                      <LogoutIcon />
                      <span className="ml-3">Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top navigation */}
        <div className="bg-white shadow-sm z-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                {/* Mobile menu button */}
                <div className="flex-shrink-0 flex items-center md:hidden">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 text-gray-500 rounded-md"
                  >
                    <MenuIcon />
                  </button>
                  <div className="flex items-center ml-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-indigo-600 rounded-lg">
                      <span className="text-xl font-bold text-white">B</span>
                    </div>
                    <span className="ml-3 text-xl font-semibold text-gray-900">Barogrip</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                {/* Toggle sidebar button for desktop */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="hidden md:block p-2 text-gray-500 rounded-md"
                >
                  {sidebarOpen ? (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
                
                {/* User dropdown for mobile */}
                <div className="ml-4 relative flex-shrink-0 md:hidden">
                  {user && (
                    <div className="flex items-center">
                      <button className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-white font-semibold">
                          {user.fullName ? getInitials(user.fullName) : user.username?.substring(0, 2).toUpperCase()}
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;