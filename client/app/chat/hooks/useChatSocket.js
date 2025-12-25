import { useEffect, useRef } from 'react';
import io from "socket.io-client";
import { API_URL } from '@/utils/api'; 
import { getSafeId, RequestStack, NotificationStack } from '../utils/chatHelpers';

export const useChatSocket = (
  user, 
  activeChatRef, 
  setMessages, 
  setRequestStack, 
  setFriends, 
  setActiveChat, 
  setNotifyStack, 
  buildGraph
) => {
  const socketRef = useRef();

  useEffect(() => {
    if (!user) return;

    // 1. Initialize Socket with Robust Configuration
    // Added reconnection logic and timeout settings to prevent "zombie" connections
    socketRef.current = io(API_URL, { 
      transports: ["websocket", "polling"], 
      reconnectionAttempts: 5,
      pingTimeout: 60000,
      query: { userId: getSafeId(user) }    
    });

    // 2. Setup Function (Extracted for reuse)
    // This allows us to re-join the room if the internet drops and comes back
    const setupUserRoom = () => {
      if (socketRef.current && user) {
        socketRef.current.emit("setup", user);
      }
    };

    // Initial Setup
    setupUserRoom();

    // 🔥 CRITICAL FIX: Re-join room immediately upon reconnection
    // This solves the issue where users stop receiving messages after a minor disconnect
    socketRef.current.on("connect", () => {
      // console.log("Reconnected to server");
      setupUserRoom();
    });

    // 3. Message Listener
    socketRef.current.on("message_received", (newMessage) => {
      const currentChatId = getSafeId(activeChatRef.current);
      const senderId = getSafeId(newMessage.sender);

      // Check if the message is from the currently active chat
      if (currentChatId === senderId) {
          
          setMessages((prev) => {
              // Safety check if prev is not an array
              const currentMessages = Array.isArray(prev) ? prev : [];
              
              // Deduplication Shield: Prevent duplicate messages
              // This is crucial for the "Optimistic UI" to work without double-rendering
              if (currentMessages.some(m => m._id === newMessage._id)) return currentMessages;
              
              return [...currentMessages, newMessage];
          });

      } else {
          // If chat is not open, push to notification stack
          setNotifyStack(prev => {
            const updated = new NotificationStack(prev.items);
            
            // Optional: Deduplicate notifications (prevent spamming the same alert)
            if (updated.items.some(n => n.message.includes(newMessage.sender.username) && n.timestamp > Date.now() - 2000)) {
                return updated;
            }

            updated.push({ 
                _id: Date.now().toString(), 
                message: `New message from ${newMessage.sender.username}`, 
                type: 'message', 
                isRead: false, 
                timestamp: new Date() 
            });
            return updated;
          });
      }
    });

    // 4. Friend Request Listener
    socketRef.current.on("friend_request_received", (newRequest) => {
      setRequestStack(prev => {
        const updated = new RequestStack(prev.items);
        updated.push(newRequest); 
        return updated;
      });
      setNotifyStack(prev => {
        const updated = new NotificationStack(prev.items);
        updated.push({ 
            _id: Date.now().toString(), 
            message: `New friend request from ${newRequest.sender.username}`, 
            type: 'request', 
            isRead: false, 
            timestamp: new Date() 
        });
        return updated;
      });
    });

    // 5. Request Accepted Listener (Real-time Graph Update)
    socketRef.current.on("friend_request_accepted", (newFriend) => {
        setFriends(prev => [...prev, newFriend]);
        
        setNotifyStack(prev => {
            const updated = new NotificationStack(prev.items);
            updated.push({ 
                _id: Date.now().toString(), 
                message: `${newFriend.username} accepted your friend request`, 
                type: 'alert', 
                isRead: false, 
                timestamp: new Date() 
            });
            return updated;
        });

        if (typeof buildGraph === "function") buildGraph();
    });

    // 6. Unfriend Listener
    socketRef.current.on("friend_removed", (id) => {
        setFriends(prev => prev.filter(f => getSafeId(f) !== id));
        
        if (getSafeId(activeChatRef.current) === id) {
            setActiveChat(null);
            alert("This user has unfriended you.");
        }
        
        if (typeof buildGraph === "function") buildGraph();
    });

    // Cleanup on unmount
    return () => {
        if (socketRef.current) socketRef.current.disconnect();
    };

  }, [user]); // Removed 'buildGraph' to prevent infinite re-render loops

  return socketRef;
};