// ============================================
// 3. app/chat/components/Sidebar.jsx (UPDATED - Fully Responsive)
// ============================================
"use client";

import { 
  LogOut, Search, MessageSquare, Users, UserPlus, 
  Bell, Layers, Check, ChevronLeft, ChevronRight, 
  Info, MessageCircle, Trash2, ArrowUpCircle,
  Compass, UserPlus2, Share2, ShieldCheck
} from "lucide-react";
import { getSafeId } from '../utils/chatHelpers';

export default function Sidebar({ 
  user, 
  isSidebarOpen, 
  setIsSidebarOpen, 
  activeTab, 
  setActiveTab, 
  friends, 
  requestStack, 
  notifyStack,
  recommendations,
  userSearchResults, 
  userSearchTerm, 
  handleUserSearch, 
  handleSendRequest, 
  handleAcceptRequest, 
  handleLogout, 
  activeChat, 
  setActiveChat, 
  isProcessing,
  handleMarkAsRead,
  handlePopNotification,
  handleClearNotifications
}) {
  
  const textVisibility = isSidebarOpen 
    ? "opacity-100 w-auto ml-2 sm:ml-3 visible transition-all duration-300 delay-100" 
    : "opacity-0 w-0 ml-0 invisible overflow-hidden transition-all duration-200";

  return (
    <aside 
      className={`flex flex-col bg-[#152222] border-r border-[#208c8c]/10 transition-all duration-500 ease-in-out relative z-40 
        ${activeChat ? "hidden lg:flex" : "flex w-full"} 
        ${isSidebarOpen ? "lg:w-80" : "lg:w-24"}`}
    >
      
      {/* Sidebar Toggle - Desktop Only */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
        className="hidden lg:flex absolute -right-3 top-8 bg-[#208c8c] p-1.5 rounded-full text-black shadow-[0_0_15px_rgba(32,140,140,0.5)] z-50 hover:scale-110 transition-transform active:scale-95"
      >
        {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* User Header */}
      <div className="p-3 sm:p-4 flex items-center h-20 sm:h-24 bg-[#152222] overflow-hidden whitespace-nowrap">
          <div className="relative shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#208c8c] to-[#cae9ea] flex items-center justify-center font-bold text-[#0f1a1a] shadow-lg ring-2 ring-[#208c8c]/20 text-lg sm:text-xl">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <span className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 border-2 border-[#152222] rounded-full"></span>
          </div>
          
          <div className={textVisibility}>
             <h2 className="font-bold text-[#cae9ea] text-base sm:text-lg leading-tight truncate max-w-[120px] sm:max-w-[150px]">
               {user?.username}
             </h2>
             <p className="text-[9px] sm:text-[10px] text-[#208c8c] font-bold uppercase tracking-tighter flex items-center gap-1">
               <ShieldCheck size={10} /> Verified
             </p>
          </div>
      </div>

      {/* DSA Module Tabs */}
      <div className="flex justify-around py-3 sm:py-4 bg-[#121e1e]/50 border-y border-[#333]/20 overflow-x-hidden">
          <NavIcon icon={MessageSquare} active={activeTab==="chats"} onClick={()=>setActiveTab("chats")} title="Chats" />
          <NavIcon icon={Layers} active={activeTab==="requests"} onClick={()=>setActiveTab("requests")} title="Requests" />
          <NavIcon icon={Compass} active={activeTab==="discovery"} onClick={()=>setActiveTab("discovery")} title="Discovery" />
          <div className="relative">
              <NavIcon icon={Bell} active={activeTab==="notifications"} onClick={()=>setActiveTab("notifications")} title="Activity" />
              {(!notifyStack?.isEmpty() && notifyStack?.items.some(n => !n.isRead)) && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-[#208c8c] rounded-full animate-ping"></span>
              )}
          </div>
          <NavIcon icon={UserPlus} active={activeTab==="friends"} onClick={()=>setActiveTab("friends")} title="Search" />
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 custom-scrollbar space-y-2">
          
          {/* DISCOVERY */}
          {activeTab === "discovery" && recommendations?.map((rec, idx) => (
            <div key={getSafeId(rec) || `rec-${idx}`} className="flex items-center p-2.5 sm:p-3 rounded-xl bg-[#1d2d2d]/30 border border-transparent hover:border-[#208c8c]/30 transition-all group overflow-hidden whitespace-nowrap">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-800 flex items-center justify-center shrink-0 text-[#cae9ea] font-bold text-sm sm:text-base">
                    {rec.username?.[0]?.toUpperCase()}
                </div>
                <div className={textVisibility}>
                    <p className="text-xs sm:text-sm font-bold text-gray-200 truncate">{rec.username}</p>
                    <p className="text-[9px] sm:text-[10px] text-[#208c8c]">{rec.mutualCount} mutual</p>
                </div>
                {isSidebarOpen && (
                    <button onClick={() => handleSendRequest(rec._id)} className="ml-auto p-1.5 sm:p-2 bg-[#208c8c] rounded-lg text-black hover:bg-[#1aa3a3] transition active:scale-90 shrink-0">
                        <UserPlus2 size={14} className="sm:w-4 sm:h-4" />
                    </button>
                )}
            </div>
          ))}

          {/* REQUESTS */}
          {activeTab === "requests" && requestStack.getStackView().map((req, index) => (
              <div key={getSafeId(req) || `req-${index}`} className="flex flex-col p-2.5 sm:p-3 rounded-xl bg-[#1d2d2d] border border-[#333] overflow-hidden whitespace-nowrap relative">
                  <div className="flex items-center">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#208c8c]/20 flex items-center justify-center shrink-0 text-[#208c8c] font-bold text-sm sm:text-base">
                        {req.sender?.username?.[0]?.toUpperCase()}
                    </div>
                    <div className={textVisibility}>
                        <p className="text-xs sm:text-sm font-bold text-gray-100 truncate">{req.sender?.username}</p>
                        <p className="text-[8px] sm:text-[9px] text-gray-500 uppercase tracking-tighter">Wants to connect</p>
                    </div>
                    {index === 0 && isSidebarOpen && (
                        <span className="ml-auto text-[7px] sm:text-[8px] bg-[#208c8c] text-black px-1 rounded font-bold">TOP</span>
                    )}
                  </div>
                  {isSidebarOpen && (
                      <button onClick={() => handleAcceptRequest(req._id)} className="mt-2 sm:mt-3 w-full py-1.5 sm:py-2 bg-[#208c8c] text-black text-[10px] sm:text-xs font-bold rounded-lg hover:bg-[#1aa3a3] transition flex items-center justify-center gap-2">
                          <Check size={12} className="sm:w-3.5 sm:h-3.5" /> Accept
                      </button>
                  )}
              </div>
          ))}

          {/* NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="animate-fade-in space-y-2">
                {isSidebarOpen && (
                    <div className="flex items-center justify-between px-1 mb-3 sm:mb-4">
                        <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold">Activity Log</p>
                        <div className="flex gap-1.5 sm:gap-2">
                            <button onClick={handlePopNotification} title="Pop Top" className="text-gray-500 hover:text-[#208c8c] transition">
                              <ArrowUpCircle size={16} className="sm:w-[18px] sm:h-[18px]"/>
                            </button>
                            <button onClick={handleClearNotifications} title="Clear" className="text-gray-500 hover:text-red-400 transition">
                              <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]"/>
                            </button>
                        </div>
                    </div>
                )}
                {notifyStack.getStackView().map((note, idx) => (
                    <div key={getSafeId(note) || `note-${idx}`} onClick={() => !note.isRead && handleMarkAsRead(note._id)} className={`flex items-center p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer overflow-hidden whitespace-nowrap ${note.isRead ? "opacity-30 grayscale" : "bg-[#1d2d2d] border-[#208c8c]/20 shadow-md"}`}>
                        <div className="shrink-0">
                            {note.type === "message" ? <MessageCircle size={16} className="text-[#208c8c] sm:w-[18px] sm:h-[18px]" /> : <Info size={16} className="text-red-400 sm:w-[18px] sm:h-[18px]" />}
                        </div>
                        <div className={textVisibility}>
                            <p className="text-[10px] sm:text-xs font-medium text-gray-200 truncate">{note.message}</p>
                            <p className="text-[8px] sm:text-[9px] text-gray-500 mt-0.5">{new Date(note.timestamp).toLocaleTimeString()}</p>
                        </div>
                    </div>
                ))}
            </div>
          )}

          {/* CHATS */}
          {activeTab === "chats" && friends?.map((friend, idx) => (
              <div 
                key={getSafeId(friend) || `friend-${idx}`} 
                onClick={() => setActiveChat(friend)} 
                className={`flex items-center p-2.5 sm:p-3 rounded-2xl cursor-pointer transition-all duration-300 border border-transparent overflow-hidden whitespace-nowrap
                  ${getSafeId(activeChat) === getSafeId(friend) ? "bg-[#208c8c]/10 border-[#208c8c]/40 shadow-sm" : "hover:bg-[#1d2d2d]"}`}
              >
                  <div className="relative shrink-0">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gray-800 flex items-center justify-center font-bold text-[#cae9ea] shadow-inner border border-[#333] text-sm sm:text-base">
                        {friend.username?.[0]?.toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 border-2 border-[#152222] rounded-full shadow-lg"></span>
                  </div>
                  <div className={textVisibility}>
                      <p className="font-bold text-gray-200 text-xs sm:text-sm truncate">{friend.username}</p>
                      <p className="text-[9px] sm:text-[11px] text-[#208c8c] opacity-80">Encrypted Chat</p>
                  </div>
              </div>
          ))}

          {/* SEARCH PEOPLE */}
          {activeTab === "friends" && (
              <div className="space-y-3 sm:space-y-4">
                  <div className="px-1">
                      <div className="relative">
                          <Search className="absolute left-2.5 sm:left-3 top-2.5 sm:top-3 text-gray-500" size={14}/>
                          <input 
                            value={userSearchTerm} 
                            onChange={(e) => handleUserSearch(e.target.value)} 
                            className="w-full bg-[#0f1a1a] rounded-xl py-2.5 sm:py-3 pl-9 sm:pl-10 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#208c8c] placeholder-gray-600 transition-all" 
                            placeholder={isSidebarOpen ? "Search username..." : ""}
                          />
                      </div>
                  </div>
                  {userSearchResults.map((u, idx) => (
                      <div key={getSafeId(u) || `search-${idx}`} className="flex items-center p-2.5 sm:p-3 rounded-xl bg-[#1d2d2d] border border-[#333] overflow-hidden whitespace-nowrap">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-800 flex items-center justify-center shrink-0 text-[#cae9ea] font-bold text-sm sm:text-base">
                                {u.username?.[0]?.toUpperCase()}
                            </div>
                            <div className={textVisibility}>
                                <p className="text-xs sm:text-sm font-medium text-gray-200 truncate">{u.username}</p>
                            </div>
                            {isSidebarOpen && (
                                <button 
                                  onClick={() => handleSendRequest(u._id)} 
                                  disabled={isProcessing || friends.some(f => getSafeId(f) === u._id)} 
                                  className="ml-auto px-2.5 py-1 sm:px-3 sm:py-1 bg-[#208c8c] rounded-lg text-black text-[9px] sm:text-[10px] font-bold hover:bg-[#1aa3a3] disabled:opacity-30 shrink-0"
                                >
                                  {friends.some(f => getSafeId(f) === u._id) ? "Friends" : "Add"}
                                </button>
                            )}
                      </div>
                  ))}
              </div>
          )}

          {/* Empty States */}
          {friends.length === 0 && activeTab === "chats" && (
            <div className="flex flex-col items-center justify-center mt-10 opacity-20">
                <Users size={28} className="sm:w-8 sm:h-8" />
                {isSidebarOpen && <p className="text-[10px] sm:text-xs mt-2 font-bold uppercase tracking-widest">No Connections</p>}
            </div>
          )}
      </div>
      
      {/* Footer */}
      <div className="p-3 sm:p-4 border-t border-[#208c8c]/10 bg-[#121e1e]/40 overflow-hidden">
          <button 
            onClick={handleLogout} 
            className="flex items-center w-full p-2.5 sm:p-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-400/5 transition-all group whitespace-nowrap"
          >
            <LogOut size={20} className="shrink-0 group-hover:rotate-12 transition-transform sm:w-[22px] sm:h-[22px]" />
            <span className={`${textVisibility} font-bold text-xs sm:text-sm`}>Terminate Session</span>
          </button>
      </div>
    </aside>
  );
}

function NavIcon({ icon: Icon, active, onClick, title }) { 
  return (
      <button 
        onClick={onClick} 
        title={title}
        className={`p-2.5 sm:p-3 rounded-2xl transition-all duration-300 group ${active ? "bg-[#208c8c] text-[#0f1a1a] shadow-[0_0_20px_rgba(32,140,140,0.4)]" : "text-gray-500 hover:bg-white/5 hover:text-gray-300"}`}
      >
          <Icon size={20} strokeWidth={active ? 2.5 : 2} className="group-active:scale-90 transition-transform sm:w-6 sm:h-6" />
      </button>
  ); 
}