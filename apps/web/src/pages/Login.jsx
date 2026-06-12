import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getBase44Client } from "@/api/base44Client";
import {
  isMsalInteractionInProgress,
  loginWithMicrosoft,
  logoutFromMicrosoft,
} from "@/auth/tokenProvider";
import { shouldRedirectAuthenticatedUserFromLogin } from "@/auth/msalAuthFlow";
import { clearDevBypassLoggedOut, isDevAuthBypassEnabled } from "@/lib/devUser";
import { isMsalAuthMode } from "@/lib/authMode";
import { logAuthLifecycle } from "@/lib/authLifecycleLog";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GraderaLogo from "@/components/GraderaLogo";
import GoogleIcon from "@/components/GoogleIcon";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    isAuthenticated,
    isLoadingAuth,
    authChecked,
    checkUserAuth,
    authError,
    clearAuthError,
    logout,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const devBypass = isDevAuthBypassEnabled();
  const msalAuth = isMsalAuthMode();

  useEffect(() => {
    if (
      shouldRedirectAuthenticatedUserFromLogin({
        pathname: location.pathname,
        isAuthenticated,
        hasUser: Boolean(user),
      }) &&
      !isLoadingAuth &&
      authChecked
    ) {
      logAuthLifecycle("Login redirect to dashboard", {
        email: user?.email,
      });
      navigate("/", { replace: true });
    }
  }, [
    location.pathname,
    isAuthenticated,
    user,
    isLoadingAuth,
    authChecked,
    navigate,
  ]);

  useEffect(() => {
    if (authError?.message) {
      setError(authError.message);
    } else if (!authError) {
      setError("");
    }
  }, [authError]);

  const handleDevContinue = async () => {
    clearDevBypassLoggedOut();
    await checkUserAuth();
    navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const client = getBase44Client();
      if (!client) {
        throw new Error("BASE44 login is not available in the current auth mode.");
      }
      await client.auth.loginViaEmailPassword(email, password);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    const client = getBase44Client();
    if (client) {
      client.auth.loginWithProvider("google", "/");
    }
  };

  const handleMicrosoft = async () => {
    if (loading || isMsalInteractionInProgress()) {
      return;
    }

    setError("");
    clearAuthError?.();
    setLoading(true);
    try {
      await loginWithMicrosoft();
    } catch (err) {
      setError(err.message || "Microsoft sign-in failed.");
      setLoading(false);
    }
  };

  const handleSignOutAndRetry = async () => {
    setError("");
    clearAuthError?.();
    setLoading(true);
    try {
      logout(false);
      await logoutFromMicrosoft();
    } catch (err) {
      setError(err.message || "Sign out failed.");
    } finally {
      setLoading(false);
    }
  };

  const showMsalSpinner = msalAuth && (isLoadingAuth || !authChecked);
  const showRetryButton =
    msalAuth &&
    authError &&
    (authError.type === "auth_required" ||
      authError.type === "user_not_registered" ||
      authError.type === "unknown");

  return (
    <AuthLayout
      logo={<GraderaLogo size="xl" />}
      title="Welcome back"
      subtitle="GRADERA Innovation Hub"
      subtitleLine2="Rapid Prototype Development Platform"
      footer={
        msalAuth ? null : (
          <>
            Don't have an account?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Create one
            </Link>
          </>
        )
      }
    >
      {devBypass && (
        <Button
          type="button"
          className="w-full h-12 text-sm font-medium mb-4"
          onClick={handleDevContinue}
        >
          Continue as dev user
        </Button>
      )}

      {msalAuth ? (
        <>
          {showMsalSpinner && (
            <div className="mb-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Completing Microsoft sign-in...
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <Button
            type="button"
            className="w-full h-12 text-sm font-medium"
            onClick={handleMicrosoft}
            disabled={loading || showMsalSpinner || isMsalInteractionInProgress()}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Redirecting...
              </>
            ) : (
              "Sign in with Microsoft"
            )}
          </Button>

          {showRetryButton && (
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-sm font-medium mt-3"
              onClick={handleSignOutAndRetry}
              disabled={loading}
            >
              Sign out and retry
            </Button>
          )}
        </>
      ) : (
        <>
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
        </>
      )}
    </AuthLayout>
  );
}
