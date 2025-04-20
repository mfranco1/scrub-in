import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScheduleLegend } from "./schedule-legend";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  getWeekDateRange, 
  formatDateForDisplay, 
  getWeekdayName
} from "@/lib/format-date";
import { useToast } from "@/hooks/use-toast";
import { ScheduleWithDetails, InsertSchedule, StaffWithUser } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { generateSchedule, ScheduleConflict } from "@/lib/enhanced-scheduling-algorithm";
import { ConflictViewer } from "@/components/schedule/conflict-viewer";
import { ScheduleEditor } from "@/components/schedule/schedule-editor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function findScheduleForStaffOnDate(
  staffId: number, 
  date: string, 
  schedules: ScheduleWithDetails[]
): ScheduleWithDetails | undefined {
  return schedules.find(
    schedule => schedule.staffId === staffId && schedule.date === date
  );
}

interface WeeklyScheduleProps {
  scheduleView?: "weekly" | "daily" | "monthly";
}

export function WeeklySchedule({ 
  scheduleView = "weekly",
}: WeeklyScheduleProps) {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeView, setActiveView] = useState<"weekly" | "daily" | "monthly">(scheduleView);
  
  // Get date range for the current week
  const { startDate, endDate } = getWeekDateRange(currentDate);
  
  // Fetch schedule data
  const { 
    data: schedules, 
    isLoading: isLoadingSchedules 
  } = useQuery<ScheduleWithDetails[]>({
    queryKey: ["/api/schedule", { startDate, endDate }],
    queryFn: async ({ queryKey }) => {
      const [_, params] = queryKey as [string, { startDate: string; endDate: string }];
      const res = await fetch(
        `/api/schedule?startDate=${params.startDate}&endDate=${params.endDate}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch schedules");
      return res.json();
    }
  });
  
  // Fetch staff data
  const { 
    data: staff, 
    isLoading: isLoadingStaff 
  } = useQuery({
    queryKey: ["/api/staff"],
    queryFn: async () => {
      const res = await fetch("/api/staff", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    }
  });
  
  // Fetch shift types
  const { 
    data: shiftTypes,
    isLoading: isLoadingShiftTypes
  } = useQuery({
    queryKey: ["/api/shift-types"],
    queryFn: async () => {
      const res = await fetch("/api/shift-types", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch shift types");
      return res.json();
    }
  });
  
  // Fetch duty types
  const { 
    data: dutyTypes,
    isLoading: isLoadingDutyTypes
  } = useQuery({
    queryKey: ["/api/duty-types"],
    queryFn: async () => {
      const res = await fetch("/api/duty-types", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch duty types");
      return res.json();
    }
  });
  
  // Fetch availabilities
  const { 
    data: availabilities
  } = useQuery({
    queryKey: ["/api/availability", { startDate, endDate }],
    queryFn: async ({ queryKey }) => {
      const [_, params] = queryKey as [string, { startDate: string; endDate: string }];
      const res = await fetch(
        `/api/availability?startDate=${params.startDate}&endDate=${params.endDate}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch availabilities");
      return res.json();
    }
  });
  
  const isLoading = isLoadingSchedules || isLoadingStaff || isLoadingShiftTypes || isLoadingDutyTypes;
  
  // Navigate to previous week
  const previousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };
  
  // Navigate to next week
  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };
  
  // Navigate to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Handle the view change
  const handleViewChange = (value: string) => {
    setActiveView(value as "weekly" | "daily" | "monthly");
  };
  
  // Generate days for the current week
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startDate);
    day.setDate(day.getDate() + i);
    return {
      date: day.toISOString().split("T")[0],
      displayDate: day.getDate(),
      dayName: day.toLocaleDateString("en-US", { weekday: "short" }),
    };
  });
  
  // Function to format initials
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };
  
  // Get class for shift cell based on duty and shift type
  const getCellClasses = (schedule?: ScheduleWithDetails) => {
    if (!schedule) return "p-2 rounded bg-slate-100";
    
    let classes = "p-2 rounded ";
    
    // Add duty type class
    if (schedule.dutyType.name === "Pre-Duty") {
      classes += "bg-slate-200 border-l-[3px] border-slate-400 ";
    } else if (schedule.dutyType.name === "Duty") {
      classes += "bg-indigo-100 border-l-[3px] border-indigo-500 ";
    } else if (schedule.dutyType.name === "Post-Duty") {
      classes += "bg-red-100 border-l-[3px] border-red-500 ";
    }
    
    // Add shift type class if applicable
    if (schedule.shiftType) {
      if (schedule.shiftType.name === "Day Shift") {
        classes += "border-t-[3px] border-green-500";
      } else if (schedule.shiftType.name === "Evening Shift") {
        classes += "border-t-[3px] border-amber-500";
      } else if (schedule.shiftType.name === "Night Shift") {
        classes += "border-t-[3px] border-indigo-700";
      }
    }
    
    return classes;
  };
  
  // State for conflict management and visualization
  const [scheduleConflicts, setScheduleConflicts] = useState<ReturnType<typeof generateSchedule>['conflicts']>([]);
  const [isShowingConflicts, setIsShowingConflicts] = useState(false);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [isClearingShifts, setIsClearingShifts] = useState(false);
  
  // State for schedule editing
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleWithDetails | undefined>(undefined);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Function to handle schedule generation with enhanced conflict detection
  const handleGenerateSchedule = async () => {
    if (!staff || !shiftTypes || !dutyTypes || !availabilities) {
      toast({
        title: "Error",
        description: "Missing required data to generate schedule",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsGeneratingSchedule(true);
      
      // Generate new schedule using enhanced algorithm with conflict detection
      const { schedules: newSchedules, conflicts } = generateSchedule({
        staff,
        shiftTypes,
        dutyTypes,
        availabilities: availabilities || [],
        startDate,
        endDate,
        existingSchedules: schedules || []
      });
      
      // Store conflicts for visualization
      setScheduleConflicts(conflicts);
      
      // If there are critical (error severity) conflicts, show them before saving
      const criticalConflicts = conflicts.filter(c => c.severity === "error");
      if (criticalConflicts.length > 0) {
        setIsShowingConflicts(true);
        
        toast({
          title: "Schedule has conflicts",
          description: `${criticalConflicts.length} critical conflicts detected. Review before saving.`,
          variant: "default"
        });
        
        setIsGeneratingSchedule(false);
        return;
      }
      
      // Save the generated schedule
      const response = await apiRequest("POST", "/api/schedule/batch", newSchedules);
      
      if (response.ok) {
        // Invalidate the schedules query to refetch the data
        queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
        
        // If there are non-critical conflicts, still show them but notify of successful save
        if (conflicts.length > 0) {
          setIsShowingConflicts(true);
          toast({
            title: "Schedule generated with warnings",
            description: `Schedule saved with ${conflicts.length} non-critical warnings.`,
          });
        } else {
          toast({
            title: "Success",
            description: "Schedule has been generated successfully without conflicts",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to save the generated schedule",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast({
        title: "Error",
        description: "An error occurred while generating the schedule",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingSchedule(false);
    }
  };
  
  // Handle acceptance of schedules with warnings
  const handleAcceptSchedule = async () => {
    // Save the generated schedule with warnings
    try {
      const { schedules: newSchedules } = generateSchedule({
        staff,
        shiftTypes,
        dutyTypes,
        availabilities: availabilities || [],
        startDate,
        endDate,
        existingSchedules: schedules || []
      });
      
      const response = await apiRequest("POST", "/api/schedule/batch", newSchedules);
      
      if (response.ok) {
        // Invalidate the schedules query to refetch the data
        queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
        
        toast({
          title: "Success",
          description: "Schedule has been generated and saved with warnings",
        });
        
        // Close the conflict viewer
        setIsShowingConflicts(false);
      } else {
        toast({
          title: "Error",
          description: "Failed to save the generated schedule",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast({
        title: "Error",
        description: "An error occurred while saving the schedule",
        variant: "destructive"
      });
    }
  };
  
  // Function to handle clearing all shifts for the current week with confirmation
  const confirmClearAllShifts = async () => {
    setIsClearingShifts(true);
    try {
      const response = await apiRequest(
        "DELETE", 
        `/api/schedule/clear?startDate=${startDate}&endDate=${endDate}`
      );
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "All shifts for the current week have been cleared.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
        setScheduleConflicts([]); // Clear any displayed conflicts
      } else {
        toast({
          title: "Error",
          description: "Failed to clear shifts for the week.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error clearing shifts:", error);
      toast({
        title: "Error",
        description: "An error occurred while clearing shifts.",
        variant: "destructive",
      });
    } finally {
      setIsClearingShifts(false);
    }
  };
  
  // Handle opening the schedule editor
  const handleEditSchedule = (staffId: number, date: string, schedule?: ScheduleWithDetails) => {
    setSelectedStaffId(staffId);
    setSelectedDate(date);
    setSelectedSchedule(schedule);
    setIsEditingSchedule(true);
  };
  
  // Handle manual schedule creation or update
  const handleSaveSchedule = async (
    scheduleData: Omit<any, 'date'> & { date: string }
  ) => {
    try {
      const scheduleToSave: InsertSchedule = {
        staffId: scheduleData.staffId,
        date: scheduleData.date,
        shiftTypeId: scheduleData.shiftTypeId === "none" || scheduleData.shiftTypeId === "" ? null : parseInt(scheduleData.shiftTypeId),
        dutyTypeId: parseInt(scheduleData.dutyTypeId),
        unit: scheduleData.unit || null,
      };
      
      let response;
      if (selectedSchedule) {
        // Update existing schedule
        response = await apiRequest(
          "PATCH", 
          `/api/schedule/${selectedSchedule.id}`, 
          scheduleToSave
        );
      } else {
        // Create new schedule
        response = await apiRequest("POST", "/api/schedule", scheduleToSave);
      }
      
      if (response.ok) {
        // Invalidate the schedules query to refetch the data
        queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
        
        toast({
          title: "Success",
          description: selectedSchedule 
            ? "Schedule has been updated successfully" 
            : "Schedule has been created successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save the schedule",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast({
        title: "Error",
        description: "An error occurred while saving the schedule",
        variant: "destructive"
      });
    }
  };
  
  // Handle schedule deletion
  const handleDeleteSchedule = async (scheduleId: number) => {
    try {
      const response = await apiRequest("DELETE", `/api/schedule/${scheduleId}`);
      
      if (response.ok) {
        // Invalidate the schedules query to refetch the data
        queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
        
        toast({
          title: "Success",
          description: "Schedule has been deleted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete the schedule",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the schedule",
        variant: "destructive"
      });
    }
  };
  
  return (
    <>
      {/* Conflict Viewer Dialog */}
      <ConflictViewer 
        conflicts={scheduleConflicts}
        isOpen={isShowingConflicts}
        onClose={() => setIsShowingConflicts(false)}
        onAcceptAnyway={handleAcceptSchedule}
      />
      
      {/* Schedule Editor Dialog */}
      {staff && shiftTypes && dutyTypes && (
        <ScheduleEditor
          isOpen={isEditingSchedule}
          onClose={() => setIsEditingSchedule(false)}
          staffList={staff}
          shiftTypes={shiftTypes}
          dutyTypes={dutyTypes}
          existingSchedules={schedules || []}
          scheduleToEdit={selectedSchedule}
          onSave={handleSaveSchedule}
          onDelete={selectedSchedule ? handleDeleteSchedule : undefined}
        />
      )}
      
      <Card className="shadow-sm border border-slate-200 overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Weekly Schedule</h2>
            <p className="text-sm text-slate-500">
              {formatDateForDisplay(new Date(startDate))} - {formatDateForDisplay(new Date(endDate))}
            </p>
          </div>
          <div className="flex mt-3 md:mt-0 space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={previousWeek}
              className="text-slate-600 hover:text-slate-900"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="text-slate-700"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextWeek}
              className="text-slate-600 hover:text-slate-900"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <div className="border-l border-slate-200 mx-2 hidden md:block"></div>
            <Select value={activeView} onValueChange={handleViewChange}>
              <SelectTrigger className="w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="default"
              size="sm"
              onClick={handleGenerateSchedule}
              className="hidden md:flex items-center gap-1"
              disabled={isGeneratingSchedule || isLoading}
            >
              {isGeneratingSchedule ? "Generating..." : "Generate Schedule"}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="hidden md:flex items-center gap-1"
                  disabled={isLoadingSchedules || isClearingShifts}
                >
                  <Trash2 className="h-4 w-4" />
                  {isClearingShifts ? "Clearing..." : "Clear All"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all 
                    schedule assignments for the week of {formatDateForDisplay(new Date(startDate))} - {formatDateForDisplay(new Date(endDate))}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmClearAllShifts} disabled={isClearingShifts}>
                    {isClearingShifts ? "Clearing..." : "Yes, clear shifts"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            {scheduleConflicts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsShowingConflicts(true)}
                className="hidden md:flex items-center gap-1 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              >
                <AlertTriangle className="h-4 w-4" />
                {scheduleConflicts.length} {scheduleConflicts.length === 1 ? 'Conflict' : 'Conflicts'}
              </Button>
            )}
          </div>
        </CardHeader>
        
        <ScheduleLegend />
        
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[calc(100vh-350px)] responsive-table-wrapper">
            <table className="min-w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50">
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-r border-slate-200 sticky left-0 bg-slate-50 z-20">
                    Staff
                  </th>
                  {days.map((day) => (
                    <th 
                      key={day.date} 
                      className="py-3 px-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200 min-w-[120px]"
                    >
                      {day.dayName}<br />
                      <span className="text-slate-400 font-normal">{day.displayDate}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {isLoading ? (
                  // Loading skeleton
                  Array.from({ length: 3 }).map((_, idx) => (
                    <tr key={idx}>
                      <td className="py-3 px-4 border-r border-slate-200 sticky left-0 bg-white">
                        <div className="flex items-center">
                          <Skeleton className="h-8 w-8 rounded-full mr-2" />
                          <div>
                            <Skeleton className="h-4 w-24 mb-1" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                      </td>
                      {days.map((day) => (
                        <td key={day.date} className="py-2 px-1">
                          <Skeleton className="h-16 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  staff?.map((staffMember: StaffWithUser) => {
                    const staffSchedules = schedules?.filter(
                      (s) => s.staffId === staffMember.id
                    ) || [];
                    
                    return (
                      <tr key={staffMember.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm text-slate-900 border-r border-slate-200 sticky left-0 bg-white whitespace-nowrap z-10">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium mr-2">
                              {getInitials(staffMember.user.firstName, staffMember.user.lastName)}
                            </div>
                            <div>
                              <p className="font-medium">{staffMember.user.firstName} {staffMember.user.lastName}</p>
                              <p className="text-xs text-slate-500">{staffMember.role}</p>
                            </div>
                          </div>
                        </td>
                        {days.map((day) => {
                          const schedule = staffSchedules.find(
                            s => s.date === day.date
                          );
                          
                          // Check if this cell has a conflict
                          const conflict = scheduleConflicts.find(
                            c => c.staffId === staffMember.id && c.date === day.date
                          );
                          
                          let cellClass = getCellClasses(schedule);
                          if (conflict) {
                            cellClass += conflict.severity === "error" 
                              ? " conflict-error conflict-error-pulse" 
                              : " conflict-warning conflict-warning-pulse";
                          }
                          
                          return (
                            <td key={day.date} className="py-2 px-1 text-sm text-slate-900">
                              <div 
                                className="has-tooltip cursor-pointer"
                                onClick={() => handleEditSchedule(staffMember.id, day.date, schedule)}
                              >
                                <div className={`${cellClass} schedule-cell`}>
                                  {schedule?.shiftType ? (
                                    <>
                                      <p className="text-xs font-medium">{schedule.shiftType.name}</p>
                                      <p className="text-xs font-mono">
                                        {schedule.shiftType.startTime} - {schedule.shiftType.endTime}
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-xs font-medium">Off</p>
                                      <p className="text-xs font-mono">{schedule?.dutyType.name}</p>
                                    </>
                                  )}
                                </div>
                                <div className="tooltip rounded shadow-lg p-2 bg-black bg-opacity-80 text-white text-xs -mt-14 ml-8 w-48">
                                  {conflict ? (
                                    <div className="text-xs">
                                      <div className={conflict.severity === "error" ? "text-red-300" : "text-amber-300"}>
                                        <p className="font-medium">
                                          {conflict.severity === "error" ? "Conflict Error:" : "Conflict Warning:"}
                                        </p>
                                        <p>{conflict.message}</p>
                                      </div>
                                      <div className="border-t border-gray-600 mt-1 pt-1">
                                        {schedule?.shiftType ? (
                                          <>
                                            <p className="font-medium">{schedule.shiftType.name} ({schedule.dutyType.name})</p>
                                            <p>{schedule.shiftType.startTime} - {schedule.shiftType.endTime}</p>
                                          </>
                                        ) : schedule ? (
                                          <p className="font-medium">{schedule.dutyType.name} Rest</p>
                                        ) : (
                                          <p className="font-medium">No schedule</p>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      {schedule?.shiftType ? (
                                        <>
                                          <p className="font-medium">{schedule.shiftType.name} ({schedule.dutyType.name})</p>
                                          <p>{schedule.shiftType.startTime} - {schedule.shiftType.endTime}</p>
                                          <p>{schedule.unit || "General"}</p>
                                        </>
                                      ) : schedule ? (
                                        <>
                                          <p className="font-medium">{schedule.dutyType.name} Rest</p>
                                          <p>Not scheduled</p>
                                        </>
                                      ) : (
                                        <p className="font-medium">Click to assign shift</p>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        
        <CardFooter className="p-4 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3">
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={handleGenerateSchedule}
              className="md:hidden"
              disabled={isGeneratingSchedule}
            >
              {isGeneratingSchedule ? "Generating..." : "Generate Schedule"}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedSchedule(undefined);
                setSelectedStaffId(null);
                setSelectedDate(null);
                setIsEditingSchedule(true);
              }}
              className="flex items-center gap-1 text-slate-700"
            >
              <Plus className="h-4 w-4" />
              Create Schedule
            </Button>
            
            {scheduleConflicts.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setIsShowingConflicts(true)}
                className="md:hidden flex items-center gap-1 border-amber-200 bg-amber-50 text-amber-700"
              >
                <AlertTriangle className="h-4 w-4" />
                {scheduleConflicts.length} Conflicts
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Export Schedule
            </Button>
            <p className="text-xs text-slate-500 hidden md:flex items-center">
              Last generated on {new Date().toLocaleDateString()} by Admin
            </p>
          </div>
        </CardFooter>
      </Card>
    </>
  );
}
