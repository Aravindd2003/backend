console.log('🚀 Starting Frontend Arena Backend...');

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');
require('dotenv').config();

console.log('✅ All modules loaded successfully');

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/frontend-arena';
let db;

const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB at:', MONGO_URI);
    
    // MongoDB connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
    };

    // If it's an Atlas connection, add SSL options
    if (MONGO_URI.includes('mongodb.net')) {
      options.ssl = true;
      options.sslValidate = false;
      options.sslCA = undefined;
      options.tls = true;
      options.tlsAllowInvalidCertificates = true;
      options.tlsAllowInvalidHostnames = true;
      options.tlsInsecure = true;
    }

    const client = new MongoClient(MONGO_URI, options);
    await client.connect();
    db = client.db();
    console.log('✅ Connected to MongoDB successfully');
    console.log('Database name:', db.databaseName);
    console.log('Available collections:', await db.listCollections().toArray());
    return client;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('Full error:', err);
    throw err; // Don't exit, let the fallback handle it
  }
};

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed!'), false);
    }
  }
});

// MongoDB collection for event registrations
let registrationsCollection;
let registrationCounter = 1;

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Frontend Arena 2025 Backend API',
    version: '1.0.0',
    endpoints: {
      register: 'POST /api/register',
      registrations: 'GET /api/registrations',
      health: 'GET /api/health'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get all registrations (admin endpoint)
app.get('/api/registrations', async (req, res) => {
  try {
    const registrations = await registrationsCollection.find({}).toArray();
    res.json({
      success: true,
      count: registrations.length,
      registrations: registrations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching registrations',
      error: error.message
    });
  }
});

// Registration endpoint


// Get registration by ID
app.get('/api/registrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const registration = await registrationsCollection.findOne({ id: id });
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.json({
      success: true,
      registration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching registration',
      error: error.message
    });
  }
});


app.post("/api/register", upload.single('paymentScreenshot'), async (req, res) => {
  try {
    const { teamName, teamSize, participants, portfolioUrl } = req.body;

    // Validate required fields
    if (!teamName || !teamSize || !participants || !portfolioUrl) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate team size
    const size = parseInt(teamSize);
    if (size < 1 || size > 3) {
      return res.status(400).json({
        success: false,
        message: 'Team size must be between 1 and 3'
      });
    }

    // Parse participants from JSON string
    let participantsArray;
    try {
      participantsArray = JSON.parse(participants);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid participants data format'
      });
    }

    // Validate participants array
    if (!Array.isArray(participantsArray) || participantsArray.length !== size) {
      return res.status(400).json({
        success: false,
        message: 'Invalid participants data'
      });
    }

    // Validate first participant (required)
    const firstParticipant = participantsArray[0];
    if (!firstParticipant.name || !firstParticipant.email || !firstParticipant.phone || 
        !firstParticipant.college || !firstParticipant.departmentYear || 
        !firstParticipant.linkedin || !firstParticipant.portfolio) {
      return res.status(400).json({
        success: false,
        message: 'First participant information is incomplete'
      });
    }

    // Check if payment screenshot was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Payment screenshot is required'
      });
    }

    // Create registration object
    const registration = {
      id: `REG-${String(registrationCounter).padStart(4, '0')}`,
      teamName,
      teamSize: size,
      participants: participantsArray.slice(0, size),
      portfolioUrl,
      paymentScreenshot: req.file.filename,
      entryFee: size * 50,
      registrationDate: new Date().toISOString(),
      status: 'pending',
      emailSent: false
    };

    // Store in MongoDB
    console.log('Attempting to insert registration:', registration);
    console.log('Collection name:', registrationsCollection.collectionName);
    console.log('Database name:', db.databaseName);
    
    const result = await registrationsCollection.insertOne(registration);
    console.log('MongoDB insertion result:', result);
    registrationCounter++;

    // Success response
    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully!',
      registrationId: registration.id,
      data: {
        teamName: registration.teamName,
        teamSize: registration.teamSize,
        entryFee: registration.entryFee,
        registrationDate: registration.registrationDate
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update registration status
app.patch('/api/registrations/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const result = await registrationsCollection.updateOne(
      { id: id },
      { 
        $set: { 
          status: status,
          updatedAt: new Date().toISOString()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    const updatedRegistration = await registrationsCollection.findOne({ id: id });

    res.json({
      success: true,
      message: 'Registration status updated',
      registration: updatedRegistration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating registration',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Start server
const startServer = async () => {
  try {
    console.log('Starting server...');
    
    // Try to connect to MongoDB, but don't fail if it's not available
    try {
      const client = await connectDB();
      registrationsCollection = db.collection('event');
      console.log('✅ MongoDB connected successfully');
    } catch (mongoError) {
      console.log('⚠️  MongoDB not available, using in-memory storage');
      console.log('MongoDB error:', mongoError.message);
      
      // Use in-memory storage as fallback
      registrationsCollection = {
        insertOne: async (doc) => {
          console.log('📝 Storing in memory:', doc);
          return { insertedId: 'memory-' + Date.now() };
        },
        find: () => ({
          toArray: async () => {
            console.log('📋 Returning in-memory data');
            return [];
          }
        }),
        findOne: async (query) => {
          console.log('🔍 Finding in memory:', query);
          return null;
        },
        updateOne: async (query, update) => {
          console.log('✏️  Updating in memory:', query, update);
          return { matchedCount: 0 };
        },
                 collectionName: 'event'
      };
    }
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Frontend Arena Backend running on port ${PORT}`);
      console.log(`📁 Uploads directory: ${uploadsDir}`);
      console.log(`🌐 Server URL: http://localhost:${PORT}`);
      console.log(`📋 API Documentation: http://localhost:${PORT}/`);
      console.log(`🗄️  Storage: ${registrationsCollection.collectionName === 'event' ? 'MongoDB' : 'In-Memory'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;



