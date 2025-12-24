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
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// 2. Middleware
app.use(express.json());
app.use(cors({ origin: CLIENT_URL, credentials: true }));

// 3. API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/notifications', require('./routes/notifications'));


// 4. Create Server
const server = http.createServer(app); 
const io = new Server(server, {
  pingTimeout: 60000,
  cors: { origin: CLIENT_URL, methods: ["GET", "POST"] }
});

// 5. Socket Logic (Extreme Accuracy Mode)
io.on("connection", (socket) => {
  console.log("🔌 Socket Connected:", socket.id);

  // --- A. Setup User Room ---
  socket.on("setup", (userData) => {
    try {
        if (userData && (userData._id || userData.id)) {
            const userId = (userData._id || userData.id).toString();
            socket.join(userId); // User joins their own ID-based room
            console.log(`✅ User ${userData.username || "Unknown"} joined room: ${userId}`);
            socket.emit("connected");
        }
    } catch (err) {
        console.error("Socket Setup Error:", err.message);
    }
  });

  // --- B. Join Specific Chat ---
  socket.on("join_chat", (room) => {
    if (room) {
        socket.join(room.toString());
        console.log(`💬 Joined Chat Room: ${room}`);
    }
  });

  // --- C. Real-time Message Forwarding ---
  socket.on("new_message", async (newMessageReceived) => {
    try {
        const receiver = newMessageReceived.receiver;
        const receiverId = (receiver._id || receiver.id || receiver).toString();

        // 1. Send Real-time
        socket.in(receiverId).emit("message_received", newMessageReceived);

        // 2. Save to DB for refresh persistence
        const notification = new Notification({
            user: receiverId,
            message: `New message from ${newMessageReceived.sender.username}`,
            type: 'message'
        });
        await notification.save();
        console.log("📝 Notification saved to DB");
    } catch (err) { console.error("Save Error:", err); }
  });

  // --- FRIEND REQUEST PERSISTENCE ---
  socket.on("send_friend_request", async (data) => {
    try {
        const receiverId = data.receiverId.toString();

        // 1. Send Real-time
        socket.in(receiverId).emit("friend_request_received", data.request);

        // 2. Save to DB
        const notification = new Notification({
            user: receiverId,
            message: `New friend request from ${data.request.sender.username}`,
            type: 'request'
        });
        await notification.save();
    } catch (err) { console.error(err); }
  });

  // --- UNFRIEND PERSISTENCE ---
  socket.on("remove_friend", async (data) => {
    try {
        const targetId = data.friendId.toString();
        socket.in(targetId).emit("friend_removed", data.userId);

        const notification = new Notification({
            user: targetId,
            message: `Someone removed you from their friends list`,
            type: 'alert'
        });
        await notification.save();
    } catch (err) { console.error(err); }
  });

  // server.js - Add this inside io.on("connection")
  socket.on("accept_friend_request", (data) => {
      try {
          const { senderId, user } = data; // user is the one who accepted
          // Notify the person who SENT the request that it was accepted
          socket.in(senderId).emit("friend_request_accepted", user);
      } catch (err) {
          console.error(err);
      }
  });

  // --- F. Disconnection ---
  socket.on("disconnect", () => {
    console.log("🔌 User Disconnected:", socket.id);
  });
});

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));