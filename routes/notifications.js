// routes/notifications.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// @route   GET api/notifications
// @desc    Get all notifications (Sorted by Oldest First for correct Stack construction)
router.get('/', auth, async (req, res) => {
  try {
    // CRITICAL FIX: Sort by 1 (Ascending). 
    // Frontend Stack pushes to the end. DB must feed [Oldest...Newest].
    // The frontend's getStackView() reverses it for display.
    const notes = await Notification.find({ user: req.user.id }).sort({ timestamp: 1 });
    res.json(notes);
  } catch (err) { res.status(500).send("Server Error"); }
});

// @route   PATCH api/notifications/mark-all-read
// @desc    Mark ALL notifications as read
router.patch('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false }, 
      { $set: { isRead: true } }
    );
    res.json({ msg: "All marked as read" });
  } catch (err) { 
    console.error(err.message);
    res.status(500).json({ msg: "Server Error" }); 
  }
});

// @route   PATCH api/notifications/read/:id
// @desc    Mark a SINGLE notification as read
router.patch('/read/:id', auth, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true }); 
    res.json({ msg: "Marked as read" });
  } catch (err) { 
    res.status(500).json({ msg: "Server Error" }); 
  }
});

// @route   DELETE api/notifications/pop
// @desc    DSA POP: Delete the most recent notification (LIFO)
router.delete('/pop', auth, async (req, res) => {
  try {
    // Find the NEWEST notification (Top of stack) and remove it
    const latest = await Notification.findOne({ user: req.user.id }).sort({ timestamp: -1 });
    if (latest) await latest.deleteOne();
    res.json({ msg: "Popped from stack" });
  } catch (err) { res.status(500).send("Server Error"); }
});

// @route   DELETE api/notifications/clear
// @desc    CLEAR ALL notifications
router.delete('/clear', auth, async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user.id });
    res.json({ msg: "Stack cleared" });
  } catch (err) { res.status(500).send("Server Error"); }
});

module.exports = router;