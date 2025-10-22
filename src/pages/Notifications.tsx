import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { ExpiryReminders } from "@/components/ExpiryReminders";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notifications & Reminders</h1>
        <p className="text-muted-foreground">Stay updated with academy alerts and membership reminders</p>
      </div>

      <ExpiryReminders />

      <Card>
        <CardHeader>
          <CardTitle>System Notifications</CardTitle>
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
                <div key={notif.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <Bell className="h-5 w-5 text-primary mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold">{notif.title}</h3>
                      <Badge variant={notif.is_read ? "secondary" : "default"}>
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