import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { 
  User, 
  Phone, 
  Calendar, 
  RefreshCw, 
  Plus, 
  CreditCard, 
  Trash2, 
  Edit,
  UserCheck,
  UserX,
  Dumbbell
} from "lucide-react";

interface MemberService {
  id: string;
  zone: string;
  expiry_date: string;
  start_date: string;
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

interface MemberDetailsSheetProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRenew: (member: Member) => void;
  onAddService: (member: Member) => void;
  onViewCard: (member: Member) => void;
  onEdit: (member: Member) => void;
  onDelete: (memberId: string) => void;
  isAdmin: boolean;
}

const getZoneLabel = (zone: string): string => {
  const labels: Record<string, string> = {
    gym: "Gym",
    ladies_gym: "Ladies Gym",
    pt: "Personal Training",
    crossfit: "CrossFit",
    football_student: "Football Academy",
    football_court: "Football Court",
    football: "Football",
    swimming: "Swimming",
    paddle_court: "Paddle Court",
    other: "Other"
  };
  return labels[zone] || zone;
};

const getPlanLabel = (plan: string): string => {
  const labels: Record<string, string> = {
    "1_day": "1 Day",
    "1_month": "1 Month",
    "2_months": "2 Months",
    "3_months": "3 Months",
    "6_months": "6 Months",
    "1_year": "1 Year"
  };
  return labels[plan] || plan;
};

const getServiceStatus = (expiryDate: string) => {
  const expiry = new Date(expiryDate);
  const today = new Date();
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) {
    return { 
      status: "expired", 
      label: "Expired",
      color: "bg-destructive/10 text-destructive border-destructive/20",
      days: Math.abs(daysUntilExpiry)
    };
  } else if (daysUntilExpiry <= 7) {
    return { 
      status: "expiring", 
      label: `${daysUntilExpiry}d left`,
      color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
      days: daysUntilExpiry
    };
  }
  return { 
    status: "active", 
    label: `${daysUntilExpiry}d left`,
    color: "bg-accent/10 text-accent border-accent/20",
    days: daysUntilExpiry
  };
};

const getMemberStatus = (member: Member) => {
  const activeService = member.member_services?.find((s) => 
    new Date(s.expiry_date) >= new Date() && s.is_active
  );
  return activeService ? "active" : "expired";
};

const getWelcomeMessage = (member: Member) => {
  const activeService = member.member_services?.find((s) => 
    new Date(s.expiry_date) >= new Date() && s.is_active
  );
  
  if (activeService) {
    return `Hi ${member.full_name}! Your ${getZoneLabel(activeService.zone)} subscription is active until ${format(new Date(activeService.expiry_date), 'dd/MM/yyyy')}.`;
  }
  return `Hi ${member.full_name}! Your membership has expired. Visit us to renew!`;
};

export function MemberDetailsSheet({
  member,
  open,
  onOpenChange,
  onRenew,
  onAddService,
  onViewCard,
  onEdit,
  onDelete,
  isAdmin
}: MemberDetailsSheetProps) {
  if (!member) return null;

  const status = getMemberStatus(member);
  const isExpired = status === "expired";

  // Sort services: active first, then by expiry date
  const sortedServices = [...(member.member_services || [])]
    .filter(s => s.is_active)
    .sort((a, b) => {
      const aExpired = new Date(a.expiry_date) < new Date();
      const bExpired = new Date(b.expiry_date) < new Date();
      if (aExpired !== bExpired) return aExpired ? 1 : -1;
      return new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime();
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">{member.full_name}</SheetTitle>
            <Badge 
              variant={isExpired ? "destructive" : "default"}
              className={cn(
                "text-sm",
                isExpired 
                  ? "bg-destructive/90" 
                  : "bg-accent/90"
              )}
            >
              {isExpired ? (
                <>
                  <UserX className="h-3.5 w-3.5 mr-1" />
                  Expired
                </>
              ) : (
                <>
                  <UserCheck className="h-3.5 w-3.5 mr-1" />
                  Active
                </>
              )}
            </Badge>
          </div>
          <SheetDescription className="font-mono text-sm">
            {member.member_id}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Section 1: Personal Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal Information
            </h4>
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Member ID</span>
                <span className="font-mono font-medium">{member.member_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Phone</span>
                <a 
                  href={`tel:${member.phone_number}`} 
                  className="font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {member.phone_number}
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Gender</span>
                <span className="font-medium capitalize">{member.gender}</span>
              </div>
              {member.date_of_birth && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Date of Birth</span>
                  <span className="font-medium">
                    {format(new Date(member.date_of_birth), 'dd/MM/yyyy')}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Barcode</span>
                <span className="font-mono text-xs">{member.barcode}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 2: Membership History */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              Membership Services
            </h4>
            
            {sortedServices.length > 0 ? (
              <div className="space-y-2">
                {sortedServices.map((service) => {
                  const serviceStatus = getServiceStatus(service.expiry_date);
                  return (
                    <div 
                      key={service.id}
                      className={cn(
                        "rounded-lg border p-3 transition-colors",
                        serviceStatus.status === "expired" 
                          ? "bg-destructive/5 border-destructive/20" 
                          : serviceStatus.status === "expiring"
                          ? "bg-orange-50 border-orange-200 dark:bg-orange-900/20"
                          : "bg-accent/5 border-accent/20"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{getZoneLabel(service.zone)}</span>
                        <Badge 
                          variant="outline"
                          className={cn("text-xs", serviceStatus.color)}
                        >
                          {serviceStatus.label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Start: {format(new Date(service.start_date), 'dd/MM/yy')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>End: {format(new Date(service.expiry_date), 'dd/MM/yy')}</span>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Plan: {getPlanLabel(service.subscription_plan)}
                        {service.coach_name && ` • Coach: ${service.coach_name}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg">
                <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active services</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Section 3: Actions */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Actions
            </h4>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                className="bg-accent hover:bg-accent/90"
                onClick={() => {
                  onOpenChange(false);
                  onRenew(member);
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Renew
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onAddService(member);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onViewCard(member);
                }}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                View Card
              </Button>
              
              <WhatsAppButton
                phoneNumber={member.phone_number}
                message={getWelcomeMessage(member)}
                variant="outline"
              />
              
              <Button 
                variant="ghost"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(member);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Info
              </Button>
              
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Member</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {member.full_name}? This action cannot be undone and will remove all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          onOpenChange(false);
                          onDelete(member.id);
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {/* Notes Section */}
          {member.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Notes
                </h4>
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                  {member.notes}
                </p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
