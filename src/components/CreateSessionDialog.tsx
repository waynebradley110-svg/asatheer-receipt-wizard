import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Coach {
  id: string;
  name: string;
}

interface CreateSessionDialogProps {
  onCreated: () => void;
}

const sessionTypes = [
  { value: "pt", label: "Personal Training" },
  { value: "football", label: "Football" },
  { value: "crossfit", label: "CrossFit" },
  { value: "swimming", label: "Swimming" },
  { value: "paddle", label: "Paddle" },
];

export function CreateSessionDialog({ onCreated }: CreateSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    session_type: "",
    session_date: "",
    start_time: "",
    end_time: "",
    coach_id: "",
    max_capacity: "10",
    zone: "",
    notes: "",
  });

  useEffect(() => {
    supabase.from("coaches").select("id, name").eq("is_active", true).then(({ data }) => {
      if (data) setCoaches(data);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.session_type || !form.session_date || !form.start_time || !form.end_time) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("sessions").insert({
      title: form.title,
      session_type: form.session_type,
      session_date: form.session_date,
      start_time: form.start_time,
      end_time: form.end_time,
      coach_id: form.coach_id || null,
      max_capacity: parseInt(form.max_capacity) || 10,
      zone: form.zone || null,
      notes: form.notes || null,
    });
    setLoading(false);
    if (error) {
      toast.error("Failed to create session");
      console.error(error);
    } else {
      toast.success("Session created!");
      setOpen(false);
      setForm({ title: "", session_type: "", session_date: "", start_time: "", end_time: "", coach_id: "", max_capacity: "10", zone: "", notes: "" });
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> New Session</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Session</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Football 5v5" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={form.session_type} onValueChange={v => setForm(f => ({ ...f, session_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {sessionTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={form.session_date} onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>End Time *</Label>
              <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Coach</Label>
              <Select value={form.coach_id} onValueChange={v => setForm(f => ({ ...f, coach_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select coach" /></SelectTrigger>
                <SelectContent>
                  {coaches.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Max Capacity</Label>
              <Input type="number" value={form.max_capacity} onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Session"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
