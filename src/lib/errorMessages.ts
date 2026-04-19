/**
 * User-friendly error message translations
 * Maps technical error messages to human-readable explanations
 */

const errorMap: Record<string, string> = {
  // Authentication errors
  'invalid login credentials': 'The email or password you entered is incorrect. Please check your credentials and try again.',
  'invalid email or password': 'The email or password you entered is incorrect. Please check your credentials and try again.',
  'email not confirmed': 'Please verify your email address before logging in. Check your inbox for the verification link.',
  'user already registered': 'An account with this email already exists. Please login instead.',
  'already exists': 'An account with this email already exists. Please login instead.',
  'email rate limit exceeded': 'Too many attempts. Please wait a few minutes before trying again.',
  'over_email_send_rate_limit': 'Too many attempts. Please wait a few minutes before trying again.',
  
  // Session errors
  'authsessionmissingerror': 'Your session has expired. Please log in again.',
  'session expired': 'Your session has expired. Please log in again.',
  'refresh_token_not_found': 'Your session has expired. Please log in again.',
  'invalid refresh token': 'Your session has expired. Please log in again.',
  'age finding error': 'Your session needs to be refreshed. Please reload the page.',
  
  // Network errors
  'failed to fetch': 'Connection error. Please check your internet and try again.',
  'network error': 'Connection error. Please check your internet and try again.',
  'networkerror': 'Connection error. Please check your internet and try again.',
  'timeout': 'The request took too long. Please try again.',
  
  // Edge function errors
  'failed to send a request to the edge function': 'We couldn\'t process your request. Please check your internet connection and try again.',
  'edge function': 'Something went wrong while processing your request. Please try again in a moment.',
  'functionsrelayerror': 'The service is temporarily unavailable. Please try again in a few minutes.',
  'function_not_found': 'This feature is temporarily unavailable. Please try again later.',
  'non-2xx status code': 'The request couldn\'t be completed. Please try again.',
  'functions relay error': 'We couldn\'t connect to the server. Please check your internet and try again.',
  
  // Password errors
  'password should be at least': 'Password must be at least 8 characters long.',
  'passwords do not match': 'The passwords you entered do not match. Please try again.',
  
  // Verification errors
  'invalid or expired verification code': 'This verification code is invalid or has expired. Please request a new one.',
  'otp expired': 'This verification code has expired. Please request a new one.',
  
  // Rate limiting
  'rate limit': 'Too many attempts. Please wait a moment before trying again.',
  'too many requests': 'Too many attempts. Please wait a moment before trying again.',
  
  // Generic errors
  'something went wrong': 'Something went wrong. Please try again or contact support if the problem persists.',
  'internal server error': 'We encountered a server issue. Please try again in a moment.',
  'bad request': 'There was a problem with your request. Please check your information and try again.',
  'not found': 'The requested resource was not found.',
  'unauthorized': 'You need to be logged in to access this feature.',
  'forbidden': 'You do not have permission to perform this action.',
};

/**
 * Converts technical error messages to user-friendly messages
 */
export const getUserFriendlyError = (error: Error | string | unknown): string => {
  let errorText = '';
  
  if (typeof error === 'string') {
    errorText = error;
  } else if (error instanceof Error) {
    errorText = error.message;
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorText = String((error as { message: unknown }).message);
  } else {
    return 'Something went wrong. Please try again or contact support.';
  }
  
  const lowerError = errorText.toLowerCase();
  
  // Check for matching error patterns
  for (const [pattern, friendlyMessage] of Object.entries(errorMap)) {
    if (lowerError.includes(pattern.toLowerCase())) {
      return friendlyMessage;
    }
  }
  
  // Return original message if it's already user-friendly (doesn't contain technical terms)
  const technicalTerms = ['error', 'exception', 'null', 'undefined', 'object', 'function', 'stack', 'trace'];
  const hasNoTechnicalTerms = !technicalTerms.some(term => lowerError.includes(term));
  
  if (hasNoTechnicalTerms && errorText.length > 0 && errorText.length < 200) {
    return errorText;
  }
  
  return 'Something went wrong. Please try again or contact support.';
};

/** Safely extract a string message from an unknown thrown value. */
export const getErrMsg = (err: unknown, fallback = 'Something went wrong'): string => {
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message: unknown }).message;
    return typeof m === 'string' ? m : fallback;
  }
  return fallback;
};

/** Safely extract an error code (e.g. Postgrest code) from unknown. */
export const getErrCode = (err: unknown): string | undefined => {
  if (err && typeof err === 'object' && 'code' in err) {
    const c = (err as { code: unknown }).code;
    return typeof c === 'string' ? c : undefined;
  }
  return undefined;
};
