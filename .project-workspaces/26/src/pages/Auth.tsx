import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

import { useMFA } from '@/hooks/useMFA';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

import coinsbloomLogo from '@/assets/coinsbloom-logo.png';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Loader2, Shield, Eye, EyeOff, Check, X, Heart, FileText } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { SignInFeedback } from '@/components/auth/SignInFeedback';

// Common passwords list (top 100 most common)
const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567', 'letmein',
  'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine', 'ashley', 'bailey',
  'shadow', '123123', '654321', 'superman', 'qazwsx', 'michael', 'football', 'password1',
  'password123', 'batman', 'login', 'admin', 'welcome', 'solo', 'princess', 'starwars',
  '121212', 'flower', 'passw0rd', 'dragon', 'master', 'hello', 'freedom', 'whatever',
  'qwerty123', 'qwertyuiop', '000000', '111111', '1234', '12345', '123456789', '1234567890',
  'password!', 'password1!', 'letmein123', 'access', 'mustang', 'matrix', 'computer',
  'internet', 'secret', 'changeme', 'test', 'test123', 'money', 'love', 'god'
];

// Check if password is common
const isCommonPassword = (password: string): boolean => {
  const lowerPassword = password.toLowerCase();
  return COMMON_PASSWORDS.some(common =>
    lowerPassword === common ||
    lowerPassword.includes(common) ||
    common.includes(lowerPassword)
  );
};

// Validation schemas
const emailSchema = z.string().trim().email('Please enter a valid email address');

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?\\":{}|<>]/, 'Password must contain at least one special character')
  .refine(
    (password) => !isCommonPassword(password),
    'Password is too common. Please choose a more secure password.'
  );

const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: z.string().trim().min(1, 'First name is required').max(50, 'First name is too long'),
  lastName: z.string().trim().min(1, 'Last name is required').max(50, 'Last name is too long'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export default function Auth() {
  const { user, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { verifyMFACode, isLoading: isMFALoading } = useMFA();
  
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const safeRedirectPath = (value: string | null): string | null => {
    if (!value) return null;
    if (!value.startsWith('/')) return null;
    if (value.startsWith('//')) return null;
    return value;
  };

  const redirectPath =
    safeRedirectPath(searchParams.get('redirect')) ??
    safeRedirectPath((location.state as any)?.from?.pathname ?? null);

  const startParam = searchParams.get('start');

  const goPostAuth = () => navigate(redirectPath ?? '/dashboard');

  const clearSupabaseAuthStorage = () => {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
        if (key.startsWith('supabase.auth.')) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // ignore
    }
  };

  const hardSignOut = async () => {
    localStorage.removeItem('kidsbloom_session');
    sessionStorage.removeItem('kidsbloom_profile');
    clearSupabaseAuthStorage();

    try {
      await Promise.race([
        supabase.auth.signOut({ scope: 'local' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), 2500)),
      ]);
    } catch {
      // ignore
    } finally {
      clearSupabaseAuthStorage();
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const [shouldRedirectAfterAuth, setShouldRedirectAfterAuth] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerData, setPartnerData] = useState<{ name: string; logo_url: string | null } | null>(null);

  const isEmbeddedPreview = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  // Removed hasOpenedNewTab state - no longer auto-opening tabs
  // Show a non-intrusive banner instead of auto-opening a new tab
  // The old behavior auto-opened a new browser tab which disrupted the user unexpectedly
  const showEmbeddedWarning = isEmbeddedPreview && !loading && !user;


  // MFA Challenge State
  const [showMFAChallenge, setShowMFAChallenge] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  
  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  
  // Form states
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('coinsbloom_remember_me') === 'true';
  });
  
  // Password visibility states
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);

  useEffect(() => {
    const SIGNIN_RELOAD_KEY = 'coinsbloom_signin_reloaded';
    const hasReloaded = sessionStorage.getItem(SIGNIN_RELOAD_KEY);
    
    if (!hasReloaded && location.pathname === '/signin') {
      clearSupabaseAuthStorage();
      localStorage.removeItem('kidsbloom_session');
      sessionStorage.removeItem('kidsbloom_profile');
      sessionStorage.setItem(SIGNIN_RELOAD_KEY, 'true');
      window.location.reload();
      return;
    }
    
    return () => {
      if (location.pathname !== '/signin') {
        sessionStorage.removeItem(SIGNIN_RELOAD_KEY);
      }
    };
  }, [location.pathname]);


  useEffect(() => {
    const partnerSlug = searchParams.get('partner');
    if (partnerSlug) {
      const fetchPartner = async () => {
        const { data, error } = await supabase
          .from('partners_public')
          .select('id, name, logo_url')
          .eq('slug', partnerSlug)
          .single();
        
        if (data && !error) {
          setPartnerId(data.id);
          setPartnerData({ name: data.name, logo_url: data.logo_url });
        }
      };
      fetchPartner();
    }
  }, [searchParams]);

  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setAuthTimedOut(true);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [loading]);


  const [hasAutoRedirected, setHasAutoRedirected] = useState(false);

  useEffect(() => {
    if (!loading && user && !showMFAChallenge && !hasAutoRedirected) {
      setHasAutoRedirected(true);
      toast({
        title: "Welcome back! 🌸",
        description: "You're already signed in. Redirecting to your dashboard...",
        className: "border-2 border-primary/40 bg-background/80 backdrop-blur-md shadow-lg",
      });
      setTimeout(() => {
        navigate(redirectPath ?? '/dashboard');
      }, 1500);
    }
  }, [user, loading, showMFAChallenge, hasAutoRedirected, navigate, redirectPath]);

  useEffect(() => {
    const checkMFA = async () => {
      if (!loading && user) {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        if (!error && data.nextLevel === 'aal2' && data.currentLevel === 'aal1') {
          const factors = await supabase.auth.mfa.listFactors();
          const verifiedFactor = factors.data?.totp?.find((f) => f.status === 'verified');

          if (verifiedFactor) {
            setMfaFactorId(verifiedFactor.id);
            setShowMFAChallenge(true);
            return;
          }
        }

        if (shouldRedirectAfterAuth) {
          setShouldRedirectAfterAuth(false);
          goPostAuth();
        }
      }
    };

    checkMFA();
  }, [user, loading, navigate, shouldRedirectAfterAuth]);

  const handleGoogleSignIn = async () => {
    if (isEmbeddedPreview) {
      const url = `${window.location.origin}/auth?mode=signin&start=google`;
      window.open(url, '_blank', 'noopener,noreferrer');
      toast({
        title: 'Open in new tab',
        description: 'Google sign-in must be completed in a full tab (not inside the preview).',
      });
      return;
    }

    setIsLoading(true);
    localStorage.setItem('coinsbloom_remember_me', rememberMe.toString());

    try {
      await hardSignOut();
      toast({ title: 'Opening Google…', description: 'Complete sign-in in the new tab/window.' });
      await signInWithGoogle();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign in with Google',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (isEmbeddedPreview) {
      const url = `${window.location.origin}/auth?mode=signin&start=apple`;
      window.open(url, '_blank', 'noopener,noreferrer');
      toast({
        title: 'Open in new tab',
        description: 'Apple sign-in must be completed in a full tab (not inside the preview).',
      });
      return;
    }

    setIsLoading(true);
    localStorage.setItem('coinsbloom_remember_me', rememberMe.toString());

    try {
      await hardSignOut();
      toast({ title: 'Opening Apple…', description: 'Complete sign-in in the new tab/window.' });
      
      const { lovable } = await import('@/integrations/lovable/index');
      const { error } = await lovable.auth.signInWithOAuth('apple', {
        redirect_uri: window.location.origin,
      });
      
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign in with Apple',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (startParam !== 'google') return;
    if (loading || user) return;
    if (isEmbeddedPreview) return;

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('start');
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }

    handleGoogleSignIn();
  }, [startParam, loading, user, isEmbeddedPreview]);

  useEffect(() => {
    if (startParam !== 'apple') return;
    if (loading || user) return;
    if (isEmbeddedPreview) return;

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('start');
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }

    handleAppleSignIn();
  }, [startParam, loading, user, isEmbeddedPreview]);

  const handleOpenSignInInNewTab = () => {
    const url = `${window.location.origin}/signin`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };


  const handleMFAVerify = async () => {
    if (!mfaFactorId || mfaCode.length !== 6) return;

    const success = await verifyMFACode(mfaFactorId, mfaCode);
    
    if (success) {
      toast({
        title: 'Welcome back!',
        description: 'Two-factor authentication verified',
      });
      setShowMFAChallenge(false);
      setShouldRedirectAfterAuth(false);
      goPostAuth();
    } else {
      toast({
        title: 'Verification Failed',
        description: 'Invalid code. Please try again.',
        variant: 'destructive',
      });
      setMfaCode('');
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShouldRedirectAfterAuth(true);

    try {
      const validated = signInSchema.parse({
        email: signInEmail,
        password: signInPassword,
      });

      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. If you don\'t have an account yet, please sign up below.');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and confirm your account before signing in.');
        }
        throw error;
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sign In Failed',
          description: error.message || 'Failed to sign in',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const validated = signUpSchema.parse({
        email: signUpEmail,
        password: signUpPassword,
        confirmPassword: signUpConfirmPassword,
        firstName,
        lastName,
      });

      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: validated.firstName,
            last_name: validated.lastName,
            ...(partnerId && { partner_id: partnerId }),
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }
        throw error;
      }

      trackEvent("signup_completed", { method: "email" });

      toast({
        title: 'Account Created!',
        description: 'You can now sign in with your new account.',
      });
      
      setActiveTab('signin');
      setSignInEmail(validated.email);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sign Up Failed',
          description: error.message || 'Failed to create account',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail || !emailSchema.safeParse(forgotPasswordEmail).success) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      setForgotPasswordSent(true);
      toast({
        title: 'Reset Email Sent',
        description: 'Check your email for password reset instructions',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reset email',
        variant: 'destructive',
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  // ─── EARLY RETURNS ───────────────────────────────────────────────

  // If a session already exists and we're auto-redirecting, show a branded loading screen
  if (user && !showMFAChallenge && hasAutoRedirected) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <Helmet>
          <title>Sign In | CoinsBloom</title>
        </Helmet>
        <LoadingSpinner size="lg" text="Taking you to your dashboard…" />
      </div>
    );
  }

  // If a session already exists but hasn't redirected yet, show clear controls
  if (user && !showMFAChallenge) {
    return (
      <div className="min-h-screen flex flex-col relative">
        <Helmet>
          <title>Sign In | CoinsBloom - Access Your Financial Dashboard</title>
          <meta name="description" content="Sign in or create a CoinsBloom account to start managing your finances." />
        </Helmet>
        <main className="flex-grow flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl border-border/50 bg-card/95 backdrop-blur-sm">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl font-bold text-foreground">You're already signed in</CardTitle>
              <CardDescription className="text-muted-foreground">
                Signed in as <span className="font-medium text-foreground">{user.email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" onClick={goPostAuth}>
                Continue to dashboard
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  try {
                    await hardSignOut();
                    toast({ title: 'Signed out', description: 'You can now sign in with a different account.' });
                    window.location.replace('/signin');
                  } catch (error: any) {
                    toast({ title: 'Sign out failed', description: error?.message || 'Please try again.', variant: 'destructive' });
                  }
                }}
              >
                Sign out
              </Button>
              <Button variant="ghost" className="w-full" onClick={handleOpenSignInInNewTab}>
                Open sign-in in new tab
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // ─── MAIN RENDER ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col relative">
      <Helmet>
        <title>{activeTab === 'signin' ? 'Sign In' : 'Sign Up'} | CoinsBloom</title>
        <meta name="description" content="Sign in or create a CoinsBloom account to start managing your finances. Track budgets, set goals, and take control of your money." />
      </Helmet>
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={coinsbloomLogo} alt="CoinsBloom" className="h-8 w-8 rounded-lg" />
            <span className="font-display text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-purple-700 bg-clip-text text-transparent">
              CoinsBloom
            </span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">← Back</Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center p-4 relative z-10">
        <Card className="w-full max-w-md shadow-xl border-border/50 bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-3 pb-4">
            {/* Logo Icon */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
              <img src={coinsbloomLogo} alt="" className="h-9 w-9 rounded-xl" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              {activeTab === 'signin' ? 'Welcome back' : 'Create your account'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {activeTab === 'signin' 
                ? 'Sign in to your CoinsBloom account' 
                : 'Start managing your finances for free'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-5">

            {/* ===== SIGN IN VIEW ===== */}
            {activeTab === 'signin' && (
              <>
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-sm font-semibold">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password" className="text-sm font-semibold">Password</Label>
                      <Button
                        type="button"
                        variant="link"
                        className="px-0 h-auto text-xs text-primary font-semibold"
                        onClick={() => {
                          setForgotPasswordEmail(signInEmail);
                          setShowForgotPassword(true);
                          setForgotPasswordSent(false);
                        }}
                      >
                        Forgot password?
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showSignInPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        className="pr-10 h-11"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        tabIndex={-1}
                      >
                        {showSignInPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="remember-me"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer">
                      Remember me
                    </label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-bold gradient-primary text-primary-foreground"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Signing in…
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground tracking-wider">Or continue with</span>
                  </div>
                </div>

                {/* Social & Passkey Buttons */}
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full h-12 text-base font-semibold border hover:bg-secondary/80 text-foreground"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full h-12 text-base font-semibold border hover:bg-secondary/80 text-foreground"
                    onClick={handleAppleSignIn}
                    disabled={isLoading}
                  >
                    <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.53-3.24 0-1.44.66-2.2.52-3.07-.4C3.79 16.16 4.36 10.04 8.7 9.8c1.3.07 2.2.74 2.95.78.95-.2 1.87-.88 2.91-.8 1.23.1 2.15.58 2.76 1.5-2.54 1.52-1.94 4.85.5 5.78-.42 1.1-.97 2.18-1.77 3.22zM12.03 9.73c-.12-2.07 1.55-3.85 3.5-3.98.27 2.28-2.08 4.18-3.5 3.98z"/>
                    </svg>
                    Continue with Apple
                  </Button>

                </div>

                {/* Toggle to Sign Up */}
                <p className="text-center text-sm text-muted-foreground pt-1">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('signup')}
                    className="font-semibold text-primary hover:underline"
                  >
                    Sign up
                  </button>
                </p>

                {/* Troubleshooting */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground/60 hover:text-muted-foreground"
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      await hardSignOut();
                      toast({
                        title: "Sign-in reset",
                        description: "Cleared saved sign-in state on this device. Try again.",
                      });
                      window.location.replace("/signin");
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                >
                  Having trouble? Reset sign-in
                </Button>
              </>
            )}

            {/* ===== SIGN UP VIEW ===== */}
            {activeTab === 'signup' && (
              <>
                {/* Free Account Promotional Box */}
                <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <Heart className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground">
                    Start with a <strong>free account</strong> and upgrade to premium anytime—no commitment needed!
                  </p>
                </div>

                <form onSubmit={handleEmailSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-semibold">First Name</Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        disabled={isLoading}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-semibold">Last Name</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        disabled={isLoading}
                        className="h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-semibold">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-semibold">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignUpPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        className="pr-10 h-11"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        tabIndex={-1}
                      >
                        {showSignUpPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {/* Password Requirements */}
                    <div className="space-y-1 text-xs">
                      <p className="text-muted-foreground font-medium">Password requirements:</p>
                      <div className="grid grid-cols-2 gap-1">
                        <div className={`flex items-center gap-1 ${signUpPassword.length >= 8 ? 'text-green-600' : 'text-red-500'}`}>
                          {signUpPassword.length >= 8 ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          <span>8+ characters</span>
                        </div>
                        <div className={`flex items-center gap-1 ${/[A-Z]/.test(signUpPassword) ? 'text-green-600' : 'text-red-500'}`}>
                          {/[A-Z]/.test(signUpPassword) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          <span>Uppercase</span>
                        </div>
                        <div className={`flex items-center gap-1 ${/[a-z]/.test(signUpPassword) ? 'text-green-600' : 'text-red-500'}`}>
                          {/[a-z]/.test(signUpPassword) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          <span>Lowercase</span>
                        </div>
                        <div className={`flex items-center gap-1 ${/[0-9]/.test(signUpPassword) ? 'text-green-600' : 'text-red-500'}`}>
                          {/[0-9]/.test(signUpPassword) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          <span>Number</span>
                        </div>
                        <div className={`flex items-center gap-1 ${/[!@#$%^&*(),.?\\":{}|<>]/.test(signUpPassword) ? 'text-green-600' : 'text-red-500'}`}>
                          {/[!@#$%^&*(),.?\\":{}|<>]/.test(signUpPassword) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          <span>Special char</span>
                        </div>
                        <div className={`flex items-center gap-1 ${signUpPassword.length > 0 && !isCommonPassword(signUpPassword) ? 'text-green-600' : 'text-red-500'}`}>
                          {signUpPassword.length > 0 && !isCommonPassword(signUpPassword) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          <span>Not common</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password" className="text-sm font-semibold">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-confirm-password"
                        type={showSignUpConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={signUpConfirmPassword}
                        onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        className="pr-10 h-11"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)}
                        tabIndex={-1}
                      >
                        {showSignUpConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-bold gradient-primary text-primary-foreground"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Creating account…
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>

                {/* Toggle to Sign In */}
                <p className="text-center text-sm text-muted-foreground pt-1">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('signin')}
                    className="font-semibold text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </>
            )}

          </CardContent>
        </Card>

        {/* Auth Footer */}
        <footer className="mt-8 text-center space-y-3 pb-6">
          <div className="flex items-center justify-center gap-6 text-sm">
            <Link to="/privacy" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <Shield className="h-3.5 w-3.5" />
              Privacy
            </Link>
            <Link to="/terms" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <FileText className="h-3.5 w-3.5" />
              Terms
            </Link>
          </div>
          <SignInFeedback variant="button" />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} CoinsBloom, Inc.
          </p>
        </footer>
      </main>

      {/* MFA Challenge Dialog */}
      <Dialog open={showMFAChallenge} onOpenChange={(open) => {
        if (!open) {
          void hardSignOut();
          setShowMFAChallenge(false);
          setMfaCode('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              Enter the 6-digit code from your authenticator app
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="mfa-code">Verification Code</Label>
              <Input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest"
                autoFocus
              />
            </div>

            <Button
              onClick={handleMFAVerify}
              disabled={mfaCode.length !== 6 || isMFALoading}
              className="w-full"
            >
              {isMFALoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Verify
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Your Password</DialogTitle>
            <DialogDescription>
              {!forgotPasswordSent 
                ? "Enter your email address and we'll send you a link to reset your password."
                : "Check your email for a password reset link."
              }
            </DialogDescription>
          </DialogHeader>

          {!forgotPasswordSent ? (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email Address</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <Button
                onClick={handleForgotPassword}
                disabled={isSendingReset || !forgotPasswordEmail}
                className="w-full"
              >
                {isSendingReset ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-4 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">
                We've sent a password reset link to <strong>{forgotPasswordEmail}</strong>. 
                Please check your inbox and follow the instructions.
              </p>
              <Button onClick={() => setShowForgotPassword(false)} className="w-full">
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
