import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import axios from 'axios';

// Types
interface Scan {
  id: number;
  createdAt: string;
  status: 'processing' | 'completed' | 'failed';
  type: string;
  doctor?: string;
}

interface Appointment {
  id: number;
  doctorId: number;
  doctorName: string;
  date: string;
  time: string;
  type: string;
}

interface Recommendation {
  id: number;
  title: string;
  description: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
  isCompleted: boolean;
}

const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recentScans, setRecentScans] = useState<Scan[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [stats, setStats] = useState({
    totalScans: 0,
    completedScans: 0,
    upcomingAppointments: 0,
    healthScore: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // In a real app, these would be actual API calls
        // const scansResponse = await axios.get('/api/patient/scans');
        // const appointmentsResponse = await axios.get('/api/patient/appointments/upcoming');
        // const recommendationsResponse = await axios.get('/api/patient/recommendations');
        // const statsResponse = await axios.get('/api/patient/stats');

        // For development, we'll use mock data
        setRecentScans([
          { id: 1, createdAt: '2025-05-19T10:30:00', status: 'completed', type: 'Regular Check-up', doctor: 'Dr. Sarah Johnson' },
          { id: 2, createdAt: '2025-05-10T14:15:00', status: 'completed', type: 'Foot Pain Analysis', doctor: 'Dr. Michael Thompson' },
          { id: 3, createdAt: '2025-04-25T11:00:00', status: 'completed', type: 'Orthotics Fitting', doctor: 'Dr. Sarah Johnson' }
        ]);
        
        setUpcomingAppointments([
          { id: 1, doctorId: 1, doctorName: 'Dr. Sarah Johnson', date: '2025-05-30', time: '10:30 AM', type: 'Follow-up Consultation' },
          { id: 2, doctorId: 2, doctorName: 'Dr. Michael Thompson', date: '2025-06-15', time: '2:00 PM', type: 'Regular Check-up' }
        ]);
        
        setRecommendations([
          { id: 1, title: 'Daily Foot Exercises', description: 'Complete the recommended foot strengthening exercises daily', date: '2025-05-15', priority: 'high', isCompleted: false },
          { id: 2, title: 'Wear Orthotics', description: 'Wear your prescribed orthotics for at least 8 hours daily', date: '2025-05-15', priority: 'high', isCompleted: true },
          { id: 3, title: 'Foot Massage', description: 'Massage your feet with the recommended oil for 5 minutes daily', date: '2025-05-10', priority: 'medium', isCompleted: false }
        ]);
        
        setStats({
          totalScans: 5,
          completedScans: 3,
          upcomingAppointments: 2,
          healthScore: 85
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

  // Toggle recommendation completion
  const toggleRecommendation = (id: number) => {
    setRecommendations(prev => 
      prev.map(rec => 
        rec.id === id ? { ...rec, isCompleted: !rec.isCompleted } : rec
      )
    );
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

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Welcome, {user?.fullName || 'Patient'}</h1>
        <Link 
          to="/appointments/new" 
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="mr-2 -ml-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Book Appointment
        </Link>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Scans</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats.totalScans}</div>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed Scans</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats.completedScans}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Upcoming Appointments</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats.upcomingAppointments}</div>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Foot Health Score</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats.healthScore}/100</div>
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
            <h3 className="text-lg font-medium leading-6 text-gray-900">Your Recent Scans</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {recentScans.length > 0 ? (
              recentScans.map((scan) => (
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
                    <div className="ml-4 flex-1">
                      <div className="flex justify-between">
                        <h4 className="text-sm font-medium text-gray-900">{scan.type}</h4>
                        <p className="text-sm text-gray-500">{formatDate(scan.createdAt)}</p>
                      </div>
                      <div className="mt-1">
                        <p className="text-sm text-gray-500">{scan.doctor}</p>
                      </div>
                    </div>
                    <div className="ml-2">
                      <Link
                        to={`/scans/${scan.id}`}
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-6 text-center text-gray-500">
                No scans available yet. Book an appointment to get started.
              </li>
            )}
          </ul>
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <Link to="/scans" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              View all scans<span aria-hidden="true"> &rarr;</span>
            </Link>
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Upcoming Appointments</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((appointment) => (
                <li key={appointment.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex justify-between">
                        <h4 className="text-sm font-medium text-gray-900">{appointment.type}</h4>
                        <p className="text-sm text-gray-500">{formatDate(appointment.date)} | {appointment.time}</p>
                      </div>
                      <div className="mt-1">
                        <p className="text-sm text-gray-500">{appointment.doctorName}</p>
                      </div>
                    </div>
                    <div className="ml-2 flex space-x-2">
                      <button className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                        Reschedule
                      </button>
                      <Link
                        to={`/appointments/${appointment.id}`}
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-6 text-center text-gray-500">
                No upcoming appointments. Click "Book Appointment" to schedule one.
              </li>
            )}
          </ul>
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <Link to="/appointments" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              View all appointments<span aria-hidden="true"> &rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Treatment Recommendations */}
      <div className="mt-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Treatment Recommendations</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {recommendations.length > 0 ? (
              recommendations.map((recommendation) => (
                <li key={recommendation.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <input 
                        type="checkbox" 
                        checked={recommendation.isCompleted}
                        onChange={() => toggleRecommendation(recommendation.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex justify-between">
                        <h4 className={`text-sm font-medium ${recommendation.isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {recommendation.title}
                        </h4>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          recommendation.priority === 'high' ? 'bg-red-100 text-red-800' :
                          recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {recommendation.priority.charAt(0).toUpperCase() + recommendation.priority.slice(1)} Priority
                        </span>
                      </div>
                      <div className="mt-1">
                        <p className={`text-sm ${recommendation.isCompleted ? 'text-gray-400' : 'text-gray-500'}`}>
                          {recommendation.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Recommended on {formatDate(recommendation.date)}</p>
                      </div>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-6 text-center text-gray-500">
                No recommendations available yet. Complete a scan to receive personalized recommendations.
              </li>
            )}
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default PatientDashboard;