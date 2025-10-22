import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export function ExcelBackup() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      // Fetch all data
      const [membersRes, servicesRes, paymentsRes, attendanceRes] = await Promise.all([
        supabase.from("members").select("*").order("created_at", { ascending: false }),
        supabase.from("member_services").select("*, members(member_id, full_name)").order("created_at", { ascending: false }),
        supabase.from("payment_receipts").select("*, members(member_id, full_name)").order("created_at", { ascending: false }),
        supabase.from("attendance").select("*, members(member_id, full_name)").order("created_at", { ascending: false })
      ]);

      if (membersRes.error) throw membersRes.error;
      if (servicesRes.error) throw servicesRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      if (attendanceRes.error) throw attendanceRes.error;

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Sheet 1: Members
      const membersData = membersRes.data?.map(m => ({
        "Member ID": m.member_id,
        "Full Name": m.full_name,
        "Phone Number": m.phone_number,
        "Gender": m.gender,
        "Date of Birth": m.date_of_birth || "N/A",
        "Barcode": m.barcode,
        "Notes": m.notes || "",
        "Created At": new Date(m.created_at || "").toLocaleString(),
        "Updated At": new Date(m.updated_at || "").toLocaleString()
      })) || [];
      const ws1 = XLSX.utils.json_to_sheet(membersData);
      XLSX.utils.book_append_sheet(wb, ws1, "Members");

      // Sheet 2: Active Services
      const servicesData = servicesRes.data?.map((s: any) => ({
        "Member ID": s.members?.member_id || "N/A",
        "Member Name": s.members?.full_name || "N/A",
        "Zone": s.zone,
        "Subscription Plan": s.subscription_plan,
        "Start Date": s.start_date,
        "Expiry Date": s.expiry_date,
        "Is Active": s.is_active ? "Yes" : "No",
        "Created At": new Date(s.created_at || "").toLocaleString()
      })) || [];
      const ws2 = XLSX.utils.json_to_sheet(servicesData);
      XLSX.utils.book_append_sheet(wb, ws2, "Member Services");

      // Sheet 3: Payment History
      const paymentsData = paymentsRes.data?.map((p: any) => ({
        "Transaction ID": p.transaction_id || "N/A",
        "Member ID": p.members?.member_id || "N/A",
        "Member Name": p.members?.full_name || "N/A",
        "Amount (AED)": p.amount,
        "Payment Method": p.payment_method,
        "Zone": p.zone,
        "Subscription Plan": p.subscription_plan,
        "Cashier": p.cashier_name || "N/A",
        "Created At": new Date(p.created_at || "").toLocaleString()
      })) || [];
      const ws3 = XLSX.utils.json_to_sheet(paymentsData);
      XLSX.utils.book_append_sheet(wb, ws3, "Payment History");

      // Sheet 4: Attendance Log
      const attendanceData = attendanceRes.data?.map((a: any) => ({
        "Member ID": a.members?.member_id || "N/A",
        "Member Name": a.members?.full_name || "N/A",
        "Check-in Time": new Date(a.check_in_time || "").toLocaleString(),
        "Zone": a.zone || "N/A",
        "Status": a.status || "N/A",
        "Created At": new Date(a.created_at || "").toLocaleString()
      })) || [];
      const ws4 = XLSX.utils.json_to_sheet(attendanceData);
      XLSX.utils.book_append_sheet(wb, ws4, "Attendance Log");

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const filename = `academy_backup_${timestamp}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);

      toast.success("Backup exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export backup. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Excel Backup</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Export all member data, services, payments, and attendance records to Excel format.
          This creates a complete backup of your system data.
        </p>
      </div>

      <Button 
        onClick={exportToExcel} 
        disabled={isExporting}
        className="gap-2"
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Export to Excel
          </>
        )}
      </Button>

      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-2">Backup includes:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• All member information and contact details</li>
          <li>• Active and expired service subscriptions</li>
          <li>• Complete payment history and receipts</li>
          <li>• Attendance logs and check-in records</li>
        </ul>
      </div>
    </div>
  );
}
