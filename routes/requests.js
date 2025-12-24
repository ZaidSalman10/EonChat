const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Assuming you have this from your auth routes
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

// @route   POST api/requests/send
// @desc    Send a friend request
router.post('/send', auth, async (req, res) => {
  const { receiverId } = req.body;

  try {
    if (req.user.id === receiverId) {
      return res.status(400).json({ msg: "You cannot send a request to yourself" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ msg: "User not found" });

    // Check if request already exists
    const existingRequest = await FriendRequest.findOne({
      sender: req.user.id,
      receiver: receiverId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ msg: "Request already sent" });
    }

    // Check if already friends
    const user = await User.findById(req.user.id);
    if (user.friends.includes(receiverId)) {
      return res.status(400).json({ msg: "Already friends" });
    }

    const newRequest = new FriendRequest({
      sender: req.user.id,
      receiver: receiverId
    });

    await newRequest.save();

    // Return the request with sender populated so we can emit it via socket
    const populatedRequest = await FriendRequest.findById(newRequest._id)
      .populate('sender', 'username email');

    res.json(populatedRequest);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/requests/pending
// @desc    Get all pending requests for the current user
router.get('/pending', auth, async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      receiver: req.user.id,
      status: 'pending'
    }).populate('sender', 'username email');
    
    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST api/requests/accept
// @desc    Accept a friend request
router.post('/accept', auth, async (req, res) => {
  const { requestId } = req.body;

  try {
    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ msg: "Request not found" });

    if (request.receiver.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    // 1. Update Request Status
    request.status = 'accepted';
    await request.save();

    // 2. Add to Friends Arrays (Both users)
    const receiver = await User.findById(req.user.id);
    const sender = await User.findById(request.sender);

    if (!receiver.friends.includes(request.sender)) {
      receiver.friends.push(request.sender);
      await receiver.save();
    }

    if (!sender.friends.includes(request.receiver)) {
      sender.friends.push(request.receiver);
      await sender.save();
    }

    res.json({ msg: "Friend Request Accepted", newFriend: sender });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;