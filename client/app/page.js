"use client";

import Link from "next/link";
import { MessageSquare, Shield, Zap, Users, ArrowRight, Github } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0f1a1a] text-white selection:bg-[#208c8c] selection:text-black">
      
      {/* --- Navbar --- */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-[#0f1a1a]/70 border-b border-[#208c8c]/20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-[#208c8c]" size={32} />
            <span className="text-2xl font-bold tracking-tighter text-[#cae9ea]">EonChat</span>
          </div>
          
          <div className="flex items-center gap-6">
            {/* FIXED: Points to /signin now */}
            <Link href="/signin" className="hidden md:block text-gray-400 hover:text-white transition">
              Sign In
            </Link>
            <Link 
              href="/signup" 
              className="px-6 py-2 rounded-full bg-[#208c8c] hover:bg-[#1aa3a3] text-black font-bold transition shadow-[0_0_15px_rgba(32,140,140,0.4)] hover:shadow-[0_0_25px_rgba(32,140,140,0.6)]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center flex flex-col items-center animate-fade-in-up">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1d1d1d] border border-[#208c8c]/30 text-[#208c8c] text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#208c8c] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#208c8c]"></span>
            </span>
            Live Beta: Experience Real-time Messaging
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Connect Beyond <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#208c8c] to-[#cae9ea]">
              Space & Time
            </span>
          </h1>

          <p className="max-w-2xl text-lg md:text-xl text-gray-400 mb-10 leading-relaxed">
            A next-generation social platform built with advanced Data Structures for lightning-fast search, secure connections, and real-time interaction.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            {/* FIXED: Points to /signin if they want to start there, or signup */}
            <Link 
              href="/signup" 
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#208c8c] hover:bg-[#1aa3a3] text-black text-lg font-bold transition transform hover:scale-105"
            >
              Start Chatting Now <ArrowRight size={20} />
            </Link>
            <Link 
              href="https://github.com" 
              target="_blank"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#1d1d1d] hover:bg-[#2a2a2a] border border-[#333] hover:border-white/20 text-white text-lg transition"
            >
              <Github size={20} /> View Project Code
            </Link>
          </div>
        </div>
      </main>

      {/* --- Features Grid --- */}
      <section className="py-20 bg-[#1d1d1d]/50 border-t border-[#333]">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16 text-[#cae9ea]">Engineered for Performance</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-[#0f1a1a] border border-[#333] hover:border-[#208c8c]/50 transition group">
              <div className="w-12 h-12 bg-[#208c8c]/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <Zap className="text-[#208c8c]" size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Instant Search</h3>
              <p className="text-gray-400 leading-relaxed">
                Powered by a <span className="text-[#208c8c]">Trie Data Structure</span> (Prefix Tree) to provide O(L) time complexity for user lookups.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#0f1a1a] border border-[#333] hover:border-[#208c8c]/50 transition group">
              <div className="w-12 h-12 bg-[#208c8c]/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <Users className="text-[#208c8c]" size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Social Graph</h3>
              <p className="text-gray-400 leading-relaxed">
                Utilizing <span className="text-[#208c8c]">Graph Theory</span> to efficiently map friendships and find connections.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#0f1a1a] border border-[#333] hover:border-[#208c8c]/50 transition group">
              <div className="w-12 h-12 bg-[#208c8c]/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <Shield className="text-[#208c8c]" size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Secure & Scalable</h3>
              <p className="text-gray-400 leading-relaxed">
                Protected by Bcrypt Hashing, JWT Authentication, and MongoDB indexing.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-gray-500 text-sm border-t border-[#333]">
        <p>© 2025 EonChat Project. Built for DSA Course.</p>
      </footer>

      <style jsx>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}