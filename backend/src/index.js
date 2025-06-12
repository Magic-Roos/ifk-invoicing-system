require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS
const frontendUrl = process.env.FRONTEND_URL;
if (frontendUrl) {
  console.log(`CORS enabled for origin: ${frontendUrl}`);
  app.use(cors({ origin: frontendUrl }));
} else {
  console.warn('FRONTEND_URL not set. Allowing all origins for CORS. This is not recommended for production.');
  app.use(cors()); // Fallback to allow all if FRONTEND_URL is not set
}

app.use(express.json()); // Middleware to parse JSON bodies

// Basic route for testing
app.get('/', (req, res) => {
  res.send('IFK Invoicing System Backend is running!');
});

// Middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

const { processLocalTestFile } = require('./controllers/uploadController'); // Keep for debug route
const ruleRoutes = require('./api/ruleRoutes'); // Import rule routes
const uploadRoutes = require('./api/uploadRoutes'); // Import upload routes

// Setup routes
app.use('/api/upload', uploadRoutes); // Mount upload routes (handles /participation and potentially /reconciliation/upload-invoices)
app.use('/api/rules', ruleRoutes); // Mount rule routes (corrected base path for consistency)

// Debug route to process a local sample file
app.get('/api/debug/process-sample-file', processLocalTestFile);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
