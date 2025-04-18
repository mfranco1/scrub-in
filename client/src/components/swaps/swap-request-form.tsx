import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StaffWithUser, ShiftType, InsertSwapRequest } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

const swapRequestSchema = z.object({
  requestedStaffId: z.coerce.number({
    required_error: "Staff member is required",
    invalid_type_error: "Staff member must be a number",
  }),
  date: z.date({
    required_error: "Date is required",
  }),
  shiftTypeId: z.coerce.number({
    required_error: "Shift type is required",
    invalid_type_error: "Shift type must be a number",
  }),
});

type SwapRequestValues = z.infer<typeof swapRequestSchema>;

interface SwapRequestFormProps {
  onSuccess?: () => void;
}

export function SwapRequestForm({ onSuccess }: SwapRequestFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Get current staff ID
  const { data: currentStaff } = useQuery({
    queryKey: ["/api/staff/current"],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      
      // Fetch all staff and find the one matching the current user ID
      const res = await fetch("/api/staff", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch staff");
      
      const allStaff: StaffWithUser[] = await res.json();
      return allStaff.find(staff => staff.userId === user.id);
    },
    enabled: !!user,
  });
  
  // Fetch staff data (excluding current user)
  const { data: staff, isLoading: isLoadingStaff } = useQuery<StaffWithUser[]>({
    queryKey: ["/api/staff"],
    queryFn: async () => {
      const res = await fetch("/api/staff", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch staff");
      
      const allStaff: StaffWithUser[] = await res.json();
      // Filter out current user if available
      return currentStaff 
        ? allStaff.filter(s => s.id !== currentStaff.id)
        : allStaff;
    },
    enabled: !!currentStaff,
  });
  
  // Fetch shift types
  const { data: shiftTypes, isLoading: isLoadingShiftTypes } = useQuery<ShiftType[]>({
    queryKey: ["/api/shift-types"],
    queryFn: async () => {
      const res = await fetch("/api/shift-types", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch shift types");
      return res.json();
    }
  });
  
  const form = useForm<SwapRequestValues>({
    resolver: zodResolver(swapRequestSchema),
    defaultValues: {
      requestedStaffId: undefined,
      date: undefined,
      shiftTypeId: undefined,
    },
  });
  
  const createSwapRequestMutation = useMutation({
    mutationFn: async (data: SwapRequestValues) => {
      if (!currentStaff) {
        throw new Error("Current staff information not available");
      }
      
      const swapData: InsertSwapRequest = {
        requestingStaffId: currentStaff.id,
        requestedStaffId: data.requestedStaffId,
        date: format(data.date, 'yyyy-MM-dd'),
        shiftTypeId: data.shiftTypeId,
        status: "pending",
      };
      
      const res = await apiRequest("POST", "/api/swap-requests", swapData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Swap request created",
        description: "Your swap request has been successfully created.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/swap-requests"] });
      
      if (onSuccess) {
        onSuccess();
      }
      
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating swap request",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: SwapRequestValues) => {
    createSwapRequestMutation.mutate(data);
  };
  
  const isLoading = isLoadingStaff || isLoadingShiftTypes || createSwapRequestMutation.isPending;
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="requestedStaffId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Staff Member to Swap With</FormLabel>
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
              <FormLabel>Date for Swap</FormLabel>
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
                    disabled={(date) => date < new Date()}
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
          name="shiftTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Shift Type</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value?.toString()}
                disabled={isLoadingShiftTypes}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a shift type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {shiftTypes?.map((shiftType) => (
                    <SelectItem key={shiftType.id} value={shiftType.id.toString()}>
                      {shiftType.name} ({shiftType.startTime} - {shiftType.endTime})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Submitting..." : "Submit Swap Request"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
