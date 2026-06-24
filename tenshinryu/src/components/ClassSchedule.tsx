"use client";

import { useState, useEffect } from "react";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end?: string;
  location: string;
  instructor: string;
  status?: string;
  link?: string;
}

interface ClassFromDB {
  id: string;
  title: string;
  schedule: string;
  location?: string;
  instructor?: string;
}

export default function ClassSchedule() {
  const [events, setEvents] = useState<(CalendarEvent | ClassFromDB)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [source, setSource] = useState<"google_calendar" | "database">("database");

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const response = await fetch("/api/calendar");
      const data = await response.json();

      if (response.ok) {
        setEvents(data.events || []);
        setSource(data.source);
      } else {
        setError(data.error || "Failed to load schedule");
      }
    } catch (err) {
      setError("Network error loading schedule");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getEventTime = (event: CalendarEvent | ClassFromDB) => {
    if ("start" in event && event.start) {
      return {
        date: formatDate(event.start),
        time: event.end ? `${formatTime(event.start)} - ${formatTime(event.end)}` : formatTime(event.start),
      };
    }
    // Database format
    return { date: "Scheduled", time: (event as ClassFromDB).schedule };
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block w-8 h-8 border-2 border-red-900 border-t-red-600 animate-spin"></div>
        <p className="mt-4 text-gray-500">Loading schedule...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center border border-red-900/30 bg-red-950/20">
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchSchedule}
          className="mt-4 px-4 py-2 text-sm bg-red-900/50 hover:bg-red-900 text-white transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-12 text-center border border-gray-800 bg-gray-900/30">
        <p className="text-gray-500">No upcoming classes scheduled.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {source === "database" && (
        <p className="text-xs text-gray-600 text-center mb-4">Schedule from dojo database</p>
      )}
      
      {events.slice(0, 5).map((event) => {
        const { date, time } = getEventTime(event);
        const isCalendarEvent = "start" in event;
        
        return (
          <div
            key={event.id}
            className="flex items-start gap-4 p-4 border border-gray-800 bg-gray-900/30 hover:border-red-900/50 transition-colors"
          >
            {/* Date Badge */}
            <div className="flex-shrink-0 w-16 text-center">
              <div className="text-2xl font-bold text-red-700">
                {date.split(" ")[1]?.replace(",", "")}
              </div>
              <div className="text-xs text-gray-500 uppercase">
                {date.split(" ")[0]}
              </div>
            </div>

            {/* Event Details */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-100 truncate">{event.title}</h3>
              <p className="text-sm text-gray-500">{time}</p>
              
              {isCalendarEvent && (event as CalendarEvent).location !== "TBD" && (
                <p className="text-xs text-gray-600 mt-1">
                  📍 {(event as CalendarEvent).location}
                </p>
              )}
              
              {event.instructor && event.instructor !== "TBD" && (
                <p className="text-xs text-gray-600">
                  👤 {event.instructor}
                </p>
              )}
            </div>

            {/* Check-in Button (if logged in) */}
            <a
              href="/checkin"
              className="flex-shrink-0 px-3 py-2 text-xs bg-red-900/80 hover:bg-red-700 text-white transition-colors"
            >
              Check In
            </a>
          </div>
        );
      })}

      {events.length > 5 && (
        <div className="text-center pt-4">
          <a
            href="/schedule"
            className="text-sm text-red-700 hover:text-red-600 transition-colors"
          >
            View all {events.length} classes →
          </a>
        </div>
      )}
    </div>
  );
}
