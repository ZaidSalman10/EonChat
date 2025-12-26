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

    socketRef.current = io(API_URL, { 
      transports: ["websocket", "polling"], 
      reconnectionAttempts: 5,
      pingTimeout: 60000,
      query: { userId: getSafeId(user) }    
    });

    const setupUserRoom = () => {
      if (socketRef.current && user) {
        socketRef.current.emit("setup", user);
      }
    };

    setupUserRoom();

    socketRef.current.on("connect", () => {
      setupUserRoom();
    });

    // --- Message Listener with Stack Accuracy ---
    socketRef.current.on("message_received", (newMessage) => {
      const currentChatId = getSafeId(activeChatRef.current);
      const senderId = getSafeId(newMessage.sender);
      const receiverId = getSafeId(newMessage.receiver);
      const myId = getSafeId(user);

      // ACCURACY CHECK: Ensure message is actually for me
      if (receiverId && receiverId !== myId) return;

      if (currentChatId === senderId) {
          // If Chat is Open: Update Messages
          setMessages((prev) => {
              const currentMessages = Array.isArray(prev) ? prev : [];
              if (currentMessages.some(m => m._id === newMessage._id)) return currentMessages;
              return [...currentMessages, newMessage];
          });
      } else {
          // If Chat is Closed: Push to Notification Stack
          setNotifyStack(prev => {
            const updated = new NotificationStack(prev.items);
            
            // STRICT DEDUPLICATION:
            // Check if we received a notification from this sender in the last 2 seconds.
            // This prevents duplicate alerts for the same event due to network retries.
            const isDuplicate = updated.items.some(n => 
                n.message.includes(newMessage.sender.username) && 
                (new Date(n.timestamp).getTime() > Date.now() - 2000)
            );

            if (isDuplicate) return prev; // Return original state, do not add

            updated.push({ 
                _id: newMessage._id || Date.now().toString(), 
                message: `New message from ${newMessage.sender.username}`, 
                type: 'message', 
                isRead: false, 
                timestamp: new Date().toISOString() 
            });
            return updated;
          });
      }
    });

    socketRef.current.on("friend_request_received", (newRequest) => {
      // Stack Push Logic
      setRequestStack(prev => {
        const updated = new RequestStack(prev.items);
        // Deduplicate Requests
        if (updated.items.some(r => r._id === newRequest._id)) return prev;
        updated.push(newRequest); 
        return updated;
      });

      // Notification Push Logic
      setNotifyStack(prev => {
        const updated = new NotificationStack(prev.items);
        updated.push({ 
            _id: Date.now().toString(), 
            message: `New friend request from ${newRequest.sender.username}`, 
            type: 'request', 
            isRead: false, 
            timestamp: new Date().toISOString() 
        });
        return updated;
      });
    });

    socketRef.current.on("friend_request_accepted", (newFriend) => {
        setFriends(prev => [...prev, newFriend]);
        
        setNotifyStack(prev => {
            const updated = new NotificationStack(prev.items);
            updated.push({ 
                _id: Date.now().toString(), 
                message: `${newFriend.username} accepted your friend request`, 
                type: 'alert', 
                isRead: false, 
                timestamp: new Date().toISOString() 
            });
            return updated;
        });

        if (typeof buildGraph === "function") buildGraph();
    });

    socketRef.current.on("friend_removed", (id) => {
        setFriends(prev => prev.filter(f => getSafeId(f) !== id));
        if (getSafeId(activeChatRef.current) === id) {
            setActiveChat(null);
            alert("This user has unfriended you.");
        }
        if (typeof buildGraph === "function") buildGraph();
    });

    return () => {
        if (socketRef.current) socketRef.current.disconnect();
    };

  }, [user]); 

  return socketRef;
};