export type NoteType = 'Note' | 'Plan' | 'Idea' | 'Hypothesis' | 'Result' | 'Backlog';
export type LinkCategory = 'Social' | 'Email' | 'Ads' | 'Analytics' | 'Other';
export type Theme = 'cinematic' | 'editorial' | 'minimal';

export type BlockType = 'hero' | 'text' | 'cta' | 'image' | 'testimonial' | 'optin' | 'video' | 'audio' | 'countdown' | 'faq' | 'pricing' | 'divider' | 'columns' | 'youtube' | 'tiktok' | 'heygen' | 'calendly' | 'scheduler' | 'checkout' | 'upsell';

export type FormFieldType = 'text' | 'select' | 'radio' | 'checkbox';

export interface FormCondition {
  /** ID of the field whose value controls visibility */
  field: string;
  /** The field must equal this value for this field to show */
  equals: string;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  /** Comma-separated option list for select / radio */
  options?: string;
  required?: boolean;
  /** If set, this field is hidden until the condition is met */
  show_if?: FormCondition;
}

export interface BrandColors {
  primary: string;
  accent: string;
  background: string;
  text: string;
}

export interface NoteCard {
  id: string;
  type: NoteType;
  title: string;
  body: string;
  links: string[];
  done: boolean;
  createdAt: string;
}

export interface FunnelStep {
  id: string;
  order: number;
  title: string;
  description: string;
  link: string;
  completed: boolean;
}

export interface LinkItem {
  id: string;
  title: string;
  url: string;
  category: LinkCategory;
}

export interface PageBlock {
  id: string;
  type: BlockType;
  content: Record<string, string>;
}

export interface FunnelPage {
  id: string;
  title: string;
  blocks: PageBlock[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  notes: NoteCard[];
  funnelSteps: FunnelStep[];
  links: LinkItem[];
  pages: FunnelPage[];
  createdAt: string;
}

export interface AppState {
  projects: Project[];
  activeProjectId: string | null;
  theme: Theme;
}
