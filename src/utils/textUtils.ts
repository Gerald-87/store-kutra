/**
 * Utility functions to prevent React Native text rendering errors
 */

/**
 * Safely renders a value as text, converting numbers and booleans to strings
 * @param value - The value to render as text
 * @returns A string representation of the value
 */
export const safeText = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  
  if (typeof value === 'number') {
    return value.toString();
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  // For objects and arrays, convert to JSON string
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

/**
 * Safely handles conditional text rendering to prevent 0 or false from being rendered
 * @param condition - The condition to check
 * @param content - The content to render if condition is truthy
 * @returns The content if condition is truthy, null otherwise
 */
export const conditionalText = (condition: any, content: any) => {
  return condition ? content : null;
};

/**
 * Safely converts a number to string for display
 * @param num - The number to convert
 * @param fallback - Fallback text if number is invalid
 * @returns String representation of the number
 */
export const numberToText = (num: number | null | undefined, fallback: string = '0'): string => {
  if (num === null || num === undefined || isNaN(num)) {
    return fallback;
  }
  return num.toString();
};

/**
 * Safely handles array length display
 * @param arr - The array to get length from
 * @param fallback - Fallback text if array is invalid
 * @returns String representation of array length
 */
export const arrayLengthText = (arr: any[] | null | undefined, fallback: string = '0'): string => {
  if (!Array.isArray(arr)) {
    return fallback;
  }
  return arr.length.toString();
};

/**
 * Safely formats dates to prevent 'Invalid Date' errors
 * @param dateValue - The date value to format (string, Date, or timestamp)
 * @param fallback - Fallback text if date is invalid
 * @returns Formatted date string or fallback
 */
export const safeFormatDate = (dateValue: any, fallback: string = 'Unknown'): string => {
  if (!dateValue) {
    return fallback;
  }

  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return fallback;
    }
    return date.toLocaleDateString();
  } catch (error) {
    console.warn('Error formatting date:', error);
    return fallback;
  }
};

/**
 * Safely formats dates with time to prevent 'Invalid Date' errors
 * @param dateValue - The date value to format (string, Date, or timestamp)
 * @param fallback - Fallback text if date is invalid
 * @returns Formatted date and time string or fallback
 */
export const safeFormatDateTime = (dateValue: any, fallback: string = 'Unknown'): string => {
  if (!dateValue) {
    return fallback;
  }

  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return fallback;
    }
    return date.toLocaleString();
  } catch (error) {
    console.warn('Error formatting date time:', error);
    return fallback;
  }
};

/**
 * Safely formats relative time (e.g., '2h ago', 'Just now')
 * @param dateValue - The date value to format (string, Date, or timestamp)
 * @param fallback - Fallback text if date is invalid
 * @returns Formatted relative time string or fallback
 */
export const safeFormatRelativeTime = (dateValue: any, fallback: string = 'Unknown'): string => {
  if (!dateValue) {
    return fallback;
  }

  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return fallback;
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  } catch (error) {
    console.warn('Error formatting relative time:', error);
    return fallback;
  }
};

/**
 * Validates if a date value is valid
 * @param dateValue - The date value to validate
 * @returns True if the date is valid, false otherwise
 */
export const isValidDate = (dateValue: any): boolean => {
  if (!dateValue) {
    return false;
  }

  try {
    const date = new Date(dateValue);
    return !isNaN(date.getTime());
  } catch (error) {
    return false;
  }
};

/**
 * Safely formats date range (e.g., 'Jan 1 - Jan 5, 2024')
 * @param startDate - The start date
 * @param endDate - The end date
 * @param fallback - Fallback text if dates are invalid
 * @returns Formatted date range or fallback
 */
export const safeFormatDateRange = (
  startDate: any, 
  endDate: any, 
  fallback: string = 'Unknown dates'
): string => {
  const startValid = isValidDate(startDate);
  const endValid = isValidDate(endDate);

  if (!startValid && !endValid) {
    return fallback;
  }

  if (startValid && !endValid) {
    return safeFormatDate(startDate, fallback);
  }

  if (!startValid && endValid) {
    return safeFormatDate(endDate, fallback);
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // If same day
    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString();
    }
    
    // If same year
    if (start.getFullYear() === end.getFullYear()) {
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    }
    
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  } catch (error) {
    console.warn('Error formatting date range:', error);
    return fallback;
  }
};