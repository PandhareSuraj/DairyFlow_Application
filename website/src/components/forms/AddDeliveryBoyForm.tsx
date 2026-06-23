import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

// Phone validation (Indian format)
const phoneRegex = /^(\+91[-\s]?)?[6-9]\d{9}$/;

interface AddDeliveryBoyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onDeliveryBoyAdded?: () => void;
}

type DeliveryBoyFormData = {
  name: string;
  phone: string;
  email?: string;
  address?: string;
};

export const AddDeliveryBoyForm = ({ isOpen, onClose, onDeliveryBoyAdded }: AddDeliveryBoyFormProps) => {
  const { t } = useTranslation(['dairy', 'common']);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Create translated validation schema
  const deliveryBoySchema = useMemo(() => z.object({
    name: z.string().trim().min(2, t('common:validation.minLength', { min: 2 })).max(100, t('common:validation.maxLength', { max: 100 })),
    phone: z.string().trim().regex(phoneRegex, t('common:validation.invalidPhone')),
    email: z.string().trim().email(t('common:validation.invalidEmail')).max(255, t('common:validation.maxLength', { max: 255 })).optional().or(z.literal('')),
    address: z.string().trim().max(500, t('common:validation.maxLength', { max: 500 })).optional(),
  }), [t]);

  const form = useForm<DeliveryBoyFormData>({
    resolver: zodResolver(deliveryBoySchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: ''
    },
  });

  const handleSubmit = async (data: DeliveryBoyFormData) => {
    setLoading(true);
    
    try {
      const { data: dairies, error: dairiesError } = await supabase
        .from('dairies')
        .select('id')
        .limit(1);

      if (dairiesError) throw dairiesError;
      if (!dairies || dairies.length === 0) {
        throw new Error(t('forms.noDairyFound'));
      }

      const { error } = await supabase
        .from('delivery_boys')
        .insert({
          dairy_id: dairies[0].id,
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          address: data.address || null
        });

      if (error) throw error;

      toast({
        title: t('forms.deliveryBoyAddedSuccess'),
        description: t('forms.deliveryBoyAddedMessage', { name: data.name }),
      });
      
      form.reset();
      onDeliveryBoyAdded?.();
      onClose();
    } catch (error) {
      toast({
        title: t('common:error'),
        description: error instanceof Error ? error.message : t('common:error'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('forms.addNewDeliveryBoy')}</DialogTitle>
          <DialogDescription>
            {t('forms.addDeliveryBoyDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('forms.fullName')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('forms.fullNamePlaceholder')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forms.phoneNumber')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('forms.phoneNumberPlaceholder')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forms.emailOptional')} ({t('common:optional', 'Optional')})</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder={t('forms.emailPlaceholder')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('forms.addressOptional')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder={t('forms.deliveryBoyAddressPlaceholder')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common:cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t('forms.adding') : t('addDeliveryBoy')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};