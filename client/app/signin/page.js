"use client";

import { API_URL } from '@/utils/api';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, X, User, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: "", message: "", visible: false });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const showAlert = (type, message) => {
    setAlert({ type, message, visible: true });
    setTimeout(() => setAlert({ ...alert, visible: false }), 4000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use your API_URL config here
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // 1. Store the Key (Token) and ID Card (User Data)
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user)); 

      // 2. Show Success Alert
      showAlert("success", "Login successful! Redirecting...");
      
      // 3. Redirect to the Protected Dashboard
      // We wait 2 second so the user sees the green success message
      setTimeout(() => {
        router.push("/chat"); 
      }, 2000);

    } catch (err) {
      showAlert("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1d1d1d] to-[#0f1a1a] px-4">
      {/* Alert */}
      {alert.visible && (
        <div className={`fixed top-6 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-4 animate-slide-down ${alert.type === "error" ? "bg-red-600" : "bg-green-600"} text-white`}>
          <span>{alert.message}</span>
        </div>
      )}

      <div className="w-full max-w-md bg-[#273b40]/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-[#208c8c] flex flex-col gap-8 animate-fade-in">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[#cae9ea] mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to continue to EonChat</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          {/* Username Input */}
          <div className="relative">
            <User className="absolute left-3 top-3.5 text-gray-400" size={20} />
            <input
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              required
              className="w-full pl-10 p-3 rounded-lg bg-[#1d1d1d]/80 text-white outline-none border border-[#3c4748] focus:border-[#208c8c] transition"
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 text-gray-400" size={20} />
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full pl-10 p-3 rounded-lg bg-[#1d1d1d]/80 text-white outline-none border border-[#3c4748] focus:border-[#208c8c] transition"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400 hover:text-white">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="text-right">
            <a href="/forgot-password" className="text-sm text-[#208c8c] hover:text-[#cae9ea] hover:underline">Forgot Password?</a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#208c8c] hover:bg-[#1aa3a3] text-black font-bold text-lg shadow-lg transition-transform active:scale-95"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-gray-400">
          Don't have an account? <a href="/signup" className="text-[#cae9ea] hover:underline">Sign up</a>
        </p>
      </div>
      
      {/* Reuse your animations from signup here in globals.css or style tag */}
    </div>
  );
}