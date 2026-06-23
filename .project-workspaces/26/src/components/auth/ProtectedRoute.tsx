import { useEffect, useState, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, Key } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { VoiceActivationFAB } from '@/components/navigation/VoiceActivationFAB';

const SHOW_FLOATING_MIC_KEY = "coinsbloom_show_floating_mic";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireMFA?: boolean;
}

export function ProtectedRoute({ children, requireMFA = true }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checkingMFA, setCheckingMFA] = useState(true);
  const [needsMFAChallenge, setNeedsMFAChallenge] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  
  // Track whether we've already completed the initial MFA check for this user
  const mfaCheckedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    const checkMFAStatus = async () => {
      if (!user || !requireMFA) {
        setCheckingMFA(false);
        return;
      }

      // Skip re-check if we already checked for this same user
      if (mfaCheckedForUserRef.current === user.id) {
        return;
      }

      try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        
        if (error) {
          console.error('Error checking MFA status:', error);
          setCheckingMFA(false);
          mfaCheckedForUserRef.current = user.id;
          return;
        }

        // User has MFA enabled but hasn't verified yet (aal1 -> aal2 required)
        if (data.nextLevel === 'aal2' && data.currentLevel === 'aal1') {
          const factors = await supabase.auth.mfa.listFactors();
          const verifiedFactor = factors.data?.totp?.find(f => f.status === 'verified');
          
          if (verifiedFactor) {
            setMfaFactorId(verifiedFactor.id);
            setNeedsMFAChallenge(true);
          }
        }
      } catch (err) {
        console.error('MFA check error:', err);
      } finally {
        setCheckingMFA(false);
        mfaCheckedForUserRef.current = user.id;
      }
    };

    if (!loading && user) {
      checkMFAStatus();
    } else if (!loading && !user) {
      setCheckingMFA(false);
      mfaCheckedForUserRef.current = null;
    }
  }, [user, loading, requireMFA]);

  const handleMFAVerify = async () => {
    if (!mfaFactorId || mfaCode.length !== 6) return;
    
    setIsVerifying(true);
    
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: mfaCode,
      });

      if (verifyError) throw verifyError;

      setNeedsMFAChallenge(false);
      toast({ title: 'Verified', description: 'Two-factor authentication successful' });
    } catch (err: any) {
      toast({ 
        title: 'Verification Failed', 
        description: err.message || 'Invalid code. Please try again.',
        variant: 'destructive' 
      });
    } finally {
      setIsVerifying(false);
      setMfaCode('');
    }
  };

  const handleRecoveryCodeVerify = async () => {
    if (!user || recoveryCode.length < 8) return;
    
    setIsVerifying(true);
    
    try {
      // Use server-side bcrypt verification via Edge Function
      const { data, error } = await supabase.functions.invoke('mfa-recovery', {
        body: { 
          action: 'verify',
          recoveryCode,
          factorId: mfaFactorId
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Invalid recovery code');

      setNeedsMFAChallenge(false);
      toast({ 
        title: 'Recovery Successful', 
        description: 'MFA has been disabled. Please set up 2FA again in Settings.',
      });
    } catch (err: any) {
      toast({ 
        title: 'Recovery Failed', 
        description: err.message || 'Invalid recovery code',
        variant: 'destructive' 
      });
    } finally {
      setIsVerifying(false);
      setRecoveryCode('');
    }
  };

  const handleCancelMFA = async () => {
    await supabase.auth.signOut({ scope: "local" });
    setNeedsMFAChallenge(false);
  };

  // Show loading while checking auth and MFA status
  if (loading || checkingMFA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to sign in if not authenticated
  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Show MFA challenge dialog
  if (needsMFAChallenge) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {useRecoveryCode ? (
                  <Key className="h-5 w-5 text-amber-600" />
                ) : (
                  <Shield className="h-5 w-5 text-green-600" />
                )}
                Two-Factor Authentication
              </DialogTitle>
              <DialogDescription>
                {useRecoveryCode 
                  ? 'Enter one of your recovery codes to regain access'
                  : 'Enter the 6-digit code from your authenticator app'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {useRecoveryCode ? (
                <div className="space-y-2">
                  <Label htmlFor="recovery-code">Recovery Code</Label>
                  <Input
                    id="recovery-code"
                    type="text"
                    placeholder="XXXX-XXXX"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                    className="text-center text-lg tracking-widest"
                    autoFocus
                  />
                </div>
              ) : (
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
              )}

              <Button
                onClick={useRecoveryCode ? handleRecoveryCodeVerify : handleMFAVerify}
                disabled={useRecoveryCode ? recoveryCode.length < 8 : mfaCode.length !== 6 || isVerifying}
                className="w-full"
              >
                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verify
              </Button>

              <div className="flex flex-col gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUseRecoveryCode(!useRecoveryCode);
                    setMfaCode('');
                    setRecoveryCode('');
                  }}
                  className="text-muted-foreground"
                >
                  {useRecoveryCode ? 'Use authenticator app instead' : 'Lost access? Use recovery code'}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelMFA}
                  className="text-muted-foreground"
                >
                  Sign out
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Check localStorage for floating mic preference
  const currentPath = window.location.pathname;
  const checkMicVisibility = () => {
    // Hide on Bloom page — it has its own mic in the input bar
    if (currentPath === "/coach") return false;
    // Default OFF — only show if explicitly enabled
    if (localStorage.getItem(SHOW_FLOATING_MIC_KEY) !== "true") return false;
    if (localStorage.getItem('voice-fab-dismissed') === "true") return false;
    
    // Check timed dismissal
    const dismissedUntil = localStorage.getItem('voice-fab-dismissed-until');
    if (dismissedUntil) {
      const dismissedDate = new Date(dismissedUntil);
      if (new Date() < dismissedDate) return false;
      // Time has passed, clear the flag
      localStorage.removeItem('voice-fab-dismissed-until');
    }
    return true;
  };
  
  const showFloatingMic = checkMicVisibility();

  const handleDismissFAB = () => {
    // Force re-render when dismissed
    window.location.reload();
  };

  return (
    <>
      {children}
      {showFloatingMic && <VoiceActivationFAB onDismiss={handleDismissFAB} />}
    </>
  );
}