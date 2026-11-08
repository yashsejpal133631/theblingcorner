"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Eye, EyeOff, AlertCircle, ArrowLeft } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to sign in. Please check your credentials.");
        return;
      }

      if (data.user?.role === "SUPER_ADMIN") {
        router.push(redirectPath.startsWith("/admin") ? redirectPath : "/admin");
      } else if (data.user?.role === "VENDOR") {
        router.push(redirectPath.startsWith("/vendor") ? redirectPath : "/vendor");
      } else {
        router.push(redirectPath);
      }
      router.refresh();
    } catch {
      setErrorMessage("Network error. Please check your internet connection.");
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
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
          Welcome to The Bling Corner
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500">
          Sign in to manage orders, wishlists, and account settings
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-5 flex items-start space-x-2 rounded-xl bg-red-50 p-3.5 text-xs sm:text-sm text-red-800 border border-red-200/80"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="relative">
          <Input
            id="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
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

        <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
          Sign In
        </Button>
      </form>

      {/* Footer */}
      <div className="mt-6 pt-6 border-t border-neutral-100 text-center text-xs sm:text-sm text-neutral-500">
        Don&apos;t have an account?{" "}
        <Link
          href={`/register?redirect=${encodeURIComponent(redirectPath)}`}
          className="font-semibold text-rose-900 hover:underline"
        >
          Create an Account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
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
        <LoginForm />
      </React.Suspense>
    </main>
  );
}
