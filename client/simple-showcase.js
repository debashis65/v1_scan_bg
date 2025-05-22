import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

// Serve the showcase HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// Serve static files from the src directory
app.use('/src', express.static(path.join(__dirname, 'src')));

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Barogrip UI showcase running at http://localhost:${PORT}`);
});