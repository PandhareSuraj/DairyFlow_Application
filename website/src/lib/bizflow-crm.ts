import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const BIZFLOW_SOURCE = 'dairyflow_website';

export const leadSchema = z.object({
  contact_person: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian phone number'),
  email: z.string().trim().email('Enter a valid email').max(255).optional().or(z.literal('')),
  message: z.string().trim().max(2000).optional(),
});

export type LeadFormData = z.infer<typeof leadSchema>;

interface BizFlowResponse {
  success: boolean;
  inquiry_id?: string;
  message?: string;
  error?: string;
  details?: Array<{ field: string; message: string }>;
}

export async function submitLeadToCRM(data: LeadFormData): Promise<BizFlowResponse> {
  const validated = leadSchema.parse(data);

  const { data: result, error } = await supabase.functions.invoke('submit-lead', {
    body: {
      contact_person: validated.contact_person,
      phone: validated.phone,
      email: validated.email || undefined,
      message: validated.message || undefined,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to submit inquiry');
  }

  if (!result?.success) {
    throw new Error(result?.error || 'Failed to submit inquiry');
  }

  return result;
}
