import { useState, useCallback } from 'react'

interface ValidationRule {
  validate: (value: string) => boolean
  message: string
}

interface FieldValidation {
  rules: ValidationRule[]
  validateOnBlur?: boolean
  validateOnChange?: boolean
}

interface UseFormValidationOptions {
  fields: Record<string, FieldValidation>
}

export function useFormValidation({ fields }: UseFormValidationOptions) {
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validateField = useCallback((name: string, value: string): string | null => {
    const field = fields[name]
    if (!field) return null

    for (const rule of field.rules) {
      if (!rule.validate(value)) {
        return rule.message
      }
    }
    return null
  }, [fields])

  const handleBlur = useCallback((name: string, value: string) => {
    setTouched(prev => ({ ...prev, [name]: true }))
    const error = validateField(name, value)
    setErrors(prev => ({ ...prev, [name]: error }))
  }, [validateField])

  const handleChange = useCallback((name: string, value: string) => {
    const field = fields[name]
    if (field?.validateOnChange || touched[name]) {
      const error = validateField(name, value)
      setErrors(prev => ({ ...prev, [name]: error }))
    }
  }, [fields, touched, validateField])

  const validateAll = useCallback((values: Record<string, string>): boolean => {
    const newErrors: Record<string, string | null> = {}
    let isValid = true

    for (const [name, value] of Object.entries(values)) {
      const error = validateField(name, value)
      newErrors[name] = error
      if (error) isValid = false
    }

    setErrors(newErrors)
    setTouched(Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {}))
    return isValid
  }, [validateField])

  const clearErrors = useCallback(() => {
    setErrors({})
    setTouched({})
  }, [])

  return {
    errors,
    touched,
    handleBlur,
    handleChange,
    validateAll,
    clearErrors,
    getFieldError: (name: string) => touched[name] ? errors[name] : null,
  }
}
