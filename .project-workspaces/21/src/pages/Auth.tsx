import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Eye, EyeOff } from 'lucide-react';
import CompaniLogo from '@/components/CompaniLogo';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import SignInFeedback from '@/components/auth/SignInFeedback';

type Mode = 'login' | 'signup' | 'forgot';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialMode = (location.state as any)?.mode;
  const [mode, setMode] = useState<Mode>(initialMode === 'signup' ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const { toast } = useToast();

  // Support redirect after auth (e.g. from carousel Connect button)
  const redirectTo = (location.state as any)?.redirectTo as string | undefined;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({
          title: 'Check your email',
          description: 'We sent you a password reset link.',
        });
        setMode('login');
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        // Prevent stale localStorage migration from racing with profile creation
        localStorage.setItem('compani-migrated', 'true');
        localStorage.removeItem('compani-profile');

        // Small delay to let the LockManager release from signUp (mobile browser workaround)
        await new Promise(r => setTimeout(r, 500));

        // Try auto-login after signup
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) {
          // Email confirmation required
          toast({
            title: 'Almost there!',
            description: 'Check your email to confirm your account, then sign in.',
          });
        } else {
          navigate(redirectTo || '/');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(redirectTo || '/');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      let description = 'Something went wrong. Please try again.';
      if (/LockManager|lock.*timed out/i.test(msg)) {
        description = 'Signing in took too long. Please try again.';
      } else if (/already registered|already been registered/i.test(msg)) {
        description = 'This email is already registered. Try signing in instead.';
      } else if (/invalid.*password|password.*short|at least/i.test(msg)) {
        description = 'Password must be at least 6 characters.';
      } else if (/invalid.*email/i.test(msg)) {
        description = 'Please enter a valid email address.';
      } else if (/rate limit|too many/i.test(msg)) {
        description = 'Too many attempts. Please wait a moment and try again.';
      } else if (/invalid.*credentials|invalid login/i.test(msg)) {
        description = 'Invalid email or password. Please try again.';
      } else if (msg) {
        description = msg;
      }
      toast({
        title: 'Oops',
        description,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // iOS PWA detection — OAuth redirects break out of standalone context into Safari.
  const isIOSPWA = typeof window !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    window.matchMedia('(display-mode: standalone)').matches;

  const handleOAuth = async (provider: 'google' | 'apple') => {
    if (isIOSPWA) {
      toast({
        title: 'You\u2019ll be taken to Safari',
        description: 'After signing in, tap the Compani icon on your home screen to return.',
      });
      await new Promise(r => setTimeout(r, 2000));
    }
    setOauthLoading(provider);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast({
          title: 'Sign in failed',
          description: 'Please try again or use email instead.',
          variant: 'destructive',
        });
      }
    } catch (e) {
      toast({
        title: 'Sign in failed',
        description: 'Please try again or use email instead.',
        variant: 'destructive',
      });
    } finally {
      setOauthLoading(null);
    }
  };

  // If user is already authenticated, redirect immediately.
  useEffect(() => {
    const checkAndRedirect = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          navigate(redirectTo || '/', { replace: true });
        }
      });
    };

    checkAndRedirect();

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      const onVisible = () => {
        if (document.visibilityState === 'visible') checkAndRedirect();
      };
      document.addEventListener('visibilitychange', onVisible);
      const interval = setInterval(checkAndRedirect, 2000);
      return () => {
        document.removeEventListener('visibilitychange', onVisible);
        clearInterval(interval);
      };
    }
  }, [navigate, redirectTo]);

  // Force dark mode on auth page
  useEffect(() => {
    const root = document.documentElement;
    const hadLight = root.classList.contains('light');
    root.classList.remove('light');
    root.classList.add('dark');
    return () => {
      if (hadLight) {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/8 blur-[100px]" />
        <div className="absolute top-1/3 right-0 h-[400px] w-[400px] rounded-full bg-accent/6 blur-[80px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex h-14 items-center px-4 max-w-5xl mx-auto w-full">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <CompaniLogo size="md" />
        </button>
      </nav>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-6"
        >
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-foreground">
              {mode === 'signup' ? 'Create your account' : mode === 'login' ? 'Welcome back' : 'Reset password'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'signup'
                ? 'Find your people 💛'
                : mode === 'login'
                ? 'Sign in to continue'
                : 'Enter your email to get a reset link'}
            </p>
          </div>

          {/* iOS PWA notice */}
          {isIOSPWA && mode !== 'forgot' && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2.5 text-xs text-amber-200/80 leading-relaxed">
              💡 Signing in with Apple or Google will briefly open Safari. After signing in, tap the <strong>Compani icon</strong> on your home screen to return.
            </div>
          )}

          {/* Email form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 rounded-xl h-12"
              />
            </div>

            {mode !== 'forgot' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10 rounded-xl h-12"
                />
              </div>
            )}

            {mode === 'login' && (
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </button>
            )}

            {/* Privacy & Terms — required by Google Play before account creation */}
            {mode === 'signup' && (
              <p className="text-center text-[11px] text-muted-foreground/70 leading-relaxed">
                By creating an account you agree to our{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary/80 hover:text-primary underline underline-offset-2">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary/80 hover:text-primary underline underline-offset-2">
                  Privacy Policy
                </a>.
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground glow-soft transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : mode === 'signup' ? (
                'Create Account'
              ) : mode === 'login' ? (
                'Sign In'
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          {/* OAuth buttons (not shown on forgot) */}
          {mode !== 'forgot' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <button
                onClick={() => handleOAuth('google')}
                disabled={!!oauthLoading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-white/10 disabled:opacity-60"
              >
                {oauthLoading === 'google' ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                ) : (
                  <>
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              <button
                onClick={() => handleOAuth('apple')}
                disabled={!!oauthLoading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-white/10 disabled:opacity-60"
              >
                {oauthLoading === 'apple' ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                ) : (
                  <>
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                    Continue with Apple
                  </>
                )}
              </button>
            </div>
          )}

          {/* Toggle mode */}
          <p className="text-center text-sm text-muted-foreground">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="text-primary font-semibold hover:underline">
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button onClick={() => setMode('signup')} className="text-primary font-semibold hover:underline">
                  Sign up
                </button>
              </>
            )}
          </p>

          <div className="flex justify-center mt-2">
            <SignInFeedback />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
