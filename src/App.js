import React, { useState, useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { colorClasses } from "./colorClasses.js";
import { UseCheckForUpdates } from "./hooks.js";
import { getWeekStartMonday, fulfillsFilter } from "./helper.js";
import { possibleFields } from "./meet.js";
import { useAuth } from "./AuthContext";

const HOUR_HEIGHT = 56; // px per hour in week/day view
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const App = ({ initialEvents = [], organisationCM = Map() }) => {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState(initialEvents);
  const [filter, setFilter] = useState({ field: '', value: '' });
  const [displayFilter, setDisplayFilter] = useState({ field: '', value: '' });
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [view, setView] = useState("month");
  const scrollRef = useRef(null);

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

  // Events visible to this user based on their role/allowedHosts
  const baseEvents = useMemo(() => {
    if (user?.role !== 'admin' && user?.allowedHosts?.length) {
      return events.filter(e => user.allowedHosts.includes(e.host));
    }
    return events;
  }, [events, user]);

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
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const daysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };
  const prevWeek = () => {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate() - 7
      )
    );
  };

  const nextWeek = () => {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate() + 7
      )
    );
  };
  const prevDay = () => {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate() - 1
      )
    );
  };

  const nextDay = () => {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate() + 1
      )
    );
  };

  const getEventsForDay = (date) => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return eventsByDay.get(key) || [];
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

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
                  className={`text-xs p-1 rounded truncate ${colors.bg} ${colors.text} border-l-2 ${colors.border}`}
                  title={`${event.title} - ${event.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                >
                  <div className="font-medium">{event.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  <div>{event.title}</div>
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
                  {/* Hour lines */}
                  {HOURS.map(hour => (
                    <div key={hour} className="absolute w-full border-t border-gray-100" style={{ top: hour * HOUR_HEIGHT }} />
                  ))}
                  {/* Half-hour lines */}
                  {HOURS.map(hour => (
                    <div key={`h${hour}`} className="absolute w-full border-t border-gray-50" style={{ top: hour * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
                  ))}
                  {/* Current time indicator */}
                  {today && (
                    <div className="absolute w-full z-10 flex items-center" style={{ top: nowTop }}>
                      <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0" />
                      <div className="flex-1 border-t-2 border-red-400" />
                    </div>
                  )}
                  {/* Events */}
                  {dayEvents.map((event, idx) => {
                    const top = event.date.getHours() * HOUR_HEIGHT + (event.date.getMinutes() / 60) * HOUR_HEIGHT;
                    const colors = organisationCM.get(event.title) || colorClasses.blue;
                    return (
                      <div
                        key={idx}
                        className={`absolute inset-x-0.5 p-1 rounded text-xs ${colors.bg} ${colors.text} border-l-2 ${colors.border} overflow-hidden`}
                        style={{ top: top + 1, height: HOUR_HEIGHT - 2 }}
                        title={`${event.title} - ${event.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                      >
                        <div className="font-medium">{event.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        <div className="truncate">{event.title}</div>
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

          {/* User info + logout */}
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>{user?.username}</span>
            <button
              onClick={logout}
              className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-gray-700"
            >
              Sign out
            </button>
          </div>

          {/* Navigation + View toggle */}
          <div className="flex items-center gap-3">
            {/* Prev / Next */}
            <div className="flex gap-2">
              <button
                onClick={prevPeriod}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextPeriod}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* View selector */}
            <div className="flex gap-2 ml-4 bg-gray-100 rounded-lg p-1">
              {["Month", "Week", "Day"].map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v.toLowerCase())}
                  className={`px-3 py-1 rounded-md font-medium text-sm transition-colors ${
                    view === v.toLowerCase()
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-white"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

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
}

export default App;
