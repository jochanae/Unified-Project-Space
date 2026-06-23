import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Fingerprint, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';

interface PasskeyButtonProps {
  mode: 'register' | 'login';
  email?: string;
  className?: string;
  onSuccess?: () => void;
}

export function PasskeyButton({ mode, email, className, onSuccess }: PasskeyButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const isSupported = browserSupportsWebAuthn();

  const handleRegisterPasskey = async () => {
    setIsLoading(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        toast.error('Please sign in first to register a passkey');
        return;
      }

      // Get registration options from edge function
      const { data: optionsData, error: optionsError } = await supabase.functions.invoke(
        'webauthn-register-options',
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );

      if (optionsError || !optionsData?.options) {
        throw new Error(optionsError?.message || 'Failed to get registration options');
      }

      // Convert base64 challenge to ArrayBuffer for WebAuthn
      const options = {
        ...optionsData.options,
        challenge: Uint8Array.from(atob(optionsData.options.challenge), c => c.charCodeAt(0)),
        user: {
          ...optionsData.options.user,
          id: Uint8Array.from(atob(optionsData.options.user.id), c => c.charCodeAt(0)),
        },
        excludeCredentials: optionsData.options.excludeCredentials?.map((cred: any) => ({
          ...cred,
          id: Uint8Array.from(atob(cred.id), c => c.charCodeAt(0)),
        })),
      };

      // Start WebAuthn registration
      const credential = await startRegistration({ optionsJSON: options });

      // Verify registration with edge function
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        'webauthn-register-verify',
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: { 
            credential: {
              ...credential,
              response: {
                ...credential.response,
                publicKey: credential.response.publicKey,
                attestationObject: credential.response.attestationObject,
              }
            }, 
            challenge: optionsData.challenge 
          },
        }
      );

      if (verifyError || !verifyData?.success) {
        throw new Error(verifyError?.message || 'Failed to verify registration');
      }

      toast.success('Passkey registered successfully! You can now use biometrics to sign in.');
      onSuccess?.();
    } catch (error: any) {
      console.error('Passkey registration error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Passkey registration was cancelled');
      } else if (error.name === 'InvalidStateError') {
        toast.error('This device already has a passkey registered');
      } else {
        toast.error(error.message || 'Failed to register passkey');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginWithPasskey = async () => {
    if (!email) {
      toast.error('Please enter your email first');
      return;
    }

    setIsLoading(true);
    try {
      // Get authentication options
      const { data: optionsData, error: optionsError } = await supabase.functions.invoke(
        'webauthn-login-options',
        { body: { email } }
      );

      if (optionsError || !optionsData?.options) {
        throw new Error(optionsError?.message || optionsData?.error || 'Failed to get login options');
      }

      // Convert base64 challenge to ArrayBuffer
      const options = {
        ...optionsData.options,
        challenge: Uint8Array.from(atob(optionsData.options.challenge), c => c.charCodeAt(0)),
        allowCredentials: optionsData.options.allowCredentials?.map((cred: any) => ({
          ...cred,
          id: Uint8Array.from(atob(cred.id), c => c.charCodeAt(0)),
        })),
      };

      // Start WebAuthn authentication
      const credential = await startAuthentication({ optionsJSON: options });

      // Verify authentication
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        'webauthn-login-verify',
        { 
          body: { 
            credential, 
            challenge: optionsData.challenge,
            userId: optionsData.userId,
            email
          } 
        }
      );

      if (verifyError || !verifyData?.success) {
        throw new Error(verifyError?.message || 'Failed to verify authentication');
      }

      // Use the magic link token to sign in
      if (verifyData.token && verifyData.type) {
        const { error: signInError } = await supabase.auth.verifyOtp({
          token_hash: verifyData.token,
          type: verifyData.type,
        });

        if (signInError) {
          // Fallback: redirect to the magic link
          window.location.href = verifyData.redirectUrl;
          return;
        }
      }

      toast.success('Signed in with passkey!');
      onSuccess?.();
    } catch (error: any) {
      console.error('Passkey login error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Passkey authentication was cancelled');
      } else {
        toast.error(error.message || 'Failed to sign in with passkey');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return null; // Don't show button if WebAuthn isn't supported
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={mode === 'register' ? handleRegisterPasskey : handleLoginWithPasskey}
      disabled={isLoading || (mode === 'login' && !email)}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Fingerprint className="h-4 w-4 mr-2" />
      )}
      {mode === 'register' ? 'Add Passkey' : 'Sign in with Passkey'}
    </Button>
  );
}
