import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import axios from 'axios';

// Types
interface Patient {
  id: number;
  fullName: string;
  email: string;
  lastVisit?: string;
  nextAppointment?: string;
}

interface Scan {
  id: number;
  patientId: number;
  patientName: string;
  createdAt: string;
  status: 'processing' | 'completed' | 'failed';
}

interface Appointment {
  id: number;
  patientId: number;
  patientName: string;
  date: string;
  time: string;
  type: string;
}

// Mock data - in a real app this would come from an API
const initialPatients: Patient[] = [
  { id: 1, fullName: 'James Wilson', email: 'james.wilson@example.com', lastVisit: '2025-05-19', nextAppointment: '2025-06-02' },
  { id: 2, fullName: 'Emily Chang', email: 'emily.chang@example.com', lastVisit: '2025-05-18', nextAppointment: '2025-06-15' },
  { id: 3, fullName: 'Robert Johnson', email: 'robert.johnson@example.com', lastVisit: '2025-05-15' },
  { id: 4, fullName: 'Sarah Miller', email: 'sarah.miller@example.com', lastVisit: '2025-05-20' }
];

const initialScans: Scan[] = [
  { id: 1, patientId: 1, patientName: 'James Wilson', createdAt: '2025-05-19T10:30:00', status: 'completed' },
  { id: 2, patientId: 2, patientName: 'Emily Chang', createdAt: '2025-05-18T14:15:00', status: 'completed' },
  { id: 3, patientId: 3, patientName: 'Robert Johnson', createdAt: '2025-05-15T11:00:00', status: 'completed' },
  { id: 4, patientId: 4, patientName: 'Sarah Miller', createdAt: '2025-05-20T09:45:00', status: 'processing' }
];

const initialAppointments: Appointment[] = [
  { id: 1, patientId: 1, patientName: 'John Doe', date: '2025-05-20', time: '10:30 AM', type: 'Initial Consultation' },
  { id: 2, patientId: 2, patientName: 'Maria Thompson', date: '2025-05-20', time: '1:15 PM', type: 'Follow-up Consultation' },
  { id: 3, patientId: 3, patientName: 'Robert Brown', date: '2025-05-20', time: '3:00 PM', type: 'Orthotics Fitting' },
  { id: 4, patientId: 4, patientName: 'Alice Wong', date: '2025-05-20', time: '4:30 PM', type: 'Follow-up Consultation' }
];

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [recentScans, setRecentScans] = useState<Scan[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    scansToday: 0,
    upcomingAppointments: 0,
    diagnosisRate: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // In a real app, these would be actual API calls
        // const patientsResponse = await axios.get('/api/patients');
        // const scansResponse = await axios.get('/api/scans/recent');
        // const appointmentsResponse = await axios.get('/api/appointments/today');
        // const statsResponse = await axios.get('/api/stats');

        // Instead, we'll use the mock data
        setPatients(initialPatients);
        setRecentScans(initialScans);
        setTodayAppointments(initialAppointments);
        setStats({
          totalPatients: 28,
          scansToday: 7,
          upcomingAppointments: 12,
          diagnosisRate: 97
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Format date for display
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </Layout>
    );
  }

  // Render different dashboard based on user role
  if (user?.role === 'patient') {
    return (
      <Layout>
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Patient Dashboard</h1>
        {/* Patient dashboard content would go here */}
        <p>Welcome to your patient dashboard. Here you can view your upcoming appointments and scan history.</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Doctor Dashboard</h1>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Patients</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats.totalPatients}</div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      <svg className="self-center flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="sr-only">Increased by</span>
                      4
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Scans Today</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats.scansToday}</div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      <svg className="self-center flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="sr-only">Increased by</span>
                      2
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Upcoming Appointments</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats.upcomingAppointments}</div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      <svg className="self-center flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="sr-only">Increased by</span>
                      3
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">AI Diagnosis Rate</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats.diagnosisRate}%</div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      <svg className="self-center flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="sr-only">Increased by</span>
                      2%
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Scans */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Recent Foot Scans</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {recentScans.map((scan) => (
              <li key={scan.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full ${
                      scan.status === 'processing' ? 'bg-yellow-100' : 'bg-blue-100'
                    } flex items-center justify-center`}>
                      <svg className={`h-6 w-6 ${
                        scan.status === 'processing' ? 'text-yellow-600' : 'text-blue-600'
                      }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {scan.status === 'processing' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        )}
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-gray-900">{scan.patientName}</h4>
                    <p className="text-sm text-gray-500">
                      {scan.status === 'completed' ? 
                        `Completed ${new Date(scan.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                        : 'Processing'}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      scan.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      scan.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {scan.status.charAt(0).toUpperCase() + scan.status.slice(1)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <Link to="/scans" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              View all<span aria-hidden="true"> &rarr;</span>
            </Link>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Today's Appointments</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {todayAppointments.map((appointment) => (
              <li key={appointment.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center">
                  <div className="min-w-0 flex-1 flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-semibold">
                        {getInitials(appointment.patientName)}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 px-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate">{appointment.patientName}</p>
                        <p className="text-sm text-gray-500">{appointment.type}</p>
                      </div>
                    </div>
                  </div>
                  <div className="ml-5 flex-shrink-0">
                    <div className="text-sm text-gray-900 font-medium">{appointment.time}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <Link to="/appointments" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              View all<span aria-hidden="true"> &rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;