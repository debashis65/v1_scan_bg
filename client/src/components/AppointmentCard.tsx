import React from 'react';

interface AppointmentCardProps {
  patientName: string;
  patientEmail: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  onView: () => void;
  onEdit?: () => void;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  patientName,
  patientEmail,
  date,
  time,
  status,
  notes,
  onView,
  onEdit
}) => {
  // Status colors and labels
  const statusConfig = {
    scheduled: {
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      label: 'Scheduled'
    },
    completed: {
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      label: 'Completed'
    },
    cancelled: {
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      label: 'Cancelled'
    }
  };
  
  const { bgColor, textColor, label } = statusConfig[status];
  const initials = patientName.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <tr className="bg-white hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-600 font-medium">{initials}</span>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{patientName}</div>
            <div className="text-sm text-gray-500">{patientEmail}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{date}</div>
        <div className="text-sm text-gray-500">{time}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor} ${textColor}`}>
          {label}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {notes || 'No notes'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button 
          onClick={onView}
          className="text-primary hover:text-primary-dark mr-4"
        >
          View
        </button>
        {onEdit && (
          <button 
            onClick={onEdit}
            className="text-primary hover:text-primary-dark"
          >
            Edit
          </button>
        )}
      </td>
    </tr>
  );
};

export default AppointmentCard;