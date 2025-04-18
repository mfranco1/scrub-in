import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { StaffForm } from "./staff-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Trash2, Plus } from "lucide-react";
import { StaffWithUser } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function StaffList() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffWithUser | null>(null);
  
  // Fetch staff data
  const { data: staff, isLoading } = useQuery<StaffWithUser[]>({
    queryKey: ["/api/staff"],
    queryFn: async () => {
      const res = await fetch("/api/staff", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    }
  });
  
  // Mutation for deleting staff
  const deleteStaffMutation = useMutation({
    mutationFn: async (staffId: number) => {
      return await apiRequest("PATCH", `/api/staff/${staffId}`, { isActive: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({
        title: "Staff member deactivated",
        description: "The staff member has been successfully deactivated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to deactivate staff: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const handleAddSuccess = () => {
    setIsAddDialogOpen(false);
  };
  
  const handleEditSuccess = () => {
    setEditingStaff(null);
  };
  
  const handleDelete = (staffId: number) => {
    if (confirm("Are you sure you want to deactivate this staff member?")) {
      deleteStaffMutation.mutate(staffId);
    }
  };
  
  // Initialize the edit dialog with the staff data
  const handleEdit = (staff: StaffWithUser) => {
    setEditingStaff(staff);
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Staff Members</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
            </DialogHeader>
            <StaffForm onSuccess={handleAddSuccess} />
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Specialization</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <div className="flex items-center">
                      <Skeleton className="h-8 w-8 rounded-full mr-2" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-16 inline-block mr-2" />
                    <Skeleton className="h-8 w-16 inline-block" />
                  </TableCell>
                </TableRow>
              ))
            ) : staff?.length ? (
              staff.map((staffMember) => (
                <TableRow key={staffMember.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium mr-2">
                        {staffMember.user.firstName.charAt(0)}{staffMember.user.lastName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">
                          {staffMember.user.firstName} {staffMember.user.lastName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {staffMember.user.username}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{staffMember.role}</TableCell>
                  <TableCell>{staffMember.specialization || "-"}</TableCell>
                  <TableCell>{staffMember.contactInfo || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Dialog open={editingStaff?.id === staffMember.id} onOpenChange={(open) => !open && setEditingStaff(null)}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mr-2"
                          onClick={() => handleEdit(staffMember)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[550px]">
                        <DialogHeader>
                          <DialogTitle>Edit Staff Member</DialogTitle>
                        </DialogHeader>
                        {editingStaff && (
                          <StaffForm 
                            onSuccess={handleEditSuccess}
                            defaultValues={{
                              firstName: editingStaff.user.firstName,
                              lastName: editingStaff.user.lastName,
                              role: editingStaff.role,
                              specialization: editingStaff.specialization || "",
                              contactInfo: editingStaff.contactInfo || "",
                            }}
                            isEditing={true}
                            staffId={editingStaff.id}
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDelete(staffMember.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  No staff members found. Add staff to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
