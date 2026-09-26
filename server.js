
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const app = express();

// ===============================
// CORS CONFIGURATION
// ===============================

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',

  // Vercel Frontend URLs
  'https://dashboard-frontend-5e6m8lw5d-zaheers-projects-7e59edf9.vercel.app',
  'https://dashboard-frontend-n9vas6ifq-zaheers-projects-7e59edf9.vercel.app',
  'https://dashboard-frontend-7om0249eu-zaheers-projects-7e59edf9.vercel.app',
  'https://dashboard-frontend-psi-neon.vercel.app'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from Postman, server-to-server, or any vercel.app domain
      if (!origin || origin.includes('localhost') || origin.endsWith('vercel.app')) {
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log('Blocked CORS origin:', origin);
      // Return false instead of Error to avoid 500 Server Error
      return callback(null, false);
    },
    credentials: true
  })
);

// ===============================
// BODY PARSER
// ===============================

app.use(express.json());

// ===============================
// UPLOADS
// ===============================

app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);

// ===============================
// ROUTES
// ===============================

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/activity', require('./routes/activityRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));

// ===============================
// ERROR HANDLING
// ===============================

app.use((err, req, res, next) => {
  console.error(err.stack);

  if (
    err.message ===
    'Only image files are allowed (jpeg, jpg, png, gif, webp)'
  ) {
    return res.status(400).json({
      message: err.message
    });
  }

  res.status(500).json({
    message: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

// ===============================
// ROOT ROUTE
// ===============================

app.get('/', (req, res) => {
  res.send('Dashboard Backend API is running...');
});

// ===============================
// SERVER
// ===============================

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel
module.exports = app;
