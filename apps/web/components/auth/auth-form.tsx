"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
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
import { toast } from "sonner";

type AuthMode = "login" | "register";

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (result) => {
      toast.success(`OTP sent to ${result.email}.`);
      setOtpStep(true);
      setCountdown(result.expiresInSeconds);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const verifyRegistrationMutation = trpc.auth.verifyRegistration.useMutation({
    onSuccess: (user) => {
      toast.success(`Welcome, ${user.fullName}.`);
      router.push("/dashboard");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (user) => {
      toast.success(`Signed in as ${user.fullName}.`);
      router.push("/dashboard");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isRegister = mode === "register";
  const isPending =
    registerMutation.isPending || verifyRegistrationMutation.isPending || loginMutation.isPending;

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

    if (isRegister) {
      if (otpStep) {
        await verifyRegistrationMutation.mutateAsync({
          email,
          otp,
        });
        return;
      }

      await registerMutation.mutateAsync({
        fullName,
        email,
        password,
      });
      return;
    }

    await loginMutation.mutateAsync({
      email,
      password,
    });
  }

  async function handleResendOtp() {
    await registerMutation.mutateAsync({
      fullName,
      email,
      password,
    });
  }

  return (
    <Card className="border-stone-800 bg-black/45 py-0 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <CardHeader className="space-y-3 border-b border-stone-800 px-8 py-8">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">
          {isRegister ? "Join the citadel" : "Return to the realm"}
        </p>
        <CardTitle className="text-3xl text-stone-50">
          {isRegister ? "Create your RavenForm account" : "Sign in to RavenForm"}
        </CardTitle>
        <CardDescription className="text-base leading-7 text-stone-400">
          {isRegister
            ? otpStep
              ? "Enter the 6-digit OTP sent to your email. The code expires in 60 seconds."
              : "Email/password auth now requires OTP verification before the account is created."
            : "Use the verified account credentials you created in this environment."}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 py-8">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {isRegister && !otpStep ? (
            <label className="block space-y-2">
              <span className="text-sm text-stone-300">Full name</span>
              <Input
                required
                minLength={2}
                maxLength={80}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="h-11 border-stone-700 bg-stone-950/60 text-stone-100"
                placeholder="Arya Stark"
              />
            </label>
          ) : null}
          {!otpStep ? (
            <>
              <label className="block space-y-2">
                <span className="text-sm text-stone-300">Email</span>
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 border-stone-700 bg-stone-950/60 text-stone-100"
                  placeholder="demo@ravenform.app"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-stone-300">Password</span>
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
          ) : (
            <>
              <label className="block space-y-2">
                <span className="text-sm text-stone-300">Email</span>
                <Input
                  value={email}
                  disabled
                  className="h-11 border-stone-700 bg-stone-950/40 text-stone-300"
                />
              </label>
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
            </>
          )}
          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            className="h-11 w-full bg-amber-500 text-black hover:bg-amber-400"
          >
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {isRegister ? (otpStep ? "Verify OTP" : "Send OTP") : "Sign in"}
          </Button>
        </form>
        {isRegister && otpStep ? (
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
          {isRegister ? "Already have an account?" : "Need an account?"}{" "}
          <Link
            href={isRegister ? "/login" : "/register"}
            className="font-medium text-amber-300 transition hover:text-amber-200"
          >
            {isRegister ? "Sign in" : "Register"}
          </Link>
        </p>
        {!isRegister ? (
          <p className="mt-3 text-sm text-stone-400">
            Forgot your password?{" "}
            <Link
              href="/forgot-password"
              className="font-medium text-amber-300 transition hover:text-amber-200"
            >
              Reset with OTP
            </Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
