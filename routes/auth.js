const router = require('express').Router();
const User = require('../models/User');
const Otp = require('../models/Otp'); // Import the OTP model
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);
require('dotenv').config();

// --- 1. Email Transporter Setup (Nodemailer) ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000
});


// --- 2. Route: Send OTP ---
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    // Check if email is already taken
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already linked to an account" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP
    await Otp.deleteMany({ email });
    await new Otp({ email, otp }).save();

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: "EonChat Security <onboarding@resend.dev>",
      to: email,
      subject: "Your EonChat Verification Code",
      html: `
        <h3>Welcome to EonChat!</h3>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 5px; color: #208c8c;">${otp}</h1>
        <p>This code expires in 5 minutes.</p>
      `,
    });

    if (error) {
      console.error("Resend email error:", error);
      return res.status(500).json({ error: "Failed to send email" });
    }

    res.json({ message: "OTP sent successfully", id: data.id });

  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- 3. Route: Verify OTP ---
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    const record = await Otp.findOne({ email, otp });
    
    if (!record) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // OTP found and matches
    res.json({ message: "OTP Verified Successfully" });

  } catch (err) {
    res.status(500).json({ error: "Server error during verification" });
  }
});

// --- 4. Route: Signup (Final Registration) ---
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // A. Validation
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    // B. Check existence (Username OR Email)
    // We check again to ensure no one claimed the username while the user was verifying OTP
    let query = { $or: [{ username }] };
    if (email) query.$or.push({ email });

    const existingUser = await User.findOne(query);
    if (existingUser) {
      if (existingUser.username === username) return res.status(400).json({ error: "Username already exists" });
      if (email && existingUser.email === email) return res.status(400).json({ error: "Email already exists" });
    }

    // C. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // D. Create User
    const user = new User({
      username,
      email: email || undefined, // Store as undefined if empty (for Sparse Index)
      passwordHash: hashedPassword
    });

    await user.save();

    // E. Cleanup: If email was used, delete the used OTP to keep DB clean
    if (email) {
      await Otp.deleteMany({ email });
    }

    res.status(201).json({
      message: "User created successfully",
      userId: user._id
    });

  } catch (err) {
    // Handle Mongoose Validation Errors (like the regex for username)
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ error: messages[0] });
    }
    console.error(err);
    res.status(500).json({ error: "Server error, please try again" });
  }
});

// --- 5. Route: Login ---
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ error: 'Invalid password' });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, username: user.username }, 
      process.env.JWT_SECRET || 'secret_key', 
      { expiresIn: '1d' }
    );

    res.json({ 
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- 6. Route: Forgot Password (Initiate) ---
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    // DSA Search: Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "No account found with this email" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to OTP Collection (Overwrite existing if any)
    await Otp.deleteMany({ email });
    await new Otp({ email, otp }).save();

    // Send Email
    await transporter.sendMail({
      from: '"EonChat Security" <no-reply@eonchat.com>',
      to: email,
      subject: 'Reset Your Password',
      html: `
        <h3>Password Reset Request</h3>
        <p>Use this code to reset your password:</p>
        <h1 style="color: #e63946;">${otp}</h1>
        <p>If you didn't request this, ignore this email.</p>
      `
    });

    res.json({ message: "OTP sent to email" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- 7. Route: Reset Password (Finalize) ---
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    // 1. Verify OTP
    const otpRecord = await Otp.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // 2. Validate New Password length
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be 8+ chars" });
    }

    // 3. Hash New Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 4. Update User (DSA: Direct access update)
    await User.findOneAndUpdate(
      { email }, 
      { passwordHash: hashedPassword }
    );

    // 5. Cleanup OTP
    await Otp.deleteMany({ email });

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;