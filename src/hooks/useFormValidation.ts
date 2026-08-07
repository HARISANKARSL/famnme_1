import { useState, useCallback } from 'react';

export type ValidationFieldType = 'name' | 'tree_name' | 'description' | 'date' | 'location' | 'source_title' | 'biography';

export interface ValidationConfig {
  required?: boolean;
  type: ValidationFieldType;
  label: string;
  pairedDate?: string;
}

export interface UseFormValidationReturn {
  errors: Record<string, string>;
  validateField: (name: string, value: string, config: ValidationConfig) => string;
  validateStep: (fields: Record<string, string>, configs: Record<string, ValidationConfig>) => boolean;
  sanitizeInput: (value: string) => string;
  clearError: (name: string) => void;
  resetValidation: () => void;
}

export function useFormValidation(): UseFormValidationReturn {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = useCallback((name: string, value: string, config: ValidationConfig): string => {
    let errorMsg = '';

    if (config.required && !value.trim()) {
      errorMsg = `${config.label} is required`;
    } else if (/^\s/.test(value)) {
      errorMsg = `${config.label} cannot start with a space`;
    } else if (config.type !== 'date' && config.type !== 'biography' && value.trim() && !/[a-zA-Z0-9\u00C0-\u00FF\u0100-\u017F]/.test(value.trim())) {
      errorMsg = `${config.label} cannot contain only special characters`;
    } else if (config.type !== 'date' && config.type !== 'biography' && value.trim() && !/[a-zA-Z0-9\u00C0-\u00FF\u0100-\u017F]/.test(value.trim()[0])) {
      errorMsg = `${config.label} cannot start with a special character`;
    } else if (config.type === 'name' && !/^[a-zA-Z\s]*$/.test(value)) {
      errorMsg = `${config.label} can only contain alphabets`;
    } else if (config.type === 'name' && value.length > 50) {
      errorMsg = `${config.label} cannot exceed 50 characters`;
    } else if (config.type === 'tree_name' && value.length > 50) {
      errorMsg = `${config.label} cannot exceed 50 characters`;
    } else if (config.type === 'location' && value.length > 50) {
      errorMsg = `${config.label} cannot exceed 50 characters`;
    } else if (config.type === 'description' && value.length > 300) {
      errorMsg = `${config.label} cannot exceed 300 characters`;
    } else if (config.type === 'source_title' && value.length > 180) {
      errorMsg = `${config.label} cannot exceed 180 characters`;
    } else if (config.type === 'date') {
      const today = new Date().toISOString().split('T')[0];
      if (value && value > today) {
        errorMsg = `${config.label} cannot be in the future`;
      } else if (value && config.pairedDate) {
        if (name === 'birthDate' && value > config.pairedDate) {
          errorMsg = 'Birth date cannot be greater than death date';
        } else if (name === 'deathDate' && config.pairedDate > value) {
          errorMsg = 'Death date cannot be earlier than birth date';
        }
      }
    }

    setErrors((prev) => {
      if (errorMsg) {
        return { ...prev, [name]: errorMsg };
      } else {
        const next = { ...prev };
        delete next[name];
        return next;
      }
    });

    return errorMsg;
  }, []);

  const sanitizeInput = useCallback((value: string): string => {
    // Physically prevent leading whitespace from being entered
    return value.replace(/^\s+/, '');
  }, []);

  const validateStep = useCallback((
    fields: Record<string, string>,
    configs: Record<string, ValidationConfig>
  ): boolean => {
    let isValid = true;
    const newErrors: Record<string, string> = {};

    Object.entries(configs).forEach(([name, config]) => {
      const value = fields[name] || '';
      let errorMsg = '';

      if (config.required && !value.trim()) {
        errorMsg = `${config.label} is required`;
      } else if (/^\s/.test(value)) {
        errorMsg = `${config.label} cannot start with a space`;
      } else if (config.type !== 'date' && config.type !== 'biography' && value.trim() && !/[a-zA-Z0-9\u00C0-\u00FF\u0100-\u017F]/.test(value.trim())) {
        errorMsg = `${config.label} cannot contain only special characters`;
      } else if (config.type !== 'date' && config.type !== 'biography' && value.trim() && !/[a-zA-Z0-9\u00C0-\u00FF\u0100-\u017F]/.test(value.trim()[0])) {
        errorMsg = `${config.label} cannot start with a special character`;
      } else if (config.type === 'name' && !/^[a-zA-Z\s]*$/.test(value)) {
        errorMsg = `${config.label} can only contain alphabets`;
      } else if (config.type === 'name' && value.length > 50) {
        errorMsg = `${config.label} cannot exceed 50 characters`;
      } else if (config.type === 'tree_name' && value.length > 50) {
        errorMsg = `${config.label} cannot exceed 50 characters`;
      } else if (config.type === 'location' && value.length > 50) {
        errorMsg = `${config.label} cannot exceed 50 characters`;
      } else if (config.type === 'description' && value.length > 300) {
        errorMsg = `${config.label} cannot exceed 300 characters`;
      } else if (config.type === 'source_title' && value.length > 180) {
        errorMsg = `${config.label} cannot exceed 180 characters`;
      } else if (config.type === 'date') {
        const today = new Date().toISOString().split('T')[0];
        if (value && value > today) {
          errorMsg = `${config.label} cannot be in the future`;
        } else {
          const pairedValue = config.pairedDate || (name === 'birthDate' ? fields['deathDate'] : fields['birthDate']) || '';
          if (value && pairedValue) {
            if (name === 'birthDate' && value > pairedValue) {
              errorMsg = 'Birth date cannot be greater than death date';
            } else if (name === 'deathDate' && pairedValue > value) {
              errorMsg = 'Death date cannot be earlier than birth date';
            }
          }
        }
      }

      if (errorMsg) {
        newErrors[name] = errorMsg;
        isValid = false;
      }
    });

    setErrors((prev) => {
      const next = { ...prev };
      // Clear previous errors for these fields first
      Object.keys(configs).forEach((name) => {
        delete next[name];
      });
      return { ...next, ...newErrors };
    });

    return isValid;
  }, []);

  const clearError = useCallback((name: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const resetValidation = useCallback(() => {
    setErrors({});
  }, []);

  return {
    errors,
    validateField,
    validateStep,
    sanitizeInput,
    clearError,
    resetValidation,
  };
}
