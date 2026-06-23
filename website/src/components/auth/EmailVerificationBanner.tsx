import React from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEmailVerification } from '@/hooks/useEmailVerification';

interface EmailVerificationBannerProps {
  email: string;
}

export const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({ email }) => {
  const { t } = useTranslation('auth');
  const { isResending, cooldownRemaining, canResend, resendVerificationEmail } = useEmailVerification(email);

  return (
    <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-2 bg-warning/20 rounded-full">
          <AlertTriangle className="h-5 w-5 text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {t('emailVerification.title')}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t('emailVerification.description')}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={resendVerificationEmail}
              disabled={!canResend}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
              {cooldownRemaining > 0
                ? t('emailVerification.waitMessage', { seconds: cooldownRemaining })
                : t('emailVerification.resendButton')}
            </Button>
            <span className="text-xs text-muted-foreground">
              {email}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
