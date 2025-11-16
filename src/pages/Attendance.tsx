import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, CameraOff, CheckCircle2, XCircle, Clock, Keyboard, Users, Activity, UserCheck, Dumbbell } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MemberInfo {
  id: string;
  member_id: string;
  full_name: string;
  phone_number: string;
  barcode: string;
  status: 'active' | 'expired';
  expiryDate: string;
  zone: string;
}

const Attendance = () => {
  const [scanning, setScanning] = useState(false);
  const [scannedMember, setScannedMember] = useState<MemberInfo | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [manualInput, setManualInput] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRecentAttendance();
  }, []);

  useEffect(() => {
    return () => {
      stopScanning();
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
    };
  }, []);

  const fetchRecentAttendance = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("attendance")
      .select("*, members(full_name, member_id)")
      .gte("check_in_time", today.toISOString())
      .order("check_in_time", { ascending: false })
      .limit(10);

    if (!error && data) {
      setRecentAttendance(data);
    }
  };

  const startScanning = async () => {
    try {
      if (!videoRef.current) return;

      codeReaderRef.current = new BrowserMultiFormatReader();
      setScanning(true);

      await codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        async (result, error) => {
          if (result) {
            const barcode = result.getText();
            await handleBarcodeScanned(barcode);
          }
        }
      );
    } catch (error) {
      console.error("Error starting scanner:", error);
      toast.error("Failed to start camera. Please check permissions.");
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReaderRef.current) {
      // Stop all video streams
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      codeReaderRef.current = null;
    }
    setScanning(false);
  };

  const handleBarcodeScanned = async (barcode: string) => {
    // Stop scanning temporarily to process
    stopScanning();
    setManualInput("");

    try {
      // Fetch member by barcode or member_id
      let member;
      let memberError;

      // Try barcode first
      const barcodeResult = await supabase
        .from("members")
        .select("*, member_services(*)")
        .eq("barcode", barcode)
        .maybeSingle();

      if (barcodeResult.data) {
        member = barcodeResult.data;
        memberError = barcodeResult.error;
      } else {
        // Try member_id if barcode not found
        const idResult = await supabase
          .from("members")
          .select("*, member_services(*)")
          .eq("member_id", barcode)
          .maybeSingle();
        
        member = idResult.data;
        memberError = idResult.error;
      }

      if (memberError || !member) {
        toast.error("Member not found!");
        setScannedMember(null);
        // Resume scanning after 2 seconds
        setTimeout(() => startScanning(), 2000);
        return;
      }

      // Check active service
      const activeService = member.member_services?.find((s: any) => 
        new Date(s.expiry_date) >= new Date() && s.is_active
      );

      const status = activeService ? 'active' : 'expired';
      const expiryDate = activeService?.expiry_date || 'N/A';
      const zone = activeService?.zone || 'N/A';

      const memberInfo: MemberInfo = {
        id: member.id,
        member_id: member.member_id,
        full_name: member.full_name,
        phone_number: member.phone_number,
        barcode: member.barcode,
        status,
        expiryDate,
        zone,
      };

      // Record attendance
      const { error: attendanceError } = await supabase
        .from("attendance")
        .insert({
          member_id: member.id,
          zone: zone !== 'N/A' ? zone : null,
          status,
        });

      if (attendanceError) {
        console.error("Error recording attendance:", attendanceError);
      }

      // Show member info
      setScannedMember(memberInfo);

      // Play sound based on status
      if (status === 'active') {
        toast.success(`Welcome ${member.full_name}!`);
      } else {
        toast.error(`Membership Expired - ${member.full_name}`);
      }

      // Refresh recent attendance
      fetchRecentAttendance();

      // Clear display and resume scanning after 2 seconds
      clearTimeoutRef.current = setTimeout(() => {
        setScannedMember(null);
        startScanning();
      }, 2000);

    } catch (error) {
      console.error("Error processing barcode:", error);
      toast.error("Error processing scan");
      // Resume scanning after 2 seconds
      setTimeout(() => startScanning(), 2000);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleBarcodeScanned(manualInput.trim());
    }
  };

  return (
    <div className="space-y-6 dashboard-section">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-accent/10 via-primary/5 to-transparent p-8 border border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 border-2 border-accent/20">
              <Activity className="h-8 w-8 text-accent" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Attendance Scanner
              </h1>
              <p className="text-muted-foreground text-lg mt-1">
                Scan member barcodes or enter manually for check-in
              </p>
            </div>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-sm text-muted-foreground">Today's Check-ins</p>
            <p className="text-3xl font-bold text-accent">
              {recentAttendance.length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scanner Section */}
        <Card className="border-l-4 border-l-accent/30 stat-card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-accent/10">
                <Camera className="h-5 w-5 text-accent" />
              </div>
              Barcode Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {scanning ? (
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Camera not active</p>
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={scanning ? stopScanning : startScanning}
              className="w-full"
              size="lg"
            >
              {scanning ? (
                <>
                  <CameraOff className="h-5 w-5 mr-2" />
                  Stop Scanner
                </>
              ) : (
                <>
                  <Camera className="h-5 w-5 mr-2" />
                  Start Scanner
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Keyboard className="h-4 w-4" />
                  <span>External Scanner / Manual Entry</span>
                </div>
                <Input
                  ref={inputRef}
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Scan barcode or enter Member ID..."
                  className="text-center font-mono"
                  autoFocus={!scanning}
                />
              </div>
              <Button type="submit" className="w-full" disabled={!manualInput.trim()}>
                Check In
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Scanned Member Info */}
        <Card className="border-l-4 border-l-primary/30 stat-card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
              Member Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scannedMember ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center mb-6">
                  {scannedMember.status === 'active' ? (
                    <CheckCircle2 className="h-20 w-20 text-accent" />
                  ) : (
                    <XCircle className="h-20 w-20 text-destructive" />
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={scannedMember.status === 'active' ? "default" : "destructive"}
                      className={cn(
                        scannedMember.status === 'active' 
                          ? "bg-accent/90 hover:bg-accent text-white flex items-center gap-1" 
                          : "bg-destructive/90 hover:bg-destructive flex items-center gap-1"
                      )}
                    >
                      {scannedMember.status === 'active' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {scannedMember.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Member ID</span>
                    <span className="font-semibold">{scannedMember.member_id}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Name</span>
                    <span className="font-semibold">{scannedMember.full_name}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Phone</span>
                    <span className="font-semibold">{scannedMember.phone_number}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Zone</span>
                    <Badge variant="outline" className="font-semibold bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                      <Dumbbell className="h-3 w-3" />
                      {scannedMember.zone.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Expiry Date</span>
                    <span className="font-semibold">
                      {scannedMember.expiryDate !== 'N/A' 
                        ? new Date(scannedMember.expiryDate).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="text-center text-sm text-muted-foreground mt-4">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Clearing in 2 seconds...
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Scan a barcode to view member information</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Check-ins */}
      <Card className="border-l-4 border-l-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <span>Today's Check-ins</span>
            <Badge variant="secondary" className="ml-2 bg-accent/10 text-accent">
              {recentAttendance.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAttendance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No check-ins yet today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentAttendance.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {record.status === 'active' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <div>
                      <p className="font-semibold">{record.members?.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {record.members?.member_id}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={record.status === 'active' ? 'default' : 'destructive'}>
                      {record.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(record.check_in_time).toLocaleTimeString()}
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

export default Attendance;