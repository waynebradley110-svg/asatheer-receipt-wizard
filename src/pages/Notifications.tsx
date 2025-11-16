import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertCircle } from "lucide-react";
import { ExpiryReminders } from "@/components/ExpiryReminders";
import { cn } from "@/lib/utils";

const Notifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    setNotifications(data || []);
  };

  return (
    <div className="space-y-6 dashboard-section">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-accent/5 to-transparent p-8 border border-border/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Notifications & Reminders
            </h1>
            <p className="text-muted-foreground text-lg mt-1">
              Stay updated with academy alerts and membership reminders
            </p>
          </div>
        </div>
      </div>

      <ExpiryReminders />

      <Card className="border-l-4 border-l-accent/30 stat-card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-accent/10">
              <Bell className="h-5 w-5 text-accent" />
            </div>
            System Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notif) => (
                <div key={notif.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/10 transition-colors stat-card-hover">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold">{notif.title}</h3>
                      <Badge variant={notif.is_read ? "secondary" : "default"}
                        className={cn(
                          !notif.is_read && "bg-accent/90 text-white"
                        )}
                      >
                        {notif.is_read ? "Read" : "Unread"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{notif.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notif.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;