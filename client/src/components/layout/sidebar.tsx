import React from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  CalendarDays, 
  Users, 
  Clock, 
  RefreshCw, 
  FileBarChart, 
  Settings, 
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  const navItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: <Home className="h-5 w-5" />,
    },
    {
      title: "Schedule",
      href: "/schedule",
      icon: <CalendarDays className="h-5 w-5" />,
    },
    {
      title: "Staff",
      href: "/staff",
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: "Availability",
      href: "/availability",
      icon: <Clock className="h-5 w-5" />,
    },
    {
      title: "Swap Requests",
      href: "/swap-requests",
      icon: <RefreshCw className="h-5 w-5" />,
    },
    {
      title: "Reports",
      href: "/reports",
      icon: <FileBarChart className="h-5 w-5" />,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ];
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Get initials for avatar
  const getInitials = () => {
    if (!user) return "";
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  };
  
  return (
    <aside className="w-64 border-r border-slate-200 bg-white hidden md:flex flex-col h-screen">
      <div className="p-4 border-b border-slate-200 flex items-center gap-2">
        <div className="h-8 w-8 rounded-md bg-primary-500 flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
          </svg>
        </div>
        <span className="font-semibold text-lg text-slate-800">ScrubIn</span>
      </div>
      
      <nav className="flex-1 py-4">
        <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase">Main</div>
        {navItems.slice(0, 4).map((item) => (
          <Link key={item.href} href={item.href}>
            <a className={cn(
              "flex items-center gap-3 px-3 py-2 mx-2 rounded-md",
              location === item.href
                ? "bg-primary-50 text-primary-700"
                : "text-slate-700 hover:bg-slate-100"
            )}>
              {item.icon}
              <span>{item.title}</span>
            </a>
          </Link>
        ))}
        
        <div className="px-3 mb-2 mt-6 text-xs font-semibold text-slate-500 uppercase">Management</div>
        {navItems.slice(4).map((item) => (
          <Link key={item.href} href={item.href}>
            <a className={cn(
              "flex items-center gap-3 px-3 py-2 mx-2 rounded-md",
              location === item.href
                ? "bg-primary-50 text-primary-700"
                : "text-slate-700 hover:bg-slate-100"
            )}>
              {item.icon}
              <span>{item.title}</span>
            </a>
          </Link>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-slate-300 text-slate-700">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {user?.role === "admin" ? "Administrator" : user?.role}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLogout}
            className="rounded-full"
          >
            <LogOut className="h-5 w-5 text-slate-500" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
