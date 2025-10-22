import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp, Users, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ZoneStats {
  zone: string;
  totalRevenue: number;
  activeMembers: number;
  totalMembers: number;
  averageRevenue: number;
  growth: number;
}

export function ZoneAnalysis() {
  const [zoneStats, setZoneStats] = useState<ZoneStats[]>([]);

  useEffect(() => {
    fetchZoneAnalysis();
  }, []);

  const fetchZoneAnalysis = async () => {
    const { data: payments } = await supabase
      .from("payment_receipts")
      .select("zone, amount");

    const { data: members } = await supabase
      .from("members")
      .select("*, member_services(zone, expiry_date, is_active)");

    const zones = ["gym", "ladies_gym", "pt", "crossfit", "football", "basketball", "swimming", "other"];
    
    const stats = zones.map((zone) => {
      const zonePayments = payments?.filter((p) => p.zone === zone) || [];
      const totalRevenue = zonePayments.reduce((sum, p) => sum + Number(p.amount), 0);
      
      const zoneMembers = members?.filter((m) => 
        m.member_services?.some((s: any) => s.zone === zone)
      ) || [];
      
      const activeMembers = zoneMembers.filter((m) =>
        m.member_services?.some((s: any) => 
          s.zone === zone && 
          new Date(s.expiry_date) >= new Date() && 
          s.is_active
        )
      ).length;

      return {
        zone,
        totalRevenue,
        activeMembers,
        totalMembers: zoneMembers.length,
        averageRevenue: zoneMembers.length > 0 ? totalRevenue / zoneMembers.length : 0,
        growth: 0, // Can be calculated with historical data
      };
    });

    setZoneStats(stats.sort((a, b) => b.totalRevenue - a.totalRevenue));
  };

  const formatZoneName = (zone: string) => {
    return zone.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Advanced Zone Analysis</h2>
          <p className="text-muted-foreground">Detailed performance by zone</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {zoneStats.map((stat) => (
          <Card key={stat.zone} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{formatZoneName(stat.zone)}</CardTitle>
                <Badge variant={stat.activeMembers > 10 ? "default" : "secondary"}>
                  {stat.activeMembers > 10 ? "High" : "Growing"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>Total Revenue</span>
                  </div>
                  <span className="font-bold text-green-600">
                    {stat.totalRevenue.toFixed(2)} AED
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Active Members</span>
                  </div>
                  <span className="font-semibold">
                    {stat.activeMembers} / {stat.totalMembers}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span>Avg Revenue/Member</span>
                  </div>
                  <span className="font-semibold">
                    {stat.averageRevenue.toFixed(2)} AED
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Occupancy Rate</span>
                  <span className="font-semibold">
                    {stat.totalMembers > 0 
                      ? ((stat.activeMembers / stat.totalMembers) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
