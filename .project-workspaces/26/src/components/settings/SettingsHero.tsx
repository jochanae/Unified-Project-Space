import { Link } from 'react-router-dom';
import { ArrowLeft, Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SettingsHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function SettingsHero({ searchQuery, onSearchChange }: SettingsHeroProps) {
  return (
    <div className="relative">
      {/* Decorative circles */}
      <div className="absolute -left-20 top-0 w-60 h-60 rounded-full bg-blue-200/40 dark:bg-blue-900/20" />
      <div className="absolute right-10 top-10 w-40 h-40 rounded-full bg-purple-200/40 dark:bg-purple-900/20" />
      
      <div className="relative z-10 py-6 px-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-sm font-medium">Settings</h1>
          </div>
        </div>

        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-primary mb-2">Settings</h2>
            <p className="text-muted-foreground">Manage your account and preferences</p>
          </div>
          <Button variant="ghost" size="icon" className="bg-purple-100 dark:bg-purple-900/30 rounded-full" asChild>
            <Link to="/">
              <Home className="h-5 w-5" />
            </Link>
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-background"
          />
        </div>
      </div>
    </div>
  );
}
