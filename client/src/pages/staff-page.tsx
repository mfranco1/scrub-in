import React from "react";
import { Layout } from "@/components/layout/layout";
import { StaffList } from "@/components/staff/staff-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";

export default function StaffPage() {
  // Fetch staff statistics data (active, inactive, by role)
  const { data: staffStats } = useQuery({
    queryKey: ["/api/staff/stats"],
    queryFn: async () => {
      // This endpoint doesn't exist - we're simulating it with client-side calculations
      const res = await fetch("/api/staff", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch staff");
      
      const staff = await res.json();
      
      // Calculate stats
      const active = staff.filter((s: any) => s.isActive).length;
      const inactive = staff.filter((s: any) => !s.isActive).length;
      
      // Count by role
      const roleCount: Record<string, number> = {};
      staff.forEach((s: any) => {
        if (s.isActive) {
          roleCount[s.role] = (roleCount[s.role] || 0) + 1;
        }
      });
      
      return { active, inactive, byRole: roleCount };
    }
  });
  
  return (
    <Layout title="Staff Management" subtitle="Manage staff members and roles">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Active Staff</CardTitle>
            <CardDescription>Total active staff members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {staffStats?.active || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Inactive Staff</CardTitle>
            <CardDescription>Deactivated staff members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {staffStats?.inactive || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Staff by Role</CardTitle>
            <CardDescription>Distribution by role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {staffStats?.byRole && Object.entries(staffStats.byRole).length > 0 ? (
                Object.entries(staffStats.byRole).map(([role, count]) => (
                  <div key={role} className="flex justify-between">
                    <span>{role}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="all">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Staff</TabsTrigger>
          <TabsTrigger value="doctors">Doctors</TabsTrigger>
          <TabsTrigger value="nurses">Nurses</TabsTrigger>
          <TabsTrigger value="technicians">Technicians</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <StaffList />
        </TabsContent>
        
        <TabsContent value="doctors">
          <StaffList />
        </TabsContent>
        
        <TabsContent value="nurses">
          <StaffList />
        </TabsContent>
        
        <TabsContent value="technicians">
          <StaffList />
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
