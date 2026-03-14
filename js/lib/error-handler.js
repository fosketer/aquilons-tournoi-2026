// js/lib/error-handler.js
// Centralized error handling with severity levels.

export const ErrorSeverity = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
};

/**
 * Log and handle an error consistently.
 * @param {Error} error
 * @param {string} context - Where the error occurred (e.g., "Bracket scan")
 * @param {string} [severity] - ErrorSeverity level
 */
export function handleError(error, context, severity = ErrorSeverity.WARNING) {
  const prefix = `[${context}]`;

  switch (severity) {
    case ErrorSeverity.CRITICAL:
      console.error(prefix, error.message || error, error);
      break;
    case ErrorSeverity.WARNING:
      console.warn(prefix, error.message || error, error);
      break;
    case ErrorSeverity.INFO:
      console.info(prefix, error.message || error);
      break;
  }
}
