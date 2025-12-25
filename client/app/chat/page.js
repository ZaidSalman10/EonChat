// 1. app/chat/page.js 
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from '@/utils/api'; 
import { getSafeId, RequestStack, NotificationStack } from './utils/chatHelpers';
import { FriendGraph } from './utils/friendGraph';
import { useChatSocket } from './hooks/useChatSocket';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import EonBot from './components/EonBot';

export default function ChatPage() {
  const router = useRouter();
  
  // --- State ---
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [activeChat, setActiveChat] = useState(null); 
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("chats"); 
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [friends, setFriends] = useState([]); 
  const [requestStack, setRequestStack] = useState(new RequestStack());
  const [notifyStack, setNotifyStack] = useState(new NotificationStack());
  const [recommendations, setRecommendations] = useState([]); 
  const [userSearchTerm, setUserSearchTerm] = useState(""); 
  const [userSearchResults, setUserSearchResults] = useState([]); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false); // New: Smooth Transition
  const [searchQuery, setSearchQuery] = useState(""); 
  const [isSearchingChat, setIsSearchingChat] = useState(false);
  
  // --- Refs ---
  const messagesEndRef = useRef(null);
  const activeChatRef = useRef(null);

  // --- Helpers ---
  
  // 1. Safe State Updater (Prevents Duplicates & Data Loss)
  const safelyAddMessage = useCallback((newMessage) => {
    setMessages((prev) => {
      // If message ID already exists, do not add it again (Fixes Redundancy)
      if (prev.some(m => m._id === newMessage._id)) return prev;
      return [...prev, newMessage];
    });
  }, []);

  const buildGraphRecommendations = async () => {
    if (!token || !user) return;
    try {
      const res = await fetch(`${API_URL}/api/users/network`, { 
        headers: { "x-auth-token": token } 
      });
      const allUsers = await res.json();

      const graph = new FriendGraph();
      allUsers.forEach(u => graph.addUser(u._id, u.username));
      allUsers.forEach(u => {
        u.friends.forEach(friendId => graph.addEdge(u._id, friendId));
      });

      const myId = getSafeId(user);
      const recs = graph.getRecommendations(myId);
      setRecommendations(recs);
    } catch (err) { console.error("Graph Traversal Failed", err); }
  };

  // --- Initial Setup ---
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (!storedToken) {
      router.push("/signin");
    } else {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, [router]);

  // Keep ref synced for Socket Hook
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  // --- Socket Hook ---
  // Note: We pass safelyAddMessage to ensure incoming socket messages are deduplicated
  const socketRef = useChatSocket(
    user, 
    activeChatRef, 
    safelyAddMessage, // Updated: Pass the safe setter
    setRequestStack, 
    setFriends, 
    setActiveChat, 
    setNotifyStack,
    buildGraphRecommendations 
  );

  // --- Data Fetching ---
  const fetchFriends = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/friends`, { headers: { "x-auth-token": token } });
      const data = await res.json();
      if (Array.isArray(data)) setFriends(data);
    } catch (err) { console.error("Friends Error", err); }
  };

  const fetchPendingRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/api/requests/pending`, { headers: { "x-auth-token": token } });
      const data = await res.json();
      if (Array.isArray(data)) setRequestStack(new RequestStack(data));
    } catch (err) { console.error("Requests Error", err); }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications`, { headers: { "x-auth-token": token } });
      const data = await res.json();
      if (Array.isArray(data)) setNotifyStack(new NotificationStack(data));
    } catch (err) { console.error("Notification Error", err); }
  };

  const fetchMessages = async (chatId) => {
    setIsMessagesLoading(true); // Start loading
    try {
      const res = await fetch(`${API_URL}/api/messages/${chatId}`, { headers: { "x-auth-token": token } });
      const data = await res.json();
      
      // Fix Race Condition: Only update if user is STILL on this chat
      if (activeChatRef.current && getSafeId(activeChatRef.current) === chatId) {
         setMessages(Array.isArray(data) ? data : []);
      }
    } catch (err) { 
        if (activeChatRef.current && getSafeId(activeChatRef.current) === chatId) setMessages([]); 
    } finally {
        setIsMessagesLoading(false); // Stop loading
    }
  };

  // --- Effects ---
  useEffect(() => {
    if (token) {
        fetchFriends();
        fetchPendingRequests();
        fetchNotifications();
        buildGraphRecommendations();
    }
  }, [token]);

  useEffect(() => {
    if (activeChat && token) {
      setShowChatMenu(false); 
      const chatId = getSafeId(activeChat);
      if(chatId) {
        fetchMessages(chatId);
        if(socketRef.current) socketRef.current.emit("join_chat", chatId);
      }
    }
  }, [activeChat, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isMessagesLoading]); // Scroll when loading finishes too

  // --- Handlers ---

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    // Optimistic UI: Don't wait for server to clear input, makes it feel faster
    const content = inputText;
    setInputText(""); 

    const receiverId = getSafeId(activeChat);
    try {
      const res = await fetch(`${API_URL}/api/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-auth-token": token },
        body: JSON.stringify({ receiverId, content })
      });
      const data = await res.json();
      
      if (res.status === 403 && data.isUnfriended) {
        alert(data.msg);
        setFriends(prev => prev.filter(f => getSafeId(f) !== receiverId));
        setActiveChat(null);
        return;
      }

      // Socket Emit
      if (socketRef.current) socketRef.current.emit("new_message", data);
      
      // Safe Update: Use function to access latest state and prevent overwrite
      safelyAddMessage(data);

    } catch (err) { 
        console.error("Send Error", err); 
        setInputText(content); // Revert text if failed
    }
  };

  const handleUserSearch = async (term) => {
    setUserSearchTerm(term);
    if (term.length < 2) { setUserSearchResults([]); return; }
    try {
        const res = await fetch(`${API_URL}/api/users/search?query=${term}`, { headers: { "x-auth-token": token } });
        const data = await res.json();
        setUserSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {}
  };

  const handleSendRequest = async (receiverId) => {
    setIsProcessing(true);
    try {
        const res = await fetch(`${API_URL}/api/requests/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-auth-token": token },
            body: JSON.stringify({ receiverId })
        });
        const data = await res.json();
        if (res.ok) { 
            alert("Request Sent!"); 
            setUserSearchTerm(""); setUserSearchResults([]);
            if(socketRef.current) socketRef.current.emit("send_friend_request", { request: data, receiverId });
        } else { alert(data.msg || "Failed"); }
    } catch (err) { alert("Error"); } finally { setIsProcessing(false); }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
        const res = await fetch(`${API_URL}/api/requests/accept`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-auth-token": token },
            body: JSON.stringify({ requestId })
        });
        const data = await res.json();
        if (res.ok) {
            setRequestStack(prev => {
                const items = prev.items.filter(req => req._id !== requestId);
                return new RequestStack(items);
            });
            fetchFriends();
            if(socketRef.current) {
                socketRef.current.emit("accept_friend_request", { 
                    senderId: data.newFriend?._id || data.newFriend, 
                    user: user 
                });
            }
            buildGraphRecommendations();
            alert("Friend Added!");
        }
    } catch (err) { alert("Error"); }
  };

  const handleUnfriend = async (e) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure? This will wipe your history.`)) return;
    setIsProcessing(true);
    const friendId = getSafeId(activeChat); 
    try {
        const res = await fetch(`${API_URL}/api/users/remove-friend`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-auth-token": token },
            body: JSON.stringify({ friendId })
        });
        if (res.ok) {
            setFriends(prev => prev.filter(f => getSafeId(f) !== friendId));
            setActiveChat(null); 
            setShowChatMenu(false);
            if(socketRef.current) socketRef.current.emit("remove_friend", { friendId, userId: user._id });
            buildGraphRecommendations();
            alert("Unfriended.");
        }
    } catch (err) { alert("Sync Error"); } finally { setIsProcessing(false); }
  };

  const handleMarkAsRead = async (id) => {
    setNotifyStack(prev => {
      const items = prev.items.map(n => n._id === id ? { ...n, isRead: true } : n);
      return new NotificationStack(items);
    });
    await fetch(`${API_URL}/api/notifications/read/${id}`, { method: 'PATCH', headers: { "x-auth-token": token } });
  };

  const handlePopNotification = async () => {
    if (notifyStack.isEmpty()) return;
    const res = await fetch(`${API_URL}/api/notifications/pop`, { method: 'DELETE', headers: { "x-auth-token": token } });
    if (res.ok) {
      setNotifyStack(prev => {
        const updated = new NotificationStack(prev.items);
        updated.pop(); 
        return updated;
      });
    }
  };

  const handleClearNotifications = async () => {
    if (notifyStack.isEmpty()) return;
    const res = await fetch(`${API_URL}/api/notifications/clear`, { method: 'DELETE', headers: { "x-auth-token": token } });
    if (res.ok) setNotifyStack(new NotificationStack());
  };

  const handleLogout = () => { localStorage.clear(); router.push("/signin"); };

  if (!user) return null;

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#0f1a1a] text-white overflow-hidden font-sans">
      <Sidebar 
        user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
        activeTab={activeTab} setActiveTab={setActiveTab}
        friends={friends} requestStack={requestStack} notifyStack={notifyStack} recommendations={recommendations}
        userSearchResults={userSearchResults} userSearchTerm={userSearchTerm}
        handleUserSearch={handleUserSearch} handleSendRequest={handleSendRequest}
        handleAcceptRequest={handleAcceptRequest} handleLogout={handleLogout}
        handleMarkAsRead={handleMarkAsRead} handlePopNotification={handlePopNotification}
        handleClearNotifications={handleClearNotifications}
        activeChat={activeChat} setActiveChat={setActiveChat} isProcessing={isProcessing}
      />
      
      {/* 
         We pass isMessagesLoading to ChatWindow if you want to show a spinner there.
         If ChatWindow doesn't accept it, it will just ignore the prop.
      */}
      <ChatWindow 
        user={user} activeChat={activeChat} setActiveChat={setActiveChat}
        messages={messages} inputText={inputText} setInputText={setInputText}
        handleSendMessage={handleSendMessage} handleUnfriend={handleUnfriend}
        showChatMenu={showChatMenu} setShowChatMenu={setShowChatMenu} isProcessing={isProcessing}
        messagesEndRef={messagesEndRef} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        isSearchingChat={isSearchingChat} setIsSearchingChat={setIsSearchingChat}
      />
      <EonBot/>
    </div>
  );
}