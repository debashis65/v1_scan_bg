import React, { useContext } from 'react';
import { Plus } from 'lucide-react';
import { AuthContext } from '../App';
import Layout from '../components/Layout';
import Button from '../components/Button';
import ScanCard from '../components/ScanCard';

const MedicalRecords: React.FC = () => {
  const { user } = React.useContext(AuthContext);
  
  // Mock scan data
  const mockScans = [
    {
      id: 1,
      patientName: 'John Doe',
      scanDate: 'May 15, 2025',
      diagnosis: 'Flat Foot (Grade 2)',
      status: 'complete' as const,
      imageSrc: '/sample-scan-1.jpg'
    },
    {
      id: 2,
      patientName: 'Jane Smith',
      scanDate: 'May 19, 2025',
      status: 'processing' as const
    },
    {
      id: 3,
      patientName: 'Michael Brown',
      scanDate: 'May 10, 2025',
      diagnosis: 'High Arch (Grade 1)',
      status: 'complete' as const,
      imageSrc: '/sample-scan-2.jpg'
    }
  ];
  
  // Filter scans based on user role
  // For a doctor, show all scans; for a patient, only show their scans
  const filteredScans = user?.role === 'doctor' 
    ? mockScans 
    : mockScans.filter(scan => scan.patientName === user?.name);
  
  const handleScanClick = (scanId: number) => {
    console.log(`View scan with ID: ${scanId}`);
    // Navigate to scan details page
  };

  return (
    <Layout user={user} onLogout={() => useContext(AuthContext).logout()}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">
            {user?.role === 'doctor' ? 'Foot Scans' : 'My Foot Scans'}
          </h1>
          {user?.role === 'doctor' && (
            <Button 
              variant="primary"
              icon={<Plus size={16} />}
            >
              Upload New Scan
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScans.length > 0 ? (
            filteredScans.map(scan => (
              <ScanCard
                key={scan.id}
                patientName={scan.patientName}
                scanDate={scan.scanDate}
                diagnosis={scan.diagnosis}
                status={scan.status}
                imageSrc={scan.imageSrc}
                onClick={() => handleScanClick(scan.id)}
              />
            ))
          ) : (
            <div className="col-span-3 bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="mt-2 text-base font-medium text-gray-900">No foot scans yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {user?.role === 'doctor' 
                    ? 'Upload a new scan to begin the diagnostic process.' 
                    : 'Your doctor hasn\'t uploaded any foot scans for you yet.'}
                </p>
                {user?.role === 'doctor' && (
                  <div className="mt-6">
                    <Button variant="primary">
                      Upload New Scan
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MedicalRecords;