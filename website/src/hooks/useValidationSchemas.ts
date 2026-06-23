import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';

// Phone validation (Indian format)
const phoneRegex = /^(\+91[-\s]?)?[6-9]\d{9}$/;

export function useValidationSchemas() {
  const { t } = useTranslation('common');

  return useMemo(() => {
    // Common validation messages
    const messages = {
      required: t('validation.required'),
      invalidEmail: t('validation.invalidEmail'),
      invalidPhone: t('validation.invalidPhone'),
      minLength: (min: number) => t('validation.minLength', { min }),
      maxLength: (max: number) => t('validation.maxLength', { max }),
      positiveNumber: t('validation.positiveNumber'),
      futureDate: t('validation.futureDate'),
      pastDate: t('validation.pastDate'),
    };

    // Customer schema
    const customerSchema = z.object({
      name: z
        .string()
        .trim()
        .min(2, messages.minLength(2))
        .max(100, messages.maxLength(100)),
      phone: z
        .string()
        .trim()
        .regex(phoneRegex, messages.invalidPhone),
      email: z
        .string()
        .trim()
        .email(messages.invalidEmail)
        .max(255, messages.maxLength(255))
        .optional()
        .or(z.literal('')),
      address: z
        .string()
        .trim()
        .min(5, messages.minLength(5))
        .max(500, messages.maxLength(500)),
      area: z
        .string()
        .trim()
        .max(100, messages.maxLength(100))
        .optional(),
      birthday: z
        .string()
        .optional()
        .refine((val) => {
          if (!val) return true;
          const date = new Date(val);
          return date <= new Date();
        }, messages.pastDate),
      anniversaryDate: z
        .string()
        .optional()
        .refine((val) => {
          if (!val) return true;
          const date = new Date(val);
          return date <= new Date();
        }, messages.pastDate),
    });

    // Product schema
    const productSchema = z.object({
      name: z
        .string()
        .trim()
        .min(2, messages.minLength(2))
        .max(100, messages.maxLength(100)),
      category: z
        .string()
        .trim()
        .min(1, messages.required),
      price: z
        .number()
        .positive(messages.positiveNumber)
        .max(100000, t('validation.priceTooHigh')),
      unit: z
        .string()
        .trim()
        .min(1, messages.required),
      stockQuantity: z
        .number()
        .int()
        .min(0, t('validation.stockNegative'))
        .optional(),
      description: z
        .string()
        .trim()
        .max(500, messages.maxLength(500))
        .optional(),
    });

    // Order schema
    const orderSchema = z.object({
      customerId: z
        .string()
        .uuid(t('validation.selectCustomer')),
      productId: z
        .string()
        .uuid(t('validation.selectProduct')),
      quantity: z
        .number()
        .int()
        .positive(t('validation.quantityMin')),
      deliveryDate: z
        .string()
        .min(1, messages.required),
      deliveryTime: z
        .string()
        .optional(),
      specialInstructions: z
        .string()
        .trim()
        .max(500, messages.maxLength(500))
        .optional(),
    });

    // User/Profile schema
    const userSchema = z.object({
      name: z
        .string()
        .trim()
        .min(2, messages.minLength(2))
        .max(100, messages.maxLength(100)),
      username: z
        .string()
        .trim()
        .min(3, messages.minLength(3))
        .max(50, messages.maxLength(50))
        .regex(/^[a-zA-Z0-9_]+$/, t('validation.usernameFormat')),
      email: z
        .string()
        .trim()
        .email(messages.invalidEmail)
        .max(255, messages.maxLength(255)),
      phone: z
        .string()
        .trim()
        .regex(phoneRegex, messages.invalidPhone)
        .optional()
        .or(z.literal('')),
      address: z
        .string()
        .trim()
        .max(500, messages.maxLength(500))
        .optional(),
    });

    // Password schema
    const passwordSchema = z.object({
      password: z
        .string()
        .min(8, t('validation.passwordMin'))
        .regex(/[A-Z]/, t('validation.passwordUppercase'))
        .regex(/[a-z]/, t('validation.passwordLowercase'))
        .regex(/[0-9]/, t('validation.passwordNumber')),
      confirmPassword: z.string(),
    }).refine((data) => data.password === data.confirmPassword, {
      message: t('validation.passwordMismatch'),
      path: ['confirmPassword'],
    });

    // Login schema
    const loginSchema = z.object({
      email: z
        .string()
        .trim()
        .email(messages.invalidEmail),
      password: z
        .string()
        .min(1, messages.required),
    });

    // Signup schema
    const signupSchema = userSchema.extend({
      password: z
        .string()
        .min(8, t('validation.passwordMin'))
        .regex(/[A-Z]/, t('validation.passwordUppercase'))
        .regex(/[a-z]/, t('validation.passwordLowercase'))
        .regex(/[0-9]/, t('validation.passwordNumber')),
      confirmPassword: z.string(),
    }).refine((data) => data.password === data.confirmPassword, {
      message: t('validation.passwordMismatch'),
      path: ['confirmPassword'],
    });

    // Subscription schema
    const subscriptionSchema = z.object({
      productId: z
        .string()
        .uuid(t('validation.selectProduct')),
      quantity: z
        .number()
        .int()
        .positive(t('validation.quantityMin')),
      frequency: z
        .enum(['daily', 'alternate', 'weekly', 'custom']),
      startDate: z
        .string()
        .min(1, messages.required),
      endDate: z
        .string()
        .optional(),
      deliveryTime: z
        .string()
        .optional(),
      daysOfWeek: z
        .array(z.string())
        .optional(),
      specialInstructions: z
        .string()
        .trim()
        .max(500, messages.maxLength(500))
        .optional(),
    });

    // Delivery Boy schema
    const deliveryBoySchema = z.object({
      name: z
        .string()
        .trim()
        .min(2, messages.minLength(2))
        .max(100, messages.maxLength(100)),
      phone: z
        .string()
        .trim()
        .regex(phoneRegex, messages.invalidPhone),
      email: z
        .string()
        .trim()
        .email(messages.invalidEmail)
        .max(255, messages.maxLength(255))
        .optional()
        .or(z.literal('')),
      address: z
        .string()
        .trim()
        .max(500, messages.maxLength(500))
        .optional(),
    });

    // Dairy schema
    const dairySchema = z.object({
      name: z
        .string()
        .trim()
        .min(2, messages.minLength(2))
        .max(100, messages.maxLength(100)),
      ownerName: z
        .string()
        .trim()
        .min(2, messages.minLength(2))
        .max(100, messages.maxLength(100)),
      ownerPhone: z
        .string()
        .trim()
        .regex(phoneRegex, messages.invalidPhone),
      ownerEmail: z
        .string()
        .trim()
        .email(messages.invalidEmail)
        .max(255, messages.maxLength(255))
        .optional()
        .or(z.literal('')),
      address: z
        .string()
        .trim()
        .min(5, messages.minLength(5))
        .max(500, messages.maxLength(500)),
      description: z
        .string()
        .trim()
        .max(1000, messages.maxLength(1000))
        .optional(),
    });

    // Rating schema
    const ratingSchema = z.object({
      productRating: z
        .number()
        .min(1, t('validation.rateProduct'))
        .max(5),
      deliveryRating: z
        .number()
        .min(1, t('validation.rateDelivery'))
        .max(5),
      productFeedback: z
        .string()
        .trim()
        .max(500, messages.maxLength(500))
        .optional(),
      deliveryFeedback: z
        .string()
        .trim()
        .max(500, messages.maxLength(500))
        .optional(),
    });

    // Password strength checker with translations
    const getPasswordStrength = (password: string): {
      score: number;
      label: string;
      color: string;
    } => {
      let score = 0;
      
      if (password.length >= 8) score++;
      if (password.length >= 12) score++;
      if (/[A-Z]/.test(password)) score++;
      if (/[a-z]/.test(password)) score++;
      if (/[0-9]/.test(password)) score++;
      if (/[^A-Za-z0-9]/.test(password)) score++;

      if (score <= 2) return { score, label: t('validation.passwordStrength.weak'), color: 'bg-destructive' };
      if (score <= 4) return { score, label: t('validation.passwordStrength.medium'), color: 'bg-warning' };
      return { score, label: t('validation.passwordStrength.strong'), color: 'bg-success' };
    };

    return {
      customerSchema,
      productSchema,
      orderSchema,
      userSchema,
      passwordSchema,
      loginSchema,
      signupSchema,
      subscriptionSchema,
      deliveryBoySchema,
      dairySchema,
      ratingSchema,
      getPasswordStrength,
    };
  }, [t]);
}

// Export types (reusing from validations.ts for compatibility)
export type { 
  CustomerFormData, 
  ProductFormData, 
  OrderFormData, 
  UserFormData, 
  LoginFormData,
  SignupFormData,
  SubscriptionFormData,
  DeliveryBoyFormData,
  DairyFormData,
  RatingFormData 
} from '@/lib/validations';
