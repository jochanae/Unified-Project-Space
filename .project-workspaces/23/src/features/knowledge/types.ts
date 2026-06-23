export type KnowledgeCategory = 'topic' | 'goal' | 'feature';
export type KnowledgeSkillLevel = 'beginner' | 'intermediate' | 'advanced';

export interface KnowledgeItem {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  category: KnowledgeCategory;
  topic: string;
  skill_level: KnowledgeSkillLevel;
  tags: string[];
  search_keywords: string;
  feature_link: string | null;
  feature_link_label: string | null;
  read_minutes: number;
  is_featured: boolean;
  is_published: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export type KnowledgeItemInput = Partial<
  Omit<KnowledgeItem, 'id' | 'created_at' | 'updated_at'>
> & { title: string };
