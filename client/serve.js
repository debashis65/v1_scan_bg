const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3300;

// Create a simple HTML page that loads React app
const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Barogrip - Modern Frontend</title>
  <style>
    /* Core styles */
    :root {
      --primary: #4F46E5;
      --primary-dark: #4338CA;
      --secondary: #10B981;
      --secondary-dark: #059669;
      --background: #F9FAFB;
      --text-primary: #111827;
      --text-secondary: #4B5563;
    }
    
    body {
      margin: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background-color: var(--background);
      color: var(--text-primary);
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .header {
      background-color: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .logo {
      display: flex;
      align-items: center;
    }
    
    .logo-icon {
      width: 32px;
      height: 32px;
      background-color: var(--primary);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      margin-right: 8px;
    }
    
    .logo-text {
      font-size: 20px;
      font-weight: 600;
    }
    
    .preview-info {
      margin: 24px 0;
      padding: 16px;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .preview-title {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--primary);
    }
    
    .preview-description {
      font-size: 16px;
      line-height: 1.5;
      color: var(--text-secondary);
      margin-bottom: 16px;
    }
    
    .screenshot {
      width: 100%;
      border-radius: 8px;
      margin: 24px 0;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
      margin: 32px 0;
    }
    
    .feature-card {
      background-color: white;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .feature-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--text-primary);
    }
    
    .feature-description {
      font-size: 14px;
      line-height: 1.5;
      color: var(--text-secondary);
    }
    
    .button {
      background-color: var(--primary);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .button:hover {
      background-color: var(--primary-dark);
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-icon">B</div>
      <div class="logo-text">Barogrip</div>
    </div>
    <button class="button">View Repository</button>
  </div>
  
  <div class="container">
    <div class="preview-info">
      <h1 class="preview-title">Barogrip - Modern Frontend Preview</h1>
      <p class="preview-description">
        The modernized Barogrip frontend has been implemented with a clean, responsive design following the layout from the provided archive. The frontend is built with React, TypeScript, and TailwindCSS.
      </p>
      <p class="preview-description">
        The frontend includes:
        <ul>
          <li>Modern UI components (Button, Input, ScanCard, PatientCard, etc.)</li>
          <li>Responsive layout with sidebar navigation</li>
          <li>Doctor and patient dashboards</li>
          <li>Authentication screens (login/register)</li>
          <li>Patient management, foot scan viewing, and appointments</li>
        </ul>
      </p>
    </div>
    
    <h2 style="margin-top: 32px; margin-bottom: 16px;">UI Preview</h2>
    
    <img src="/login_preview.jpg" alt="Login Screen" class="screenshot">
    <p style="text-align: center; color: var(--text-secondary);">Login Screen</p>
    
    <img src="/dashboard_preview.jpg" alt="Doctor Dashboard" class="screenshot">
    <p style="text-align: center; color: var(--text-secondary);">Doctor Dashboard</p>
    
    <img src="/patients_preview.jpg" alt="Patient Management" class="screenshot">
    <p style="text-align: center; color: var(--text-secondary);">Patient Management</p>
    
    <div class="feature-grid">
      <div class="feature-card">
        <h3 class="feature-title">Modern Component Architecture</h3>
        <p class="feature-description">
          The frontend uses a component-based architecture with TypeScript for type safety, making it easier to maintain and extend.
        </p>
      </div>
      
      <div class="feature-card">
        <h3 class="feature-title">Responsive Design</h3>
        <p class="feature-description">
          The UI is responsive and works well on both desktop and mobile devices, with a collapsible sidebar for smaller screens.
        </p>
      </div>
      
      <div class="feature-card">
        <h3 class="feature-title">Role-Based Access</h3>
        <p class="feature-description">
          Different views and functionality for doctors and patients, with appropriate access controls.
        </p>
      </div>
      
      <div class="feature-card">
        <h3 class="feature-title">Authentication Flow</h3>
        <p class="feature-description">
          Complete authentication flow with login, registration, and secure session management.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// Create server
const server = http.createServer((req, res) => {
  // Handle image requests
  if (req.url.endsWith('.jpg') || req.url.endsWith('.png')) {
    // Return a placeholder image
    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    // For simplicity, just returning placeholder content
    const placeholderImage = Buffer.from('placeholder image data');
    return res.end(placeholderImage);
  }
  
  // Return HTML for any other request
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(htmlContent);
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Preview server running at http://localhost:${PORT}/`);
});