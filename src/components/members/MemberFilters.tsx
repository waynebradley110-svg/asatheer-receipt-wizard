import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Search, Filter, SortAsc, Users, UserCheck, UserX, Clock } from "lucide-react";

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
}

export function MemberFilters({
  search,
  onSearchChange,
  filterZone,
  onFilterZoneChange,
  filterStatus,
  onFilterStatusChange,
  sortBy,
  onSortByChange,
  stats
}: MemberFiltersProps) {
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
              <SelectItem value="gym">Gym</SelectItem>
              <SelectItem value="ladies_gym">Ladies Gym</SelectItem>
              <SelectItem value="pt">Personal Training</SelectItem>
              <SelectItem value="crossfit">CrossFit</SelectItem>
              <SelectItem value="football_student">Football Academy</SelectItem>
              <SelectItem value="swimming">Swimming</SelectItem>
              <SelectItem value="paddle_court">Paddle Court</SelectItem>
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
        </div>

        {/* Stats Summary */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
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
                Zone: {filterZone.replace('_', ' ')}
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
