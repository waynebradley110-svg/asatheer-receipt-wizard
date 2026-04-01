import { useState, useEffect } from "react";
import { AlertTriangle, Play, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface EmergencyBannerProps {
  onStatusChange?: () => void;
}

export function EmergencyBanner({ onStatusChange }: EmergencyBannerProps) {
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    checkEmergencyStatus();
  }, []);

  const checkEmergencyStatus = async () => {
    const { data } = await supabase
      .from("notification_settings")
      .select("setting_value")
      .eq("setting_key", "emergency_closure")
      .maybeSingle();

    if (data?.setting_value && typeof data.setting_value === 'object' && 'active' in data.setting_value) {
      const val = data.setting_value as { active: boolean; start_date?: string; reason?: string };
      setEmergencyActive(val.active);
      setStartDate(val.start_date || null);
      setReason(val.reason || null);
    }
    setLoading(false);
  };

  const activateEmergencyFreeze = async () => {
    setActivating(true);
    try {
      const { data, error } = await supabase.functions.invoke("emergency-freeze");
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to activate");
      toast.success(`Emergency freeze activated! ${data.frozen} memberships frozen.`);
      setEmergencyActive(true);
      setStartDate("2026-03-31");
      setReason("Conflict in UAE");
      onStatusChange?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to activate emergency freeze");
    } finally {
      setActivating(false);
    }
  };

  const resumeAllMemberships = async () => {
    setResuming(true);
    try {
      const { data, error } = await supabase.functions.invoke("emergency-resume");
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to resume");
      toast.success(`All memberships resumed! ${data.resumed} members' expiry dates extended.`);
      setEmergencyActive(false);
      onStatusChange?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to resume memberships");
    } finally {
      setResuming(false);
    }
  };

  const daysFrozen = startDate
    ? Math.ceil((new Date().getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  if (loading) return null;

  if (!emergencyActive) {
    return (
      <Card className="border-dashed border-destructive/30">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Emergency freeze is not active.
            </span>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={activating}>
                {activating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Activate Emergency Freeze
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>⚠️ Activate Emergency Freeze?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will freeze ALL active memberships starting from 2026-03-31. 
                  No member will lose any paid time — when you resume, all expiry dates 
                  will be extended by the number of days frozen. This action is logged in the audit trail.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={activateEmergencyFreeze} className="bg-destructive text-destructive-foreground">
                  Yes, Freeze All Memberships
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive bg-destructive/5 shadow-lg shadow-destructive/10">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 animate-pulse">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-destructive">
                ⚠️ EMERGENCY CLOSURE ACTIVE
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                All memberships frozen since <strong>{startDate}</strong> ({daysFrozen} days).
                {reason && <> Reason: {reason}.</>}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                When you resume, all expiry dates will be extended by {daysFrozen} days automatically.
              </p>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="default"
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0"
                disabled={resuming}
              >
                {resuming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                Resume All Memberships
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Resume All Memberships?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will unfreeze all emergency-frozen memberships and extend each member's 
                  expiry date by <strong>{daysFrozen} days</strong>. This action is permanent and logged.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resumeAllMemberships}>
                  Yes, Resume All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
