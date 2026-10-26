/**
 * True when Supabase refused to create an account because "Allow new users to sign up"
 * is off. Existing accounts still get their login email.
 */
export function isSignupClosed(error: { code?: string; message: string }): boolean {
  return (
    error.code === "signup_disabled" ||
    error.code === "otp_disabled" ||
    /signups not allowed/i.test(error.message)
  );
}
