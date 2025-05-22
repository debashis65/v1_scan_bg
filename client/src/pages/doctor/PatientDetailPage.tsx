import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import axios from 'axios';

// Types
interface Patient {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  emergencyContact?: string;
  medicalHistory?: string[];
  allergies?: string[];
  lastVisit?: string;
  nextAppointment?: string;
}

interface Scan {
  id: number;
  createdAt: string;
  status: 'processing' | 'completed' | 'failed';
  type: string;
  notes?: string;
}

interface Appointment {
  id: number;
  date: string;
  time: string;
  type: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface Note {
  id: number;
  createdAt: string;
  content: string;
  doctor: string;
}

const PatientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'scans' | 'appointments' | 'notes'>('overview');
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        // In a real app, these would be actual API calls
        // const patientResponse = await axios.get(`/api/patients/${id}`);
        // const scansResponse = await axios.get(`/api/patients/${id}/scans`);
        // const appointmentsResponse = await axios.get(`/api/patients/${id}/appointments`);
        // const notesResponse = await axios.get(`/api/patients/${id}/notes`);

        // For development, we'll use mock data
        setPatient({
          id: parseInt(id || '1'),
          fullName: 'James Wilson',
          email: 'james.wilson@example.com',
          phone: '+1 (555) 123-4567',
          dateOfBirth: '1985-06-15',
          gender: 'male',
          emergencyContact: 'Sarah Wilson: +1 (555) 987-6543',
          medicalHistory: ['Plantar Fasciitis (2022)', 'Ankle Sprain (2021)'],
          allergies: ['Penicillin'],
          lastVisit: '2025-05-19',
          nextAppointment: '2025-06-02',
        });
        
        setScans([
          { id: 1, createdAt: '2025-05-19T10:30:00', status: 'completed', type: 'Regular Check-up', notes: 'Minor progression in arch support needs.' },
          { id: 2, createdAt: '2025-04-05T14:15:00', status: 'completed', type: 'Foot Pain Analysis', notes: 'Patient reported heel pain after long walks.' },
          { id: 3, createdAt: '2025-02-20T11:00:00', status: 'completed', type: 'Orthotics Fitting', notes: 'New orthotics provided for everyday use.' }
        ]);
        
        setAppointments([
          { id: 1, date: '2025-06-02', time: '11:00 AM', type: 'Follow-up Consultation', status: 'scheduled' },
          { id: 2, date: '2025-05-19', time: '10:30 AM', type: 'Regular Check-up', notes: 'Reviewed scan results, recommended new exercises.', status: 'completed' },
          { id: 3, date: '2025-04-05', time: '2:15 PM', type: 'Foot Pain Analysis', notes: 'Discussed pain management options.', status: 'completed' }
        ]);
        
        setNotes([
          { id: 1, createdAt: '2025-05-19T11:15:00', content: 'Patient reported improvement with the current orthotics. Will continue with the current treatment plan.', doctor: 'Dr. Sarah Johnson' },
          { id: 2, createdAt: '2025-04-05T15:00:00', content: 'Recommended daily foot exercises to alleviate heel pain. Patient willing to try.', doctor: 'Dr. Sarah Johnson' }
        ]);
      } catch (error) {
        console.error('Error fetching patient data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPatientData();
    }
  }, [id]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Calculate age from date of birth
  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Add a new note
  const handleAddNote = () => {
    if (!newNote.trim() || !user) return;
    
    const currentDate = new Date();
    const newNoteObj: Note = {
      id: notes.length + 1,
      createdAt: currentDate.toISOString(),
      content: newNote.trim(),
      doctor: user.fullName || user.username || 'Doctor',
    };
    
    setNotes(prev => [newNoteObj, ...prev]);
    setNewNote('');
    
    // In a real app, you would submit this to the API
    // await axios.post(`/api/patients/${id}/notes`, { content: newNote.trim() });
  };

  // Book a new appointment
  const handleBookAppointment = () => {
    navigate(`/appointments/new?patientId=${id}`);
  };

  // Request a new scan
  const handleRequestScan = () => {
    navigate(`/scans/new?patientId=${id}`);
  };

  if (loading || !patient) {
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
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button 
              onClick={() => navigate(-1)}
              className="mr-4 p-1 rounded-full hover:bg-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Patient: {patient.fullName}</h1>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleRequestScan}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <svg className="mr-2 -ml-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
              Request Scan
            </button>
            <button
              onClick={handleBookAppointment}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="mr-2 -ml-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Book Appointment
            </button>
          </div>
        </div>
        
        {/* Patient Status Banner */}
        <div className="mt-4 flex items-center p-4 bg-blue-50 rounded-lg">
          <div className="flex-shrink-0 bg-blue-100 rounded-full p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              {patient.nextAppointment ? 
                `Next appointment scheduled for ${formatDate(patient.nextAppointment)}` : 
                'No upcoming appointments scheduled'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('scans')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'scans'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Scans ({scans.length})
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'appointments'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Appointments ({appointments.length})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'notes'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Notes ({notes.length})
          </button>
        </nav>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Patient Information */}
          <div className="md:col-span-2 bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Patient Information</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{patient.fullName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{patient.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{patient.phone}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(patient.dateOfBirth)} ({calculateAge(patient.dateOfBirth)} years)</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Gender</dt>
                  <dd className="mt-1 text-sm text-gray-900">{patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Emergency Contact</dt>
                  <dd className="mt-1 text-sm text-gray-900">{patient.emergencyContact || 'None provided'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Medical History</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {patient.medicalHistory && patient.medicalHistory.length > 0 ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {patient.medicalHistory.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    ) : 'No medical history provided'}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Allergies</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {patient.allergies && patient.allergies.length > 0 ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {patient.allergies.map((allergy, index) => (
                          <li key={index}>{allergy}</li>
                        ))}
                      </ul>
                    ) : 'No allergies reported'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          
          {/* Latest Scan and Appointment */}
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Latest Scan</h3>
              </div>
              {scans.length > 0 ? (
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{scans[0].type}</p>
                      <p className="text-sm text-gray-500">{formatDate(scans[0].createdAt)}</p>
                    </div>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      scans[0].status === 'completed' ? 'bg-green-100 text-green-800' : 
                      scans[0].status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {scans[0].status.charAt(0).toUpperCase() + scans[0].status.slice(1)}
                    </span>
                  </div>
                  {scans[0].notes && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 font-medium">Notes:</p>
                      <p className="text-sm text-gray-700">{scans[0].notes}</p>
                    </div>
                  )}
                  <div className="mt-4">
                    <Link
                      to={`/scans/${scans[0].id}`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      View scan details<span aria-hidden="true"> &rarr;</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
                  No scans available for this patient.
                </div>
              )}
            </div>
            
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Latest Appointment</h3>
              </div>
              {appointments.length > 0 ? (
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{appointments[0].type}</p>
                      <p className="text-sm text-gray-500">{formatDate(appointments[0].date)} | {appointments[0].time}</p>
                    </div>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      appointments[0].status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 
                      appointments[0].status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {appointments[0].status.charAt(0).toUpperCase() + appointments[0].status.slice(1)}
                    </span>
                  </div>
                  {appointments[0].notes && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 font-medium">Notes:</p>
                      <p className="text-sm text-gray-700">{appointments[0].notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
                  No appointments available for this patient.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Scans Tab */}
      {activeTab === 'scans' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {scans.length > 0 ? (
              scans.map((scan) => (
                <li key={scan.id}>
                  <div className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`flex-shrink-0 h-10 w-10 rounded-full ${
                            scan.status === 'completed' ? 'bg-green-100' : 
                            scan.status === 'processing' ? 'bg-yellow-100' :
                            'bg-red-100'
                          } flex items-center justify-center`}>
                            <svg className={`h-6 w-6 ${
                              scan.status === 'completed' ? 'text-green-600' : 
                              scan.status === 'processing' ? 'text-yellow-600' :
                              'text-red-600'
                            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{scan.type}</div>
                            <div className="text-sm text-gray-500">{formatDate(scan.createdAt)}</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            scan.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            scan.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {scan.status.charAt(0).toUpperCase() + scan.status.slice(1)}
                          </span>
                          <div className="ml-4">
                            <Link
                              to={`/scans/${scan.id}`}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              View Details
                            </Link>
                          </div>
                        </div>
                      </div>
                      {scan.notes && (
                        <div className="mt-3 text-sm text-gray-500">
                          <p className="font-medium text-xs text-gray-400 mb-1">Notes:</p>
                          {scan.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-6 py-4 text-center text-gray-500">No scans available for this patient.</li>
            )}
          </ul>
        </div>
      )}
      
      {/* Appointments Tab */}
      {activeTab === 'appointments' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {appointments.length > 0 ? (
              appointments.map((appointment) => (
                <li key={appointment.id}>
                  <div className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`flex-shrink-0 h-10 w-10 rounded-full ${
                            appointment.status === 'scheduled' ? 'bg-blue-100' : 
                            appointment.status === 'completed' ? 'bg-green-100' :
                            'bg-red-100'
                          } flex items-center justify-center`}>
                            <svg className={`h-6 w-6 ${
                              appointment.status === 'scheduled' ? 'text-blue-600' : 
                              appointment.status === 'completed' ? 'text-green-600' :
                              'text-red-600'
                            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{appointment.type}</div>
                            <div className="text-sm text-gray-500">{formatDate(appointment.date)} | {appointment.time}</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 
                            appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </span>
                          {appointment.status === 'scheduled' && (
                            <div className="ml-4 flex space-x-2">
                              <button className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                Reschedule
                              </button>
                              <button className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {appointment.notes && (
                        <div className="mt-3 text-sm text-gray-500">
                          <p className="font-medium text-xs text-gray-400 mb-1">Notes:</p>
                          {appointment.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-6 py-4 text-center text-gray-500">No appointments available for this patient.</li>
            )}
          </ul>
        </div>
      )}
      
      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          {/* Add New Note */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Add a Note</h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Add a new note to the patient's medical record.</p>
              </div>
              <form className="mt-5 sm:flex sm:items-center">
                <div className="w-full sm:max-w-lg">
                  <textarea
                    id="note"
                    name="note"
                    rows={3}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Add your observations, diagnoses, or treatment plans here..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  ></textarea>
                </div>
                <button
                  type="button"
                  onClick={handleAddNote}
                  className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Add Note
                </button>
              </form>
            </div>
          </div>
          
          {/* Notes List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Patient Notes</h3>
            </div>
            <ul className="divide-y divide-gray-200">
              {notes.length > 0 ? (
                notes.map((note) => (
                  <li key={note.id}>
                    <div className="block hover:bg-gray-50">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-900">{note.doctor}</div>
                          <div className="text-sm text-gray-500">{formatDate(note.createdAt)}</div>
                        </div>
                        <div className="mt-3 text-sm text-gray-500">
                          {note.content}
                        </div>
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <li className="px-6 py-4 text-center text-gray-500">No notes available for this patient.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default PatientDetailPage;