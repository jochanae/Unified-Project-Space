export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_notes: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body?: string;
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_call_log: {
        Row: {
          called_at: string;
          function_name: string;
          id: number;
          user_id: string;
        };
        Insert: {
          called_at?: string;
          function_name: string;
          id?: number;
          user_id: string;
        };
        Update: {
          called_at?: string;
          function_name?: string;
          id?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      app_error_logs: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          metadata: Json;
          route: string | null;
          source: string;
          stack_trace: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          metadata?: Json;
          route?: string | null;
          source: string;
          stack_trace?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          metadata?: Json;
          route?: string | null;
          source?: string;
          stack_trace?: string | null;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          created_at: string;
          id: string;
          setting_key: string;
          setting_value: Json;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          setting_key: string;
          setting_value?: Json;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          setting_key?: string;
          setting_value?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      banned_users: {
        Row: {
          banned_at: string;
          banned_by: string | null;
          reason: string | null;
          user_id: string;
        };
        Insert: {
          banned_at?: string;
          banned_by?: string | null;
          reason?: string | null;
          user_id: string;
        };
        Update: {
          banned_at?: string;
          banned_by?: string | null;
          reason?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      board_items: {
        Row: {
          audio_reflection: boolean;
          caption: string | null;
          created_at: string;
          external_url: string | null;
          id: string;
          kind: string;
          position: number;
          ref_id: string | null;
          subkind: string | null;
          thumbnail_url: string | null;
          title: string | null;
          updated_at: string;
          user_id: string;
          video_id: string | null;
          video_provider: string | null;
        };
        Insert: {
          audio_reflection?: boolean;
          caption?: string | null;
          created_at?: string;
          external_url?: string | null;
          id?: string;
          kind: string;
          position?: number;
          ref_id?: string | null;
          subkind?: string | null;
          thumbnail_url?: string | null;
          title?: string | null;
          updated_at?: string;
          user_id: string;
          video_id?: string | null;
          video_provider?: string | null;
        };
        Update: {
          audio_reflection?: boolean;
          caption?: string | null;
          created_at?: string;
          external_url?: string | null;
          id?: string;
          kind?: string;
          position?: number;
          ref_id?: string | null;
          subkind?: string | null;
          thumbnail_url?: string | null;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
          video_id?: string | null;
          video_provider?: string | null;
        };
        Relationships: [];
      };
      boards: {
        Row: {
          bio: string | null;
          created_at: string;
          featured_scripture_ref: string | null;
          published: boolean;
          show_bible_link: boolean;
          theme: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          bio?: string | null;
          created_at?: string;
          featured_scripture_ref?: string | null;
          published?: boolean;
          show_bible_link?: boolean;
          theme?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          bio?: string | null;
          created_at?: string;
          featured_scripture_ref?: string | null;
          published?: boolean;
          show_bible_link?: boolean;
          theme?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      bookmarks: {
        Row: {
          book: string;
          chapter: number;
          created_at: string;
          id: string;
          user_id: string;
          verse: number;
          version: string;
        };
        Insert: {
          book: string;
          chapter: number;
          created_at?: string;
          id?: string;
          user_id: string;
          verse: number;
          version?: string;
        };
        Update: {
          book?: string;
          chapter?: number;
          created_at?: string;
          id?: string;
          user_id?: string;
          verse?: number;
          version?: string;
        };
        Relationships: [];
      };
      calendar_tokens: {
        Row: {
          created_at: string;
          rotated_at: string;
          token: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          rotated_at?: string;
          token?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          rotated_at?: string;
          token?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      deep_dive_history: {
        Row: {
          book: string;
          chapter: number;
          created_at: string;
          id: string;
          prompt: string;
          provider: string;
          reference_label: string;
          url: string;
          user_id: string;
          verse_end: number | null;
          verse_start: number | null;
        };
        Insert: {
          book: string;
          chapter: number;
          created_at?: string;
          id?: string;
          prompt: string;
          provider: string;
          reference_label: string;
          url: string;
          user_id: string;
          verse_end?: number | null;
          verse_start?: number | null;
        };
        Update: {
          book?: string;
          chapter?: number;
          created_at?: string;
          id?: string;
          prompt?: string;
          provider?: string;
          reference_label?: string;
          url?: string;
          user_id?: string;
          verse_end?: number | null;
          verse_start?: number | null;
        };
        Relationships: [];
      };
      faith_goals: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          percent_of_income: number | null;
          target_cents: number;
          updated_at: string;
          user_id: string;
          year: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          percent_of_income?: number | null;
          target_cents: number;
          updated_at?: string;
          user_id: string;
          year: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          percent_of_income?: number | null;
          target_cents?: number;
          updated_at?: string;
          user_id?: string;
          year?: number;
        };
        Relationships: [];
      };
      finance_entries: {
        Row: {
          amount_cents: number;
          category: Database["public"]["Enums"]["contribution_category"];
          created_at: string;
          entry_date: string;
          id: string;
          memo: string | null;
          method: string | null;
          payment_link_id: string | null;
          recipient: string | null;
          updated_at: string;
          user_id: string;
          verified: boolean;
        };
        Insert: {
          amount_cents: number;
          category?: Database["public"]["Enums"]["contribution_category"];
          created_at?: string;
          entry_date?: string;
          id?: string;
          memo?: string | null;
          method?: string | null;
          payment_link_id?: string | null;
          recipient?: string | null;
          updated_at?: string;
          user_id: string;
          verified?: boolean;
        };
        Update: {
          amount_cents?: number;
          category?: Database["public"]["Enums"]["contribution_category"];
          created_at?: string;
          entry_date?: string;
          id?: string;
          memo?: string | null;
          method?: string | null;
          payment_link_id?: string | null;
          recipient?: string | null;
          updated_at?: string;
          user_id?: string;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "finance_entries_payment_link_id_fkey";
            columns: ["payment_link_id"];
            isOneToOne: false;
            referencedRelation: "user_payment_links";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: {
          body_text: string;
          book: string | null;
          chapter: number | null;
          created_at: string;
          id: string;
          ink_strokes: Json | null;
          note_type: string;
          scripture_ref: string | null;
          updated_at: string;
          user_id: string;
          verse: number | null;
        };
        Insert: {
          body_text?: string;
          book?: string | null;
          chapter?: number | null;
          created_at?: string;
          id?: string;
          ink_strokes?: Json | null;
          note_type?: string;
          scripture_ref?: string | null;
          updated_at?: string;
          user_id: string;
          verse?: number | null;
        };
        Update: {
          body_text?: string;
          book?: string | null;
          chapter?: number | null;
          created_at?: string;
          id?: string;
          ink_strokes?: Json | null;
          note_type?: string;
          scripture_ref?: string | null;
          updated_at?: string;
          user_id?: string;
          verse?: number | null;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          created_at: string;
          daily_verse_enabled: boolean;
          daily_verse_time: string;
          id: string;
          plan_reminders_enabled: boolean;
          timezone: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          daily_verse_enabled?: boolean;
          daily_verse_time?: string;
          id?: string;
          plan_reminders_enabled?: boolean;
          timezone?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          daily_verse_enabled?: boolean;
          daily_verse_time?: string;
          id?: string;
          plan_reminders_enabled?: boolean;
          timezone?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          action_url: string | null;
          body: string;
          category: string;
          created_at: string;
          delivered_at: string | null;
          id: string;
          meta: Json;
          priority: string;
          read_at: string | null;
          scheduled_for: string | null;
          silent: boolean;
          title: string;
          user_id: string;
        };
        Insert: {
          action_url?: string | null;
          body?: string;
          category: string;
          created_at?: string;
          delivered_at?: string | null;
          id?: string;
          meta?: Json;
          priority?: string;
          read_at?: string | null;
          scheduled_for?: string | null;
          silent?: boolean;
          title: string;
          user_id: string;
        };
        Update: {
          action_url?: string | null;
          body?: string;
          category?: string;
          created_at?: string;
          delivered_at?: string | null;
          id?: string;
          meta?: Json;
          priority?: string;
          read_at?: string | null;
          scheduled_for?: string | null;
          silent?: boolean;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      plan_events: {
        Row: {
          category: string;
          created_at: string;
          description: string | null;
          ends_at: string;
          id: string;
          location: string | null;
          plan_id: string | null;
          rrule: string | null;
          source: string;
          starts_at: string;
          timezone: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category?: string;
          created_at?: string;
          description?: string | null;
          ends_at: string;
          id?: string;
          location?: string | null;
          plan_id?: string | null;
          rrule?: string | null;
          source?: string;
          starts_at: string;
          timezone?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string | null;
          ends_at?: string;
          id?: string;
          location?: string | null;
          plan_id?: string | null;
          rrule?: string | null;
          source?: string;
          starts_at?: string;
          timezone?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      poems: {
        Row: {
          anchor: string;
          body: string;
          created_at: string;
          deep_dive: Json | null;
          id: string;
          inspiration: string | null;
          line: string;
          praise: string;
          tags: string[];
          template: Database["public"]["Enums"]["poem_template"];
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          anchor?: string;
          body?: string;
          created_at?: string;
          deep_dive?: Json | null;
          id?: string;
          inspiration?: string | null;
          line?: string;
          praise?: string;
          tags?: string[];
          template?: Database["public"]["Enums"]["poem_template"];
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          anchor?: string;
          body?: string;
          created_at?: string;
          deep_dive?: Json | null;
          id?: string;
          inspiration?: string | null;
          line?: string;
          praise?: string;
          tags?: string[];
          template?: Database["public"]["Enums"]["poem_template"];
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_mode: string;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          display_name: string | null;
          handle: string | null;
          id: string;
          preferred_ai_provider: string;
          updated_at: string;
        };
        Insert: {
          avatar_mode?: string;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          handle?: string | null;
          id: string;
          preferred_ai_provider?: string;
          updated_at?: string;
        };
        Update: {
          avatar_mode?: string;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          handle?: string | null;
          id?: string;
          preferred_ai_provider?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_events: {
        Row: {
          created_at: string;
          endpoint_hash: string | null;
          error: string | null;
          event_type: string;
          id: string;
          meta: Json;
          notification_id: string | null;
          status_code: number | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          endpoint_hash?: string | null;
          error?: string | null;
          event_type: string;
          id?: string;
          meta?: Json;
          notification_id?: string | null;
          status_code?: number | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          endpoint_hash?: string | null;
          error?: string | null;
          event_type?: string;
          id?: string;
          meta?: Json;
          notification_id?: string | null;
          status_code?: number | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          created_at: string;
          endpoint: string;
          id: string;
          subscription: Json;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          endpoint: string;
          id?: string;
          subscription: Json;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          endpoint?: string;
          id?: string;
          subscription?: Json;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      reader_position_history: {
        Row: {
          book: string;
          book_index: number;
          chapter: number;
          id: string;
          user_id: string;
          verse: number | null;
          version: string;
          visited_at: string;
        };
        Insert: {
          book: string;
          book_index: number;
          chapter: number;
          id?: string;
          user_id: string;
          verse?: number | null;
          version?: string;
          visited_at?: string;
        };
        Update: {
          book?: string;
          book_index?: number;
          chapter?: number;
          id?: string;
          user_id?: string;
          verse?: number | null;
          version?: string;
          visited_at?: string;
        };
        Relationships: [];
      };
      reader_positions: {
        Row: {
          book: string;
          book_index: number;
          chapter: number;
          created_at: string;
          updated_at: string;
          user_id: string;
          verse: number | null;
          version: string;
        };
        Insert: {
          book: string;
          book_index: number;
          chapter: number;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          verse?: number | null;
          version?: string;
        };
        Update: {
          book?: string;
          book_index?: number;
          chapter?: number;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          verse?: number | null;
          version?: string;
        };
        Relationships: [];
      };
      reader_resume_events: {
        Row: {
          book: string | null;
          chapter: number | null;
          created_at: string;
          event_type: string;
          id: string;
          metadata: Json;
          user_id: string;
          verse: number | null;
          version: string | null;
        };
        Insert: {
          book?: string | null;
          chapter?: number | null;
          created_at?: string;
          event_type: string;
          id?: string;
          metadata?: Json;
          user_id: string;
          verse?: number | null;
          version?: string | null;
        };
        Update: {
          book?: string | null;
          chapter?: number | null;
          created_at?: string;
          event_type?: string;
          id?: string;
          metadata?: Json;
          user_id?: string;
          verse?: number | null;
          version?: string | null;
        };
        Relationships: [];
      };
      reading_plans: {
        Row: {
          book: string;
          created_at: string;
          id: string;
          start_chapter: number;
          started_at: string;
          status: Database["public"]["Enums"]["reading_plan_status"];
          target_chapters_per_day: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          book: string;
          created_at?: string;
          id?: string;
          start_chapter: number;
          started_at?: string;
          status?: Database["public"]["Enums"]["reading_plan_status"];
          target_chapters_per_day?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          book?: string;
          created_at?: string;
          id?: string;
          start_chapter?: number;
          started_at?: string;
          status?: Database["public"]["Enums"]["reading_plan_status"];
          target_chapters_per_day?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      reading_progress: {
        Row: {
          chapter: number;
          completed_at: string;
          created_at: string;
          id: string;
          plan_id: string;
          user_id: string;
        };
        Insert: {
          chapter: number;
          completed_at?: string;
          created_at?: string;
          id?: string;
          plan_id: string;
          user_id: string;
        };
        Update: {
          chapter?: number;
          completed_at?: string;
          created_at?: string;
          id?: string;
          plan_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reading_progress_user_plan_fk";
            columns: ["plan_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "reading_plans";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      reserved_handles: {
        Row: {
          created_at: string;
          handle: string;
          reason: string;
        };
        Insert: {
          created_at?: string;
          handle: string;
          reason?: string;
        };
        Update: {
          created_at?: string;
          handle?: string;
          reason?: string;
        };
        Relationships: [];
      };
      selah_chat_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          role: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      sermon_pins: {
        Row: {
          book: string;
          chapter: number;
          created_at: string;
          id: string;
          position: number;
          scripture_ref: string;
          sermon_id: string;
          user_id: string;
          verse_end: number | null;
          verse_start: number | null;
          version: string;
        };
        Insert: {
          book: string;
          chapter: number;
          created_at?: string;
          id?: string;
          position?: number;
          scripture_ref: string;
          sermon_id: string;
          user_id: string;
          verse_end?: number | null;
          verse_start?: number | null;
          version?: string;
        };
        Update: {
          book?: string;
          chapter?: number;
          created_at?: string;
          id?: string;
          position?: number;
          scripture_ref?: string;
          sermon_id?: string;
          user_id?: string;
          verse_end?: number | null;
          verse_start?: number | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sermon_pins_sermon_id_fkey";
            columns: ["sermon_id"];
            isOneToOne: false;
            referencedRelation: "sermons";
            referencedColumns: ["id"];
          },
        ];
      };
      sermon_research: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          kind: string;
          position: number;
          sermon_id: string;
          source_label: string | null;
          source_url: string | null;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          position?: number;
          sermon_id: string;
          source_label?: string | null;
          source_url?: string | null;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          position?: number;
          sermon_id?: string;
          source_label?: string | null;
          source_url?: string | null;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sermon_research_sermon_id_fkey";
            columns: ["sermon_id"];
            isOneToOne: false;
            referencedRelation: "sermons";
            referencedColumns: ["id"];
          },
        ];
      };
      sermon_scratchpads: {
        Row: {
          body: string;
          created_at: string;
          sermon_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body?: string;
          created_at?: string;
          sermon_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          sermon_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sermon_scratchpads_sermon_id_fkey";
            columns: ["sermon_id"];
            isOneToOne: true;
            referencedRelation: "sermons";
            referencedColumns: ["id"];
          },
        ];
      };
      sermon_versions: {
        Row: {
          created_at: string;
          id: string;
          manuscript: string;
          notes: string | null;
          outline: Json | null;
          sermon_id: string;
          user_id: string;
          version_number: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          manuscript?: string;
          notes?: string | null;
          outline?: Json | null;
          sermon_id: string;
          user_id: string;
          version_number: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          manuscript?: string;
          notes?: string | null;
          outline?: Json | null;
          sermon_id?: string;
          user_id?: string;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sermon_versions_sermon_id_fkey";
            columns: ["sermon_id"];
            isOneToOne: false;
            referencedRelation: "sermons";
            referencedColumns: ["id"];
          },
        ];
      };
      sermons: {
        Row: {
          audience: string | null;
          created_at: string;
          current_version: number;
          id: string;
          length_target: string | null;
          manuscript: string;
          outline: Json | null;
          scripture_ref: string | null;
          scripture_text: string | null;
          status: string;
          theme: string | null;
          title: string;
          tone: string | null;
          tradition: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          audience?: string | null;
          created_at?: string;
          current_version?: number;
          id?: string;
          length_target?: string | null;
          manuscript?: string;
          outline?: Json | null;
          scripture_ref?: string | null;
          scripture_text?: string | null;
          status?: string;
          theme?: string | null;
          title?: string;
          tone?: string | null;
          tradition?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          audience?: string | null;
          created_at?: string;
          current_version?: number;
          id?: string;
          length_target?: string | null;
          manuscript?: string;
          outline?: Json | null;
          scripture_ref?: string | null;
          scripture_text?: string | null;
          status?: string;
          theme?: string | null;
          title?: string;
          tone?: string | null;
          tradition?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      study_circuit_sessions: {
        Row: {
          collection_color: string;
          collection_id: string;
          collection_title: string;
          current_index: number;
          started_at: string;
          stops: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          collection_color?: string;
          collection_id: string;
          collection_title: string;
          current_index?: number;
          started_at?: string;
          stops?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          collection_color?: string;
          collection_id?: string;
          collection_title?: string;
          current_index?: number;
          started_at?: string;
          stops?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_circuit_sessions_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "vault_collections";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          billing_interval: string | null;
          created_at: string;
          current_period_end: string | null;
          id: string;
          status: string;
          stripe_customer_id: string | null;
          stripe_price_id: string | null;
          stripe_subscription_id: string | null;
          tier: Database["public"]["Enums"]["app_role"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          billing_interval?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_price_id?: string | null;
          stripe_subscription_id?: string | null;
          tier?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          billing_interval?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_price_id?: string | null;
          stripe_subscription_id?: string | null;
          tier?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_notification_settings: {
        Row: {
          created_at: string;
          enabled: boolean;
          mode: string;
          quiet_hours_end: number;
          quiet_hours_start: number;
          service_window_day: number | null;
          service_window_end: number | null;
          service_window_start: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          mode?: string;
          quiet_hours_end?: number;
          quiet_hours_start?: number;
          service_window_day?: number | null;
          service_window_end?: number | null;
          service_window_start?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          mode?: string;
          quiet_hours_end?: number;
          quiet_hours_start?: number;
          service_window_day?: number | null;
          service_window_end?: number | null;
          service_window_start?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_payment_links: {
        Row: {
          created_at: string;
          handle: string | null;
          id: string;
          kind: string;
          label: string;
          position: number;
          updated_at: string;
          url: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          handle?: string | null;
          id?: string;
          kind?: string;
          label: string;
          position?: number;
          updated_at?: string;
          url: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          handle?: string | null;
          id?: string;
          kind?: string;
          label?: string;
          position?: number;
          updated_at?: string;
          url?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      vault_collections: {
        Row: {
          archived: boolean;
          color: string;
          created_at: string;
          description: string | null;
          id: string;
          master_thought: string | null;
          position: number;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          archived?: boolean;
          color?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          master_thought?: string | null;
          position?: number;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          archived?: boolean;
          color?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          master_thought?: string | null;
          position?: number;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      vault_items: {
        Row: {
          book: string | null;
          chapter: number | null;
          collection_id: string;
          created_at: string;
          id: string;
          item_type: string;
          note_text: string | null;
          position: number;
          quote_text: string | null;
          scripture_ref: string | null;
          updated_at: string;
          user_id: string;
          verse_end: number | null;
          verse_start: number | null;
          version: string | null;
        };
        Insert: {
          book?: string | null;
          chapter?: number | null;
          collection_id: string;
          created_at?: string;
          id?: string;
          item_type?: string;
          note_text?: string | null;
          position?: number;
          quote_text?: string | null;
          scripture_ref?: string | null;
          updated_at?: string;
          user_id: string;
          verse_end?: number | null;
          verse_start?: number | null;
          version?: string | null;
        };
        Update: {
          book?: string | null;
          chapter?: number | null;
          collection_id?: string;
          created_at?: string;
          id?: string;
          item_type?: string;
          note_text?: string | null;
          position?: number;
          quote_text?: string | null;
          scripture_ref?: string | null;
          updated_at?: string;
          user_id?: string;
          verse_end?: number | null;
          verse_start?: number | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vault_items_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "vault_collections";
            referencedColumns: ["id"];
          },
        ];
      };
      verse_highlights: {
        Row: {
          book: string;
          chapter: number;
          created_at: string;
          id: string;
          tone: string;
          updated_at: string;
          user_id: string;
          verse_end: number;
          verse_start: number;
          version: string;
        };
        Insert: {
          book: string;
          chapter: number;
          created_at?: string;
          id?: string;
          tone?: string;
          updated_at?: string;
          user_id: string;
          verse_end: number;
          verse_start: number;
          version?: string;
        };
        Update: {
          book?: string;
          chapter?: number;
          created_at?: string;
          id?: string;
          tone?: string;
          updated_at?: string;
          user_id?: string;
          verse_end?: number;
          verse_start?: number;
          version?: string;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          error_message: string | null;
          event_type: string;
          id: string;
          metadata: Json;
          processed_at: string | null;
          received_at: string;
          source: string;
          status: string;
          stripe_event_id: string | null;
        };
        Insert: {
          error_message?: string | null;
          event_type: string;
          id?: string;
          metadata?: Json;
          processed_at?: string | null;
          received_at?: string;
          source?: string;
          status?: string;
          stripe_event_id?: string | null;
        };
        Update: {
          error_message?: string | null;
          event_type?: string;
          id?: string;
          metadata?: Json;
          processed_at?: string | null;
          received_at?: string;
          source?: string;
          status?: string;
          stripe_event_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_ai_access: {
        Args: { _function: string; _user_id: string };
        Returns: Json;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "free" | "minister" | "admin" | "church_partner";
      contribution_category: "tithe" | "offering" | "dues" | "other";
      poem_template: "heart_cry" | "psalm" | "proverb";
      reading_plan_status: "active" | "complete";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["free", "minister", "admin", "church_partner"],
      contribution_category: ["tithe", "offering", "dues", "other"],
      poem_template: ["heart_cry", "psalm", "proverb"],
      reading_plan_status: ["active", "complete"],
    },
  },
} as const;
