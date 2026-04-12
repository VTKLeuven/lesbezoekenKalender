import React, { useState } from 'react';
import { X, UserPlus, CheckCircle } from 'lucide-react';

export default function CreateUserModal({ onClose, organisations = [] }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [allowedHosts, setAllowedHosts] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const remaining = organisations.filter(o => !allowedHosts.includes(o));

  function addHost(org) {
    if (org) setAllowedHosts(prev => [...prev, org]);
  }

  function removeHost(host) {
    setAllowedHosts(prev => prev.filter(h => h !== host));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const token = sessionStorage.getItem('authToken');
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          password,
          allowedHosts: allowedHosts.length > 0 ? allowedHosts : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create user');
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <ModalShell onClose={onClose}>
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-emerald-500" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">User created</h3>
          <p className="text-sm text-slate-500 mb-5">
            <strong className="text-slate-700">{username}</strong> has been added successfully.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #4338ca, #3b82f6)', boxShadow: '0 4px 12px rgba(67,56,202,0.3)' }}
          >
            Done
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} title="Create user">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-300
              focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-slate-50 hover:bg-white"
            placeholder="Enter username"
            required
            autoFocus
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-300
              focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-slate-50 hover:bg-white"
            placeholder="Enter password"
            required
          />
        </div>

        {/* Allowed organisations */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Allowed organisations
            <span className="ml-1.5 normal-case font-normal text-slate-400">(leave empty for all)</span>
          </label>
          <select
            value=""
            onChange={e => addHost(e.target.value)}
            disabled={remaining.length === 0}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-600
              focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all
              bg-slate-50 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {remaining.length === 0 ? 'All organisations added' : 'Select an organisation…'}
            </option>
            {remaining.map(org => (
              <option key={org} value={org}>{org}</option>
            ))}
          </select>

          {allowedHosts.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {allowedHosts.map(host => (
                <span
                  key={host}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd' }}
                >
                  {host}
                  <button
                    type="button"
                    onClick={() => removeHost(host)}
                    className="hover:opacity-70 transition-opacity ml-0.5"
                    aria-label={`Remove ${host}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl px-3.5 py-3 text-sm"
            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 mt-1"
          style={{ background: 'linear-gradient(135deg, #4338ca, #3b82f6)', boxShadow: '0 4px 12px rgba(67,56,202,0.3)' }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Creating…
            </span>
          ) : 'Create user'}
        </button>
      </form>
    </ModalShell>
  );
}

function ModalShell({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.05)' }}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-indigo-600" />
              </div>
              <h2 className="text-base font-semibold text-slate-800">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
