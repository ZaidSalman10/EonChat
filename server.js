const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const http = require('http'); 
const { Server } = require('socket.io'); 
const Notification = require('./models/Notification');

// 1. Configuration & Database
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// 2. Middleware
app.use(express.json());
const allowedOrigins = [
  "https://eonchat.vercel.app",
  "http://localhost:3000" 
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

// 4b. Create Socket.io server
const io = new Server(server, {
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'], 
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const getSafeId = (userObj) => {
    if (!userObj) return null;
    return (userObj._id || userObj.id || userObj).toString();
};

// 5. Socket Logic
io.on("connection", (socket) => {
  console.log("⚡ Socket Connected:", socket.id);

  // --- A. Setup User Room ---
  socket.on("setup", (userData) => {
    const userId = getSafeId(userData);
    if (userId) {
        socket.join(userId);
        socket.emit("connected");
    }
  });

  // --- B. Join Specific Chat ---
  socket.on("join_chat", (room) => {
    if (!room) return;
    const roomId = room.toString();
    if (!socket.rooms.has(roomId)) {
        socket.join(roomId);
    }
  });

  // --- C. Real-time Message Forwarding (THE FIX) ---
  socket.on("new_message", (newMessageReceived) => {
    const receiverId = getSafeId(newMessageReceived.receiver);
    
    if (!receiverId) return;

    // 1. DATA SANITIZATION (Fixes "Invalid Date" & Missing Names)
    // We construct a 'safe' payload. If the API didn't provide info, we fallback to defaults.
    const safePayload = {
        ...newMessageReceived,
        // Ensure sender is an object, not just an ID string
        sender: (typeof newMessageReceived.sender === 'object') 
            ? newMessageReceived.sender 
            : { _id: getSafeId(newMessageReceived.sender), username: "User" },
        // NORMALIZE DATE: Ensure we have a valid date string
        createdAt: newMessageReceived.createdAt || new Date().toISOString(),
        // Map timestamp to createdAt if needed for legacy frontend code
        timestamp: newMessageReceived.createdAt || new Date().toISOString() 
    };

    // 2. FAST EMIT
    socket.in(receiverId).emit("message_received", safePayload);

    // 3. BACKGROUND SAVE
    (async () => {
        try {
            const senderName = safePayload.sender.username || "Someone";
            const notification = new Notification({
                user: receiverId,
                message: `New message from ${senderName}`,
                type: 'message'
            });
            await notification.save();
        } catch (err) { console.error("DB Save Error:", err.message); }
    })();
  });

  // --- D. Friend Request ---
  socket.on("send_friend_request", (data) => {
    const receiverId = getSafeId(data.receiverId);
    if (!receiverId) return;
    socket.in(receiverId).emit("friend_request_received", data.request);
    
    // Background Save
    (async () => {
        try {
            const senderName = data.request.sender.username || "Unknown";
            await new Notification({
                user: receiverId,
                message: `New friend request from ${senderName}`,
                type: 'request'
            }).save();
        } catch (err) {}
    })();
  });

  // --- E. Unfriend / Accept ---
  socket.on("remove_friend", (data) => {
    const targetId = getSafeId(data.friendId);
    if (targetId) socket.in(targetId).emit("friend_removed", data.userId);
  });

  socket.on("accept_friend_request", (data) => {
      const senderId = getSafeId(data.senderId);
      if (senderId) socket.in(senderId).emit("friend_request_accepted", data.user);
  });

  socket.on("disconnect", () => {});
});

app.get("/ping", (req, res) => res.status(200).send("pong"));
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));