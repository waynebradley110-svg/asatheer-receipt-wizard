import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, Filter, SortAsc, Users, UserCheck, UserX, Clock, Download, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Member {
  id: string;
  member_id: string;
  full_name: string;
  phone_number: string;
  gender: string;
  date_of_birth?: string;
  created_at: string;
  member_services?: Array<{
    zone: string;
    subscription_plan: string;
    start_date: string;
    expiry_date: string;
    is_active: boolean;
    coach_name?: string;
  }>;
}

interface MemberFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  filterZone: string;
  onFilterZoneChange: (value: string) => void;
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  stats: {
    total: number;
    active: number;
    expired: number;
    expiringSoon: number;
  };
  members: Member[];
  filteredMembers: Member[];
}

const ZONES = [
  { value: "gym", label: "Gym" },
  { value: "ladies_gym", label: "Ladies Gym" },
  { value: "pt", label: "Personal Training" },
  { value: "crossfit", label: "CrossFit" },
  { value: "football_student", label: "Football Academy" },
  { value: "swimming", label: "Swimming" },
  { value: "paddle_court", label: "Paddle Court" },
];

export function MemberFilters({
  search,
  onSearchChange,
  filterZone,
  onFilterZoneChange,
  filterStatus,
  onFilterStatusChange,
  sortBy,
  onSortByChange,
  stats,
  members,
  filteredMembers
}: MemberFiltersProps) {
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsMonth, setAnalyticsMonth] = useState(format(new Date(), "yyyy-MM"));

  // Calculate monthly registration stats per zone
  const monthlyStats = useMemo(() => {
    const selectedDate = new Date(analyticsMonth + "-01");
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);

    const zoneStats: Record<string, number> = {};
    let totalRegistrations = 0;

    members.forEach(member => {
      member.member_services?.forEach(service => {
        const startDate = new Date(service.start_date);
        if (startDate >= monthStart && startDate <= monthEnd) {
          zoneStats[service.zone] = (zoneStats[service.zone] || 0) + 1;
          totalRegistrations++;
        }
      });
    });

    return { zoneStats, totalRegistrations };
  }, [members, analyticsMonth]);

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      options.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy")
      });
    }
    return options;
  }, []);

  // Export to Excel
  const handleExport = () => {
    if (filteredMembers.length === 0) {
      toast.error("No members to export");
      return;
    }

    const exportData = filteredMembers.map(member => {
      const activeServices = member.member_services?.filter(s => s.is_active) || [];
      const latestService = activeServices[0];
      
      return {
        "Member ID": member.member_id,
        "Full Name": member.full_name,
        "Phone": member.phone_number,
        "Gender": member.gender,
        "Date of Birth": member.date_of_birth || "N/A",
        "Registration Date": format(new Date(member.created_at), "dd/MM/yyyy"),
        "Current Zone": latestService ? ZONES.find(z => z.value === latestService.zone)?.label || latestService.zone : "N/A",
        "Subscription Plan": latestService?.subscription_plan?.replace("_", " ") || "N/A",
        "Expiry Date": latestService ? format(new Date(latestService.expiry_date), "dd/MM/yyyy") : "N/A",
        "Status": latestService && new Date(latestService.expiry_date) >= new Date() ? "Active" : "Expired",
        "Coach": latestService?.coach_name || "N/A",
        "All Services": activeServices.map(s => `${s.zone}: ${format(new Date(s.expiry_date), "dd/MM/yyyy")}`).join("; ") || "None"
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Members");
    
    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    ws["!cols"] = colWidths;

    const fileName = `members_export_${format(new Date(), "yyyy-MM-dd_HHmm")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Exported ${filteredMembers.length} members to ${fileName}`);
  };

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-4">
        {/* Search and Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, or phone..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select value={filterStatus} onValueChange={onFilterStatusChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Zone Filter */}
          <Select value={filterZone} onValueChange={onFilterZoneChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Zones</SelectItem>
              {ZONES.map(zone => (
                <SelectItem key={zone.value} value={zone.value}>{zone.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <SortAsc className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select value={sortBy} onValueChange={onSortByChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Recently Added</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="expiry">Expiry (Soonest)</SelectItem>
                <SelectItem value="expiry_desc">Expiry (Latest)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>

        {/* Stats Summary Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="font-medium">{stats.total}</span>
              <span>members</span>
            </div>
            
            <span className="text-border">•</span>
            
            <div className="flex items-center gap-1.5 text-accent">
              <UserCheck className="h-4 w-4" />
              <span className="font-medium">{stats.active}</span>
              <span className="text-muted-foreground">active</span>
            </div>
            
            {stats.expiringSoon > 0 && (
              <>
                <span className="text-border">•</span>
                <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">{stats.expiringSoon}</span>
                  <span className="text-muted-foreground">expiring soon</span>
                </div>
              </>
            )}
            
            <span className="text-border">•</span>
            
            <div className="flex items-center gap-1.5 text-destructive">
              <UserX className="h-4 w-4" />
              <span className="font-medium">{stats.expired}</span>
              <span className="text-muted-foreground">expired</span>
            </div>
          </div>

          {/* Analytics Toggle */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Monthly Stats</span>
            {showAnalytics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Monthly Analytics Section */}
        <Collapsible open={showAnalytics}>
          <CollapsibleContent>
            <div className="pt-3 border-t border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Registrations by Zone
                </h4>
                <Select value={analyticsMonth} onValueChange={setAnalyticsMonth}>
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {ZONES.map(zone => {
                  const count = monthlyStats.zoneStats[zone.value] || 0;
                  const percentage = monthlyStats.totalRegistrations > 0 
                    ? ((count / monthlyStats.totalRegistrations) * 100).toFixed(0) 
                    : 0;
                  
                  return (
                    <div 
                      key={zone.value}
                      className="p-3 rounded-lg bg-muted/50 border border-border/50 text-center"
                    >
                      <p className="text-xs text-muted-foreground truncate">{zone.label}</p>
                      <p className="text-lg font-bold text-foreground">{count}</p>
                      {monthlyStats.totalRegistrations > 0 && (
                        <p className="text-xs text-muted-foreground">{percentage}%</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>Total registrations in {monthOptions.find(m => m.value === analyticsMonth)?.label}:</span>
                <Badge variant="secondary" className="font-bold">
                  {monthlyStats.totalRegistrations}
                </Badge>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Active Filters */}
        {(filterZone !== "all" || filterStatus !== "all" || search) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground font-medium">Filters:</span>
            {search && (
              <Badge variant="secondary" className="text-xs">
                Search: "{search}"
              </Badge>
            )}
            {filterZone !== "all" && (
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                Zone: {ZONES.find(z => z.value === filterZone)?.label || filterZone}
              </Badge>
            )}
            {filterStatus !== "all" && (
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-xs",
                  filterStatus === "active" && "bg-accent/10 text-accent",
                  filterStatus === "expiring" && "bg-orange-100 text-orange-700 dark:bg-orange-900/30",
                  filterStatus === "expired" && "bg-destructive/10 text-destructive"
                )}
              >
                Status: {filterStatus}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
