import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  onLogout: () => void;
}

export function MobileMenu({ onLogout }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const navItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: "home",
    },
    {
      title: "Schedule",
      href: "/schedule",
      icon: "calendar",
    },
    {
      title: "Staff",
      href: "/staff",
      icon: "users",
    },
    {
      title: "Availability",
      href: "/availability",
      icon: "clock",
    },
    {
      title: "Swap Requests",
      href: "/swap-requests",
      icon: "repeat",
    },
    {
      title: "Reports",
      href: "/reports",
      icon: "chart",
    },
    {
      title: "Settings",
      href: "/settings",
      icon: "settings",
    },
  ];

  const handleNavigate = (href: string) => {
    setIsOpen(false);
  };

  const handleLogout = () => {
    setIsOpen(false);
    onLogout();
  };

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-10">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary-500 flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
            </svg>
          </div>
          <span className="font-semibold text-lg text-slate-800">ScrubIn</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-slate-700"
          onClick={toggleMenu}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {isOpen && (
        <div className="p-2 border-t border-slate-200">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <a
                className={cn(
                  "block px-4 py-2 rounded-md",
                  location === item.href
                    ? "text-primary-700 bg-primary-50"
                    : "text-slate-700 hover:bg-slate-100"
                )}
                onClick={() => handleNavigate(item.href)}
              >
                {item.title}
              </a>
            </Link>
          ))}
          <Button
            variant="ghost"
            className="w-full justify-start px-4 py-2 text-left text-slate-700 hover:bg-slate-100 rounded-md mt-2"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      )}
    </div>
  );
}
