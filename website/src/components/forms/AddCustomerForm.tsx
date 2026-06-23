import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import LocationPicker from '@/components/map/LocationPicker';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { FormErrorSummary } from '@/components/ui/form-error-summary';

// Phone validation (Indian format)
const phoneRegex = /^(\+91[-\s]?)?[6-9]\d{9}$/;

interface AddCustomerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerAdded?: () => void;
}

type AddCustomerFormData = {
  name: string;
  phone: string;
  email?: string;
  address: string;
  area?: string;
  birthday?: string;
  anniversaryDate?: string;
  latitude?: number | null;
  longitude?: number | null;
  location_notes?: string;
};

export const AddCustomerForm = ({ isOpen, onClose, onCustomerAdded }: AddCustomerFormProps) => {
  const { t } = useTranslation(['dairy', 'common']);
  const { user } = useAuth();
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Create translated validation schema
  const addCustomerSchema = useMemo(() => z.object({
    name: z.string().trim().min(2, t('common:validation.minLength', { min: 2 })).max(100, t('common:validation.maxLength', { max: 100 })),
    phone: z.string().trim().regex(phoneRegex, t('common:validation.invalidPhone')),
    email: z.string().trim().email(t('common:validation.invalidEmail')).max(255, t('common:validation.maxLength', { max: 255 })).optional().or(z.literal('')),
    address: z.string().trim().min(5, t('common:validation.minLength', { min: 5 })).max(500, t('common:validation.maxLength', { max: 500 })),
    area: z.string().trim().max(100, t('common:validation.maxLength', { max: 100 })).optional(),
    birthday: z.string().optional().refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      return date <= new Date();
    }, t('common:validation.pastDate')),
    anniversaryDate: z.string().optional().refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      return date <= new Date();
    }, t('common:validation.pastDate')),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    location_notes: z.string().max(500, t('common:validation.maxLength', { max: 500 })).optional(),
  }), [t]);

  const form = useForm<AddCustomerFormData>({
    resolver: zodResolver(addCustomerSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      area: '',
      birthday: '',
      anniversaryDate: '',
      latitude: null,
      longitude: null,
      location_notes: '',
    },
  });

  // Password strength checker with translations
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score, label: t('common:validation.passwordStrength.weak'), color: 'bg-destructive' };
    if (score <= 4) return { score, label: t('common:validation.passwordStrength.medium'), color: 'bg-warning' };
    return { score, label: t('common:validation.passwordStrength.strong'), color: 'bg-success' };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (data: AddCustomerFormData) => {
    if (createAccount && !data.email) {
      toast({
        title: t('common:error'),
        description: t('forms.emailRequiredForAccount'),
        variant: "destructive"
      });
      return;
    }
    
    if (createAccount && !password) {
      toast({
        title: t('common:error'),
        description: t('forms.passwordRequired'),
        variant: "destructive"
      });
      return;
    }

    if (createAccount && password.length < 8) {
      toast({
        title: t('common:error'),
        description: t('forms.passwordMinLength'),
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      if (!user?.dairyId) {
        throw new Error(t('forms.noDairyError'));
      }

      const dairyId = user.dairyId;

      if (createAccount) {
        const { data: response, error: edgeFunctionError } = await supabase.functions.invoke('create-user-account', {
          body: {
            email: data.email,
            password: password,
            name: data.name,
            phone: data.phone,
            role: 'customer',
            dairy_id: dairyId,
            address: data.address,
            area: data.area,
            latitude: data.latitude,
            longitude: data.longitude,
            location_notes: data.location_notes,
            birthday: data.birthday || null
          }
        });

        if (edgeFunctionError) throw edgeFunctionError;

        toast({
          title: t('forms.customerAccountCreated'),
          description: t('forms.customerCredentialsMessage', { name: data.name, email: data.email }),
        });
      } else {
        const { error } = await supabase
          .from('customers')
          .insert({
            dairy_id: dairyId,
            name: data.name,
            phone: data.phone,
            email: data.email || null,
            address: data.address,
            area: data.area || null,
            latitude: data.latitude,
            longitude: data.longitude,
            location_notes: data.location_notes || null,
            birthday: data.birthday || null,
            anniversary_date: new Date().toISOString().split('T')[0]
          });

        if (error) throw error;

        toast({
          title: t('forms.customerAddedSuccess'),
          description: t('forms.customerAddedMessage', { name: data.name }),
        });
      }
      
      form.reset();
      setCreateAccount(false);
      setPassword('');
      
      onCustomerAdded?.();
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

  const handleLocationSelect = (lat: number, lng: number) => {
    form.setValue('latitude', lat);
    form.setValue('longitude', lng);
    toast({
      title: t('forms.locationSelected'),
      description: t('forms.locationSelectedMessage'),
    });
  };

  const latitude = form.watch('latitude');
  const longitude = form.watch('longitude');
  const address = form.watch('address');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('forms.addNewCustomer')}</DialogTitle>
          <DialogDescription>
            {t('forms.addCustomerDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">{t('forms.customerDetailsTab')}</TabsTrigger>
              <TabsTrigger value="location">{t('forms.locationMapTab')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4">
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormErrorSummary errors={form.formState.errors} title={t('common:validation.fixErrors')} />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('forms.customerName')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('forms.customerNamePlaceholder')} />
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
                        <FormLabel>{t('forms.emailOptional')} {createAccount && <span className="text-destructive">*</span>}</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder={t('forms.emailPlaceholder')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="createAccount" 
                      checked={createAccount}
                      onCheckedChange={(checked) => setCreateAccount(checked as boolean)}
                    />
                    <Label htmlFor="createAccount" className="cursor-pointer font-medium">
                      {t('forms.createLoginAccount')}
                    </Label>
                  </div>
                  
                  {createAccount && (
                    <div className="space-y-3 pl-6">
                      <div className="space-y-2">
                        <Label htmlFor="password">{t('forms.password')}</Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={t('forms.passwordPlaceholder')}
                        />
                      </div>
                      {password && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all ${passwordStrength.color}`}
                                style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">{passwordStrength.label}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className={password.length >= 8 ? 'text-success' : ''}>
                              {password.length >= 8 ? <CheckCircle2 className="inline h-3 w-3" /> : <AlertCircle className="inline h-3 w-3" />} {t('forms.chars8Plus')}
                            </span>
                            <span className={/[A-Z]/.test(password) ? 'text-success' : ''}>
                              {/[A-Z]/.test(password) ? <CheckCircle2 className="inline h-3 w-3" /> : <AlertCircle className="inline h-3 w-3" />} {t('forms.uppercase')}
                            </span>
                            <span className={/[0-9]/.test(password) ? 'text-success' : ''}>
                              {/[0-9]/.test(password) ? <CheckCircle2 className="inline h-3 w-3" /> : <AlertCircle className="inline h-3 w-3" />} {t('forms.number')}
                            </span>
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {t('forms.customerLoginInfo')}
                      </p>
                    </div>
                  )}
                </div>
              
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('forms.areaLocality')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('forms.areaLocalityPlaceholder')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birthday"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('forms.birthdayOptional')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="date" 
                            max={new Date().toISOString().split('T')[0]}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('forms.birthdayInfo')}
                        </p>
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
                      <FormLabel>{t('forms.address')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder={t('forms.addressPlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {latitude && longitude && (
                  <div className="p-3 bg-muted rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <p className="text-sm">
                      <strong>{t('forms.locationSet')}:</strong> {latitude.toFixed(6)}, {longitude.toFixed(6)}
                    </p>
                  </div>
                )}
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={onClose}>
                    {t('common:cancel')}
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? t('forms.adding') : t('addCustomer')}
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="location" className="space-y-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="location_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('forms.locationNotes')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('forms.locationNotesPlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <LocationPicker
                  onLocationSelect={handleLocationSelect}
                  initialLocation={latitude && longitude ? 
                    { lat: latitude, lng: longitude } : undefined
                  }
                  customerAddress={address}
                />
              </div>
            </TabsContent>
          </Tabs>
        </Form>
      </DialogContent>
    </Dialog>
  );
};