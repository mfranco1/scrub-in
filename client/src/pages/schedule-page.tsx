import React, { useState } from "react";
import { Layout } from "@/components/layout/layout";
import { WeeklySchedule } from "@/components/dashboard/weekly-schedule";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShiftForm } from "@/components/shifts/shift-form";
import { DutyForm } from "@/components/shifts/duty-form";
import { useQuery } from "@tanstack/react-query";
import { ShiftType, DutyType } from "@shared/schema";
import { Plus, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SchedulePage() {
  const [isShiftFormOpen, setIsShiftFormOpen] = useState(false);
  const [isDutyFormOpen, setIsDutyFormOpen] = useState(false);
  
  // Fetch shift types
  const { data: shiftTypes, isLoading: isLoadingShiftTypes } = useQuery<ShiftType[]>({
    queryKey: ["/api/shift-types"],
    queryFn: async () => {
      const res = await fetch("/api/shift-types", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch shift types");
      return res.json();
    }
  });
  
  // Fetch duty types
  const { data: dutyTypes, isLoading: isLoadingDutyTypes } = useQuery<DutyType[]>({
    queryKey: ["/api/duty-types"],
    queryFn: async () => {
      const res = await fetch("/api/duty-types", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch duty types");
      return res.json();
    }
  });
  
  const handleAddShiftSuccess = () => {
    setIsShiftFormOpen(false);
  };
  
  const handleAddDutySuccess = () => {
    setIsDutyFormOpen(false);
  };
  
  return (
    <Layout title="Schedule" subtitle="View and manage staff schedules">
      <div className="grid grid-cols-1 gap-6">
        {(!shiftTypes || shiftTypes.length === 0 || !dutyTypes || dutyTypes.length === 0) && (
          <Alert variant="warning" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Setup Required</AlertTitle>
            <AlertDescription>
              Before you can generate schedules, you need to set up shift types and duty types.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-semibold mb-1">Current Schedule</h2>
            <p className="text-slate-500 text-sm">
              View and manage the current staff schedule
            </p>
          </div>
          <div className="flex gap-3 mt-3 md:mt-0">
            <Dialog open={isShiftFormOpen} onOpenChange={setIsShiftFormOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Shift Type
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Add New Shift Type</DialogTitle>
                </DialogHeader>
                <ShiftForm onSuccess={handleAddShiftSuccess} />
              </DialogContent>
            </Dialog>
            
            <Dialog open={isDutyFormOpen} onOpenChange={setIsDutyFormOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Duty Type
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Add New Duty Type</DialogTitle>
                </DialogHeader>
                <DutyForm onSuccess={handleAddDutySuccess} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <WeeklySchedule />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Shift Types Card */}
          <Card>
            <CardHeader>
              <CardTitle>Shift Types</CardTitle>
              <CardDescription>
                Configure the different types of shifts in your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingShiftTypes ? (
                <p>Loading shift types...</p>
              ) : shiftTypes?.length ? (
                <div className="grid gap-3">
                  {shiftTypes.map((shiftType) => (
                    <div key={shiftType.id} className="p-3 border rounded-md">
                      <div className="font-medium">{shiftType.name}</div>
                      <div className="text-sm text-slate-500">
                        {shiftType.startTime} - {shiftType.endTime} ({shiftType.duration} hours)
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500">
                  <p>No shift types defined yet.</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={() => setIsShiftFormOpen(true)}
                  >
                    Add your first shift type
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Duty Types Card */}
          <Card>
            <CardHeader>
              <CardTitle>Duty Types</CardTitle>
              <CardDescription>
                Configure the different duty patterns for staff scheduling
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDutyTypes ? (
                <p>Loading duty types...</p>
              ) : dutyTypes?.length ? (
                <div className="grid gap-3">
                  {dutyTypes.map((dutyType) => (
                    <div key={dutyType.id} className="p-3 border rounded-md">
                      <div className="font-medium">{dutyType.name}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500">
                  <p>No duty types defined yet.</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={() => setIsDutyFormOpen(true)}
                  >
                    Add your first duty type
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
