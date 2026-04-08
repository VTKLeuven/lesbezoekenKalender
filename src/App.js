import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar, ClipboardList, X, Check } from "lucide-react";
import { colorClasses } from "./colorClasses.js";
import { UseCheckForUpdates } from "./hooks.js";
import { getWeekStartMonday, fulfillsFilter } from "./helper.js";
import { possibleFields } from "./meet.js";
import { useAuth } from "./AuthContext";
import CreateUserModal from "./CreateUserModal";

const HOUR_HEIGHT = 56; // px per hour in week/day view
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getAuthHeader() {
  const token = sessionStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Modal shown when admin clicks a pending meet in approval mode
function ApprovalModal({ event, onApprove, onReject, onClose, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Review meet request</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mb-5 space-y-1 text-sm text-gray-700">
          <p><span className="font-medium">Organisation:</span> {event.title}</p>
          <p><span className="font-medium">Date:</span> {event.date.toLocaleDateString()}</p>
          <p><span className="font-medium">Time:</span> {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onApprove}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
          >
            <Check className="w-4 h-4" /> Approve
          </button>
          <button
            onClick={onReject}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
          >
            <X className="w-4 h-4" /> Reject
          </button>
        </div>
        {loading && <p className="text-xs text-gray-400 text-center mt-3">Saving…</p>}
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

  // Approval-mode state (admin only)
  const [approvalMode, setApprovalMode] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [approvalTarget, setApprovalTarget] = useState(null); // pending meet being reviewed
  const [approvalLoading, setApprovalLoading] = useState(false);

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

  // Handle approve / reject actions from the modal
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
      // Update local event status immediately so the UI responds without waiting for a poll
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

  // Events visible to this user based on role, approval status, and current mode
  const baseEvents = useMemo(() => {
    let result = events;

    // Role-based host restriction (non-admin users)
    if (!isAdmin && user?.allowedHosts?.length) {
      result = result.filter(e => user.allowedHosts.includes(e.host));
    }

    if (isAdmin) {
      if (approvalMode) {
        // Approval mode: approved + pending always visible; rejected only if checkbox on
        result = result.filter(e =>
          e.status === 'approved' ||
          e.status === 'pending' ||
          (showRejected && e.status === 'rejected')
        );
      } else {
        // Normal admin view: only approved; rejected only if checkbox on
        result = result.filter(e =>
          e.status === 'approved' ||
          (showRejected && e.status === 'rejected')
        );
      }
    } else {
      // Regular users see only approved meets
      result = result.filter(e => e.status === 'approved');
    }

    return result;
  }, [events, user, isAdmin, approvalMode, showRejected]);

  // Pre-filter events by the applied filter — recomputed only when baseEvents or filter changes
  const filteredEvents = useMemo(() => {
    if (!filter.field) return baseEvents;
    return baseEvents.filter(event => fulfillsFilter(filter, event));
  }, [baseEvents, filter]);

  // Index filtered events by date key for O(1) per-day lookup
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

  // Distinct values for the currently selected field, for the value dropdown
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

  // Returns extra Tailwind classes for an event card based on its status
  function eventStatusClasses(event) {
    if (event.status === 'pending') return 'opacity-50 cursor-pointer ring-1 ring-amber-400 ring-inset';
    if (event.status === 'rejected') return 'opacity-60';
    return '';
  }

  // Called when clicking an event card — opens approval modal for pending meets in approval mode
  function handleEventClick(event) {
    if (isAdmin && approvalMode && event.status === 'pending') {
      setApprovalTarget(event);
    }
  }

  const renderMonthView = () => {
    const days = [];
    const firstDay = firstDayOfMonth(currentDate);
    const totalDays = daysInMonth(currentDate);

    for (let i = 0; i < (firstDay.getDay() + 6) % 7; i++) {
      days.push(<div key={`empty-${i}`} className="border p-2 h-24 bg-gray-50" />);
    }

    let currentDay = new Date(firstDay);
    for (let i = 0; i < totalDays; i++) {
      const day = currentDay.getDate();
      const dayEvents = getEventsForDay(currentDay);
      const today = isToday(currentDay);

      days.push(
        <div key={day} className={`border p-2 h-24 flex flex-col ${today ? "bg-blue-50" : "bg-white"}`}>
          <div className={`text-sm font-semibold mb-1 ${today ? "text-blue-600" : "text-gray-700"}`}>{day}</div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {dayEvents.map((event, idx) => {
              const colors = organisationCM.get(event.title) || colorClasses.blue;
              return (
                <div
                  key={idx}
                  onClick={() => handleEventClick(event)}
                  className={`text-xs p-1 rounded truncate ${colors.bg} ${colors.text} border-l-2 ${colors.border} ${eventStatusClasses(event)}`}
                  title={`${event.title} - ${event.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}${event.status === 'pending' ? ' (pending approval)' : event.status === 'rejected' ? ' (rejected)' : ''}`}
                >
                  <div className="font-medium">{event.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  <div className={event.status === 'rejected' ? 'line-through' : ''}>{event.title}</div>
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
        <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          <div className="w-14 flex-shrink-0 border-r border-gray-200" />
          {dates.map((date, i) => {
            const today = isToday(date);
            return (
              <div key={i} className={`flex-1 py-2 text-center border-l border-gray-200 ${today ? "bg-blue-50" : ""}`}>
                <div className={`text-xs font-medium uppercase tracking-wide ${today ? "text-blue-500" : "text-gray-500"}`}>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()]}
                </div>
                <div className={`text-2xl font-bold ${today ? "text-blue-600" : "text-gray-800"}`}>
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
            <div className="w-14 flex-shrink-0 border-r border-gray-200 select-none">
              {HOURS.map(hour => (
                <div key={hour} className="flex items-start justify-end pr-2 pt-1 text-xs text-gray-400" style={{ height: HOUR_HEIGHT }}>
                  {hour > 0 && `${hour.toString().padStart(2, "0")}:00`}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {dates.map((date, i) => {
              const today = isToday(date);
              const dayEvents = getEventsForDay(date);
              return (
                <div key={i} className="flex-1 border-l border-gray-200 relative" style={{ height: 24 * HOUR_HEIGHT }}>
                  {HOURS.map(hour => (
                    <div key={hour} className="absolute w-full border-t border-gray-100" style={{ top: hour * HOUR_HEIGHT }} />
                  ))}
                  {HOURS.map(hour => (
                    <div key={`h${hour}`} className="absolute w-full border-t border-gray-50" style={{ top: hour * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
                  ))}
                  {today && (
                    <div className="absolute w-full z-10 flex items-center" style={{ top: nowTop }}>
                      <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0" />
                      <div className="flex-1 border-t-2 border-red-400" />
                    </div>
                  )}
                  {dayEvents.map((event, idx) => {
                    const top = event.date.getHours() * HOUR_HEIGHT + (event.date.getMinutes() / 60) * HOUR_HEIGHT;
                    const colors = organisationCM.get(event.title) || colorClasses.blue;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleEventClick(event)}
                        className={`absolute inset-x-0.5 p-1 rounded text-xs ${colors.bg} ${colors.text} border-l-2 ${colors.border} overflow-hidden ${eventStatusClasses(event)}`}
                        style={{ top: top + 1, height: HOUR_HEIGHT - 2 }}
                        title={`${event.title} - ${event.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}${event.status === 'pending' ? ' (pending approval)' : event.status === 'rejected' ? ' (rejected)' : ''}`}
                      >
                        <div className="font-medium">{event.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        <div className={`truncate ${event.status === 'rejected' ? 'line-through' : ''}`}>{event.title}</div>
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
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      {showCreateUser && (
        <CreateUserModal
          onClose={() => setShowCreateUser(false)}
          organisations={[...new Set(events.map(e => e.title).filter(Boolean))].sort()}
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

      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
          {/* Title and navigation */}
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h1>
          </div>

          {/* User info + admin controls + logout */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <span>{user?.username}</span>
            {isAdmin && (
              <>
                <button
                  onClick={() => setShowCreateUser(true)}
                  className="px-3 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 transition text-blue-700"
                >
                  Add user
                </button>
                {/* Approval mode toggle */}
                <button
                  onClick={() => setApprovalMode(prev => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition font-medium ${
                    approvalMode
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  {approvalMode ? 'Exit review mode' : `Review pending${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
                </button>
                {/* Show rejected checkbox */}
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-gray-600">
                  <input
                    type="checkbox"
                    checked={showRejected}
                    onChange={e => setShowRejected(e.target.checked)}
                    className="accent-red-500 w-4 h-4"
                  />
                  Show rejected
                </label>
              </>
            )}
            <button
              onClick={logout}
              className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-gray-700"
            >
              Sign out
            </button>
          </div>

          {/* Navigation + View toggle */}
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <button onClick={prevPeriod} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={nextPeriod} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
            <div className="flex gap-2 ml-4 bg-gray-100 rounded-lg p-1">
              {["Month", "Week", "Day"].map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v.toLowerCase())}
                  className={`px-3 py-1 rounded-md font-medium text-sm transition-colors ${
                    view === v.toLowerCase() ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-white"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Approval mode banner */}
        {isAdmin && approvalMode && (
          <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800">
            <ClipboardList className="w-4 h-4 flex-shrink-0" />
            <span>
              Review mode active — pending meets are shown at 50% opacity with an amber outline.
              Click a pending meet to approve or reject it.
            </span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="mb-4 flex gap-3 items-center">
          <select
            value={displayFilter.field}
            onChange={(e) => setDisplayFilter({ field: e.target.value, value: "" })}
            className="border border-gray-300 p-2 rounded-lg flex-grow"
          >
            <option value="">Select a field</option>
            {possibleFields.map((field, index) => (
              <option key={index} value={field}>
                {field.charAt(0).toUpperCase() + field.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={displayFilter.value}
            onChange={(e) => setDisplayFilter({ ...displayFilter, value: e.target.value })}
            className="border border-gray-300 p-2 rounded-lg flex-grow"
            disabled={!displayFilter.field}
          >
            <option value="">All values</option>
            {fieldValues.map((val, i) => (
              <option key={i} value={val}>{val}</option>
            ))}
          </select>
          <button
            onClick={() => setFilter({ field: displayFilter.field, value: displayFilter.value })}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Filter
          </button>
          {filter.field && (
            <button
              onClick={() => {
                setFilter({ field: '', value: '' });
                setDisplayFilter({ field: '', value: '' });
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Clear
            </button>
          )}
        </div>

        {/* Calendar grid */}
        {view === "month" ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden grid grid-cols-7">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="bg-gray-100 p-3 text-center font-semibold text-gray-700 border-b-2 border-gray-300">
                {day}
              </div>
            ))}
            {renderCalendar(view)}
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col">
            {renderCalendar(view)}
          </div>
        )}
      </div>

      {/* Updates */}
      <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
        <UseCheckForUpdates
          refreshFlag={refreshFlag}
          updateFunc={handleNewEvents}
        />
      </div>
    </div>
  );
};

export default App;
