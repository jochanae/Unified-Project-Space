import { useState, useEffect } from 'react';
import { 
  Shield, ShieldCheck, KeyRound, QrCode, 
  Loader2, Key, Copy, RefreshCw, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

import { useMFA } from '@/hooks/useMFA';


interface MFAFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
  created_at: string;
}

interface SecuritySectionProps {
  user: any;
}

export function SecuritySection({ user }: SecuritySectionProps) {
  const { toast } = useToast();

  const {
    listFactors,
    enrollMFA,
    verifyEnrollment,
    unenrollMFA,
    generateRecoveryCodes,
    getRecoveryCodesCount,
    isLoading: isMFALoading,
    error: mfaError,
    clearError,
  } = useMFA();

  const [mfaFactors, setMfaFactors] = useState<MFAFactor[]>([]);
  
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Recovery codes state
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [recoveryCodesCount, setRecoveryCodesCount] = useState(0);
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);


  useEffect(() => {
    if (user) {
      loadMFAFactors();
      loadRecoveryCodesCount();
    }
  }, [user]);


  const loadMFAFactors = async () => {
    const factors = await listFactors();
    setMfaFactors(factors.filter(f => f.status === 'verified'));
  };

  const loadRecoveryCodesCount = async () => {
    const count = await getRecoveryCodesCount();
    setRecoveryCodesCount(count);
  };


  const handleStartMFASetup = async () => {
    clearError();
    const result = await enrollMFA();
    
    if (result) {
      setMfaQrCode(result.qrCode);
      setMfaSecret(result.secret);
      setMfaFactorId(result.factorId);
      setShowMFASetup(true);
    } else {
      toast({ title: 'Setup Failed', description: 'Could not start MFA setup.', variant: 'destructive' });
    }
  };

  const handleVerifyMFA = async () => {
    if (!mfaFactorId || verificationCode.length !== 6) return;

    setIsVerifying(true);
    const success = await verifyEnrollment(mfaFactorId, verificationCode);
    setIsVerifying(false);

    if (success) {
      toast({ title: 'MFA Enabled', description: 'Two-factor authentication is now active' });
      setShowMFASetup(false);
      setMfaQrCode(null);
      setMfaSecret(null);
      setMfaFactorId(null);
      setVerificationCode('');
      loadMFAFactors();
      
      // Generate recovery codes after enabling MFA
      handleGenerateRecoveryCodes();
    } else {
      toast({ title: 'Verification Failed', description: mfaError || 'Invalid code.', variant: 'destructive' });
    }
  };

  const handleDisableMFA = async (factorId: string) => {
    const success = await unenrollMFA(factorId);
    
    if (success) {
      toast({ title: 'MFA Disabled', description: 'Two-factor authentication has been removed' });
      loadMFAFactors();
      setRecoveryCodesCount(0);
    } else {
      toast({ title: 'Failed', description: 'Could not disable MFA', variant: 'destructive' });
    }
  };

  const handleGenerateRecoveryCodes = async () => {
    setIsGeneratingCodes(true);
    const codes = await generateRecoveryCodes();
    setIsGeneratingCodes(false);
    
    if (codes) {
      setRecoveryCodes(codes);
      setShowRecoveryCodes(true);
      loadRecoveryCodesCount();
    } else {
      toast({ title: 'Failed', description: 'Could not generate recovery codes', variant: 'destructive' });
    }
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    toast({ title: 'Copied', description: 'Recovery codes copied to clipboard' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-2">Security</h2>
          <p className="text-muted-foreground">Manage your account security settings</p>
        </CardContent>
      </Card>

      {/* MFA Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security with an authenticator app</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {mfaFactors.length > 0 ? (
            <div className="space-y-3">
              {mfaFactors.map((factor) => (
                <div
                  key={factor.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">{factor.friendly_name || 'Authenticator App'}</p>
                      <p className="text-sm text-green-600">Active since {new Date(factor.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDisableMFA(factor.id)}
                    disabled={isMFALoading}
                  >
                    {isMFALoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Disable'}
                  </Button>
                </div>
              ))}
              
              {/* Recovery Codes Section */}
              <div className="mt-4 p-4 rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium">Recovery Codes</p>
                      <p className="text-sm text-amber-600">
                        {recoveryCodesCount > 0 
                          ? `${recoveryCodesCount} unused codes remaining`
                          : 'No recovery codes generated'
                        }
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateRecoveryCodes}
                    disabled={isGeneratingCodes}
                    className="gap-1"
                  >
                    {isGeneratingCodes ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {recoveryCodesCount > 0 ? 'Regenerate' : 'Generate'}
                  </Button>
                </div>
                {recoveryCodesCount > 0 && recoveryCodesCount <= 3 && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Low on recovery codes. Consider generating new ones.</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Protect your account by requiring a verification code from an authenticator app when signing in.
              </p>
              <Button onClick={handleStartMFASetup} disabled={isMFALoading} className="w-full gap-2">
                {isMFALoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Enable Two-Factor Authentication
              </Button>
            </>
          )}
        </CardContent>
      </Card>


      {/* MFA Setup Dialog */}
      <Dialog open={showMFASetup} onOpenChange={setShowMFASetup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Set Up Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>Scan this QR code with your authenticator app</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {mfaQrCode && (
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg">
                  <img src={mfaQrCode} alt="MFA QR Code" className="w-48 h-48" />
                </div>
              </div>
            )}

            {mfaSecret && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">Or enter this code manually:</p>
                <div className="p-3 bg-muted rounded-lg">
                  <code className="text-sm font-mono break-all text-center block">{mfaSecret}</code>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Enter the 6-digit code from your app:</p>
              <Input
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-widest"
                maxLength={6}
              />
            </div>

            <Button onClick={handleVerifyMFA} disabled={verificationCode.length !== 6 || isVerifying} className="w-full">
              {isVerifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Verify & Enable
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recovery Codes Dialog */}
      <Dialog open={showRecoveryCodes} onOpenChange={setShowRecoveryCodes}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-600" />
              Recovery Codes
            </DialogTitle>
            <DialogDescription>
              Save these codes in a secure place. Each code can only be used once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  These codes will not be shown again. Save them now!
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {recoveryCodes.map((code, index) => (
                  <code key={index} className="text-sm font-mono p-2 bg-white dark:bg-gray-900 rounded border text-center">
                    {code}
                  </code>
                ))}
              </div>
            </div>

            <Button onClick={copyRecoveryCodes} variant="outline" className="w-full gap-2">
              <Copy className="h-4 w-4" />
              Copy All Codes
            </Button>

            <Button onClick={() => setShowRecoveryCodes(false)} className="w-full">
              I've Saved My Codes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
