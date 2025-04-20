import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { 
  insertStaffSchema, insertShiftTypeSchema, insertDutyTypeSchema, 
  insertScheduleSchema, insertAvailabilitySchema, insertSwapRequestSchema,
  insertChangeHistorySchema, insertNotificationSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // API routes
  // Staff routes
  app.get("/api/staff", async (_req, res) => {
    try {
      const allStaff = await storage.getAllStaff();
      res.json(allStaff);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch staff" });
    }
  });

  app.get("/api/staff/:id", async (req, res) => {
    try {
      const staffId = parseInt(req.params.id);
      const staff = await storage.getStaffWithUser(staffId);
      
      if (!staff) {
        return res.status(404).json({ error: "Staff not found" });
      }
      
      res.json(staff);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch staff member" });
    }
  });

  app.post("/api/staff", async (req, res) => {
    try {
      const staffData = insertStaffSchema.parse(req.body);
      const staff = await storage.createStaff(staffData);
      res.status(201).json(staff);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create staff member" });
    }
  });

  app.patch("/api/staff/:id", async (req, res) => {
    try {
      const staffId = parseInt(req.params.id);
      const staffData = insertStaffSchema.partial().parse(req.body);
      const updatedStaff = await storage.updateStaff(staffId, staffData);
      
      if (!updatedStaff) {
        return res.status(404).json({ error: "Staff not found" });
      }
      
      res.json(updatedStaff);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update staff member" });
    }
  });

  // Shift types routes
  app.get("/api/shift-types", async (_req, res) => {
    try {
      const shiftTypes = await storage.getAllShiftTypes();
      res.json(shiftTypes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shift types" });
    }
  });

  app.post("/api/shift-types", async (req, res) => {
    try {
      const shiftTypeData = insertShiftTypeSchema.parse(req.body);
      const shiftType = await storage.createShiftType(shiftTypeData);
      res.status(201).json(shiftType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create shift type" });
    }
  });
  
  app.patch("/api/shift-types/:id", async (req, res) => {
    try {
      const shiftTypeId = parseInt(req.params.id);
      const shiftTypeData = insertShiftTypeSchema.partial().parse(req.body);
      const updatedShiftType = await storage.updateShiftType(shiftTypeId, shiftTypeData);
      
      if (!updatedShiftType) {
        return res.status(404).json({ error: "Shift type not found" });
      }
      
      res.json(updatedShiftType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update shift type" });
    }
  });

  // Duty types routes
  app.get("/api/duty-types", async (_req, res) => {
    try {
      const dutyTypes = await storage.getAllDutyTypes();
      res.json(dutyTypes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch duty types" });
    }
  });

  app.post("/api/duty-types", async (req, res) => {
    try {
      const dutyTypeData = insertDutyTypeSchema.parse(req.body);
      const dutyType = await storage.createDutyType(dutyTypeData);
      res.status(201).json(dutyType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create duty type" });
    }
  });
  
  app.patch("/api/duty-types/:id", async (req, res) => {
    try {
      const dutyTypeId = parseInt(req.params.id);
      const dutyTypeData = insertDutyTypeSchema.partial().parse(req.body);
      const updatedDutyType = await storage.updateDutyType(dutyTypeId, dutyTypeData);
      
      if (!updatedDutyType) {
        return res.status(404).json({ error: "Duty type not found" });
      }
      
      res.json(updatedDutyType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update duty type" });
    }
  });

  // Schedule routes
  app.get("/api/schedule", async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      
      const schedules = await storage.getSchedulesByDateRange(startDate, endDate);
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch schedules" });
    }
  });

  app.get("/api/staff/:id/schedule", async (req, res) => {
    try {
      const staffId = parseInt(req.params.id);
      const schedules = await storage.getSchedulesByStaffId(staffId);
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch schedules for staff member" });
    }
  });

  app.post("/api/schedule", async (req, res) => {
    try {
      const scheduleData = insertScheduleSchema.parse(req.body);
      
      // Check if there's already a schedule for this staff member on this date
      const existingSchedule = await storage.getScheduleByStaffAndDate(
        scheduleData.staffId, 
        scheduleData.date
      );
      
      if (existingSchedule) {
        return res.status(409).json({ 
          error: "A schedule already exists for this staff member on this date" 
        });
      }
      
      const schedule = await storage.createSchedule(scheduleData);
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create schedule" });
    }
  });

  app.patch("/api/schedule/:id", async (req, res) => {
    try {
      const scheduleId = parseInt(req.params.id);
      const scheduleData = insertScheduleSchema.partial().parse(req.body);
      
      // Get the existing schedule for change history
      const existingSchedule = await storage.getSchedule(scheduleId);
      if (!existingSchedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      // Create change history if shift type is being updated
      if (scheduleData.shiftTypeId && scheduleData.shiftTypeId !== existingSchedule.shiftTypeId) {
        await storage.createChangeHistory({
          scheduleId,
          staffId: existingSchedule.staffId,
          date: existingSchedule.date,
          oldShiftTypeId: existingSchedule.shiftTypeId || null,
          newShiftTypeId: scheduleData.shiftTypeId,
          reason: req.body.reason || "Schedule updated",
          changedByStaffId: req.user ? (await storage.getStaffByUserId(req.user.id))?.id || 1 : 1
        });
      }
      
      const updatedSchedule = await storage.updateSchedule(scheduleId, scheduleData);
      if (!updatedSchedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      res.json(updatedSchedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update schedule" });
    }
  });

  app.delete("/api/schedule/:id", async (req, res) => {
    try {
      const scheduleId = parseInt(req.params.id);
      const deleted = await storage.deleteSchedule(scheduleId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete schedule" });
    }
  });

  // Batch create schedules (for schedule generation)
  app.post("/api/schedule/batch", async (req, res) => {
    try {
      const schedulesData = z.array(insertScheduleSchema).parse(req.body);
      const createdSchedules = [];
      
      for (const scheduleData of schedulesData) {
        // Check if there's already a schedule for this staff member on this date
        const existingSchedule = await storage.getScheduleByStaffAndDate(
          scheduleData.staffId, 
          scheduleData.date
        );
        
        // If exists, update it
        if (existingSchedule) {
          const updatedSchedule = await storage.updateSchedule(existingSchedule.id, scheduleData);
          if (updatedSchedule) {
            createdSchedules.push(updatedSchedule);
          }
        } else {
          // Otherwise, create new
          const schedule = await storage.createSchedule(scheduleData);
          createdSchedules.push(schedule);
        }
      }
      
      res.status(201).json(createdSchedules);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create schedules batch" });
    }
  });

  // Clear schedules for a date range
  app.delete("/api/schedule/clear", async (req, res) => {
    const dateRangeSchema = z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date format (YYYY-MM-DD)"),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date format (YYYY-MM-DD)"),
    });

    try {
      const { startDate, endDate } = dateRangeSchema.parse(req.query);
      
      // Assuming storage.deleteSchedulesByDateRange returns the count of deleted items or throws
      const deletedCount = await storage.deleteSchedulesByDateRange(startDate, endDate);
      
      console.log(`Cleared ${deletedCount} schedules between ${startDate} and ${endDate}`);
      res.status(204).send(); // Success, no content to return
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid date range query parameters", details: error.errors });
      }
      console.error("Error clearing schedules:", error);
      res.status(500).json({ error: "Failed to clear schedules" });
    }
  });

  // Availability routes
  app.get("/api/staff/:id/availability", async (req, res) => {
    try {
      const staffId = parseInt(req.params.id);
      const availabilities = await storage.getAvailabilitiesByStaffId(staffId);
      res.json(availabilities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch availabilities" });
    }
  });

  app.get("/api/availability", async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      if (startDate && endDate) {
        // If date range is provided, get availabilities for that range
        const availabilities = await storage.getAvailabilitiesByDateRange(startDate, endDate);
        return res.json(availabilities);
      } else {
        // Otherwise get all availabilities
        const allAvailabilities = [];
        // Since we don't have a specific method to get all availabilities,
        // we'll gather them from individual staff members
        const allStaff = await storage.getAllStaff();
        for (const staff of allStaff) {
          const staffAvailabilities = await storage.getAvailabilitiesByStaffId(staff.id);
          allAvailabilities.push(...staffAvailabilities);
        }
        return res.json(allAvailabilities);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch availabilities" });
    }
  });

  app.post("/api/availability", async (req, res) => {
    try {
      const availabilityData = insertAvailabilitySchema.parse(req.body);
      const availability = await storage.createAvailability(availabilityData);
      res.status(201).json(availability);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create availability" });
    }
  });
  
  app.patch("/api/availability/:id", async (req, res) => {
    try {
      const availabilityId = parseInt(req.params.id);
      const availabilityData = insertAvailabilitySchema.partial().parse(req.body);
      const updatedAvailability = await storage.updateAvailability(availabilityId, availabilityData);
      
      if (!updatedAvailability) {
        return res.status(404).json({ error: "Availability not found" });
      }
      
      res.json(updatedAvailability);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update availability" });
    }
  });

  // Swap requests routes
  app.get("/api/swap-requests", async (_req, res) => {
    try {
      const pendingSwapRequests = await storage.getPendingSwapRequests();
      res.json(pendingSwapRequests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch swap requests" });
    }
  });

  app.get("/api/staff/:id/swap-requests", async (req, res) => {
    try {
      const staffId = parseInt(req.params.id);
      const swapRequests = await storage.getSwapRequestsByStaffId(staffId);
      res.json(swapRequests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch swap requests for staff member" });
    }
  });

  app.post("/api/swap-requests", async (req, res) => {
    try {
      const swapRequestData = insertSwapRequestSchema.parse(req.body);
      const swapRequest = await storage.createSwapRequest(swapRequestData);
      
      // Create notification for the requested staff
      await storage.createNotification({
        type: "info",
        message: `New swap request for ${swapRequestData.date}`,
        staffId: swapRequestData.requestedStaffId,
        isRead: false
      });
      
      res.status(201).json(swapRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create swap request" });
    }
  });

  app.patch("/api/swap-requests/:id", async (req, res) => {
    try {
      const swapRequestId = parseInt(req.params.id);
      const swapRequestData = insertSwapRequestSchema.partial().parse(req.body);
      
      const existingSwapRequest = await storage.getSwapRequest(swapRequestId);
      if (!existingSwapRequest) {
        return res.status(404).json({ error: "Swap request not found" });
      }
      
      const updatedSwapRequest = await storage.updateSwapRequest(swapRequestId, swapRequestData);
      if (!updatedSwapRequest) {
        return res.status(404).json({ error: "Swap request not found" });
      }
      
      // Handle swap approval
      if (swapRequestData.status === "approved" && existingSwapRequest.status !== "approved") {
        // Get the schedules for both staff members on the requested date
        const requestingStaffSchedule = await storage.getScheduleByStaffAndDate(
          existingSwapRequest.requestingStaffId,
          existingSwapRequest.date
        );
        
        const requestedStaffSchedule = await storage.getScheduleByStaffAndDate(
          existingSwapRequest.requestedStaffId,
          existingSwapRequest.date
        );
        
        // Update schedules based on the swap
        if (requestingStaffSchedule && requestedStaffSchedule) {
          // Save current values for change history
          const oldRequestingStaffShiftTypeId = requestingStaffSchedule.shiftTypeId;
          const oldRequestedStaffShiftTypeId = requestedStaffSchedule.shiftTypeId;
          
          // Swap the shift types
          const updatedRequestingSchedule = await storage.updateSchedule(
            requestingStaffSchedule.id,
            { shiftTypeId: requestedStaffSchedule.shiftTypeId }
          );
          
          const updatedRequestedSchedule = await storage.updateSchedule(
            requestedStaffSchedule.id,
            { shiftTypeId: oldRequestingStaffShiftTypeId }
          );
          
          // Create change history records
          if (updatedRequestingSchedule) {
            await storage.createChangeHistory({
              scheduleId: requestingStaffSchedule.id,
              staffId: existingSwapRequest.requestingStaffId,
              date: existingSwapRequest.date,
              oldShiftTypeId: oldRequestingStaffShiftTypeId,
              newShiftTypeId: updatedRequestingSchedule.shiftTypeId,
              reason: "Swap request approved",
              changedByStaffId: req.user ? (await storage.getStaffByUserId(req.user.id))?.id || 1 : 1
            });
          }
          
          if (updatedRequestedSchedule) {
            await storage.createChangeHistory({
              scheduleId: requestedStaffSchedule.id,
              staffId: existingSwapRequest.requestedStaffId,
              date: existingSwapRequest.date,
              oldShiftTypeId: oldRequestedStaffShiftTypeId,
              newShiftTypeId: updatedRequestedSchedule.shiftTypeId,
              reason: "Swap request approved",
              changedByStaffId: req.user ? (await storage.getStaffByUserId(req.user.id))?.id || 1 : 1
            });
          }
          
          // Create notifications for both staff members
          await storage.createNotification({
            type: "success",
            message: `Your swap request for ${existingSwapRequest.date} was approved`,
            staffId: existingSwapRequest.requestingStaffId,
            isRead: false
          });
          
          await storage.createNotification({
            type: "success",
            message: `Swap request for ${existingSwapRequest.date} was approved`,
            staffId: existingSwapRequest.requestedStaffId,
            isRead: false
          });
        }
      } else if (swapRequestData.status === "rejected" && existingSwapRequest.status !== "rejected") {
        // Create notification for requesting staff
        await storage.createNotification({
          type: "error",
          message: `Your swap request for ${existingSwapRequest.date} was rejected`,
          staffId: existingSwapRequest.requestingStaffId,
          isRead: false
        });
      }
      
      res.json(updatedSwapRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update swap request" });
    }
  });

  // Change history routes
  app.get("/api/change-history", async (_req, res) => {
    try {
      const changeHistory = Array.from(Object.values(await storage).filter(
        item => "changeTimestamp" in item
      ));
      res.json(changeHistory);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch change history" });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const staffMember = await storage.getStaffByUserId(req.user.id);
      if (!staffMember) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      
      const notifications = await storage.getNotificationsForStaff(staffMember.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const updatedNotification = await storage.markNotificationAsRead(notificationId);
      
      if (!updatedNotification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      
      res.json(updatedNotification);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
