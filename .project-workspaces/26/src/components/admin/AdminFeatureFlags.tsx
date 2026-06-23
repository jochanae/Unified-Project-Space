import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, ToggleLeft } from 'lucide-react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { toast } from 'sonner';

const CATEGORY_COLORS: Record<string, string> = {
  family: 'bg-lime-500/20 text-lime-300',
  planning: 'bg-violet-500/20 text-violet-300',
  money: 'bg-orange-500/20 text-orange-300',
  learning: 'bg-teal-500/20 text-teal-300',
  business: 'bg-blue-500/20 text-blue-300',
  core: 'bg-pink-500/20 text-pink-300',
};

export function AdminFeatureFlags() {
  const { flags, loading, toggleFlag } = useFeatureFlags();
  const [toggling, setToggling] = useState<string | null>(null);

  const handleToggle = async (key: string, enabled: boolean) => {
    setToggling(key);
    const success = await toggleFlag(key, enabled);
    if (success) {
      toast.success(`${enabled ? 'Enabled' : 'Disabled'} feature: ${key}`);
    } else {
      toast.error('Failed to update feature flag');
    }
    setToggling(null);
  };

  if (loading) {
    return (
      <Card className="bg-white/10 border-white/20">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-white/60" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/10 border-white/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <ToggleLeft className="h-5 w-5 text-emerald-400" />
          Feature Toggles
        </CardTitle>
        <p className="text-xs text-white/60">Enable or disable app sections globally</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {flags.map((flag) => (
          <div
            key={flag.feature_key}
            className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{flag.feature_name}</span>
                  {flag.category && (
                    <Badge className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[flag.category] || 'bg-white/10 text-white/60'}`}>
                      {flag.category}
                    </Badge>
                  )}
                </div>
                {flag.description && (
                  <p className="text-xs text-white/50 mt-0.5">{flag.description}</p>
                )}
              </div>
            </div>
            <Switch
              checked={flag.is_enabled}
              onCheckedChange={(checked) => handleToggle(flag.feature_key, checked)}
              disabled={toggling === flag.feature_key}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
