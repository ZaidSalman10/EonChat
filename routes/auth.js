const router = require('express').Router();
const User = require('../models/User');
const Otp = require('../models/Otp');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

// 🚀 EMAIL HELPER - Using Brevo API (Railway Compatible)
async function sendEmail(to, subject, htmlContent) {
  try {
    console.log(`📧 Sending email to ${to}...`);
    
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { 
          email: process.env.SMTP_FROM, 
          name: "EonChat" 
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds
      }
    );
    
    console.log('✅ Email sent successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Brevo API Error:', error.response?.data || error.message);
    throw new Error('Failed to send email');
  }
}

// 📩 1. SEND OTP ROUTE
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    // A. Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already linked to an account" });
    }

    // B. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // C. Remove old OTPs
    await Otp.deleteMany({ email });

    // D. Save OTP
    await new Otp({ email, otp }).save();

    // E. Send Email via Brevo API
    await sendEmail(
      email,
      "Your EonChat Verification Code",
      `
        <h3>Welcome to EonChat!</h3>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing:5px;color:#208c8c">${otp}</h1>
        <p>This code expires in 5 minutes.</p>
      `
    );

    res.json({ message: "OTP sent successfully" });

  } catch (err) {
    console.error("❌ EMAIL ERROR:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// 2. VERIFY OTP ROUTE
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

// 3. SIGNUP ROUTE (Final Registration)
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // A. Validation
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    // B. Check existence (Username OR Email)
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
      email: email || undefined,
      passwordHash: hashedPassword
    });

    await user.save();

    // E. Cleanup: Delete used OTP
    if (email) {
      await Otp.deleteMany({ email });
    }

    res.status(201).json({
      message: "User created successfully",
      userId: user._id
    });

  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ error: messages[0] });
    }
    console.error(err);
    res.status(500).json({ error: "Server error, please try again" });
  }
});

// 4. LOGIN ROUTE
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

// 5. FORGOT PASSWORD ROUTE (Initiate)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "No account found with this email" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to OTP Collection
    await Otp.deleteMany({ email });
    await new Otp({ email, otp }).save();

    // Send Email via Brevo API
    await sendEmail(
      email,
      'Reset Your Password',
      `
        <div style="font-family: Arial, sans-serif; max-width: 500px;">
          <h3>Password Reset Request</h3>
          <p>Use the following code to reset your password:</p>
          <h1 style="color: #e63946; letter-spacing: 4px;">${otp}</h1>
          <p>This code will expire in <b>5 minutes</b>.</p>
          <p>If you did not request this, you can safely ignore this email.</p>
          <hr />
          <p style="font-size: 12px; color: #666;">EonChat Security</p>
        </div>
      `
    );

    res.json({ message: "OTP sent to email" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 6. RESET PASSWORD ROUTE (Finalize)
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

    // 4. Update User
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