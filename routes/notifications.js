const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// Get all notifications (Sorted by newest first - Top of Stack)
router.get('/', auth, async (req, res) => {
  try {
    const notes = await Notification.find({ user: req.user.id }).sort({ timestamp: 1 });
    res.json(notes);
  } catch (err) { res.status(500).send("Server Error"); }
});

// Mark as read
router.patch('/read/:id', auth, async (req, res) => {
  try {
    // FIXED: changed req.id to req.params.id
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true }); 
    res.json({ msg: "Marked as read" });
  } catch (err) { 
    res.status(500).json({ msg: "Server Error" }); 
  }
});

// DSA POP: Delete the most recent notification
router.delete('/pop', auth, async (req, res) => {
  try {
    const latest = await Notification.findOne({ user: req.user.id }).sort({ timestamp: -1 });
    if (latest) await latest.deleteOne();
    res.json({ msg: "Popped from stack" });
  } catch (err) { res.status(500).send("Server Error"); }
});

// CLEAR ALL
router.delete('/clear', auth, async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user.id });
    res.json({ msg: "Stack cleared" });
  } catch (err) { res.status(500).send("Server Error"); }
});

module.exports = router;