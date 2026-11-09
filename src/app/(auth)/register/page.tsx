"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { GoogleIcon } from "@/components/ui/icons";
import { signInWithGoogle } from "@/lib/firebase/auth";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Dynamic password criteria validation
  const rules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&#^_+=-]/.test(password),
  };

  const isPasswordValid = Object.values(rules).every(Boolean);

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setErrorMessage(null);

      const googleUser = await signInWithGoogle();
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(googleUser),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to sign up with Google.");
        return;
      }

      router.push(redirectPath);
      router.refresh();
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        console.error("Google registration error:", err);
        setErrorMessage(err.message || "Google sign-up failed. Please try again.");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isPasswordValid) {
      setErrorMessage("Please ensure your password meets all required security criteria.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phone: phone || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to create account.");
        return;
      }

      router.push(redirectPath);
      router.refresh();
    } catch {
      setErrorMessage("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm sm:max-w-md bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
      {/* Header & Logo */}
      <div className="text-center space-y-2 mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Store
        </Link>
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-rose-50 text-rose-900 mx-auto">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-neutral-900">
          Create an Account
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500">
          Join The Bling Corner for fast checkout and order tracking
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-5 flex items-start space-x-2 rounded-xl bg-red-50 p-3.5 text-xs sm:text-sm text-red-800 border border-red-200/80 animate-in fade-in"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* 1-Click Google Sign-In Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading || isLoading}
        isLoading={isGoogleLoading}
        className="w-full h-11 border-neutral-300 text-neutral-700 hover:bg-neutral-50 rounded-xl font-semibold text-xs sm:text-sm gap-2.5 shadow-sm transition-all"
      >
        <GoogleIcon className="h-4 w-4" />
        {isGoogleLoading ? "Connecting to Google..." : "Sign up with Google"}
      </Button>

      {/* Divider */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-200" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase">
          <span className="bg-white px-3 text-neutral-400 font-semibold tracking-wider">
            Or create with email
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="name"
          label="Full Name"
          type="text"
          placeholder="Pooja Sharma"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          id="email"
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          id="phone"
          label="WhatsApp / Phone (Optional)"
          type="tel"
          placeholder="9876543210"
          helperText="Used for delivery notifications and tracking updates."
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <div className="relative">
          <Input
            id="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-8 text-neutral-400 hover:text-neutral-700 focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Password Security Checklist */}
        {password.length > 0 && (
          <div className="rounded-xl bg-neutral-50 p-3 text-xs space-y-1.5 border border-neutral-200/60">
            <p className="font-semibold text-neutral-600 mb-1">Password Requirements:</p>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              <span className={`flex items-center ${rules.length ? "text-emerald-700" : "text-neutral-400"}`}>
                <CheckCircle2 className="h-3 w-3 mr-1 inline" /> At least 8 characters
              </span>
              <span className={`flex items-center ${rules.upper ? "text-emerald-700" : "text-neutral-400"}`}>
                <CheckCircle2 className="h-3 w-3 mr-1 inline" /> Uppercase letter
              </span>
              <span className={`flex items-center ${rules.lower ? "text-emerald-700" : "text-neutral-400"}`}>
                <CheckCircle2 className="h-3 w-3 mr-1 inline" /> Lowercase letter
              </span>
              <span className={`flex items-center ${rules.number ? "text-emerald-700" : "text-neutral-400"}`}>
                <CheckCircle2 className="h-3 w-3 mr-1 inline" /> At least 1 number
              </span>
              <span className={`flex items-center col-span-2 ${rules.special ? "text-emerald-700" : "text-neutral-400"}`}>
                <CheckCircle2 className="h-3 w-3 mr-1 inline" /> Special character (@$!%*?&#)
              </span>
            </div>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11 bg-rose-900 hover:bg-rose-950 text-white rounded-xl font-bold mt-2"
          isLoading={isLoading}
          disabled={!isPasswordValid || isGoogleLoading}
        >
          Create Account with Email
        </Button>
      </form>

      {/* Footer */}
      <div className="mt-6 pt-6 border-t border-neutral-100 text-center text-xs sm:text-sm text-neutral-500">
        Already have an account?{" "}
        <Link
          href={`/login?redirect=${encodeURIComponent(redirectPath)}`}
          className="font-bold text-rose-900 hover:underline"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-neutral-50/70">
      <React.Suspense
        fallback={
          <div className="w-full max-w-sm sm:max-w-md bg-white border border-neutral-200/80 rounded-2xl p-8 shadow-sm text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-12 w-12 bg-rose-50 rounded-full mx-auto" />
              <div className="h-6 bg-neutral-200 rounded w-3/4 mx-auto" />
              <div className="h-4 bg-neutral-100 rounded w-1/2 mx-auto" />
            </div>
          </div>
        }
      >
        <RegisterForm />
      </React.Suspense>
    </main>
  );
}
