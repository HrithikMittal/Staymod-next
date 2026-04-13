"use client";

import { useClerk, useSignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { OtpInput } from "./otp-input";

type SignUpStep = "details" | "otp";

export function CustomSignUpForm() {
  const { setActive } = useClerk();
  const { fetchStatus, signUp } = useSignUp();
  const router = useRouter();
  const isReady = fetchStatus === "idle" && Boolean(signUp);

  const [step, setStep] = useState<SignUpStep>("details");
  const [emailAddress, setEmailAddress] = useState("");
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isReady || !signUp) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const createAttempt = await signUp.create({ emailAddress });
      if (createAttempt.error) {
        setError(createAttempt.error.message);
        return;
      }

      const sendOtpAttempt = await signUp.verifications.sendEmailCode();
      if (sendOtpAttempt.error) {
        setError(sendOtpAttempt.error.message);
        return;
      }

      setResendCooldown(30);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setIsSubmitting(false);
    }
  }



  async function handleResendOtp() {
    if (!isReady || !signUp || resendCooldown > 0) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const resendAttempt = await signUp.verifications.sendEmailCode();
      if (resendAttempt.error) {
        setError(resendAttempt.error.message);
        return;
      }

      setResendCooldown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend OTP.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isReady || !signUp) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const verification = await signUp.verifications.verifyEmailCode({ code: otp });
      if (verification.error) {
        setError(verification.error.message);
        return;
      }

      if (signUp.status !== "complete" || !signUp.createdSessionId) {
        const missing = signUp.missingFields.join(", ");
        const unverified = signUp.unverifiedFields.join(", ");
        const details = [missing ? `missing: ${missing}` : "", unverified ? `unverified: ${unverified}` : ""]
          .filter(Boolean)
          .join(" | ");
        setError(details ? `Sign-up is not complete yet (${details}).` : "Sign-up is not complete yet.");
        return;
      }

      await setActive({ session: signUp.createdSessionId });
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return step === "details" ? (
    <form className="w-full space-y-4" onSubmit={handleCreateAccount}>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          value={emailAddress}
          onChange={(event) => setEmailAddress(event.target.value)}
          placeholder="you@company.com"
          required
        />
      </div>
      <div className="space-y-2">
        <div
          id="clerk-captcha"
          className="min-h-10 rounded-md border border-dashed border-border/70 px-2 py-1"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={!isReady || isSubmitting}>
        {isSubmitting ? "Sending OTP..." : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="text-foreground underline underline-offset-4" href="/sign-in">
          Sign in
        </Link>
      </p>
    </form>
  ) : (
    <form className="w-full space-y-4" onSubmit={handleVerifyOtp}>
      <div className="space-y-2">
        <Label>Email OTP</Label>
        <OtpInput value={otp} onChange={setOtp} disabled={isSubmitting} />
        <p className="text-xs text-muted-foreground">
          We sent a verification code to {emailAddress}.
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={!isReady || isSubmitting || otp.length !== 6}>
        {isSubmitting ? "Verifying..." : "Verify OTP"}
      </Button>
      <Button
        className="w-full"
        type="button"
        variant="outline"
        disabled={isSubmitting || resendCooldown > 0}
        onClick={handleResendOtp}
      >
        {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
      </Button>
      <Button
        className="w-full"
        type="button"
        variant="ghost"
        disabled={isSubmitting}
        onClick={() => {
          setStep("details");
          setOtp("");
          setError(null);
        }}
      >
        Change email
      </Button>
    </form>
  );
}
