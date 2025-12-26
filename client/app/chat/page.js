// 1. app/chat/page.js 
"use client";

import { useEffect, useState, useRef } from "react";
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
  const [searchQuery, setSearchQuery] = useState(""); 
  const [isSearchingChat, setIsSearchingChat] = useState(false);
  
  const messagesEndRef = useRef(null);
  const activeChatRef = useRef(null);

  // --- Helpers ---
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

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  // --- Socket Hook ---
  const socketRef = useChatSocket(
    user, 
    activeChatRef, 
    setMessages, 
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
    try {
      const res = await fetch(`${API_URL}/api/messages/${chatId}`, { headers: { "x-auth-token": token } });
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) { setMessages([]); }
  };

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
  }, [messages]);

  // --- 🔥 SEND MESSAGE HANDLER (Optimized & Robust) ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const content = inputText;
    const receiverId = getSafeId(activeChat);
    const tempId = `temp-${Date.now()}`;
    const timestamp = new Date().toISOString(); 

    // 1. Optimistic Message (Instant Show)
    const optimisticMsg = {
        _id: tempId,
        content: content,
        sender: user, 
        receiver: activeChat,
        createdAt: timestamp, 
        timestamp: timestamp, 
        status: "sending"
    };

    setInputText(""); 
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      // 2. Network Request
      const res = await fetch(`${API_URL}/api/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-auth-token": token },
        body: JSON.stringify({ receiverId, content })
      });
      const data = await res.json();
      
      if (res.status === 403) {
        alert(data.msg || "Message failed.");
        setMessages(prev => prev.filter(m => m._id !== tempId));
        return;
      }

      // 3. Construct Safe Socket Payload
      const socketPayload = {
          ...data,
          sender: user, // Force full sender object
          createdAt: data.createdAt || timestamp, 
          timestamp: data.createdAt || timestamp 
      };

      // 4. Emit to Socket
      if (socketRef.current) socketRef.current.emit("new_message", socketPayload);
      
      // 5. Update Local State (Replace Temp ID)
      setMessages((prev) => prev.map(msg => (msg._id === tempId ? socketPayload : msg)));

    } catch (err) { 
        console.error("Send Error", err);
        setMessages(prev => prev.filter(m => m._id !== tempId));
        setInputText(content); // Restore text
    }
  };

  // --- Handlers ---

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

  // --- 🔥 NEW: MARK ALL AS READ HANDLER ---
  const handleMarkAllAsRead = async () => {
    // 1. Guard Clause: Skip if empty or already all read
    if (notifyStack.isEmpty() || !notifyStack.items.some(n => !n.isRead)) return;

    // 2. Optimistic UI Update (Instant)
    setNotifyStack(prev => {
      const updatedItems = prev.items.map(n => ({ ...n, isRead: true }));
      return new NotificationStack(updatedItems);
    });

    // 3. API Call
    try {
      await fetch(`${API_URL}/api/notifications/mark-all-read`, { 
        method: 'PATCH', 
        headers: { "x-auth-token": token } 
      });
    } catch (err) { console.error("Mark All Read Error", err); }
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
        
        handleMarkAsRead={handleMarkAsRead} 
        handleMarkAllAsRead={handleMarkAllAsRead} // Pass the new handler
        handlePopNotification={handlePopNotification}
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