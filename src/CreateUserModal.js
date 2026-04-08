import React, { useState } from 'react';
import { X } from 'lucide-react';

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
        <p className="text-green-600 font-medium text-center py-4">
          User <strong>{username}</strong> created successfully.
        </p>
        <button
          onClick={onClose}
          className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Close
        </button>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} title="Create user">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Allowed organisations
            <span className="ml-1 font-normal text-gray-400">(leave empty for all)</span>
          </label>
          <select
            value=""
            onChange={e => addHost(e.target.value)}
            disabled={remaining.length === 0}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">
              {remaining.length === 0 ? 'All organisations added' : 'Select an organisation…'}
            </option>
            {remaining.map(org => (
              <option key={org} value={org}>{org}</option>
            ))}
          </select>
          {allowedHosts.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {allowedHosts.map(host => (
                <span
                  key={host}
                  className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                >
                  {host}
                  <button
                    type="button"
                    onClick={() => removeHost(host)}
                    className="hover:text-blue-600"
                    aria-label={`Remove ${host}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create user'}
        </button>
      </form>
    </ModalShell>
  );
}

function ModalShell({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        {title && <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
