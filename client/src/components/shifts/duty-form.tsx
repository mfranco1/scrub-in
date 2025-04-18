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
import { InsertDutyType, DutyType } from "@shared/schema";

const dutyFormSchema = z.object({
  name: z.string().min(2, "Duty name must be at least 2 characters"),
});

type DutyFormValues = z.infer<typeof dutyFormSchema>;

interface DutyFormProps {
  onSuccess?: () => void;
  defaultValues?: Partial<DutyFormValues>;
  isEditing?: boolean;
  dutyTypeId?: number;
}

export function DutyForm({ 
  onSuccess, 
  defaultValues = {},
  isEditing = false,
  dutyTypeId
}: DutyFormProps) {
  const { toast } = useToast();
  
  const form = useForm<DutyFormValues>({
    resolver: zodResolver(dutyFormSchema),
    defaultValues: {
      name: "",
      ...defaultValues,
    },
  });
  
  const createDutyMutation = useMutation({
    mutationFn: async (data: DutyFormValues) => {
      const dutyData: InsertDutyType = {
        name: data.name,
      };
      
      const res = await apiRequest("POST", "/api/duty-types", dutyData);
      return res.json();
    },
    onSuccess: (dutyType: DutyType) => {
      toast({
        title: "Duty type created",
        description: `${dutyType.name} has been successfully created.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/duty-types"] });
      
      if (onSuccess) {
        onSuccess();
      }
      
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating duty type",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateDutyMutation = useMutation({
    mutationFn: async (data: DutyFormValues) => {
      if (!dutyTypeId) {
        throw new Error("Duty type ID is required for updating");
      }
      
      const dutyData: Partial<InsertDutyType> = {
        name: data.name,
      };
      
      const res = await apiRequest("PATCH", `/api/duty-types/${dutyTypeId}`, dutyData);
      return res.json();
    },
    onSuccess: (dutyType: DutyType) => {
      toast({
        title: "Duty type updated",
        description: `${dutyType.name} has been successfully updated.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/duty-types"] });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating duty type",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: DutyFormValues) => {
    if (isEditing) {
      updateDutyMutation.mutate(data);
    } else {
      createDutyMutation.mutate(data);
    }
  };
  
  const isPending = createDutyMutation.isPending || updateDutyMutation.isPending;
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duty Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Pre-Duty, Duty, Post-Duty" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : isEditing ? "Update Duty Type" : "Add Duty Type"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
