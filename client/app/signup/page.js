"use client";

import { API_URL } from '@/utils/api';
import { useState } from "react";
import { Eye, EyeOff, X, Mail, CheckCircle, ArrowRight } from "lucide-react";

export default function SignupPage() {
  const [form, setForm] = useState({ username: "", password: "", email: "" });
  const [otp, setOtp] = useState(""); // State for OTP input
  
  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: "", message: "", visible: false });
  
  // Flow Control States
  const [step, setStep] = useState(1); // 1: Details, 2: OTP Verification
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  // Validation
  const validateUsername = (u) => /^(?=.*\d)[A-Za-z\d]{4,}$/.test(u);
  const validatePassword = (p) => p.length >= 4;
  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const showAlert = (type, message) => {
    setAlert({ type, message, visible: true });
    setTimeout(() => setAlert({ ...alert, visible: false }), 5000);
  };
  const hideAlert = () => setAlert({ type: "", message: "", visible: false });

  // --- Step 1: Send OTP (If email is provided) ---
  const handleInitiateSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!validateUsername(form.username)) {
      showAlert("error", "Username must be 4+ chars, alphanumeric, with a number.");
      setLoading(false);
      return;
    }
    if (!validatePassword(form.password)) {
      showAlert("error", "Password must be at least 4 characters.");
      setLoading(false);
      return;
    }

    // Logic: If NO email provided -> Direct Signup
    if (!form.email) {
      await finalizeSignup();
      return;
    }

    // Logic: If Email provided -> Send OTP
    if (!validateEmail(form.email)) {
        showAlert("error", "Please enter a valid email address.");
        setLoading(false);
        return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      showAlert("success", "OTP sent to your email!");
      setStep(2); // Move to OTP screen
    } catch (err) {
      showAlert("error", err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: Verify OTP ---
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setIsEmailVerified(true);
      showAlert("success", "Email verified! Creating account...");
      await finalizeSignup(); // Automatically create account after verification
    } catch (err) {
      showAlert("error", err.message || "Invalid OTP");
      setLoading(false);
    }
  };

  // --- Final Step: Create User in DB ---
  const finalizeSignup = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        // If it failed, but we verified email, we might want to stay on step 2 or reset
        // For simplicity, staying on current view but showing error
        throw new Error(data.error);
      } 
      
      showAlert("success", "Account created successfully!");
      // Redirect or clear form
      setForm({ username: "", password: "", email: "" });
      setOtp("");
      setStep(1);
      
    } catch (err) {
      showAlert("error", err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1d1d1d] to-[#0f1a1a] px-4">
      {/* Alert Component */}
      {alert.visible && (
        <div className="fixed top-6 z-50 animate-slide-down">
          <div className={`flex items-center justify-between px-6 py-4 rounded-lg shadow-lg ${alert.type === "error" ? "bg-red-600" : "bg-green-600"} text-white`}>
            <span>{alert.message}</span>
            <button onClick={hideAlert} className="ml-4 hover:opacity-80"><X size={20} /></button>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-md bg-[#273b40]/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-[#208c8c] flex flex-col gap-6 animate-fade-in">
        <h1 className="text-3xl font-bold text-center text-[#cae9ea] mb-2 animate-pulse">
          EonChat
        </h1>

        {/* STEP 1: Details Input */}
        {step === 1 && (
          <form onSubmit={handleInitiateSignup} className="flex flex-col gap-5">
            <input
              name="username"
              placeholder="Username (e.g. user1)"
              value={form.username}
              onChange={handleChange}
              required
              className={`w-full p-3 rounded-lg bg-[#1d1d1d]/90 text-white outline-none border transition focus:ring-2 focus:ring-[#208c8c] ${form.username && !validateUsername(form.username) ? "border-red-500" : "border-[#3c4748]"}`}
            />

            <input
                name="email"
                type="email"
                placeholder="Recovery Email (Optional)"
                value={form.email}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-[#1d1d1d]/90 text-white outline-none border border-[#3c4748] transition focus:ring-2 focus:ring-[#208c8c]"
            />

            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
                className={`w-full p-3 rounded-lg bg-[#1d1d1d]/90 text-white outline-none border transition focus:ring-2 focus:ring-[#208c8c] ${form.password && !validatePassword(form.password) ? "border-red-500" : "border-[#3c4748]"}`}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400 hover:text-[#cae9ea]">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#208c8c] hover:bg-[#1aa3a3] text-black font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? "Processing..." : form.email ? "Verify Email & Signup" : "Create Account"}
              {!loading && form.email && <ArrowRight size={20}/>}
            </button>
          </form>
        )}

        {/* STEP 2: OTP Entry */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-6 animate-fade-in">
            <div className="text-center text-[#cae9ea]">
              <Mail className="mx-auto mb-2" size={40} />
              <p>We sent a code to <br/><span className="text-white font-mono">{form.email}</span></p>
            </div>

            <input
              name="otp"
              placeholder="Enter 6-digit OTP"
              value={otp}
              maxLength={6}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))} // Numbers only
              className="w-full p-4 text-center text-2xl tracking-widest rounded-lg bg-[#1d1d1d]/90 text-white outline-none border border-[#208c8c] focus:ring-2 focus:ring-[#cae9ea]"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#208c8c] hover:bg-[#1aa3a3] text-black font-bold text-lg transition-all shadow-lg"
            >
              {loading ? "Verifying..." : "Confirm Code"}
            </button>

            <button 
                type="button" 
                onClick={() => setStep(1)}
                className="text-sm text-gray-400 hover:text-white underline text-center"
            >
                Wrong email? Go back
            </button>
          </form>
        )}

        <p className="mt-2 text-center text-sm text-gray-300">
          Already have an account?{" "}
          <a href="/signin" className="text-[#cae9ea] hover:underline hover:text-[#1aa3a3] transition">
            SignIn
          </a>
        </p>
      </div>

      <style jsx>{`
        @keyframes slide-down {
            0% { opacity: 0; transform: translateY(-2rem); }
            100% { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down { animation: slide-down 0.5s ease-out forwards; }
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
}