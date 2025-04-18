import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull(), // admin or staff
  isActive: boolean("is_active").default(true).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
});

// Staff table
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").notNull(), // e.g., Doctor, Nurse, Technician
  specialization: text("specialization"), // e.g., Cardiologist, Emergency, General
  contactInfo: text("contact_info"), 
  isActive: boolean("is_active").default(true).notNull(),
});

export const insertStaffSchema = createInsertSchema(staff).pick({
  userId: true,
  role: true,
  specialization: true,
  contactInfo: true,
  isActive: true,
});

// Shift types table
export const shiftTypes = pgTable("shift_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., Day, Evening, Night
  startTime: text("start_time").notNull(), // stored as string like "07:00"
  endTime: text("end_time").notNull(), // stored as string like "15:00"
  duration: integer("duration").notNull(), // in hours
});

export const insertShiftTypeSchema = createInsertSchema(shiftTypes).pick({
  name: true,
  startTime: true,
  endTime: true,
  duration: true,
});

// Duty types table
export const dutyTypes = pgTable("duty_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., Pre-Duty, Duty, Post-Duty
});

export const insertDutyTypeSchema = createInsertSchema(dutyTypes).pick({
  name: true,
});

// Schedules table
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id).notNull(),
  date: text("date").notNull(), // stored as YYYY-MM-DD
  shiftTypeId: integer("shift_type_id").references(() => shiftTypes.id),
  dutyTypeId: integer("duty_type_id").references(() => dutyTypes.id).notNull(),
  unit: text("unit"), // e.g., Cardiology, Emergency Room
});

export const insertScheduleSchema = createInsertSchema(schedules).pick({
  staffId: true,
  date: true,
  shiftTypeId: true,
  dutyTypeId: true,
  unit: true,
});

// Availability table
export const availability = pgTable("availability", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id).notNull(),
  date: text("date").notNull(), // stored as YYYY-MM-DD
  isAvailable: boolean("is_available").default(true).notNull(),
  reason: text("reason"),
});

export const insertAvailabilitySchema = createInsertSchema(availability).pick({
  staffId: true,
  date: true,
  isAvailable: true,
  reason: true,
});

// Swap requests table
export const swapRequests = pgTable("swap_requests", {
  id: serial("id").primaryKey(),
  requestingStaffId: integer("requesting_staff_id").references(() => staff.id).notNull(),
  requestedStaffId: integer("requested_staff_id").references(() => staff.id).notNull(),
  date: text("date").notNull(), // stored as YYYY-MM-DD
  shiftTypeId: integer("shift_type_id").references(() => shiftTypes.id).notNull(),
  status: text("status").default("pending").notNull(), // pending, approved, rejected
  requestTimestamp: timestamp("request_timestamp").defaultNow().notNull(),
});

export const insertSwapRequestSchema = createInsertSchema(swapRequests).pick({
  requestingStaffId: true,
  requestedStaffId: true,
  date: true,
  shiftTypeId: true,
  status: true,
});

// Change history table
export const changeHistory = pgTable("change_history", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").references(() => schedules.id).notNull(),
  staffId: integer("staff_id").references(() => staff.id).notNull(),
  date: text("date").notNull(), // stored as YYYY-MM-DD
  oldShiftTypeId: integer("old_shift_type_id").references(() => shiftTypes.id),
  newShiftTypeId: integer("new_shift_type_id").references(() => shiftTypes.id),
  reason: text("reason"),
  changedByStaffId: integer("changed_by_staff_id").references(() => staff.id).notNull(),
  changeTimestamp: timestamp("change_timestamp").defaultNow().notNull(),
});

export const insertChangeHistorySchema = createInsertSchema(changeHistory).pick({
  scheduleId: true,
  staffId: true,
  date: true,
  oldShiftTypeId: true,
  newShiftTypeId: true,
  reason: true,
  changedByStaffId: true,
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // e.g., urgent, warning, info, success
  message: text("message").notNull(),
  staffId: integer("staff_id").references(() => staff.id), // can be null for system notifications
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  type: true,
  message: true,
  staffId: true,
  isRead: true,
});

// Types for TypeScript
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Staff = typeof staff.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;

export type ShiftType = typeof shiftTypes.$inferSelect;
export type InsertShiftType = z.infer<typeof insertShiftTypeSchema>;

export type DutyType = typeof dutyTypes.$inferSelect;
export type InsertDutyType = z.infer<typeof insertDutyTypeSchema>;

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;

export type Availability = typeof availability.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;

export type SwapRequest = typeof swapRequests.$inferSelect;
export type InsertSwapRequest = z.infer<typeof insertSwapRequestSchema>;

export type ChangeHistory = typeof changeHistory.$inferSelect;
export type InsertChangeHistory = z.infer<typeof insertChangeHistorySchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Extended types for frontend use
export type StaffWithUser = Staff & {
  user: User;
};

export type ScheduleWithDetails = Schedule & {
  staff: StaffWithUser;
  shiftType: ShiftType | null;
  dutyType: DutyType;
};

export type SwapRequestWithDetails = SwapRequest & {
  requestingStaff: StaffWithUser;
  requestedStaff: StaffWithUser;
  shiftType: ShiftType;
};
