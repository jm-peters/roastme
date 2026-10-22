// src/utils/usernameValidation.ts

export const USERNAME_REGEX = /^[a-zA-Z0-9@#_&]+$/;
export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 30;

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateUsername(username: string): ValidationResult {
  // Check if empty
  if (!username || username.trim().length === 0) {
    return { isValid: false, error: 'Username cannot be empty' };
  }

  // Remove whitespace
  const cleaned = username.trim();

  // Check length
  if (cleaned.length < MIN_USERNAME_LENGTH) {
    return { isValid: false, error: `Username must be at least ${MIN_USERNAME_LENGTH} characters` };
  }

  if (cleaned.length > MAX_USERNAME_LENGTH) {
    return { isValid: false, error: `Username cannot exceed ${MAX_USERNAME_LENGTH} characters` };
  }

  // Check allowed characters (letters, numbers, @ # _ &)
  if (!USERNAME_REGEX.test(cleaned)) {
    return { 
      isValid: false, 
      error: 'Only letters, numbers, and these symbols are allowed: @ # _ &' 
    };
  }

  // Check for consecutive special characters
  if (/([@#_&]{2,})/.test(cleaned)) {
    return { isValid: false, error: 'Cannot have consecutive special characters' };
  }

  // Check if starts or ends with special character
  if (/^[@#_&]/.test(cleaned)) {
    return { isValid: false, error: 'Username cannot start with a special character' };
  }

  if (/[@#_&]$/.test(cleaned)) {
    return { isValid: false, error: 'Username cannot end with a special character' };
  }

  return { isValid: true };
}

export function formatUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function generateRoastboardSlug(username: string): string {
  return username.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
}
