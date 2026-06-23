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
      admin_dev_notes: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      beta_feedback: {
        Row: {
          avatar_flow_check: string | null
          avatar_preview_experience: string | null
          backdrop_experience: string | null
          browse_experience: string | null
          bugs_encountered: string | null
          cami_matched: string | null
          companion_appeared: string | null
          conversation_quality: number | null
          created_at: string
          dashboard_experience: string | null
          device_info: string | null
          found_plans: string | null
          frustrated_by: string | null
          gift_image_worked: string | null
          id: string
          image_gen_bugs: string | null
          liked_most: string | null
          missing_feature: string | null
          onboarding_clarity: string | null
          overall_rating: number
          own_image_used: string | null
          selfie_worked: string | null
          signup_experience: string | null
          store_experience: string | null
          studio_avatar_worked: string | null
          studio_experience: string | null
          testimonial_approved: boolean
          testimonial_quote: string | null
          think_freely_found: string | null
          threads_experience: string | null
          timeline_experience: string | null
          timeline_sharing: string | null
          user_id: string
          user_name: string
          wellness_experience: string | null
        }
        Insert: {
          avatar_flow_check?: string | null
          avatar_preview_experience?: string | null
          backdrop_experience?: string | null
          browse_experience?: string | null
          bugs_encountered?: string | null
          cami_matched?: string | null
          companion_appeared?: string | null
          conversation_quality?: number | null
          created_at?: string
          dashboard_experience?: string | null
          device_info?: string | null
          found_plans?: string | null
          frustrated_by?: string | null
          gift_image_worked?: string | null
          id?: string
          image_gen_bugs?: string | null
          liked_most?: string | null
          missing_feature?: string | null
          onboarding_clarity?: string | null
          overall_rating?: number
          own_image_used?: string | null
          selfie_worked?: string | null
          signup_experience?: string | null
          store_experience?: string | null
          studio_avatar_worked?: string | null
          studio_experience?: string | null
          testimonial_approved?: boolean
          testimonial_quote?: string | null
          think_freely_found?: string | null
          threads_experience?: string | null
          timeline_experience?: string | null
          timeline_sharing?: string | null
          user_id: string
          user_name?: string
          wellness_experience?: string | null
        }
        Update: {
          avatar_flow_check?: string | null
          avatar_preview_experience?: string | null
          backdrop_experience?: string | null
          browse_experience?: string | null
          bugs_encountered?: string | null
          cami_matched?: string | null
          companion_appeared?: string | null
          conversation_quality?: number | null
          created_at?: string
          dashboard_experience?: string | null
          device_info?: string | null
          found_plans?: string | null
          frustrated_by?: string | null
          gift_image_worked?: string | null
          id?: string
          image_gen_bugs?: string | null
          liked_most?: string | null
          missing_feature?: string | null
          onboarding_clarity?: string | null
          overall_rating?: number
          own_image_used?: string | null
          selfie_worked?: string | null
          signup_experience?: string | null
          store_experience?: string | null
          studio_avatar_worked?: string | null
          studio_experience?: string | null
          testimonial_approved?: boolean
          testimonial_quote?: string | null
          think_freely_found?: string | null
          threads_experience?: string | null
          timeline_experience?: string | null
          timeline_sharing?: string | null
          user_id?: string
          user_name?: string
          wellness_experience?: string | null
        }
        Relationships: []
      }
      beta_invite_codes: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          label: string | null
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
        }
        Relationships: []
      }
      beta_serial_numbers: {
        Row: {
          claimed_at: string
          id: string
          notified_at: string | null
          serial_number: number
          snapshot_saved_at: string | null
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          notified_at?: string | null
          serial_number: number
          snapshot_saved_at?: string | null
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          notified_at?: string | null
          serial_number?: number
          snapshot_saved_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blocked_emails: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          pattern: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          pattern: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          pattern?: string
          reason?: string | null
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_member_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          blocked_member_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blocked_member_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string
          content: string
          cover_image_url: string | null
          created_at: string
          cta_text: string | null
          cta_url: string | null
          excerpt: string | null
          hero_image_url: string | null
          id: string
          og_description: string | null
          og_image_url: string | null
          og_title: string | null
          page_type: string | null
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          author_id: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          excerpt?: string | null
          hero_image_url?: string | null
          id?: string
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          page_type?: string | null
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          excerpt?: string | null
          hero_image_url?: string | null
          id?: string
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          page_type?: string | null
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      blueprint_templates: {
        Row: {
          category: string
          created_at: string
          emoji: string
          id: string
          is_active: boolean
          kickoff_prompt: string
          mode: string
          slug: string
          sort_order: number
          subtitle: string | null
          suggested_steps: Json
          tier_required: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          emoji?: string
          id?: string
          is_active?: boolean
          kickoff_prompt: string
          mode?: string
          slug: string
          sort_order?: number
          subtitle?: string | null
          suggested_steps?: Json
          tier_required?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          emoji?: string
          id?: string
          is_active?: boolean
          kickoff_prompt?: string
          mode?: string
          slug?: string
          sort_order?: number
          subtitle?: string | null
          suggested_steps?: Json
          tier_required?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bug_reports: {
        Row: {
          admin_notes: string | null
          component_stack: string | null
          created_at: string
          error_message: string
          error_stack: string | null
          id: string
          page_url: string | null
          resolved_at: string | null
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          component_stack?: string | null
          created_at?: string
          error_message: string
          error_stack?: string | null
          id?: string
          page_url?: string | null
          resolved_at?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          component_stack?: string | null
          created_at?: string
          error_message?: string
          error_stack?: string | null
          id?: string
          page_url?: string | null
          resolved_at?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cami_memories: {
        Row: {
          category: string
          extracted_at: string
          id: string
          source: string
          text: string
          user_id: string
        }
        Insert: {
          category: string
          extracted_at?: string
          id?: string
          source?: string
          text: string
          user_id: string
        }
        Update: {
          category?: string
          extracted_at?: string
          id?: string
          source?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      cami_session_history: {
        Row: {
          created_at: string
          first_message: string
          id: string
          match_result: Json | null
          message_count: number
          messages: Json | null
          phase: string
          session_date: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          first_message?: string
          id?: string
          match_result?: Json | null
          message_count?: number
          messages?: Json | null
          phase?: string
          session_date?: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          first_message?: string
          id?: string
          match_result?: Json | null
          message_count?: number
          messages?: Json | null
          phase?: string
          session_date?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_artifacts: {
        Row: {
          content: string
          created_at: string
          id: string
          kind: string
          language: string | null
          member_id: string
          message_id: string | null
          metadata: Json
          pinned: boolean
          project_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          kind?: string
          language?: string | null
          member_id: string
          message_id?: string | null
          metadata?: Json
          pinned?: boolean
          project_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          language?: string | null
          member_id?: string
          message_id?: string | null
          metadata?: Json
          pinned?: boolean
          project_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_artifacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          image_urls: Json
          member_id: string
          role: string
          source: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_urls?: Json
          member_id: string
          role: string
          source?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_urls?: Json
          member_id?: string
          role?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      circle_companions: {
        Row: {
          avatar_url: string | null
          circle_id: string
          companion_name: string
          created_at: string
          id: string
          member_id: string
          mode: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          circle_id: string
          companion_name: string
          created_at?: string
          id?: string
          member_id: string
          mode?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          circle_id?: string
          companion_name?: string
          created_at?: string
          id?: string
          member_id?: string
          mode?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_companions_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "custom_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_guestbook: {
        Row: {
          arrival_note: string | null
          circle_id: string
          companion_name: string | null
          created_at: string
          display_name: string
          id: string
          user_id: string
        }
        Insert: {
          arrival_note?: string | null
          circle_id: string
          companion_name?: string | null
          created_at?: string
          display_name: string
          id?: string
          user_id: string
        }
        Update: {
          arrival_note?: string | null
          circle_id?: string
          companion_name?: string | null
          created_at?: string
          display_name?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_guestbook_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "custom_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_guests: {
        Row: {
          circle_id: string
          created_at: string
          email: string | null
          id: string
          invite_token: string
          name: string
          role_preset: string
          status: string
          user_id: string | null
        }
        Insert: {
          circle_id: string
          created_at?: string
          email?: string | null
          id?: string
          invite_token?: string
          name: string
          role_preset?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          circle_id?: string
          created_at?: string
          email?: string | null
          id?: string
          invite_token?: string
          name?: string
          role_preset?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "circle_guests_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "custom_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_lobby_config: {
        Row: {
          arrival_suggestions: Json | null
          circle_id: string
          created_at: string
          guestbook_enabled: boolean
          handouts: Json | null
          id: string
          music_url: string | null
          updated_at: string
          video_url: string | null
          welcome_message: string | null
        }
        Insert: {
          arrival_suggestions?: Json | null
          circle_id: string
          created_at?: string
          guestbook_enabled?: boolean
          handouts?: Json | null
          id?: string
          music_url?: string | null
          updated_at?: string
          video_url?: string | null
          welcome_message?: string | null
        }
        Update: {
          arrival_suggestions?: Json | null
          circle_id?: string
          created_at?: string
          guestbook_enabled?: boolean
          handouts?: Json | null
          id?: string
          music_url?: string | null
          updated_at?: string
          video_url?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "circle_lobby_config_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: true
            referencedRelation: "custom_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_members: {
        Row: {
          avatar_url: string | null
          circle_id: string
          display_name: string | null
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          circle_id: string
          display_name?: string | null
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          circle_id?: string
          display_name?: string | null
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "custom_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_messages: {
        Row: {
          circle_id: string
          content: string
          created_at: string
          id: string
          sender_name: string
          sender_type: string
          user_id: string
        }
        Insert: {
          circle_id: string
          content: string
          created_at?: string
          id?: string
          sender_name: string
          sender_type?: string
          user_id: string
        }
        Update: {
          circle_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_name?: string
          sender_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_messages_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "custom_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_errors: {
        Row: {
          component_name: string | null
          created_at: string
          error_message: string
          error_stack: string | null
          id: string
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component_name?: string | null
          created_at?: string
          error_message: string
          error_stack?: string | null
          id?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component_name?: string | null
          created_at?: string
          error_message?: string
          error_stack?: string | null
          id?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      companion_collectibles: {
        Row: {
          companion_name: string | null
          content: Json
          created_at: string
          id: string
          member_id: string
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          companion_name?: string | null
          content?: Json
          created_at?: string
          id?: string
          member_id: string
          title?: string | null
          type: string
          user_id: string
        }
        Update: {
          companion_name?: string | null
          content?: Json
          created_at?: string
          id?: string
          member_id?: string
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      companion_facts: {
        Row: {
          category: string
          extracted_at: string
          id: string
          member_id: string
          source: string
          text: string
          user_id: string
        }
        Insert: {
          category?: string
          extracted_at?: string
          id?: string
          member_id: string
          source?: string
          text: string
          user_id: string
        }
        Update: {
          category?: string
          extracted_at?: string
          id?: string
          member_id?: string
          source?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      companion_feed_posts: {
        Row: {
          card_type: string
          circle: string | null
          companion_reactions: Json | null
          content: string
          created_at: string
          event_label: string | null
          event_type: string | null
          id: string
          member_age: string | null
          member_avatar_url: string | null
          member_bio: string | null
          member_gender: string | null
          member_handle: string | null
          member_id: string
          member_name: string | null
          member_personality: string | null
          user_id: string
        }
        Insert: {
          card_type?: string
          circle?: string | null
          companion_reactions?: Json | null
          content: string
          created_at?: string
          event_label?: string | null
          event_type?: string | null
          id?: string
          member_age?: string | null
          member_avatar_url?: string | null
          member_bio?: string | null
          member_gender?: string | null
          member_handle?: string | null
          member_id: string
          member_name?: string | null
          member_personality?: string | null
          user_id: string
        }
        Update: {
          card_type?: string
          circle?: string | null
          companion_reactions?: Json | null
          content?: string
          created_at?: string
          event_label?: string | null
          event_type?: string | null
          id?: string
          member_age?: string | null
          member_avatar_url?: string | null
          member_bio?: string | null
          member_gender?: string | null
          member_handle?: string | null
          member_id?: string
          member_name?: string | null
          member_personality?: string | null
          user_id?: string
        }
        Relationships: []
      }
      companion_media: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          media_type: string
          member_id: string
          prompt: string | null
          sticker_target: string
          usage_count: number
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          media_type: string
          member_id: string
          prompt?: string | null
          sticker_target?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          media_type?: string
          member_id?: string
          prompt?: string | null
          sticker_target?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      companion_milestones: {
        Row: {
          achieved_at: string
          id: string
          member_id: string
          milestone_type: string
          moment_delivered: boolean
          user_id: string
          video_url: string | null
        }
        Insert: {
          achieved_at?: string
          id?: string
          member_id: string
          milestone_type: string
          moment_delivered?: boolean
          user_id: string
          video_url?: string | null
        }
        Update: {
          achieved_at?: string
          id?: string
          member_id?: string
          milestone_type?: string
          moment_delivered?: boolean
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      companion_plans: {
        Row: {
          category: string
          checked_steps: Json
          checklist_reset: string | null
          companion_name: string
          companion_note: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          emoji: string
          goal_id: string | null
          id: string
          is_rhythm: boolean
          member_id: string
          missed_at: string | null
          missed_checkin_sent: boolean
          plan_type: string
          playbook_theme: string | null
          rhythm_completed_today: boolean
          rhythm_last_completed: string | null
          schedule: Json | null
          source: string
          stage: string
          status: string
          steps: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          checked_steps?: Json
          checklist_reset?: string | null
          companion_name?: string
          companion_note?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          emoji?: string
          goal_id?: string | null
          id?: string
          is_rhythm?: boolean
          member_id: string
          missed_at?: string | null
          missed_checkin_sent?: boolean
          plan_type?: string
          playbook_theme?: string | null
          rhythm_completed_today?: boolean
          rhythm_last_completed?: string | null
          schedule?: Json | null
          source?: string
          stage?: string
          status?: string
          steps?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          checked_steps?: Json
          checklist_reset?: string | null
          companion_name?: string
          companion_note?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          emoji?: string
          goal_id?: string | null
          id?: string
          is_rhythm?: boolean
          member_id?: string
          missed_at?: string | null
          missed_checkin_sent?: boolean
          plan_type?: string
          playbook_theme?: string | null
          rhythm_completed_today?: boolean
          rhythm_last_completed?: string | null
          schedule?: Json | null
          source?: string
          stage?: string
          status?: string
          steps?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companion_plans_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "wellness_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          age: string | null
          appearance_desc: string | null
          archived_at: string | null
          avatar_url: string | null
          background_url: string | null
          backstory: string | null
          bio: string | null
          cached_traits: Json | null
          circles: Json | null
          communication_style: string | null
          connected_at: string
          connection_mode: string
          gender: string | null
          handle: string | null
          heygen_avatar_id: string | null
          id: string
          image_style: string | null
          is_archived: boolean | null
          is_created: boolean
          last_message: string | null
          member_id: string
          name: string
          origin_story: string | null
          personality: string | null
          reference_image_url: string | null
          relationship_level: number
          studio_selections: Json | null
          user_id: string
          voice_id: string | null
        }
        Insert: {
          age?: string | null
          appearance_desc?: string | null
          archived_at?: string | null
          avatar_url?: string | null
          background_url?: string | null
          backstory?: string | null
          bio?: string | null
          cached_traits?: Json | null
          circles?: Json | null
          communication_style?: string | null
          connected_at?: string
          connection_mode?: string
          gender?: string | null
          handle?: string | null
          heygen_avatar_id?: string | null
          id?: string
          image_style?: string | null
          is_archived?: boolean | null
          is_created?: boolean
          last_message?: string | null
          member_id: string
          name: string
          origin_story?: string | null
          personality?: string | null
          reference_image_url?: string | null
          relationship_level?: number
          studio_selections?: Json | null
          user_id: string
          voice_id?: string | null
        }
        Update: {
          age?: string | null
          appearance_desc?: string | null
          archived_at?: string | null
          avatar_url?: string | null
          background_url?: string | null
          backstory?: string | null
          bio?: string | null
          cached_traits?: Json | null
          circles?: Json | null
          communication_style?: string | null
          connected_at?: string
          connection_mode?: string
          gender?: string | null
          handle?: string | null
          heygen_avatar_id?: string | null
          id?: string
          image_style?: string | null
          is_archived?: boolean | null
          is_created?: boolean
          last_message?: string | null
          member_id?: string
          name?: string
          origin_story?: string | null
          personality?: string | null
          reference_image_url?: string | null
          relationship_level?: number
          studio_selections?: Json | null
          user_id?: string
          voice_id?: string | null
        }
        Relationships: []
      }
      conversation_profiles: {
        Row: {
          communication_register: string
          confidence: string
          created_at: string | null
          engagement_triggers: string[] | null
          id: string
          last_analyzed: string | null
          member_id: string
          pushback_tolerance: string
          tone_preferences: string[] | null
          user_id: string
        }
        Insert: {
          communication_register?: string
          confidence?: string
          created_at?: string | null
          engagement_triggers?: string[] | null
          id?: string
          last_analyzed?: string | null
          member_id: string
          pushback_tolerance?: string
          tone_preferences?: string[] | null
          user_id: string
        }
        Update: {
          communication_register?: string
          confidence?: string
          created_at?: string | null
          engagement_triggers?: string[] | null
          id?: string
          last_analyzed?: string | null
          member_id?: string
          pushback_tolerance?: string
          tone_preferences?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      custom_circles: {
        Row: {
          active_speaker_id: string | null
          circle_type: string
          community_flavor: string
          companion_enabled: boolean
          created_at: string
          creator_id: string
          default_layout: string
          description: string
          emoji: string
          id: string
          invite_code: string | null
          name: string
          room_type: string
          session_active: boolean
          slug: string
        }
        Insert: {
          active_speaker_id?: string | null
          circle_type?: string
          community_flavor?: string
          companion_enabled?: boolean
          created_at?: string
          creator_id: string
          default_layout?: string
          description: string
          emoji: string
          id?: string
          invite_code?: string | null
          name: string
          room_type?: string
          session_active?: boolean
          slug: string
        }
        Update: {
          active_speaker_id?: string | null
          circle_type?: string
          community_flavor?: string
          companion_enabled?: boolean
          created_at?: string
          creator_id?: string
          default_layout?: string
          description?: string
          emoji?: string
          id?: string
          invite_code?: string | null
          name?: string
          room_type?: string
          session_active?: boolean
          slug?: string
        }
        Relationships: []
      }
      daily_intents: {
        Row: {
          created_at: string
          id: string
          intent_date: string
          user_id: string
          word: string
        }
        Insert: {
          created_at?: string
          id?: string
          intent_date?: string
          user_id: string
          word: string
        }
        Update: {
          created_at?: string
          id?: string
          intent_date?: string
          user_id?: string
          word?: string
        }
        Relationships: []
      }
      detected_patterns: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          first_detected_at: string
          id: string
          is_active: boolean | null
          last_confirmed_at: string
          last_surfaced_at: string | null
          pattern_category: string
          pattern_data: Json
          pattern_type: string
          surfaced_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          first_detected_at?: string
          id?: string
          is_active?: boolean | null
          last_confirmed_at?: string
          last_surfaced_at?: string | null
          pattern_category?: string
          pattern_data?: Json
          pattern_type: string
          surfaced_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          first_detected_at?: string
          id?: string
          is_active?: boolean | null
          last_confirmed_at?: string
          last_surfaced_at?: string | null
          pattern_category?: string
          pattern_data?: Json
          pattern_type?: string
          surfaced_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      discovery_results: {
        Row: {
          answers: Json
          completed_at: string
          id: string
          member_id: string | null
          result_description: string | null
          result_emoji: string
          result_key: string
          result_label: string
          secondary_key: string | null
          secondary_label: string | null
          topic: string
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string
          id?: string
          member_id?: string | null
          result_description?: string | null
          result_emoji?: string
          result_key: string
          result_label: string
          secondary_key?: string | null
          secondary_label?: string | null
          topic: string
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string
          id?: string
          member_id?: string | null
          result_description?: string | null
          result_emoji?: string
          result_key?: string
          result_label?: string
          secondary_key?: string | null
          secondary_label?: string | null
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      entries: {
        Row: {
          build_id: string | null
          card_schema_version: number | null
          created_at: string
          details: string | null
          id: string
          is_violation: boolean
          locked_at: string | null
          member_id: string | null
          mode: string | null
          session_id: string | null
          severity: string | null
          source_message_id: string | null
          status: string
          summary: string | null
          supersedes_id: string | null
          title: string
          touched: Json | null
          updated_at: string
          user_id: string
          verb: string | null
        }
        Insert: {
          build_id?: string | null
          card_schema_version?: number | null
          created_at?: string
          details?: string | null
          id?: string
          is_violation?: boolean
          locked_at?: string | null
          member_id?: string | null
          mode?: string | null
          session_id?: string | null
          severity?: string | null
          source_message_id?: string | null
          status?: string
          summary?: string | null
          supersedes_id?: string | null
          title: string
          touched?: Json | null
          updated_at?: string
          user_id: string
          verb?: string | null
        }
        Update: {
          build_id?: string | null
          card_schema_version?: number | null
          created_at?: string
          details?: string | null
          id?: string
          is_violation?: boolean
          locked_at?: string | null
          member_id?: string | null
          mode?: string | null
          session_id?: string | null
          severity?: string | null
          source_message_id?: string | null
          status?: string
          summary?: string | null
          supersedes_id?: string | null
          title?: string
          touched?: Json | null
          updated_at?: string
          user_id?: string
          verb?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entries_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
        ]
      }
      essence_influences: {
        Row: {
          content: string
          created_at: string
          id: string
          influence_type: string
          member_id: string
          person_name: string
          relationship: string | null
          trigger_context: string[]
          user_id: string
          weight: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          influence_type?: string
          member_id: string
          person_name: string
          relationship?: string | null
          trigger_context?: string[]
          user_id: string
          weight?: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          influence_type?: string
          member_id?: string
          person_name?: string
          relationship?: string | null
          trigger_context?: string[]
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          member_id: string
          post_content: string
          post_id: string
          post_image_key: string | null
          post_time_ago: string | null
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          member_id: string
          post_content: string
          post_id: string
          post_image_key?: string | null
          post_time_ago?: string | null
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          member_id?: string
          post_content?: string
          post_id?: string
          post_image_key?: string | null
          post_time_ago?: string | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      founding_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          seen_at: string | null
          serial_number: number
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          seen_at?: string | null
          serial_number: number
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          seen_at?: string | null
          serial_number?: number
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      gratitude_entries: {
        Row: {
          created_at: string
          id: string
          items: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          user_id?: string
        }
        Relationships: []
      }
      ice_contacts: {
        Row: {
          created_at: string
          id: string
          name: string
          notify_on_crisis: boolean
          phone_number: string | null
          phone_number_encrypted: string | null
          relationship: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notify_on_crisis?: boolean
          phone_number?: string | null
          phone_number_encrypted?: string | null
          relationship?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notify_on_crisis?: boolean
          phone_number?: string | null
          phone_number_encrypted?: string | null
          relationship?: string
          user_id?: string
        }
        Relationships: []
      }
      incoming_calls: {
        Row: {
          answered_at: string | null
          companion_avatar_url: string | null
          companion_name: string
          created_at: string
          ended_at: string | null
          expires_at: string
          id: string
          member_id: string
          opener_line: string | null
          reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answered_at?: string | null
          companion_avatar_url?: string | null
          companion_name: string
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          member_id: string
          opener_line?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answered_at?: string | null
          companion_avatar_url?: string | null
          companion_name?: string
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          member_id?: string
          opener_line?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          checkin_id: string | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_private: boolean
          mood_tag: string | null
          prompt: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          checkin_id?: string | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_private?: boolean
          mood_tag?: string | null
          prompt?: string | null
          source_type?: string
          user_id: string
        }
        Update: {
          checkin_id?: string | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_private?: boolean
          mood_tag?: string | null
          prompt?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "mood_checkins"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          category: string
          content_text: string
          created_at: string
          delta_summary: string | null
          effective_date: string | null
          file_url: string | null
          id: string
          is_active: boolean
          source_type: string
          summary: string | null
          supersedes_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          version_label: string | null
        }
        Insert: {
          category?: string
          content_text?: string
          created_at?: string
          delta_summary?: string | null
          effective_date?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          source_type?: string
          summary?: string | null
          supersedes_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          version_label?: string | null
        }
        Update: {
          category?: string
          content_text?: string
          created_at?: string
          delta_summary?: string | null
          effective_date?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          source_type?: string
          summary?: string | null
          supersedes_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          version_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_testimonials: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          quote: string
          role: string | null
          sort_order: number
          stars: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          quote: string
          role?: string | null
          sort_order?: number
          stars?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          quote?: string
          role?: string | null
          sort_order?: number
          stars?: number
        }
        Relationships: []
      }
      learn_content: {
        Row: {
          age_tag: string
          author_id: string
          category: string
          created_at: string
          description: string
          emoji: string
          id: string
          published: boolean
          sort_order: number
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          age_tag?: string
          author_id: string
          category?: string
          created_at?: string
          description?: string
          emoji?: string
          id?: string
          published?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          age_tag?: string
          author_id?: string
          category?: string
          created_at?: string
          description?: string
          emoji?: string
          id?: string
          published?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      login_events: {
        Row: {
          country: string | null
          created_at: string
          email: string | null
          event_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          email?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      matchmaking_sessions: {
        Row: {
          answers: Json
          appearance_desc: string | null
          connection_mode: string
          created_at: string
          fast_track_text: string | null
          gender_preference: string
          id: string
          match_result: Json | null
          messages: Json
          phase: string
          private_mode: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          appearance_desc?: string | null
          connection_mode?: string
          created_at?: string
          fast_track_text?: string | null
          gender_preference?: string
          id?: string
          match_result?: Json | null
          messages?: Json
          phase?: string
          private_mode?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          appearance_desc?: string | null
          connection_mode?: string
          created_at?: string
          fast_track_text?: string | null
          gender_preference?: string
          id?: string
          match_result?: Json | null
          messages?: Json
          phase?: string
          private_mode?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          base_score: number | null
          category: string
          consolidated: boolean | null
          embedding: string | null
          emotional_weight: number | null
          extracted_at: string
          id: string
          last_retrieved_at: string | null
          member_id: string
          needs_verification: boolean | null
          parent_narrative_id: string | null
          related_memory_ids: string[] | null
          retrieval_count: number | null
          source: string
          source_context: Json | null
          text: string
          themes: string[] | null
          tier: string | null
          user_id: string
          verified_at: string | null
          vulnerability_score: number | null
        }
        Insert: {
          base_score?: number | null
          category: string
          consolidated?: boolean | null
          embedding?: string | null
          emotional_weight?: number | null
          extracted_at?: string
          id?: string
          last_retrieved_at?: string | null
          member_id: string
          needs_verification?: boolean | null
          parent_narrative_id?: string | null
          related_memory_ids?: string[] | null
          retrieval_count?: number | null
          source?: string
          source_context?: Json | null
          text: string
          themes?: string[] | null
          tier?: string | null
          user_id: string
          verified_at?: string | null
          vulnerability_score?: number | null
        }
        Update: {
          base_score?: number | null
          category?: string
          consolidated?: boolean | null
          embedding?: string | null
          emotional_weight?: number | null
          extracted_at?: string
          id?: string
          last_retrieved_at?: string | null
          member_id?: string
          needs_verification?: boolean | null
          parent_narrative_id?: string | null
          related_memory_ids?: string[] | null
          retrieval_count?: number | null
          source?: string
          source_context?: Json | null
          text?: string
          themes?: string[] | null
          tier?: string | null
          user_id?: string
          verified_at?: string | null
          vulnerability_score?: number | null
        }
        Relationships: []
      }
      memory_narratives: {
        Row: {
          created_at: string | null
          generated_at: string
          id: string
          member_id: string
          narrative_text: string
          narrative_type: string
          regenerate_after: string | null
          source_memory_ids: string[]
          themes: string[] | null
          title: string
          updated_at: string | null
          user_id: string
          word_count: number | null
        }
        Insert: {
          created_at?: string | null
          generated_at?: string
          id?: string
          member_id: string
          narrative_text: string
          narrative_type?: string
          regenerate_after?: string | null
          source_memory_ids?: string[]
          themes?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
          word_count?: number | null
        }
        Update: {
          created_at?: string | null
          generated_at?: string
          id?: string
          member_id?: string
          narrative_text?: string
          narrative_type?: string
          regenerate_after?: string | null
          source_memory_ids?: string[]
          themes?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          word_count?: number | null
        }
        Relationships: []
      }
      memory_relationships: {
        Row: {
          created_at: string | null
          id: string
          memory_id_a: string
          memory_id_b: string
          relationship_note: string | null
          relationship_type: string
          strength: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          memory_id_a: string
          memory_id_b: string
          relationship_note?: string | null
          relationship_type?: string
          strength?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          memory_id_a?: string
          memory_id_b?: string
          relationship_note?: string | null
          relationship_type?: string
          strength?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "memory_relationships_memory_id_a_fkey"
            columns: ["memory_id_a"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_relationships_memory_id_b_fkey"
            columns: ["memory_id_b"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_checkins: {
        Row: {
          companion_context: Json
          created_at: string
          id: string
          mood_emoji: string
          mood_level: number
          note: string | null
          user_id: string
        }
        Insert: {
          companion_context?: Json
          created_at?: string
          id?: string
          mood_emoji: string
          mood_level: number
          note?: string | null
          user_id: string
        }
        Update: {
          companion_context?: Json
          created_at?: string
          id?: string
          mood_emoji?: string
          mood_level?: number
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          community_replies: boolean
          companion_reminders: boolean
          created_at: string
          id: string
          push_notifications: boolean
          sms_checkins: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          community_replies?: boolean
          companion_reminders?: boolean
          created_at?: string
          id?: string
          push_notifications?: boolean
          sms_checkins?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          community_replies?: boolean
          companion_reminders?: boolean
          created_at?: string
          id?: string
          push_notifications?: boolean
          sms_checkins?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_responses: {
        Row: {
          created_at: string | null
          day_of_week: string
          engaged: boolean | null
          id: string
          notification_type: string
          responded_at: string | null
          response_action: string | null
          response_delay_seconds: number | null
          sent_at: string
          time_of_day: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: string
          engaged?: boolean | null
          id?: string
          notification_type: string
          responded_at?: string | null
          response_action?: string | null
          response_delay_seconds?: number | null
          sent_at: string
          time_of_day: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: string
          engaged?: boolean | null
          id?: string
          notification_type?: string
          responded_at?: string | null
          response_action?: string | null
          response_delay_seconds?: number | null
          sent_at?: string
          time_of_day?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pattern_surfacing_log: {
        Row: {
          created_at: string | null
          engaged: boolean | null
          engaged_at: string | null
          id: string
          pattern_type: string
          response_sentiment: string | null
          surface_channel: string
          surfaced_at: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          engaged?: boolean | null
          engaged_at?: string | null
          id?: string
          pattern_type: string
          response_sentiment?: string | null
          surface_channel?: string
          surfaced_at?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          engaged?: boolean | null
          engaged_at?: string | null
          id?: string
          pattern_type?: string
          response_sentiment?: string | null
          surface_channel?: string
          surfaced_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          avatar_url: string | null
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          user_id: string
          user_name: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          user_id: string
          user_name: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          user_id?: string
          user_name?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      presence_moments: {
        Row: {
          content: string
          generated_at: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          generated_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          generated_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bio: string | null
          blocked_at: string | null
          blocked_reason: string | null
          circadian_ceremonies: boolean
          companion_appearance_desc: string | null
          companion_avatar_url: string | null
          companion_gender: string
          companion_name: string
          companion_reference_image_url: string | null
          connection_mode: string
          created_at: string
          date_of_birth: string | null
          heygen_api_key_encrypted: string | null
          home_address: string | null
          home_anchor: string
          home_city: string | null
          home_lat: number | null
          home_lon: number | null
          id: string
          image_style: string
          interests: string | null
          is_blocked: boolean
          kids_mode: boolean | null
          mature_mode: boolean
          mic_sensitivity: number
          name_pronunciation: string | null
          onboarding_completed: boolean | null
          onboarding_path: string | null
          parental_consent_email: string | null
          parental_consent_granted: boolean
          personality_traits: Json | null
          phone_number: string | null
          phone_number_encrypted: string | null
          preferred_companion_name: string | null
          preferred_language: string
          preferred_name: string | null
          presence_preference: string | null
          roleplay_mode: boolean
          safety_net_enabled: boolean
          sms_opt_in: boolean
          think_freely_poke_level: number
          timezone: string | null
          updated_at: string
          user_appearance_desc: string | null
          user_cached_traits: Json | null
          user_id: string
          user_name: string
          user_reference_image_url: string | null
          username: string | null
          vibe: string | null
          vibe_preferences: string[] | null
          visual_style: string | null
          voice_minutes_reset_at: string | null
          voice_minutes_used: number
          voice_trial_seconds_used: number
          voice_trial_used: boolean
          work_address: string | null
          work_hub_city: string | null
          work_lat: number | null
          work_lon: number | null
        }
        Insert: {
          bio?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          circadian_ceremonies?: boolean
          companion_appearance_desc?: string | null
          companion_avatar_url?: string | null
          companion_gender?: string
          companion_name?: string
          companion_reference_image_url?: string | null
          connection_mode?: string
          created_at?: string
          date_of_birth?: string | null
          heygen_api_key_encrypted?: string | null
          home_address?: string | null
          home_anchor?: string
          home_city?: string | null
          home_lat?: number | null
          home_lon?: number | null
          id?: string
          image_style?: string
          interests?: string | null
          is_blocked?: boolean
          kids_mode?: boolean | null
          mature_mode?: boolean
          mic_sensitivity?: number
          name_pronunciation?: string | null
          onboarding_completed?: boolean | null
          onboarding_path?: string | null
          parental_consent_email?: string | null
          parental_consent_granted?: boolean
          personality_traits?: Json | null
          phone_number?: string | null
          phone_number_encrypted?: string | null
          preferred_companion_name?: string | null
          preferred_language?: string
          preferred_name?: string | null
          presence_preference?: string | null
          roleplay_mode?: boolean
          safety_net_enabled?: boolean
          sms_opt_in?: boolean
          think_freely_poke_level?: number
          timezone?: string | null
          updated_at?: string
          user_appearance_desc?: string | null
          user_cached_traits?: Json | null
          user_id: string
          user_name: string
          user_reference_image_url?: string | null
          username?: string | null
          vibe?: string | null
          vibe_preferences?: string[] | null
          visual_style?: string | null
          voice_minutes_reset_at?: string | null
          voice_minutes_used?: number
          voice_trial_seconds_used?: number
          voice_trial_used?: boolean
          work_address?: string | null
          work_hub_city?: string | null
          work_lat?: number | null
          work_lon?: number | null
        }
        Update: {
          bio?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          circadian_ceremonies?: boolean
          companion_appearance_desc?: string | null
          companion_avatar_url?: string | null
          companion_gender?: string
          companion_name?: string
          companion_reference_image_url?: string | null
          connection_mode?: string
          created_at?: string
          date_of_birth?: string | null
          heygen_api_key_encrypted?: string | null
          home_address?: string | null
          home_anchor?: string
          home_city?: string | null
          home_lat?: number | null
          home_lon?: number | null
          id?: string
          image_style?: string
          interests?: string | null
          is_blocked?: boolean
          kids_mode?: boolean | null
          mature_mode?: boolean
          mic_sensitivity?: number
          name_pronunciation?: string | null
          onboarding_completed?: boolean | null
          onboarding_path?: string | null
          parental_consent_email?: string | null
          parental_consent_granted?: boolean
          personality_traits?: Json | null
          phone_number?: string | null
          phone_number_encrypted?: string | null
          preferred_companion_name?: string | null
          preferred_language?: string
          preferred_name?: string | null
          presence_preference?: string | null
          roleplay_mode?: boolean
          safety_net_enabled?: boolean
          sms_opt_in?: boolean
          think_freely_poke_level?: number
          timezone?: string | null
          updated_at?: string
          user_appearance_desc?: string | null
          user_cached_traits?: Json | null
          user_id?: string
          user_name?: string
          user_reference_image_url?: string | null
          username?: string | null
          vibe?: string | null
          vibe_preferences?: string[] | null
          visual_style?: string | null
          voice_minutes_reset_at?: string | null
          voice_minutes_used?: number
          voice_trial_seconds_used?: number
          voice_trial_used?: boolean
          work_address?: string | null
          work_hub_city?: string | null
          work_lat?: number | null
          work_lon?: number | null
        }
        Relationships: []
      }
      project_blueprints: {
        Row: {
          callout: string | null
          created_at: string
          id: string
          member_id: string
          mode: string
          pinned: boolean
          project_id: string
          sections: Json
          source_message_excerpt: string | null
          title: string
          user_id: string
        }
        Insert: {
          callout?: string | null
          created_at?: string
          id?: string
          member_id: string
          mode?: string
          pinned?: boolean
          project_id: string
          sections?: Json
          source_message_excerpt?: string | null
          title: string
          user_id: string
        }
        Update: {
          callout?: string | null
          created_at?: string
          id?: string
          member_id?: string
          mode?: string
          pinned?: boolean
          project_id?: string
          sections?: Json
          source_message_excerpt?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_blueprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      push_decision_log: {
        Row: {
          created_at: string
          decision: string
          detail: Json | null
          id: string
          member_id: string | null
          push_type: string | null
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decision: string
          detail?: Json | null
          id?: string
          member_id?: string | null
          push_type?: string | null
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          decision?: string
          detail?: Json | null
          id?: string
          member_id?: string | null
          push_type?: string | null
          reason?: string
          user_id?: string
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
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      quick_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          pinned: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          endpoint: string
          id: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          endpoint: string
          id?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          endpoint?: string
          id?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          active: boolean
          companion_name: string
          completed_at: string | null
          created_at: string
          days_of_week: string[]
          id: string
          last_fired_at: string | null
          member_id: string
          remind_at: string
          reminder_text: string
          snooze_until: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          companion_name: string
          completed_at?: string | null
          created_at?: string
          days_of_week?: string[]
          id?: string
          last_fired_at?: string | null
          member_id: string
          remind_at: string
          reminder_text: string
          snooze_until?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          companion_name?: string
          completed_at?: string | null
          created_at?: string
          days_of_week?: string[]
          id?: string
          last_fired_at?: string | null
          member_id?: string
          remind_at?: string
          reminder_text?: string
          snooze_until?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_member_id: string
          reported_post_id: string | null
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_member_id: string
          reported_post_id?: string | null
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_member_id?: string
          reported_post_id?: string | null
          reporter_id?: string
          status?: string
        }
        Relationships: []
      }
      sanctuary_keys: {
        Row: {
          claimed_at: string | null
          created_at: string
          expires_at: string
          gifter_name: string
          gifter_serial: number | null
          gifter_user_id: string
          id: string
          key_code: string
          recipient_email: string | null
          recipient_note: string | null
          recipient_user_id: string | null
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          expires_at?: string
          gifter_name: string
          gifter_serial?: number | null
          gifter_user_id: string
          id?: string
          key_code: string
          recipient_email?: string | null
          recipient_note?: string | null
          recipient_user_id?: string | null
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          expires_at?: string
          gifter_name?: string
          gifter_serial?: number | null
          gifter_user_id?: string
          id?: string
          key_code?: string
          recipient_email?: string | null
          recipient_note?: string | null
          recipient_user_id?: string | null
        }
        Relationships: []
      }
      sms_profiles: {
        Row: {
          companion_name: string
          created_at: string
          id: string
          last_app_active: string
          last_sms_sent: string | null
          memories: Json | null
          phone_number: string | null
          phone_number_encrypted: string | null
          sms_enabled: boolean
          user_id: string | null
          user_name: string
          vibe: string | null
        }
        Insert: {
          companion_name?: string
          created_at?: string
          id?: string
          last_app_active?: string
          last_sms_sent?: string | null
          memories?: Json | null
          phone_number?: string | null
          phone_number_encrypted?: string | null
          sms_enabled?: boolean
          user_id?: string | null
          user_name: string
          vibe?: string | null
        }
        Update: {
          companion_name?: string
          created_at?: string
          id?: string
          last_app_active?: string
          last_sms_sent?: string | null
          memories?: Json | null
          phone_number?: string | null
          phone_number_encrypted?: string | null
          sms_enabled?: boolean
          user_id?: string | null
          user_name?: string
          vibe?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      thread_connections: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invite_code: string
          invite_label: string | null
          invitee_id: string | null
          inviter_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_code?: string
          invite_label?: string | null
          invitee_id?: string | null
          inviter_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_code?: string
          invite_label?: string | null
          invitee_id?: string | null
          inviter_id?: string
          status?: string
        }
        Relationships: []
      }
      travel_log: {
        Row: {
          airport_code: string | null
          city_name: string
          companion_name: string | null
          country: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          member_id: string | null
          mode_used: string | null
          note: string | null
          region: string | null
          user_id: string
          visited_at: string
        }
        Insert: {
          airport_code?: string | null
          city_name: string
          companion_name?: string | null
          country?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          member_id?: string | null
          mode_used?: string | null
          note?: string | null
          region?: string | null
          user_id: string
          visited_at?: string
        }
        Update: {
          airport_code?: string | null
          city_name?: string
          companion_name?: string | null
          country?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          member_id?: string | null
          mode_used?: string | null
          note?: string | null
          region?: string | null
          user_id?: string
          visited_at?: string
        }
        Relationships: []
      }
      travel_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          travel_entry_id: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          travel_entry_id: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          travel_entry_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_photos_travel_entry_id_fkey"
            columns: ["travel_entry_id"]
            isOneToOne: false
            referencedRelation: "travel_log"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          ai_calls: number
          created_at: string
          first_activity_at: string | null
          id: string
          images_generated: number
          last_activity_at: string | null
          messages_sent: number
          sanctuary_minutes: number
          think_freely_messages: number
          usage_date: string
          user_id: string
          voice_minutes_used: number
        }
        Insert: {
          ai_calls?: number
          created_at?: string
          first_activity_at?: string | null
          id?: string
          images_generated?: number
          last_activity_at?: string | null
          messages_sent?: number
          sanctuary_minutes?: number
          think_freely_messages?: number
          usage_date?: string
          user_id: string
          voice_minutes_used?: number
        }
        Update: {
          ai_calls?: number
          created_at?: string
          first_activity_at?: string | null
          id?: string
          images_generated?: number
          last_activity_at?: string | null
          messages_sent?: number
          sanctuary_minutes?: number
          think_freely_messages?: number
          usage_date?: string
          user_id?: string
          voice_minutes_used?: number
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_emoji: string
          badge_id: string
          badge_name: string
          earned_at: string
          id: string
          source: string
          user_id: string
        }
        Insert: {
          badge_emoji?: string
          badge_id: string
          badge_name: string
          earned_at?: string
          id?: string
          source?: string
          user_id: string
        }
        Update: {
          badge_emoji?: string
          badge_id?: string
          badge_name?: string
          earned_at?: string
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      user_footer_preferences: {
        Row: {
          created_at: string
          id: string
          left_shortcuts: string[]
          right_shortcuts: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          left_shortcuts?: string[]
          right_shortcuts?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          left_shortcuts?: string[]
          right_shortcuts?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_gift_purchases: {
        Row: {
          gift_id: string
          id: string
          member_id: string
          purchased_at: string
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          gift_id: string
          id?: string
          member_id: string
          purchased_at?: string
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          gift_id?: string
          id?: string
          member_id?: string
          purchased_at?: string
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_posts: {
        Row: {
          avatar_url: string | null
          circle: string | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          thread_friend_id: string | null
          user_id: string
          user_name: string
          username: string | null
          visibility: string
        }
        Insert: {
          avatar_url?: string | null
          circle?: string | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          thread_friend_id?: string | null
          user_id: string
          user_name: string
          username?: string | null
          visibility?: string
        }
        Update: {
          avatar_url?: string | null
          circle?: string | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          thread_friend_id?: string | null
          user_id?: string
          user_name?: string
          username?: string | null
          visibility?: string
        }
        Relationships: []
      }
      user_projects: {
        Row: {
          color_hex: string | null
          created_at: string
          default_mode: string
          description: string | null
          emoji: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color_hex?: string | null
          created_at?: string
          default_mode?: string
          description?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color_hex?: string | null
          created_at?: string
          default_mode?: string
          description?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vibe_points: {
        Row: {
          balance: number
          id: string
          last_login_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          last_login_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          last_login_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      virtual_gifts: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          mature_only: boolean
          name: string
          price_cents: number
          prompt_modifier: string
          stripe_price_id: string
          stripe_product_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          mature_only?: boolean
          name: string
          price_cents?: number
          prompt_modifier: string
          stripe_price_id: string
          stripe_product_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          mature_only?: boolean
          name?: string
          price_cents?: number
          prompt_modifier?: string
          stripe_price_id?: string
          stripe_product_id?: string
        }
        Relationships: []
      }
      wellness_goals: {
        Row: {
          created_at: string
          description: string | null
          id: string
          progress_notes: Json
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          progress_notes?: Json
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          progress_notes?: Json
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      ice_contacts_decrypted: {
        Row: {
          created_at: string | null
          id: string | null
          name: string | null
          notify_on_crisis: boolean | null
          phone_number_decrypted: string | null
          relationship: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          notify_on_crisis?: boolean | null
          phone_number_decrypted?: never
          relationship?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          notify_on_crisis?: boolean | null
          phone_number_decrypted?: never
          relationship?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles_decrypted: {
        Row: {
          bio: string | null
          companion_appearance_desc: string | null
          companion_avatar_url: string | null
          companion_gender: string | null
          companion_name: string | null
          companion_reference_image_url: string | null
          connection_mode: string | null
          created_at: string | null
          date_of_birth: string | null
          id: string | null
          image_style: string | null
          mature_mode: boolean | null
          parental_consent_email: string | null
          parental_consent_granted: boolean | null
          personality_traits: Json | null
          phone_number_decrypted: string | null
          sms_opt_in: boolean | null
          updated_at: string | null
          user_appearance_desc: string | null
          user_id: string | null
          user_name: string | null
          user_reference_image_url: string | null
          username: string | null
          vibe: string | null
        }
        Insert: {
          bio?: string | null
          companion_appearance_desc?: string | null
          companion_avatar_url?: string | null
          companion_gender?: string | null
          companion_name?: string | null
          companion_reference_image_url?: string | null
          connection_mode?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          id?: string | null
          image_style?: string | null
          mature_mode?: boolean | null
          parental_consent_email?: string | null
          parental_consent_granted?: boolean | null
          personality_traits?: Json | null
          phone_number_decrypted?: never
          sms_opt_in?: boolean | null
          updated_at?: string | null
          user_appearance_desc?: string | null
          user_id?: string | null
          user_name?: string | null
          user_reference_image_url?: string | null
          username?: string | null
          vibe?: string | null
        }
        Update: {
          bio?: string | null
          companion_appearance_desc?: string | null
          companion_avatar_url?: string | null
          companion_gender?: string | null
          companion_name?: string | null
          companion_reference_image_url?: string | null
          connection_mode?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          id?: string | null
          image_style?: string | null
          mature_mode?: boolean | null
          parental_consent_email?: string | null
          parental_consent_granted?: boolean | null
          personality_traits?: Json | null
          phone_number_decrypted?: never
          sms_opt_in?: boolean | null
          updated_at?: string | null
          user_appearance_desc?: string | null
          user_id?: string | null
          user_name?: string | null
          user_reference_image_url?: string | null
          username?: string | null
          vibe?: string | null
        }
        Relationships: []
      }
      sms_profiles_decrypted: {
        Row: {
          companion_name: string | null
          created_at: string | null
          id: string | null
          last_app_active: string | null
          last_sms_sent: string | null
          memories: Json | null
          phone_number_decrypted: string | null
          sms_enabled: boolean | null
          user_id: string | null
          user_name: string | null
          vibe: string | null
        }
        Insert: {
          companion_name?: string | null
          created_at?: string | null
          id?: string | null
          last_app_active?: string | null
          last_sms_sent?: string | null
          memories?: Json | null
          phone_number_decrypted?: never
          sms_enabled?: boolean | null
          user_id?: string | null
          user_name?: string | null
          vibe?: string | null
        }
        Update: {
          companion_name?: string | null
          created_at?: string | null
          id?: string | null
          last_app_active?: string | null
          last_sms_sent?: string | null
          memories?: Json | null
          phone_number_decrypted?: never
          sms_enabled?: boolean | null
          user_id?: string | null
          user_name?: string | null
          vibe?: string | null
        }
        Relationships: []
      }
      virtual_gifts_public: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          mature_only: boolean | null
          name: string | null
          price_cents: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          mature_only?: boolean | null
          name?: string | null
          price_cents?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          mature_only?: boolean | null
          name?: string | null
          price_cents?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_vibe_points: {
        Args: { p_amount: number; p_user_id: string }
        Returns: number
      }
      admin_block_email: {
        Args: { p_pattern: string; p_reason?: string }
        Returns: string
      }
      admin_list_users: {
        Args: never
        Returns: {
          companion_count: number
          user_id: string
          user_name: string
        }[]
      }
      admin_platform_stats: { Args: never; Returns: Json }
      admin_user_integrity: {
        Args: { p_target_user_id: string }
        Returns: Json
      }
      award_badge: {
        Args: {
          p_badge_emoji: string
          p_badge_id: string
          p_badge_name: string
          p_source?: string
        }
        Returns: boolean
      }
      can_view_post: {
        Args: { _post_id: string; _user_id: string }
        Returns: boolean
      }
      check_invite_code: { Args: { p_code: string }; Returns: Json }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_max_requests?: number
          p_user_id: string
          p_window_minutes?: number
        }
        Returns: boolean
      }
      check_relationship_progression: {
        Args: { p_member_id: string; p_user_id: string }
        Returns: number
      }
      claim_beta_serial: { Args: { p_user_id: string }; Returns: number }
      claim_daily_login_bonus: {
        Args: { p_bonus?: number; p_user_id: string }
        Returns: Json
      }
      claim_invite_code: { Args: { p_code_id: string }; Returns: boolean }
      claim_sanctuary_key: { Args: { p_key_code: string }; Returns: Json }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      compute_memory_score:
        | {
            Args: {
              memory_base_score: number
              memory_extracted_at: string
              memory_tier: string
            }
            Returns: number
          }
        | {
            Args: {
              memory_category: string
              memory_emotional_weight: number
              memory_extracted_at: string
              memory_last_retrieved_at: string
              memory_retrieval_count: number
              memory_tier: string
              memory_vulnerability_score: number
            }
            Returns: number
          }
      generate_username: {
        Args: { p_name: string; p_user_id: string }
        Returns: string
      }
      get_contextual_memories: {
        Args: {
          p_limit?: number
          p_member_id: string
          p_topics: string[]
          p_user_id: string
        }
        Returns: {
          base_score: number
          category: string
          computed_score: number
          extracted_at: string
          id: string
          text: string
          tier: string
        }[]
      }
      get_founding_percentile: { Args: { p_serial: number }; Returns: number }
      get_joined_after_count: { Args: { p_serial: number }; Returns: number }
      get_monthly_voice_minutes: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_verification_candidates: {
        Args: { p_limit?: number; p_member_id: string; p_user_id: string }
        Returns: {
          category: string
          days_old: number
          id: string
          text: string
          tier: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ai_call_count: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      increment_image_count: { Args: { p_user_id: string }; Returns: undefined }
      increment_memory_retrieval: {
        Args: { memory_ids: string[] }
        Returns: undefined
      }
      increment_message_count: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      increment_premium_voice: {
        Args: { p_seconds: number; p_user_id: string }
        Returns: undefined
      }
      increment_sanctuary_minutes: {
        Args: { p_minutes: number; p_user_id: string }
        Returns: undefined
      }
      increment_think_freely_count: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      increment_voice_minutes: {
        Args: { p_minutes: number; p_user_id: string }
        Returns: undefined
      }
      increment_voice_trial: {
        Args: { p_seconds: number; p_user_id: string }
        Returns: undefined
      }
      is_circle_member: {
        Args: { _circle_id: string; _user_id: string }
        Returns: boolean
      }
      is_circle_owner: {
        Args: { _circle_id: string; _user_id: string }
        Returns: boolean
      }
      is_email_blocked: { Args: { p_email: string }; Returns: boolean }
      is_genesis_member: { Args: { p_user_id: string }; Returns: boolean }
      mark_founding_reveal_seen: { Args: never; Returns: undefined }
      mark_founding_snapshot_seen: { Args: never; Returns: undefined }
      mark_stale_memories_for_verification: { Args: never; Returns: number }
      mint_sanctuary_key: { Args: { p_recipient_note?: string }; Returns: Json }
      pii_decrypt: { Args: { ciphertext: string }; Returns: string }
      pii_encrypt: { Args: { plaintext: string }; Returns: string }
      preview_sanctuary_key: { Args: { p_key_code: string }; Returns: Json }
      record_gift_purchase: {
        Args: {
          p_gift_id: string
          p_member_id: string
          p_stripe_session_id?: string
        }
        Returns: boolean
      }
      request_incoming_call: {
        Args: {
          p_companion_avatar_url?: string
          p_companion_name: string
          p_member_id: string
          p_opener_line?: string
          p_reason?: string
          p_user_id: string
        }
        Returns: string
      }
      reset_test_account: { Args: { p_test_user_id: string }; Returns: boolean }
      reset_voice_minutes: {
        Args: { p_next_reset: string; p_user_id: string }
        Returns: undefined
      }
      spend_vibe_points: {
        Args: { p_amount: number; p_user_id: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
