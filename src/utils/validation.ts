/**
 * Validation utilities for the Famnme frontend application.
 * Defines max lengths for text fields (50 chars) and description fields (300 chars).
 */

export const VALIDATION_LIMITS = {
  text: 50,
  storyTitle: 50,
  description: 300,
};

export interface ValidationOptions {
  name?: string;
  maxLength?: number;
  minLength?: number;
  required?: boolean;
  noWhitespaceOnly?: boolean;
}

export function validateField(value: string | null | undefined, options: ValidationOptions = {}): ValidationResult {
  const str = value || '';
  const name = options.name || 'Field';

  if (str && /^\s/.test(str)) {
    return { isValid: false, error: `${name} cannot start with a space` };
  }

  if (options.required && !str.trim()) {
    return { isValid: false, error: `${name} is required` };
  }

  if (options.noWhitespaceOnly && str && !str.trim()) {
    return { isValid: false, error: `${name} cannot be empty or only spaces` };
  }

  if (options.maxLength !== undefined && str.length > options.maxLength) {
    return {
      isValid: false,
      error: `Must be ${options.maxLength} characters or less (current: ${str.length})`,
    };
  }

  if (options.minLength !== undefined && str.length < options.minLength) {
    return {
      isValid: false,
      error: `Must be at least ${options.minLength} characters (current: ${str.length})`,
    };
  }

  return { isValid: true, error: '' };
}

export interface ValidationResult {
  isValid: boolean;
  error: string;
}

/**
 * Validates a text field/title.
 * Max length is 30 characters.
 */
export function validateTextField(value: string | null | undefined): ValidationResult {
  const str = value || '';
  if (str && /^\s/.test(str)) {
    return { isValid: false, error: 'Cannot start with a space' };
  }
  if (str && !/[a-zA-Z0-9]/.test(str)) {
    return { isValid: false, error: 'Must contain at least one letter or number' };
  }
  if (str.length > VALIDATION_LIMITS.text) {
    return {
      isValid: false,
      error: `Must be ${VALIDATION_LIMITS.text} characters or less (current: ${str.length})`,
    };
  }
  return { isValid: true, error: '' };
}

/**
 * Validates a description field.
 * Max length is 100 characters.
 */
export function validateDescriptionField(value: string | null | undefined): ValidationResult {
  const str = value || '';
  if (str && /^\s/.test(str)) {
    return { isValid: false, error: 'Cannot start with a space' };
  }
  if (str.length > VALIDATION_LIMITS.description) {
    return {
      isValid: false,
      error: `Must be ${VALIDATION_LIMITS.description} characters or less (current: ${str.length})`,
    };
  }
  return { isValid: true, error: '' };
}
