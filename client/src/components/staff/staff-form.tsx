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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

const staffFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.string().min(1, "Staff role is required"),
  specialization: z.string().optional(),
  contactInfo: z.string().optional(),
});

type StaffFormValues = z.infer<typeof staffFormSchema>;

interface StaffFormProps {
  onSuccess?: () => void;
  defaultValues?: Partial<StaffFormValues>;
  isEditing?: boolean;
  staffId?: number;
}

export function StaffForm({ 
  onSuccess, 
  defaultValues = {},
  isEditing = false,
  staffId
}: StaffFormProps) {
  const { toast } = useToast();
  
  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      password: "",
      role: "",
      specialization: "",
      contactInfo: "",
      ...defaultValues,
    },
  });
  
  const createStaffMutation = useMutation({
    mutationFn: async (data: StaffFormValues) => {
      // For creating a new staff member, we need to register them as a user first
      const registerData = {
        username: data.username,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: "staff",
        isActive: true,
        staffRole: data.role,
        specialization: data.specialization,
        contactInfo: data.contactInfo,
      };
      
      const res = await apiRequest("POST", "/api/register", registerData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Staff member created",
        description: "The staff member has been successfully created.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      
      if (onSuccess) {
        onSuccess();
      }
      
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating staff",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateStaffMutation = useMutation({
    mutationFn: async (data: StaffFormValues) => {
      if (!staffId) {
        throw new Error("Staff ID is required for updating");
      }
      
      const res = await apiRequest("PATCH", `/api/staff/${staffId}`, {
        role: data.role,
        specialization: data.specialization,
        contactInfo: data.contactInfo,
      });
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Staff member updated",
        description: "The staff member has been successfully updated.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating staff",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: StaffFormValues) => {
    if (isEditing) {
      updateStaffMutation.mutate(data);
    } else {
      createStaffMutation.mutate(data);
    }
  };
  
  const isPending = createStaffMutation.isPending || updateStaffMutation.isPending;
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter first name"
                    disabled={isEditing}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter last name" 
                    disabled={isEditing}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {!isEditing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Enter password" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
        
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Doctor">Doctor</SelectItem>
                  <SelectItem value="Nurse">Nurse</SelectItem>
                  <SelectItem value="Technician">Technician</SelectItem>
                  <SelectItem value="Administrator">Administrator</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="specialization"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specialization (Optional)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="E.g., Cardiology, Emergency, Pediatrics" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="contactInfo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Information (Optional)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Phone number or email" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : isEditing ? "Update Staff" : "Add Staff"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
