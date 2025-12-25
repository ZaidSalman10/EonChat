const express = require('express');
// const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const http = require('http'); 
const { Server } = require('socket.io'); 
const Notification = require('./models/Notification');

// 1. Configuration & Database
// dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL;

// 2. Middleware
app.use(express.json());
const allowedOrigins = [
  "https://eonchat.vercel.app",
  "http://localhost:3000" // Added for local testing/safety
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true
}));

// 3. API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/notifications', require('./routes/notifications'));

// 4a. Create HTTP server 
const server = http.createServer(app);

// 4b. Create Socket.io server (Optimized Configuration)
const io = new Server(server, {
  pingTimeout: 60000,   // Wait 60s before assuming user is dead
  pingInterval: 25000,  // Send a heartbeat every 25s to keep connection smooth
  transports: ['websocket', 'polling'], // Prefer WebSocket for speed
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Helper: Safely extract string ID to prevent data misalignment
const getSafeId = (userObj) => {
    if (!userObj) return null;
    // Handle cases where userObj might be an object with _id or just an ID string
    return (userObj._id || userObj.id || userObj).toString();
};

// 5. Socket Logic (Optimized for Speed & Accuracy)
io.on("connection", (socket) => {
  console.log("⚡ Socket Connected (Fast Mode):", socket.id);

  // --- A. Setup User Room ---
  socket.on("setup", (userData) => {
    try {
        const userId = getSafeId(userData);
        if (userId) {
            socket.join(userId);
            // console.log(`✅ User joined room: ${userId}`); // Reduced logging
            socket.emit("connected");
        }
    } catch (err) {
        console.error("Socket Setup Error:", err.message);
    }
  });

  // --- B. Join Specific Chat ---
  socket.on("join_chat", (room) => {
    if (!room) return;
    const roomId = room.toString();
    
    // Prevent redundancy: Check if already in room
    if (!socket.rooms.has(roomId)) {
        socket.join(roomId);
        console.log(`💬 Joined Chat Room: ${roomId}`);
    }
  });

  // --- C. Real-time Message Forwarding (CRITICAL FIX) ---
  socket.on("new_message", (newMessageReceived) => {
    const receiverId = getSafeId(newMessageReceived.receiver);
    
    if (!receiverId) {
        console.error("Error: Receiver ID not found for new message.");
        return;
    }

    // Ensure sender is a full object for receiver
    // This is vital to prevent "Invalid Date" or missing user info on the receiver's side.
    // The frontend's 'handleSendMessage' already tries to pass the full sender 'user' object.
    // This ensures that even if that fails, we have a fallback with essential info.
    const senderInfo = newMessageReceived.sender && typeof newMessageReceived.sender === 'object'
        ? newMessageReceived.sender // Use provided sender object
        : { _id: getSafeId(newMessageReceived.sender), username: "Unknown Sender" }; // Fallback

    // Ensure a valid timestamp
    const messageTimestamp = newMessageReceived.createdAt || new Date().toISOString();

    const completeMessagePayload = {
        ...newMessageReceived,
        sender: senderInfo,
        receiver: { _id: receiverId }, // Ensure receiver is also an object with at least _id
        createdAt: messageTimestamp,
        // Add any other essential fields that might be missing
    };

    // 1. FAST EMIT: Send to client IMMEDIATELY
    // Use the complete payload for the receiver.
    socket.in(receiverId).emit("message_received", completeMessagePayload);

    // 2. BACKGROUND TASK: Save Notification asynchronously
    (async () => {
        try {
            const notification = new Notification({
                user: receiverId,
                message: `New message from ${senderInfo.username}`,
                type: 'message'
            });
            await notification.save();
        } catch (err) {
            console.error("Notification Save Error (Background):", err.message);
        }
    })();
  });

  // --- FRIEND REQUEST PERSISTENCE ---
  socket.on("send_friend_request", (data) => {
    const receiverId = getSafeId(data.receiverId);
    if (!receiverId) return;

    // Ensure the request data sent to receiver is complete
    const requestPayload = data.request || {};
    if (requestPayload.sender && typeof requestPayload.sender !== 'object') {
        requestPayload.sender = { _id: getSafeId(requestPayload.sender), username: "Unknown" };
    }

    // 1. Fast Emit
    socket.in(receiverId).emit("friend_request_received", requestPayload);

    // 2. Background Save
    (async () => {
        try {
            const notification = new Notification({
                user: receiverId,
                message: `New friend request from ${requestPayload.sender.username}`,
                type: 'request'
            });
            await notification.save();
        } catch (err) { console.error(err); }
    })();
  });

  // --- UNFRIEND PERSISTENCE ---
  socket.on("remove_friend", (data) => {
    const targetId = getSafeId(data.friendId);
    if (!targetId) return;

    // Emit the userId of the person who was unfriended to the target
    socket.in(targetId).emit("friend_removed", data.userId);

    (async () => {
        try {
            const notification = new Notification({
                user: targetId,
                message: `Someone removed you from their friends list`,
                type: 'alert'
            });
            await notification.save();
        } catch (err) { console.error(err); }
    })();
  });

  // --- ACCEPT REQUEST ---
  socket.on("accept_friend_request", (data) => {
      const senderId = getSafeId(data.senderId);
      if (senderId) {
          // Ensure the 'user' object sent is complete
          const acceptedByUser = data.user || {};
          if (!acceptedByUser._id) {
              console.error("Error: User accepting request has no _id.");
              return;
          }
          socket.in(senderId).emit("friend_request_accepted", acceptedByUser);
      }
  });

  // --- F. Disconnection (Cleanup) ---
  socket.on("disconnect", () => {
    console.log("🔌 User Disconnected:", socket.id);
    // Optional: Add logic to mark user as 'offline' in DB if needed
  });
});

app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));