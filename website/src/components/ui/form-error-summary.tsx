import { AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import type { FieldErrors } from 'react-hook-form';

interface FormErrorSummaryProps {
  errors: FieldErrors;
  title?: string;
}

export function FormErrorSummary({ errors, title = 'Please fix the following errors:' }: FormErrorSummaryProps) {
  const errorList = Object.entries(errors)
    .filter(([_, err]) => err?.message)
    .map(([field, err]) => ({
      field,
      message: (err as { message?: string })?.message || 'Invalid value'
    }));

  if (errorList.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-4 mt-2 space-y-1">
          {errorList.map(({ field, message }) => (
            <li key={field} className="text-sm">{message}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
