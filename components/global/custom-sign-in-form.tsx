"use client";

import { useAuth, useClerk, useSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { OtpInput } from "./otp-input";

type SignInStep = "details" | "otp";

function isAlreadySignedInClerkError(message: string): boolean {
  return /already signed in/i.test(message);
}

export function CustomSignInForm() {
  const { setActive, signOut } = useClerk();
  const { fetchStatus, signIn } = useSignIn();
  const { isLoaded: authLoaded, userId } = useAuth();
  const router = useRouter();
  const isReady = fetchStatus === "idle" && Boolean(signIn);

  const [step, setStep] = useState<SignInStep>("details");
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

  /** When the session loads after hydration, leave the sign-in page. */
  useEffect(() => {
    if (!authLoaded || !userId) return;
    router.replace("/");
  }, [authLoaded, userId, router]);

  /**
   * Clerk sometimes reports "already signed in" while the browser client has no session
   * (stale cookies / prod cache). Signing out forces a full session reset.
   */
  async function recoverStaleSessionAfterAlreadySignedInError() {
    setIsSubmitting(true);
    try {
      await signOut({ redirectUrl: "/sign-in" });
    } catch {
      window.location.assign("/sign-in");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isReady || !signIn) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const startAttempt = await signIn.create({ identifier: emailAddress });
      if (startAttempt.error) {
        if (isAlreadySignedInClerkError(startAttempt.error.message)) {
          await recoverStaleSessionAfterAlreadySignedInError();
          return;
        }
        setError(startAttempt.error.message);
        return;
      }

      const sendOtpAttempt = await signIn.emailCode.sendCode();
      if (sendOtpAttempt.error) {
        if (isAlreadySignedInClerkError(sendOtpAttempt.error.message)) {
          await recoverStaleSessionAfterAlreadySignedInError();
          return;
        }
        setError(sendOtpAttempt.error.message);
        return;
      }

      setResendCooldown(30);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start sign-in.");
    } finally {
      setIsSubmitting(false);
    }
  }



  async function handleResendOtp() {
    if (!isReady || !signIn || resendCooldown > 0) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const resendAttempt = await signIn.emailCode.sendCode();
      if (resendAttempt.error) {
        if (isAlreadySignedInClerkError(resendAttempt.error.message)) {
          await recoverStaleSessionAfterAlreadySignedInError();
          return;
        }
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
    if (!isReady || !signIn) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const verifyAttempt = await signIn.emailCode.verifyCode({ code: otp });
      if (verifyAttempt.error) {
        if (isAlreadySignedInClerkError(verifyAttempt.error.message)) {
          await recoverStaleSessionAfterAlreadySignedInError();
          return;
        }
        setError(verifyAttempt.error.message);
        return;
      }

      if (signIn.status !== "complete" || !signIn.createdSessionId) {
        setError("Sign-in is not complete yet. Please try again.");
        return;
      }

      await setActive({ session: signIn.createdSessionId });
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return step === "details" ? (
    <form className="w-full space-y-4" onSubmit={handleSendOtp}>
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          value={emailAddress}
          onChange={(event) => setEmailAddress(event.target.value)}
          placeholder="you@company.com"
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={!isReady || isSubmitting}>
        {isSubmitting ? "Sending OTP..." : "Send OTP"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link className="text-foreground underline underline-offset-4" href="/sign-up">
          Sign up
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
