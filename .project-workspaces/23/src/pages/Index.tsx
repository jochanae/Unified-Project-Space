import { SidebarProvider } from '@/components/ui/sidebar';
import { ProjectSidebar } from '@/features/projects';
import { ProjectView } from '@/features/projects';
import { CinematicDock } from '@/features/quinn';
import { ParticleMeshBackground } from '@/components/shared/ParticleMeshBackground';
import { CheckoutSuccess } from '@/features/billing';
import { useFunnelHub } from '@/features/projects';
import { useBuildStream } from '@/features/quinn';
import { useSubscription } from '@/features/billing';
import { useMomentumNudge } from '@/hooks/use-momentum-nudge';
import { useLocation } from 'react-router-dom';

export default function Index() {
  const { theme } = useFunnelHub();
  const buildStream = useBuildStream();
  const { checkSubscription } = useSubscription();
  const location = useLocation();
  const incomingPrompt = (location.state as any)?.prompt as string | undefined;
  useMomentumNudge();

  return (
    <SidebarProvider>
      <ParticleMeshBackground theme={theme} />
      <CheckoutSuccess onRefreshSubscription={checkSubscription} />
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col w-full relative z-10 pointer-events-auto" style={{ margin: 0, padding: 0 }}>
        <div className="flex flex-1 w-full overflow-hidden">
          <ProjectSidebar />
          <main className="flex-1 min-w-0 overflow-auto pb-40">
            <ProjectView buildStream={buildStream} initialPrompt={incomingPrompt} />
          </main>
        </div>
      </div>
      <CinematicDock
        buildResult={buildStream.result}
        onUpdateResult={buildStream.updateResult}
      />
    </SidebarProvider>
  );
}
