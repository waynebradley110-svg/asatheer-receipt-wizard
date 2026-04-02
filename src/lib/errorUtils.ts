/**
 * Maps database/API errors to safe, user-friendly messages.
 * Prevents leaking schema details, table names, and constraint info.
 */
export const getGenericError = (error: any, fallback?: string): string => {
  // Log full error for debugging (dev only)
  console.error('Operation error:', error);

  if (!error) return fallback || "An error occurred. Please try again.";

  const code = error?.code;
  const message = error?.message?.toLowerCase() || '';

  // Duplicate record
  if (code === '23505' || message.includes('duplicate') || message.includes('unique')) {
    return "This record already exists. Please check your input.";
  }

  // Foreign key violation
  if (code === '23503' || message.includes('foreign key') || message.includes('referenced')) {
    return "Related record not found. Please verify your selection.";
  }

  // Not null violation
  if (code === '23502' || message.includes('not-null')) {
    return "A required field is missing. Please fill in all required fields.";
  }

  // Check constraint violation
  if (code === '23514') {
    return "Invalid value provided. Please check your input.";
  }

  // Permission denied / RLS
  if (code === '42501' || message.includes('permission denied') || message.includes('row-level security')) {
    return "You don't have permission to perform this action.";
  }

  // Auth errors
  if (message.includes('invalid login') || message.includes('invalid credentials')) {
    return "Invalid email or password.";
  }

  if (message.includes('email already') || message.includes('user already')) {
    return "An account with this email already exists.";
  }

  if (message.includes('password')) {
    return "Password does not meet requirements. Please use at least 8 characters.";
  }

  // Network errors
  if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
    return "Network error. Please check your connection and try again.";
  }

  return fallback || "An error occurred. Please try again.";
};
