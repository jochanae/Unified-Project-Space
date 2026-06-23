import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MFAFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
  created_at: string;
}

export function useMFA() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current MFA factors
  const listFactors = async (): Promise<MFAFactor[]> => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data?.totp || [];
    } catch (err) {
      console.error('Failed to list MFA factors:', err);
      return [];
    }
  };

  // Check if MFA is enabled
  const isMFAEnabled = async (): Promise<boolean> => {
    const factors = await listFactors();
    return factors.some(f => f.status === 'verified');
  };

  // Enroll in MFA - returns QR code URI and secret
  const enrollMFA = async (): Promise<{ qrCode: string; secret: string; factorId: string } | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });

      if (error) throw error;

      setIsLoading(false);
      return {
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        factorId: data.id,
      };
    } catch (err: any) {
      console.error('MFA enrollment error:', err);
      setError(err.message || 'Failed to set up MFA');
      setIsLoading(false);
      return null;
    }
  };

  // Verify MFA enrollment with code from authenticator
  const verifyEnrollment = async (factorId: string, code: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) throw verifyError;

      setIsLoading(false);
      return true;
    } catch (err: any) {
      console.error('MFA verification error:', err);
      setError(err.message || 'Invalid verification code');
      setIsLoading(false);
      return false;
    }
  };

  // Disable MFA
  const unenrollMFA = async (factorId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;

      setIsLoading(false);
      return true;
    } catch (err: any) {
      console.error('MFA unenroll error:', err);
      setError(err.message || 'Failed to disable MFA');
      setIsLoading(false);
      return false;
    }
  };

  // Verify MFA code during login
  const verifyMFACode = async (factorId: string, code: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) throw verifyError;

      setIsLoading(false);
      return true;
    } catch (err: any) {
      console.error('MFA login verification error:', err);
      setError(err.message || 'Invalid verification code');
      setIsLoading(false);
      return false;
    }
  };

  // Get current assurance level
  const getAssuranceLevel = async (): Promise<{ currentLevel: string; nextLevel: string | null; factorId: string | null }> => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;

      // Get factor ID from the first TOTP factor if available
      const factors = await supabase.auth.mfa.listFactors();
      const verifiedFactor = factors.data?.totp?.find(f => f.status === 'verified');

      return {
        currentLevel: data.currentLevel || 'aal1',
        nextLevel: data.nextLevel,
        factorId: verifiedFactor?.id || null,
      };
    } catch (err) {
      console.error('Failed to get assurance level:', err);
      return { currentLevel: 'aal1', nextLevel: null, factorId: null };
    }
  };

  // Generate recovery codes (10 codes) using server-side bcrypt hashing
  const generateRecoveryCodes = async (): Promise<string[] | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('mfa-recovery', {
        body: { action: 'generate' }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to generate recovery codes');

      setIsLoading(false);
      return data.codes;
    } catch (err: any) {
      console.error('Failed to generate recovery codes:', err);
      setError(err.message || 'Failed to generate recovery codes');
      setIsLoading(false);
      return null;
    }
  };

  // Get remaining recovery codes count
  const getRecoveryCodesCount = async (): Promise<number> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('mfa_recovery_codes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_used', false);

      if (error) throw error;
      return count || 0;
    } catch (err) {
      console.error('Failed to get recovery codes count:', err);
      return 0;
    }
  };

  return {
    listFactors,
    isMFAEnabled,
    enrollMFA,
    verifyEnrollment,
    unenrollMFA,
    verifyMFACode,
    getAssuranceLevel,
    generateRecoveryCodes,
    getRecoveryCodesCount,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}
