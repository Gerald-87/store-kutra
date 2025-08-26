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