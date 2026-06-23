import { Sun, Moon, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useFunnelHub } from '@/features/projects';
import { Theme } from '@/types/funnelhub';

const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'cinematic', label: 'Cinematic', icon: <Moon className="h-4 w-4" /> },
  { value: 'editorial', label: 'Editorial', icon: <Sun className="h-4 w-4" /> },
  { value: 'minimal', label: 'Minimal', icon: <span className="flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/30"><Minus className="h-2.5 w-2.5" /></span> },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useFunnelHub();
  const current = themes.find(t => t.value === theme)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-foreground/60 hover:text-foreground hover:bg-muted/50 h-8 w-8">
          {current.icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themes.map(t => (
          <DropdownMenuItem key={t.value} onClick={() => setTheme(t.value)} className={theme === t.value ? 'font-semibold' : ''}>
            <span className="mr-2">{t.icon}</span> {t.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
