import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../utils/theme';

// Form validation types
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | undefined;
}

export interface FieldConfig {
  rules?: ValidationRule;
  initialValue?: any;
}

export interface FormConfig {
  [fieldName: string]: FieldConfig;
}

export interface FormErrors {
  [fieldName: string]: string | undefined;
}

export interface FormValues {
  [fieldName: string]: any;
}

interface FormContextValue {
  values: FormValues;
  errors: FormErrors;
  touched: { [fieldName: string]: boolean };
  isSubmitting: boolean;
  setValue: (name: string, value: any) => void;
  setError: (name: string, error: string | undefined) => void;
  setTouched: (name: string, touched: boolean) => void;
  validateField: (name: string, value: any) => string | undefined;
  validateForm: () => boolean;
  resetForm: () => void;
}

const FormContext = createContext<FormContextValue | undefined>(undefined);

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a Form component');
  }
  return context;
};

interface FormProps {
  children: React.ReactNode;
  config: FormConfig;
  onSubmit: (values: FormValues) => void | Promise<void>;
  style?: ViewStyle;
  testID?: string;
}

export const Form: React.FC<FormProps> = ({
  children,
  config,
  onSubmit,
  style,
  testID,
}) => {
  // Initialize form state
  const [values, setValues] = useState<FormValues>(() => {
    const initialValues: FormValues = {};
    Object.keys(config).forEach(key => {
      initialValues[key] = config[key].initialValue || '';
    });
    return initialValues;
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouchedState] = useState<{ [key: string]: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback((name: string, value: any): string | undefined => {
    const fieldConfig = config[name];
    if (!fieldConfig?.rules) return undefined;

    const { rules } = fieldConfig;

    // Required validation
    if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return 'This field is required';
    }

    // Skip other validations if field is empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return undefined;
    }

    // Min length validation
    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      return `Must be at least ${rules.minLength} characters`;
    }

    // Max length validation
    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      return `Must be no more than ${rules.maxLength} characters`;
    }

    // Pattern validation
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      return 'Invalid format';
    }

    // Custom validation
    if (rules.custom) {
      return rules.custom(value);
    }

    return undefined;
  }, [config]);

  const setValue = useCallback((name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Validate field if it has been touched
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [touched, validateField]);

  const setError = useCallback((name: string, error: string | undefined) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  const setTouched = useCallback((name: string, isTouched: boolean) => {
    setTouchedState(prev => ({ ...prev, [name]: isTouched }));
    
    // Validate field when it becomes touched
    if (isTouched) {
      const error = validateField(name, values[name]);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [values, validateField]);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    Object.keys(config).forEach(name => {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    
    // Mark all fields as touched
    const allTouched: { [key: string]: boolean } = {};
    Object.keys(config).forEach(name => {
      allTouched[name] = true;
    });
    setTouchedState(allTouched);

    return isValid;
  }, [config, values, validateField]);

  const resetForm = useCallback(() => {
    const initialValues: FormValues = {};
    Object.keys(config).forEach(key => {
      initialValues[key] = config[key].initialValue || '';
    });
    setValues(initialValues);
    setErrors({});
    setTouchedState({});
    setIsSubmitting(false);
  }, [config]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      if (validateForm()) {
        await onSubmit(values);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, validateForm, onSubmit, values]);

  const contextValue: FormContextValue = {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setError,
    setTouched,
    validateField,
    validateForm,
    resetForm,
  };

  return (
    <FormContext.Provider value={contextValue}>
      <View style={[styles.form, style]} testID={testID}>
        {children}
      </View>
    </FormContext.Provider>
  );
};

const styles = StyleSheet.create({
  form: {
    width: '100%',
  },
});

// Form field wrapper component
interface FormFieldProps {
  name: string;
  children: (props: {
    value: any;
    error: string | undefined;
    touched: boolean;
    onChange: (value: any) => void;
    onBlur: () => void;
  }) => React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({ name, children }) => {
  const { values, errors, touched, setValue, setTouched } = useFormContext();

  const handleChange = useCallback((value: any) => {
    setValue(name, value);
  }, [name, setValue]);

  const handleBlur = useCallback(() => {
    setTouched(name, true);
  }, [name, setTouched]);

  return (
    <>
      {children({
        value: values[name],
        error: touched[name] ? errors[name] : undefined,
        touched: touched[name] || false,
        onChange: handleChange,
        onBlur: handleBlur,
      })}
    </>
  );
};