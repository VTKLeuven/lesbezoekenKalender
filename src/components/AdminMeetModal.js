import React, { useState } from 'react';
import { X, CalendarPlus, CheckCircle, Pencil } from 'lucide-react';

function getAuthHeader() {
  const token = sessionStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Modal for admins to add a new meet or propose edits to an existing one.
 *
 * Add mode  — writes a new row to the sheet with a yellow background (proposition).
 *             The sheet owner decides whether to keep, edit, or delete it.
 *
 * Edit mode — sends only changed fields as cell notes to the sheet so the owner
 *             can review proposed values. Cell values in the sheet are NOT changed.
 *             The calendar shows proposed values immediately (optimistic update).
 *
 * Props:
 *   mode    - 'add' | 'edit'
 *   meet    - (edit only) existing Meet object
 *   onClose - called when the modal should close
 *   onSaved - called(patch, meetId) after a successful save
 */
export default function AdminMeetModal({ mode = 'add', meet = null, onClose, onSaved }) {
  const isEdit = mode === 'edit';

  const [organisatie, setOrganisatie] = useState(meet?.title ?? '');
  const [klas, setKlas] = useState(meet?.klas ?? '');
  const [lesgever, setLesgever] = useState(meet?.lesgever ?? '');
  const [dateStr, setDateStr] = useState(meet?.date ? toDatetimeLocal(meet.date) : '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit) {
        // Only send fields that actually changed
        const patch = {};
        if (dateStr && dateStr !== toDatetimeLocal(meet.date)) {
          patch.Timestamp = dateStr;
        }
        if (organisatie !== meet.title) patch.Organisatie = organisatie;
        if (klas !== (meet.klas ?? '')) patch.Klas = klas;
        if (lesgever !== (meet.lesgever ?? '')) patch.Lesgever = lesgever;

        if (Object.keys(patch).length === 0) {
          onClose();
          return;
        }

        const meetId = String(meet.sheetRow);
        const res = await fetch(`/api/meets/${meetId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to propose edit');
        }
        onSaved(patch, meetId);
        setSuccess(true);
      } else {
        if (!organisatie) throw new Error('Organisation is required');
        if (!dateStr) throw new Error('Date and time are required');
        const res = await fetch('/api/meets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({
            Timestamp: dateStr,
            Organisatie: organisatie,
            Klas: klas,
            Lesgever: lesgever,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to add meet');
        }
        const data = await res.json();
        onSaved({ Timestamp: dateStr, Organisatie: organisatie, Klas: klas, Lesgever: lesgever }, data.sheetRow);
        setSuccess(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const title = isEdit ? 'Propose edit' : 'Add meet';
  const Icon = isEdit ? Pencil : CalendarPlus;

  if (success) {
    return (
      <ModalShell onClose={onClose} title={title} Icon={Icon}>
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-emerald-500" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">
            {isEdit ? 'Edit proposed' : 'Meet added'}
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            {isEdit
              ? 'Proposed values were written as cell notes in the sheet. The sheet owner can review and decide.'
              : 'A new row was added to the sheet with a yellow background. The sheet owner can review and decide.'}
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
    <ModalShell onClose={onClose} title={title} Icon={Icon}>
      {isEdit && (
        <p className="text-xs text-slate-400 mb-4 -mt-1">
          Changed fields will be written as notes on the sheet cells. Cell values stay unchanged until the sheet owner accepts the proposal.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Organisation" required={!isEdit}>
          <input
            type="text"
            value={organisatie}
            onChange={e => setOrganisatie(e.target.value)}
            className={inputCls}
            placeholder="Organisation name"
            required={!isEdit}
          />
        </Field>

        <Field label="Date & time" required={!isEdit}>
          <input
            type="datetime-local"
            value={dateStr}
            onChange={e => setDateStr(e.target.value)}
            className={inputCls}
            required={!isEdit}
          />
        </Field>

        <Field label="Class">
          <input
            type="text"
            value={klas}
            onChange={e => setKlas(e.target.value)}
            className={inputCls}
            placeholder="e.g. 3A"
          />
        </Field>

        <Field label="Professor">
          <input
            type="text"
            value={lesgever}
            onChange={e => setLesgever(e.target.value)}
            className={inputCls}
            placeholder="Professor name"
          />
        </Field>

        {error && (
          <div className="rounded-xl px-3.5 py-3 text-sm"
            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #4338ca, #3b82f6)', boxShadow: '0 4px 12px rgba(67,56,202,0.3)' }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Saving…
            </span>
          ) : isEdit ? 'Propose changes' : 'Add meet'}
        </button>
      </form>
    </ModalShell>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = `w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800
  placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30
  focus:border-indigo-400 transition-all bg-slate-50 hover:bg-white`;

function ModalShell({ onClose, title, Icon, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Icon className="w-4 h-4 text-indigo-600" />
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
        <div className="px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function toDatetimeLocal(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
