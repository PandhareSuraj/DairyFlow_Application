import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Gift, Loader2 } from 'lucide-react';

interface EnterReferralModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  onSuccess?: () => void;
}

export function EnterReferralModal({ open, onOpenChange, customerId, onSuccess }: EnterReferralModalProps) {
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if customer already has a referral
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('id')
        .eq('referred_customer_id', customerId)
        .maybeSingle();

      if (existingReferral) {
        toast({
          title: "Already referred",
          description: "You've already been referred by someone",
          variant: "destructive",
        });
        return;
      }

      // Find the referrer by code
      const { data: referrer, error: referrerError } = await supabase
        .from('customers')
        .select('id, name')
        .eq('referral_code', referralCode.toUpperCase())
        .single();

      if (referrerError || !referrer) {
        toast({
          title: "Invalid code",
          description: "Referral code not found. Please check and try again.",
          variant: "destructive",
        });
        return;
      }

      // Check if trying to refer themselves
      if (referrer.id === customerId) {
        toast({
          title: "Invalid referral",
          description: "You cannot use your own referral code",
          variant: "destructive",
        });
        return;
      }

      // Create the referral
      const { error: insertError } = await supabase
        .from('referrals')
        .insert({
          referrer_customer_id: referrer.id,
          referred_customer_id: customerId,
          status: 'pending',
        });

      if (insertError) {
        throw insertError;
      }

      toast({
        title: "Success!",
        description: `You've been referred by ${referrer.name}! Complete your first order to earn bonus points.`,
      });

      onOpenChange(false);
      setReferralCode('');
      onSuccess?.();
    } catch (error) {
      console.error('Error applying referral code:', error);
      toast({
        title: "Error",
        description: "Failed to apply referral code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-5 w-5 text-primary" />
            <DialogTitle>Enter Referral Code</DialogTitle>
          </div>
          <DialogDescription>
            Have a referral code? Enter it to get 100 bonus points on your first order!
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="referralCode">Referral Code</Label>
            <Input
              id="referralCode"
              placeholder="Enter code..."
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              className="font-mono tracking-wider text-center"
              maxLength={8}
              required
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">What you'll get:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>100 bonus points on your first order</li>
              <li>Your referrer gets 500 points</li>
              <li>Can only be used once per account</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                'Apply Code'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
