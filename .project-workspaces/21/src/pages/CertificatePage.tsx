import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useBetaSerial } from '@/hooks/useBetaSerial';
import FoundingMemberCertificate from '@/components/FoundingMemberCertificate';
import SanctuaryKeysSection from '@/components/SanctuaryKeysSection';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CertificatePage() {
  const navigate = useNavigate();
  const serial = useBetaSerial();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      const { data } = await supabase
        .from('profiles')
        .select('user_name, preferred_name')
        .eq('user_id', user.id)
        .single();
      setUserName(data?.preferred_name || data?.user_name || 'Founding Member');
    })();
  }, [navigate]);

  if (!serial || !userName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8 pb-32 sm:pb-40" style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom, 0px))' }}>
      <div className="max-w-xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-1.5 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="text-center space-y-2">
          <p className="text-[10px] uppercase tracking-[0.5em] text-primary/60 font-medium">
            🛰️ Project Compani
          </p>
          <h1 className="text-2xl font-extralight tracking-tight text-foreground">
            Your Founding Member <span className="text-primary">Inscription</span>
          </h1>
          <p className="text-xs text-muted-foreground/50">
            Share on LinkedIn, Instagram, or save for your records.
          </p>
        </div>

        <FoundingMemberCertificate
          serialNumber={serial}
          userName={userName}
        />

        <SanctuaryKeysSection />
      </div>
    </div>
  );
}
