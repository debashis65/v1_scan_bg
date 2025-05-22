const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');

const app = express();
const PORT = 5000; // Replit expects port 5000 for web applications

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Proxy API requests to the backend server
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  logLevel: 'debug'
}));

// Proxy WebSocket requests to the backend server
app.use('/ws', createProxyMiddleware({
  target: 'ws://localhost:3000',
  ws: true,
  changeOrigin: true,
  logLevel: 'debug'
}));

// Serve react directly, using Vite's dev server through middleware
const { createServer } = require('vite');

(async () => {
  try {
    // Create Vite server in middleware mode
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: path.join(__dirname, 'client'),
    });

    // Use vite's connect instance as middleware
    app.use(vite.middlewares);

    // Fall back to serving static files from dist directory if vite fails
    app.use(express.static(path.join(__dirname, 'client/dist')));

    // Fallback handler
    app.use('*', async (req, res, next) => {
      try {
        const url = req.originalUrl;
        console.log('Serving via Vite for path:', url);
        
        // Fallback to index.html
        const template = fs.readFileSync(
          path.resolve(__dirname, 'client/dist/index.html'),
          'utf-8'
        );
        
        const html = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        console.error('Error serving with Vite:', e);
        // Fall back to serving static index.html if vite processing fails
        console.log('Falling back to static index.html');
        res.sendFile(path.join(__dirname, 'client/dist/index.html'));
      }
    });
  } catch (e) {
    console.error('Error setting up Vite middleware:', e);
    
    // Fallback to static serving if Vite middleware setup fails
    console.log('Falling back to static file serving');
    app.use(express.static(path.join(__dirname, 'client/dist')));
    
    app.get('*', (req, res) => {
      console.log('Serving static index.html for path:', req.path);
      res.sendFile(path.join(__dirname, 'client/dist/index.html'));
    });
  }
  
  // Get the Replit domain for messaging
  const replitDomain = process.env.REPLIT_DOMAINS || '(unknown domain)';

  // Start the server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Client app is running on port ${PORT}`);
    console.log(`Replit domain: ${replitDomain}`);
    console.log(`Your application should be accessible at: https://${replitDomain}`);
  });
})();