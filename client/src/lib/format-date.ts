import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';

/**
 * Formats a date string according to the specified format
 */
export function formatDate(date: string | Date, formatString: string = 'yyyy-MM-dd'): string {
  if (typeof date === 'string') {
    return format(new Date(date), formatString);
  }
  return format(date, formatString);
}

/**
 * Formats a date for display purposes
 */
export function formatDateForDisplay(date: Date): string {
  return format(date, 'MMM d, yyyy');
}

/**
 * Gets the weekday name (e.g., "Monday") from a date
 */
export function getWeekdayName(date: Date, type: 'short' | 'long' = 'long'): string {
  return format(date, type === 'short' ? 'EEE' : 'EEEE');
}

/**
 * Gets the start and end dates of the week containing the specified date
 */
export function getWeekDateRange(date: Date): { startDate: string; endDate: string } {
  // Get the start of the week (Sunday)
  const start = startOfWeek(date);
  
  // Get the end of the week (Saturday)
  const end = endOfWeek(date);
  
  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd')
  };
}

/**
 * Gets an array of dates for a week starting from the specified date
 */
export function getWeekDates(startDate: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(startDate, i));
  }
  return dates;
}

/**
 * Format time from 24-hour format to 12-hour format with AM/PM
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Calculate the duration between two time strings in hours
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  let duration = endHours - startHours;
  if (endMinutes < startMinutes) {
    duration -= 1;
  }
  
  // Handle overnight shifts
  if (duration < 0) {
    duration += 24;
  }
  
  return duration;
}