import React, { Component, ReactNode, useState, useCallback, useRef } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import i18n from '@/i18n';
import { cn } from '@/lib/utils';
import { trackError } from '@/lib/error-tracking';
import { toast } from '@/hooks/use-toast';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error('Error caught by boundary:', error, errorInfo);
    trackError({
      type: 'runtime',
      message: error.message,
      stack: error.stack,
      context: { componentStack: errorInfo.componentStack || '' }
    });
    toast({
      variant: 'destructive',
      title: i18n.t('errors.sectionFailed', { ns: 'common', defaultValue: 'A section failed to load' }),
      description: i18n.t('errors.sectionFailedDesc', { ns: 'common', defaultValue: 'You can retry it using the button in place.' }),
    });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null }, () => {
      window.location.reload();
    });
  };

   private t(key: string): string {
     return i18n.t(key, { ns: 'common' });
   }
 
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (React.isValidElement(this.props.fallback)) {
          return React.cloneElement(this.props.fallback as React.ReactElement<any>, {
            error: this.state.error,
            resetError: this.handleRetry,
          });
        }
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full shadow-medium">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">{this.t('errors.somethingWentWrong')}</CardTitle>
               <CardDescription>
                 {this.t('errors.unexpectedError')}
               </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="p-3 bg-muted rounded-lg text-sm font-mono text-destructive overflow-auto max-h-32">
                  {this.state.error.message}
                </div>
              )}
              <div className="flex gap-3">
                <Button 
                  onClick={this.handleRetry} 
                  className="flex-1"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                   {this.t('errors.tryAgain')}
                </Button>
                <Button 
                  onClick={this.handleGoHome} 
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="h-4 w-4 mr-2" />
                   {this.t('errors.goHome')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Smaller inline error boundary for component-level errors
export function ComponentErrorFallback({ 
  error, 
  resetError,
   title
}: { 
  error?: Error; 
  resetError?: () => void;
  title?: string;
}) {
  const [cooldown, setCooldown] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleRetry = useCallback(() => {
    if (cooldown || !resetError) return;
    setCooldown(true);
    resetError();
    timeoutRef.current = setTimeout(() => setCooldown(false), 3000);
  }, [cooldown, resetError]);

  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive mb-3" />
         <p className="font-medium text-foreground">{title || i18n.t('errors.failedToLoad', { ns: 'common' })}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {error?.message || "An unexpected error occurred"}
        </p>
        {resetError && (
          <Button 
            onClick={handleRetry} 
            variant="outline" 
            size="sm" 
            className="mt-4"
            disabled={cooldown}
          >
            <RefreshCw className={cn("h-3 w-3 mr-2", cooldown && "animate-spin")} />
             {cooldown ? i18n.t('errors.retrying', { ns: 'common', defaultValue: 'Retrying…' }) : i18n.t('errors.retry', { ns: 'common' })}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default ErrorBoundary;
