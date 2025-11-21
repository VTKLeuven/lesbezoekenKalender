import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { colorClasses } from "./colorClasses.js";
import { webAppUrl, apiKey } from "./sensitiveData.js";
import { UseCheckForUpdates } from "./hooks.js";
import { getWeekStartMonday } from "./helper.js";
import { fulfillsFilter } from "./helper.js";
const App = ({ initialEvents = [], organisationCM = Map() }) => {
  const startEvents = initialEvents;
  let [events, setEvents] = useState(startEvents);
  let [filter, setFilter] = useState({field:'',value:''})
  let [displayFilter,setDisplayFilter] = useState({field:'',value:''})
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [view, setView] = useState("month");

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
      setRefreshFlag(!refreshFlag);
      console.log("refreshing");
    }, 120000);

    return () => clearInterval(_intervalId);
  }, []);
  if (!Array.isArray(events)) {
    console.warn("events is not an array, using empty array");
    events = [];
  }
  function handleNewEvents(newEvents) {
    setEvents(newEvents);
  }
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

  const getEventsForDay = (day,filter=null) => {
    return events
      .filter((event) => {
        const eventDate = new Date(event.date);
        return (
          eventDate.getDate() === day &&
          eventDate.getMonth() === currentDate.getMonth() &&
          eventDate.getFullYear() === currentDate.getFullYear() &&
          (filter === null || fulfillsFilter(filter,event) === true)
        );
      })
      .sort((a, b) => a.date - b.date);
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const renderCalendar = (view) => {
    const days = [];
    let totalDays = 0;
    let firstDay = new Date();
    switch (view) {
      case "month":
        totalDays = daysInMonth(currentDate);
        firstDay = firstDayOfMonth(currentDate);
        for (let i = 0; i < firstDay.getDate(); i++) {
          days.push(
            <div
              key={`empty-${i}`}
              className="border p-2 h-24 bg-gray-50"
            ></div>
          );
        }
        break;
      case "week":
        totalDays = 7;
        firstDay = getWeekStartMonday(currentDate);
        break;
      case "day":
        totalDays = 1;
        firstDay = currentDate;
        break;
      default:
        throw new Error("Unknown view option");
    }

    let currentDay = currentDate;
    // Days of the month
    for (let index = 0; index <= totalDays - 1; index++) {
      const day = currentDay.getDate();
      const dayEvents = getEventsForDay(day,filter);
      console.log(dayEvents)
      const today = isToday(day);

      days.push(
        <div
          key={day}
          className={`border p-2 h-24 flex flex-col ${
            today ? "bg-blue-50" : "bg-white"
          }`}
        >
          {/* Day number */}
          <div
            className={`text-sm font-semibold mb-1 ${
              today ? "text-blue-600" : "text-gray-700"
            }`}
          >
            {day}
          </div>

          {/* Events */}
          <div className="flex-1 overflow-y-auto space-y-1">
            {dayEvents.map((event, idx) => {
              const colors =
                organisationCM.get(event.title) || colorClasses.blue;
              return (
                <div
                  key={idx}
                  className={`text-xs p-1 rounded truncate ${colors.bg} ${colors.text} border-l-2 ${colors.border}`}
                  title={`${event.title} - ${event.date.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`}
                >
                  <div className="font-medium">
                    {event.date.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div>{event.title}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
      currentDay = new Date(
        currentDay.getFullYear(),
        currentDay.getMonth(),
        currentDay.getDate() + 1
      );
    }

    return days;
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
          <input
            type="text"
            placeholder="Field"
            value={displayFilter.field}
            onChange={(e) => setDisplayFilter({field:e.target.value,value: displayFilter.value})}
            className="border border-gray-300 p-2 rounded-lg flex-grow"
          />
          <input
            type="text"
            placeholder="Value"
            value= {displayFilter.value}
            onChange={(e) => setDisplayFilter({field:displayFilter.field,value: e.target.value})}
            className="border border-gray-300 p-2 rounded-lg flex-grow"
          />
          <button
            onClick={() => {
              setFilter({ field: displayFilter.field, value: displayFilter.value });
              renderCalendar(view);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Filter
          </button>
        </div>

        {/* Calendar grid */}
        <div
          className={`
          border border-gray-200 rounded-lg overflow-hidden
          ${view === "month" ? "grid grid-cols-7 gap-0" : ""}
          ${view === "week" ? "grid grid-cols-7" : ""}
          ${view === "day" ? "grid grid-cols-1" : ""}
        `}
        >
          {(view === "month" || view === "week") &&
            ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="bg-gray-100 p-3 text-center font-semibold text-gray-700 border-b-2 border-gray-300"
              >
                {day}
              </div>
            ))}

          {renderCalendar(view, filter)}
        </div>
      </div>

      {/* Updates */}
      <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
        <UseCheckForUpdates
          refreshFlag={refreshFlag}
          webAppUrl={webAppUrl}
          apiKey={apiKey}
          updateFunc={handleNewEvents}
        />
      </div>
    </div>
  );
}

export default App;
