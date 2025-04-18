import { 
  InsertSchedule, 
  Staff, 
  StaffWithUser,
  ShiftType, 
  DutyType, 
  Availability,
  Schedule 
} from "@shared/schema";

interface ScheduleInput {
  staff: StaffWithUser[];
  shiftTypes: ShiftType[];
  dutyTypes: DutyType[];
  availabilities: Availability[];
  startDate: string;
  endDate: string;
  unit?: string;
  existingSchedules?: Schedule[];
}

// Staff load tracking for schedule optimization
interface StaffLoad {
  consecutiveShifts: number;
  totalShifts: number;
  nightShifts: number;
  lastShiftDate: string | null;
  lastShiftType: number | null;
  restDays: number;
  specialization: string | null;
}

// Schedule conflict types
export enum ConflictType {
  CONSECUTIVE_SHIFTS = "consecutive_shifts",
  EXCEEDS_WEEKLY_HOURS = "exceeds_weekly_hours",
  REST_PERIOD_VIOLATION = "rest_period_violation",
  UNAVAILABLE_STAFF = "unavailable_staff",
  EXISTING_ASSIGNMENT = "existing_assignment",
  SPECIALIZATION_MISMATCH = "specialization_mismatch"
}

export interface ScheduleConflict {
  type: ConflictType;
  staffId: number;
  date: string;
  message: string;
  severity: "warning" | "error";
  staffName?: string;
}

interface ScheduleResult {
  schedules: InsertSchedule[];
  conflicts: ScheduleConflict[];
}

// Maximum allowed consecutive shifts
const MAX_CONSECUTIVE_SHIFTS = 5;
// Maximum shifts per week
const MAX_SHIFTS_PER_WEEK = 5;
// Required rest hours between shifts
const MIN_REST_HOURS = 12;

// Main scheduling function with improved algorithm and conflict detection
export function generateSchedule({ 
  staff, 
  shiftTypes, 
  dutyTypes, 
  availabilities, 
  startDate, 
  endDate,
  unit = "",
  existingSchedules = []
}: ScheduleInput): ScheduleResult {
  const schedules: InsertSchedule[] = [];
  const conflicts: ScheduleConflict[] = [];
  
  // Convert dates to Date objects
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Get all dates in the range
  const dates: string[] = [];
  const currentDate = new Date(start);
  
  while (currentDate <= end) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Find duty type IDs
  const preDutyId = dutyTypes.find(dt => dt.name === "Pre-Duty")?.id || 0;
  const dutyId = dutyTypes.find(dt => dt.name === "Duty")?.id || 0;
  const postDutyId = dutyTypes.find(dt => dt.name === "Post-Duty")?.id || 0;
  
  // Get shift type IDs and their information
  const dayShiftId = shiftTypes.find(st => st.name === "Day Shift")?.id;
  const eveningShiftId = shiftTypes.find(st => st.name === "Evening Shift")?.id;
  const nightShiftId = shiftTypes.find(st => st.name === "Night Shift")?.id;
  
  // Create a lookup for shift type details
  const shiftTypesById: Record<number, ShiftType> = {};
  shiftTypes.forEach(shift => {
    shiftTypesById[shift.id] = shift;
  });
  
  // Initialize staff workload tracking
  const staffLoads: Record<number, StaffLoad> = {};
  const staffDutyPatterns: Record<number, { 
    preDuty: number; 
    duty: number; 
    postDuty: number;
    dayShift: number;
    eveningShift: number;
    nightShift: number;
  }> = {};
  
  // Initialize tracking for each staff member
  staff.forEach(s => {
    staffDutyPatterns[s.id] = { 
      preDuty: 0, 
      duty: 0, 
      postDuty: 0,
      dayShift: 0,
      eveningShift: 0,
      nightShift: 0 
    };
    staffLoads[s.id] = {
      consecutiveShifts: 0,
      totalShifts: 0,
      nightShifts: 0,
      lastShiftDate: null,
      lastShiftType: null,
      restDays: 0,
      specialization: s.specialization
    };
  });
  
  // Helper function to get week start date from any date
  const getWeekKey = (dateStr: string) => {
    const date = new Date(dateStr);
    const firstDayOfWeek = new Date(date);
    firstDayOfWeek.setDate(date.getDate() - date.getDay());
    return firstDayOfWeek.toISOString().split('T')[0];
  };
  
  // Keep track of weekly schedules to enforce weekly hour limits
  const weeklySchedules: Record<string, Record<number, number>> = {};
  
  // Process existing schedules to understand current staff workload and patterns
  if (existingSchedules.length > 0) {
    for (const schedule of existingSchedules) {
      if (!staffLoads[schedule.staffId]) continue; // Skip if staff no longer exists
      
      // Update workload tracking
      if (schedule.shiftTypeId) {
        staffLoads[schedule.staffId].totalShifts++;
        staffLoads[schedule.staffId].lastShiftDate = schedule.date;
        staffLoads[schedule.staffId].lastShiftType = schedule.shiftTypeId;
        
        // Track night shifts specifically for fatigue management
        if (schedule.shiftTypeId === nightShiftId) {
          staffLoads[schedule.staffId].nightShifts++;
          staffDutyPatterns[schedule.staffId].nightShift++;
        }
        
        // Track shift types for equal distribution
        if (schedule.shiftTypeId === dayShiftId) {
          staffDutyPatterns[schedule.staffId].dayShift++;
        } else if (schedule.shiftTypeId === eveningShiftId) {
          staffDutyPatterns[schedule.staffId].eveningShift++;
        }
      }
      
      // Track duty types for equal distribution
      if (schedule.dutyTypeId === dutyId) {
        staffDutyPatterns[schedule.staffId].duty++;
      } else if (schedule.dutyTypeId === preDutyId) {
        staffDutyPatterns[schedule.staffId].preDuty++;
      } else if (schedule.dutyTypeId === postDutyId) {
        staffDutyPatterns[schedule.staffId].postDuty++;
      }
      
      // Track weekly schedules
      const weekKey = getWeekKey(schedule.date);
      if (!weeklySchedules[weekKey]) {
        weeklySchedules[weekKey] = {};
      }
      weeklySchedules[weekKey][schedule.staffId] = (weeklySchedules[weekKey][schedule.staffId] || 0) + 1;
    }
  }
  
  // Initialize weekly schedules tracking
  dates.forEach(date => {
    const weekKey = getWeekKey(date);
    if (!weeklySchedules[weekKey]) {
      weeklySchedules[weekKey] = {};
    }
  });
  
  // For each date, assign duties to staff with improved logic
  dates.forEach(date => {
    // Keep track of assigned shifts to avoid collisions
    const assignedShifts: Record<string, boolean> = {};
    const weekKey = getWeekKey(date);
    
    // 1. First pass: Identify unavailable staff for this date
    const unavailableStaffIds = availabilities
      .filter(a => a.date === date && !a.isAvailable)
      .map(a => a.staffId);
    
    // 2. Get available staff for this date
    let availableStaff = staff.filter(s => !unavailableStaffIds.includes(s.id));
    
    // 3. Enhanced staff sorting algorithm that takes into account:
    // - Workload balance
    // - Duty type distribution
    // - Shift type distribution
    // - Consecutive shifts
    // - Night shift rotation
    // - Availability and specialization where applicable
    availableStaff.sort((a, b) => {
      const aLoad = staffLoads[a.id];
      const bLoad = staffLoads[b.id];
      const aPattern = staffDutyPatterns[a.id];
      const bPattern = staffDutyPatterns[b.id];
      
      // First check unavailability explicitly
      const isAUnavailable = unavailableStaffIds.includes(a.id);
      const isBUnavailable = unavailableStaffIds.includes(b.id);
      if (isAUnavailable !== isBUnavailable) {
        return isAUnavailable ? 1 : -1; // Unavailable staff go to the end
      }
      
      // First prioritize staff who have had fewer total shifts for overall fairness
      if (aLoad.totalShifts !== bLoad.totalShifts) {
        return aLoad.totalShifts - bLoad.totalShifts;
      }
      
      // For the current week, check balance
      const aWeeklyShifts = weeklySchedules[weekKey][a.id] || 0;
      const bWeeklyShifts = weeklySchedules[weekKey][b.id] || 0;
      if (aWeeklyShifts !== bWeeklyShifts) {
        return aWeeklyShifts - bWeeklyShifts; // Balance weekly workload
      }
      
      // Then look at duty type balance
      const aDutyTotal = aPattern.duty + aPattern.preDuty + aPattern.postDuty;
      const bDutyTotal = bPattern.duty + bPattern.preDuty + bPattern.postDuty;
      if (aDutyTotal !== bDutyTotal) {
        return aDutyTotal - bDutyTotal;
      }
      
      // Then look at shift type balance - target equal distribution of each type
      const aShiftTotal = aPattern.dayShift + aPattern.eveningShift + aPattern.nightShift;
      const bShiftTotal = bPattern.dayShift + bPattern.eveningShift + bPattern.nightShift;
      if (aShiftTotal !== bShiftTotal) {
        return aShiftTotal - bShiftTotal;
      }
      
      // Balance day shifts
      if (aPattern.dayShift !== bPattern.dayShift) {
        return aPattern.dayShift - bPattern.dayShift;
      }
      
      // Balance evening shifts
      if (aPattern.eveningShift !== bPattern.eveningShift) {
        return aPattern.eveningShift - bPattern.eveningShift;
      }
      
      // Balance night shifts, as they're typically more disruptive
      if (aPattern.nightShift !== bPattern.nightShift) {
        return aPattern.nightShift - bPattern.nightShift;
      }
      
      // Then prioritize staff with more rest days
      if (aLoad.restDays !== bLoad.restDays) {
        return bLoad.restDays - aLoad.restDays;
      }
      
      // Check for specialization match if unit is specified
      if (unit) {
        const aSpecMatch = aLoad.specialization === unit;
        const bSpecMatch = bLoad.specialization === unit;
        if (aSpecMatch !== bSpecMatch) {
          return aSpecMatch ? -1 : 1; // Prioritize matching specialization
        }
      }
      
      // Finally, as a tiebreaker, use staff ID for predictable results
      return a.id - b.id;
    });
    
    // 4. Enhanced assignment for Day Shifts with conflict detection
    const dayShiftCount = Math.max(1, Math.ceil(availableStaff.length / 3));
    let dayShiftAssigned = 0;
    let dayShiftIndex = 0;
    
    while (dayShiftAssigned < dayShiftCount && dayShiftIndex < availableStaff.length) {
      const staffMember = availableStaff[dayShiftIndex];
      const staffLoad = staffLoads[staffMember.id];
      const weeklyShiftCount = weeklySchedules[weekKey][staffMember.id] || 0;
      
      // Check conflicts before assigning
      let hasConflict = false;
      
      // Check if already assigned on this date from existing schedules
      if (existingSchedules.some(s => s.staffId === staffMember.id && s.date === date)) {
        conflicts.push({
          type: ConflictType.EXISTING_ASSIGNMENT,
          staffId: staffMember.id,
          date,
          message: `Staff already has an assignment on ${date}`,
          severity: "error",
          staffName: `${staffMember.user.firstName} ${staffMember.user.lastName}`
        });
        hasConflict = true;
      }
      
      // Check consecutive shifts
      if (staffLoad.consecutiveShifts >= MAX_CONSECUTIVE_SHIFTS) {
        conflicts.push({
          type: ConflictType.CONSECUTIVE_SHIFTS,
          staffId: staffMember.id,
          date,
          message: `Exceeds maximum consecutive shifts (${MAX_CONSECUTIVE_SHIFTS})`,
          severity: "warning",
          staffName: `${staffMember.user.firstName} ${staffMember.user.lastName}`
        });
        hasConflict = true;
      }
      
      // Check weekly hours
      if (weeklyShiftCount >= MAX_SHIFTS_PER_WEEK) {
        conflicts.push({
          type: ConflictType.EXCEEDS_WEEKLY_HOURS,
          staffId: staffMember.id,
          date,
          message: `Exceeds maximum weekly shifts (${MAX_SHIFTS_PER_WEEK})`,
          severity: "warning",
          staffName: `${staffMember.user.firstName} ${staffMember.user.lastName}`
        });
        hasConflict = true;
      }
      
      // If no critical conflicts, assign the shift
      if (!hasConflict || 
          (hasConflict && conflicts.find(c => 
            c.staffId === staffMember.id && c.date === date)?.severity === "warning")) {
        
        schedules.push({
          staffId: staffMember.id,
          date,
          shiftTypeId: dayShiftId,
          dutyTypeId: dutyId,
          unit
        });
        
        // Update staff workload tracking
        staffLoad.consecutiveShifts++;
        staffLoad.totalShifts++;
        staffLoad.lastShiftDate = date;
        staffLoad.lastShiftType = dayShiftId || null;
        staffLoad.restDays = 0;
        
        // Update duty counts
        staffDutyPatterns[staffMember.id].duty += 1;
        
        // Update weekly tracking
        weeklySchedules[weekKey][staffMember.id] = (weeklySchedules[weekKey][staffMember.id] || 0) + 1;
        
        // Mark as assigned
        assignedShifts[`${staffMember.id}-${date}`] = true;
        dayShiftAssigned++;
      }
      
      dayShiftIndex++;
    }
    
    // 5. Enhanced assignment for Evening Shifts
    const remainingAfterDay = availableStaff.filter(s => !assignedShifts[`${s.id}-${date}`]);
    const eveningShiftCount = Math.max(1, Math.ceil(remainingAfterDay.length / 2));
    let eveningShiftAssigned = 0;
    let eveningShiftIndex = 0;
    
    while (eveningShiftAssigned < eveningShiftCount && eveningShiftIndex < remainingAfterDay.length) {
      const staffMember = remainingAfterDay[eveningShiftIndex];
      const staffLoad = staffLoads[staffMember.id];
      const weeklyShiftCount = weeklySchedules[weekKey][staffMember.id] || 0;
      
      // Check conflicts before assigning
      let hasConflict = false;
      
      // Check consecutive shifts
      if (staffLoad.consecutiveShifts >= MAX_CONSECUTIVE_SHIFTS) {
        conflicts.push({
          type: ConflictType.CONSECUTIVE_SHIFTS,
          staffId: staffMember.id,
          date,
          message: `Exceeds maximum consecutive shifts (${MAX_CONSECUTIVE_SHIFTS})`,
          severity: "warning",
          staffName: `${staffMember.user.firstName} ${staffMember.user.lastName}`
        });
        hasConflict = true;
      }
      
      // Check weekly hours
      if (weeklyShiftCount >= MAX_SHIFTS_PER_WEEK) {
        conflicts.push({
          type: ConflictType.EXCEEDS_WEEKLY_HOURS,
          staffId: staffMember.id,
          date,
          message: `Exceeds maximum weekly shifts (${MAX_SHIFTS_PER_WEEK})`,
          severity: "warning",
          staffName: `${staffMember.user.firstName} ${staffMember.user.lastName}`
        });
        hasConflict = true;
      }
      
      // If no critical conflicts, assign the shift
      if (!hasConflict || 
          (hasConflict && conflicts.find(c => 
            c.staffId === staffMember.id && c.date === date)?.severity === "warning")) {
        
        schedules.push({
          staffId: staffMember.id,
          date,
          shiftTypeId: eveningShiftId,
          dutyTypeId: dutyId,
          unit
        });
        
        // Update staff workload tracking
        staffLoad.consecutiveShifts++;
        staffLoad.totalShifts++;
        staffLoad.lastShiftDate = date;
        staffLoad.lastShiftType = eveningShiftId || null;
        staffLoad.restDays = 0;
        
        // Update duty counts
        staffDutyPatterns[staffMember.id].duty += 1;
        
        // Update weekly tracking
        weeklySchedules[weekKey][staffMember.id] = (weeklySchedules[weekKey][staffMember.id] || 0) + 1;
        
        // Mark as assigned
        assignedShifts[`${staffMember.id}-${date}`] = true;
        eveningShiftAssigned++;
      }
      
      eveningShiftIndex++;
    }
    
    // 6. Enhanced assignment for Night Shifts with consideration for night/day rotation
    const remainingAfterEvening = availableStaff.filter(s => !assignedShifts[`${s.id}-${date}`]);
    
    // Sort specifically for night shift suitability
    remainingAfterEvening.sort((a, b) => {
      const aLoad = staffLoads[a.id];
      const bLoad = staffLoads[b.id];
      
      // First prioritize staff who have had fewer night shifts
      if (aLoad.nightShifts !== bLoad.nightShifts) {
        return aLoad.nightShifts - bLoad.nightShifts;
      }
      
      // Then look at total shifts for general balance
      return aLoad.totalShifts - bLoad.totalShifts;
    });
    
    const nightShiftCount = Math.max(1, Math.ceil(remainingAfterEvening.length / 3));
    let nightShiftAssigned = 0;
    let nightShiftIndex = 0;
    
    while (nightShiftAssigned < nightShiftCount && nightShiftIndex < remainingAfterEvening.length) {
      const staffMember = remainingAfterEvening[nightShiftIndex];
      const staffLoad = staffLoads[staffMember.id];
      const weeklyShiftCount = weeklySchedules[weekKey][staffMember.id] || 0;
      
      // Check conflicts before assigning
      let hasConflict = false;
      
      // Check consecutive shifts
      if (staffLoad.consecutiveShifts >= MAX_CONSECUTIVE_SHIFTS) {
        conflicts.push({
          type: ConflictType.CONSECUTIVE_SHIFTS,
          staffId: staffMember.id,
          date,
          message: `Exceeds maximum consecutive shifts (${MAX_CONSECUTIVE_SHIFTS})`,
          severity: "warning",
          staffName: `${staffMember.user.firstName} ${staffMember.user.lastName}`
        });
        hasConflict = true;
      }
      
      // Check weekly hours
      if (weeklyShiftCount >= MAX_SHIFTS_PER_WEEK) {
        conflicts.push({
          type: ConflictType.EXCEEDS_WEEKLY_HOURS,
          staffId: staffMember.id,
          date,
          message: `Exceeds maximum weekly shifts (${MAX_SHIFTS_PER_WEEK})`,
          severity: "warning",
          staffName: `${staffMember.user.firstName} ${staffMember.user.lastName}`
        });
        hasConflict = true;
      }
      
      // Check rest period if last shift was a day shift (can't go from day to night without rest)
      if (staffLoad.lastShiftType && dayShiftId && 
          staffLoad.lastShiftType === dayShiftId && 
          staffLoad.lastShiftDate === getPreviousDay(date)) {
        conflicts.push({
          type: ConflictType.REST_PERIOD_VIOLATION,
          staffId: staffMember.id,
          date,
          message: `Insufficient rest period between day and night shift`,
          severity: "error",
          staffName: `${staffMember.user.firstName} ${staffMember.user.lastName}`
        });
        hasConflict = true;
        nightShiftIndex++;
        continue; // Skip this assignment, it's a hard constraint
      }
      
      // If no critical conflicts, assign the shift
      if (!hasConflict || 
          (hasConflict && conflicts.find(c => 
            c.staffId === staffMember.id && c.date === date)?.severity === "warning")) {
        
        schedules.push({
          staffId: staffMember.id,
          date,
          shiftTypeId: nightShiftId,
          dutyTypeId: dutyId,
          unit
        });
        
        // Update staff workload tracking
        staffLoad.consecutiveShifts++;
        staffLoad.totalShifts++;
        staffLoad.nightShifts++;
        staffLoad.lastShiftDate = date;
        staffLoad.lastShiftType = nightShiftId || null;
        staffLoad.restDays = 0;
        
        // Update duty counts
        staffDutyPatterns[staffMember.id].duty += 1;
        
        // Update weekly tracking
        weeklySchedules[weekKey][staffMember.id] = (weeklySchedules[weekKey][staffMember.id] || 0) + 1;
        
        // Mark as assigned
        assignedShifts[`${staffMember.id}-${date}`] = true;
        nightShiftAssigned++;
      }
      
      nightShiftIndex++;
    }
    
    // 7. Enhanced assignment for Pre-Duty and Post-Duty patterns
    const unassignedStaff = availableStaff.filter(s => !assignedShifts[`${s.id}-${date}`]);
    
    // Sort by pre-duty count to balance
    unassignedStaff.sort((a, b) => 
      staffDutyPatterns[a.id].preDuty - staffDutyPatterns[b.id].preDuty
    );
    
    // Assign Pre-Duty to half
    const preDutyStaff = unassignedStaff.slice(0, Math.floor(unassignedStaff.length / 2));
    preDutyStaff.forEach(s => {
      const staffLoad = staffLoads[s.id];
      
      // Pre-duty is a rest day in terms of shift counting
      staffLoad.consecutiveShifts = 0;
      staffLoad.restDays++;
      
      schedules.push({
        staffId: s.id,
        date,
        shiftTypeId: null,
        dutyTypeId: preDutyId,
        unit
      });
      
      staffDutyPatterns[s.id].preDuty += 1;
      assignedShifts[`${s.id}-${date}`] = true;
    });
    
    // Assign Post-Duty to the rest
    const remainingForPostDuty = unassignedStaff.filter(s => !assignedShifts[`${s.id}-${date}`]);
    remainingForPostDuty.forEach(s => {
      const staffLoad = staffLoads[s.id];
      
      // Post-duty is a rest day in terms of shift counting
      staffLoad.consecutiveShifts = 0;
      staffLoad.restDays++;
      
      schedules.push({
        staffId: s.id,
        date,
        shiftTypeId: null,
        dutyTypeId: postDutyId,
        unit
      });
      
      staffDutyPatterns[s.id].postDuty += 1;
      assignedShifts[`${s.id}-${date}`] = true;
    });
    
    // Update staff who were not assigned at all for this date
    staff.forEach(s => {
      if (!assignedShifts[`${s.id}-${date}`]) {
        const staffLoad = staffLoads[s.id];
        staffLoad.consecutiveShifts = 0;
        staffLoad.restDays++;
      }
    });
  });
  
  return { schedules, conflicts };
}

// Helper function to get the previous day
function getPreviousDay(dateString: string): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

// Enhanced conflict detection function
export function detectScheduleConflicts(
  schedule: InsertSchedule,
  allSchedules: InsertSchedule[],
  staff: StaffWithUser[],
  availabilities: Availability[],
  shiftTypes: ShiftType[]
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const staffMember = staff.find(s => s.id === schedule.staffId);
  
  if (!staffMember) {
    return conflicts;
  }
  
  const staffName = `${staffMember.user.firstName} ${staffMember.user.lastName}`;
  
  // Check if staff is unavailable
  const isUnavailable = availabilities.some(
    a => a.staffId === schedule.staffId && a.date === schedule.date && !a.isAvailable
  );
  
  if (isUnavailable) {
    conflicts.push({
      type: ConflictType.UNAVAILABLE_STAFF,
      staffId: schedule.staffId,
      date: schedule.date,
      message: `Staff marked as unavailable on this date`,
      severity: "error",
      staffName
    });
  }
  
  // Check for duplicate assignments
  const hasDuplicate = allSchedules.some(
    s => s.staffId === schedule.staffId && s.date === schedule.date && s !== schedule
  );
  
  if (hasDuplicate) {
    conflicts.push({
      type: ConflictType.EXISTING_ASSIGNMENT,
      staffId: schedule.staffId,
      date: schedule.date,
      message: `Staff already assigned on this date`,
      severity: "error",
      staffName
    });
  }
  
  // Check rest period violations
  const dateObj = new Date(schedule.date);
  const previousDay = new Date(dateObj);
  previousDay.setDate(dateObj.getDate() - 1);
  const previousDayStr = previousDay.toISOString().split('T')[0];
  const nextDay = new Date(dateObj);
  nextDay.setDate(dateObj.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split('T')[0];
  
  // Find previous and next day schedules
  const prevSchedule = allSchedules.find(
    s => s.staffId === schedule.staffId && s.date === previousDayStr
  );
  
  const nextSchedule = allSchedules.find(
    s => s.staffId === schedule.staffId && s.date === nextDayStr
  );
  
  // Get the shift types
  const currentShift = schedule.shiftTypeId ? shiftTypes.find(s => s.id === schedule.shiftTypeId) : null;
  const prevShift = prevSchedule?.shiftTypeId ? shiftTypes.find(s => s.id === prevSchedule.shiftTypeId) : null;
  const nextShift = nextSchedule?.shiftTypeId ? shiftTypes.find(s => s.id === nextSchedule.shiftTypeId) : null;
  
  // Check day to night transition without rest
  if (currentShift?.name === "Night Shift" && prevShift?.name === "Day Shift") {
    conflicts.push({
      type: ConflictType.REST_PERIOD_VIOLATION,
      staffId: schedule.staffId,
      date: schedule.date,
      message: `Insufficient rest period between day and night shift`,
      severity: "error",
      staffName
    });
  }
  
  // Check night to day transition without rest
  if (currentShift?.name === "Day Shift" && prevShift?.name === "Night Shift") {
    conflicts.push({
      type: ConflictType.REST_PERIOD_VIOLATION,
      staffId: schedule.staffId,
      date: schedule.date,
      message: `Insufficient rest period between night and day shift`,
      severity: "error",
      staffName
    });
  }
  
  // Check specialization alignment if needed (can be customized based on requirements)
  if (schedule.unit && staffMember.specialization && schedule.unit !== staffMember.specialization) {
    conflicts.push({
      type: ConflictType.SPECIALIZATION_MISMATCH,
      staffId: schedule.staffId,
      date: schedule.date,
      message: `Staff specialization (${staffMember.specialization}) does not match unit (${schedule.unit})`,
      severity: "warning",
      staffName
    });
  }
  
  // Count consecutive shifts
  let consecutiveShifts = 1;
  let checkDate = previousDayStr;
  
  // Count backwards
  while (allSchedules.some(s => s.staffId === schedule.staffId && s.date === checkDate && s.shiftTypeId !== null)) {
    consecutiveShifts++;
    const prevDate = new Date(checkDate);
    prevDate.setDate(prevDate.getDate() - 1);
    checkDate = prevDate.toISOString().split('T')[0];
  }
  
  // Count forwards
  checkDate = nextDayStr;
  while (allSchedules.some(s => s.staffId === schedule.staffId && s.date === checkDate && s.shiftTypeId !== null)) {
    consecutiveShifts++;
    const nextDate = new Date(checkDate);
    nextDate.setDate(nextDate.getDate() + 1);
    checkDate = nextDate.toISOString().split('T')[0];
  }
  
  if (consecutiveShifts > MAX_CONSECUTIVE_SHIFTS) {
    conflicts.push({
      type: ConflictType.CONSECUTIVE_SHIFTS,
      staffId: schedule.staffId,
      date: schedule.date,
      message: `${consecutiveShifts} consecutive shifts exceeds maximum (${MAX_CONSECUTIVE_SHIFTS})`,
      severity: "warning",
      staffName
    });
  }
  
  return conflicts;
}

// Helper function to check for shift conflicts
export function hasShiftConflict(
  staffId: number, 
  date: string, 
  existingSchedules: InsertSchedule[]
): boolean {
  return existingSchedules.some(
    schedule => schedule.staffId === staffId && schedule.date === date
  );
}

// Function to suggest alternative staff for coverage with enhanced criteria
export function suggestAlternativeStaff(
  staffId: number,
  date: string,
  shiftTypeId: number | null,
  staff: StaffWithUser[],
  schedules: InsertSchedule[],
  availabilities: Availability[],
  unit?: string | null
): StaffWithUser[] {
  // Filter out the staff member who needs to be replaced
  const otherStaff = staff.filter(s => s.id !== staffId);
  
  // Check if any staff are unavailable for this date
  const unavailableStaffIds = availabilities
    .filter(a => a.date === date && !a.isAvailable)
    .map(a => a.staffId);
  
  const dateParts = date.split('-');
  const dateObj = new Date(
    parseInt(dateParts[0]), 
    parseInt(dateParts[1]) - 1, 
    parseInt(dateParts[2])
  );
  
  // Get previous and next day
  const prevDate = new Date(dateObj);
  prevDate.setDate(dateObj.getDate() - 1);
  const prevDateStr = prevDate.toISOString().split('T')[0];
  
  const nextDate = new Date(dateObj);
  nextDate.setDate(dateObj.getDate() + 1);
  const nextDateStr = nextDate.toISOString().split('T')[0];
  
  // Check for staff with matching specialization first if unit is specified
  return otherStaff
    .filter(s => {
      // Check if staff is available
      if (unavailableStaffIds.includes(s.id)) {
        return false;
      }
      
      // Check if staff already has a shift on this date
      if (hasShiftConflict(s.id, date, schedules)) {
        return false;
      }
      
      // Check consecutive shifts - don't suggest staff who would exceed max consecutive shifts
      let consecutiveShifts = 1;
      
      // Check previous day assignment
      if (schedules.some(schedule => 
        schedule.staffId === s.id && 
        schedule.date === prevDateStr && 
        schedule.shiftTypeId !== null)) {
        consecutiveShifts++;
      }
      
      // Check next day assignment
      if (schedules.some(schedule => 
        schedule.staffId === s.id && 
        schedule.date === nextDateStr && 
        schedule.shiftTypeId !== null)) {
        consecutiveShifts++;
      }
      
      if (consecutiveShifts > MAX_CONSECUTIVE_SHIFTS) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort by specialization match first if unit is specified
      if (unit) {
        const aMatch = a.specialization === unit;
        const bMatch = b.specialization === unit;
        
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
      }
      
      // Then sort by workload - count how many shifts this staff already has
      const aShifts = schedules.filter(s => s.staffId === a.id && s.shiftTypeId !== null).length;
      const bShifts = schedules.filter(s => s.staffId === b.id && s.shiftTypeId !== null).length;
      
      return aShifts - bShifts;
    });
}
