import { useEffect, useRef } from 'react';
import io from "socket.io-client";
import { API_URL } from '@/utils/api'; 
import { getSafeId, RequestStack, NotificationStack } from '../utils/chatHelpers';

export const useChatSocket = (user, activeChatRef, setMessages, setRequestStack, setFriends, setActiveChat, setNotifyStack, buildGraph) => {
  const socketRef = useRef();

  useEffect(() => {
    if (!user) return;
    socketRef.current = io(API_URL, { transports: ["websocket"], query: { userId: getSafeId(user) } });
    socketRef.current.emit("setup", user);

    socketRef.current.on("message_received", (newMessage) => {
      const currentChatId = getSafeId(activeChatRef.current);
      const senderId = getSafeId(newMessage.sender);
      if (currentChatId === senderId) {
          setMessages((prev) => [...prev, newMessage]);
      } else {
          setNotifyStack(prev => {
            const updated = new NotificationStack(prev.items);
            updated.push({ _id: Date.now().toString(), message: `New message from ${newMessage.sender.username}`, type: 'message', isRead: false, timestamp: new Date() });
            return updated;
          });
      }
    });

    socketRef.current.on("friend_request_received", (newRequest) => {
      setRequestStack(prev => {
        const updated = new RequestStack(prev.items);
        updated.push(newRequest); 
        return updated;
      });
      setNotifyStack(prev => {
        const updated = new NotificationStack(prev.items);
        updated.push({ _id: Date.now().toString(), message: `New friend request from ${newRequest.sender.username}`, type: 'request', isRead: false, timestamp: new Date() });
        return updated;
      });
    });

    // NEW: Listen for acceptance to update friend list and graph in real-time
    socketRef.current.on("friend_request_accepted", (newFriend) => {
        setFriends(prev => [...prev, newFriend]);
        if (typeof buildGraph === "function") buildGraph(); // Safety check
    });

    socketRef.current.on("friend_removed", (id) => {
        setFriends(prev => prev.filter(f => getSafeId(f) !== id));
        if (typeof buildGraph === "function") buildGraph(); // Safety check
        if (getSafeId(activeChatRef.current) === id) setActiveChat(null);
    });

    return () => socketRef.current?.disconnect();
  }, [user, buildGraph]); // Added buildGraph to dependency array

  return socketRef;
};