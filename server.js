console.log('🚀 Starting Frontend Arena Backend...');
const mongoose = require("mongoose");
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

console.log('✅ All modules loaded successfully');

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/frontend-arena';

// Mongoose Schema
const RegistrationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  teamName: { type: String, required: true },
  teamSize: { type: Number, required: true, min: 1, max: 3 },
  participants: [
    {
      name: String,
      email: String,
      phone: String,
      college: String,
      departmentYear: String,
      linkedin: String,
      portfolio: String,
    }
  ],
  portfolioUrl: { type: String, required: true },
  paymentScreenshot: { type: String, required: true },
  entryFee: Number,
  registrationDate: { type: Date, default: Date.now },
  status: { type: String, default: "pending" },
  emailSent: { type: Boolean, default: false }
});

const Registration = mongoose.model("event", RegistrationSchema); // collection = "event"

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'https://startweb-ai.vercel.app',
    'https://startweb-ai-git-main-startweb-ai.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads dir
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed!'), false);
    }
  }
});

// Auto-increment counter
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Get all registrations
app.get('/api/registrations', async (req, res) => {
  try {
    const registrations = await Registration.find();
    res.json({ success: true, count: registrations.length, registrations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching registrations', error: error.message });
  }
});

// Get registration by ID
app.get('/api/registrations/:id', async (req, res) => {
  try {
    const registration = await Registration.findOne({ id: req.params.id });
    if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });
    res.json({ success: true, registration });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching registration', error: error.message });
  }
});

// Register team
app.post("/api/register", upload.single('paymentScreenshot'), async (req, res) => {
  try {
    const { teamName, teamSize, participants, portfolioUrl } = req.body;

    if (!teamName || !teamSize || !participants || !portfolioUrl) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const size = parseInt(teamSize);
    if (size < 1 || size > 3) {
      return res.status(400).json({ success: false, message: 'Team size must be between 1 and 3' });
    }

    let participantsArray;
    try {
      participantsArray = JSON.parse(participants);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid participants data format' });
    }

    if (!Array.isArray(participantsArray) || participantsArray.length !== size) {
      return res.status(400).json({ success: false, message: 'Invalid participants data' });
    }

    const firstParticipant = participantsArray[0];
    if (!firstParticipant.name || !firstParticipant.email || !firstParticipant.phone ||
        !firstParticipant.college || !firstParticipant.departmentYear) {
      return res.status(400).json({ success: false, message: 'First participant information is incomplete' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Payment screenshot is required' });
    }

    const registration = new Registration({
      id: `REG-${String(registrationCounter).padStart(4, '0')}`,
      teamName,
      teamSize: size,
      participants: participantsArray.slice(0, size),
      portfolioUrl,
      paymentScreenshot: req.file.filename,
      entryFee: size * 50,
      status: 'pending',
      emailSent: false
    });

    console.log('📝 About to save registration:', registration);
    await registration.save();
    console.log('✅ Registration saved successfully');
    registrationCounter++;

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
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// Update status
app.patch('/api/registrations/:id/status', async (req, res) => {
  try {
    const result = await Registration.findOneAndUpdate(
      { id: req.params.id },
      { $set: { status: req.body.status, updatedAt: new Date() } },
      { new: true }
    );

    if (!result) return res.status(404).json({ success: false, message: 'Registration not found' });
    res.json({ success: true, message: 'Registration status updated', registration: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating registration', error: error.message });
  }
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File too large. Max size 5MB.' });
  }
  res.status(500).json({ success: false, message: 'Something went wrong!', error: error.message });
});

// 404
app.use('*', (req, res) => res.status(404).json({ success: false, message: 'Endpoint not found' }));

// Start
const startServer = async () => {
  try {
    console.log('Starting server...');
    
    // Try to connect to MongoDB, but don't fail if it's not available
    try {
      await mongoose.connect(MONGO_URI);
      console.log('✅ MongoDB connected successfully');
    } catch (mongoError) {
      console.log('⚠️  MongoDB not available, using in-memory storage');
      console.log('MongoDB error:', mongoError.message);
      
      // Use in-memory storage as fallback
      const inMemoryData = [];
      
      // Create a mock Registration model for in-memory storage
      const MockRegistration = function(data) {
        this.id = data.id;
        this.teamName = data.teamName;
        this.teamSize = data.teamSize;
        this.participants = data.participants;
        this.portfolioUrl = data.portfolioUrl;
        this.paymentScreenshot = data.paymentScreenshot;
        this.entryFee = data.entryFee;
        this.registrationDate = data.registrationDate || new Date();
        this.status = data.status || 'pending';
        this.emailSent = data.emailSent || false;
      };
      
      MockRegistration.find = async () => {
        console.log('📋 Returning in-memory data');
        return inMemoryData;
      };
      
      MockRegistration.findOne = async (query) => {
        console.log('🔍 Finding in memory:', query);
        return inMemoryData.find(item => item.id === query.id) || null;
      };
      
      MockRegistration.prototype.save = async function() {
        console.log('📝 Storing in memory:', this);
        inMemoryData.push(this);
        return this;
      };
      
      MockRegistration.findOneAndUpdate = async (query, update, options) => {
        console.log('✏️  Updating in memory:', query, update);
        const index = inMemoryData.findIndex(item => item.id === query.id);
        if (index !== -1) {
          inMemoryData[index] = { ...inMemoryData[index], ...update.$set };
          return inMemoryData[index];
        }
        return null;
      };
      
      // Replace the Registration model with our mock
      global.Registration = MockRegistration;
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Backend running on port ${PORT}`);
      console.log(`📁 Uploads directory: ${uploadsDir}`);
      console.log(`🌐 Server URL: http://localhost:${PORT}`);
      console.log(`🗄️  Storage: ${mongoose.connection.readyState === 1 ? 'MongoDB' : 'In-Memory'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
