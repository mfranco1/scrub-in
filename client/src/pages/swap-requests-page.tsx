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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SwapRequestForm } from "@/components/swaps/swap-request-form";
import { SwapRequestWithDetails } from "@shared/schema";
import { Plus, Check, X } from "lucide-react";
import { formatDate } from "@/lib/format-date";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SwapRequestsPage() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Fetch swap requests
  const { data: swapRequests, isLoading } = useQuery<SwapRequestWithDetails[]>({
    queryKey: ["/api/swap-requests"],
    queryFn: async () => {
      const res = await fetch("/api/swap-requests", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch swap requests");
      return res.json();
    }
  });
  
  // Mutation for approving swap requests
  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("PATCH", `/api/swap-requests/${id}`, { status: "approved" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/swap-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      toast({
        title: "Swap request approved",
        description: "The swap request has been approved and schedules updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to approve swap request: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for denying swap requests
  const denyMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("PATCH", `/api/swap-requests/${id}`, { status: "rejected" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/swap-requests"] });
      toast({
        title: "Swap request denied",
        description: "The swap request has been denied.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to deny swap request: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const handleAddSuccess = () => {
    setIsFormOpen(false);
  };
  
  const handleApprove = (id: number) => {
    approveMutation.mutate(id);
  };
  
  const handleDeny = (id: number) => {
    denyMutation.mutate(id);
  };
  
  // Function to get badge variant based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "pending":
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };
  
  // Function to format initials
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };
  
  return (
    <Layout title="Swap Requests" subtitle="Manage staff shift swap requests">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">All Swap Requests</h2>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Swap Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Create Swap Request</DialogTitle>
            </DialogHeader>
            <SwapRequestForm onSuccess={handleAddSuccess} />
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requesting Staff</TableHead>
              <TableHead>Requested Staff</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested</TableHead>
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
                  <TableCell>
                    <div className="flex items-center">
                      <Skeleton className="h-8 w-8 rounded-full mr-2" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-20 inline-block mr-2" />
                    <Skeleton className="h-8 w-16 inline-block" />
                  </TableCell>
                </TableRow>
              ))
            ) : swapRequests?.length ? (
              swapRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium mr-2">
                        {getInitials(
                          request.requestingStaff.user.firstName,
                          request.requestingStaff.user.lastName
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          {request.requestingStaff.user.firstName} {request.requestingStaff.user.lastName}
                        </div>
                        <div className="text-xs text-slate-500">{request.requestingStaff.role}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-medium mr-2">
                        {getInitials(
                          request.requestedStaff.user.firstName,
                          request.requestedStaff.user.lastName
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          {request.requestedStaff.user.firstName} {request.requestedStaff.user.lastName}
                        </div>
                        <div className="text-xs text-slate-500">{request.requestedStaff.role}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{formatDate(request.date)}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(request.date).toLocaleDateString('en-US', { weekday: 'long' })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{request.shiftType.name}</div>
                    <div className="text-xs text-slate-500">
                      {request.shiftType.startTime} - {request.shiftType.endTime}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(request.status)}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-slate-500">
                      {new Date(request.requestTimestamp).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {request.status === "pending" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-2 bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                          onClick={() => handleApprove(request.id)}
                          disabled={approveMutation.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                          onClick={() => handleDeny(request.id)}
                          disabled={denyMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No swap requests found. Create a swap request to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Layout>
  );
}
