import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BookSessionDialogProps {
  sessionId: string;
  sessionTitle: string;
  maxCapacity: number;
  currentBookings: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBooked: () => void;
}

export function BookSessionDialog({ sessionId, sessionTitle, maxCapacity, currentBookings, open, onOpenChange, onBooked }: BookSessionDialogProps) {
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<{ id: string; full_name: string; member_id: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!search || search.length < 2) {
      setMembers([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("members")
        .select("id, full_name, member_id")
        .or(`full_name.ilike.%${search}%,member_id.ilike.%${search}%,phone_number.ilike.%${search}%`)
        .limit(10);
      if (data) setMembers(data);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const bookMember = async (memberId: string) => {
    if (currentBookings >= maxCapacity) {
      toast.error("Session is full!");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("session_bookings").insert({
      session_id: sessionId,
      member_id: memberId,
      status: "booked",
    });
    setLoading(false);
    if (error) {
      if (error.code === "23505") toast.error("Member already booked");
      else toast.error("Failed to book member");
    } else {
      toast.success("Member booked!");
      onBooked();
      onOpenChange(false);
      setSearch("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Book Member — {sessionTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline">{currentBookings}/{maxCapacity} booked</Badge>
        </div>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Search Member</Label>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, ID, or phone..." />
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {members.map(m => (
              <button
                key={m.id}
                onClick={() => bookMember(m.id)}
                disabled={loading}
                className="w-full flex items-center justify-between p-2 rounded-md hover:bg-accent text-left text-sm"
              >
                <span className="font-medium">{m.full_name}</span>
                <span className="text-muted-foreground text-xs">{m.member_id}</span>
              </button>
            ))}
            {search.length >= 2 && members.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No members found</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
