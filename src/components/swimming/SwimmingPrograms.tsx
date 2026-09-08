import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { Pencil, Plus } from "lucide-react";
import { getGenericError } from "@/lib/errorUtils";

export interface SwimmingProgram {
  id: string;
  name: string;
  level: string | null;
  age_min: number | null;
  age_max: number | null;
  duration_weeks: number | null;
  price: number;
  max_students: number;
  coach_name: string | null;
  pool_name: string | null;
  description: string | null;
  is_active: boolean;
}

const emptyForm = {
  name: "",
  level: "",
  age_min: "",
  age_max: "",
  duration_weeks: "",
  price: "",
  max_students: "10",
  coach_name: "",
  pool_name: "",
  description: "",
  is_active: true,
};

export function SwimmingPrograms({
  openNew,
  onOpenNewHandled,
  onChanged,
}: {
  openNew?: boolean;
  onOpenNewHandled?: () => void;
  onChanged?: () => void;
}) {
  const [programs, setPrograms] = useState<SwimmingProgram[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const fetchPrograms = async () => {
    const { data, error } = await supabase
      .from("swimming_programs")
      .select("*")
      .order("name");
    if (error) {
      toast.error("Could not load swimming programs");
      return;
    }
    setPrograms((data || []) as SwimmingProgram[]);
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (openNew) {
      setEditingId(null);
      setForm({ ...emptyForm });
      setDialogOpen(true);
      onOpenNewHandled?.();
    }
  }, [openNew, onOpenNewHandled]);

  const openEdit = (p: SwimmingProgram) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      level: p.level ?? "",
      age_min: p.age_min?.toString() ?? "",
      age_max: p.age_max?.toString() ?? "",
      duration_weeks: p.duration_weeks?.toString() ?? "",
      price: p.price?.toString() ?? "",
      max_students: p.max_students?.toString() ?? "10",
      coach_name: p.coach_name ?? "",
      pool_name: p.pool_name ?? "",
      description: p.description ?? "",
      is_active: p.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Program name is required");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      level: form.level.trim() || null,
      age_min: form.age_min ? Number(form.age_min) : null,
      age_max: form.age_max ? Number(form.age_max) : null,
      duration_weeks: form.duration_weeks ? Number(form.duration_weeks) : null,
      price: form.price ? Number(form.price) : 0,
      max_students: form.max_students ? Number(form.max_students) : 10,
      coach_name: form.coach_name.trim() || null,
      pool_name: form.pool_name.trim() || null,
      description: form.description.trim() || null,
      is_active: form.is_active,
    };

    const { error } = editingId
      ? await supabase.from("swimming_programs").update(payload).eq("id", editingId)
      : await supabase.from("swimming_programs").insert([payload]);

    setSaving(false);
    if (error) {
      toast.error(getGenericError(error, "Could not save program"));
      return;
    }
    toast.success(editingId ? "Program updated" : "Program created");
    setDialogOpen(false);
    fetchPrograms();
    onChanged?.();
  };

  const toggleActive = async (p: SwimmingProgram) => {
    const { error } = await supabase
      .from("swimming_programs")
      .update({ is_active: !p.is_active })
      .eq("id", p.id);
    if (error) {
      toast.error("Could not update program");
      return;
    }
    fetchPrograms();
    onChanged?.();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Swimming Programs</CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setEditingId(null);
            setForm({ ...emptyForm });
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> New Program
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Program</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Ages</TableHead>
              <TableHead>Weeks</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Max</TableHead>
              <TableHead>Coach</TableHead>
              <TableHead>Pool</TableHead>
              <TableHead>Active</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.level || "-"}</TableCell>
                <TableCell>
                  {p.age_min ?? "?"}–{p.age_max ?? "?"}
                </TableCell>
                <TableCell>{p.duration_weeks ?? "-"}</TableCell>
                <TableCell>{Number(p.price || 0).toFixed(0)} AED</TableCell>
                <TableCell>{p.max_students}</TableCell>
                <TableCell>{p.coach_name || "-"}</TableCell>
                <TableCell>{p.pool_name || "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                    <Badge variant={p.is_active ? "default" : "secondary"}>
                      {p.is_active ? "Active" : "Off"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {programs.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  No programs yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Program" : "New Program"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Program Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Level</Label>
                <Input
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                  placeholder="beginner"
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (weeks)</Label>
                <Input
                  type="number"
                  value={form.duration_weeks}
                  onChange={(e) => setForm({ ...form, duration_weeks: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Min Age</Label>
                <Input
                  type="number"
                  value={form.age_min}
                  onChange={(e) => setForm({ ...form, age_min: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Age</Label>
                <Input
                  type="number"
                  value={form.age_max}
                  onChange={(e) => setForm({ ...form, age_max: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Price (AED)</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Students</Label>
                <Input
                  type="number"
                  value={form.max_students}
                  onChange={(e) => setForm({ ...form, max_students: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Coach</Label>
                <Input
                  value={form.coach_name}
                  onChange={(e) => setForm({ ...form, coach_name: e.target.value })}
                  placeholder="Coach name"
                />
              </div>
              <div className="space-y-2">
                <Label>Pool</Label>
                <Input
                  value={form.pool_name}
                  onChange={(e) => setForm({ ...form, pool_name: e.target.value })}
                  placeholder="Main Pool"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>Active</Label>
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
    </Card>
  );
}
