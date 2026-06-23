import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoginForm } from '@/features/auth'
import { ParticleMesh } from '@/components/ui/particle-mesh'
import { LoginTypewriter } from '@/components/shared/LoginTypewriter'
import { LogoCapsule } from '@/components/shared/LogoCapsule'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref')
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 50)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (refCode) {
      localStorage.setItem('intoiq_pending_ref', refCode)
    }
  }, [refCode])

  return (
    <div className="flex min-h-screen animated-gradient relative">
      <ParticleMesh />

      {/* Back to landing */}
      <button
        onClick={() => navigate('/')}
        className="absolute left-5 z-30 flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Back</span>
      </button>

      {/* Left panel — cinematic hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div className="absolute bottom-1/3 right-10 w-80 h-80 rounded-full bg-primary/8 blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-2/3 left-1/3 w-64 h-64 rounded-full bg-primary/5 blur-3xl animate-float" style={{ animationDelay: '6s' }} />
        
        <div className="relative z-10 flex flex-col justify-between p-12 text-foreground">
          <div>
            <LogoCapsule size="sm" className="bg-transparent border-0 shadow-none px-0 py-0 hover:shadow-none" />
          </div>
          
          <div className="max-w-md">
            <h3 className="text-4xl xl:text-5xl font-serif leading-tight mb-6">
              The end of<br />
              <span className="italic gradient-text">
                "How do I<br />build this?"
              </span>
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Turn your raw notes into live, lead-capturing funnels in under 30 minutes.
            </p>
          </div>
          
          <div className="flex items-center gap-3 text-muted-foreground/50 text-sm">
            <div className="w-8 h-px bg-primary/30" />
            <span>Ideas → Assets → Revenue</span>
          </div>
        </div>
      </div>

      {/* Right panel — blur-in glassmorphic auth */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className={cn(
          'glass rounded-2xl p-8 w-full max-w-md transition-all duration-500 ease-out',
          entered
            ? 'opacity-100 scale-100 blur-0'
            : 'opacity-0 scale-95 blur-md'
        )} style={entered ? { boxShadow: '0 0 60px -12px hsl(var(--primary) / 0.15)' } : undefined}>
          {/* Mobile-only hero text */}
          <div className="lg:hidden text-center mb-6">
            <h3 className="text-2xl font-serif leading-tight mb-2">
              The end of{' '}
              <span className="italic gradient-text">"How do I build this?"</span>
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Turn your raw notes into live, lead-capturing funnels in under 30 minutes.
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}