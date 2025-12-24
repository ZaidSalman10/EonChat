
// 4. app/chat/components/ChatWindow.jsx 

"use client";

import { useState, useEffect } from "react";
import { 
  Search, Send, MessageSquare, X, ArrowLeft, Loader2, 
  MoreVertical, Trash2, User, TrendingUp, Clock, ShieldCheck, Zap
} from "lucide-react";
import { getSafeId } from '../utils/chatHelpers';
import { getActivityReport } from '../utils/activityAnalyzer';

export default function ChatWindow({ 
  user, 
  activeChat, 
  setActiveChat, 
  messages, 
  inputText, 
  setInputText, 
  handleSendMessage, 
  showChatMenu, 
  setShowChatMenu, 
  handleUnfriend, 
  isProcessing,
  messagesEndRef, 
  searchQuery, 
  setSearchQuery, 
  isSearchingChat, 
  setIsSearchingChat 
}) {
  const [report, setReport] = useState(null);

  if (!activeChat) {
    return (
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center opacity-40 bg-[#0f1a1a]">
        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-[#208c8c]/5 rounded-3xl flex items-center justify-center mb-4 sm:mb-6 animate-pulse">
            <MessageSquare size={48} className="text-[#208c8c] sm:w-[60px] sm:h-[60px]" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#cae9ea] tracking-tight">EonChat DSA</h1>
        <p className="text-gray-500 mt-2 text-[10px] sm:text-xs uppercase tracking-[0.2em]">Select a node to begin traversal</p>
      </div>
    );
  }

  const runActivityAnalysis = () => {
    const data = getActivityReport(messages);
    setReport(data);
  };

  const HighlightText = ({ text, highlight }) => { 
    if (!highlight.trim()) return <span>{text}</span>; 
    const parts = text.split(new RegExp(`(${highlight})`, 'gi')); 
    return <span>{parts.map((part, i) => part.toLowerCase() === highlight.toLowerCase() ? <span key={i} className="bg-[#208c8c] text-black px-0.5 rounded font-bold">{part}</span> : part)}</span>; 
  };

  const filteredMessages = messages.filter(msg => (msg.content || "").toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <main className={`flex-1 flex-col bg-[#0f1a1a] relative h-full transition-all flex fixed inset-0 z-10 lg:static`}>
        
        {/* Header */}
        <div className="h-14 sm:h-16 lg:h-20 border-b border-[#208c8c]/10 flex items-center justify-between px-3 sm:px-4 lg:px-6 bg-[#152222]/95 backdrop-blur-md z-50">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button onClick={() => setActiveChat(null)} className="lg:hidden p-1.5 sm:p-2 -ml-1 sm:-ml-2 text-gray-400 hover:text-white transition active:scale-90 shrink-0">
                <ArrowLeft size={20} className="sm:w-[22px] sm:h-[22px]" />
              </button>
              <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-2xl bg-gradient-to-br from-[#208c8c] to-[#005c5c] flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(32,140,140,0.3)] text-sm sm:text-base shrink-0">
                {activeChat.username?.[0]?.toUpperCase()}
              </div>
              <div className="overflow-hidden min-w-0">
                <h2 className="font-bold text-white text-sm sm:text-base lg:text-lg truncate">{activeChat.username}</h2>
                <p className="text-[9px] sm:text-[10px] lg:text-xs text-[#208c8c] flex items-center gap-1">
                   <ShieldCheck size={9} className="sm:w-[10px] sm:h-[10px]" /> End-to-End Secure
                </p>
              </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              <button 
                  onClick={runActivityAnalysis}
                  className="p-2 sm:p-2.5 text-gray-400 hover:text-[#208c8c] transition-all rounded-xl hover:bg-white/5"
                  title="Peak Engagement"
              >
                  <TrendingUp size={18} className="sm:w-5 sm:h-5" />
              </button>

              {isSearchingChat ? (
                <div className="flex items-center bg-[#0f1a1a] border border-[#208c8c] rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 absolute left-12 right-12 sm:left-14 sm:right-14 lg:static lg:w-auto animate-fade-in z-50 shadow-2xl">
                    <input autoFocus placeholder="Find text..." className="bg-transparent outline-none text-xs sm:text-sm text-white w-full lg:w-32 xl:w-40" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    <button onClick={() => { setIsSearchingChat(false); setSearchQuery(""); }}>
                      <X size={14} className="text-gray-400 hover:text-white sm:w-4 sm:h-4"/>
                    </button>
                </div>
              ) : (
                <button onClick={() => setIsSearchingChat(true)} className="p-2 sm:p-2.5 text-gray-400 hover:text-[#208c8c] transition rounded-xl hover:bg-white/5">
                  <Search size={18} className="sm:w-5 sm:h-5" />
                </button>
              )}

              <div className="relative">
                <button onClick={() => setShowChatMenu(!showChatMenu)} className="p-2 sm:p-2.5 text-gray-400 hover:text-white transition rounded-full hover:bg-white/5">
                    <MoreVertical size={18} className="sm:w-5 sm:h-5" />
                </button>
                {showChatMenu && (
                    <div className="absolute right-0 top-12 sm:top-14 w-48 sm:w-52 bg-[#1d2d2d] border border-[#333] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] py-2 z-[100] animate-slide-down origin-top-right overflow-hidden">
                        <div className="px-3 sm:px-4 py-2 mb-1 border-b border-[#333]/50">
                             <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Encrypted Session</p>
                        </div>
                        <button disabled className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-gray-400 flex items-center gap-2.5 sm:gap-3 hover:bg-white/5 transition">
                          <User size={14} className="sm:w-4 sm:h-4" /> User Identity
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleUnfriend(e); }} 
                            disabled={isProcessing}
                            className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 sm:gap-3 transition font-bold"
                        >
                            {isProcessing ? <Loader2 size={14} className="animate-spin sm:w-4 sm:h-4" /> : <Trash2 size={14} className="sm:w-4 sm:h-4" />} 
                            Unfriend User
                        </button>
                    </div>
                )}
              </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 custom-scrollbar relative z-10 bg-[#0f1a1a]">
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #208c8c 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
            
            {filteredMessages.map((msg, index) => {
                const isMe = getSafeId(msg.sender) === getSafeId(user);
                return (
                    <div key={msg._id || `msg-${index}`} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-fade-in-up relative z-10`}>
                        <div className={`flex items-end gap-1.5 sm:gap-2 max-w-[90%] sm:max-w-[85%] lg:max-w-[70%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                            <div className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs sm:text-sm shadow-md break-words leading-relaxed ${isMe ? "bg-[#208c8c] text-black rounded-br-none" : "bg-[#1d2d2d] text-white border border-[#333] rounded-bl-none"}`}>
                                {searchQuery ? <HighlightText text={msg.content} highlight={searchQuery} /> : msg.content}
                                <div className={`text-[8px] sm:text-[9px] mt-1 sm:mt-1.5 text-right font-bold tracking-tighter ${isMe ? "text-black/50" : "text-gray-500"}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-2.5 sm:p-3 lg:p-5 bg-[#0f1a1a] border-t border-[#333]/30 z-20">
          <form onSubmit={handleSendMessage} className="flex gap-1.5 sm:gap-2 lg:gap-4 items-center max-w-5xl mx-auto">
            <input 
                value={inputText} 
                onChange={(e) => setInputText(e.target.value)} 
                className="flex-1 p-2.5 sm:p-3 lg:p-4 rounded-2xl bg-[#121e1e] border border-[#333] focus:border-[#208c8c] outline-none text-white text-xs sm:text-sm transition-all focus:ring-1 focus:ring-[#208c8c] placeholder-gray-600" 
                placeholder="Type a message..." 
            />
            <button 
                type="submit" 
                disabled={!inputText.trim()} 
                className="p-2.5 sm:p-3 lg:p-4 bg-[#208c8c] hover:bg-[#1aa3a3] disabled:opacity-30 disabled:grayscale rounded-2xl text-black shadow-xl transition-all transform active:scale-95 shrink-0"
            >
                <Send size={18} className="sm:w-5 sm:h-5" />
            </button>
          </form>
        </div>

        {/* Activity Report Modal */}
        {report && (
            <div className="absolute inset-0 bg-[#0f1a1a]/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
                <div className="w-full max-w-xs sm:max-w-sm bg-[#152222] border border-[#208c8c]/30 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl p-6 sm:p-8 relative overflow-hidden">
                    <button onClick={() => setReport(null)} className="absolute top-4 right-4 sm:top-6 sm:right-6 text-gray-500 hover:text-white transition">
                      <X size={20} className="sm:w-6 sm:h-6" />
                    </button>
                    
                    <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#208c8c]/10 flex items-center justify-center mb-3 sm:mb-4 border border-[#208c8c]/20">
                            <Clock size={32} className="text-[#208c8c] sm:w-10 sm:h-10" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Activity Audit</h2>
                        <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest mt-1">Binary Search Tree Analytics</p>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                        <div className="bg-[#0f1a1a] p-4 sm:p-5 rounded-3xl border border-[#333] shadow-inner text-center">
                            <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-widest">Peak Time Slot</p>
                            <p className="text-2xl sm:text-3xl font-black text-[#208c8c]">{report.peakTime}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="bg-[#0f1a1a] p-3 sm:p-4 rounded-2xl border border-[#333] text-center">
                                <p className="text-[8px] sm:text-[9px] text-gray-500 uppercase font-bold mb-1">Density</p>
                                <p className="text-lg sm:text-xl font-bold text-white">{report.messageCount} msg</p>
                            </div>
                            <div className="bg-[#0f1a1a] p-3 sm:p-4 rounded-2xl border border-[#333] text-center">
                                <p className="text-[8px] sm:text-[9px] text-gray-500 uppercase font-bold mb-1">Impact</p>
                                <p className="text-lg sm:text-xl font-bold text-white">{report.percentage}%</p>
                            </div>
                        </div>

                        <div className="bg-[#208c8c]/5 p-3 sm:p-4 rounded-2xl border border-[#208c8c]/20 flex items-center gap-2.5 sm:gap-3">
                            <Zap size={16} className="text-[#208c8c] shrink-0 sm:w-[18px] sm:h-[18px]" />
                            <p className="text-[10px] sm:text-[11px] text-gray-400 leading-tight">
                                Most of your engagement happens at <span className="text-white font-bold">{report.peakTime}</span>. Use this for faster replies!
                            </p>
                        </div>
                    </div>
                    
                    <p className="mt-6 sm:mt-8 text-[7px] sm:text-[8px] text-gray-600 text-center uppercase tracking-widest font-mono">
                       BST In-Order Traversal Complete | O(N log N)
                    </p>
                </div>
            </div>
        )}
        
        {showChatMenu && <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowChatMenu(false)}></div>}
    </main>
  );
}


