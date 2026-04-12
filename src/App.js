import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar, ClipboardList, X, Check, Filter, UserPlus, LogOut, GraduationCap, User, CalendarPlus, Pencil } from "lucide-react";
import { colorClasses } from "./colorClasses.js";
import { UseCheckForUpdates } from "./hooks.js";
import { getWeekStartMonday, fulfillsFilter } from "./helper.js";
import { possibleFields } from "./meet.js";
import { callWebApp } from "./fetch-main";
import { useAuth } from "./AuthContext";
import CreateUserModal from "./CreateUserModal";
import AdminMeetModal from "./AdminMeetModal";

const HOUR_HEIGHT = 56;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getAuthHeader() {
  const token = sessionStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Modal shown when admin clicks a pending meet in approval mode
function ApprovalModal({ event, onApprove, onReject, onClose, loading }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-amber-600" />
            </div>
            <h2 className="text-base font-semibold text-slate-800">Review meet request</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Details */}
        <div className="px-6 py-5 space-y-3">
          {[
            { label: 'Organisation', value: event.title },
            { label: 'Date', value: event.date.toLocaleDateString() },
            { label: 'Time', value: event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
              <span className="text-sm font-medium text-slate-700">{value}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onApprove} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #059669, #047857)', color: 'white', boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }}>
            <Check className="w-4 h-4" /> Approve
          </button>
          <button onClick={onReject} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: 'white', boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}>
            <X className="w-4 h-4" /> Reject
          </button>
        </div>
        {loading && <p className="text-xs text-slate-400 text-center pb-4">Saving…</p>}
      </div>
    </div>
  );
}

// Modal shown when any user clicks an event to see full details
function EventDetailModal({ event, colors, onClose, isAdmin, onEdit }) {
  const statusLabel = event.status === 'pending' ? 'Pending' : event.status === 'rejected' ? 'Rejected' : 'Approved';
  const statusStyle = event.status === 'pending'
    ? { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }
    : event.status === 'rejected'
    ? { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }
    : { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' };

  const rows = [
    { label: 'Organisation', value: event.title, icon: null },
    event.klas ? { label: 'Class', value: event.klas, icon: <GraduationCap className="w-3.5 h-3.5" /> } : null,
    event.lesgever ? { label: 'Professor', value: event.lesgever, icon: <User className="w-3.5 h-3.5" /> } : null,
    { label: 'Date', value: event.date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), icon: null },
    { label: 'Time', value: event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), icon: null },
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}
        onClick={e => e.stopPropagation()}>
        {/* Colour header strip */}
        <div className={`px-6 py-4 ${colors.bg} ${colors.border} border-b-2`}>
          <div className="flex items-center justify-between">
            <div className={`text-base font-bold ${colors.text}`}>{event.title}</div>
            <div className="flex items-center gap-1">
              {isAdmin && (
                <button onClick={onEdit} className="text-slate-500 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-white/40" title="Edit meet">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-white/40">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {event.klas && (
            <div className={`mt-1 text-xs font-semibold ${colors.text} opacity-80`}>{event.klas}</div>
          )}
        </div>

        {/* Details */}
        <div className="px-6 py-4 space-y-2.5">
          {rows.map(({ label, value, icon }) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 gap-4">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide flex-shrink-0">
                {icon}{label}
              </span>
              <span className="text-sm font-medium text-slate-700 text-right">{value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between py-1.5 gap-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={statusStyle}>{statusLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const App = ({ initialEvents = [], organisationCM = Map() }) => {
  const { user, logout } = useAuth();
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [events, setEvents] = useState(initialEvents);
  const [filter, setFilter] = useState({ field: '', value: '' });
  const [displayFilter, setDisplayFilter] = useState({ field: '', value: '' });
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [view, setView] = useState("month");
  const scrollRef = useRef(null);

  const [approvalMode, setApprovalMode] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [showAddMeet, setShowAddMeet] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const isAdmin = user?.role === 'admin';

  const pendingCount = useMemo(
    () => events.filter(e => e.status === 'pending').length,
    [events]
  );

  const nextPeriod = () => {
    if (view === "month") nextMonth();
    else if (view === "week") nextWeek();
    else nextDay();
  };

  const prevPeriod = () => {
    if (view === "month") prevMonth();
    else if (view === "week") prevWeek();
    else prevDay();
  };

  useEffect(() => {
    const _intervalId = setInterval(() => {
      setRefreshFlag(prev => !prev);
    }, 120000);
    return () => clearInterval(_intervalId);
  }, []);

  useEffect(() => {
    if ((view === "week" || view === "day") && scrollRef.current) {
      scrollRef.current.scrollTop = 7 * HOUR_HEIGHT;
    }
  }, [view]);

  function handleNewEvents(newEvents) {
    setEvents(Array.isArray(newEvents) ? newEvents : []);
  }

  // For new meets: the row was written to the sheet, so refresh the full data.
  // For edits: cell values didn't change (only notes), so update locally immediately.
  const handleMeetSaved = useCallback(async (patch, meetId, isNew) => {
    if (isNew) {
      try {
        const [newEvents] = await callWebApp();
        setEvents(newEvents);
      } catch (err) {
        console.error('Failed to refresh after adding meet:', err);
      }
      return;
    }
    // Optimistic update for edits
    setEvents(prev => prev.map(e => {
      if (String(e.sheetRow) !== String(meetId)) return e;
      return {
        ...e,
        ...(patch.Timestamp ? { date: new Date(patch.Timestamp) } : {}),
        ...(patch.Organisatie ? { title: patch.Organisatie, host: patch.Organisatie } : {}),
        ...('Klas' in patch ? { klas: patch.Klas || null } : {}),
        ...('Lesgever' in patch ? { lesgever: patch.Lesgever || null } : {}),
      };
    }));
  }, []);

  const handleApprovalAction = useCallback(async (action) => {
    if (!approvalTarget) return;
    setApprovalLoading(true);
    try {
      const res = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ sheetRow: approvalTarget.sheetRow, action }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      setEvents(prev => prev.map(e =>
        e.sheetRow === approvalTarget.sheetRow ? { ...e, status: newStatus } : e
      ));
      setApprovalTarget(null);
    } catch (err) {
      console.error('Approval action failed:', err);
    } finally {
      setApprovalLoading(false);
    }
  }, [approvalTarget]);

  const baseEvents = useMemo(() => {
    let result = events;
    if (!isAdmin && user?.allowedHosts?.length) {
      result = result.filter(e => user.allowedHosts.includes(e.host));
    }
    if (isAdmin) {
      if (approvalMode) {
        result = result.filter(e =>
          e.status === 'approved' ||
          e.status === 'pending' ||
          (showRejected && e.status === 'rejected')
        );
      } else {
        result = result.filter(e =>
          e.status === 'approved' ||
          (showRejected && e.status === 'rejected')
        );
      }
    } else {
      result = result.filter(e => e.status === 'approved');
    }
    return result;
  }, [events, user, isAdmin, approvalMode, showRejected]);

  const filteredEvents = useMemo(() => {
    if (!filter.field) return baseEvents;
    return baseEvents.filter(event => fulfillsFilter(filter, event));
  }, [baseEvents, filter]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const event of filteredEvents) {
      const d = event.date;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(event);
    }
    for (const dayEvents of map.values()) {
      dayEvents.sort((a, b) => a.date - b.date);
    }
    return map;
  }, [filteredEvents]);

  const fieldValues = useMemo(() => {
    if (!displayFilter.field) return [];
    const vals = new Set(baseEvents.map(e => e[displayFilter.field]).filter(Boolean));
    return [...vals].sort();
  }, [baseEvents, displayFilter.field]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const daysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  const prevWeek = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7));
  const nextWeek = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7));
  const prevDay = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1));
  const nextDay = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1));

  const getEventsForDay = (date) => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return eventsByDay.get(key) || [];
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  function eventStatusClasses(event) {
    if (event.status === 'pending') return 'opacity-60 ring-1 ring-amber-400 ring-inset cursor-pointer';
    if (event.status === 'rejected') return 'opacity-50';
    return '';
  }

  function handleEventClick(event) {
    if (isAdmin && approvalMode && event.status === 'pending') {
      setApprovalTarget(event);
    } else {
      setExpandedEvent(event);
    }
  }

  const renderMonthView = () => {
    const days = [];
    const firstDay = firstDayOfMonth(currentDate);
    const totalDays = daysInMonth(currentDate);

    for (let i = 0; i < (firstDay.getDay() + 6) % 7; i++) {
      days.push(
        <div key={`empty-${i}`} className="border-r border-b border-slate-100 p-2 h-28 bg-slate-50/50" />
      );
    }

    let currentDay = new Date(firstDay);
    for (let i = 0; i < totalDays; i++) {
      const day = currentDay.getDate();
      const dayEvents = getEventsForDay(currentDay);
      const today = isToday(currentDay);

      days.push(
        <div key={day} className={`border-r border-b border-slate-100 p-2 h-28 flex flex-col transition-colors ${today ? "bg-indigo-50/70" : "bg-white hover:bg-slate-50/50"}`}>
          <div className="mb-1.5 flex-shrink-0">
            <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              today ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"
            }`}>
              {day}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
            {dayEvents.map((event, idx) => {
              const colors = organisationCM.get(event.title) || colorClasses.blue;
              const showKlas = event.klas && filter.field !== 'klas';
              return (
                <div
                  key={idx}
                  onClick={() => handleEventClick(event)}
                  className={`text-xs px-1.5 py-0.5 rounded-md border-l-2 transition-all cursor-pointer ${colors.bg} ${colors.text} ${colors.border} ${eventStatusClasses(event)}`}
                  title={`${event.title}${event.klas ? ` · ${event.klas}` : ''}${event.lesgever ? ` · ${event.lesgever}` : ''} — ${event.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}${event.status === 'pending' ? ' (pending approval)' : event.status === 'rejected' ? ' (rejected)' : ''}`}
                >
                  <div className="flex items-baseline gap-1 truncate">
                    <span className="font-semibold flex-shrink-0">{event.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className={`truncate ${event.status === 'rejected' ? 'line-through' : ''}`}>{event.title}</span>
                  </div>
                  {showKlas && (
                    <div className="truncate opacity-75 leading-tight" style={{ fontSize: '0.65rem' }}>{event.klas}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
      currentDay = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate() + 1);
    }

    return days;
  };

  const renderTimeGrid = (dates) => {
    const now = new Date();
    const nowTop = now.getHours() * HOUR_HEIGHT + (now.getMinutes() / 60) * HOUR_HEIGHT;

    return (
      <>
        {/* Sticky day headers */}
        <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10">
          <div className="w-14 flex-shrink-0 border-r border-slate-100" />
          {dates.map((date, i) => {
            const today = isToday(date);
            return (
              <div key={i} className={`flex-1 py-3 text-center border-l border-slate-100 ${today ? "bg-indigo-50/60" : ""}`}>
                <div className={`text-xs font-semibold uppercase tracking-wider mb-0.5 ${today ? "text-indigo-500" : "text-slate-400"}`}>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()]}
                </div>
                <div className={`text-2xl font-bold inline-flex w-9 h-9 items-center justify-center rounded-full mx-auto ${
                  today ? "bg-indigo-600 text-white shadow-md" : "text-slate-700"
                }`}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable time body */}
        <div className="overflow-y-auto" ref={scrollRef}>
          <div className="flex">
            {/* Hour labels */}
            <div className="w-14 flex-shrink-0 border-r border-slate-100 select-none">
              {HOURS.map(hour => (
                <div key={hour} className="flex items-start justify-end pr-2.5 pt-1 text-xs text-slate-400 font-medium" style={{ height: HOUR_HEIGHT }}>
                  {hour > 0 && `${hour.toString().padStart(2, "0")}:00`}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {dates.map((date, i) => {
              const today = isToday(date);
              const dayEvents = getEventsForDay(date);
              return (
                <div key={i} className={`flex-1 border-l border-slate-100 relative ${today ? "bg-indigo-50/20" : ""}`} style={{ height: 24 * HOUR_HEIGHT }}>
                  {HOURS.map(hour => (
                    <div key={hour} className="absolute w-full border-t border-slate-100" style={{ top: hour * HOUR_HEIGHT }} />
                  ))}
                  {HOURS.map(hour => (
                    <div key={`h${hour}`} className="absolute w-full border-t border-slate-50" style={{ top: hour * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
                  ))}
                  {today && (
                    <div className="absolute w-full z-10 flex items-center pointer-events-none" style={{ top: nowTop }}>
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1.5 flex-shrink-0 shadow-sm" />
                      <div className="flex-1 border-t-2 border-rose-400" />
                    </div>
                  )}
                  {dayEvents.map((event, idx) => {
                    const top = event.date.getHours() * HOUR_HEIGHT + (event.date.getMinutes() / 60) * HOUR_HEIGHT;
                    const colors = organisationCM.get(event.title) || colorClasses.blue;
                    const showKlas = event.klas && filter.field !== 'klas';
                    return (
                      <div
                        key={idx}
                        onClick={() => handleEventClick(event)}
                        className={`absolute inset-x-0.5 px-1.5 py-1 rounded-lg text-xs border-l-2 overflow-hidden transition-all cursor-pointer ${colors.bg} ${colors.text} ${colors.border} ${eventStatusClasses(event)}`}
                        style={{ top: top + 1, height: HOUR_HEIGHT - 2 }}
                        title={`${event.title}${event.klas ? ` · ${event.klas}` : ''}${event.lesgever ? ` · ${event.lesgever}` : ''} — ${event.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}${event.status === 'pending' ? ' (pending approval)' : event.status === 'rejected' ? ' (rejected)' : ''}`}
                      >
                        <div className="font-semibold leading-tight">{event.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        <div className={`truncate leading-tight mt-0.5 ${event.status === 'rejected' ? 'line-through opacity-60' : ''}`}>{event.title}</div>
                        {showKlas && (
                          <div className="truncate leading-tight opacity-75" style={{ fontSize: '0.65rem' }}>{event.klas}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  };

  const renderCalendar = (view) => {
    if (view === "month") return renderMonthView();
    if (view === "week") {
      const monday = getWeekStartMonday(currentDate);
      const dates = Array.from({ length: 7 }, (_, i) =>
        new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
      );
      return renderTimeGrid(dates);
    }
    return renderTimeGrid([currentDate]);
  };

  return (
    <div className="min-h-screen p-4 md:p-6"
      style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #e0e7ff 50%, #f1f5f9 100%)' }}>
      {showCreateUser && (
        <CreateUserModal
          onClose={() => setShowCreateUser(false)}
          organisations={[...new Set(events.map(e => e.title).filter(Boolean))].sort()}
        />
      )}
      {showAddMeet && (
        <AdminMeetModal
          mode="add"
          onClose={() => setShowAddMeet(false)}
          onSaved={(patch, meetId) => handleMeetSaved(patch, meetId, true)}
        />
      )}
      {editTarget && (
        <AdminMeetModal
          mode="edit"
          meet={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(patch, meetId) => { handleMeetSaved(patch, meetId, false); setEditTarget(null); }}
        />
      )}
      {approvalTarget && (
        <ApprovalModal
          event={approvalTarget}
          loading={approvalLoading}
          onApprove={() => handleApprovalAction('approve')}
          onReject={() => handleApprovalAction('reject')}
          onClose={() => setApprovalTarget(null)}
        />
      )}
      {expandedEvent && !editTarget && (
        <EventDetailModal
          event={expandedEvent}
          colors={organisationCM.get(expandedEvent.title) || colorClasses.blue}
          onClose={() => setExpandedEvent(null)}
          isAdmin={isAdmin}
          onEdit={() => { setEditTarget(expandedEvent); setExpandedEvent(null); }}
        />
      )}

      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 20px 60px -10px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)' }}>

          {/* ── Header bar ───────────────────────────────────────── */}
          <div className="px-6 py-4"
            style={{ background: 'linear-gradient(135deg, #4338ca 0%, #3b82f6 100%)' }}>
            <div className="flex flex-wrap items-center justify-between gap-4">

              {/* Title + nav arrows */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white leading-tight">
                    {months[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h1>
                  <p className="text-indigo-200 text-xs font-medium">Classroom Visit Schedule</p>
                </div>
                <div className="flex gap-1 ml-2">
                  <button onClick={prevPeriod}
                    className="p-1.5 rounded-lg transition-all text-white/80 hover:text-white"
                    style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={nextPeriod}
                    className="p-1.5 rounded-lg transition-all text-white/80 hover:text-white"
                    style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-1 p-1 rounded-xl"
                style={{ background: 'rgba(0,0,0,0.2)' }}>
                {["Month", "Week", "Day"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v.toLowerCase())}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      view === v.toLowerCase()
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* User info + admin controls */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-white/70 text-xs font-medium px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.1)' }}>
                  {user?.username}
                </span>
                {isAdmin && (
                  <>
                    <button onClick={() => setShowCreateUser(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/90 hover:text-white transition-all"
                      style={{ background: 'rgba(255,255,255,0.15)' }}>
                      <UserPlus className="w-3.5 h-3.5" />
                      Add user
                    </button>
                    <button onClick={() => setShowAddMeet(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/90 hover:text-white transition-all"
                      style={{ background: 'rgba(255,255,255,0.15)' }}>
                      <CalendarPlus className="w-3.5 h-3.5" />
                      Add meet
                    </button>
                    <button
                      onClick={() => setApprovalMode(prev => !prev)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        approvalMode
                          ? 'text-amber-900'
                          : 'text-white/90 hover:text-white'
                      }`}
                      style={approvalMode
                        ? { background: '#fbbf24', boxShadow: '0 2px 8px rgba(251,191,36,0.4)' }
                        : { background: 'rgba(255,255,255,0.15)' }
                      }>
                      <ClipboardList className="w-3.5 h-3.5" />
                      {approvalMode ? 'Exit review' : `Review${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
                    </button>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none text-white/70 hover:text-white/90 text-xs font-medium transition-colors">
                      <input
                        type="checkbox"
                        checked={showRejected}
                        onChange={e => setShowRejected(e.target.checked)}
                        className="accent-amber-400 w-3.5 h-3.5 rounded"
                      />
                      Show rejected
                    </label>
                  </>
                )}
                <button onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/80 hover:text-white transition-all"
                  style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          </div>

          {/* ── Content area ─────────────────────────────────────── */}
          <div className="p-5">

            {/* Approval mode banner */}
            {isAdmin && approvalMode && (
              <div className="mb-4 flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
                style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <span className="text-amber-800 font-medium text-xs">
                  Review mode active — pending meets are shown with an amber outline. Click a pending meet to approve or reject it.
                </span>
                {pendingCount > 0 && (
                  <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-amber-900">
                    {pendingCount} pending
                  </span>
                )}
              </div>
            )}

            {/* Filter bar */}
            <div className="mb-5 flex gap-2 items-center px-3 py-2.5 rounded-xl"
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <select
                value={displayFilter.field}
                onChange={(e) => setDisplayFilter({ field: e.target.value, value: "" })}
                className="flex-1 bg-transparent text-sm text-slate-600 focus:outline-none cursor-pointer"
              >
                <option value="">Filter by field…</option>
                {possibleFields.map((field, index) => (
                  <option key={index} value={field}>
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </option>
                ))}
              </select>
              <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
              <select
                value={displayFilter.value}
                onChange={(e) => setDisplayFilter({ ...displayFilter, value: e.target.value })}
                className="flex-1 bg-transparent text-sm text-slate-600 focus:outline-none cursor-pointer disabled:text-slate-300"
                disabled={!displayFilter.field}
              >
                <option value="">All values</option>
                {fieldValues.map((val, i) => (
                  <option key={i} value={val}>{val}</option>
                ))}
              </select>
              <button
                onClick={() => setFilter({ field: displayFilter.field, value: displayFilter.value })}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #4338ca, #3b82f6)', boxShadow: '0 2px 8px rgba(67,56,202,0.3)' }}
              >
                Apply
              </button>
              {filter.field && (
                <button
                  onClick={() => {
                    setFilter({ field: '', value: '' });
                    setDisplayFilter({ field: '', value: '' });
                  }}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-all"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Calendar grid */}
            {view === "month" ? (
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <div className="grid grid-cols-7">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                    <div key={day}
                      className="py-2.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-r border-slate-200 last:border-r-0"
                      style={{ background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)' }}>
                      {day}
                    </div>
                  ))}
                  {renderCalendar(view)}
                </div>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border border-slate-200 flex flex-col">
                {renderCalendar(view)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden update checker */}
      <UseCheckForUpdates
        refreshFlag={refreshFlag}
        updateFunc={handleNewEvents}
      />
    </div>
  );
};

export default App;
