const router = require('express').Router();
const Message = require('../models/Message');
const User = require('../models/User'); 
const jwt = require('jsonwebtoken');

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ error: "No token, authorization denied" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    // Ensure req.user has the id (handling both {user:{id}} and {id} structures)
    req.user = decoded.user ? decoded.user : decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Token is not valid" });
  }
};

// @route   POST /api/messages/send
// @desc    Send a message (With Extreme Sync Check)
router.post('/send', verifyToken, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    // --- THE EXTREME ACCURACY LOCK ---
    // Check if the users are still friends in the Database
    const sender = await User.findById(senderId);
    
    if (!sender.friends.includes(receiverId)) {
      return res.status(403).json({ 
        error: "Action Denied", 
        msg: "You are no longer friends with this user. Message blocked.",
        isUnfriended: true // Flag for frontend to close the window
      });
    }

    const newMessage = new Message({
      sender: senderId,
      receiver: receiverId,
      content
    });

    await newMessage.save();

    // Populate sender info so the receiver's UI knows who sent it immediately
    const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'username');
    
    res.json(populatedMessage);

  } catch (err) {
    console.error("Send Message Error:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// @route   GET /api/messages/:otherUserId
// @desc    Get conversation between logged-in user and another user
router.get('/:otherUserId', verifyToken, async (req, res) => {
  try {
    const myId = req.user.id;
    const otherId = req.params.otherUserId;

    // Check friendship here too (Optional, but adds to accuracy)
    const me = await User.findById(myId);
    if (!me.friends.includes(otherId)) {
        return res.json([]); // Return empty if not friends
    }

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: otherId },
        { sender: otherId, receiver: myId }
      ]
    }).sort({ timestamp: 1 }); 

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;