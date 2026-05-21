"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { trpc } from "~/trpc/client";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const requestOtpMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: (result) => {
      toast.success(`Password reset OTP sent to ${result.email}.`);
      setOtpStep(true);
      setCountdown(result.expiresInSeconds);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetPasswordMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Password updated. Sign in with the new password.");
      router.push("/login");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isPending = requestOtpMutation.isPending || resetPasswordMutation.isPending;

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [countdown]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!otpStep) {
      await requestOtpMutation.mutateAsync({ email });
      return;
    }

    await resetPasswordMutation.mutateAsync({
      email,
      otp,
      password,
    });
  }

  async function handleResendOtp() {
    await requestOtpMutation.mutateAsync({ email });
  }

  return (
    <Card className="border-stone-800 bg-black/45 py-0 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <CardHeader className="space-y-3 border-b border-stone-800 px-8 py-8">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">Recover access</p>
        <CardTitle className="text-3xl text-stone-50">Reset your RavenForm password</CardTitle>
        <CardDescription className="text-base leading-7 text-stone-400">
          {!otpStep
            ? "Enter the registered email first. If the account exists, an OTP will be sent there."
            : "Enter the OTP and choose the replacement password. Existing sessions will be cleared."}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 py-8">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm text-stone-300">Email</span>
            <Input
              required
              type="email"
              value={email}
              disabled={otpStep}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 border-stone-700 bg-stone-950/60 text-stone-100"
              placeholder="you@example.com"
            />
          </label>
          {otpStep ? (
            <>
              <label className="block space-y-2">
                <span className="text-sm text-stone-300">OTP</span>
                <Input
                  required
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-11 border-stone-700 bg-stone-950/60 text-stone-100 tracking-[0.4em]"
                  placeholder="123456"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-stone-300">New password</span>
                <Input
                  required
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 border-stone-700 bg-stone-950/60 text-stone-100"
                  placeholder="At least 8 characters"
                />
              </label>
            </>
          ) : null}
          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            className="h-11 w-full bg-amber-500 text-black hover:bg-amber-400"
          >
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {otpStep ? "Reset password" : "Send OTP"}
          </Button>
        </form>
        {otpStep ? (
          <div className="mt-4 flex items-center justify-between text-sm text-stone-400">
            <span>{countdown > 0 ? `OTP expires in ${countdown}s` : "OTP expired. Request a new one."}</span>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={countdown > 0 || isPending}
              className="font-medium text-amber-300 transition hover:text-amber-200 disabled:cursor-not-allowed disabled:text-stone-600"
            >
              Resend OTP
            </button>
          </div>
        ) : null}
        <p className="mt-6 text-sm text-stone-400">
          Back to{" "}
          <Link href="/login" className="font-medium text-amber-300 transition hover:text-amber-200">
            sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
