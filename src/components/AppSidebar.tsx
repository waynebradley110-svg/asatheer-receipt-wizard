import { Home, Users, CreditCard, Bell, LogOut, Dumbbell, Receipt, ScanLine, UserCog, CalendarDays } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const menuGroups = [
  {
    label: "Operations",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: Home },
      { title: "Attendance", url: "/attendance", icon: ScanLine },
      { title: "Schedule", url: "/schedule", icon: CalendarDays },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Members", url: "/members", icon: Users },
      { title: "PT Report", url: "/pt-report", icon: UserCog },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Reports", url: "/reports", icon: CreditCard },
      { title: "Expenses", url: "/expenses", icon: Receipt },
    ],
  },
  {
    label: "System",
    items: [{ title: "Notifications", url: "/notifications", icon: Bell }],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth");
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-4">
          <div className="bg-gradient-gold text-sidebar-primary-foreground p-2 rounded-lg shadow-gold">
            <Dumbbell className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-base font-semibold text-sidebar-foreground tracking-tight">
                Asatheer
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
                Sports Academy
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={({ isActive }) =>
                          [
                            "relative flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-primary font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-sidebar-primary"
                              : "hover:bg-sidebar-accent/60 text-sidebar-foreground",
                          ].join(" ")
                        }
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
