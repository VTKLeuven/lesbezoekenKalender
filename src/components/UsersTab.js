import React, { useState, useEffect, useCallback } from 'react';
import { X, UserPlus, Pencil, Trash2, CheckCircle, Shield, User, ChevronDown, ChevronUp } from 'lucide-react';

function getAuthHeader() {
  const token = sessionStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...getAuthHeader(), ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
  return data;
}

// ── Edit user modal ──────────────────────────────────────────────────────────

function EditUserModal({ user, organisations, onClose, onSaved }) {
  const [username, setUsername] = useState(user.username);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user.role);
  const [allowedHosts, setAllowedHosts] = useState(user.allowedHosts ?? []);
  const [allOrgs, setAllOrgs] = useState(user.allowedHosts == null);
  const [error, setError] = useState('');
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
      const body = { username, role, allowedHosts: allOrgs ? null : allowedHosts };
      if (password) body.password = password;
      await apiFetch(`/api/users/${encodeURIComponent(user.username)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Pencil className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-base font-semibold text-slate-800">Edit user</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-300
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-slate-50 hover:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                New password
                <span className="ml-1.5 normal-case font-normal text-slate-400">(leave blank to keep current)</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-300
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-slate-50 hover:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-600
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-slate-50 hover:bg-white"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Allowed organisations
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allOrgs}
                    onChange={e => setAllOrgs(e.target.checked)}
                    className="accent-indigo-500 w-3.5 h-3.5"
                  />
                  All organisations
                </label>
              </div>

              {!allOrgs && (
                <>
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
                        <span key={host} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd' }}>
                          {host}
                          <button type="button" onClick={() => removeHost(host)}
                            className="hover:opacity-70 transition-opacity ml-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl px-3.5 py-3 text-sm"
                style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                <p className="text-red-600">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 mt-1"
              style={{ background: 'linear-gradient(135deg, #4338ca, #3b82f6)', boxShadow: '0 4px 12px rgba(67,56,202,0.3)' }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Saving…
                </span>
              ) : 'Save changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Add user modal (thin wrapper around the same form) ───────────────────────

function AddUserModal({ organisations, onClose, onSaved }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [allowedHosts, setAllowedHosts] = useState([]);
  const [allOrgs, setAllOrgs] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
      await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
          role,
          allowedHosts: allOrgs || allowedHosts.length === 0 ? null : allowedHosts,
        }),
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <ModalShell onClose={() => { onSaved(); onClose(); }}>
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-emerald-500" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">User created</h3>
          <p className="text-sm text-slate-500 mb-5">
            <strong className="text-slate-700">{username}</strong> has been added successfully.
          </p>
          <button onClick={() => { onSaved(); onClose(); }}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #4338ca, #3b82f6)', boxShadow: '0 4px 12px rgba(67,56,202,0.3)' }}>
            Done
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} title="Add user">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Username</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} required autoFocus
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-300
              focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-slate-50 hover:bg-white"
            placeholder="Enter username" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-300
              focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-slate-50 hover:bg-white"
            placeholder="Enter password" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Role</label>
          <select value={role} onChange={e => setRole(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-600
              focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-slate-50 hover:bg-white">
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Allowed organisations
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
              <input type="checkbox" checked={allOrgs} onChange={e => setAllOrgs(e.target.checked)}
                className="accent-indigo-500 w-3.5 h-3.5" />
              All organisations
            </label>
          </div>

          {!allOrgs && (
            <>
              <select value="" onChange={e => addHost(e.target.value)} disabled={remaining.length === 0}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-600
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all
                  bg-slate-50 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="">
                  {remaining.length === 0 ? 'All organisations added' : 'Select an organisation…'}
                </option>
                {remaining.map(org => <option key={org} value={org}>{org}</option>)}
              </select>

              {allowedHosts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {allowedHosts.map(host => (
                    <span key={host} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd' }}>
                      {host}
                      <button type="button" onClick={() => removeHost(host)} className="hover:opacity-70 transition-opacity ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl px-3.5 py-3 text-sm"
            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 mt-1"
          style={{ background: 'linear-gradient(135deg, #4338ca, #3b82f6)', boxShadow: '0 4px 12px rgba(67,56,202,0.3)' }}>
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

// ── Delete confirmation ──────────────────────────────────────────────────────

function DeleteConfirm({ username, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-xs overflow-hidden"
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
        <div className="px-6 py-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Delete user</h3>
          <p className="text-sm text-slate-500 mb-5">
            Remove <strong className="text-slate-700">{username}</strong>? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={onCancel} disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all disabled:opacity-50">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}>
              {loading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── User row ─────────────────────────────────────────────────────────────────

function UserRow({ user, organisations, currentUsername, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isSelf = user.username === currentUsername;
  const hosts = user.allowedHosts ?? null;

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      await apiFetch(`/api/users/${encodeURIComponent(user.username)}`, { method: 'DELETE' });
      onUpdated();
    } catch (err) {
      console.error('Delete failed:', err.message);
    } finally {
      setDeleteLoading(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      {editing && (
        <EditUserModal
          user={user}
          organisations={organisations}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); onUpdated(); }}
        />
      )}
      {confirmDelete && (
        <DeleteConfirm
          username={user.username}
          loading={deleteLoading}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      <div className="px-5 py-4 flex flex-col gap-2 hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${user.role === 'admin' ? 'bg-indigo-100' : 'bg-slate-100'}`}>
            {user.role === 'admin'
              ? <Shield className="w-4 h-4 text-indigo-600" />
              : <User className="w-4 h-4 text-slate-500" />
            }
          </div>

          {/* Name + role */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-800 truncate">{user.username}</span>
              {isSelf && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>you</span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                user.role === 'admin'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {user.role}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {hosts === null
                ? 'Access: all organisations'
                : hosts.length === 0
                  ? 'Access: none'
                  : `Access: ${hosts.length} organisation${hosts.length !== 1 ? 's' : ''}`
              }
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {hosts !== null && hosts.length > 0 && (
              <button onClick={() => setExpanded(p => !p)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                title="Show allowed organisations">
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
            <button onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
              title="Edit user">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setConfirmDelete(true)} disabled={isSelf}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title={isSelf ? 'Cannot delete your own account' : 'Delete user'}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded org tags */}
        {expanded && hosts !== null && hosts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-12">
            {hosts.map(h => (
              <span key={h} className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd' }}>
                {h}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Main UsersTab ─────────────────────────────────────────────────────────────

export default function UsersTab({ organisations = [], currentUsername }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  return (
    <div className="p-5">
      {showAdd && (
        <AddUserModal
          organisations={organisations}
          onClose={() => setShowAdd(false)}
          onSaved={loadUsers}
        />
      )}

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-800">User management</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {loading ? 'Loading…' : `${users.length} user${users.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #4338ca, #3b82f6)', boxShadow: '0 4px 12px rgba(67,56,202,0.3)' }}>
            <UserPlus className="w-4 h-4" />
            Add user
          </button>
        </div>

        {/* Content */}
        {error && (
          <div className="rounded-xl px-4 py-3 text-sm mb-4"
            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-sm">Loading users…</span>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">No users found.</div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}>
            {users.map(u => (
              <UserRow
                key={u.username}
                user={u}
                organisations={organisations}
                currentUsername={currentUsername}
                onUpdated={loadUsers}
              />
            ))}
          </div>
        )}
      </div>
    </div>
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
            <button onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
