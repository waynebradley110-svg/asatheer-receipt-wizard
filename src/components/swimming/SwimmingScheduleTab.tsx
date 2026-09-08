import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import { CalendarClock, Pencil, Plus, Users } from "lucide-react";
import { getGenericError } from "@/lib/errorUtils";
import {
  DAY_NAMES,
  Occurrence,
  expandClassOccurrences,
  formatTime,
  SwimClassException,
} from "@/lib/swimmingSchedule";

export interface SwimmingClassRow {
  id: string;
  title: string | null;
  program_id: string | null;
  coach_name: string | null;
  pool_name: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  capacity: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  notes: string | null;
}

const emptyForm = {
  title: "",
  program_id: "",
  coach_name: "",
  pool_name: "",
  day_of_week: "1",
  start_time: "16:00",
  end_time: "17:00",
  capacity: "10",
  start_date: format(new Date(), "yyyy-MM-dd"),
  end_date: "",
};

export function SwimmingScheduleTab({
  programs,
  openNew,
  onOpenNewHandled,
  onChanged,
}: {
  programs: { id: string; name: string }[];
  openNew?: boolean;
  onOpenNewHandled?: () => void;
  onChanged?: () => void;
}) {
  const [classes, setClasses] = useState<SwimmingClassRow[]>([]);
  const [exceptions, setExceptions] = useState<(SwimClassException & { class_id: string })[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [exDialog, setExDialog] = useState<Occurrence | null>(null);
  const [exForm, setExForm] = useState({
    status: "cancelled",
    new_date: "",
    new_start_time: "",
    new_end_time: "",
    reason: "",
  });

  const fetchAll = async () => {
    const [cls, exc, enr] = await Promise.all([
      supabase.from("swimming_classes").select("*").order("day_of_week"),
      supabase.from("swimming_class_exceptions").select("*"),
      supabase.from("swimming_enrollments").select("class_id").eq("status", "active"),
    ]);
    if (cls.error) {
      toast.error("Could not load swimming classes");
      return;
    }
    setClasses((cls.data || []) as SwimmingClassRow[]);
    setExceptions((exc.data || []) as any);
    const tally: Record<string, number> = {};
    (enr.data || []).forEach((r: any) => {
      tally[r.class_id] = (tally[r.class_id] || 0) + 1;
    });
    setCounts(tally);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (openNew) {
      setEditingId(null);
      setForm({ ...emptyForm });
      setDialogOpen(true);
      onOpenNewHandled?.();
    }
  }, [openNew, onOpenNewHandled]);

  const programName = (id: string | null) =>
    programs.find((p) => p.id === id)?.name ?? null;

  const upcoming = useMemo(() => {
    const enriched = classes
      .filter((c) => c.is_active)
      .map((c) => ({
        ...c,
        program: programName(c.program_id),
        exceptions: exceptions.filter((e) => e.class_id === c.id),
      }));
    return expandClassOccurrences(enriched, new Date(), addDays(new Date(), 28));
  }, [classes, exceptions, programs]);

  const openEdit = (c: SwimmingClassRow) => {
    setEditingId(c.id);
    setForm({
      title: c.title ?? "",
      program_id: c.program_id ?? "",
      coach_name: c.coach_name ?? "",
      pool_name: c.pool_name ?? "",
      day_of_week: String(c.day_of_week),
      start_time: c.start_time.slice(0, 5),
      end_time: c.end_time.slice(0, 5),
      capacity: String(c.capacity),
      start_date: c.start_date,
      end_date: c.end_date ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.start_time || !form.end_time) {
      toast.error("Start and end time are required");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim() || null,
      program_id: form.program_id || null,
      coach_name: form.coach_name.trim() || null,
      pool_name: form.pool_name.trim() || null,
      day_of_week: Number(form.day_of_week),
      start_time: form.start_time,
      end_time: form.end_time,
      capacity: Number(form.capacity) || 10,
      start_date: form.start_date,
      end_date: form.end_date || null,
    };
    const { error } = editingId
      ? await supabase.from("swimming_classes").update(payload).eq("id", editingId)
      : await supabase.from("swimming_classes").insert([payload]);
    setSaving(false);
    if (error) {
      toast.error(getGenericError(error, "Could not save class"));
      return;
    }
    toast.success(editingId ? "Class updated — schedules follow automatically" : "Class created");
    setDialogOpen(false);
    fetchAll();
    onChanged?.();
  };

  const toggleActive = async (c: SwimmingClassRow) => {
    const { error } = await supabase
      .from("swimming_classes")
      .update({ is_active: !c.is_active })
      .eq("id", c.id);
    if (error) return toast.error("Could not update class");
    fetchAll();
  };

  const openException = (o: Occurrence) => {
    setExDialog(o);
    setExForm({
      status: "cancelled",
      new_date: o.date,
      new_start_time: o.startTime.slice(0, 5),
      new_end_time: o.endTime.slice(0, 5),
      reason: "",
    });
  };

  const saveException = async () => {
    if (!exDialog) return;
    const payload = {
      class_id: exDialog.classId,
      original_date: exDialog.originalDate,
      status: exForm.status,
      new_date: exForm.status === "rescheduled" ? exForm.new_date || null : null,
      new_start_time: exForm.status === "rescheduled" ? exForm.new_start_time || null : null,
      new_end_time: exForm.status === "rescheduled" ? exForm.new_end_time || null : null,
      reason: exForm.reason.trim() || null,
    };
    const { error } = await supabase
      .from("swimming_class_exceptions")
      .upsert(payload, { onConflict: "class_id,original_date" });
    if (error) {
      toast.error(getGenericError(error, "Could not save change"));
      return;
    }
    toast.success("Saved — parent calendars updated");
    setExDialog(null);
    fetchAll();
  };

  const clearException = async (o: Occurrence) => {
    const { error } = await supabase
      .from("swimming_class_exceptions")
      .delete()
      .eq("class_id", o.classId)
      .eq("original_date", o.originalDate);
    if (error) return toast.error("Could not restore class");
    toast.success("Class restored");
    fetchAll();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Weekly Classes</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setEditingId(null);
              setForm({ ...emptyForm });
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> New Class
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Day</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Coach</TableHead>
                <TableHead>Pool</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Runs</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((c) => (
                <TableRow key={c.id} className={c.is_active ? "" : "opacity-50"}>
                  <TableCell className="font-medium">{c.title || "Swimming Class"}</TableCell>
                  <TableCell>{programName(c.program_id) || "-"}</TableCell>
                  <TableCell>{DAY_NAMES[c.day_of_week]}</TableCell>
                  <TableCell>
                    {formatTime(c.start_time)} – {formatTime(c.end_time)}
                  </TableCell>
                  <TableCell>{c.coach_name || "-"}</TableCell>
                  <TableCell>{c.pool_name || "-"}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {counts[c.id] || 0}/{c.capacity}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(c.start_date), "dd/MM/yy")} →{" "}
                    {c.end_date ? format(new Date(c.end_date), "dd/MM/yy") : "ongoing"}
                  </TableCell>
                  <TableCell className="space-x-2 whitespace-nowrap">
                    <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(c)}>
                      {c.is_active ? "Disable" : "Enable"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {classes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No classes yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" /> Next 4 Weeks
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Day</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Coach</TableHead>
                <TableHead>Pool</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcoming.map((o, i) => (
                <TableRow key={`${o.classId}-${o.originalDate}-${i}`}>
                  <TableCell>{format(new Date(o.date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{DAY_NAMES[new Date(o.date).getDay()]}</TableCell>
                  <TableCell>{o.className}</TableCell>
                  <TableCell>
                    {formatTime(o.startTime)} – {formatTime(o.endTime)}
                  </TableCell>
                  <TableCell>{o.coach || "-"}</TableCell>
                  <TableCell>{o.pool || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        o.status === "cancelled"
                          ? "destructive"
                          : o.status === "rescheduled"
                            ? "secondary"
                            : "default"
                      }
                    >
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {o.status === "scheduled" ? (
                      <Button variant="outline" size="sm" onClick={() => openException(o)}>
                        Cancel / Move
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => clearException(o)}>
                        Restore
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {upcoming.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No upcoming classes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Class" : "New Class"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Class Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Kids Beginner - Afternoon"
              />
            </div>
            <div className="space-y-2">
              <Label>Program</Label>
              <Select
                value={form.program_id}
                onValueChange={(v) => setForm({ ...form, program_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select
                  value={form.day_of_week}
                  onValueChange={(v) => setForm({ ...form, day_of_week: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_NAMES.map((d, i) => (
                      <SelectItem key={d} value={String(i)}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Coach</Label>
                <Input
                  value={form.coach_name}
                  onChange={(e) => setForm({ ...form, coach_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Pool</Label>
                <Input
                  value={form.pool_name}
                  onChange={(e) => setForm({ ...form, pool_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!exDialog} onOpenChange={(o) => !o && setExDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {exDialog && format(new Date(exDialog.date), "dd MMM yyyy")} — Cancel or Move
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>What happened?</Label>
              <Select value={exForm.status} onValueChange={(v) => setExForm({ ...exForm, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {exForm.status === "rescheduled" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>New Date</Label>
                  <Input
                    type="date"
                    value={exForm.new_date}
                    onChange={(e) => setExForm({ ...exForm, new_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Start</Label>
                  <Input
                    type="time"
                    value={exForm.new_start_time}
                    onChange={(e) => setExForm({ ...exForm, new_start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>New End</Label>
                  <Input
                    type="time"
                    value={exForm.new_end_time}
                    onChange={(e) => setExForm({ ...exForm, new_end_time: e.target.value })}
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input
                value={exForm.reason}
                onChange={(e) => setExForm({ ...exForm, reason: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExDialog(null)}>
              Cancel
            </Button>
            <Button onClick={saveException}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
