import React from "react";
import { useLocation } from "wouter";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const [location] = useLocation();
  
  // Map location to appropriate header text
  const getHeaderText = () => {
    if (title) return title;
    
    switch (location) {
      case "/":
        return "Dashboard";
      case "/schedule":
        return "Schedule";
      case "/staff":
        return "Staff Management";
      case "/availability":
        return "Staff Availability";
      case "/swap-requests":
        return "Swap Requests";
      case "/reports":
        return "Reports";
      case "/settings":
        return "Settings";
      default:
        return "Hospital Shift Scheduling";
    }
  };
  
  // Map location to appropriate subtitle
  const getSubtitleText = () => {
    if (subtitle) return subtitle;
    
    switch (location) {
      case "/":
        return "Hospital shift scheduling overview";
      case "/schedule":
        return "View and manage staff schedules";
      case "/staff":
        return "Manage staff members and roles";
      case "/availability":
        return "Track staff availability and time-off";
      case "/swap-requests":
        return "Manage shift swap requests";
      case "/reports":
        return "View scheduling reports and statistics";
      case "/settings":
        return "Configure application settings";
      default:
        return "";
    }
  };
  
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900">{getHeaderText()}</h1>
      <p className="text-slate-500">{getSubtitleText()}</p>
    </header>
  );
}
