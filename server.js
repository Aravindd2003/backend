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
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/frontend-arena';

// --- SCHEMA ---
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

let Registration = mongoose.model("event", RegistrationSchema);

// --- MIDDLEWARE ---
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? ["https://your-frontend-domain.com"] // change to your frontend prod domain
    : ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- FILE UPLOAD SETUP ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
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

// --- ROUTES ---
let registrationCounter = 1;

app.get('/', (req, res) => {
  res.json({ message: 'Frontend Arena 2025 Backend API', version: '1.0.0' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.get('/api/registrations', async (req, res) => {
  try {
    const registrations = await Registration.find();
    res.json({ success: true, count: registrations.length, registrations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching registrations', error: error.message });
  }
});

app.get('/api/registrations/:id', async (req, res) => {
  try {
    const registration = await Registration.findOne({ id: req.params.id });
    if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });
    res.json({ success: true, registration });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching registration', error: error.message });
  }
});

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
      status: 'pending'
    });

    await registration.save();
    registrationCounter++;

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully!',
      registrationId: registration.id
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

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

// --- ERROR HANDLER ---
app.use((error, req, res, next) => {
  console.error('Error:', error);
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File too large. Max size 5MB.' });
  }
  res.status(500).json({ success: false, message: 'Something went wrong!', error: error.message });
});

// --- START SERVER ---
const startServer = async () => {
  try {
    console.log('Starting server...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected successfully:', MONGO_URI);

    app.listen(PORT, () => {
      console.log(`🚀 Backend running on port ${PORT}`);
      console.log(`📁 Uploads directory: ${uploadsDir}`);
      console.log(`🌐 Server URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

startServer();
