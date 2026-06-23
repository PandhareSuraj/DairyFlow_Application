import { z } from 'zod';

// Phone validation (Indian format)
const phoneRegex = /^(\+91[-\s]?)?[6-9]\d{9}$/;

// Common validation messages
const messages = {
  required: 'This field is required',
  invalidEmail: 'Please enter a valid email address',
  invalidPhone: 'Please enter a valid 10-digit phone number',
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Must be less than ${max} characters`,
  positiveNumber: 'Must be a positive number',
  futureDate: 'Date must be in the future',
  pastDate: 'Date cannot be in the future',
};

// Customer schema
export const customerSchema = z.object({
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
export const productSchema = z.object({
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
    .max(100000, 'Price seems too high'),
  unit: z
    .string()
    .trim()
    .min(1, messages.required),
  stockQuantity: z
    .number()
    .int()
    .min(0, 'Stock cannot be negative')
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, messages.maxLength(500))
    .optional(),
});

// Order schema
export const orderSchema = z.object({
  customerId: z
    .string()
    .uuid('Please select a valid customer'),
  productId: z
    .string()
    .uuid('Please select a valid product'),
  quantity: z
    .number()
    .int()
    .positive('Quantity must be at least 1'),
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
export const userSchema = z.object({
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
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
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
export const passwordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Login schema
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email(messages.invalidEmail),
  password: z
    .string()
    .min(1, messages.required),
});

// Signup schema
export const signupSchema = userSchema.extend({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Subscription schema
export const subscriptionSchema = z.object({
  productId: z
    .string()
    .uuid('Please select a valid product'),
  quantity: z
    .number()
    .int()
    .positive('Quantity must be at least 1'),
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
export const deliveryBoySchema = z.object({
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
export const dairySchema = z.object({
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
export const ratingSchema = z.object({
  productRating: z
    .number()
    .min(1, 'Please rate the product')
    .max(5),
  deliveryRating: z
    .number()
    .min(1, 'Please rate the delivery')
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

// Type exports
export type CustomerFormData = z.infer<typeof customerSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type OrderFormData = z.infer<typeof orderSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type SubscriptionFormData = z.infer<typeof subscriptionSchema>;
export type DeliveryBoyFormData = z.infer<typeof deliveryBoySchema>;
export type DairyFormData = z.infer<typeof dairySchema>;
export type RatingFormData = z.infer<typeof ratingSchema>;

// Utility function to get field error
export function getFieldError(errors: Record<string, any>, field: string): string | undefined {
  return errors[field]?.message;
}

// Password strength checker
export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak', color: 'bg-destructive' };
  if (score <= 4) return { score, label: 'Medium', color: 'bg-warning' };
  return { score, label: 'Strong', color: 'bg-success' };
}
