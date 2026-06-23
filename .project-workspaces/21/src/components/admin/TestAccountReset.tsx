import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FlaskConical, RotateCcw, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { clearFreshExperienceState, clearProfileSessionState } from '@/lib/sessionReset';

const TEST_USER_ID = '61725001-fe52-415f-992b-21ad41526ea7';

export default function TestAccountReset() {
  const [resetting, setResetting] = useState(false);
  const [lastReset, setLastReset] = useState<string | null>(null);

  const handleReset = async () => {
    setResetting(true);
    try {
      const { error } = await supabase.rpc('reset_test_account', {
        p_test_user_id: TEST_USER_ID,
      } as any);

      if (error) throw error;

      // Clear all localStorage ceremony flags so the test account gets a fresh experience
      clearFreshExperienceState();
      clearProfileSessionState();
      localStorage.removeItem('compani-home-anchor');

      setLastReset(new Date().toLocaleTimeString());
      toast.success('Test account reset complete', {
        description: 'Sign in as demo@mycompani.app in a fresh incognito window to replay the full new-user flow.',
      });
    } catch (err: any) {
      toast.error('Reset failed', { description: err.message });
    } finally {
      setResetting(false);
    }
  };

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-amber-500" />
          Test Account Reset
          <Badge variant="outline" className="ml-auto text-[10px] border-amber-500/40 text-amber-400">
            Serial #000
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Resets <span className="text-foreground font-medium">demo@mycompani.app</span> to a fresh state — 
          clears DOB, onboarding, founding reveal flags, connections, chat history, and milestones. 
          Serial #000 is preserved (never burns a real slot).
        </p>
        <div className="text-[10px] text-muted-foreground/60 space-y-0.5">
          <p>Fresh-start flags now clear automatically when the reset account signs back in.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleReset}
            disabled={resetting}
            variant="outline"
            className="gap-1.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
          >
            {resetting ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            {resetting ? 'Resetting…' : 'Reset Test Account'}
          </Button>

          {lastReset && (
            <span className="text-[10px] text-green-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Last reset: {lastReset}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
