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
  phone: string;
  lastVisit?: string;
  nextAppointment?: string;
  scanStatus?: 'completed' | 'processing' | 'none';
}

const Patients: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Mock data - in a real app, this would come from an API
  const initialPatients: Patient[] = [
    { 
      id: 1, 
      fullName: 'James Wilson', 
      email: 'james.wilson@example.com', 
      phone: '+1 (555) 123-4567',
      lastVisit: '2025-05-19', 
      nextAppointment: '2025-06-02',
      scanStatus: 'completed'
    },
    { 
      id: 2, 
      fullName: 'Emily Chang', 
      email: 'emily.chang@example.com', 
      phone: '+1 (555) 987-6543',
      lastVisit: '2025-05-18', 
      nextAppointment: '2025-06-15',
      scanStatus: 'completed'
    },
    { 
      id: 3, 
      fullName: 'Robert Johnson', 
      email: 'robert.johnson@example.com', 
      phone: '+1 (555) 765-4321',
      lastVisit: '2025-05-15',
      scanStatus: 'completed'
    },
    { 
      id: 4, 
      fullName: 'Sarah Miller', 
      email: 'sarah.miller@example.com', 
      phone: '+1 (555) 456-7890',
      lastVisit: '2025-05-20',
      scanStatus: 'processing'
    },
    { 
      id: 5, 
      fullName: 'Michael Davis', 
      email: 'michael.davis@example.com', 
      phone: '+1 (555) 234-5678',
      lastVisit: '2025-05-01',
      nextAppointment: '2025-06-05',
      scanStatus: 'completed'
    }
  ];

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        // In a real app, this would be an actual API call
        // const response = await axios.get('/api/patients');
        // setPatients(response.data);
        
        // Using mock data instead
        setPatients(initialPatients);
      } catch (error) {
        console.error('Error fetching patients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  // Filter patients based on search term and status filter
  const filteredPatients = patients.filter((patient) => {
    const matchesSearch = 
      patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.id.toString().includes(searchTerm);
    
    if (statusFilter === '') {
      return matchesSearch;
    } else if (statusFilter === 'active' && patient.nextAppointment) {
      return matchesSearch;
    } else if (statusFilter === 'recent' && new Date(patient.lastVisit || '').getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000) {
      return matchesSearch;
    } else if (statusFilter === 'inactive' && (!patient.nextAppointment && (!patient.lastVisit || new Date(patient.lastVisit).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000))) {
      return matchesSearch;
    }
    
    return false;
  });

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
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

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Patient Management</h1>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <svg className="mr-2 -ml-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add New Patient
        </button>
      </div>
      
      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">Search</label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input 
                type="text" 
                name="search" 
                id="search" 
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md" 
                placeholder="Search patients by name, email, or ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full md:w-1/4">
            <label htmlFor="status" className="sr-only">Filter by Status</label>
            <select 
              id="status" 
              name="status" 
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Patients</option>
              <option value="active">Active Patients</option>
              <option value="recent">Recent Patients</option>
              <option value="inactive">Inactive Patients</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Patient List */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="sm:flex sm:items-center px-6 py-4 border-b border-gray-200">
          <div className="sm:flex-1">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Patients</h3>
            <p className="mt-1 text-sm text-gray-500">A list of all the patients in your practice.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Info
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Visit
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scan Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Appointment
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <tr key={patient.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-semibold">
                          {getInitials(patient.fullName)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{patient.fullName}</div>
                          <div className="text-sm text-gray-500">ID: #{`PAT2025${String(patient.id).padStart(4, '0')}`}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{patient.email}</div>
                      <div className="text-sm text-gray-500">{patient.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{patient.lastVisit ? formatDate(patient.lastVisit) : '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {patient.scanStatus && (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          patient.scanStatus === 'completed' ? 'bg-green-100 text-green-800' :
                          patient.scanStatus === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {patient.scanStatus === 'completed' ? 'Scan Completed' :
                           patient.scanStatus === 'processing' ? 'Processing' :
                           'No Scan'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.nextAppointment ? formatDate(patient.nextAppointment) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`/patients/${patient.id}`} className="text-indigo-600 hover:text-indigo-900 mr-4">View</Link>
                      <Link to={`/patients/${patient.id}/edit`} className="text-gray-600 hover:text-gray-900">Edit</Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                    No patients found matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredPatients.length > 0 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <nav className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Previous
                </button>
                <button className="relative ml-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredPatients.length}</span> of <span className="font-medium">{patients.length}</span> patients
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-indigo-100 text-sm font-medium text-indigo-600 hover:bg-indigo-50">
                      1
                    </button>
                    <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Patients;