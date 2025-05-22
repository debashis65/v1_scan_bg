import React from 'react';

interface PatientCardProps {
  name: string;
  email: string;
  phone: string;
  onEdit?: () => void;
  onClick: () => void;
}

const PatientCard: React.FC<PatientCardProps> = ({
  name,
  email,
  phone,
  onEdit,
  onClick
}) => {
  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <div className="px-4 py-4 sm:px-6 cursor-pointer" onClick={onClick}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-primary truncate">{name}</p>
          {onEdit && (
            <div className="ml-2 flex-shrink-0 flex">
              <button 
                className="p-1 rounded-full text-gray-500 hover:text-gray-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          )}
        </div>
        <div className="mt-2 sm:flex sm:justify-between">
          <div className="sm:flex">
            <p className="flex items-center text-sm text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
              {email}
            </p>
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <p>{phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientCard;