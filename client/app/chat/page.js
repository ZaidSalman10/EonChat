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
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(""); 
  const [isSearchingChat, setIsSearchingChat] = useState(false);
  
  // --- Refs ---
  const messagesEndRef = useRef(null);
  const activeChatRef = useRef(null);

  // --- Helpers ---
  const safelyAddMessage = useCallback((newMessage) => {
    setMessages((prev) => {
      // Deduplicate based on ID to prevent "double bubble" effect
      if (prev.some(m => m._id === newMessage._id)) return prev;
      return [...prev, newMessage];
    });
  }, []);

  const buildGraphRecommendations = async () => {
    if (!token || !user) return;
    try {
      const res = await fetch(`${API_URL}/api/users/network`, { headers: { "x-auth-token": token } });
      const allUsers = await res.json();
      const graph = new FriendGraph();
      allUsers.forEach(u => graph.addUser(u._id, u.username));
      allUsers.forEach(u => { u.friends.forEach(friendId => graph.addEdge(u._id, friendId)); });
      const myId = getSafeId(user);
      setRecommendations(graph.getRecommendations(myId));
    } catch (err) { console.error("Graph Error", err); }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (!storedToken) { router.push("/signin"); } 
    else { setToken(storedToken); setUser(JSON.parse(storedUser)); }
  }, [router]);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  // --- Socket Hook ---
  const socketRef = useChatSocket(
    user, activeChatRef, safelyAddMessage, setRequestStack, 
    setFriends, setActiveChat, setNotifyStack, buildGraphRecommendations 
  );

  // --- Data Fetching ---
  const fetchFriends = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/friends`, { headers: { "x-auth-token": token } });
      const data = await res.json();
      if (Array.isArray(data)) setFriends(data);
    } catch (err) {}
  };

  const fetchPendingRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/api/requests/pending`, { headers: { "x-auth-token": token } });
      const data = await res.json();
      if (Array.isArray(data)) setRequestStack(new RequestStack(data));
    } catch (err) {}
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications`, { headers: { "x-auth-token": token } });
      const data = await res.json();
      if (Array.isArray(data)) setNotifyStack(new NotificationStack(data));
    } catch (err) {}
  };

  const fetchMessages = async (chatId) => {
    setIsMessagesLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/messages/${chatId}`, { headers: { "x-auth-token": token } });
      const data = await res.json();
      if (activeChatRef.current && getSafeId(activeChatRef.current) === chatId) {
         setMessages(Array.isArray(data) ? data : []);
      }
    } catch (err) { 
        if (activeChatRef.current && getSafeId(activeChatRef.current) === chatId) setMessages([]); 
    } finally { setIsMessagesLoading(false); }
  };

  useEffect(() => {
    if (token) {
        fetchFriends(); fetchPendingRequests(); fetchNotifications(); buildGraphRecommendations();
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
  }, [messages, isMessagesLoading]);

  // --- 🔥 ROBUST SEND MESSAGE HANDLER ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const content = inputText;
    const receiverId = getSafeId(activeChat);
    const tempId = `temp-${Date.now()}`;
    const timestamp = new Date().toISOString();

    // 1. Optimistic UI Update (Immediate)
    const optimisticMsg = {
        _id: tempId,
        content: content,
        sender: user, // We have the full user object here
        receiver: activeChat,
        createdAt: timestamp, 
        status: "sending"
    };

    setInputText(""); 
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      // 2. API Call
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

      // 3. 🔥 CRITICAL FIX: Ensure Socket Payload is Fully Populated
      // Sometimes API returns shallow 'sender' (just ID). We force full 'sender' (user object).
      const socketPayload = {
          ...data,
          sender: user, // Override with full profile to prevent "Invalid Date/User" on receiver
          createdAt: data.createdAt || timestamp // Fallback to local time if API is silent
      };

      if (socketRef.current) socketRef.current.emit("new_message", socketPayload);
      
      // 4. Update Local State with Real ID
      setMessages((prev) => prev.map(msg => (msg._id === tempId ? socketPayload : msg)));

    } catch (err) { 
        console.error("Send Error", err); 
        setMessages(prev => prev.filter(m => m._id !== tempId)); 
        setInputText(content); 
        alert("Failed to send.");
    }
  };

  // --- Handlers for Search, Requests, etc. ---
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
            alert("Request Sent!"); setUserSearchTerm(""); setUserSearchResults([]);
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
            setRequestStack(prev => new RequestStack(prev.items.filter(r => r._id !== requestId)));
            fetchFriends();
            if(socketRef.current) {
                socketRef.current.emit("accept_friend_request", { senderId: data.newFriend?._id || data.newFriend, user: user });
            }
            buildGraphRecommendations();
            alert("Friend Added!");
        }
    } catch (err) { alert("Error"); }
  };

  const handleUnfriend = async (e) => {
    if (e) e.stopPropagation();
    if (!confirm(`Unfriend this user?`)) return;
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
            setActiveChat(null); setShowChatMenu(false);
            if(socketRef.current) socketRef.current.emit("remove_friend", { friendId, userId: user._id });
            buildGraphRecommendations();
            alert("Unfriended.");
        }
    } catch (err) { alert("Error"); } finally { setIsProcessing(false); }
  };

  const handleMarkAsRead = async (id) => {
    setNotifyStack(prev => new NotificationStack(prev.items.map(n => n._id === id ? { ...n, isRead: true } : n)));
    await fetch(`${API_URL}/api/notifications/read/${id}`, { method: 'PATCH', headers: { "x-auth-token": token } });
  };
  const handlePopNotification = async () => {
    if (notifyStack.isEmpty()) return;
    const res = await fetch(`${API_URL}/api/notifications/pop`, { method: 'DELETE', headers: { "x-auth-token": token } });
    if (res.ok) setNotifyStack(prev => { const s = new NotificationStack(prev.items); s.pop(); return s; });
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