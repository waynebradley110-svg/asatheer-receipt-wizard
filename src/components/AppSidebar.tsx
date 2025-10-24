import { Home, Users, CreditCard, Bell, LogOut, Dumbbell, Receipt, ScanLine } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home, roles: ['admin', 'receptionist', 'accounts'] },
  { title: "Members", url: "/members", icon: Users, roles: ['admin', 'receptionist'] },
  { title: "Attendance", url: "/attendance", icon: ScanLine, roles: ['admin', 'receptionist'] },
  { title: "Reports", url: "/reports", icon: CreditCard, roles: ['admin', 'receptionist', 'accounts'] },
  { title: "Expenses", url: "/expenses", icon: Receipt, roles: ['admin', 'accounts'] },
  { title: "Notifications", url: "/notifications", icon: Bell, roles: ['admin', 'receptionist', 'accounts'] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const { roles } = useAuth();
  const collapsed = state === "collapsed";
  
  const visibleMenuItems = menuItems.filter(item => 
    item.roles.some(role => roles.includes(role as any))
  );

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
          <div className="bg-sidebar-primary text-sidebar-primary-foreground p-2 rounded-lg">
            <Dumbbell className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">Asatheer</span>
              <span className="text-xs text-sidebar-foreground/70">Sports Academy</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent/50"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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