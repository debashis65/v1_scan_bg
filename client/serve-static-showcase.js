import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5001;

// Serve the static showcase HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'showcase-static.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Barogrip UI static showcase running at http://localhost:${PORT}`);
});