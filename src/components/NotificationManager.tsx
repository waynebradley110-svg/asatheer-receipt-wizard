import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Bell, Send, Clock, CheckCircle, XCircle, 
  MessageSquare, Mail, Phone, Plus, Edit, Trash2,
  Play, Pause, RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  subject: string | null;
  message_template: string;
  channels: string[];
  is_active: boolean;
  trigger_days: number[] | null;
  created_at: string;
}

interface NotificationQueueItem {
  id: string;
  member_id: string;
  notification_type: string;
  channel: string;
  recipient: string;
  subject: string | null;
  message: string;
  status: string;
  scheduled_at: string;
  sent_at: string | null;
  error_message: string | null;
}

interface NotificationSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string | null;
}

const NotificationManager = () => {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [queue, setQueue] = useState<NotificationQueueItem[]>([]);
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [templatesRes, queueRes, settingsRes] = await Promise.all([
        supabase.from("notification_templates").select("*").order("created_at", { ascending: false }),
        supabase.from("notification_queue").select("*").order("scheduled_at", { ascending: false }).limit(50),
        supabase.from("notification_settings").select("*"),
      ]);

      setTemplates(templatesRes.data || []);
      setQueue(queueRes.data || []);
      setSettings(settingsRes.data || []);
    } catch (error) {
      console.error("Error fetching notification data:", error);
      toast.error("Failed to load notification data");
    } finally {
      setLoading(false);
    }
  };

  const toggleTemplateStatus = async (template: NotificationTemplate) => {
    const { error } = await supabase
      .from("notification_templates")
      .update({ is_active: !template.is_active })
      .eq("id", template.id);

    if (error) {
      toast.error("Failed to update template");
    } else {
      toast.success(`Template ${!template.is_active ? "activated" : "deactivated"}`);
      fetchData();
    }
  };

  const updateSetting = async (key: string, value: any) => {
    const { error } = await supabase
      .from("notification_settings")
      .update({ setting_value: value, updated_at: new Date().toISOString() })
      .eq("setting_key", key);

    if (error) {
      toast.error("Failed to update setting");
    } else {
      toast.success("Setting updated");
      fetchData();
    }
  };

  const triggerNotificationScheduler = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("schedule-notifications", {
        body: { manual: true },
      });

      if (error) throw error;
      toast.success("Notification scheduler triggered");
      fetchData();
    } catch (error) {
      console.error("Error triggering scheduler:", error);
      toast.error("Failed to trigger scheduler");
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      expiry_reminder: "⏰ Expiry Reminder",
      birthday: "🎂 Birthday",
      welcome: "👋 Welcome",
      payment_confirmation: "✅ Payment",
      freeze_resume: "❄️ Freeze Resume",
      class_reminder: "📅 Class Reminder",
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-accent/20 text-accent"><CheckCircle className="h-3 w-3 mr-1" /> Sent</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "whatsapp":
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case "email":
        return <Mail className="h-4 w-4 text-blue-500" />;
      case "sms":
        return <Phone className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-1/3 mb-4" />
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" />
          Notification Manager
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={triggerNotificationScheduler}>
            <Play className="h-4 w-4 mr-2" />
            Run Scheduler
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="queue">Queue ({queue.length})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id} className={cn(
                "stat-card-hover border-l-4",
                template.is_active ? "border-l-accent" : "border-l-muted"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{template.name}</h3>
                        <Badge variant="outline">{getTypeLabel(template.type)}</Badge>
                        {template.channels.map((ch) => (
                          <span key={ch}>{getChannelIcon(ch)}</span>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2" dir="auto">
                        {template.message_template}
                      </p>
                      {template.trigger_days && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Triggers: {template.trigger_days.join(", ")} days before expiry
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={template.is_active}
                        onCheckedChange={() => toggleTemplateStatus(template)}
                      />
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <div className="grid gap-3">
            {queue.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No notifications in queue</p>
                </CardContent>
              </Card>
            ) : (
              queue.map((item) => (
                <Card key={item.id} className="stat-card-hover">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getChannelIcon(item.channel)}
                          <span className="font-medium">{item.recipient}</span>
                          {getStatusBadge(item.status)}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1" dir="auto">
                          {item.message}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Scheduled: {format(new Date(item.scheduled_at), "MMM d, HH:mm")}</span>
                          {item.sent_at && (
                            <span>Sent: {format(new Date(item.sent_at), "MMM d, HH:mm")}</span>
                          )}
                        </div>
                        {item.error_message && (
                          <p className="text-xs text-destructive mt-1">{item.error_message}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-4">
            {settings.map((setting) => (
              <Card key={setting.id} className="stat-card-hover">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium capitalize">
                        {setting.setting_key.replace(/_/g, " ")}
                      </h3>
                      {setting.description && (
                        <p className="text-sm text-muted-foreground">{setting.description}</p>
                      )}
                    </div>
                    <div>
                      {typeof setting.setting_value === "boolean" || setting.setting_value === "true" || setting.setting_value === "false" ? (
                        <Switch
                          checked={setting.setting_value === true || setting.setting_value === "true"}
                          onCheckedChange={(checked) => updateSetting(setting.setting_key, checked)}
                        />
                      ) : (
                        <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {JSON.stringify(setting.setting_value)}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationManager;
