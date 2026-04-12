import React, { useState } from 'react';
import { Calendar, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #1d4ed8 70%, #0c4a6e 100%)' }}>
      {/* Background decorative circles */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #a5b4fc, transparent)', transform: 'translate(-30%, -30%)' }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #7dd3fc, transparent)', transform: 'translate(30%, 30%)' }} />
      <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full opacity-5"
        style={{ background: 'radial-gradient(circle, #c4b5fd, transparent)' }} />

      {/* Card */}
      <div className="relative w-full max-w-sm">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8"
          style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)' }}>

          {/* Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1))', border: '1px solid rgba(255,255,255,0.3)' }}>
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Lesbezoeken</h1>
            <p className="text-indigo-200 text-sm mt-1.5 font-medium">Classroom Visit Planner</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-white placeholder-white/40 text-sm font-medium
                  focus:outline-none focus:ring-2 focus:ring-white/40 transition-all"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
                placeholder="Enter your username"
                required
                autoFocus
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 pr-11 text-white placeholder-white/40 text-sm font-medium
                    focus:outline-none focus:ring-2 focus:ring-white/40 transition-all"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3"
                style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 mt-2"
              style={{
                background: loading ? 'rgba(255,255,255,0.8)' : 'white',
                color: '#3730a3',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
