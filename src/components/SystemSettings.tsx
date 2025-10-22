import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Settings, Save } from "lucide-react";

export function SystemSettings() {
  const [settings, setSettings] = useState({
    academyName: "Asatheer Sports Academy",
    whatsappNumber: "0544765671",
    currency: "AED",
    autoExpiryReminders: true,
    reminderDaysBefore: "3",
    receiptPrefix: "ASA",
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save to localStorage for now
      localStorage.setItem("systemSettings", JSON.stringify(settings));
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Error saving settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem("systemSettings");
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <CardTitle>System Settings</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="academyName">Academy Name</Label>
            <Input
              id="academyName"
              value={settings.academyName}
              onChange={(e) => setSettings({ ...settings, academyName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsappNumber">WhatsApp Business Number</Label>
            <Input
              id="whatsappNumber"
              value={settings.whatsappNumber}
              onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
              placeholder="05xxxxxxxx"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receiptPrefix">Receipt Prefix</Label>
            <Input
              id="receiptPrefix"
              value={settings.receiptPrefix}
              onChange={(e) => setSettings({ ...settings, receiptPrefix: e.target.value })}
              placeholder="ASA"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminderDays">Expiry Reminder Days Before</Label>
            <Input
              id="reminderDays"
              type="number"
              value={settings.reminderDaysBefore}
              onChange={(e) => setSettings({ ...settings, reminderDaysBefore: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Expiry Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Automatically show expiry reminders on dashboard
              </p>
            </div>
            <Switch
              checked={settings.autoExpiryReminders}
              onCheckedChange={(checked) => setSettings({ ...settings, autoExpiryReminders: checked })}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
