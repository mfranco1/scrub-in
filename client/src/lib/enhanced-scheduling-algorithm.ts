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
  const eveningShiftId = shiftTypes.find(st => st.name === "Evening Shift" || st.name === "Mid Shift")?.id;
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
      
      // First check unavailability explicitly (should be unnecessary, but just in case)
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
        
        // Update duty and shift type counts for equal distribution
        staffDutyPatterns[staffMember.id].duty += 1;
        staffDutyPatterns[staffMember.id].dayShift += 1;
        
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
    
    // Sort the remaining staff specifically for evening shifts, prioritizing those with fewer evening shifts
    remainingAfterDay.sort((a, b) => {
      const aPattern = staffDutyPatterns[a.id];
      const bPattern = staffDutyPatterns[b.id];
      
      // Prioritize those with fewer evening shifts for equal distribution
      if (aPattern.eveningShift !== bPattern.eveningShift) {
        return aPattern.eveningShift - bPattern.eveningShift;
      }
      
      // Then fall back to the general criteria (total shifts)
      return staffLoads[a.id].totalShifts - staffLoads[b.id].totalShifts;
    });
    
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
        
        // Update duty and shift type counts for equal distribution
        staffDutyPatterns[staffMember.id].duty += 1;
        staffDutyPatterns[staffMember.id].eveningShift += 1;
        
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
      const aPattern = staffDutyPatterns[a.id];
      const bPattern = staffDutyPatterns[b.id];
      
      // First prioritize staff who have had fewer night shifts
      if (aPattern.nightShift !== bPattern.nightShift) {
        return aPattern.nightShift - bPattern.nightShift;
      }
      
      // Then prioritize those with fewer night shifts in the tracking (legacy compat)
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
        //conflicts.push({
        //  type: ConflictType.REST_PERIOD_VIOLATION,
        //  staffId: staffMember.id,
        //  date,
        //  message: `Insufficient rest period between day and night shift`,
        //  severity: "error",
        //  staffName: `${staffMember.user.firstName} ${staffMember.user.lastName}`
        //});
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
        
        // Update duty and shift type counts for equal distribution
        staffDutyPatterns[staffMember.id].duty += 1;
        staffDutyPatterns[staffMember.id].nightShift += 1;
        
        // Update weekly tracking
        weeklySchedules[weekKey][staffMember.id] = (weeklySchedules[weekKey][staffMember.id] || 0) + 1;
        
        // Mark as assigned
        assignedShifts[`${staffMember.id}-${date}`] = true;
        nightShiftAssigned++;
      }
      
      nightShiftIndex++;
    }
    
    // 7. Assign pre-duty shifts (typically assigned the day before duty)
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];
    
    // Only assign pre-duty if the next day is within our schedule range
    if (dates.includes(nextDayStr)) {
      // Get staff who are available for pre-duty (not already assigned on this date)
      const preDutyStaff = availableStaff.filter(s => !assignedShifts[`${s.id}-${date}`]);
      
      // Sort by pre-duty count to ensure equal distribution
      preDutyStaff.sort((a, b) => {
        const aPattern = staffDutyPatterns[a.id];
        const bPattern = staffDutyPatterns[b.id];
        
        // Prioritize those with fewer pre-duty assignments
        if (aPattern.preDuty !== bPattern.preDuty) {
          return aPattern.preDuty - bPattern.preDuty;
        }
        
        // Then look at total shifts for general balance
        return staffLoads[a.id].totalShifts - staffLoads[b.id].totalShifts;
      });
      
      // Assign pre-duty to staff who will be on duty the next day
      const preDutyCount = Math.min(preDutyStaff.length, 1); // Typically just one pre-duty per day
      
      for (let i = 0; i < preDutyCount; i++) {
        const staffMember = preDutyStaff[i];
        if (!staffMember) continue;
        
        const staffLoad = staffLoads[staffMember.id];
        const weeklyShiftCount = weeklySchedules[weekKey][staffMember.id] || 0;
        
        // Skip if weekly limit reached
        if (weeklyShiftCount >= MAX_SHIFTS_PER_WEEK) {
          conflicts.push({
            type: ConflictType.EXCEEDS_WEEKLY_HOURS,
            staffId: staffMember.id,
            date,
            message: `Exceeds maximum weekly shifts (${MAX_SHIFTS_PER_WEEK})`,
            severity: "warning",
            staffName: `${staffMember.user.firstName} ${staffMember.user.lastName}`
          });
          continue;
        }
        
        schedules.push({
          staffId: staffMember.id,
          date,
          shiftTypeId: dayShiftId, // Pre-duty is typically a day shift
          dutyTypeId: preDutyId,
          unit
        });
        
        // Update staff workload tracking
        staffLoad.consecutiveShifts++;
        staffLoad.totalShifts++;
        staffLoad.lastShiftDate = date;
        staffLoad.lastShiftType = dayShiftId || null;
        staffLoad.restDays = 0;
        
        // Update duty and shift type counts
        staffDutyPatterns[staffMember.id].preDuty += 1;
        staffDutyPatterns[staffMember.id].dayShift += 1;
        
        // Update weekly tracking
        weeklySchedules[weekKey][staffMember.id] = (weeklySchedules[weekKey][staffMember.id] || 0) + 1;
      }
    }
    
    // 8. Assign post-duty shifts (typically assigned the day after duty)
    const previousDay = new Date(date);
    previousDay.setDate(previousDay.getDate() - 1);
    const previousDayStr = previousDay.toISOString().split('T')[0];
    
    // Only assign post-duty if the previous day is within our schedule range
    if (dates.includes(previousDayStr)) {
      // Get staff who are available for post-duty (not already assigned on this date)
      const postDutyStaff = availableStaff.filter(s => !assignedShifts[`${s.id}-${date}`]);
      
      // Sort by post-duty count to ensure equal distribution
      postDutyStaff.sort((a, b) => {
        const aPattern = staffDutyPatterns[a.id];
        const bPattern = staffDutyPatterns[b.id];
        
        // Prioritize those with fewer post-duty assignments
        if (aPattern.postDuty !== bPattern.postDuty) {
          return aPattern.postDuty - bPattern.postDuty;
        }
        
        // Then look at total shifts for general balance
        return staffLoads[a.id].totalShifts - staffLoads[b.id].totalShifts;
      });
      
      // Assign post-duty to staff who were on duty the previous day
      const postDutyCount = Math.min(postDutyStaff.length, 1); // Typically just one post-duty per day
      
      for (let i = 0; i < postDutyCount; i++) {
        const staffMember = postDutyStaff[i];
        if (!staffMember) continue;
        
        const staffLoad = staffLoads[staffMember.id];
        const weeklyShiftCount = weeklySchedules[weekKey][staffMember.id] || 0;
        
        // Skip if weekly limit reached
        if (weeklyShiftCount >= MAX_SHIFTS_PER_WEEK) {
          conflicts.push({
            type: ConflictType.EXCEEDS_WEEKLY_HOURS,
            staffId: staffMember.id,
            date,
            message: `Exceeds maximum weekly shifts (${MAX_SHIFTS_PER_WEEK})`,
            severity: "warning",
            staffName: `${staffMember.user.firstName} ${staffMember.user.lastName}`
          });
          continue;
        }
        
        schedules.push({
          staffId: staffMember.id,
          date,
          shiftTypeId: dayShiftId, // Post-duty is typically a day shift
          dutyTypeId: postDutyId,
          unit
        });
        
        // Update staff workload tracking
        staffLoad.consecutiveShifts++;
        staffLoad.totalShifts++;
        staffLoad.lastShiftDate = date;
        staffLoad.lastShiftType = dayShiftId || null;
        staffLoad.restDays = 0;
        
        // Update duty and shift type counts
        staffDutyPatterns[staffMember.id].postDuty += 1;
        staffDutyPatterns[staffMember.id].dayShift += 1;
        
        // Update weekly tracking
        weeklySchedules[weekKey][staffMember.id] = (weeklySchedules[weekKey][staffMember.id] || 0) + 1;
      }
    }
  });
  
  return { schedules, conflicts };
}

// Helper function to get the previous day
function getPreviousDay(dateString: string): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

// Function to detect conflicts in an individual schedule
export function detectScheduleConflicts(
  schedule: InsertSchedule | any,
  schedules: Schedule[],
  staffList: StaffWithUser[],
  availabilities: Availability[] = [],
  shiftTypes: ShiftType[] = []
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const staff = staffList.find(s => s.id === schedule.staffId);
  
  // Create maps for faster lookup
  const staffMap: Record<number, StaffWithUser> = {};
  const shiftTypesMap: Record<number, ShiftType> = {};
  
  staffList.forEach(s => staffMap[s.id] = s);
  shiftTypes.forEach(st => shiftTypesMap[st.id] = st);
  
  if (!staff) {
    return conflicts;
  }
  
  // Check for existing assignments on the same date
  const existingSchedule = schedules.find(
    s => s.staffId === schedule.staffId && s.date === schedule.date && s.id !== schedule.id
  );
  
  if (existingSchedule) {
    conflicts.push({
      type: ConflictType.EXISTING_ASSIGNMENT,
      staffId: schedule.staffId,
      date: schedule.date,
      message: `Staff already has an assignment on ${schedule.date}`,
      severity: "error",
      staffName: `${staff.user.firstName} ${staff.user.lastName}`
    });
  }
  
  // Check for consecutive shift exceeding maximum
  const dates = schedules
    .filter(s => s.staffId === schedule.staffId)
    .map(s => s.date)
    .sort();
  
  if (dates.length > 0) {
    let consecutiveCount = 1;
    let maxConsecutive = 1;
    
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (Math.round(dayDiff) === 1) {
        consecutiveCount++;
      } else {
        consecutiveCount = 1;
      }
      
      maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
    }
    
    if (maxConsecutive > MAX_CONSECUTIVE_SHIFTS) {
      conflicts.push({
        type: ConflictType.CONSECUTIVE_SHIFTS,
        staffId: schedule.staffId,
        date: schedule.date,
        message: `Exceeds maximum consecutive shifts (${MAX_CONSECUTIVE_SHIFTS})`,
        severity: "warning",
        staffName: `${staff.user.firstName} ${staff.user.lastName}`
      });
    }
  }
  
  // Check for weekly hour/shift limits
  const scheduleDate = new Date(schedule.date);
  const weekStart = new Date(scheduleDate);
  weekStart.setDate(scheduleDate.getDate() - scheduleDate.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  const weeklySchedules = schedules.filter(s => {
    const date = new Date(s.date);
    return s.staffId === schedule.staffId && date >= weekStart && date <= weekEnd;
  });
  
  if (weeklySchedules.length > MAX_SHIFTS_PER_WEEK) {
    //conflicts.push({
    //  type: ConflictType.EXCEEDS_WEEKLY_HOURS,
    //  staffId: schedule.staffId,
    //  date: schedule.date,
    //  message: `Exceeds maximum weekly shifts (${MAX_SHIFTS_PER_WEEK})`,
    //  severity: "warning",
    //  staffName: `${staff.user.firstName} ${staff.user.lastName}`
    //});
  }
  
  // Check for day-to-night transition without proper rest
  if (schedule.shiftTypeId) {
    const scheduleShift = shiftTypesMap[schedule.shiftTypeId];
    const yesterdayDate = new Date(schedule.date);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];
    
    const yesterdaySchedule = schedules.find(
      s => s.staffId === schedule.staffId && s.date === yesterday
    );
    
    if (yesterdaySchedule?.shiftTypeId && scheduleShift) {
      const yesterdayShift = shiftTypesMap[yesterdaySchedule.shiftTypeId];
      
      if (yesterdayShift && scheduleShift) {
        const yesterdayEnd = new Date(`${yesterday}T${yesterdayShift.endTime}`);
        const todayStart = new Date(`${schedule.date}T${scheduleShift.startTime}`);
        const restHours = (todayStart.getTime() - yesterdayEnd.getTime()) / (1000 * 60 * 60);
        
        if (restHours < MIN_REST_HOURS) {
          //conflicts.push({
          //  type: ConflictType.REST_PERIOD_VIOLATION,
          //  staffId: schedule.staffId,
          //  date: schedule.date,
          //  message: `Insufficient rest period (${Math.round(restHours)}h < ${MIN_REST_HOURS}h)`,
          //  severity: "error",
          //  staffName: `${staff.user.firstName} ${staff.user.lastName}`
          //});
        }
      }
    }
  }
  
  // Check for specialization mismatch if unit is specified
  if (schedule.unit && staff.specialization && schedule.unit !== staff.specialization) {
    //conflicts.push({
    //  type: ConflictType.SPECIALIZATION_MISMATCH,
    //  staffId: schedule.staffId,
    //  date: schedule.date,
    //  message: `Staff specialization (${staff.specialization}) does not match unit (${schedule.unit})`,
    //  severity: "warning",
    //  staffName: `${staff.user.firstName} ${staff.user.lastName}`
    //});
  }
  
  return conflicts;
}

// Check for shift conflicts with existing schedules
export function hasShiftConflict(
  staffId: number,
  date: string,
  schedules: Schedule[]
): boolean {
  return schedules.some(s => s.staffId === staffId && s.date === date);
}

// Suggest alternative staff for a shift with conflicts
export function suggestAlternativeStaff(
  staffId: number,
  date: string,
  shiftTypeId: number | null,
  staff: StaffWithUser[],
  schedules: Schedule[],
  availabilities: Availability[] = [],
  unitSpecialization?: string
): StaffWithUser[] {
  // Get staff who are already assigned on this date
  const assignedStaffIds = schedules
    .filter(s => s.date === date)
    .map(s => s.staffId);
  
  // Filter out staff who are already assigned
  let availableStaff = staff.filter(s => !assignedStaffIds.includes(s.id));
  
  // Further filter by specialization if needed
  if (unitSpecialization) {
    const specializedStaff = availableStaff.filter(s => s.specialization === unitSpecialization);
    if (specializedStaff.length > 0) {
      availableStaff = specializedStaff;
    }
  }
  
  // Sort by number of assigned shifts (to balance workload)
  const staffShiftCounts: Record<number, number> = {};
  staff.forEach(s => {
    staffShiftCounts[s.id] = schedules.filter(schedule => schedule.staffId === s.id).length;
  });
  
  availableStaff.sort((a, b) => {
    return (staffShiftCounts[a.id] || 0) - (staffShiftCounts[b.id] || 0);
  });
  
  return availableStaff;
}