import React from 'react';

interface ScanCardProps {
  patientName: string;
  scanDate: string;
  diagnosis?: string;
  status: 'complete' | 'processing' | 'failed';
  imageSrc?: string;
  onClick: () => void;
}

const ScanCard: React.FC<ScanCardProps> = ({
  patientName,
  scanDate,
  diagnosis,
  status,
  imageSrc,
  onClick
}) => {
  // Status colors and labels
  const statusConfig = {
    complete: {
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      label: 'Complete'
    },
    processing: {
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      label: 'Processing'
    },
    failed: {
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      label: 'Failed'
    }
  };
  
  const { bgColor, textColor, label } = statusConfig[status];

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer transition-shadow hover:shadow-md" onClick={onClick}>
      <div className="p-4 flex justify-between items-start">
        <div>
          <h3 className="font-medium">{patientName}</h3>
          <p className="text-sm text-gray-500">{scanDate}</p>
        </div>
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor} ${textColor}`}>
          {label}
        </span>
      </div>
      <div className="h-48 bg-gray-200 flex items-center justify-center relative">
        {imageSrc ? (
          <img src={imageSrc} alt="Foot scan visualization" className="w-full h-full object-cover" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </div>
      <div className="p-4 border-t">
        <div className="flex items-center mb-2">
          {status === 'complete' ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="font-medium">Diagnosis:</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Status:</span>
            </>
          )}
        </div>
        <p className="text-gray-700">{status === 'complete' ? diagnosis : status === 'processing' ? 'Analyzing foot scan...' : 'Analysis failed'}</p>
        <div className="mt-4 flex">
          <a href="#" className="text-primary font-medium text-sm">View Details</a>
          {status === 'complete' && (
            <a href="#" className="text-primary font-medium text-sm ml-auto">Download Report</a>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanCard;