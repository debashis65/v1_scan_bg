# Barogrip Modernized UI Components

## 1. Layout Component

The layout component provides a responsive structure with a collapsible sidebar navigation:

- **Desktop View**: A full-height sidebar with collapsible menu that can toggle between narrow (icons only) and wide modes
- **Mobile View**: Responsive top bar with hamburger menu that reveals a slide-in sidebar
- **Features**:
  - Role-based navigation items
  - User profile section with initials avatar
  - Seamless transitions between views
  - Clean, medical-focused color scheme (indigo primary color)

```
+----------------------------------------+
|  B | Barogrip                  User    |
+----+-----------------------------+-----+
|    |                                   |
| D  |                                   |
| A  |                                   |
| S  |                                   |
| H  |       Main Content Area           |
| B  |                                   |
| O  |                                   |
| A  |                                   |
| R  |                                   |
| D  |                                   |
|    |                                   |
+----+-----------------------------------+
```

## 2. Dashboard Page

A comprehensive dashboard with multiple sections optimized for both doctors and patients:

- **Doctor Dashboard**:
  - Statistics cards showing total patients, scans today, upcoming appointments, and diagnosis rate
  - Recent scans section with patient details and scan status
  - Today's appointments list with patient profiles and time slots
  - Quick action buttons for common tasks

- **Patient Dashboard**:
  - Personal scan history with status indicators
  - Upcoming appointments
  - Treatment progress visualization
  - Quick access to book new appointments or request scans

```
+---------------------------------------+
| Doctor Dashboard                      |
+---------------------------------------+
| Stats:  28 Patients | 7 Scans | 12 App|
+---------------------------------------+
| Recent Scans        | Today's Appts   |
|                     |                 |
| John D. - Complete  | 10:30 - John D. |
| Sarah M. - Process  | 13:15 - Maria T.|
| Robert J.- Complete | 15:00 - Robert B|
|                     |                 |
+---------------------------------------+
```

## 3. Patients Management Page

Comprehensive patient management interface for doctors:

- **Features**:
  - Search functionality by name, email, or ID
  - Filtering by status (all, active, recent, inactive)
  - Patient cards with key information including scan status
  - Detailed patient profiles with scan and appointment history
  - Add new patient functionality

```
+---------------------------------------+
| Patient Management        + Add New   |
+---------------------------------------+
| Search: [                    ]  Filter▼|
+---------------------------------------+
| Name         | Contact  | Last Visit  |
+---------------------------------------+
| James Wilson | Email    | May 19, 2025|
| ID: #PAT20250001  | Phone   | Next: Jun 2 |
+---------------------------------------+
| Emily Chang  | Email    | May 18, 2025|
| ID: #PAT20250002  | Phone   | Next: Jun 15|
+---------------------------------------+
```

## 4. Appointment Scheduling System

Interactive appointment scheduling and management:

- **Features**:
  - Tab-based navigation between Today, Tomorrow, and Week views
  - Week view with appointments grouped by date
  - Patient details with appointment type and duration
  - Quick actions menu for rescheduling or canceling
  - New appointment creation with time slot selection

```
+---------------------------------------+
| Appointments              + New Appt  |
+---------------------------------------+
| Today (4) | Tomorrow (2) | Week (10)  |
+---------------------------------------+
| Monday, May 20                        |
+---------------------------------------+
| JD John Doe       | 10:30 - 11:15 AM  |
| Initial Consultation                  |
+---------------------------------------+
| MT Maria Thompson | 1:15 - 2:00 PM    |
| Follow-up Consultation               |
+---------------------------------------+
```

## 5. Authentication System

Secure login and registration system with role-based access:

- **Features**:
  - Two-column responsive layout with form and hero section
  - Toggle between login and registration forms
  - Role selection during registration (doctor/patient)
  - Password validation with strength indicators
  - Form validation with error messaging
  - Persistent session management

```
+---------------------------------------+
|  B | Barogrip                         |
+---------------------------------------+
| Sign In | Register                    |
+---------------------------------------+
| Email: [                           ] |
| Password: [                        ] |
|                                      |
| [Remember me]        [Forgot pass?]  |
|                                      |
| [         Sign in          ]         |
+---------------------------------------+
```

## 6. UI Elements and Components

All UI components follow a consistent design language:

- **Color Scheme**: Indigo primary, with complementary colors for different states
- **Typography**: Clean, readable fonts optimized for medical interfaces
- **Cards and Panels**: Consistent shadow and border treatments
- **Buttons**: Clear hierarchy of primary, secondary and tertiary actions
- **Form Elements**: Accessible inputs with validation states
- **Status Indicators**: Color-coded badges for scan/appointment status
- **Data Visualization**: Clean charts and graphs for foot scan data
- **Loading States**: Consistent spinners and skeleton loaders

All components are fully responsive, accessible, and follow a cohesive design language, creating a modern and professional medical platform interface.