interface ErrorEvent {
  type: 'runtime' | 'api' | 'auth' | 'unhandled';
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  timestamp: string;
  url: string;
}

const errorLog: ErrorEvent[] = [];
const MAX_LOG_SIZE = 100;

export function trackError(event: Omit<ErrorEvent, 'timestamp' | 'url'>) {
  const entry: ErrorEvent = {
    ...event,
    timestamp: new Date().toISOString(),
    url: window.location.href,
  };

  errorLog.push(entry);
  if (errorLog.length > MAX_LOG_SIZE) errorLog.shift();

  console.error(`[ErrorTracker:${entry.type}]`, entry.message, entry.context);
}

export function getErrorLog(): ErrorEvent[] {
  return [...errorLog];
}
