import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, UserPlus, UserMinus, AlertCircle, Save, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ShiftType, DutyType, Staff, StaffWithUser, Schedule, ScheduleWithDetails } from "@shared/schema";
import { ScheduleConflict, detectScheduleConflicts, suggestAlternativeStaff } from "@/lib/enhanced-scheduling-algorithm";

// Form validation schema
const scheduleFormSchema = z.object({
  staffId: z.coerce.number({
    required_error: "Please select a staff member"
  }),
  date: z.date({
    required_error: "Please select a date"
  }),
  shiftTypeId: z.coerce.number().nullable(),
  dutyTypeId: z.coerce.number({
    required_error: "Please select a duty type"
  }),
  unit: z.string().nullable().optional(),
  notes: z.string().optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

interface ScheduleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffWithUser[];
  shiftTypes: ShiftType[];
  dutyTypes: DutyType[];
  existingSchedules: ScheduleWithDetails[];
  scheduleToEdit?: ScheduleWithDetails;
  onSave: (scheduleData: Omit<ScheduleFormValues, 'date'> & { date: string }) => Promise<void>;
  onDelete?: (scheduleId: number) => Promise<void>;
}

export function ScheduleEditor({
  isOpen,
  onClose,
  staffList,
  shiftTypes,
  dutyTypes,
  existingSchedules,
  scheduleToEdit,
  onSave,
  onDelete
}: ScheduleEditorProps) {
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [alternativeStaff, setAlternativeStaff] = useState<StaffWithUser[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Set up form with default values
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: scheduleToEdit ? {
      staffId: scheduleToEdit.staffId,
      date: new Date(scheduleToEdit.date),
      shiftTypeId: scheduleToEdit.shiftTypeId,
      dutyTypeId: scheduleToEdit.dutyTypeId,
      unit: scheduleToEdit.unit || "",
      notes: "",
    } : {
      staffId: undefined,
      date: new Date(),
      shiftTypeId: null,
      dutyTypeId: undefined,
      unit: "",
      notes: "",
    },
  });
  
  // Reset form when scheduleToEdit changes
  useEffect(() => {
    if (scheduleToEdit) {
      form.reset({
        staffId: scheduleToEdit.staffId,
        date: new Date(scheduleToEdit.date),
        shiftTypeId: scheduleToEdit.shiftTypeId,
        dutyTypeId: scheduleToEdit.dutyTypeId,
        unit: scheduleToEdit.unit || "",
        notes: "",
      });
    } else {
      form.reset({
        staffId: undefined,
        date: new Date(),
        shiftTypeId: null,
        dutyTypeId: undefined,
        unit: "",
        notes: "",
      });
    }
  }, [scheduleToEdit, form]);
  
  // Function to check for conflicts when form values change
  const checkConflicts = (values: ScheduleFormValues) => {
    if (!values.staffId || !values.date || !values.dutyTypeId) return;
    
    const dateString = format(values.date, 'yyyy-MM-dd');
    
    // Create a schedule object from form values for conflict detection
    const scheduleToCheck: any = {
      staffId: values.staffId,
      date: dateString,
      shiftTypeId: values.shiftTypeId,
      dutyTypeId: values.dutyTypeId,
      unit: values.unit,
    };
    
    // Add staff name to the schedule for better conflict messages
    const staffMember = staffList.find(s => s.id === values.staffId);
    if (staffMember) {
      scheduleToCheck.staffName = `${staffMember.user.firstName} ${staffMember.user.lastName}`;
    }
    
    // Detect conflicts
    const detectedConflicts = detectScheduleConflicts(
      scheduleToCheck,
      existingSchedules,
      staffList,
      [], // availabilities (not needed for basic detection)
      shiftTypes
    );
    
    setConflicts(detectedConflicts);
    
    // If conflicts found, suggest alternative staff
    if (detectedConflicts.length > 0) {
      const alternatives = suggestAlternativeStaff(
        scheduleToCheck.staffId,
        scheduleToCheck.date,
        scheduleToCheck.shiftTypeId,
        staffList,
        existingSchedules,
        [], // availabilities (not needed for basic suggestion)
        scheduleToCheck.unit
      );
      setAlternativeStaff(alternatives);
    } else {
      setAlternativeStaff([]);
    }
  };
  
  // Check for conflicts when form values change
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name === 'staffId' || name === 'date' || name === 'shiftTypeId' || name === 'dutyTypeId') {
        checkConflicts(form.getValues() as ScheduleFormValues);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, staffList, existingSchedules, shiftTypes]);
  
  // Handle form submission
  const onSubmit = async (values: ScheduleFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Format date as string
      const dateString = format(values.date, 'yyyy-MM-dd');
      
      // Check conflicts one more time
      checkConflicts(values);
      
      // If critical conflicts, show warning and prevent save
      const criticalConflicts = conflicts.filter(c => c.severity === 'error');
      if (criticalConflicts.length > 0) {
        toast({
          title: "Cannot save schedule",
          description: "There are critical conflicts that must be resolved",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      
      // Save schedule
      await onSave({
        ...values,
        date: dateString,
      });
      
      // Show success toast
      toast({
        title: "Schedule saved",
        description: "The schedule has been successfully saved",
      });
      
      // Close dialog
      onClose();
      
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast({
        title: "Error",
        description: "Failed to save schedule",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle schedule deletion
  const handleDelete = async () => {
    if (!scheduleToEdit || !onDelete) return;
    
    try {
      setIsDeleting(true);
      await onDelete(scheduleToEdit.id);
      
      toast({
        title: "Schedule deleted",
        description: "The schedule has been successfully deleted",
      });
      
      onClose();
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast({
        title: "Error",
        description: "Failed to delete schedule",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Apply alternative staff suggestion
  const applyStaffSuggestion = (staffId: number) => {
    form.setValue('staffId', staffId);
    checkConflicts({
      ...form.getValues() as ScheduleFormValues,
      staffId
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{scheduleToEdit ? "Edit Schedule" : "Create Schedule"}</DialogTitle>
          <DialogDescription>
            {scheduleToEdit 
              ? "Edit the schedule details below" 
              : "Fill in the details to create a new schedule assignment"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 dialog-scrollable">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Staff Select */}
              <FormField
                control={form.control}
                name="staffId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Member</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a staff member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staffList.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id.toString()}>
                            {staff.user.firstName} {staff.user.lastName} ({staff.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Date Picker */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={"w-full pl-3 text-left font-normal"}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Shift Type Select */}
              <FormField
                control={form.control}
                name="shiftTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shift Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value?.toString() || null} 
                      value={field.value?.toString() || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a shift type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None (Rest Day)</SelectItem>
                        {shiftTypes.map((shift) => (
                          <SelectItem key={shift.id} value={shift.id.toString()}>
                            {shift.name} ({shift.startTime} - {shift.endTime})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Duty Type Select */}
              <FormField
                control={form.control}
                name="dutyTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duty Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a duty type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dutyTypes.map((duty) => (
                          <SelectItem key={duty.id} value={duty.id.toString()}>
                            {duty.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Unit Input */}
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Emergency, ICU, etc." 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Notes Input */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Any additional notes" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Conflict Warnings */}
              {conflicts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800">
                  <h4 className="font-medium flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Schedule Conflicts Detected
                  </h4>
                  <ul className="mt-2 text-sm space-y-1">
                    {conflicts.map((conflict, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-amber-500 font-medium mr-1">•</span>
                        {conflict.message}
                      </li>
                    ))}
                  </ul>
                  
                  {/* Alternative Staff Suggestions */}
                  {alternativeStaff.length > 0 && (
                    <div className="mt-3 border-t border-amber-200 pt-2">
                      <h5 className="font-medium text-sm">Suggested Alternatives:</h5>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {alternativeStaff.map(staff => (
                          <Button
                            key={staff.id}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1 text-xs bg-white"
                            onClick={() => applyStaffSuggestion(staff.id)}
                          >
                            <UserPlus className="h-3 w-3" />
                            {staff.user.firstName} {staff.user.lastName}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>
          </Form>
        </div>
        
        <DialogFooter className="flex items-center justify-between">
          <div>
            {scheduleToEdit && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="flex items-center gap-1"
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-1"></span>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="flex items-center gap-1"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-1"></span>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}