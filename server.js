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
            // Optimization: Only log if necessary to reduce console noise
            // console.log(`✅ User joined room: ${userId}`);
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

  // --- C. Real-time Message Forwarding (Optimized) ---
  socket.on("new_message", (newMessageReceived) => {
    const receiverId = getSafeId(newMessageReceived.receiver);
    
    if (!receiverId) return console.log("Receiver not defined");

    // 1. FAST EMIT: Send to client IMMEDIATELY (Don't wait for DB)
    socket.in(receiverId).emit("message_received", newMessageReceived);

    // 2. BACKGROUND TASK: Save Notification asynchronously
    // This prevents the chat from "hanging" while waiting for MongoDB
    (async () => {
        try {
            const notification = new Notification({
                user: receiverId,
                message: `New message from ${newMessageReceived.sender.username}`,
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

    // 1. Fast Emit
    socket.in(receiverId).emit("friend_request_received", data.request);

    // 2. Background Save
    (async () => {
        try {
            const notification = new Notification({
                user: receiverId,
                message: `New friend request from ${data.request.sender.username}`,
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
          socket.in(senderId).emit("friend_request_accepted", data.user);
      }
  });

  // --- F. Disconnection (Cleanup) ---
  socket.on("disconnect", () => {
    // Optional: Add logic to mark user as 'offline' in DB if needed
    // console.log("🔌 User Disconnected");
  });
});

app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));