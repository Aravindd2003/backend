const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  college: String,
  departmentYear: String,
  linkedin: String,
  portfolio: String
});

const eventSchema = new mongoose.Schema({
  teamName: { type: String, required: true },
  teamSize: { type: Number, required: true, min: 1, max: 3 },
  participants: [participantSchema],
  portfolioUrl: String,
  paymentScreenshot: String,
  entryFee: { type: Number, required: true },
  registrationDate: { type: Date, default: Date.now },
  status: { type: String, default: "pending" },
  emailSent: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Event", eventSchema, "event"); 
// third param = collection name
