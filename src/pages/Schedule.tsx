import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays, Users, Clock, UserPlus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreateSessionDialog } from "@/components/CreateSessionDialog";
import { BookSessionDialog } from "@/components/BookSessionDialog";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from "date-fns";

interface Session {
  id: string;
  title: string;
  session_type: string;
  session_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  zone: string | null;
  notes: string | null;
  coach_id: string | null;
  coaches?: { name: string } | null;
  bookings_count: number;
}

const typeColors: Record<string, string> = {
  pt: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  football: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  crossfit: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  swimming: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  paddle: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const typeLabels: Record<string, string> = {
  pt: "PT", football: "Football", crossfit: "CrossFit", swimming: "Swimming", paddle: "Paddle",
};

export default function Schedule() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [bookingSession, setBookingSession] = useState<Session | null>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const fetchSessions = async () => {
    const from = format(weekDays[0], "yyyy-MM-dd");
    const to = format(weekDays[6], "yyyy-MM-dd");

    const { data: sessionsData } = await supabase
      .from("sessions")
      .select("*, coaches(name)")
      .gte("session_date", from)
      .lte("session_date", to)
      .order("start_time");

    if (!sessionsData) return;

    // Get booking counts
    const sessionIds = sessionsData.map(s => s.id);
    let bookingCounts: Record<string, number> = {};
    if (sessionIds.length > 0) {
      const { data: bookings } = await supabase
        .from("session_bookings")
        .select("session_id")
        .in("session_id", sessionIds)
        .neq("status", "cancelled");

      if (bookings) {
        bookings.forEach(b => {
          bookingCounts[b.session_id] = (bookingCounts[b.session_id] || 0) + 1;
        });
      }
    }

    setSessions(sessionsData.map(s => ({
      ...s,
      bookings_count: bookingCounts[s.id] || 0,
    })));
  };

  useEffect(() => { fetchSessions(); }, [weekStart]);

  const deleteSession = async (id: string) => {
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Session deleted"); fetchSessions(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" /> Session Schedule
          </h1>
          <p className="text-muted-foreground text-sm">Manage PT sessions, classes, and court bookings</p>
        </div>
        <CreateSessionDialog onCreated={fetchSessions} />
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setWeekStart(s => subWeeks(s, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium text-sm">
          {format(weekDays[0], "MMM d")} — {format(weekDays[6], "MMM d, yyyy")}
        </span>
        <Button variant="outline" size="icon" onClick={() => setWeekStart(s => addWeeks(s, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}>
          Today
        </Button>
      </div>

      {/* Weekly calendar grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {weekDays.map(day => {
          const daySessions = sessions.filter(s => isSameDay(parseISO(s.session_date), day));
          const isToday = isSameDay(day, new Date());

          return (
            <Card key={day.toISOString()} className={`min-h-[200px] ${isToday ? "border-primary border-2" : ""}`}>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {format(day, "EEE")}
                  <span className={`block text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                    {format(day, "d")}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-1.5">
                {daySessions.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No sessions</p>
                )}
                {daySessions.map(session => (
                  <div
                    key={session.id}
                    className="rounded-md border p-2 space-y-1 text-xs hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-semibold leading-tight">{session.title}</span>
                      <Badge className={`text-[10px] px-1 ${typeColors[session.session_type] || ""}`}>
                        {typeLabels[session.session_type] || session.session_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                    </div>
                    {session.coaches?.name && (
                      <p className="text-muted-foreground">🏅 {session.coaches.name}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {session.bookings_count}/{session.max_capacity}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => setBookingSession(session)}
                        >
                          <UserPlus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-destructive"
                          onClick={() => deleteSession(session.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {bookingSession && (
        <BookSessionDialog
          sessionId={bookingSession.id}
          sessionTitle={bookingSession.title}
          maxCapacity={bookingSession.max_capacity}
          currentBookings={bookingSession.bookings_count}
          open={!!bookingSession}
          onOpenChange={(o) => !o && setBookingSession(null)}
          onBooked={fetchSessions}
        />
      )}
    </div>
  );
}
