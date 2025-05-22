import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

// Types
interface Scan {
  id: number;
  patientId: number;
  patientName: string;
  doctorId?: number;
  doctorName?: string;
  createdAt: string;
  status: 'processing' | 'completed' | 'failed';
  type: string;
  diagnosticData?: DiagnosticData;
  images: ScanImage[];
  notes?: string;
}

interface DiagnosticData {
  archType: {
    left: string;
    right: string;
  };
  pressurePoints: {
    left: string[];
    right: string[];
  };
  alignment: {
    left: string;
    right: string;
  };
  gaitAnalysis: {
    pronation: string;
    supination: string;
    stride: string;
  };
  recommendations: {
    orthotics: string;
    exercises: string[];
    followUp: string;
  };
  aiConfidence: number;
}

interface ScanImage {
  id: number;
  type: 'pressure_map' | 'arch_analysis' | 'left_foot' | 'right_foot' | '3d_model';
  url: string;
  thumbnail?: string;
}

const ScanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [scan, setScan] = useState<Scan | null>(null);
  const [selectedImage, setSelectedImage] = useState<ScanImage | null>(null);
  const [activeTab, setActiveTab] = useState<'visualizations' | 'diagnosis' | 'models'>('visualizations');

  useEffect(() => {
    const fetchScanData = async () => {
      try {
        // In a real app, this would be an actual API call
        // const response = await axios.get(`/api/scans/${id}`);
        // setScan(response.data);

        // For development, we'll use mock data
        const mockScan: Scan = {
          id: parseInt(id || '1'),
          patientId: 1,
          patientName: 'James Wilson',
          doctorId: 2,
          doctorName: 'Dr. Sarah Johnson',
          createdAt: '2025-05-19T10:30:00',
          status: 'completed',
          type: 'Comprehensive Foot Analysis',
          diagnosticData: {
            archType: {
              left: 'Normal Arch',
              right: 'Flat Arch (Grade 2)'
            },
            pressurePoints: {
              left: ['Medial Heel', 'First Metatarsal Head'],
              right: ['Lateral Midfoot', 'Fifth Metatarsal Head', 'Lateral Heel']
            },
            alignment: {
              left: 'Neutral',
              right: 'Valgus (3°)'
            },
            gaitAnalysis: {
              pronation: 'Mild Overpronation',
              supination: 'Normal',
              stride: 'Asymmetrical'
            },
            recommendations: {
              orthotics: 'Custom Orthotic with Right Arch Support and Medial Posting',
              exercises: [
                'Towel Curls: 3 sets of 15 reps daily',
                'Calf Stretches: Hold for 30 seconds, 5 times daily',
                'Single Leg Balance: 1 minute per leg, twice daily'
              ],
              followUp: '6 weeks'
            },
            aiConfidence: 94
          },
          images: [
            {
              id: 1,
              type: 'pressure_map',
              url: '/output/optimized/pressure_maps/optimized_pressure_map_8567.jpg',
              thumbnail: '/output/optimized/pressure_maps/optimized_pressure_map_8567_thumb.jpg'
            },
            {
              id: 2,
              type: 'arch_analysis',
              url: '/output/optimized/arch_analysis/optimized_arch_analysis_5935.jpg',
              thumbnail: '/output/optimized/arch_analysis/optimized_arch_analysis_5935_thumb.jpg'
            },
            {
              id: 3,
              type: 'left_foot',
              url: '/output/optimized/pressure_maps/left_foot_heatmap_8778.jpg',
              thumbnail: '/output/optimized/pressure_maps/left_foot_heatmap_8778_thumb.jpg'
            },
            {
              id: 4,
              type: 'right_foot',
              url: '/output/optimized/pressure_maps/right_foot_heatmap_7490.jpg',
              thumbnail: '/output/optimized/pressure_maps/right_foot_heatmap_7490_thumb.jpg'
            },
            {
              id: 5,
              type: '3d_model',
              url: '/output/3d_models/foot_model.obj',
            }
          ],
          notes: 'Patient reported occasional right foot pain after long walks. The scan confirms flat arch on right foot with increased lateral loading.'
        };

        setScan(mockScan);
        setSelectedImage(mockScan.images[0]);

      } catch (error) {
        console.error('Error fetching scan data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchScanData();
    }
  }, [id]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Handle downloading report
  const handleDownloadReport = () => {
    // In a real app, this would hit an API endpoint
    // window.location.href = `/api/scans/${id}/report/pdf`;
    alert('Report download would be triggered here');
  };

  // Handle downloading 3D model (for doctors only)
  const handleDownload3DModel = (format: 'obj' | 'stl') => {
    // In a real app, this would hit an API endpoint
    // window.location.href = `/api/scans/${id}/model/${format}`;
    alert(`3D model download would be triggered here (${format} format)`);
  };

  // Handle booking appointment based on scan (for patients only)
  const handleBookAppointment = () => {
    navigate(`/appointments/new?scanId=${id}`);
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

  if (!scan) {
    return (
      <Layout>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900">Scan not found</h2>
          <p className="mt-2 text-gray-500">The scan you are looking for does not exist or may have been deleted.</p>
          <div className="mt-4">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Go Back
            </button>
          </div>
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
            <h1 className="text-2xl font-semibold text-gray-900">Foot Scan: {scan.type}</h1>
          </div>
          
          {/* Action buttons based on user role */}
          <div className="flex space-x-3">
            {user?.role === 'doctor' ? (
              <>
                <div className="relative inline-block text-left">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    id="download-menu-button"
                    onClick={() => handleDownloadReport()}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Report
                  </button>
                </div>
                <div className="relative inline-block text-left">
                  <div>
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      id="model-menu-button"
                      aria-expanded="true"
                      aria-haspopup="true"
                      onClick={() => handleDownload3DModel('obj')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      Download 3D Model
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={handleBookAppointment}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Book Appointment
              </button>
            )}
          </div>
        </div>
        
        {/* Scan Info Banner */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center p-4 bg-gray-50 rounded-lg">
          <div className="flex-1 flex items-center">
            <div className={`flex-shrink-0 h-10 w-10 rounded-full ${
              scan.status === 'completed' ? 'bg-green-100' : 
              scan.status === 'processing' ? 'bg-yellow-100' :
              'bg-red-100'
            } flex items-center justify-center mr-4`}>
              <svg className={`h-6 w-6 ${
                scan.status === 'completed' ? 'text-green-600' : 
                scan.status === 'processing' ? 'text-yellow-600' :
                'text-red-600'
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {scan.status === 'completed' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                ) : scan.status === 'processing' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                )}
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${
                  scan.status === 'completed' ? 'bg-green-100 text-green-800' : 
                  scan.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {scan.status.charAt(0).toUpperCase() + scan.status.slice(1)}
                </span>
                {scan.patientName}
              </div>
              <div className="text-sm text-gray-500">
                Scanned on {formatDate(scan.createdAt)}
                {scan.doctorName && ` by ${scan.doctorName}`}
              </div>
            </div>
          </div>
          {scan.diagnosticData && (
            <div className="mt-3 sm:mt-0 flex items-center">
              <div className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                AI Confidence: {scan.diagnosticData.aiConfidence}%
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('visualizations')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'visualizations'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Visualizations
          </button>
          <button
            onClick={() => setActiveTab('diagnosis')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'diagnosis'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Diagnosis & Recommendations
          </button>
          {user?.role === 'doctor' && (
            <button
              onClick={() => setActiveTab('models')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'models'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              3D Models
            </button>
          )}
        </nav>
      </div>
      
      {/* Visualizations Tab */}
      {activeTab === 'visualizations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Image Display */}
          <div className="lg:col-span-2 bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                {selectedImage?.type === 'pressure_map' ? 'Pressure Map' :
                 selectedImage?.type === 'arch_analysis' ? 'Arch Analysis' :
                 selectedImage?.type === 'left_foot' ? 'Left Foot Pressure' :
                 selectedImage?.type === 'right_foot' ? 'Right Foot Pressure' :
                 selectedImage?.type === '3d_model' ? '3D Model Preview' : 'Visualization'}
              </h3>
            </div>
            <div className="px-4 py-5 sm:p-6 flex justify-center">
              {selectedImage && selectedImage.type !== '3d_model' ? (
                <img 
                  src={selectedImage.url} 
                  alt={selectedImage.type} 
                  className="max-h-96 object-contain"
                  onError={(e) => {
                    // Fallback for missing images
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/800x600?text=Image+Not+Available';
                  }}
                />
              ) : (
                <div className="w-full h-96 bg-gray-100 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                    <p className="mt-2">3D Model Viewer would appear here</p>
                    {user?.role === 'doctor' && (
                      <button
                        onClick={() => handleDownload3DModel('obj')}
                        className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Download 3D Model
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            {selectedImage && selectedImage.type !== '3d_model' && (
              <div className="px-4 py-4 sm:px-6 bg-gray-50 text-sm text-gray-500">
                {selectedImage.type === 'pressure_map' ? 
                  'This pressure map shows the distribution of weight and pressure across both feet. Red areas indicate high pressure points, yellow indicates moderate pressure, and green represents lower pressure.' : 
                 selectedImage.type === 'arch_analysis' ? 
                  'The arch analysis visualization highlights the medial longitudinal arch structure of each foot. This helps identify flat feet (pes planus) or high arches (pes cavus).' :
                 selectedImage.type === 'left_foot' ? 
                  'Left foot pressure distribution showing detailed weight distribution and potential pressure points.' :
                 selectedImage.type === 'right_foot' ? 
                  'Right foot pressure distribution showing detailed weight distribution and potential pressure points.' : 
                  'Visualization showing foot scan data.'}
              </div>
            )}
          </div>
          
          {/* Thumbnails and Notes */}
          <div className="space-y-6">
            {/* Image Thumbnails */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Images</h3>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4">
                {scan.images.map((image) => (
                  <button
                    key={image.id}
                    className={`relative rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                      selectedImage?.id === image.id ? 'ring-2 ring-indigo-500' : ''
                    }`}
                    onClick={() => setSelectedImage(image)}
                  >
                    {image.type !== '3d_model' ? (
                      <img 
                        src={image.thumbnail || image.url} 
                        alt={image.type} 
                        className="w-full h-24 object-cover"
                        onError={(e) => {
                          // Fallback for missing images
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/150?text=Thumbnail';
                        }}
                      />
                    ) : (
                      <div className="w-full h-24 bg-gray-100 flex items-center justify-center text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-medium px-2 py-1 bg-black bg-opacity-50 rounded">
                        {image.type === 'pressure_map' ? 'Pressure Map' :
                         image.type === 'arch_analysis' ? 'Arch Analysis' :
                         image.type === 'left_foot' ? 'Left Foot' :
                         image.type === 'right_foot' ? 'Right Foot' :
                         image.type === '3d_model' ? '3D Model' : 'Image'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Scan Notes */}
            {scan.notes && (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Notes</h3>
                </div>
                <div className="px-4 py-5 sm:p-6">
                  <p className="text-sm text-gray-500">{scan.notes}</p>
                </div>
              </div>
            )}
            
            {/* Scan Summary */}
            {scan.diagnosticData && (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Scan Summary</h3>
                </div>
                <div className="px-4 py-5 sm:p-6">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Left Foot Arch</dt>
                      <dd className="mt-1 text-sm text-gray-900">{scan.diagnosticData.archType.left}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Right Foot Arch</dt>
                      <dd className="mt-1 text-sm text-gray-900">{scan.diagnosticData.archType.right}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Primary Gait Pattern</dt>
                      <dd className="mt-1 text-sm text-gray-900">{scan.diagnosticData.gaitAnalysis.pronation}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Recommended Follow-up</dt>
                      <dd className="mt-1 text-sm text-gray-900">{scan.diagnosticData.recommendations.followUp}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Diagnosis & Recommendations Tab */}
      {activeTab === 'diagnosis' && scan.diagnosticData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Diagnosis */}
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Foot Structure Analysis</h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <div className="flex items-center text-sm font-medium text-gray-900 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                      </svg>
                      Arch Type
                    </div>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Left Foot</dt>
                    <dd className="mt-1 text-sm text-gray-900">{scan.diagnosticData.archType.left}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Right Foot</dt>
                    <dd className="mt-1 text-sm text-gray-900">{scan.diagnosticData.archType.right}</dd>
                  </div>
                  
                  <div className="sm:col-span-2 border-t pt-5">
                    <div className="flex items-center text-sm font-medium text-gray-900 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Pressure Points
                    </div>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Left Foot</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <ul className="list-disc pl-5 space-y-1">
                        {scan.diagnosticData.pressurePoints.left.map((point, index) => (
                          <li key={index}>{point}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Right Foot</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <ul className="list-disc pl-5 space-y-1">
                        {scan.diagnosticData.pressurePoints.right.map((point, index) => (
                          <li key={index}>{point}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                  
                  <div className="sm:col-span-2 border-t pt-5">
                    <div className="flex items-center text-sm font-medium text-gray-900 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      Alignment
                    </div>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Left Foot</dt>
                    <dd className="mt-1 text-sm text-gray-900">{scan.diagnosticData.alignment.left}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Right Foot</dt>
                    <dd className="mt-1 text-sm text-gray-900">{scan.diagnosticData.alignment.right}</dd>
                  </div>
                </dl>
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Gait Analysis</h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Pronation</dt>
                    <dd className="mt-1 text-sm text-gray-900">{scan.diagnosticData.gaitAnalysis.pronation}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Supination</dt>
                    <dd className="mt-1 text-sm text-gray-900">{scan.diagnosticData.gaitAnalysis.supination}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Stride</dt>
                    <dd className="mt-1 text-sm text-gray-900">{scan.diagnosticData.gaitAnalysis.stride}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
          
          {/* Recommendations */}
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Recommendations</h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <div className="space-y-6">
                  <div>
                    <h4 className="flex items-center text-sm font-medium text-gray-900 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Orthotics Recommendation
                    </h4>
                    <p className="mt-1 text-sm text-gray-900 pl-7">{scan.diagnosticData.recommendations.orthotics}</p>
                  </div>
                  
                  <div>
                    <h4 className="flex items-center text-sm font-medium text-gray-900 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Exercises
                    </h4>
                    <ul className="mt-1 text-sm text-gray-900 space-y-2 pl-7">
                      {scan.diagnosticData.recommendations.exercises.map((exercise, index) => (
                        <li key={index} className="flex items-start">
                          <span className="h-5 w-5 text-green-500 mr-2">•</span>
                          <span>{exercise}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="flex items-center text-sm font-medium text-gray-900 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Follow-up Schedule
                    </h4>
                    <p className="mt-1 text-sm text-gray-900 pl-7">Recommended follow-up in {scan.diagnosticData.recommendations.followUp}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium leading-6 text-gray-900">AI Analysis Information</h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center mb-4">
                  <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-gray-900">AI Diagnostic Confidence</h4>
                    <div className="mt-1 flex items-center">
                      <div className="w-48 bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${
                            scan.diagnosticData.aiConfidence >= 90 ? 'bg-green-500' :
                            scan.diagnosticData.aiConfidence >= 70 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${scan.diagnosticData.aiConfidence}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-sm text-gray-700">{scan.diagnosticData.aiConfidence}%</span>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  <p>This diagnostic analysis was performed using Barogrip's AI-powered algorithms. The confidence score indicates the reliability of the automated findings. All results should be confirmed by a qualified healthcare professional.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 3D Models Tab (Doctors Only) */}
      {activeTab === 'models' && user?.role === 'doctor' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">3D Models</h3>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="text-sm text-gray-500 mb-6">
              <p>3D models generated from the scan data are available for download in different formats. These models can be used for custom orthotic design, detailed analysis, or patient education.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-gray-900">OBJ Format</h4>
                    <p className="text-sm text-gray-500 mt-1">Standard 3D object format, compatible with most 3D software.</p>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => handleDownload3DModel('obj')}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download OBJ
                  </button>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-gray-900">STL Format</h4>
                    <p className="text-sm text-gray-500 mt-1">3D printing friendly format, ideal for orthotic manufacturing.</p>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => handleDownload3DModel('stl')}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download STL
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ScanDetailPage;