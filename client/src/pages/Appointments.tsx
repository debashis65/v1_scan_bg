import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import axios from 'axios';

// Types
interface Appointment {
  id: number;
  patientId: number;
  patientName: string;
  date: string;
  time: string;
  endTime: string;
  type: string;
}

const Appointments: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | 'week'>('today');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  // Mock data - in a real app, this would come from an API
  const initialAppointments: Appointment[] = [
    { 
      id: 1, 
      patientId: 1, 
      patientName: 'John Doe', 
      date: '2025-05-20', 
      time: '10:30 AM', 
      endTime: '11:15 AM',
      type: 'Initial Consultation' 
    },
    { 
      id: 2, 
      patientId: 2, 
      patientName: 'Maria Thompson', 
      date: '2025-05-20', 
      time: '1:15 PM', 
      endTime: '2:00 PM',
      type: 'Follow-up Consultation' 
    },
    { 
      id: 3, 
      patientId: 3, 
      patientName: 'Robert Brown', 
      date: '2025-05-20', 
      time: '3:00 PM', 
      endTime: '3:45 PM',
      type: 'Orthotics Fitting' 
    },
    { 
      id: 4, 
      patientId: 4, 
      patientName: 'Alice Wong', 
      date: '2025-05-20', 
      time: '4:30 PM', 
      endTime: '5:15 PM',
      type: 'Follow-up Consultation' 
    },
    // Tomorrow's appointments
    { 
      id: 5, 
      patientId: 5, 
      patientName: 'Michael Davis', 
      date: '2025-05-21', 
      time: '9:00 AM', 
      endTime: '9:45 AM',
      type: 'Initial Consultation' 
    },
    { 
      id: 6, 
      patientId: 6, 
      patientName: 'Jennifer Wilson', 
      date: '2025-05-21', 
      time: '2:30 PM', 
      endTime: '3:15 PM',
      type: 'Foot Scan' 
    },
    // Later this week
    { 
      id: 7, 
      patientId: 7, 
      patientName: 'David Martinez', 
      date: '2025-05-22', 
      time: '11:00 AM', 
      endTime: '11:45 AM',
      type: 'Initial Consultation' 
    },
    { 
      id: 8, 
      patientId: 8, 
      patientName: 'Sarah Johnson', 
      date: '2025-05-23', 
      time: '10:00 AM', 
      endTime: '10:45 AM',
      type: 'Follow-up Consultation' 
    },
    { 
      id: 9, 
      patientId: 9, 
      patientName: 'Thomas Lee', 
      date: '2025-05-24', 
      time: '1:00 PM', 
      endTime: '1:45 PM',
      type: 'Orthotics Fitting' 
    },
    { 
      id: 10, 
      patientId: 10, 
      patientName: 'Emily Parker', 
      date: '2025-05-25', 
      time: '3:30 PM', 
      endTime: '4:15 PM',
      type: 'Follow-up Consultation' 
    }
  ];

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        // In a real app, this would be an actual API call
        // const response = await axios.get('/api/appointments');
        // setAppointments(response.data);
        
        // Using mock data instead
        setAppointments(initialAppointments);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  // Get filtered appointments based on active tab
  const getFilteredAppointments = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    if (activeTab === 'today') {
      return appointments.filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        appointmentDate.setHours(0, 0, 0, 0);
        return appointmentDate.getTime() === today.getTime();
      });
    } else if (activeTab === 'tomorrow') {
      return appointments.filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        appointmentDate.setHours(0, 0, 0, 0);
        return appointmentDate.getTime() === tomorrow.getTime();
      });
    } else if (activeTab === 'week') {
      return appointments.filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        appointmentDate.setHours(0, 0, 0, 0);
        return appointmentDate.getTime() >= today.getTime() && appointmentDate.getTime() <= weekEnd.getTime();
      });
    }
    
    return [];
  };

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

  // Group appointments by date for the week view
  const groupAppointmentsByDate = (appointments: Appointment[]) => {
    const grouped: { [key: string]: Appointment[] } = {};
    
    appointments.forEach(appointment => {
      if (!grouped[appointment.date]) {
        grouped[appointment.date] = [];
      }
      grouped[appointment.date].push(appointment);
    });
    
    // Sort by date
    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
      .map(([date, appointments]) => ({
        date,
        appointments,
      }));
  };

  const filteredAppointments = getFilteredAppointments();
  const groupedAppointments = groupAppointmentsByDate(filteredAppointments);
  
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Appointments</h1>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <svg className="mr-2 -ml-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Appointment
        </button>
      </div>
      
      {/* Tabs */}
      <div className="flex mb-6 space-x-4">
        <div 
          className={`flex-1 p-4 text-center rounded-lg ${activeTab === 'today' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
          onClick={() => setActiveTab('today')}
          style={{ cursor: 'pointer' }}
        >
          <h3 className="text-lg font-semibold mb-2">Today</h3>
          <p className="text-xl font-bold">
            {appointments.filter(a => {
              const appointmentDate = new Date(a.date);
              appointmentDate.setHours(0, 0, 0, 0);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return appointmentDate.getTime() === today.getTime();
            }).length} appointments
          </p>
        </div>
        
        <div 
          className={`flex-1 p-4 text-center rounded-lg ${activeTab === 'tomorrow' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
          onClick={() => setActiveTab('tomorrow')}
          style={{ cursor: 'pointer' }}
        >
          <h3 className="text-lg font-semibold mb-2">Tomorrow</h3>
          <p className="text-xl font-bold">
            {appointments.filter(a => {
              const appointmentDate = new Date(a.date);
              appointmentDate.setHours(0, 0, 0, 0);
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(0, 0, 0, 0);
              return appointmentDate.getTime() === tomorrow.getTime();
            }).length} appointments
          </p>
        </div>
        
        <div 
          className={`flex-1 p-4 text-center rounded-lg ${activeTab === 'week' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
          onClick={() => setActiveTab('week')}
          style={{ cursor: 'pointer' }}
        >
          <h3 className="text-lg font-semibold mb-2">This Week</h3>
          <p className="text-xl font-bold">
            {appointments.filter(a => {
              const appointmentDate = new Date(a.date);
              appointmentDate.setHours(0, 0, 0, 0);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const weekEnd = new Date(today);
              weekEnd.setDate(weekEnd.getDate() + 7);
              return appointmentDate.getTime() >= today.getTime() && appointmentDate.getTime() <= weekEnd.getTime();
            }).length} appointments
          </p>
        </div>
      </div>
      
      {/* Appointment List */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        {activeTab === 'week' ? (
          // Week view - grouped by date
          <>
            {groupedAppointments.map(group => (
              <div key={group.date}>
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">{formatDate(group.date)}</h3>
                </div>
                <ul className="divide-y divide-gray-200">
                  {group.appointments.map(appointment => (
                    <li key={appointment.id} className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="min-w-0 flex-1 flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-semibold">
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
                          <div className="text-sm text-gray-900 font-medium">{appointment.time} - {appointment.endTime}</div>
                        </div>
                        <div className="ml-4">
                          <button className="p-2 text-gray-400 hover:text-gray-500 focus:outline-none">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {groupedAppointments.length === 0 && (
              <div className="px-6 py-10 text-center text-gray-500">
                No appointments scheduled for this period.
              </div>
            )}
          </>
        ) : (
          // Today/Tomorrow view
          <>
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">{activeTab === 'today' ? "Today's Appointments" : "Tomorrow's Appointments"}</h3>
            </div>
            <ul className="divide-y divide-gray-200">
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map(appointment => (
                  <li key={appointment.id} className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="min-w-0 flex-1 flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-semibold">
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
                        <div className="text-sm text-gray-900 font-medium">{appointment.time} - {appointment.endTime}</div>
                      </div>
                      <div className="ml-4">
                        <button className="p-2 text-gray-400 hover:text-gray-500 focus:outline-none">
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <li className="px-6 py-10 text-center text-gray-500">
                  No appointments scheduled for {activeTab === 'today' ? 'today' : 'tomorrow'}.
                </li>
              )}
            </ul>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Appointments;