import { describe, expect, it } from "vite-plus/test";
import { isSignupClosed } from "./signups.ts";

describe("isSignupClosed", () => {
  it("recognises Supabase's closed sign-up errors", () => {
    expect(isSignupClosed({ code: "otp_disabled", message: "Signups not allowed for otp" })).toBe(
      true,
    );
    expect(isSignupClosed({ code: "signup_disabled", message: "Signups not allowed" })).toBe(true);
    expect(isSignupClosed({ message: "Signups not allowed for otp" })).toBe(true);
  });

  it("leaves other errors alone", () => {
    expect(
      isSignupClosed({ code: "over_email_send_rate_limit", message: "Email rate limit exceeded" }),
    ).toBe(false);
  });
});
