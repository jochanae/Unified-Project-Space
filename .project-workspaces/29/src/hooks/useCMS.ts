import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface LessonCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  category_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration_minutes: number | null;
  sort_order: number;
  status: 'draft' | 'published' | 'archived';
  thumbnail_url: string | null;
  video_url: string | null;
  key_takeaways: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: LessonCategory;
}

export interface EducationalVideo {
  id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  sort_order: number;
  status: 'draft' | 'published' | 'archived';
  is_featured: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: LessonCategory;
}

export interface EducationalResource {
  id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  resource_url: string;
  resource_type: string;
  icon: string | null;
  sort_order: number;
  status: 'draft' | 'published' | 'archived';
  is_featured: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: LessonCategory;
}

// Categories hooks
export function useCategories() {
  return useQuery({
    queryKey: ['lesson-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as LessonCategory[];
    },
  });
}

export function useCategoryMutations() {
  const queryClient = useQueryClient();

  const createCategory = useMutation({
    mutationFn: async (category: Omit<LessonCategory, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('lesson_categories')
        .insert(category)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-categories'] });
      toast.success('Category created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LessonCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('lesson_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-categories'] });
      toast.success('Category updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lesson_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });

  return { createCategory, updateCategory, deleteCategory };
}

// Lessons hooks
export function useLessons() {
  return useQuery({
    queryKey: ['admin-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*, category:lesson_categories(*)')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as Lesson[];
    },
  });
}

export function useLessonMutations() {
  const queryClient = useQueryClient();

  const createLesson = useMutation({
    mutationFn: async (lesson: Partial<Omit<Lesson, 'id' | 'created_at' | 'updated_at' | 'category'>> & { title: string; slug: string }) => {
      const { data, error } = await supabase
        .from('lessons')
        .insert(lesson)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons'] });
      toast.success('Lesson created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create lesson: ${error.message}`);
    },
  });

  const updateLesson = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lesson> & { id: string }) => {
      const { data, error } = await supabase
        .from('lessons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons'] });
      toast.success('Lesson updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update lesson: ${error.message}`);
    },
  });

  const deleteLesson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons'] });
      toast.success('Lesson deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete lesson: ${error.message}`);
    },
  });

  return { createLesson, updateLesson, deleteLesson };
}

// Videos hooks
export function useVideos() {
  return useQuery({
    queryKey: ['admin-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('educational_videos')
        .select('*, category:lesson_categories(*)')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as EducationalVideo[];
    },
  });
}

export function useVideoMutations() {
  const queryClient = useQueryClient();

  const createVideo = useMutation({
    mutationFn: async (video: Partial<Omit<EducationalVideo, 'id' | 'created_at' | 'updated_at' | 'category'>> & { title: string; video_url: string }) => {
      const { data, error } = await supabase
        .from('educational_videos')
        .insert(video)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] });
      toast.success('Video created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create video: ${error.message}`);
    },
  });

  const updateVideo = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EducationalVideo> & { id: string }) => {
      const { data, error } = await supabase
        .from('educational_videos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] });
      toast.success('Video updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update video: ${error.message}`);
    },
  });

  const deleteVideo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('educational_videos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] });
      toast.success('Video deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete video: ${error.message}`);
    },
  });

  return { createVideo, updateVideo, deleteVideo };
}

// Resources hooks
export function useResources() {
  return useQuery({
    queryKey: ['admin-resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('educational_resources')
        .select('*, category:lesson_categories(*)')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as EducationalResource[];
    },
  });
}

export function useResourceMutations() {
  const queryClient = useQueryClient();

  const createResource = useMutation({
    mutationFn: async (resource: Partial<Omit<EducationalResource, 'id' | 'created_at' | 'updated_at' | 'category'>> & { title: string; resource_url: string }) => {
      const { data, error } = await supabase
        .from('educational_resources')
        .insert(resource)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-resources'] });
      toast.success('Resource created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create resource: ${error.message}`);
    },
  });

  const updateResource = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EducationalResource> & { id: string }) => {
      const { data, error } = await supabase
        .from('educational_resources')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-resources'] });
      toast.success('Resource updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update resource: ${error.message}`);
    },
  });

  const deleteResource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('educational_resources')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-resources'] });
      toast.success('Resource deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete resource: ${error.message}`);
    },
  });

  return { createResource, updateResource, deleteResource };
}
