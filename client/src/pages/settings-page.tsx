import React, { useState } from "react";
import { Layout } from "@/components/layout/layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ShiftType, DutyType } from "@shared/schema";
import { ShiftForm } from "@/components/shifts/shift-form";
import { DutyForm } from "@/components/shifts/duty-form";
import { Pencil, Save, X } from "lucide-react";

const profileFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  contactInfo: z.string().optional(),
});

const organizationFormSchema = z.object({
  hospitalName: z.string().min(2, "Hospital name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  contactNumber: z.string().min(5, "Contact number must be at least 5 characters"),
  defaultUnit: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [editingShiftType, setEditingShiftType] = useState<ShiftType | null>(null);
  const [editingDutyType, setEditingDutyType] = useState<DutyType | null>(null);
  
  // Fetch staff with user data
  const { data: staffData } = useQuery({
    queryKey: ["/api/staff/current"],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");
      
      // Fetch all staff and find the one matching current user
      const res = await fetch("/api/staff", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch staff data");
      
      const allStaff = await res.json();
      return allStaff.find((staff: any) => staff.userId === user.id);
    },
    enabled: !!user,
  });
  
  // Fetch shift types
  const { data: shiftTypes } = useQuery<ShiftType[]>({
    queryKey: ["/api/shift-types"],
    queryFn: async () => {
      const res = await fetch("/api/shift-types", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch shift types");
      return res.json();
    }
  });
  
  // Fetch duty types
  const { data: dutyTypes } = useQuery<DutyType[]>({
    queryKey: ["/api/duty-types"],
    queryFn: async () => {
      const res = await fetch("/api/duty-types", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch duty types");
      return res.json();
    }
  });
  
  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      contactInfo: staffData?.contactInfo || "",
    },
  });
  
  // Organization form - this would typically be populated from the backend
  const organizationForm = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      hospitalName: "Central Hospital",
      address: "123 Healthcare Ave, Medical District",
      contactNumber: "555-123-4567",
      defaultUnit: "General",
    },
  });
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      if (!user || !staffData) throw new Error("User data not available");
      
      // Update user data
      await apiRequest("PATCH", `/api/users/${user.id}`, {
        firstName: data.firstName,
        lastName: data.lastName,
      });
      
      // Update staff data
      await apiRequest("PATCH", `/api/staff/${staffData.id}`, {
        contactInfo: data.contactInfo,
      });
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update organization settings mutation
  const updateOrganizationMutation = useMutation({
    mutationFn: async (data: OrganizationFormValues) => {
      // In a real application, this would update organization settings
      // For now, we'll just simulate success
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Organization settings updated",
        description: "Organization settings have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating organization settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submissions
  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };
  
  const onOrganizationSubmit = (data: OrganizationFormValues) => {
    updateOrganizationMutation.mutate(data);
  };
  
  // When the user data or staff data changes, update the form
  React.useEffect(() => {
    if (user && staffData) {
      profileForm.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        contactInfo: staffData.contactInfo || "",
      });
    }
  }, [user, staffData, profileForm]);
  
  const handleEditShiftType = (shiftType: ShiftType) => {
    setEditingShiftType(shiftType);
  };
  
  const handleEditDutyType = (dutyType: DutyType) => {
    setEditingDutyType(dutyType);
  };
  
  const handleShiftTypeEditSuccess = () => {
    setEditingShiftType(null);
  };
  
  const handleDutyTypeEditSuccess = () => {
    setEditingDutyType(null);
  };
  
  return (
    <Layout title="Settings" subtitle="Configure application settings">
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="shifts">Shift Settings</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
        </TabsList>
        
        {/* Profile Settings Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Update your personal information and contact details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={profileForm.control}
                    name="contactInfo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Information</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone number or email address" {...field} />
                        </FormControl>
                        <FormDescription>
                          This information will be used for notifications and emergency contact.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Shift Settings Tab */}
        <TabsContent value="shifts">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Shift Types */}
            <Card>
              <CardHeader>
                <CardTitle>Shift Types</CardTitle>
                <CardDescription>
                  Configure the shift types used in the scheduling system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {editingShiftType ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Edit Shift Type</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setEditingShiftType(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <ShiftForm 
                      onSuccess={handleShiftTypeEditSuccess}
                      defaultValues={{
                        name: editingShiftType.name,
                        startTime: editingShiftType.startTime,
                        endTime: editingShiftType.endTime,
                        duration: editingShiftType.duration,
                      }}
                      isEditing={true}
                      shiftTypeId={editingShiftType.id}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {shiftTypes?.map((shiftType) => (
                      <div key={shiftType.id} className="p-3 border rounded-md">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{shiftType.name}</div>
                            <div className="text-sm text-slate-500">
                              {shiftType.startTime} - {shiftType.endTime} ({shiftType.duration} hours)
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditShiftType(shiftType)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {!shiftTypes?.length && (
                      <div className="text-center py-6 text-slate-500">
                        <p>No shift types defined yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end">
                {!editingShiftType && (
                  <Button variant="outline" onClick={() => setEditingShiftType({} as ShiftType)}>
                    Add New Shift Type
                  </Button>
                )}
              </CardFooter>
            </Card>
            
            {/* Duty Types */}
            <Card>
              <CardHeader>
                <CardTitle>Duty Types</CardTitle>
                <CardDescription>
                  Configure the duty types used in the scheduling system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {editingDutyType ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Edit Duty Type</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setEditingDutyType(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <DutyForm 
                      onSuccess={handleDutyTypeEditSuccess}
                      defaultValues={{
                        name: editingDutyType.name,
                      }}
                      isEditing={true}
                      dutyTypeId={editingDutyType.id}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dutyTypes?.map((dutyType) => (
                      <div key={dutyType.id} className="p-3 border rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{dutyType.name}</div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditDutyType(dutyType)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {!dutyTypes?.length && (
                      <div className="text-center py-6 text-slate-500">
                        <p>No duty types defined yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end">
                {!editingDutyType && (
                  <Button variant="outline" onClick={() => setEditingDutyType({} as DutyType)}>
                    Add New Duty Type
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        {/* Organization Settings Tab */}
        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>
                Configure the organization details and scheduling preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...organizationForm}>
                <form onSubmit={organizationForm.handleSubmit(onOrganizationSubmit)} className="space-y-4">
                  <FormField
                    control={organizationForm.control}
                    name="hospitalName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hospital Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={organizationForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={organizationForm.control}
                      name="contactNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={organizationForm.control}
                      name="defaultUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Unit</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., General, Emergency, ICU" {...field} />
                          </FormControl>
                          <FormDescription>
                            The default unit to assign to schedules
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="flex justify-between">
                    <h3 className="text-lg font-medium">Scheduling Preferences</h3>
                  </div>
                  
                  <div className="border p-4 rounded-md text-sm text-slate-500">
                    <p>
                      Scheduling preferences are configured globally. Contact the system 
                      administrator to adjust the scheduling algorithm parameters.
                    </p>
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={updateOrganizationMutation.isPending}
                  >
                    {updateOrganizationMutation.isPending ? "Saving..." : "Save Organization Settings"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
