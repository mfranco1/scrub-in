import { users, staff, shiftTypes, dutyTypes, schedules, 
  availability, swapRequests, changeHistory, notifications,
  type User, type InsertUser, type Staff, type InsertStaff,
  type ShiftType, type InsertShiftType, type DutyType, type InsertDutyType,
  type Schedule, type InsertSchedule, type Availability, type InsertAvailability,
  type SwapRequest, type InsertSwapRequest, type ChangeHistory, type InsertChangeHistory,
  type Notification, type InsertNotification, type StaffWithUser, 
  type ScheduleWithDetails, type SwapRequestWithDetails } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Storage interface
export interface IStorage {
  // Session store
  sessionStore: session.SessionStore;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Staff methods
  getStaff(id: number): Promise<Staff | undefined>;
  getStaffByUserId(userId: number): Promise<Staff | undefined>;
  getStaffWithUser(id: number): Promise<StaffWithUser | undefined>;
  getAllStaff(): Promise<StaffWithUser[]>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  updateStaff(id: number, staff: Partial<InsertStaff>): Promise<Staff | undefined>;
  
  // Shift type methods
  getShiftType(id: number): Promise<ShiftType | undefined>;
  getAllShiftTypes(): Promise<ShiftType[]>;
  createShiftType(shiftType: InsertShiftType): Promise<ShiftType>;
  updateShiftType(id: number, shiftType: Partial<InsertShiftType>): Promise<ShiftType | undefined>;
  
  // Duty type methods
  getDutyType(id: number): Promise<DutyType | undefined>;
  getAllDutyTypes(): Promise<DutyType[]>;
  createDutyType(dutyType: InsertDutyType): Promise<DutyType>;
  updateDutyType(id: number, dutyType: Partial<InsertDutyType>): Promise<DutyType | undefined>;
  
  // Schedule methods
  getSchedule(id: number): Promise<Schedule | undefined>;
  getSchedulesByStaffId(staffId: number): Promise<Schedule[]>;
  getSchedulesByDateRange(startDate: string, endDate: string): Promise<ScheduleWithDetails[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: number, schedule: Partial<InsertSchedule>): Promise<Schedule | undefined>;
  deleteSchedule(id: number): Promise<boolean>;
  getScheduleByStaffAndDate(staffId: number, date: string): Promise<Schedule | undefined>;
  
  // Availability methods
  getAvailability(id: number): Promise<Availability | undefined>;
  getAvailabilitiesByStaffId(staffId: number): Promise<Availability[]>;
  getAvailabilitiesByDateRange(startDate: string, endDate: string): Promise<Availability[]>;
  createAvailability(availability: InsertAvailability): Promise<Availability>;
  updateAvailability(id: number, availability: Partial<InsertAvailability>): Promise<Availability | undefined>;
  
  // Swap request methods
  getSwapRequest(id: number): Promise<SwapRequest | undefined>;
  getPendingSwapRequests(): Promise<SwapRequestWithDetails[]>;
  getSwapRequestsByStaffId(staffId: number): Promise<SwapRequest[]>;
  createSwapRequest(swapRequest: InsertSwapRequest): Promise<SwapRequest>;
  updateSwapRequest(id: number, swapRequest: Partial<InsertSwapRequest>): Promise<SwapRequest | undefined>;
  
  // Change history methods
  getChangeHistory(id: number): Promise<ChangeHistory | undefined>;
  getChangeHistoryByScheduleId(scheduleId: number): Promise<ChangeHistory[]>;
  createChangeHistory(changeHistory: InsertChangeHistory): Promise<ChangeHistory>;
  
  // Notification methods
  getNotification(id: number): Promise<Notification | undefined>;
  getNotificationsForStaff(staffId: number): Promise<Notification[]>;
  getAllNotifications(): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private usersMap: Map<number, User>;
  private staffMap: Map<number, Staff>;
  private shiftTypesMap: Map<number, ShiftType>;
  private dutyTypesMap: Map<number, DutyType>;
  private schedulesMap: Map<number, Schedule>;
  private availabilityMap: Map<number, Availability>;
  private swapRequestsMap: Map<number, SwapRequest>;
  private changeHistoryMap: Map<number, ChangeHistory>;
  private notificationsMap: Map<number, Notification>;
  
  sessionStore: session.SessionStore;
  
  private userIdCounter: number;
  private staffIdCounter: number;
  private shiftTypeIdCounter: number;
  private dutyTypeIdCounter: number;
  private scheduleIdCounter: number;
  private availabilityIdCounter: number;
  private swapRequestIdCounter: number;
  private changeHistoryIdCounter: number;
  private notificationIdCounter: number;
  
  constructor() {
    this.usersMap = new Map();
    this.staffMap = new Map();
    this.shiftTypesMap = new Map();
    this.dutyTypesMap = new Map();
    this.schedulesMap = new Map();
    this.availabilityMap = new Map();
    this.swapRequestsMap = new Map();
    this.changeHistoryMap = new Map();
    this.notificationsMap = new Map();
    
    this.userIdCounter = 1;
    this.staffIdCounter = 1;
    this.shiftTypeIdCounter = 1;
    this.dutyTypeIdCounter = 1;
    this.scheduleIdCounter = 1;
    this.availabilityIdCounter = 1;
    this.swapRequestIdCounter = 1;
    this.changeHistoryIdCounter = 1;
    this.notificationIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Initialize with default data
    this.initializeDefaultData();
  }
  
  private async initializeDefaultData() {
    // Create default duty types
    const preDuty = await this.createDutyType({ name: "Pre-Duty" });
    const duty = await this.createDutyType({ name: "Duty" });
    const postDuty = await this.createDutyType({ name: "Post-Duty" });
    
    // Create default shift types
    const dayShift = await this.createShiftType({ 
      name: "Day Shift", 
      startTime: "07:00", 
      endTime: "19:00", 
      duration: 12 
    });
    
    const midShift = await this.createShiftType({ 
      name: "Mid Shift", 
      startTime: "07:00", 
      endTime: "12:00", 
      duration: 5 
    });
    
    const nightShift = await this.createShiftType({ 
      name: "Night Shift", 
      startTime: "19:00", 
      endTime: "07:00", 
      duration: 12 
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersMap.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(user => user.username === username);
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...userData, id };
    this.usersMap.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.usersMap.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...userData };
    this.usersMap.set(id, updatedUser);
    return updatedUser;
  }
  
  // Staff methods
  async getStaff(id: number): Promise<Staff | undefined> {
    return this.staffMap.get(id);
  }
  
  async getStaffByUserId(userId: number): Promise<Staff | undefined> {
    return Array.from(this.staffMap.values()).find(staff => staff.userId === userId);
  }
  
  async getStaffWithUser(id: number): Promise<StaffWithUser | undefined> {
    const staff = this.staffMap.get(id);
    if (!staff) return undefined;
    
    const user = this.usersMap.get(staff.userId);
    if (!user) return undefined;
    
    return { ...staff, user };
  }
  
  async getAllStaff(): Promise<StaffWithUser[]> {
    return Promise.all(
      Array.from(this.staffMap.values())
        .filter(staff => staff.isActive)
        .map(async staff => {
          const user = await this.getUser(staff.userId);
          return { ...staff, user: user! };
        })
    );
  }
  
  async createStaff(staffData: InsertStaff): Promise<Staff> {
    const id = this.staffIdCounter++;
    const staff: Staff = { ...staffData, id };
    this.staffMap.set(id, staff);
    return staff;
  }
  
  async updateStaff(id: number, staffData: Partial<InsertStaff>): Promise<Staff | undefined> {
    const existingStaff = this.staffMap.get(id);
    if (!existingStaff) return undefined;
    
    const updatedStaff = { ...existingStaff, ...staffData };
    this.staffMap.set(id, updatedStaff);
    return updatedStaff;
  }
  
  // Shift type methods
  async getShiftType(id: number): Promise<ShiftType | undefined> {
    return this.shiftTypesMap.get(id);
  }
  
  async getAllShiftTypes(): Promise<ShiftType[]> {
    return Array.from(this.shiftTypesMap.values());
  }
  
  async createShiftType(shiftTypeData: InsertShiftType): Promise<ShiftType> {
    const id = this.shiftTypeIdCounter++;
    const shiftType: ShiftType = { ...shiftTypeData, id };
    this.shiftTypesMap.set(id, shiftType);
    return shiftType;
  }
  
  async updateShiftType(id: number, shiftTypeData: Partial<InsertShiftType>): Promise<ShiftType | undefined> {
    const existingShiftType = this.shiftTypesMap.get(id);
    if (!existingShiftType) return undefined;
    
    const updatedShiftType = { ...existingShiftType, ...shiftTypeData };
    this.shiftTypesMap.set(id, updatedShiftType);
    return updatedShiftType;
  }
  
  // Duty type methods
  async getDutyType(id: number): Promise<DutyType | undefined> {
    return this.dutyTypesMap.get(id);
  }
  
  async getAllDutyTypes(): Promise<DutyType[]> {
    return Array.from(this.dutyTypesMap.values());
  }
  
  async createDutyType(dutyTypeData: InsertDutyType): Promise<DutyType> {
    const id = this.dutyTypeIdCounter++;
    const dutyType: DutyType = { ...dutyTypeData, id };
    this.dutyTypesMap.set(id, dutyType);
    return dutyType;
  }
  
  async updateDutyType(id: number, dutyTypeData: Partial<InsertDutyType>): Promise<DutyType | undefined> {
    const existingDutyType = this.dutyTypesMap.get(id);
    if (!existingDutyType) return undefined;
    
    const updatedDutyType = { ...existingDutyType, ...dutyTypeData };
    this.dutyTypesMap.set(id, updatedDutyType);
    return updatedDutyType;
  }
  
  // Schedule methods
  async getSchedule(id: number): Promise<Schedule | undefined> {
    return this.schedulesMap.get(id);
  }
  
  async getSchedulesByStaffId(staffId: number): Promise<Schedule[]> {
    return Array.from(this.schedulesMap.values())
      .filter(schedule => schedule.staffId === staffId);
  }
  
  async getSchedulesByDateRange(startDate: string, endDate: string): Promise<ScheduleWithDetails[]> {
    const schedules = Array.from(this.schedulesMap.values())
      .filter(schedule => schedule.date >= startDate && schedule.date <= endDate);
    
    const result: ScheduleWithDetails[] = [];
    
    for (const schedule of schedules) {
      const staffWithUser = await this.getStaffWithUser(schedule.staffId);
      if (!staffWithUser) continue;
      
      const shiftType = schedule.shiftTypeId ? await this.getShiftType(schedule.shiftTypeId) : null;
      const dutyType = await this.getDutyType(schedule.dutyTypeId);
      
      if (!dutyType) continue;
      
      result.push({
        ...schedule,
        staff: staffWithUser,
        shiftType,
        dutyType
      });
    }
    
    return result;
  }
  
  async createSchedule(scheduleData: InsertSchedule): Promise<Schedule> {
    const id = this.scheduleIdCounter++;
    const schedule: Schedule = { ...scheduleData, id };
    this.schedulesMap.set(id, schedule);
    return schedule;
  }
  
  async updateSchedule(id: number, scheduleData: Partial<InsertSchedule>): Promise<Schedule | undefined> {
    const existingSchedule = this.schedulesMap.get(id);
    if (!existingSchedule) return undefined;
    
    const updatedSchedule = { ...existingSchedule, ...scheduleData };
    this.schedulesMap.set(id, updatedSchedule);
    return updatedSchedule;
  }
  
  async deleteSchedule(id: number): Promise<boolean> {
    return this.schedulesMap.delete(id);
  }
  
  async getScheduleByStaffAndDate(staffId: number, date: string): Promise<Schedule | undefined> {
    return Array.from(this.schedulesMap.values())
      .find(schedule => schedule.staffId === staffId && schedule.date === date);
  }
  
  // Availability methods
  async getAvailability(id: number): Promise<Availability | undefined> {
    return this.availabilityMap.get(id);
  }
  
  async getAvailabilitiesByStaffId(staffId: number): Promise<Availability[]> {
    return Array.from(this.availabilityMap.values())
      .filter(availability => availability.staffId === staffId);
  }
  
  async getAvailabilitiesByDateRange(startDate: string, endDate: string): Promise<Availability[]> {
    return Array.from(this.availabilityMap.values())
      .filter(availability => availability.date >= startDate && availability.date <= endDate);
  }
  
  async createAvailability(availabilityData: InsertAvailability): Promise<Availability> {
    const id = this.availabilityIdCounter++;
    const availability: Availability = { ...availabilityData, id };
    this.availabilityMap.set(id, availability);
    return availability;
  }
  
  async updateAvailability(id: number, availabilityData: Partial<InsertAvailability>): Promise<Availability | undefined> {
    const existingAvailability = this.availabilityMap.get(id);
    if (!existingAvailability) return undefined;
    
    const updatedAvailability = { ...existingAvailability, ...availabilityData };
    this.availabilityMap.set(id, updatedAvailability);
    return updatedAvailability;
  }
  
  // Swap request methods
  async getSwapRequest(id: number): Promise<SwapRequest | undefined> {
    return this.swapRequestsMap.get(id);
  }
  
  async getPendingSwapRequests(): Promise<SwapRequestWithDetails[]> {
    const pendingRequests = Array.from(this.swapRequestsMap.values())
      .filter(request => request.status === "pending");
    
    const result: SwapRequestWithDetails[] = [];
    
    for (const request of pendingRequests) {
      const requestingStaff = await this.getStaffWithUser(request.requestingStaffId);
      const requestedStaff = await this.getStaffWithUser(request.requestedStaffId);
      const shiftType = await this.getShiftType(request.shiftTypeId);
      
      if (!requestingStaff || !requestedStaff || !shiftType) continue;
      
      result.push({
        ...request,
        requestingStaff,
        requestedStaff,
        shiftType
      });
    }
    
    return result;
  }
  
  async getSwapRequestsByStaffId(staffId: number): Promise<SwapRequest[]> {
    return Array.from(this.swapRequestsMap.values())
      .filter(request => 
        request.requestingStaffId === staffId || 
        request.requestedStaffId === staffId
      );
  }
  
  async createSwapRequest(swapRequestData: InsertSwapRequest): Promise<SwapRequest> {
    const id = this.swapRequestIdCounter++;
    const swapRequest: SwapRequest = { 
      ...swapRequestData, 
      id, 
      requestTimestamp: new Date() 
    };
    this.swapRequestsMap.set(id, swapRequest);
    return swapRequest;
  }
  
  async updateSwapRequest(id: number, swapRequestData: Partial<InsertSwapRequest>): Promise<SwapRequest | undefined> {
    const existingSwapRequest = this.swapRequestsMap.get(id);
    if (!existingSwapRequest) return undefined;
    
    const updatedSwapRequest = { ...existingSwapRequest, ...swapRequestData };
    this.swapRequestsMap.set(id, updatedSwapRequest);
    return updatedSwapRequest;
  }
  
  // Change history methods
  async getChangeHistory(id: number): Promise<ChangeHistory | undefined> {
    return this.changeHistoryMap.get(id);
  }
  
  async getChangeHistoryByScheduleId(scheduleId: number): Promise<ChangeHistory[]> {
    return Array.from(this.changeHistoryMap.values())
      .filter(history => history.scheduleId === scheduleId);
  }
  
  async createChangeHistory(changeHistoryData: InsertChangeHistory): Promise<ChangeHistory> {
    const id = this.changeHistoryIdCounter++;
    const changeHistory: ChangeHistory = { 
      ...changeHistoryData, 
      id, 
      changeTimestamp: new Date() 
    };
    this.changeHistoryMap.set(id, changeHistory);
    return changeHistory;
  }
  
  // Notification methods
  async getNotification(id: number): Promise<Notification | undefined> {
    return this.notificationsMap.get(id);
  }
  
  async getNotificationsForStaff(staffId: number): Promise<Notification[]> {
    return Array.from(this.notificationsMap.values())
      .filter(notification => 
        notification.staffId === staffId || 
        notification.staffId === null
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getAllNotifications(): Promise<Notification[]> {
    return Array.from(this.notificationsMap.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const id = this.notificationIdCounter++;
    const notification: Notification = { 
      ...notificationData, 
      id, 
      createdAt: new Date() 
    };
    this.notificationsMap.set(id, notification);
    return notification;
  }
  
  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const notification = this.notificationsMap.get(id);
    if (!notification) return undefined;
    
    const updatedNotification = { ...notification, isRead: true };
    this.notificationsMap.set(id, updatedNotification);
    return updatedNotification;
  }
}

export const storage = new MemStorage();
