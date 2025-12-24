const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Message  = require('../models/Message');
const jwt = require('jsonwebtoken');

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ error: "No token, authorization denied" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Token is not valid" });
  }
};

// @route   GET /api/users/search?query=abc
// @desc    Search for users by username (DSA: Prefix Search)
router.get('/search', verifyToken, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);

    // DSA Concept: Prefix Search using Regex
    // MongoDB uses the B-Tree index on 'username' to make this fast.
    // The regex '^' ensures we only match the START of the string (Prefix).
    const users = await User.find({ 
      username: { $regex: `^${query}`, $options: 'i' },
      _id: { $ne: req.user.id } // Exclude myself
    }).select('username email _id').limit(10);

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// @route   POST /api/users/add-friend
// @desc    Add a friend (DSA: Undirected Graph Edge Creation)
router.post('/add-friend', verifyToken, async (req, res) => {
  try {
    const { friendId } = req.body;
    const myId = req.user.id;

    if (myId === friendId) return res.status(400).json({ error: "Cannot add yourself" });

    // 1. Add B to A's friend list
    await User.findByIdAndUpdate(myId, { 
      $addToSet: { friends: friendId } // $addToSet prevents duplicates (Set Data Structure)
    });

    // 2. Add A to B's friend list (Undirected Graph)
    await User.findByIdAndUpdate(friendId, { 
      $addToSet: { friends: myId } 
    });

    res.json({ message: "Friend added successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// @route   GET /api/users/friends
// @desc    Get my friend list (Adjacency List Traversal)
router.get('/friends', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', 'username email');
    res.json(user.friends);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// @route   POST api/users/remove-friend
// @desc    Remove a friend AND delete all chats
router.post('/remove-friend', auth, async (req, res) => {
  const { friendId } = req.body;

  try {
    // 1. Remove from Current User's list
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { friends: friendId }
    });

    // 2. Remove from Friend's list
    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: req.user.id }
    });

    // 3. DELETE ALL MESSAGES between these two users
    await Message.deleteMany({
      $or: [
        { sender: req.user.id, receiver: friendId },
        { sender: friendId, receiver: req.user.id }
      ]
    });

    res.json({ msg: "Friend and chats removed successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

  // routes/users.js

// @route   GET api/users/network
// @desc    Get all users and their friendship connections to build a DSA Graph
router.get('/network', auth, async (req, res) => {
  try {
    // Fetch all users but only their ID, username, and friends list
    const users = await User.find({}).select('username friends');
    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: "Server Error building network" });
  }
});

module.exports = router;