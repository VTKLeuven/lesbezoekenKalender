import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { colorClasses } from "./colorClasses.js";
const App = ({ initialEvents = [], organisationCM = Map() }) => {
  let events = initialEvents;
  console.log(events);
  if (!Array.isArray(events)) {
    console.warn("events is not an array, using empty array");
    events = [];
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
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
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

  const getEventsForDay = (day) => {
    return events
      .filter((event) => {
        const eventDate = new Date(event.date);
        return (
          eventDate.getDate() === day &&
          eventDate.getMonth() === currentDate.getMonth() &&
          eventDate.getFullYear() === currentDate.getFullYear()
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

  const renderCalendar = () => {
    const days = [];
    const totalDays = daysInMonth(currentDate);
    const firstDay = firstDayOfMonth(currentDate);

    // Empty cells before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="border p-2 h-24 bg-gray-50"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= totalDays; day++) {
      const dayEvents = getEventsForDay(day);
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
              console.log(organisationCM.get(event.title));
              console.log(colorClasses.blue);
              console.log(colors);
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
    }

    return days;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
          {/* Weekday headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="bg-gray-100 p-3 text-center font-semibold text-gray-700 border-b-2 border-gray-300"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {renderCalendar()}
        </div>
      </div>
    </div>
  );
};

export default App;
