import { useEffect, useRef } from 'react';
import io from "socket.io-client";
import { API_URL } from '@/utils/api'; 
import { getSafeId, RequestStack, NotificationStack } from '../utils/chatHelpers';

export const useChatSocket = (
  user, 
  activeChatRef, 
  setMessages, // This can be safelyAddMessage or the standard setState
  setRequestStack, 
  setFriends, 
  setActiveChat, 
  setNotifyStack, 
  buildGraph
) => {
  const socketRef = useRef();

  useEffect(() => {
    if (!user) return;

    // 1. Optimized Connection Config (Matches Server)
    socketRef.current = io(API_URL, { 
      transports: ["websocket", "polling"], // Allow polling fallback for stability
      reconnectionAttempts: 5,              // Try harder to reconnect
      pingTimeout: 60000,                   // Don't disconnect too easily
      query: { userId: getSafeId(user) }    // Pass ID for initial handshake
    });

    // 2. Setup Room
    socketRef.current.emit("setup", user);

    // 3. Message Listener (With Deduplication Support)
    socketRef.current.on("message_received", (newMessage) => {
      const currentChatId = getSafeId(activeChatRef.current);
      const senderId = getSafeId(newMessage.sender);

      // Check if the user currently has this chat open
      if (currentChatId === senderId) {
          
          // Use functional update to check for duplicates inside the hook
          // This ensures that if the API loaded the message and Socket sends it, we don't show it twice.
          setMessages((prev) => {
              // If prev is not an array (e.g. initial load), handle gracefully
              const currentMessages = Array.isArray(prev) ? prev : [];
              
              // If message ID already exists, ignore this socket event
              if (currentMessages.some(m => m._id === newMessage._id)) return currentMessages;
              
              return [...currentMessages, newMessage];
          });

      } else {
          // Add to Notification Stack if chat is not open
          setNotifyStack(prev => {
            const updated = new NotificationStack(prev.items);
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

    // 4. Friend Requests
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

    // 5. Friend Request Accepted (Real-time update)
    socketRef.current.on("friend_request_accepted", (newFriend) => {
        setFriends(prev => [...prev, newFriend]);
        
        // Notify the user they were accepted
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

        // Rebuild graph recommendation engine
        if (typeof buildGraph === "function") buildGraph();
    });

    // 6. Unfriend Event
    socketRef.current.on("friend_removed", (id) => {
        // Remove from friends list immediately
        setFriends(prev => prev.filter(f => getSafeId(f) !== id));
        
        // If currently talking to them, close the chat
        if (getSafeId(activeChatRef.current) === id) {
            setActiveChat(null);
            alert("This user has unfriended you.");
        }
        
        if (typeof buildGraph === "function") buildGraph();
    });

    // Cleanup
    return () => {
        if (socketRef.current) socketRef.current.disconnect();
    };

  // Removed 'buildGraph' from dependency array to prevent infinite re-connection loops
  }, [user]); 

  return socketRef;
};