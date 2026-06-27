import React, { useState } from 'react';
import { signInUser, signUpUser, isFirebaseMock } from '../services/firebase';
import { Mail, Lock, LogIn, UserPlus, Cpu, ShieldCheck, Eye, EyeOff, Info } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      let user;
      if (isLogin) {
        user = await signInUser(email, password);
      } else {
        user = await signUpUser(email, password);
      }
      onAuthSuccess(user);
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || 'An error occurred during authentication.';
      if (errMsg.includes('auth/invalid-credential') || errMsg.includes('auth/wrong-password')) {
        errMsg = 'Incorrect email or password.';
      } else if (errMsg.includes('auth/email-already-in-use')) {
        errMsg = 'This email is already registered.';
      } else if (errMsg.includes('auth/weak-password')) {
        errMsg = 'Password should be at least 6 characters.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 overflow-hidden relative font-sans">
      {/* Abstract Tech Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.12),transparent_50%)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(34,211,238,0.08),transparent_50%)] pointer-events-none"></div>
      <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none"></div>

      {/* Main Layout Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 lg:p-8 z-10">
        
        {/* Left Side Panel: Marketing & App Intro */}
        <div className="lg:col-span-6 flex flex-col justify-center space-y-6 text-left pr-0 lg:pr-8 animate-in fade-in slide-in-from-left-8 duration-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/20 text-slate-950">
              <Cpu size={28} className="animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Autonomous Management</span>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                AutoGuard
              </h1>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-xl lg:text-2xl font-bold text-slate-200">
              Enterprise Fleet Monitoring & Predictive Agent Operations
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Unlock intelligent telemetry anomaly analysis, automated customer scheduling agent loops, manufacturing defects feedback pipelines, and zero-trust security protection.
            </p>
          </div>


        </div>

        {/* Right Side Panel: Interactive Glassmorphic Form Card */}
        <div className="lg:col-span-6 flex items-center justify-center animate-in fade-in slide-in-from-right-8 duration-700">
          <div className="w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-2xl relative">
            
            {/* Database indicator badge */}
            <div className="absolute top-4 right-6 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border">
              {isFirebaseMock ? (
                <>
                  <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                  <span className="text-yellow-400 font-mono">Sandbox Mode</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-emerald-400 font-mono">Firebase Online</span>
                </>
              )}
            </div>

            <div className="mb-6 mt-2">
              <h3 className="text-2xl font-bold text-slate-100">
                {isLogin ? 'Welcome Back' : 'Create Admin Account'}
              </h3>
              <p className="text-xs text-slate-400 mt-1.5">
                {isLogin 
                  ? 'Access the autonomous agent fleet coordinator command center.' 
                  : 'Establish credentials to track and manage fleet telemetry.'
                }
              </p>
            </div>

            {/* Sandbox Notice Banner */}
            {isFirebaseMock && (
              <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl p-3 mb-6 flex gap-3 text-xs leading-relaxed">
                <Info size={18} className="shrink-0 mt-0.5 text-blue-400" />
                <div>
                  <span className="font-bold">Sandbox Mode Enabled</span>: You can log in or register with any email/password. No live database config required to preview.
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 mb-5 text-xs font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0"></span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="operator@autoguard.ai"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3.5 text-sm font-bold shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none mt-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : isLogin ? (
                  <>
                    <LogIn size={16} /> Initialize Console Session
                  </>
                ) : (
                  <>
                    <UserPlus size={16} /> Provision Admin Credentials
                  </>
                )}
              </button>
            </form>

            {/* Toggle form link */}
            <div className="mt-6 text-center text-xs">
              <span className="text-slate-500">
                {isLogin ? 'Need to register a new unit?' : 'Already have console credentials?'}
              </span>{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-blue-400 hover:underline font-bold transition ml-1"
              >
                {isLogin ? 'Register New Account' : 'Return to Login'}
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
