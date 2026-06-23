import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm'
import { ParticleMesh } from '@/components/ui/particle-mesh'

export default function ResetPasswordPage() {
  return (
    <div
      className="flex min-h-screen animated-gradient relative items-center justify-center px-6 py-12"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 3rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 3rem)',
      }}
    >
      <ParticleMesh />
      <div className="glass rounded-2xl p-8 w-full max-w-md relative z-10">
        <ResetPasswordForm />
      </div>
    </div>
  )
}
