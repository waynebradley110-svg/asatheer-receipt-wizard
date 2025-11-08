import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, UserCog, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Coach {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

const CoachManagement = () => {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCoachName, setNewCoachName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCoaches();
  }, []);

  const fetchCoaches = async () => {
    const { data, error } = await supabase
      .from("coaches")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Error fetching coaches");
      console.error(error);
    } else {
      setCoaches(data || []);
    }
  };

  const handleAddCoach = async () => {
    if (!newCoachName.trim()) {
      toast.error("Please enter a coach name");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("coaches")
      .insert({ name: newCoachName.trim(), is_active: true });

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("A coach with this name already exists");
      } else {
        toast.error("Error adding coach");
        console.error(error);
      }
    } else {
      toast.success("Coach added successfully");
      setNewCoachName("");
      setDialogOpen(false);
      fetchCoaches();
    }
  };

  const handleToggleStatus = async (coach: Coach) => {
    const { error } = await supabase
      .from("coaches")
      .update({ is_active: !coach.is_active })
      .eq("id", coach.id);

    if (error) {
      toast.error("Error updating coach status");
      console.error(error);
    } else {
      toast.success(`Coach ${coach.is_active ? "deactivated" : "activated"}`);
      fetchCoaches();
    }
  };

  const handleDeleteCoach = async (coachId: string) => {
    const { error } = await supabase
      .from("coaches")
      .delete()
      .eq("id", coachId);

    if (error) {
      toast.error("Error deleting coach");
      console.error(error);
    } else {
      toast.success("Coach deleted successfully");
      fetchCoaches();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Coach Management</h1>
          <p className="text-muted-foreground">Manage PT coaches and their status</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Coach
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Coach</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="coach_name">Coach Name</Label>
                <Input
                  id="coach_name"
                  placeholder="Enter coach name"
                  value={newCoachName}
                  onChange={(e) => setNewCoachName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddCoach()}
                />
              </div>
              <Button onClick={handleAddCoach} disabled={loading} className="w-full">
                {loading ? "Adding..." : "Add Coach"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Coaches List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {coaches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No coaches found. Add your first coach to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coaches.map((coach) => (
                  <TableRow key={coach.id}>
                    <TableCell className="font-medium">{coach.name}</TableCell>
                    <TableCell>
                      <Badge variant={coach.is_active ? "default" : "secondary"}>
                        {coach.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(coach.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(coach)}
                      >
                        {coach.is_active ? (
                          <>
                            <ToggleRight className="h-4 w-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-4 w-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the coach "{coach.name}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCoach(coach.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CoachManagement;
