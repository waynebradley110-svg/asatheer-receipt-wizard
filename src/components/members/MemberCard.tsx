import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { RefreshCw, ChevronRight, UserCheck, UserX, Phone } from "lucide-react";

interface MemberService {
  id: string;
  zone: string;
  expiry_date: string;
  is_active: boolean;
  coach_name?: string;
  subscription_plan: string;
}

interface Member {
  id: string;
  member_id: string;
  full_name: string;
  phone_number: string;
  barcode: string;
  gender: string;
  date_of_birth?: string;
  notes?: string;
  member_services?: MemberService[];
}

interface MemberCardProps {
  member: Member;
  onRenew: (member: Member) => void;
  onViewDetails: (member: Member) => void;
}

const getZoneLabel = (zone: string): string => {
  const labels: Record<string, string> = {
    gym: "Gym",
    ladies_gym: "Ladies Gym",
    pt: "PT",
    crossfit: "CrossFit",
    football_student: "Football",
    football_court: "Football Court",
    football: "Football",
    swimming: "Swimming",
    paddle_court: "Paddle",
    other: "Other"
  };
  return labels[zone] || zone;
};

const getServiceStatus = (expiryDate: string) => {
  const expiry = new Date(expiryDate);
  const today = new Date();
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) {
    return { status: "expired", color: "bg-destructive/10 text-destructive border-destructive/20" };
  } else if (daysUntilExpiry <= 7) {
    return { status: "expiring", color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400" };
  }
  return { status: "active", color: "bg-accent/10 text-accent border-accent/20" };
};

const getMemberStatus = (member: Member) => {
  const activeService = member.member_services?.find((s) => 
    new Date(s.expiry_date) >= new Date() && s.is_active
  );
  return activeService ? "active" : "expired";
};

export function MemberCard({ member, onRenew, onViewDetails }: MemberCardProps) {
  const status = getMemberStatus(member);
  const isExpired = status === "expired";
  
  // Get latest 2 services for display
  const displayServices = member.member_services
    ?.filter((s) => s.is_active)
    .sort((a, b) => new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime())
    .slice(0, 2) || [];

  const remainingServicesCount = (member.member_services?.filter(s => s.is_active).length || 0) - displayServices.length;

  return (
    <Card 
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-1",
        "border-l-4",
        isExpired 
          ? "border-l-destructive bg-destructive/5 dark:bg-destructive/10" 
          : "border-l-accent bg-card"
      )}
      onClick={() => onViewDetails(member)}
    >
      {/* Card Content */}
      <div className="p-4 space-y-3">
        {/* Header: Member ID & Status Badge */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground">
            {member.member_id}
          </span>
          <Badge 
            variant={isExpired ? "destructive" : "default"}
            className={cn(
              "text-xs font-medium",
              isExpired 
                ? "bg-destructive/90 hover:bg-destructive" 
                : "bg-accent/90 hover:bg-accent"
            )}
          >
            {isExpired ? (
              <>
                <UserX className="h-3 w-3 mr-1" />
                Expired
              </>
            ) : (
              <>
                <UserCheck className="h-3 w-3 mr-1" />
                Active
              </>
            )}
          </Badge>
        </div>

        {/* Member Name */}
        <div>
          <h3 className="text-lg font-semibold text-foreground truncate">
            {member.full_name}
          </h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span>{member.phone_number}</span>
          </div>
        </div>

        {/* Services Summary */}
        <div className="flex flex-wrap gap-1.5">
          {displayServices.length > 0 ? (
            <>
              {displayServices.map((service) => {
                const { color } = getServiceStatus(service.expiry_date);
                return (
                  <Badge
                    key={service.id}
                    variant="outline"
                    className={cn("text-xs", color)}
                  >
                    {getZoneLabel(service.zone)}: {format(new Date(service.expiry_date), 'dd/MM/yy')}
                  </Badge>
                );
              })}
              {remainingServicesCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  +{remainingServicesCount} more
                </Badge>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground">No active services</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          {isExpired && (
            <Button 
              size="sm" 
              className="flex-1 bg-accent hover:bg-accent/90"
              onClick={(e) => {
                e.stopPropagation();
                onRenew(member);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Renew
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("text-muted-foreground", !isExpired && "flex-1")}
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(member);
            }}
          >
            View Details
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
