import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { updatePassword } from '../services/auth'
import { useAuth } from '../hooks/useAuth'

export function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()
  const { session } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      await updatePassword(password)
      setSuccess(true)
      setTimeout(() => navigate('/projects', { replace: true }), 2000)
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : 'Something went wrong.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-serif mb-4">Invalid or Expired Link</h1>
        <p className="text-muted-foreground text-sm mb-6">This password reset link is no longer valid. Please request a new one.</p>
        <Button onClick={() => navigate('/login')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Sign In
        </Button>
      </div>
    )
  }

  if (success) {
    return (
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-serif mb-4 gradient-text">Password Updated!</h1>
        <p className="text-muted-foreground text-sm">Redirecting to your dashboard…</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-1 text-center text-3xl font-serif tracking-tight">
        Set New Password
      </h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        Choose a strong password for your account.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="new-password" className="text-foreground/80">New Password</Label>
          <div className="relative mt-1.5">
            <Input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete="new-password"
              className="pr-10 border-border/50 bg-background/50 focus-visible:ring-primary focus-visible:ring-2"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <Label htmlFor="confirm-password" className="text-foreground/80">Confirm Password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            autoComplete="new-password"
            className="mt-1.5 border-border/50 bg-background/50 focus-visible:ring-primary focus-visible:ring-2"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">{error}</p>
        )}
        <Button type="submit" disabled={loading} className="w-full mt-1 h-11 glow-button">
          {loading ? 'Updating…' : 'Update Password'}
        </Button>
      </form>

      <button
        onClick={() => navigate('/login')}
        className="mt-6 flex items-center justify-center gap-1 text-xs text-muted-foreground/60 hover:text-foreground transition-colors w-full"
      >
        <ArrowLeft className="h-3 w-3" /> Back to Sign In
      </button>
    </div>
  )
}
