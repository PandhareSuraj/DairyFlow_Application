import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const COOLDOWN_SECONDS = 60;
const COOLDOWN_KEY = 'email_verification_cooldown';

export const useEmailVerification = (email: string) => {
  const { t } = useTranslation('auth');
  const [isResending, setIsResending] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Check for existing cooldown on mount
  useEffect(() => {
    const savedCooldown = localStorage.getItem(COOLDOWN_KEY);
    if (savedCooldown) {
      const endTime = parseInt(savedCooldown, 10);
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      if (remaining > 0) {
        setCooldownRemaining(remaining);
      } else {
        localStorage.removeItem(COOLDOWN_KEY);
      }
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          localStorage.removeItem(COOLDOWN_KEY);
        }
        return Math.max(0, next);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const resendVerificationEmail = useCallback(async () => {
    if (cooldownRemaining > 0 || isResending || !email) return;

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        toast.error(t('unexpectedError'));
        console.error('Resend verification error:', error);
        return;
      }

      // Start cooldown
      const endTime = Date.now() + COOLDOWN_SECONDS * 1000;
      localStorage.setItem(COOLDOWN_KEY, endTime.toString());
      setCooldownRemaining(COOLDOWN_SECONDS);

      toast.success(t('emailVerification.emailSent'), {
        description: t('emailVerification.emailSentDescription', { email })
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      toast.error(t('unexpectedError'));
    } finally {
      setIsResending(false);
    }
  }, [email, cooldownRemaining, isResending, t]);

  return {
    isResending,
    cooldownRemaining,
    canResend: cooldownRemaining === 0 && !isResending,
    resendVerificationEmail
  };
};
