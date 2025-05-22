const express = require('express');
const path = require('path');
const app = express();
const PORT = 8080;

// Serve static files from the preview-html directory
app.use(express.static(path.join(__dirname, 'preview-html')));

// Add a simple index route
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Provide a list of available previews
app.get('/preview-list', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Barogrip UI Previews</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        h1 { color: #4F46E5; }
        ul { list-style-type: none; padding: 0; }
        li { margin-bottom: 10px; }
        a { color: #4F46E5; text-decoration: none; display: block; padding: 10px; border: 1px solid #e5e7eb; border-radius: 4px; }
        a:hover { background-color: #f9fafb; }
      </style>
    </head>
    <body>
      <h1>Barogrip Modernized UI Previews</h1>
      <p>Click on the links below to preview the modernized UI:</p>
      <ul>
        <li><a href="/login.html">Login Screen</a></li>
        <li><a href="/dashboard.html">Doctor Dashboard</a></li>
        <li><a href="/patients.html">Patient Management</a></li>
      </ul>
    </body>
    </html>
  `);
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Preview server running at http://localhost:${PORT}/`);
});