import React from "react";
import { 
  ArrowDownIcon, 
  ArrowUpIcon,
  Users,
  Clock,
  Repeat,
  Calendar
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type StatIconType = "staff" | "openShifts" | "swapRequests" | "timeOff";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: StatIconType;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
}

export function StatsCard({ title, value, icon, trend }: StatsCardProps) {
  const getIcon = () => {
    switch (icon) {
      case "staff":
        return (
          <span className="rounded-full bg-primary-100 p-1.5">
            <Users className="h-5 w-5 text-primary-600" />
          </span>
        );
      case "openShifts":
        return (
          <span className="rounded-full bg-amber-100 p-1.5">
            <Clock className="h-5 w-5 text-amber-600" />
          </span>
        );
      case "swapRequests":
        return (
          <span className="rounded-full bg-indigo-100 p-1.5">
            <Repeat className="h-5 w-5 text-indigo-600" />
          </span>
        );
      case "timeOff":
        return (
          <span className="rounded-full bg-pink-100 p-1.5">
            <Calendar className="h-5 w-5 text-pink-600" />
          </span>
        );
      default:
        return null;
    }
  };
  
  const getTrendColor = () => {
    if (!trend) return "";
    
    // For open shifts, being positive is actually negative
    if (icon === "openShifts") {
      return trend.isPositive ? "text-amber-600" : "text-green-600";
    }
    
    return trend.isPositive ? "text-green-600" : "text-red-600";
  };
  
  const getTrendIcon = () => {
    if (!trend) return null;
    
    // For open shifts, being positive is actually negative
    if (icon === "openShifts") {
      return trend.isPositive ? <ArrowUpIcon className="h-4 w-4 mr-1" /> : <ArrowDownIcon className="h-4 w-4 mr-1" />;
    }
    
    return trend.isPositive ? <ArrowUpIcon className="h-4 w-4 mr-1" /> : <ArrowDownIcon className="h-4 w-4 mr-1" />;
  };
  
  return (
    <Card className="shadow-sm border border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-slate-500">{title}</h3>
          {getIcon()}
        </div>
        <p className="text-3xl font-semibold mt-2">{value}</p>
        {trend && (
          <p className={`text-sm flex items-center mt-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{trend.value}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
