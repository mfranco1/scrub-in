import React from "react";
import { Layout } from "@/components/layout/layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { WeeklySchedule } from "@/components/dashboard/weekly-schedule";
import { SwapRequestsTable } from "@/components/dashboard/swap-requests-table";
import { NotificationsList } from "@/components/dashboard/notifications-list";
import { useQuery } from "@tanstack/react-query";
import { StaffWithUser, SwapRequestWithDetails, Notification } from "@shared/schema";

export default function DashboardPage() {
  // Fetch staff data
  const { data: staff } = useQuery<StaffWithUser[]>({
    queryKey: ["/api/staff"],
    queryFn: async () => {
      const res = await fetch("/api/staff", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    }
  });
  
  // Fetch swap requests
  const { data: swapRequests } = useQuery<SwapRequestWithDetails[]>({
    queryKey: ["/api/swap-requests"],
    queryFn: async () => {
      const res = await fetch("/api/swap-requests", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch swap requests");
      return res.json();
    }
  });
  
  // Fetch notifications
  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    }
  });
  
  // Check for unassigned shifts (as a proxy for open shifts)
  const { data: schedules } = useQuery({
    queryKey: ["/api/schedule/current-week"],
    queryFn: async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - today.getDay() + 1); // Monday
      
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6); // Sunday
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const res = await fetch(
        `/api/schedule?startDate=${startDateStr}&endDate=${endDateStr}`,
        { credentials: "include" }
      );
      
      if (!res.ok) throw new Error("Failed to fetch schedules");
      return res.json();
    }
  });
  
  // Calculate stats
  const activeStaffCount = staff?.filter(s => s.isActive).length || 0;
  const pendingSwapsCount = swapRequests?.filter(r => r.status === "pending").length || 0;
  
  // Get open/unassigned shifts (this is a simplified calculation)
  const openShiftsCount = 3; // Placeholder value for demonstration
  
  // Get time off requests (could be from availability data or a separate endpoint)
  const timeOffRequestsCount = 7; // Placeholder value for demonstration
  
  return (
    <Layout>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Active Staff"
          value={activeStaffCount.toString()}
          icon="staff"
          trend={{
            value: "+2 from last month",
            isPositive: true
          }}
        />
        
        <StatsCard
          title="Open Shifts"
          value={openShiftsCount.toString()}
          icon="openShifts"
          trend={{
            value: "Needs immediate attention",
            isPositive: true
          }}
        />
        
        <StatsCard
          title="Pending Swaps"
          value={pendingSwapsCount.toString()}
          icon="swapRequests"
          trend={{
            value: "Requires approval",
            isPositive: false
          }}
        />
        
        <StatsCard
          title="Time Off Requests"
          value={timeOffRequestsCount.toString()}
          icon="timeOff"
          trend={{
            value: "+2 new requests",
            isPositive: true
          }}
        />
      </div>
      
      {/* Schedule View */}
      <div className="mb-6">
        <WeeklySchedule />
      </div>
      
      {/* Swap Requests and Notifications Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SwapRequestsTable />
        </div>
        <div>
          <NotificationsList />
        </div>
      </div>
    </Layout>
  );
}
