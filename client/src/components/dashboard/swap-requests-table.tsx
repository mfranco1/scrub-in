import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/format-date";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SwapRequestWithDetails } from "@shared/schema";

export function SwapRequestsTable() {
  const { toast } = useToast();
  
  // Fetch pending swap requests
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
  
  const handleApprove = (id: number) => {
    approveMutation.mutate(id);
  };
  
  const handleDeny = (id: number) => {
    denyMutation.mutate(id);
  };
  
  // Function to format initials
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };
  
  return (
    <Card className="shadow-sm border border-slate-200">
      <CardHeader className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Pending Swap Requests</h2>
        <p className="text-sm text-slate-500">Staff requests requiring approval</p>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Requestor</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Requested Staff</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Shift</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 2 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Skeleton className="h-8 w-8 rounded-full mr-2" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Skeleton className="h-8 w-8 rounded-full mr-2" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Skeleton className="h-8 w-20 inline-block mr-2" />
                      <Skeleton className="h-8 w-16 inline-block" />
                    </td>
                  </tr>
                ))
              ) : (
                swapRequests?.length ? (
                  swapRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium mr-2">
                            {getInitials(
                              request.requestingStaff.user.firstName,
                              request.requestingStaff.user.lastName
                            )}
                          </div>
                          <div className="text-sm font-medium text-slate-900">
                            {request.requestingStaff.user.firstName} {request.requestingStaff.user.lastName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-medium mr-2">
                            {getInitials(
                              request.requestedStaff.user.firstName,
                              request.requestedStaff.user.lastName
                            )}
                          </div>
                          <div className="text-sm font-medium text-slate-900">
                            {request.requestedStaff.user.firstName} {request.requestedStaff.user.lastName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">{formatDate(request.date)}</div>
                        <div className="text-xs text-slate-500">{new Date(request.date).toLocaleDateString('en-US', { weekday: 'long' })}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                          {request.shiftType.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApprove(request.id)}
                          className="mr-2 bg-green-600 hover:bg-green-700"
                          disabled={approveMutation.isPending}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeny(request.id)}
                          disabled={denyMutation.isPending}
                        >
                          Deny
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-slate-500">
                      No pending swap requests found.
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 border-t border-slate-200 text-center">
        <Button
          variant="link"
          className="text-primary-600 hover:text-primary-800"
          onClick={() => window.location.href = "/swap-requests"}
        >
          View All Swap Requests
        </Button>
      </CardFooter>
    </Card>
  );
}
