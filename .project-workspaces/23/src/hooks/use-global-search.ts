import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { TEMPLATES } from '@/data/templates';

import { dispatchQuickAction } from '@/lib/quick-actions';
import { KnowledgeItem } from '@/features/knowledge/types';

export type SearchCategory =
  'navigation' | 'actions' | 'projects' | 'pages' |
  'notes' | 'leads' | 'templates' | 'help' | 'knowledge' | 'recent' | 'videos';

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  category: SearchCategory;
  icon: string; // lucide icon name as string
  action: () => void;
  badge?: string; // e.g. "Published", "Draft"
}

type StaticSearchResult = Omit<SearchResult, 'action'>;

const RECENTS_KEY = 'intoiq_search_recents';
const MAX_RECENTS = 5;

interface RecentItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  path: string;
  ts: number;
}

function loadRecents(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

export function pushRecent(item: Omit<RecentItem, 'ts'>) {
  try {
    const existing = loadRecents().filter(r => r.id !== item.id);
    const next = [{ ...item, ts: Date.now() }, ...existing].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

const NAVIGATION_RESULTS: StaticSearchResult[] = [
  { id: 'nav-dashboard', title: 'Dashboard', subtitle: 'Workspace overview', category: 'navigation', icon: 'Home' },
  { id: 'nav-projects', title: 'My Projects', subtitle: 'View all funnels', category: 'navigation', icon: 'Layers' },
  { id: 'nav-builder', title: 'Intelligence Builder', subtitle: 'Build funnels with MarQ AI', category: 'navigation', icon: 'Sparkles' },
  { id: 'nav-signal-lab', title: 'Signal Lab', subtitle: 'Find your brand signal', category: 'navigation', icon: 'Radio' },
  { id: 'nav-strategy', title: 'Strategy Blueprint', subtitle: 'Map your growth architecture', category: 'navigation', icon: 'TrendingUp' },
  { id: 'nav-analytics', title: 'Analytics', subtitle: 'Funnel performance', category: 'navigation', icon: 'BarChart3' },
  { id: 'nav-social-lab', title: 'Social Lab', subtitle: 'Multi-platform social content', category: 'navigation', icon: 'Sparkles' },
  { id: 'nav-launch', title: 'Quick Launch', subtitle: 'Idea to live funnel in minutes', category: 'navigation', icon: 'Rocket' },
  { id: 'nav-logo', title: 'Logo Generator', subtitle: 'Build your brand mark', category: 'navigation', icon: 'Camera' },
  { id: 'nav-settings', title: 'Settings', subtitle: 'Account and preferences', category: 'navigation', icon: 'Settings' },
  { id: 'nav-help', title: 'Help & FAQs', subtitle: 'Guides and support', category: 'navigation', icon: 'HelpCircle' },
  { id: 'nav-learn', title: 'Learn', subtitle: 'Knowledge library', category: 'navigation', icon: 'BookOpen' },
];

const ACTION_RESULTS: StaticSearchResult[] = [
  { id: 'action-new-project', title: 'New Project', subtitle: 'Create a fresh funnel', category: 'actions', icon: 'Plus' },
  { id: 'action-new-lead', title: 'New Lead', subtitle: 'Add a contact to your pipeline', category: 'actions', icon: 'UserPlus' },
  
  { id: 'action-export-analytics', title: 'Export Analytics', subtitle: 'Download contacts & funnel data as CSV', category: 'actions', icon: 'Download' },
  { id: 'action-builder', title: 'Open Builder', subtitle: 'Go to MarQ workspace', category: 'actions', icon: 'Sparkles' },
  { id: 'action-quinn-chat', title: 'Chat with MarQ', subtitle: 'Open the intelligence engine', category: 'actions', icon: 'MessageSquare' },
  { id: 'action-launch', title: 'Quick Launch', subtitle: 'Idea to funnel in minutes', category: 'actions', icon: 'Rocket' },
  { id: 'action-clear-workspace', title: 'Clear Workspace', subtitle: 'Activate Zero-Trace and wipe local data', category: 'actions', icon: 'ShieldOff' },
];

const TEMPLATE_RESULTS: StaticSearchResult[] = TEMPLATES.map((t) => ({
  id: `template-${t.id}`,
  title: t.name,
  subtitle: t.description,
  category: 'templates',
  icon: 'LayoutTemplate',
  badge: t.category,
}));

const HELP_QUESTIONS = [
  'What is IntoIQ',
  'How does MarQ work',
  'What is Signal Lab',
  'How do I publish my landing pages',
  'What is the Build Stream',
  'How does billing work',
  'What is Identity Lock',
  'What is Style Signal',
  'How do I add a custom domain',
  'What are Funnel Templates',
  'How do A/B tests work',
  'How do I export my leads',
  'What is the Pulse Command Map',
  'How do I cancel my subscription',
];

const HELP_RESULTS: StaticSearchResult[] = HELP_QUESTIONS.map((question, idx) => ({
  id: `help-${idx + 1}`,
  title: question,
  subtitle: 'View in Help',
  category: 'help',
  icon: 'BookOpen',
}));

const STATIC_RESULTS: StaticSearchResult[] = [
  ...NAVIGATION_RESULTS,
  ...ACTION_RESULTS,
  ...TEMPLATE_RESULTS,
  ...HELP_RESULTS,
];

export function useGlobalSearch(query: string) {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [dbResults, setDbResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [vaultItems, setVaultItems] = useState<KnowledgeItem[]>([]);

  useEffect(() => {
    if (query.length === 0) setRecents(loadRecents());
  }, [query]);

  // Load admin-managed Knowledge Vault, refresh on changes
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      supabase
        .from('knowledge_items')
        .select('*')
        .eq('is_published', true)
        .order('is_featured', { ascending: false })
        .order('order_index', { ascending: true })
        .then(({ data }) => {
          if (!cancelled && data) setVaultItems(data as KnowledgeItem[]);
        });
    };
    load();

    const channel = supabase
      .channel('global-search-knowledge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'knowledge_items' }, () => load())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const trackAndNavigate = (item: Omit<RecentItem, 'ts'>) => {
    pushRecent(item);
    navigate(item.path);
  };

  // Attach navigate actions to static results
  const navigationActions: Record<string, () => void> = {
    'nav-dashboard': () => trackAndNavigate({ id: 'nav-dashboard', title: 'Dashboard', subtitle: 'Workspace overview', icon: 'Home', path: '/dashboard' }),
    'nav-projects': () => trackAndNavigate({ id: 'nav-projects', title: 'My Projects', subtitle: 'View all funnels', icon: 'Layers', path: '/projects' }),
    'nav-builder': () => trackAndNavigate({ id: 'nav-builder', title: 'Intelligence Builder', icon: 'Sparkles', path: '/workspace' }),
    'nav-signal-lab': () => trackAndNavigate({ id: 'nav-signal-lab', title: 'Signal Lab', subtitle: 'Find your brand signal', icon: 'Radio', path: '/signal-lab' }),
    'nav-strategy': () => trackAndNavigate({ id: 'nav-strategy', title: 'Strategy Blueprint', subtitle: 'Map your growth architecture', icon: 'TrendingUp', path: '/strategy' }),
    'nav-analytics': () => trackAndNavigate({ id: 'nav-analytics', title: 'Analytics', subtitle: 'Funnel performance', icon: 'BarChart3', path: '/analytics' }),
    'nav-social-lab': () => trackAndNavigate({ id: 'nav-social-lab', title: 'Social Lab', subtitle: 'Multi-platform social content', icon: 'Sparkles', path: '/studio?tab=social' }),
    'nav-launch': () => trackAndNavigate({ id: 'nav-launch', title: 'Quick Launch', subtitle: 'Idea to live funnel', icon: 'Rocket', path: '/launch' }),
    'nav-logo': () => trackAndNavigate({ id: 'nav-logo', title: 'Logo Generator', subtitle: 'Build your brand mark', icon: 'Camera', path: '/logo-generator' }),
    'nav-settings': () => trackAndNavigate({ id: 'nav-settings', title: 'Settings', subtitle: 'Account and preferences', icon: 'Settings', path: '/settings' }),
    'nav-help': () => trackAndNavigate({ id: 'nav-help', title: 'Help & FAQs', subtitle: 'Guides and support', icon: 'HelpCircle', path: '/help' }),
    
    'action-new-project': () => trackAndNavigate({ id: 'action-new-project', title: 'New Project', icon: 'Plus', path: '/projects' }),
    'action-builder': () => trackAndNavigate({ id: 'action-builder', title: 'Open Builder', icon: 'Sparkles', path: '/workspace' }),
    'action-quinn-chat': () => trackAndNavigate({ id: 'action-quinn-chat', title: 'Chat with MarQ', icon: 'MessageSquare', path: '/workspace' }),
    'action-launch': () => trackAndNavigate({ id: 'action-launch', title: 'Quick Launch', icon: 'Rocket', path: '/launch' }),
    
    'action-new-lead': () => dispatchQuickAction('open-new-lead'),
    'action-export-analytics': () => dispatchQuickAction('export-analytics'),
    'action-clear-workspace': () => dispatchQuickAction('open-zero-trace'),
    'action-signal': () => trackAndNavigate({ id: 'action-signal', title: 'Run Signal Lab', icon: 'Zap', path: '/signal-lab' }),
    'action-strategy': () => trackAndNavigate({ id: 'action-strategy', title: 'Generate Strategy Blueprint', icon: 'Map', path: '/strategy' }),
  };

  const staticWithActions: SearchResult[] = STATIC_RESULTS.map(r => ({
    ...r,
    action: navigationActions[r.id] ||
      (r.category === 'help'
        ? () => navigate('/help')
        : () => navigate('/workspace', {
          state: { templateName: r.title }
        }))
  }));

  // Filter static results by query
  const q = query.toLowerCase().trim();
  const filteredStatic = q.length < 2
    ? staticWithActions.filter(r =>
      r.category === 'navigation' || r.category === 'actions'
    ).slice(0, 20)
    : staticWithActions.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.subtitle?.toLowerCase().includes(q) ||
      r.badge?.toLowerCase().includes(q)
    );

  // Knowledge Vault: featured items pinned when no query, full-text match on query
  const vaultResults: SearchResult[] = (() => {
    const mapItem = (item: KnowledgeItem): SearchResult => ({
      id: `vault-${item.id}`,
      title: item.title,
      subtitle: item.subtitle,
      category: 'knowledge' as SearchCategory,
      icon: item.category === 'goal' ? 'Target' : item.category === 'feature' ? 'Zap' : 'BookOpen',
      badge: item.is_featured ? 'Featured' : item.topic,
      action: () => window.dispatchEvent(new CustomEvent('knowledge:open', { detail: { itemId: item.id } })),
    });

    if (q.length === 0) {
      return vaultItems.filter((i) => i.is_featured).slice(0, 4).map(mapItem);
    }

    return vaultItems
      .filter((i) =>
        i.title.toLowerCase().includes(q) ||
        i.subtitle.toLowerCase().includes(q) ||
        i.search_keywords.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 6)
      .map(mapItem);
  })();



  // Recent items only when query is empty
  const recentResults: SearchResult[] = q.length === 0
    ? recents.map(r => ({
      id: `recent-${r.id}`,
      title: r.title,
      subtitle: r.subtitle,
      category: 'recent' as SearchCategory,
      icon: r.icon,
      badge: 'Recent',
      action: () => navigate(r.path),
    }))
    : [];

  // DB search — fires when query >= 2 chars
  useEffect(() => {
    if (!user?.orgId || q.length < 2) {
      setDbResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [projectsRes, pagesRes, notesRes, leadsRes] =
          await Promise.all([
            supabase.from('projects')
              .select('id, name, goal')
              .eq('org_id', user.orgId)
              .ilike('name', `%${q}%`)
              .limit(5),
            supabase.from('pages')
              .select('id, title, slug, is_published, project_id')
              .eq('org_id', user.orgId)
              .ilike('title', `%${q}%`)
              .limit(5),
            supabase.from('notes')
              .select('id, title, body, project_id')
              .eq('org_id', user.orgId)
              .or(`title.ilike.%${q}%,body.ilike.%${q}%`)
              .limit(5),
            supabase.from('contacts')
              .select('id, email, first_name, last_name')
              .eq('org_id', user.orgId)
              .or(`email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
              .limit(3),
          ]);

        const results: SearchResult[] = [
          ...(projectsRes.data || []).map(p => ({
            id: `project-${p.id}`,
            title: p.name,
            subtitle: p.goal || 'Funnel project',
            category: 'projects' as SearchCategory,
            icon: 'Layers',
            badge: 'Project',
            action: () => navigate('/workspace'),
          })),
          ...(pagesRes.data || []).map(p => ({
            id: `page-${p.id}`,
            title: p.title || 'Untitled page',
            subtitle: p.is_published ? 'Published' : 'Draft',
            category: 'pages' as SearchCategory,
            icon: 'FileText',
            badge: p.is_published ? 'Live' : 'Draft',
            action: () => navigate('/workspace'),
          })),
          ...(notesRes.data || []).map(n => ({
            id: `note-${n.id}`,
            title: n.title || n.body?.slice(0, 40) || 'Note',
            subtitle: n.body?.slice(0, 60) || '',
            category: 'notes' as SearchCategory,
            icon: 'StickyNote',
            action: () => navigate('/workspace'),
          })),
          ...(leadsRes.data || []).map(l => {
            const fullName = [l.first_name, l.last_name].filter(Boolean).join(' ').trim();
            return {
              id: `lead-${l.id}`,
              title: fullName || l.email,
              subtitle: l.email,
              category: 'leads' as SearchCategory,
              icon: 'User',
              badge: 'Lead',
              action: () => navigate('/analytics'),
            };
          }),
        ];

        setDbResults(results);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [q, user?.orgId, navigate]);

  // Group results by category
  const allResults = [...recentResults, ...filteredStatic, ...vaultResults, ...dbResults];
  const grouped = allResults.reduce((acc, result) => {
    if (!acc[result.category]) acc[result.category] = [];
    acc[result.category].push(result);
    return acc;
  }, {} as Record<SearchCategory, SearchResult[]>);

  return { grouped, isSearching, total: allResults.length };
}
