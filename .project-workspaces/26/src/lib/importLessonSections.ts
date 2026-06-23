import { supabase } from "@/integrations/supabase/client";
import lessonSectionsData from "@/data/lesson_sections-import.json";

interface LessonSection {
  id: string;
  lessonId: string;
  sectionNumber: number;
  title: string;
  content: string;
  sectionType: string;
  estimatedMinutes: number;
  keyPoints: string[];
  createdAt: string;
  updatedAt: string;
}

export async function importLessonSections(onProgress?: (current: number, total: number) => void) {
  const sections = lessonSectionsData as LessonSection[];
  const batchSize = 50;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < sections.length; i += batchSize) {
    const batch = sections.slice(i, i + batchSize);
    
    const records = batch.map(section => ({
      id: section.id,
      lesson_id: section.lessonId,
      section_number: section.sectionNumber,
      title: section.title,
      content: section.content,
      section_type: section.sectionType,
      estimated_minutes: section.estimatedMinutes,
      key_points: section.keyPoints,
      created_at: section.createdAt,
      updated_at: section.updatedAt
    }));

    const { error } = await (supabase
      .from('lesson_sections' as any)
      .upsert(records, { onConflict: 'id' }) as any);

    if (error) {
      console.error('Batch insert error:', error);
      errors += batch.length;
    } else {
      imported += batch.length;
    }

    if (onProgress) {
      onProgress(i + batch.length, sections.length);
    }
  }

  return { imported, errors, total: sections.length };
}
