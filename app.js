const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Parse incoming JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets (index.html, style.css, main.js, etc.) from root directory
app.use(express.static(path.join(__dirname)));

// Express fallback route to serve index.html directly on root HTTP URL (http://localhost:3000)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

module.exports = app;