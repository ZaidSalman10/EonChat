"use client";

import { API_URL } from '@/utils/api';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Key, Lock, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Email, 2: Reset
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Step 1: Request OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStep(2);
      setMessage({ type: "success", text: "OTP sent to your email!" });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password
  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: "success", text: "Password reset successful! Redirecting..." });
      setTimeout(() => router.push("/signin"), 2000);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1d1d1d] to-[#0f1a1a] px-4">
      <div className="w-full max-w-md bg-[#273b40]/90 backdrop-blur-md p-8 rounded-3xl border border-[#208c8c] animate-fade-in relative">
        
        <button onClick={() => router.push('/login')} className="absolute top-6 left-6 text-gray-400 hover:text-white">
          <ArrowLeft size={24} />
        </button>

        <h1 className="text-2xl font-bold text-center text-[#cae9ea] mb-6">
          {step === 1 ? "Reset Password" : "Set New Password"}
        </h1>

        {message && (
          <div className={`mb-4 p-3 rounded text-center text-sm ${message.type === 'error' ? 'bg-red-500/20 text-red-200' : 'bg-green-500/20 text-green-200'}`}>
            {message.text}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-gray-400" size={20} />
              <input
                type="email"
                placeholder="Enter your recovery email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 p-3 rounded-lg bg-[#1d1d1d]/80 text-white outline-none border border-[#3c4748] focus:border-[#208c8c]"
              />
            </div>
            <button disabled={loading} className="w-full py-3 rounded-xl bg-[#208c8c] text-black font-bold hover:bg-[#1aa3a3] transition">
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
             <div className="relative">
              <Key className="absolute left-3 top-3.5 text-gray-400" size={20} />
              <input
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="w-full pl-10 p-3 rounded-lg bg-[#1d1d1d]/80 text-white outline-none border border-[#3c4748] focus:border-[#208c8c]"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-gray-400" size={20} />
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full pl-10 p-3 rounded-lg bg-[#1d1d1d]/80 text-white outline-none border border-[#3c4748] focus:border-[#208c8c]"
              />
            </div>
            <button disabled={loading} className="w-full py-3 rounded-xl bg-[#208c8c] text-black font-bold hover:bg-[#1aa3a3] transition">
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}