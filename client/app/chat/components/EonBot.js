'use client';

import { useState, useEffect, useRef } from 'react';
import { EON_KNOWLEDGE } from '../utils/botData';
import { createBotEngine } from '../utils/botEngine';

export default function EonBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [botEngine, setBotEngine] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMetrics, setShowMetrics] = useState(false);
  const messagesEndRef = useRef(null);

  // --- Dragging Logic State ---
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false); 
  const bubbleRef = useRef(null);

  // Initialize Position to Bottom Right on Mount
  useEffect(() => {
    const margin = 24;
    setPosition({
      x: window.innerWidth - 70 - margin,
      y: window.innerHeight - 70 - margin,
    });

    const engine = createBotEngine(EON_KNOWLEDGE);
    setBotEngine(engine);
    setMetrics(engine.getMetrics());
    
    const welcomeResponse = engine.getResponse('hello');
    setMessages([
      {
        type: 'bot',
        content: welcomeResponse.text,
        options: welcomeResponse.options,
        timestamp: Date.now()
      }
    ]);
    setUnreadCount(1);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 60),
        y: Math.min(prev.y, window.innerHeight - 60)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Drag Event Handlers ---
  const startDrag = (e) => {
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    setIsDragging(true);
    setHasMoved(false);
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const onDrag = (e) => {
    if (!isDragging) return;
    setHasMoved(true);
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

    let newX = clientX - dragStart.x;
    let newY = clientY - dragStart.y;

    newX = Math.max(0, Math.min(newX, window.innerWidth - 60));
    newY = Math.max(0, Math.min(newY, window.innerHeight - 60));
    setPosition({ x: newX, y: newY });
  };

  const stopDrag = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onDrag);
      window.addEventListener('mouseup', stopDrag);
      window.addEventListener('touchmove', onDrag, { passive: false });
      window.addEventListener('touchend', stopDrag);
    }
    return () => {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchmove', onDrag);
      window.removeEventListener('touchend', stopDrag);
    };
  }, [isDragging, dragStart]);

  // --- Bot Logic Handlers ---
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  const handleSendMessage = (text = input) => {
    if (!text.trim() || !botEngine) return;
    setMessages(prev => [...prev, { type: 'user', content: text, timestamp: Date.now() }]);
    setInput('');
    setIsTyping(true);
    setTimeout(() => {
      const response = botEngine.getResponse(text);
      setMessages(prev => [...prev, { type: 'bot', content: response.text, options: response.options, timestamp: Date.now() }]);
      setIsTyping(false);
      setMetrics(botEngine.getMetrics());
      if (!isOpen) setUnreadCount(prev => prev + 1);
    }, 500);
  };

  const toggleChat = () => {
    if (!hasMoved) setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Centered Chat Window - Responsive Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-[95%] sm:max-w-[480px] h-[85vh] sm:h-[650px] bg-gray-900 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden border border-gray-700 animate-centerScale">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-inner">🤖</div>
                <div>
                  <h2 className="text-white font-black text-lg tracking-tight">EonBot</h2>
                  <p className="text-blue-100 text-[10px] uppercase font-bold tracking-widest">Architect Core</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowMetrics(!showMetrics)} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all">📊</button>
                <button onClick={() => setIsOpen(false)} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all">✕</button>
              </div>
            </div>

            {/* Metrics */}
            {showMetrics && metrics && (
              <div className="bg-gray-800 p-3 border-b border-gray-700 animate-slideDown">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: metrics.knowledgeNodes, lab: 'Topics', col: 'text-blue-400' },
                    { val: metrics.totalKeywords, lab: 'Keys', col: 'text-purple-400' },
                    { val: metrics.trieNodes, lab: 'Trie Nodes', col: 'text-green-400' }
                  ].map((item, i) => (
                    <div key={i} className="bg-gray-900 rounded-xl p-2 text-center border border-gray-700">
                      <div className={`${item.col} font-black text-base`}>{item.val}</div>
                      <div className="text-gray-500 text-[9px] uppercase font-bold">{item.lab}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-900 custom-scrollbar">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-fadeUp`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md ${msg.type === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-100 border border-gray-700 rounded-bl-none'}`}>
                    <div className="text-sm leading-relaxed"><SimpleMarkdown content={msg.content} /></div>
                    {msg.options && msg.options.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {msg.options.map((opt, i) => (
                          <button key={i} onClick={() => handleSendMessage(opt)} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-[10px] font-bold transition-all active:scale-95">{opt}</button>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 text-[9px] opacity-40 font-mono">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-gray-800 rounded-2xl rounded-bl-none px-4 py-3 flex gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-800 p-4 bg-gray-800/50 backdrop-blur-md shrink-0">
              <div className="flex gap-2">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Query DSA Architect..." className="flex-1 bg-gray-900 text-white rounded-2xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-blue-500 transition-all" />
                <button onClick={() => handleSendMessage()} disabled={!input.trim()} className="w-12 h-12 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-2xl flex items-center justify-center font-bold transition-all shadow-lg active:scale-90">→</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floatable Bubble (Disappears when window open) */}
      {!isOpen && (
        <>
          <button
            ref={bubbleRef}
            onMouseDown={startDrag}
            onTouchStart={startDrag}
            onClick={toggleChat}
            style={{ left: `${position.x}px`, top: `${position.y}px`, cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
            className="fixed z-[110] w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-[0_10px_30px_rgba(37,99,235,0.4)] flex items-center justify-center text-2xl sm:text-3xl hover:scale-110 active:scale-90 transition-transform duration-200 group"
          >
            <span className="group-hover:scale-125 transition-transform">🤖</span>
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-lg flex items-center justify-center shadow-lg border-2 border-gray-900 animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          <div 
            className="fixed z-[105] w-12 h-12 sm:w-14 sm:h-14 pointer-events-none transition-none"
            style={{ left: `${position.x}px`, top: `${position.y}px` }}
          >
            <div className="absolute inset-0 bg-blue-500 rounded-2xl animate-ping opacity-20"></div>
          </div>
        </>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
        
        @keyframes centerScale {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .animate-centerScale { animation: centerScale 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slideDown { animation: slideDown 0.3s ease-out forwards; }
        .animate-fadeUp { animation: fadeUp 0.3s ease-out forwards; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </>
  );
}

function SimpleMarkdown({ content }) {
  const formatted = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/• /g, '<br />• ')
    .replace(/\n/g, '<br />');
  return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
}