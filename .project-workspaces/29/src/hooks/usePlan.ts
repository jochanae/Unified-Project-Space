import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Plan {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlanSection {
  id: string;
  user_id: string;
  plan_id: string | null;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  is_default: boolean;
  is_collapsed: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanItem {
  id: string;
  user_id: string;
  section_id: string | null;
  title: string;
  description: string | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high';
  source_type: 'manual' | 'quinn_suggestion' | 'imported';
  source_conversation_id: string | null;
  source_message_content: string | null;
  notes: string | null;
  completed_at: string | null;
  target_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlanSectionWithItems extends PlanSection {
  items: PlanItem[];
}

export interface PlanWithSections extends Plan {
  sections: PlanSectionWithItems[];
}

export function usePlan() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Fetch all plans
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return (data || []) as Plan[];
    },
    enabled: !!user?.id,
  });

  // Set default plan when plans load
  const activePlanId = selectedPlanId || plans.find(p => p.is_default)?.id || plans[0]?.id;
  const activePlan = plans.find(p => p.id === activePlanId);

  // Fetch sections for active plan
  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ['plan-sections', user?.id, activePlanId],
    queryFn: async () => {
      if (!user?.id || !activePlanId) return [];
      const { data, error } = await supabase
        .from('plan_sections')
        .select('*')
        .eq('user_id', user.id)
        .eq('plan_id', activePlanId)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return (data || []) as PlanSection[];
    },
    enabled: !!user?.id && !!activePlanId,
  });

  // Fetch items for sections of active plan
  const sectionIds = sections.map(s => s.id);
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['plan-items', user?.id, activePlanId, sectionIds],
    queryFn: async () => {
      if (!user?.id || sectionIds.length === 0) return [];
      const { data, error } = await supabase
        .from('plan_items')
        .select('*')
        .eq('user_id', user.id)
        .in('section_id', sectionIds)
        .neq('status', 'archived')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as PlanItem[];
    },
    enabled: !!user?.id && sectionIds.length > 0,
  });

  // Combine sections with their items
  const sectionsWithItems: PlanSectionWithItems[] = sections.map(section => ({
    ...section,
    items: items.filter(item => item.section_id === section.id),
  }));

  // Stats for active plan
  const stats = {
    total: items.length,
    completed: items.filter(i => i.status === 'completed').length,
    inProgress: items.filter(i => i.status === 'in_progress').length,
    notStarted: items.filter(i => i.status === 'not_started').length,
  };

  // Select a plan
  const selectPlan = useCallback((planId: string) => {
    setSelectedPlanId(planId);
  }, []);

  // Add plan
  const addPlan = useMutation({
    mutationFn: async (plan: { name: string; description?: string; icon?: string; color?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const maxOrder = Math.max(...plans.map(p => p.sort_order ?? 0), -1);
      
      const { data, error } = await supabase
        .from('plans')
        .insert({
          user_id: user.id,
          name: plan.name,
          description: plan.description || null,
          icon: plan.icon || 'target',
          color: plan.color || 'primary',
          sort_order: maxOrder + 1,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Plan;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setSelectedPlanId(data.id);
      toast.success('Plan created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create plan: ${error.message}`);
    },
  });

  // Update plan
  const updatePlan = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Plan> & { id: string }) => {
      const { data, error } = await supabase
        .from('plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update plan: ${error.message}`);
    },
  });

  // Delete plan
  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plan-sections'] });
      queryClient.invalidateQueries({ queryKey: ['plan-items'] });
      setSelectedPlanId(null);
      toast.success('Plan deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete plan: ${error.message}`);
    },
  });

  // Add section (to active plan)
  const addSection = useMutation({
    mutationFn: async (section: { name: string; icon?: string; color?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!activePlanId) throw new Error('No plan selected');
      
      const maxOrder = Math.max(...sections.map(s => s.sort_order), -1);
      
      const { data, error } = await supabase
        .from('plan_sections')
        .insert({
          user_id: user.id,
          plan_id: activePlanId,
          name: section.name,
          icon: section.icon || 'target',
          color: section.color || 'primary',
          sort_order: maxOrder + 1,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as PlanSection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-sections'] });
      toast.success('Section created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create section: ${error.message}`);
    },
  });

  // Update section
  const updateSection = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlanSection> & { id: string }) => {
      const { plan_id, user_id, created_at, updated_at, ...safeUpdates } = updates;
      const { data, error } = await supabase
        .from('plan_sections')
        .update(safeUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as PlanSection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-sections'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update section: ${error.message}`);
    },
  });

  // Delete section
  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('plan_sections')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-sections'] });
      queryClient.invalidateQueries({ queryKey: ['plan-items'] });
      toast.success('Section deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete section: ${error.message}`);
    },
  });

  // Add item
  const addItem = useMutation({
    mutationFn: async (item: {
      title: string;
      description?: string;
      section_id?: string;
      priority?: 'low' | 'medium' | 'high';
      source_type?: 'manual' | 'quinn_suggestion' | 'imported';
      source_conversation_id?: string;
      source_message_content?: string;
      target_date?: string;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const sectionItems = items.filter(i => i.section_id === item.section_id);
      const maxOrder = Math.max(...sectionItems.map(i => i.sort_order), -1);
      
      const { data, error } = await supabase
        .from('plan_items')
        .insert({
          user_id: user.id,
          title: item.title,
          description: item.description || null,
          section_id: item.section_id || null,
          priority: item.priority || 'medium',
          source_type: item.source_type || 'manual',
          source_conversation_id: item.source_conversation_id || null,
          source_message_content: item.source_message_content || null,
          target_date: item.target_date || null,
          notes: item.notes || null,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-items'] });
      toast.success('Added to your plan');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add item: ${error.message}`);
    },
  });

  // Update item
  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlanItem> & { id: string }) => {
      // If marking as completed, set completed_at
      if (updates.status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('plan_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plan-items'] });
      if (data.status === 'completed') {
        toast.success('Nice work! Item marked complete');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to update item: ${error.message}`);
    },
  });

  // Delete item
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('plan_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-items'] });
      toast.success('Item removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete item: ${error.message}`);
    },
  });

  // Archive item (soft delete)
  const archiveItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('plan_items')
        .update({ status: 'archived' })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-items'] });
      toast.success('Item archived');
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive item: ${error.message}`);
    },
  });

  return {
    // Plans
    plans,
    activePlan,
    activePlanId,
    selectPlan,
    addPlan: addPlan.mutateAsync,
    updatePlan: updatePlan.mutateAsync,
    deletePlan: deletePlan.mutateAsync,
    // Sections
    sections,
    sectionsWithItems,
    addSection: addSection.mutateAsync,
    updateSection: updateSection.mutateAsync,
    deleteSection: deleteSection.mutateAsync,
    // Items
    items,
    stats,
    addItem: addItem.mutateAsync,
    updateItem: updateItem.mutateAsync,
    deleteItem: deleteItem.mutateAsync,
    archiveItem: archiveItem.mutateAsync,
    // Loading
    isLoading: plansLoading || sectionsLoading || itemsLoading,
  };
}
