export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      allowance_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          kid_profile_id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          kid_profile_id: string
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          kid_profile_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "allowance_transactions_kid_profile_id_fkey"
            columns: ["kid_profile_id"]
            isOneToOne: false
            referencedRelation: "kid_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_test_step_results: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          passed: boolean
          sort_order: number
          step_category: string
          step_description: string | null
          step_name: string
          submission_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          passed?: boolean
          sort_order?: number
          step_category: string
          step_description?: string | null
          step_name: string
          submission_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          passed?: boolean
          sort_order?: number
          step_category?: string
          step_description?: string | null
          step_name?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_test_step_results_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "beta_test_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_test_submissions: {
        Row: {
          admin_notes: string | null
          browser_info: string | null
          created_at: string
          device_info: string | null
          general_feedback: string | null
          id: string
          overall_rating: number | null
          status: string
          suggestions: string | null
          tester_email: string
          tester_name: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          browser_info?: string | null
          created_at?: string
          device_info?: string | null
          general_feedback?: string | null
          id?: string
          overall_rating?: number | null
          status?: string
          suggestions?: string | null
          tester_email: string
          tester_name: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          browser_info?: string | null
          created_at?: string
          device_info?: string | null
          general_feedback?: string | null
          id?: string
          overall_rating?: number | null
          status?: string
          suggestions?: string | null
          tester_email?: string
          tester_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      bills: {
        Row: {
          amount: number
          category: string
          created_at: string
          due_day: number
          id: string
          is_autopay: boolean
          is_paid_this_month: boolean
          last_paid_at: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          due_day?: number
          id?: string
          is_autopay?: boolean
          is_paid_this_month?: boolean
          last_paid_at?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          due_day?: number
          id?: string
          is_autopay?: boolean
          is_paid_this_month?: boolean
          last_paid_at?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_name: string
          category: string
          content: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string
          category?: string
          content: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          category?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bot_reply_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          min_hours_quiet: number | null
          reply_templates: string[]
          trigger_keywords: string[] | null
          trigger_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          min_hours_quiet?: number | null
          reply_templates: string[]
          trigger_keywords?: string[] | null
          trigger_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          min_hours_quiet?: number | null
          reply_templates?: string[]
          trigger_keywords?: string[] | null
          trigger_type?: string
        }
        Relationships: []
      }
      budget_entries: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          entry_date: string
          id: string
          is_recurring: boolean
          recurring_interval: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          entry_date?: string
          id?: string
          is_recurring?: boolean
          recurring_interval?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          entry_date?: string
          id?: string
          is_recurring?: boolean
          recurring_interval?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          room_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          room_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          asset_class: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          asset_class?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          asset_class?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      community_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          admin_notes: string | null
          content_id: string
          content_type: string
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          content_id: string
          content_type: string
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          kid_profile_id: string | null
          messages: Json | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kid_profile_id?: string | null
          messages?: Json | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kid_profile_id?: string | null
          messages?: Json | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_kid_profile_id_fkey"
            columns: ["kid_profile_id"]
            isOneToOne: false
            referencedRelation: "kid_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_prompts: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          day_of_month: number | null
          day_of_week: number | null
          frequency: string
          id: string
          is_active: boolean | null
          last_posted_at: string | null
          next_post_at: string | null
          tags: string[] | null
          time_of_day: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          frequency: string
          id?: string
          is_active?: boolean | null
          last_posted_at?: string | null
          next_post_at?: string | null
          tags?: string[] | null
          time_of_day?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_posted_at?: string | null
          next_post_at?: string | null
          tags?: string[] | null
          time_of_day?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      discussion_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          is_solution: boolean
          likes_count: number
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_solution?: boolean
          likes_count?: number
          thread_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_solution?: boolean
          likes_count?: number
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "discussion_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_threads: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_locked: boolean
          is_pinned: boolean
          last_activity_at: string
          replies_count: number
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          views_count: number
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          is_locked?: boolean
          is_pinned?: boolean
          last_activity_at?: string
          replies_count?: number
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          views_count?: number
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_locked?: boolean
          is_pinned?: boolean
          last_activity_at?: string
          replies_count?: number
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          views_count?: number
        }
        Relationships: []
      }
      educational_resources: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_featured: boolean
          resource_type: string
          resource_url: string
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_featured?: boolean
          resource_type?: string
          resource_url: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_featured?: boolean
          resource_type?: string
          resource_url?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "educational_resources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "lesson_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      educational_videos: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          is_featured: boolean
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_featured?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_featured?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "educational_videos_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "lesson_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          admin_notes: string | null
          created_at: string
          error_data: Json | null
          id: string
          message: string
          page_url: string | null
          rating: number | null
          status: string
          title: string | null
          type: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          error_data?: Json | null
          id?: string
          message: string
          page_url?: string | null
          rating?: number | null
          status?: string
          title?: string | null
          type: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          error_data?: Json | null
          id?: string
          message?: string
          page_url?: string | null
          rating?: number | null
          status?: string
          title?: string | null
          type?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      kid_achievements: {
        Row: {
          achievement_id: string
          achievement_type: string
          created_at: string
          earned_at: string
          emoji: string | null
          id: string
          kid_profile_id: string
          metadata: Json | null
          title: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          achievement_type?: string
          created_at?: string
          earned_at?: string
          emoji?: string | null
          id?: string
          kid_profile_id: string
          metadata?: Json | null
          title: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          achievement_type?: string
          created_at?: string
          earned_at?: string
          emoji?: string | null
          id?: string
          kid_profile_id?: string
          metadata?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kid_achievements_kid_profile_id_fkey"
            columns: ["kid_profile_id"]
            isOneToOne: false
            referencedRelation: "kid_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kid_goals: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          current_amount: number | null
          description: string | null
          emoji: string | null
          id: string
          is_template: boolean | null
          kid_profile_id: string | null
          portfolio_id: string | null
          stars_reward: number | null
          status: string
          target_amount: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          completed_at?: string | null
          created_at?: string
          current_amount?: number | null
          description?: string | null
          emoji?: string | null
          id?: string
          is_template?: boolean | null
          kid_profile_id?: string | null
          portfolio_id?: string | null
          stars_reward?: number | null
          status?: string
          target_amount?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          current_amount?: number | null
          description?: string | null
          emoji?: string | null
          id?: string
          is_template?: boolean | null
          kid_profile_id?: string | null
          portfolio_id?: string | null
          stars_reward?: number | null
          status?: string
          target_amount?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kid_goals_kid_profile_id_fkey"
            columns: ["kid_profile_id"]
            isOneToOne: false
            referencedRelation: "kid_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kid_goals_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "kid_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      kid_portfolios: {
        Row: {
          balance: number
          created_at: string
          id: string
          initial_balance: number
          total_stars_earned: number
          trades_completed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          initial_balance?: number
          total_stars_earned?: number
          trades_completed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          initial_balance?: number
          total_stars_earned?: number
          trades_completed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kid_profiles: {
        Row: {
          allowance_balance: number
          avatar_preset: string
          avatar_url: string | null
          card_design: string
          created_at: string
          display_name: string
          id: string
          pin_hash: string | null
          portfolio_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allowance_balance?: number
          avatar_preset?: string
          avatar_url?: string | null
          card_design?: string
          created_at?: string
          display_name: string
          id?: string
          pin_hash?: string | null
          portfolio_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allowance_balance?: number
          avatar_preset?: string
          avatar_url?: string | null
          card_design?: string
          created_at?: string
          display_name?: string
          id?: string
          pin_hash?: string | null
          portfolio_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kid_profiles_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "kid_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      kid_trades: {
        Row: {
          company_name: string | null
          created_at: string
          emoji: string | null
          entry_date: string
          entry_price: number
          exit_date: string | null
          exit_price: number | null
          id: string
          notes: string | null
          portfolio_id: string
          profit_loss: number | null
          quantity: number
          status: string
          symbol: string
          trade_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          emoji?: string | null
          entry_date?: string
          entry_price: number
          exit_date?: string | null
          exit_price?: number | null
          id?: string
          notes?: string | null
          portfolio_id: string
          profit_loss?: number | null
          quantity: number
          status?: string
          symbol: string
          trade_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          emoji?: string | null
          entry_date?: string
          entry_price?: number
          exit_date?: string | null
          exit_price?: number | null
          id?: string
          notes?: string | null
          portfolio_id?: string
          profit_loss?: number | null
          quantity?: number
          status?: string
          symbol?: string
          trade_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kid_trades_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "kid_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          category_id: string | null
          content: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          duration_minutes: number | null
          id: string
          key_takeaways: string[] | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          duration_minutes?: number | null
          id?: string
          key_takeaways?: string[] | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          duration_minutes?: number | null
          id?: string
          key_takeaways?: string[] | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "lesson_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      linked_accounts: {
        Row: {
          access_token: string | null
          account_id: string | null
          account_name: string | null
          created_at: string
          id: string
          metadata: Json | null
          provider: string
          refresh_token: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          provider: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          provider?: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      live_streams: {
        Row: {
          created_at: string
          description: string | null
          ended_at: string | null
          id: string
          is_live: boolean
          platform: string
          scheduled_at: string | null
          stream_url: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          viewers_count: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          is_live?: boolean
          platform?: string
          scheduled_at?: string | null
          stream_url: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          viewers_count?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          is_live?: boolean
          platform?: string
          scheduled_at?: string | null
          stream_url?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          viewers_count?: number
        }
        Relationships: []
      }
      net_worth_items: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          is_auto_synced: boolean
          last_updated_at: string
          name: string
          next_review_at: string | null
          notes: string | null
          review_frequency: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          is_auto_synced?: boolean
          last_updated_at?: string
          name: string
          next_review_at?: string | null
          notes?: string | null
          review_frequency?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          is_auto_synced?: boolean
          last_updated_at?: string
          name?: string
          next_review_at?: string | null
          notes?: string | null
          review_frequency?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      paper_orders: {
        Row: {
          created_at: string
          id: string
          order_type: string
          portfolio_id: string
          status: string
          trade_id: string
          trigger_price: number
          triggered_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_type: string
          portfolio_id: string
          status?: string
          trade_id: string
          trigger_price: number
          triggered_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_type?: string
          portfolio_id?: string
          status?: string
          trade_id?: string
          trigger_price?: number
          triggered_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_orders_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "paper_portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paper_orders_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "paper_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_portfolio_snapshots: {
        Row: {
          balance: number
          created_at: string
          id: string
          open_position_value: number
          portfolio_id: string
          snapshot_date: string
          total_value: number
          user_id: string
        }
        Insert: {
          balance: number
          created_at?: string
          id?: string
          open_position_value?: number
          portfolio_id: string
          snapshot_date?: string
          total_value: number
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          open_position_value?: number
          portfolio_id?: string
          snapshot_date?: string
          total_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_portfolio_snapshots_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "paper_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_portfolios: {
        Row: {
          balance: number
          created_at: string
          id: string
          initial_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          initial_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          initial_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      paper_trades: {
        Row: {
          asset_class: string
          base_currency: string | null
          contract_size: number
          created_at: string
          entry_date: string
          entry_price: number
          exit_date: string | null
          exit_price: number | null
          expiration_date: string | null
          id: string
          notes: string | null
          option_type: string | null
          portfolio_id: string
          profit_loss: number | null
          quantity: number
          quote_currency: string | null
          status: string
          stop_loss: number | null
          strike_price: number | null
          symbol: string
          take_profit: number | null
          trade_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_class?: string
          base_currency?: string | null
          contract_size?: number
          created_at?: string
          entry_date?: string
          entry_price: number
          exit_date?: string | null
          exit_price?: number | null
          expiration_date?: string | null
          id?: string
          notes?: string | null
          option_type?: string | null
          portfolio_id: string
          profit_loss?: number | null
          quantity: number
          quote_currency?: string | null
          status?: string
          stop_loss?: number | null
          strike_price?: number | null
          symbol: string
          take_profit?: number | null
          trade_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_class?: string
          base_currency?: string | null
          contract_size?: number
          created_at?: string
          entry_date?: string
          entry_price?: number
          exit_date?: string | null
          exit_price?: number | null
          expiration_date?: string | null
          id?: string
          notes?: string | null
          option_type?: string | null
          portfolio_id?: string
          profit_loss?: number | null
          quantity?: number
          quote_currency?: string | null
          status?: string
          stop_loss?: number | null
          strike_price?: number | null
          symbol?: string
          take_profit?: number | null
          trade_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_trades_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "paper_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      passkeys: {
        Row: {
          backed_up: boolean | null
          counter: number
          created_at: string
          credential_id: string
          device_type: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          backed_up?: boolean | null
          counter?: number
          created_at?: string
          credential_id: string
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          backed_up?: boolean | null
          counter?: number
          created_at?: string
          credential_id?: string
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      plan_items: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          notes: string | null
          priority: string | null
          section_id: string | null
          sort_order: number
          source_conversation_id: string | null
          source_message_content: string | null
          source_type: string | null
          status: string
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          section_id?: string | null
          sort_order?: number
          source_conversation_id?: string | null
          source_message_content?: string | null
          source_type?: string | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          section_id?: string | null
          sort_order?: number
          source_conversation_id?: string | null
          source_message_content?: string | null
          source_type?: string | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "plan_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_source_conversation_id_fkey"
            columns: ["source_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_sections: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_collapsed: boolean
          is_default: boolean
          name: string
          plan_id: string | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_collapsed?: boolean
          is_default?: boolean
          name: string
          plan_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_collapsed?: boolean
          is_default?: boolean
          name?: string
          plan_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_sections_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          created_at: string
          direction: string
          id: string
          is_triggered: boolean
          notes: string | null
          symbol: string
          target_price: number
          triggered_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          id?: string
          is_triggered?: boolean
          notes?: string | null
          symbol: string
          target_price: number
          triggered_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          is_triggered?: boolean
          notes?: string | null
          symbol?: string
          target_price?: number
          triggered_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_credits: number | null
          avatar_url: string | null
          created_at: string
          email: string
          footer_shortcuts: string[] | null
          full_name: string | null
          id: string
          referral_code: string | null
          referred_by: string | null
          show_real_name: boolean | null
          stripe_customer_id: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          account_credits?: number | null
          avatar_url?: string | null
          created_at?: string
          email: string
          footer_shortcuts?: string[] | null
          full_name?: string | null
          id?: string
          referral_code?: string | null
          referred_by?: string | null
          show_real_name?: boolean | null
          stripe_customer_id?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          account_credits?: number | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          footer_shortcuts?: string[] | null
          full_name?: string | null
          id?: string
          referral_code?: string | null
          referred_by?: string | null
          show_real_name?: boolean | null
          stripe_customer_id?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string
          id: string
          referee_credit_amount: number | null
          referee_reward_months: number | null
          referee_reward_type: string | null
          referee_rewarded_at: string | null
          referral_code: string
          referred_email: string | null
          referred_user_id: string | null
          referrer_credit_amount: number | null
          referrer_id: string
          referrer_reward_months: number | null
          referrer_reward_type: string | null
          referrer_rewarded_at: string | null
          status: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referee_credit_amount?: number | null
          referee_reward_months?: number | null
          referee_reward_type?: string | null
          referee_rewarded_at?: string | null
          referral_code: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_credit_amount?: number | null
          referrer_id: string
          referrer_reward_months?: number | null
          referrer_reward_type?: string | null
          referrer_rewarded_at?: string | null
          status?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referee_credit_amount?: number | null
          referee_reward_months?: number | null
          referee_reward_type?: string | null
          referee_rewarded_at?: string | null
          referral_code?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_credit_amount?: number | null
          referrer_id?: string
          referrer_reward_months?: number | null
          referrer_reward_type?: string | null
          referrer_rewarded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_completed: boolean
          is_dismissed: boolean
          metadata: Json | null
          repeat_interval: string | null
          title: string
          trigger_at: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          is_dismissed?: boolean
          metadata?: Json | null
          repeat_interval?: string | null
          title: string
          trigger_at: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          is_dismissed?: boolean
          metadata?: Json | null
          repeat_interval?: string | null
          title?: string
          trigger_at?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          created_at: string
          current_amount: number
          deadline: string | null
          emoji: string | null
          id: string
          status: string
          target_amount: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          deadline?: string | null
          emoji?: string | null
          id?: string
          status?: string
          target_amount?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          deadline?: string | null
          emoji?: string | null
          id?: string
          status?: string
          target_amount?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          asset_class: string | null
          category: string | null
          content: string
          created_at: string
          created_by: string
          entry_price: number | null
          error_message: string | null
          id: string
          post_type: string
          published_at: string | null
          room_id: string | null
          scheduled_for: string
          status: string
          stop_loss: number | null
          symbol: string | null
          tags: string[] | null
          target_price: number | null
          title: string | null
          trade_direction: string | null
          updated_at: string
        }
        Insert: {
          asset_class?: string | null
          category?: string | null
          content: string
          created_at?: string
          created_by: string
          entry_price?: number | null
          error_message?: string | null
          id?: string
          post_type: string
          published_at?: string | null
          room_id?: string | null
          scheduled_for: string
          status?: string
          stop_loss?: number | null
          symbol?: string | null
          tags?: string[] | null
          target_price?: number | null
          title?: string | null
          trade_direction?: string | null
          updated_at?: string
        }
        Update: {
          asset_class?: string | null
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string
          entry_price?: number | null
          error_message?: string | null
          id?: string
          post_type?: string
          published_at?: string | null
          room_id?: string | null
          scheduled_for?: string
          status?: string
          stop_loss?: number | null
          symbol?: string | null
          tags?: string[] | null
          target_price?: number | null
          title?: string | null
          trade_direction?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trade_idea_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          likes_count: number
          parent_id: string | null
          trade_idea_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          parent_id?: string | null
          trade_idea_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          parent_id?: string | null
          trade_idea_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_idea_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "trade_idea_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_idea_comments_trade_idea_id_fkey"
            columns: ["trade_idea_id"]
            isOneToOne: false
            referencedRelation: "trade_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_idea_likes: {
        Row: {
          created_at: string
          id: string
          trade_idea_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          trade_idea_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          trade_idea_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_idea_likes_trade_idea_id_fkey"
            columns: ["trade_idea_id"]
            isOneToOne: false
            referencedRelation: "trade_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_ideas: {
        Row: {
          asset_class: string
          chart_image_url: string | null
          comments_count: number
          content: string
          created_at: string
          entry_price: number | null
          id: string
          likes_count: number
          outcome: string | null
          status: string
          stop_loss: number | null
          symbol: string
          target_price: number | null
          title: string
          trade_direction: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_class?: string
          chart_image_url?: string | null
          comments_count?: number
          content: string
          created_at?: string
          entry_price?: number | null
          id?: string
          likes_count?: number
          outcome?: string | null
          status?: string
          stop_loss?: number | null
          symbol: string
          target_price?: number | null
          title: string
          trade_direction: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_class?: string
          chart_image_url?: string | null
          comments_count?: number
          content?: string
          created_at?: string
          entry_price?: number | null
          id?: string
          likes_count?: number
          outcome?: string | null
          status?: string
          stop_loss?: number | null
          symbol?: string
          target_price?: number | null
          title?: string
          trade_direction?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          asset_class: string
          created_at: string
          emotion: string | null
          entry_date: string
          entry_price: number
          exit_date: string | null
          exit_price: number | null
          id: string
          notes: string | null
          profit_loss: number | null
          quantity: number
          screenshot_url: string | null
          status: string
          symbol: string
          tags: string[] | null
          trade_mode: string
          trade_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_class?: string
          created_at?: string
          emotion?: string | null
          entry_date?: string
          entry_price: number
          exit_date?: string | null
          exit_price?: number | null
          id?: string
          notes?: string | null
          profit_loss?: number | null
          quantity: number
          screenshot_url?: string | null
          status?: string
          symbol: string
          tags?: string[] | null
          trade_mode?: string
          trade_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_class?: string
          created_at?: string
          emotion?: string | null
          entry_date?: string
          entry_price?: number
          exit_date?: string | null
          exit_price?: number | null
          id?: string
          notes?: string | null
          profit_loss?: number | null
          quantity?: number
          screenshot_url?: string | null
          status?: string
          symbol?: string
          tags?: string[] | null
          trade_mode?: string
          trade_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
          notify_on_trade: boolean
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
          notify_on_trade?: boolean
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
          notify_on_trade?: boolean
        }
        Relationships: []
      }
      user_lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          last_accessed_at: string | null
          lesson_id: string
          progress_percent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          lesson_id: string
          progress_percent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          lesson_id?: string
          progress_percent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_payment_info: {
        Row: {
          created_at: string
          id: string
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_quinn_context: {
        Row: {
          account_types: string[] | null
          additional_context: Json | null
          age_range: string | null
          brokerage_names: string[] | null
          brokerages: string[] | null
          communication_style: string | null
          created_at: string
          debt_situation: string | null
          emergency_fund_status: string | null
          experience_level: string | null
          has_brokerage: boolean | null
          has_debt: boolean | null
          has_emergency_fund: boolean | null
          id: string
          income_type: string | null
          interested_assets: string[] | null
          investment_timeline: string | null
          last_reviewed_at: string | null
          learning_topics: string[] | null
          occupation: string | null
          preferred_name: string | null
          primary_goal: string | null
          primary_goals: string[] | null
          risk_profile: Json | null
          risk_tolerance: string | null
          specific_holdings: Json | null
          topics_mastered: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_types?: string[] | null
          additional_context?: Json | null
          age_range?: string | null
          brokerage_names?: string[] | null
          brokerages?: string[] | null
          communication_style?: string | null
          created_at?: string
          debt_situation?: string | null
          emergency_fund_status?: string | null
          experience_level?: string | null
          has_brokerage?: boolean | null
          has_debt?: boolean | null
          has_emergency_fund?: boolean | null
          id?: string
          income_type?: string | null
          interested_assets?: string[] | null
          investment_timeline?: string | null
          last_reviewed_at?: string | null
          learning_topics?: string[] | null
          occupation?: string | null
          preferred_name?: string | null
          primary_goal?: string | null
          primary_goals?: string[] | null
          risk_profile?: Json | null
          risk_tolerance?: string | null
          specific_holdings?: Json | null
          topics_mastered?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_types?: string[] | null
          additional_context?: Json | null
          age_range?: string | null
          brokerage_names?: string[] | null
          brokerages?: string[] | null
          communication_style?: string | null
          created_at?: string
          debt_situation?: string | null
          emergency_fund_status?: string | null
          experience_level?: string | null
          has_brokerage?: boolean | null
          has_debt?: boolean | null
          has_emergency_fund?: boolean | null
          id?: string
          income_type?: string | null
          interested_assets?: string[] | null
          investment_timeline?: string | null
          last_reviewed_at?: string | null
          learning_topics?: string[] | null
          occupation?: string | null
          preferred_name?: string | null
          primary_goal?: string | null
          primary_goals?: string[] | null
          risk_profile?: Json | null
          risk_tolerance?: string | null
          specific_holdings?: Json | null
          topics_mastered?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_trading_stats: {
        Row: {
          followers_count: number
          following_count: number
          id: string
          reputation_score: number
          successful_ideas: number
          total_ideas_shared: number
          updated_at: string
          user_id: string
          win_rate: number | null
        }
        Insert: {
          followers_count?: number
          following_count?: number
          id?: string
          reputation_score?: number
          successful_ideas?: number
          total_ideas_shared?: number
          updated_at?: string
          user_id: string
          win_rate?: number | null
        }
        Update: {
          followers_count?: number
          following_count?: number
          id?: string
          reputation_score?: number
          successful_ideas?: number
          total_ideas_shared?: number
          updated_at?: string
          user_id?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      user_usage: {
        Row: {
          conversations_used: number
          created_at: string
          id: string
          messages_used: number
          month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversations_used?: number
          created_at?: string
          id?: string
          messages_used?: number
          month: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversations_used?: number
          created_at?: string
          id?: string
          messages_used?: number
          month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      linked_accounts_safe: {
        Row: {
          account_id: string | null
          account_name: string | null
          created_at: string | null
          id: string | null
          metadata: Json | null
          provider: string | null
          status: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          created_at?: string | null
          id?: string | null
          metadata?: Json | null
          provider?: string | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          created_at?: string | null
          id?: string | null
          metadata?: Json | null
          provider?: string | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          show_real_name: boolean | null
          subscription_tier: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: never
          id?: string | null
          show_real_name?: boolean | null
          subscription_tier?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: never
          id?: string | null
          show_real_name?: boolean | null
          subscription_tier?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      referrals_safe: {
        Row: {
          converted_at: string | null
          created_at: string | null
          id: string | null
          referee_credit_amount: number | null
          referee_reward_months: number | null
          referee_reward_type: string | null
          referee_rewarded_at: string | null
          referral_code: string | null
          referred_email: string | null
          referred_user_id: string | null
          referrer_credit_amount: number | null
          referrer_id: string | null
          referrer_reward_months: number | null
          referrer_reward_type: string | null
          referrer_rewarded_at: string | null
          status: string | null
        }
        Insert: {
          converted_at?: string | null
          created_at?: string | null
          id?: string | null
          referee_credit_amount?: number | null
          referee_reward_months?: number | null
          referee_reward_type?: string | null
          referee_rewarded_at?: string | null
          referral_code?: string | null
          referred_email?: never
          referred_user_id?: string | null
          referrer_credit_amount?: number | null
          referrer_id?: string | null
          referrer_reward_months?: number | null
          referrer_reward_type?: string | null
          referrer_rewarded_at?: string | null
          status?: string | null
        }
        Update: {
          converted_at?: string | null
          created_at?: string | null
          id?: string | null
          referee_credit_amount?: number | null
          referee_reward_months?: number | null
          referee_reward_type?: string | null
          referee_rewarded_at?: string | null
          referral_code?: string | null
          referred_email?: never
          referred_user_id?: string | null
          referrer_credit_amount?: number | null
          referrer_id?: string | null
          referrer_reward_months?: number | null
          referrer_reward_type?: string | null
          referrer_rewarded_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      user_payment_info_safe: {
        Row: {
          created_at: string | null
          id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "user"
      content_status: "draft" | "published" | "archived"
      difficulty_level: "beginner" | "intermediate" | "advanced"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "admin", "user"],
      content_status: ["draft", "published", "archived"],
      difficulty_level: ["beginner", "intermediate", "advanced"],
    },
  },
} as const
