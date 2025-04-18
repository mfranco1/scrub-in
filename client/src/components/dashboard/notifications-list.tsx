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
import { 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  RefreshCw 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Notification } from "@shared/schema";

// Function to get relative time
function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  }
  if (diffHours > 0) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }
  if (diffMinutes > 0) {
    return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
  }
  return "Just now";
}

export function NotificationsList() {
  const { toast } = useToast();
  
  // Fetch notifications
  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    }
  });
  
  // Mutation for marking notifications as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("PATCH", `/api/notifications/${id}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to mark notification as read: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "urgent":
      case "error":
        return (
          <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <AlertCircle className="h-5 w-5" />
          </div>
        );
      case "warning":
        return (
          <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
        );
      case "success":
        return (
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <CheckCircle className="h-5 w-5" />
          </div>
        );
      case "info":
      default:
        return (
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <RefreshCw className="h-5 w-5" />
          </div>
        );
    }
  };
  
  return (
    <Card className="shadow-sm border border-slate-200 h-full">
      <CardHeader className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
        <p className="text-sm text-slate-500">Recent activity and alerts</p>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="divide-y divide-slate-200">
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="px-4 py-3">
                <div className="flex">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="ml-3 flex-1">
                    <Skeleton className="h-4 w-full mb-2" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : notifications?.length ? (
            notifications.slice(0, 4).map((notification) => (
              <div key={notification.id} className="px-4 py-3 hover:bg-slate-50">
                <div className="flex">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-slate-900">
                      {notification.type === "urgent" && <span className="font-medium">Urgent: </span>}
                      {notification.message}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-xs text-slate-500">
                        {getRelativeTime(notification.createdAt.toString())}
                      </p>
                      {notification.type === "urgent" && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="text-xs font-medium text-primary-600 hover:text-primary-800 p-0"
                        >
                          Find Coverage
                        </Button>
                      )}
                      {notification.type === "warning" && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="text-xs font-medium text-primary-600 hover:text-primary-800 p-0"
                        >
                          Review
                        </Button>
                      )}
                      {notification.type === "success" && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="text-xs font-medium text-primary-600 hover:text-primary-800 p-0"
                        >
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              No notifications to display.
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 border-t border-slate-200 text-center">
        <Button
          variant="link"
          className="text-primary-600 hover:text-primary-800"
        >
          View All Notifications
        </Button>
      </CardFooter>
    </Card>
  );
}
