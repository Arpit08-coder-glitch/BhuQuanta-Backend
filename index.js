require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const XLSX = require('xlsx');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5006;

// Middleware
app.use(cors());
app.use(express.json());

// Logs directory
const logsDir = path.join(__dirname, 'logs');
fs.ensureDirSync(logsDir);

// Excel log file
const excelFilePath = path.join(logsDir, 'otp_logs.xlsx');

// Utility: Load or create workbook
function loadOrCreateWorkbook() {
  if (fs.existsSync(excelFilePath)) {
    return XLSX.readFile(excelFilePath);
  } else {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([]);
    XLSX.utils.book_append_sheet(wb, ws, 'Logs');
    XLSX.writeFile(wb, excelFilePath);
    return wb;
  }
}

// Nodemailer transporter (configure with your email credentials)
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true', // true for port 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

// Send OTP via Email
app.post('/send-otp', async (req, res) => {
  const { email, phone } = req.body;

  if (!email || !phone) {
    return res.status(400).json({ error: 'Email and phone are required' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000);

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your OTP for Verification',
      text: `Your OTP is ${otp}`,
    });

    // Log OTP to Excel
    const workbook = loadOrCreateWorkbook();
    const sheet = workbook.Sheets['Logs'];
    const data = XLSX.utils.sheet_to_json(sheet);

    const newEntry = {
      Timestamp: new Date().toISOString(),
      Email: email,
      Phone: phone,
      OTP: otp,
    };

    data.push(newEntry);
    const updatedSheet = XLSX.utils.json_to_sheet(data);
    workbook.Sheets['Logs'] = updatedSheet;
    XLSX.writeFile(workbook, excelFilePath);

    res.status(200).json({ message: 'OTP sent successfully via email', otp }); // Remove `otp` in prod
  } catch (error) {
    console.error('Email Error:', error.message);
    res.status(500).json({ error: 'Failed to send OTP via email' });
  }
});

// Simulated verification
app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  res.status(200).json({ message: 'OTP verified successfully (simulated)' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
