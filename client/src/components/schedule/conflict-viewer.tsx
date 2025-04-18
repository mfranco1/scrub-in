import React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  AlertTriangle, 
  Calendar, 
  User,
  CheckCircle2
} from "lucide-react";
import { ScheduleConflict, ConflictType } from "@/lib/enhanced-scheduling-algorithm";
import { formatDate } from "@/lib/format-date";

interface ConflictViewerProps {
  conflicts: ScheduleConflict[];
  isOpen: boolean;
  onClose: () => void;
  onAcceptAnyway: () => void;
}

export function ConflictViewer({ 
  conflicts, 
  isOpen, 
  onClose,
  onAcceptAnyway
}: ConflictViewerProps) {
  const errorConflicts = conflicts.filter(c => c.severity === "error");
  const warningConflicts = conflicts.filter(c => c.severity === "warning");
  
  // Get conflict type display name
  const getConflictTypeName = (type: ConflictType): string => {
    switch (type) {
      case ConflictType.CONSECUTIVE_SHIFTS:
        return "Consecutive Shifts";
      case ConflictType.EXCEEDS_WEEKLY_HOURS:
        return "Exceeds Weekly Hours";
      case ConflictType.REST_PERIOD_VIOLATION:
        return "Rest Period Violation";
      case ConflictType.UNAVAILABLE_STAFF:
        return "Unavailable Staff";
      case ConflictType.EXISTING_ASSIGNMENT:
        return "Existing Assignment";
      case ConflictType.SPECIALIZATION_MISMATCH:
        return "Specialization Mismatch";
      default:
        return "Unknown";
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {errorConflicts.length > 0 ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-warning" />
            )}
            Schedule Conflicts Detected
          </DialogTitle>
          <DialogDescription>
            {errorConflicts.length > 0 ? (
              <>
                The generated schedule has {errorConflicts.length} critical conflicts that must be resolved
                {warningConflicts.length > 0 && ` and ${warningConflicts.length} warnings that should be reviewed`}.
              </>
            ) : (
              <>
                The generated schedule has {warningConflicts.length} non-critical warnings that should be reviewed.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 mt-4 border rounded-md">
          <Table>
            <TableCaption>Detected conflicts in the schedule generation</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Severity</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[300px]">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conflicts.map((conflict, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {conflict.severity === "error" ? (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Error
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Warning
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{getConflictTypeName(conflict.type)}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    {conflict.staffName}
                  </TableCell>
                  <TableCell className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {formatDate(conflict.date, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{conflict.message}</TableCell>
                </TableRow>
              ))}
              
              {conflicts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <CheckCircle2 className="h-8 w-8 mb-2 text-green-500" />
                      <p>No conflicts detected in the schedule</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        
        <DialogFooter className="mt-4 flex justify-between">
          <div>
            {errorConflicts.length > 0 ? (
              <p className="text-sm text-slate-500">
                Critical conflicts prevent schedule generation
              </p>
            ) : warningConflicts.length > 0 ? (
              <p className="text-sm text-slate-500">
                Non-critical warnings can be accepted
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {errorConflicts.length === 0 && warningConflicts.length > 0 && (
              <Button 
                variant="default" 
                onClick={onAcceptAnyway}
              >
                Accept and Save
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}