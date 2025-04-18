import React, { useState } from "react";
import { Layout } from "@/components/layout/layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Plus } from "lucide-react";
import { StaffWithUser, Availability, InsertAvailability } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const availabilityFormSchema = z.object({
  staffId: z.coerce.number({
    required_error: "Staff member is required",
    invalid_type_error: "Staff member must be a number",
  }),
  date: z.date({
    required_error: "Date is required",
  }),
  isAvailable: z.boolean().default(true),
  reason: z.string().optional(),
});

type AvailabilityFormValues = z.infer<typeof availabilityFormSchema>;

export default function AvailabilityPage() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Fetch staff
  const { data: staff, isLoading: isLoadingStaff } = useQuery<StaffWithUser[]>({
    queryKey: ["/api/staff"],
    queryFn: async () => {
      const res = await fetch("/api/staff", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    }
  });
  
  // Get current date range (this month)
  const currentDate = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  const startDate = format(firstDayOfMonth, 'yyyy-MM-dd');
  const endDate = format(lastDayOfMonth, 'yyyy-MM-dd');
  
  // Fetch availabilities
  const { data: availabilities, isLoading: isLoadingAvailabilities } = useQuery<Availability[]>({
    queryKey: ["/api/availability", { startDate, endDate }],
    queryFn: async ({ queryKey }) => {
      const [_, params] = queryKey;
      const res = await fetch(
        `/api/availability?startDate=${params.startDate}&endDate=${params.endDate}`,
        { credentials: "include" }
      );
      
      if (!res.ok) throw new Error("Failed to fetch availabilities");
      return res.json();
    }
  });
  
  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      staffId: undefined,
      date: undefined,
      isAvailable: true,
      reason: "",
    },
  });
  
  const createAvailabilityMutation = useMutation({
    mutationFn: async (data: AvailabilityFormValues) => {
      const availabilityData: InsertAvailability = {
        staffId: data.staffId,
        date: format(data.date, 'yyyy-MM-dd'),
        isAvailable: data.isAvailable,
        reason: data.reason || null,
      };
      
      const res = await apiRequest("POST", "/api/availability", availabilityData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Availability updated",
        description: "Staff availability has been updated successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
      
      setIsFormOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating availability",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: AvailabilityFormValues) => {
    createAvailabilityMutation.mutate(data);
  };
  
  // Find availability for a specific staff and date
  const findAvailability = (staffId: number, date: string) => {
    return availabilities?.find(a => a.staffId === staffId && a.date === date);
  };
  
  const isLoading = isLoadingStaff || isLoadingAvailabilities || createAvailabilityMutation.isPending;
  
  // Generate dates for the current month
  const daysInMonth = [];
  const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  
  while (currentMonth.getMonth() === currentDate.getMonth()) {
    daysInMonth.push(new Date(currentMonth));
    currentMonth.setDate(currentMonth.getDate() + 1);
  }
  
  return (
    <Layout title="Staff Availability" subtitle="Track staff availability and time-off requests">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Availability Calendar</h2>
          <p className="text-slate-500">
            {format(firstDayOfMonth, 'MMMM yyyy')}
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Set Availability
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Set Staff Availability</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="staffId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Staff Member</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value?.toString()}
                        disabled={isLoadingStaff}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a staff member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {staff?.map((staffMember) => (
                            <SelectItem key={staffMember.id} value={staffMember.id.toString()}>
                              {staffMember.user.firstName} {staffMember.user.lastName} ({staffMember.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
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
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isAvailable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Available</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Check if the staff member is available on this date
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter a reason for unavailability"
                          {...field}
                          disabled={form.watch("isAvailable")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save Availability"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="border rounded-md overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-white z-10">Staff</TableHead>
              {daysInMonth.map((day) => (
                <TableHead key={day.toISOString()} className="text-center min-w-[80px]">
                  <div className="font-medium">{format(day, 'd')}</div>
                  <div className="text-xs text-slate-500 font-normal">{format(day, 'EEE')}</div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingStaff ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell className="sticky left-0 bg-white">
                    <div className="flex items-center">
                      <Skeleton className="h-8 w-8 rounded-full mr-2" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                  {daysInMonth.map((day) => (
                    <TableCell key={day.toISOString()} className="text-center">
                      <Skeleton className="h-6 w-6 rounded-full mx-auto" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : staff?.length ? (
              staff.map((staffMember) => (
                <TableRow key={staffMember.id}>
                  <TableCell className="sticky left-0 bg-white">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium mr-2">
                        {staffMember.user.firstName.charAt(0)}{staffMember.user.lastName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">
                          {staffMember.user.firstName} {staffMember.user.lastName}
                        </div>
                        <div className="text-xs text-slate-500">{staffMember.role}</div>
                      </div>
                    </div>
                  </TableCell>
                  {daysInMonth.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const availability = findAvailability(staffMember.id, dateStr);
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    
                    return (
                      <TableCell key={day.toISOString()} className={cn(
                        "text-center",
                        isWeekend ? "bg-slate-50" : ""
                      )}>
                        {availability?.isAvailable === false ? (
                          <div 
                            className="h-6 w-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto tooltip"
                            title={availability.reason || "Unavailable"}
                          >
                            ✕
                          </div>
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                            ✓
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={daysInMonth.length + 1} className="text-center py-8 text-slate-500">
                  No staff members found. Add staff to track availability.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="mt-6">
        <div className="text-xl font-semibold mb-4">Legend</div>
        <div className="flex items-center space-x-6">
          <div className="flex items-center">
            <div className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-2">
              ✓
            </div>
            <span>Available</span>
          </div>
          <div className="flex items-center">
            <div className="h-6 w-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center mr-2">
              ✕
            </div>
            <span>Unavailable</span>
          </div>
          <div className="flex items-center">
            <div className="h-6 w-6 bg-slate-50 flex items-center justify-center mr-2">
              
            </div>
            <span>Weekend</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
