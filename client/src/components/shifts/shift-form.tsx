import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { InsertShiftType, ShiftType } from "@shared/schema";

const shiftFormSchema = z.object({
  name: z.string().min(2, "Shift name must be at least 2 characters"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Must be in 24-hour format (HH:MM)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Must be in 24-hour format (HH:MM)"),
  duration: z.coerce.number().min(1, "Duration must be at least 1 hour"),
});

type ShiftFormValues = z.infer<typeof shiftFormSchema>;

interface ShiftFormProps {
  onSuccess?: () => void;
  defaultValues?: Partial<ShiftFormValues>;
  isEditing?: boolean;
  shiftTypeId?: number;
}

export function ShiftForm({ 
  onSuccess, 
  defaultValues = {},
  isEditing = false,
  shiftTypeId
}: ShiftFormProps) {
  const { toast } = useToast();
  
  const form = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      name: "",
      startTime: "",
      endTime: "",
      duration: 8,
      ...defaultValues,
    },
  });
  
  const createShiftMutation = useMutation({
    mutationFn: async (data: ShiftFormValues) => {
      const shiftData: InsertShiftType = {
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        duration: data.duration,
      };
      
      const res = await apiRequest("POST", "/api/shift-types", shiftData);
      return res.json();
    },
    onSuccess: (shiftType: ShiftType) => {
      toast({
        title: "Shift type created",
        description: `${shiftType.name} has been successfully created.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/shift-types"] });
      
      if (onSuccess) {
        onSuccess();
      }
      
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating shift type",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateShiftMutation = useMutation({
    mutationFn: async (data: ShiftFormValues) => {
      if (!shiftTypeId) {
        throw new Error("Shift type ID is required for updating");
      }
      
      const shiftData: Partial<InsertShiftType> = {
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        duration: data.duration,
      };
      
      const res = await apiRequest("PATCH", `/api/shift-types/${shiftTypeId}`, shiftData);
      return res.json();
    },
    onSuccess: (shiftType: ShiftType) => {
      toast({
        title: "Shift type updated",
        description: `${shiftType.name} has been successfully updated.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/shift-types"] });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating shift type",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: ShiftFormValues) => {
    if (isEditing) {
      updateShiftMutation.mutate(data);
    } else {
      createShiftMutation.mutate(data);
    }
  };
  
  const isPending = createShiftMutation.isPending || updateShiftMutation.isPending;
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Shift Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Day Shift, Evening Shift" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time (24h format)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 07:00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time (24h format)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 15:00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (hours)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="1" 
                  max="24" 
                  placeholder="e.g., 8" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : isEditing ? "Update Shift Type" : "Add Shift Type"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
