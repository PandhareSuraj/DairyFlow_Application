import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { FormErrorSummary } from '@/components/ui/form-error-summary';

interface AddProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded?: () => void;
}

type AddProductFormData = {
  name: string;
  category: string;
  price: string;
  unit: string;
  stock: string;
  description?: string;
};

export const AddProductForm = ({ isOpen, onClose, onProductAdded }: AddProductFormProps) => {
  const { t } = useTranslation(['dairy', 'common']);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Create translated validation schema
  const addProductFormSchema = useMemo(() => z.object({
    name: z.string().trim().min(2, t('common:validation.minLength', { min: 2 })).max(100, t('common:validation.maxLength', { max: 100 })),
    category: z.string().min(1, t('common:validation.required')),
    price: z.string().min(1, t('common:validation.required')).refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      t('common:validation.positiveNumber')
    ),
    unit: z.string().min(1, t('common:validation.required')),
    stock: z.string().min(1, t('common:validation.required')).refine(
      (val) => !isNaN(parseInt(val)) && parseInt(val) >= 0,
      t('common:validation.stockNegative')
    ),
    description: z.string().max(500, t('common:validation.maxLength', { max: 500 })).optional(),
  }), [t]);

  const form = useForm<AddProductFormData>({
    resolver: zodResolver(addProductFormSchema),
    defaultValues: {
      name: '',
      category: '',
      price: '',
      unit: '',
      description: '',
      stock: ''
    },
  });

  const handleSubmit = async (data: AddProductFormData) => {
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
        .from('products')
        .insert({
          dairy_id: dairies[0].id,
          name: data.name,
          category: data.category,
          price: parseFloat(data.price),
          unit: data.unit,
          description: data.description || null,
          stock_quantity: parseInt(data.stock)
        });

      if (error) throw error;

      toast({
        title: t('forms.productAddedSuccess'),
        description: t('forms.productAddedMessage', { name: data.name }),
      });
      
      form.reset();
      onProductAdded?.();
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
          <DialogTitle>{t('forms.addNewProduct')}</DialogTitle>
          <DialogDescription>
            {t('forms.addProductDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormErrorSummary errors={form.formState.errors} title={t('common:validation.fixErrors')} />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('productName')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('forms.productNamePlaceholder')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('productCategory')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('forms.selectCategory')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="milk">{t('forms.categories.milk')}</SelectItem>
                        <SelectItem value="cheese">{t('forms.categories.cheese')}</SelectItem>
                        <SelectItem value="yogurt">{t('forms.categories.yogurt')}</SelectItem>
                        <SelectItem value="butter">{t('forms.categories.butter')}</SelectItem>
                        <SelectItem value="cream">{t('forms.categories.cream')}</SelectItem>
                        <SelectItem value="other">{t('forms.categories.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forms.priceInRupees')}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        step="0.01" 
                        min="0"
                        placeholder="0.00" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('productUnit')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('forms.selectUnit')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="liter">{t('forms.units.liter')}</SelectItem>
                        <SelectItem value="gallon">{t('forms.units.gallon')}</SelectItem>
                        <SelectItem value="kg">{t('forms.units.kg')}</SelectItem>
                        <SelectItem value="pound">{t('forms.units.pound')}</SelectItem>
                        <SelectItem value="piece">{t('forms.units.piece')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('forms.initialStockQuantity')}</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="number" 
                      min="0"
                      placeholder="0" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('forms.descriptionOptional')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder={t('forms.productDescriptionPlaceholder')} />
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
                {loading ? t('forms.adding') : t('addProduct')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};