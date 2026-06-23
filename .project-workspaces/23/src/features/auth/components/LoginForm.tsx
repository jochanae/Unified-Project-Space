import { useEffect, useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, ArrowLeft, Mail, RefreshCw } from 'lucide-react'
import { LogoCapsule } from '@/components/shared/LogoCapsule'
import { signIn, signUp, resetPassword } from '../services/auth'
import { supabase } from '@/integrations/supabase/client'
import { lovable } from '@/integrations/lovable/index'
import { PasswordStrengthMeter } from './PasswordStrengthMeter'
import { LoginTypewriter } from '@/components/shared/LoginTypewriter'

const EMAIL_NOT_CONFIRMED = 'email_not_confirmed'

function getAuthErrorMessage(error: unknown): { message: string; code?: string } {
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: string }).message
    if (msg.includes('Invalid login credentials')) return { message: 'Invalid email or password. Please try again.' }
    if (msg.includes('Email not confirmed')) return { message: 'Your email hasn\'t been verified yet.', code: EMAIL_NOT_CONFIRMED }
    if (msg.includes('User already registered')) return { message: 'An account with this email already exists. Sign in instead.' }
    if (msg.includes('Password should be at least')) return { message: 'Password must be at least 6 characters.' }
    return { message: msg }
  }
  return { message: 'Something went wrong. Please try again.' }
}

export function LoginForm() {
  const [searchParams] = useSearchParams()
  const initialEmail = (searchParams.get('email') || '').trim()
  // Smart Auth: prioritize returning users. Default to signin; landing-page
  // signup links can still pass ?mode=signup to land directly on Create flow.
  const modeParam = searchParams.get('mode')
  const initialMode: 'signin' | 'signup' =
    modeParam === 'signup' ? 'signup' : 'signin'
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode)
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [signupComplete, setSignupComplete] = useState(false)
  const [resending, setResending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const pendingPrompt = (location.state as any)?.prompt as string | undefined
  const getTargetRoute = () => pendingPrompt ? '/workspace' : '/dashboard'
  const getNavState = () => pendingPrompt ? { state: { prompt: pendingPrompt } } : undefined

  // Fallback: hydrate email from sessionStorage audit if URL param missing
  useEffect(() => {
    if (email) return
    try {
      const raw = sessionStorage.getItem('intoiq_signal_audit')
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.email)) {
        setEmail(parsed.email)
      }
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  function handleError(err: unknown) {
    const result = getAuthErrorMessage(err)
    setError(result.message)
    setErrorCode(result.code ?? null)
  }

  function clearError() {
    setError(null)
    setErrorCode(null)
  }

  async function handleResendVerification() {
    setResending(true)
    try {
      await supabase.auth.resend({ type: 'signup', email })
    } catch {
      // silently fail — user sees no change
    } finally {
      setResending(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    clearError()
    setLoading(true)

    try {
      if (mode === 'forgot') {
        await resetPassword(email)
        setResetSent(true)
      } else if (mode === 'signin') {
        await signIn(email, password)
        navigate(getTargetRoute(), { replace: true, ...getNavState() })
      } else {
        await signUp(email, password)
        setSignupComplete(true)
        const pendingRef = localStorage.getItem('intoiq_pending_ref');
        if (pendingRef) {
          try {
            await supabase.functions.invoke('claim-referral', {
              body: { referralCode: pendingRef }
            });
            localStorage.removeItem('intoiq_pending_ref');
          } catch {
            // non-blocking — referral claim failure should not
            // interrupt signup
          }
        }
      }
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    clearError()
    setLoading(true)
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/dashboard`,
      })
      if (result.error) {
        handleError(result.error)
        setLoading(false)
        return
      }
      if (result.redirected) return
      navigate(getTargetRoute(), { replace: true, ...getNavState() })
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAppleSignIn() {
    clearError()
    setLoading(true)
    try {
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: `${window.location.origin}/dashboard`,
      })
      if (result.error) {
        handleError(result.error)
        setLoading(false)
        return
      }
      if (result.redirected) return
      navigate(getTargetRoute(), { replace: true, ...getNavState() })
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  // Signup complete — verify email screen
  if (signupComplete) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Mail className="h-7 w-7" />
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-serif tracking-tight gradient-text">Verify your email</h1>
        <p className="text-muted-foreground text-sm mb-6">
          We sent a confirmation link to <strong className="text-foreground">{email}</strong>. Click the link to activate your account.
        </p>
        <p className="text-muted-foreground/60 text-xs mb-6">
          Didn't receive it? Check your spam folder or resend below.
        </p>
        <Button
          variant="outline"
          onClick={handleResendVerification}
          disabled={resending}
          className="gap-2 mb-4"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
          {resending ? 'Sending…' : 'Resend verification email'}
        </Button>
        <br />
        <button
          onClick={() => { setSignupComplete(false); setMode('signin'); clearError() }}
          className="flex items-center justify-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors mx-auto mt-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
        </button>
      </div>
    )
  }

  // Forgot password — reset sent confirmation
  if (mode === 'forgot' && resetSent) {
    return (
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-2 text-2xl font-serif tracking-tight gradient-text">Check Your Email</h1>
        <p className="text-muted-foreground text-sm mb-6">
          We sent a password reset link to <strong className="text-foreground">{email}</strong>. Click the link to set a new password.
        </p>
        <button
          onClick={() => { setMode('signin'); setResetSent(false); setError(null) }}
          className="flex items-center justify-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors mx-auto"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
        </button>
      </div>
    )
  }

  // Forgot password form
  if (mode === 'forgot') {
    return (
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-3xl font-serif tracking-tight">
          Reset Password
        </h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          Enter your email and we'll send you a reset link.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="reset-email" className="text-foreground/80">Email</Label>
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="mt-1.5 border-border/50 bg-background/50 focus-visible:ring-primary focus-visible:ring-2"
            />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full h-11 glow-button">
            {loading ? 'Sending…' : 'Send Reset Link'}
          </Button>
        </form>
        <button
          onClick={() => { setMode('signin'); setError(null) }}
          className="mt-6 flex items-center justify-center gap-1 text-xs text-muted-foreground/60 hover:text-foreground transition-colors w-full"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Sign In
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex justify-center mb-3">
        <LogoCapsule size="lg" />
      </div>
      <LoginTypewriter />
      <div className="h-6" />

      {/* Social OAuth */}
      <div className="flex flex-col gap-2 mb-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full h-11 border-border/50 hover:bg-accent gap-2 justify-center"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleAppleSignIn}
          disabled={loading}
          className="w-full h-11 border-border/50 hover:bg-accent gap-2 justify-center"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Apple
        </Button>
      </div>

      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/30" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-transparent px-2 text-muted-foreground/50">or</span>
        </div>
      </div>

      {/* Smart Auth — 2-step flow, no toggle.
          Step 1: email + Continue. Step 2: password (defaults to Sign In). */}
      <SmartAuthForm
        mode={mode}
        setMode={setMode}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        loading={loading}
        error={error}
        errorCode={errorCode}
        onSubmit={handleSubmit}
        onForgot={() => { setMode('forgot'); setError(null) }}
        onResend={handleResendVerification}
        resending={resending}
        clearError={clearError}
        emailNotConfirmedCode={EMAIL_NOT_CONFIRMED}
      />

      <p className="mt-5 text-center text-[11px] text-muted-foreground/50 leading-relaxed">
        By signing up, you agree to our{' '}
        <a href="/terms" className="text-primary/70 hover:text-primary underline">Terms of Service</a>
        {' '}and{' '}
        <a href="/privacy" className="text-primary/70 hover:text-primary underline">Privacy Policy</a>.
      </p>

      <p className="mt-3 text-center text-xs text-muted-foreground/60">
        Intelligence applied. One funnel at a time.
      </p>
    </div>
  )
}

interface SmartAuthFormProps {
  mode: 'signin' | 'signup' | 'forgot'
  setMode: (m: 'signin' | 'signup' | 'forgot') => void
  email: string
  setEmail: (v: string) => void
  password: string
  setPassword: (v: string) => void
  showPassword: boolean
  setShowPassword: (v: boolean) => void
  loading: boolean
  error: string | null
  errorCode: string | null
  onSubmit: (e: React.FormEvent) => Promise<void> | void
  onForgot: () => void
  onResend: () => void | Promise<void>
  resending: boolean
  clearError: () => void
  emailNotConfirmedCode: string
}

function SmartAuthForm(p: SmartAuthFormProps) {
  // Step 1 = collect email; Step 2 = collect password.
  // Pre-fill from URL/session means we can skip step 1 entirely.
  const [step, setStep] = useState<'email' | 'password'>(p.email ? 'password' : 'email')

  function handleContinue(e: React.FormEvent) {
    e.preventDefault()
    p.clearError()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) return
    setStep('password')
  }

  if (step === 'email') {
    return (
      <form onSubmit={handleContinue} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="email" className="text-foreground/80">Email</Label>
          <Input
            id="email"
            type="email"
            value={p.email}
            onChange={(e) => p.setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
            autoComplete="email"
            className="mt-1.5 border-border/50 bg-background/50 focus-visible:ring-primary focus-visible:ring-2"
          />
        </div>
        <Button type="submit" className="w-full mt-1 h-11 text-sm font-medium tracking-wide glow-button">
          Continue
        </Button>
      </form>
    )
  }

  // Step 2 — password. Defaults to Sign In; subtle switch to Create Account.
  return (
    <form onSubmit={p.onSubmit} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Continuing as</p>
          <p className="text-sm font-medium truncate">{p.email}</p>
        </div>
        <button
          type="button"
          onClick={() => { setStep('email'); p.setPassword(''); p.clearError() }}
          className="text-xs text-primary/70 hover:text-primary transition-colors"
        >
          Change
        </button>
      </div>
      <div>
        <Label htmlFor="password" className="text-foreground/80">
          {p.mode === 'signup' ? 'Create password' : 'Password'}
        </Label>
        <div className="relative mt-1.5">
          <Input
            id="password"
            type={p.showPassword ? 'text' : 'password'}
            value={p.password}
            onChange={(e) => p.setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            autoFocus
            autoComplete={p.mode === 'signin' ? 'current-password' : 'new-password'}
            className="pr-10 border-border/50 bg-background/50 focus-visible:ring-primary focus-visible:ring-2"
          />
          <button
            type="button"
            onClick={() => p.setShowPassword(!p.showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/80 hover:text-primary transition-colors drop-shadow-[0_0_4px_hsl(var(--primary)/0.4)]"
            tabIndex={-1}
            aria-label={p.showPassword ? 'Hide password' : 'Show password'}
          >
            {p.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {p.mode === 'signin' && (
          <button
            type="button"
            onClick={p.onForgot}
            className="mt-2 text-xs text-primary/70 hover:text-primary transition-colors"
          >
            Forgot password?
          </button>
        )}
        {p.mode === 'signup' && p.password.length > 0 && (
          <PasswordStrengthMeter password={p.password} />
        )}
      </div>
      {p.error && (
        <div role="alert">
          <p className="text-sm text-destructive">{p.error}</p>
          {p.errorCode === p.emailNotConfirmedCode && (
            <button
              type="button"
              onClick={p.onResend}
              disabled={p.resending}
              className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${p.resending ? 'animate-spin' : ''}`} />
              {p.resending ? 'Sending…' : 'Resend verification email'}
            </button>
          )}
        </div>
      )}
      <Button type="submit" disabled={p.loading} className="w-full mt-1 h-11 text-sm font-medium tracking-wide glow-button">
        {p.loading ? 'Please wait…' : p.mode === 'signin' ? 'Sign In' : 'Create Account'}
      </Button>
      <p className="text-center text-xs text-muted-foreground/70 -mt-1">
        {p.mode === 'signin' ? (
          <>New to IntoIQ?{' '}
            <button type="button" onClick={() => { p.setMode('signup'); p.clearError() }}
              className="text-primary hover:text-primary/80 font-medium transition-colors">
              Create an account
            </button>
          </>
        ) : (
          <>Already have an account?{' '}
            <button type="button" onClick={() => { p.setMode('signin'); p.clearError() }}
              className="text-primary hover:text-primary/80 font-medium transition-colors">
              Sign in
            </button>
          </>
        )}
      </p>
    </form>
  )
}

