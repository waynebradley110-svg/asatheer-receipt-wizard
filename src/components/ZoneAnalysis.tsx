import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp, Users, DollarSign, Dumbbell, Heart, Trophy, Activity, Target, Waves, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

    const zones = ["gym", "ladies_gym", "pt", "crossfit", "football_court", "football", "football_student", "swimming", "paddle_court"];
    
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
    if (zone === "football") return "Football Academy";
    return zone.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getZoneIcon = (zone: string) => {
    const icons: Record<string, any> = {
      gym: Dumbbell,
      ladies_gym: Heart,
      pt: UserCheck,
      crossfit: Activity,
      football_court: Trophy,
      football: Target,
      football_student: Target,
      swimming: Waves,
      paddle_court: Activity
    };
    return icons[zone] || Dumbbell;
  };

  const getZoneColor = (zone: string) => {
    const colors: Record<string, string> = {
      gym: "performance",
      ladies_gym: "wellness",
      pt: "energy",
      crossfit: "power",
      football_court: "performance",
      football: "performance",
      football_student: "performance",
      swimming: "primary",
      paddle_court: "energy"
    };
    return colors[zone] || "performance";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Advanced Zone Analysis</h2>
          <p className="text-muted-foreground">Detailed performance by zone</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {zoneStats.map((stat) => {
          const ZoneIcon = getZoneIcon(stat.zone);
          const colorScheme = getZoneColor(stat.zone);
          
          return (
            <Card 
              key={stat.zone} 
              className={cn(
                "stat-card-hover relative overflow-hidden border-l-4",
                colorScheme === "energy" && "border-l-accent glow-green",
                colorScheme === "performance" && "border-l-primary glow-blue",
                colorScheme === "wellness" && "border-l-[hsl(var(--wellness))]",
                colorScheme === "power" && "border-l-[hsl(var(--power))] glow-orange"
              )}
            >
              {/* Gradient overlay */}
              <div 
                className={cn(
                  "absolute top-0 right-0 w-32 h-32 opacity-5 blur-2xl rounded-full",
                  colorScheme === "energy" && "bg-accent",
                  colorScheme === "performance" && "bg-primary",
                  colorScheme === "wellness" && "bg-[hsl(var(--wellness))]",
                  colorScheme === "power" && "bg-[hsl(var(--power))]"
                )}
              />
              
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className={cn(
                        "p-2 rounded-lg",
                        colorScheme === "energy" && "bg-accent/10",
                        colorScheme === "performance" && "bg-primary/10",
                        colorScheme === "wellness" && "bg-[hsl(var(--wellness))]/10",
                        colorScheme === "power" && "bg-[hsl(var(--power))]/10"
                      )}
                    >
                      <ZoneIcon 
                        className={cn(
                          "h-5 w-5",
                          colorScheme === "energy" && "text-accent",
                          colorScheme === "performance" && "text-primary",
                          colorScheme === "wellness" && "text-[hsl(var(--wellness))]",
                          colorScheme === "power" && "text-[hsl(var(--power))]"
                        )}
                      />
                    </div>
                    <CardTitle className="text-lg">{formatZoneName(stat.zone)}</CardTitle>
                  </div>
                  <Badge 
                    variant={stat.activeMembers > 10 ? "default" : "secondary"}
                    className={cn(
                      stat.activeMembers > 10 && "bg-accent/90 text-white"
                    )}
                  >
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
                    <span className="font-bold text-accent">
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
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>Occupancy Rate</span>
                    <span className="font-semibold">
                      {stat.totalMembers > 0 
                        ? ((stat.activeMembers / stat.totalMembers) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  {stat.totalMembers > 0 && (
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          colorScheme === "energy" && "bg-accent",
                          colorScheme === "performance" && "bg-primary",
                          colorScheme === "wellness" && "bg-[hsl(var(--wellness))]",
                          colorScheme === "power" && "bg-[hsl(var(--power))]"
                        )}
                        style={{ width: `${(stat.activeMembers / stat.totalMembers) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
