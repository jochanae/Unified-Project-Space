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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ab_tests: {
        Row: {
          created_at: string
          field_name: string
          id: string
          is_active: boolean
          org_id: string
          page_id: string
          variant_a: string
          variant_b: string
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          is_active?: boolean
          org_id: string
          page_id: string
          variant_a: string
          variant_b: string
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          is_active?: boolean
          org_id?: string
          page_id?: string
          variant_a?: string
          variant_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_tests_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_tests_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages_public"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_dev_notes: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          title: string
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
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
      affiliate_conversions: {
        Row: {
          affiliate_id: string
          amount_cents: number
          commission_cents: number
          contact_id: string | null
          created_at: string
          event_type: string
          id: string
          order_id: string | null
          org_id: string
          status: string
        }
        Insert: {
          affiliate_id: string
          amount_cents?: number
          commission_cents?: number
          contact_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          order_id?: string | null
          org_id: string
          status?: string
        }
        Update: {
          affiliate_id?: string
          amount_cents?: number
          commission_cents?: number
          contact_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          order_id?: string | null
          org_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_conversions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "funnel_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      blueprint_versions: {
        Row: {
          blueprint_data: Json
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          project_id: string | null
          project_name: string | null
          source: string
          version_label: string | null
        }
        Insert: {
          blueprint_data?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          org_id: string
          project_id?: string | null
          project_name?: string | null
          source?: string
          version_label?: string | null
        }
        Update: {
          blueprint_data?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          project_id?: string | null
          project_name?: string | null
          source?: string
          version_label?: string | null
        }
        Relationships: []
      }
      brand_kits: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          kit: Json
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          kit?: Json
          name?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          kit?: Json
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      brand_voices: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          elevenlabs_voice_id: string
          id: string
          is_default: boolean
          metadata: Json
          name: string
          org_id: string
          preview_url: string | null
          sample_storage_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          elevenlabs_voice_id: string
          id?: string
          is_default?: boolean
          metadata?: Json
          name?: string
          org_id: string
          preview_url?: string | null
          sample_storage_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          elevenlabs_voice_id?: string
          id?: string
          is_default?: boolean
          metadata?: Json
          name?: string
          org_id?: string
          preview_url?: string | null
          sample_storage_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bundle_deployments: {
        Row: {
          bundle_type: string
          caption: string | null
          created_at: string
          deployed_by: string
          id: string
          org_id: string
          platform: string
          project_id: string
          tracked_link: string | null
          utm_campaign: string | null
        }
        Insert: {
          bundle_type: string
          caption?: string | null
          created_at?: string
          deployed_by: string
          id?: string
          org_id: string
          platform?: string
          project_id: string
          tracked_link?: string | null
          utm_campaign?: string | null
        }
        Update: {
          bundle_type?: string
          caption?: string | null
          created_at?: string
          deployed_by?: string
          id?: string
          org_id?: string
          platform?: string
          project_id?: string
          tracked_link?: string | null
          utm_campaign?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bundle_deployments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_sequence_steps: {
        Row: {
          asset_id: string | null
          asset_url: string | null
          calendar_day: string | null
          calendar_time: string | null
          created_at: string
          delay_days: number | null
          format: string
          id: string
          org_id: string
          position: number
          schedule_kind: string
          sequence_id: string
          title: string
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          asset_url?: string | null
          calendar_day?: string | null
          calendar_time?: string | null
          created_at?: string
          delay_days?: number | null
          format?: string
          id?: string
          org_id: string
          position?: number
          schedule_kind?: string
          sequence_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          asset_url?: string | null
          calendar_day?: string | null
          calendar_time?: string | null
          created_at?: string
          delay_days?: number | null
          format?: string
          id?: string
          org_id?: string
          position?: number
          schedule_kind?: string
          sequence_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sequence_steps_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "marketing_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "campaign_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_sequences: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          org_id: string
          project_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          org_id: string
          project_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          org_id?: string
          project_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sequences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          org_id: string
          project_id: string
          role: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          org_id: string
          project_id: string
          role?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          org_id?: string
          project_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_sessions: {
        Row: {
          amount_cents: number | null
          completed_at: string | null
          coupon_id: string | null
          created_at: string
          currency: string | null
          customer_email: string | null
          discount_amount_cents: number | null
          id: string
          org_id: string
          page_id: string | null
          page_product_id: string | null
          status: string
          stripe_session_id: string
        }
        Insert: {
          amount_cents?: number | null
          completed_at?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          discount_amount_cents?: number | null
          id?: string
          org_id: string
          page_id?: string | null
          page_product_id?: string | null
          status?: string
          stripe_session_id: string
        }
        Update: {
          amount_cents?: number | null
          completed_at?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          discount_amount_cents?: number | null
          id?: string
          org_id?: string
          page_id?: string | null
          page_product_id?: string | null
          status?: string
          stripe_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_sessions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_sessions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_sessions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_sessions_page_product_id_fkey"
            columns: ["page_product_id"]
            isOneToOne: false
            referencedRelation: "page_products"
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
      competitor_audits: {
        Row: {
          aggregate_briefing: Json
          competitor_urls: Json
          created_at: string
          created_by: string | null
          id: string
          individual_audits: Json
          last_run_at: string | null
          org_id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          aggregate_briefing?: Json
          competitor_urls?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          individual_audits?: Json
          last_run_at?: string | null
          org_id: string
          project_id: string
          updated_at?: string
        }
        Update: {
          aggregate_briefing?: Json
          competitor_urls?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          individual_audits?: Json
          last_run_at?: string | null
          org_id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      connected_social_accounts: {
        Row: {
          access_token: string
          created_at: string
          id: string
          org_id: string
          platform: string
          platform_avatar_url: string | null
          platform_display_name: string | null
          platform_user_id: string | null
          refresh_token: string | null
          scopes: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          org_id: string
          platform: string
          platform_avatar_url?: string | null
          platform_display_name?: string | null
          platform_user_id?: string | null
          refresh_token?: string | null
          scopes?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          org_id?: string
          platform?: string
          platform_avatar_url?: string | null
          platform_display_name?: string | null
          platform_user_id?: string | null
          refresh_token?: string | null
          scopes?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connected_social_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          affiliate_id: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          notes: string | null
          org_id: string
          phone: string | null
          pipeline_stage: string
          postal_code: string | null
          region: string | null
          score: number
          sms_consent_at: string | null
          sms_unsubscribed_at: string | null
          source_project_id: string | null
          tags: string[] | null
        }
        Insert: {
          affiliate_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          notes?: string | null
          org_id: string
          phone?: string | null
          pipeline_stage?: string
          postal_code?: string | null
          region?: string | null
          score?: number
          sms_consent_at?: string | null
          sms_unsubscribed_at?: string | null
          source_project_id?: string | null
          tags?: string[] | null
        }
        Update: {
          affiliate_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          notes?: string | null
          org_id?: string
          phone?: string | null
          pipeline_stage?: string
          postal_code?: string | null
          region?: string | null
          score?: number
          sms_consent_at?: string | null
          sms_unsubscribed_at?: string | null
          source_project_id?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "funnel_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_source_project_id_fkey"
            columns: ["source_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          currency: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_redemptions: number | null
          org_id: string
          redeemed_count: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          discount_type?: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          org_id: string
          redeemed_count?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          org_id?: string
          redeemed_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupons_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_sequences: {
        Row: {
          behavior_target_page_id: string | null
          behavior_threshold_hours: number | null
          behavior_trigger: string | null
          body: string
          channel: string
          created_at: string
          delay_days: number
          id: string
          is_active: boolean
          order_index: number
          org_id: string
          project_id: string
          purpose: string
          subject: string | null
          trigger_stage: string
          updated_at: string
        }
        Insert: {
          behavior_target_page_id?: string | null
          behavior_threshold_hours?: number | null
          behavior_trigger?: string | null
          body?: string
          channel?: string
          created_at?: string
          delay_days?: number
          id?: string
          is_active?: boolean
          order_index?: number
          org_id: string
          project_id: string
          purpose?: string
          subject?: string | null
          trigger_stage?: string
          updated_at?: string
        }
        Update: {
          behavior_target_page_id?: string | null
          behavior_threshold_hours?: number | null
          behavior_trigger?: string | null
          body?: string
          channel?: string
          created_at?: string
          delay_days?: number
          id?: string
          is_active?: boolean
          order_index?: number
          org_id?: string
          project_id?: string
          purpose?: string
          subject?: string | null
          trigger_stage?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      field_locks: {
        Row: {
          created_at: string
          expires_at: string
          field_key: string
          id: string
          locked_by: string
          locked_by_color: string | null
          locked_by_name: string | null
          org_id: string
          project_id: string
          surface: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          field_key: string
          id?: string
          locked_by: string
          locked_by_color?: string | null
          locked_by_name?: string | null
          org_id: string
          project_id: string
          surface?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          field_key?: string
          id?: string
          locked_by?: string
          locked_by_color?: string | null
          locked_by_name?: string | null
          org_id?: string
          project_id?: string
          surface?: string
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          contact_id: string
          created_at: string | null
          data: Json | null
          id: string
          org_id: string
          page_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          data?: Json | null
          id?: string
          org_id: string
          page_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          org_id?: string
          page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages_public"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_affiliates: {
        Row: {
          commission_type: string
          commission_value: number
          created_at: string
          email: string | null
          id: string
          name: string
          org_id: string
          project_id: string | null
          ref_code: string
          status: string
        }
        Insert: {
          commission_type?: string
          commission_value?: number
          created_at?: string
          email?: string | null
          id?: string
          name: string
          org_id: string
          project_id?: string | null
          ref_code: string
          status?: string
        }
        Update: {
          commission_type?: string
          commission_value?: number
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          org_id?: string
          project_id?: string | null
          ref_code?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_affiliates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_affiliates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_steps: {
        Row: {
          created_at: string | null
          id: string
          order_index: number
          org_id: string
          project_id: string
          step_type: string
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_index?: number
          org_id: string
          project_id: string
          step_type?: string
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_index?: number
          org_id?: string
          project_id?: string
          step_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_steps_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_steps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      funnels: {
        Row: {
          created_at: string
          funnel_type: string
          id: string
          name: string
          org_id: string
          project_id: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          funnel_type?: string
          id?: string
          name?: string
          org_id: string
          project_id: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          funnel_type?: string
          id?: string
          name?: string
          org_id?: string
          project_id?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnels_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      image_generation_logs: {
        Row: {
          created_at: string
          final_prompt: string
          function_name: string
          id: string
          injected_additions: string | null
          org_id: string | null
          raw_prompt: string
          strict_mode: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          final_prompt: string
          function_name: string
          id?: string
          injected_additions?: string | null
          org_id?: string | null
          raw_prompt: string
          strict_mode?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          final_prompt?: string
          function_name?: string
          id?: string
          injected_additions?: string | null
          org_id?: string | null
          raw_prompt?: string
          strict_mode?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      knowledge_items: {
        Row: {
          body: string
          category: string
          created_at: string
          created_by: string | null
          feature_link: string | null
          feature_link_label: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          order_index: number
          read_minutes: number
          search_keywords: string
          skill_level: string
          subtitle: string
          tags: string[]
          title: string
          topic: string
          updated_at: string
        }
        Insert: {
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          feature_link?: string | null
          feature_link_label?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          order_index?: number
          read_minutes?: number
          search_keywords?: string
          skill_level?: string
          subtitle?: string
          tags?: string[]
          title?: string
          topic?: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          feature_link?: string | null
          feature_link_label?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          order_index?: number
          read_minutes?: number
          search_keywords?: string
          skill_level?: string
          subtitle?: string
          tags?: string[]
          title?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      landing_audit_rate_limits: {
        Row: {
          created_at: string
          id: string
          ip_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string
        }
        Relationships: []
      }
      landing_signal_leads: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          email: string
          email_sent: boolean
          email_sent_at: string | null
          id: string
          ip_hash: string | null
          loops_synced: boolean
          loops_synced_at: string | null
          postal_code: string | null
          referrer: string | null
          region: string | null
          signals: Json
          snippet: string
          status: string
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          email: string
          email_sent?: boolean
          email_sent_at?: string | null
          id?: string
          ip_hash?: string | null
          loops_synced?: boolean
          loops_synced_at?: string | null
          postal_code?: string | null
          referrer?: string | null
          region?: string | null
          signals?: Json
          snippet?: string
          status?: string
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string
          email_sent?: boolean
          email_sent_at?: string | null
          id?: string
          ip_hash?: string | null
          loops_synced?: boolean
          loops_synced_at?: string | null
          postal_code?: string | null
          referrer?: string | null
          region?: string | null
          signals?: Json
          snippet?: string
          status?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      lead_followup_events: {
        Row: {
          created_at: string
          event_type: string
          followup_id: string
          id: string
          ip_hash: string | null
          org_id: string
          source: string
          url: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          followup_id: string
          id?: string
          ip_hash?: string | null
          org_id: string
          source?: string
          url?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          followup_id?: string
          id?: string
          ip_hash?: string | null
          org_id?: string
          source?: string
          url?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_followup_events_followup_id_fkey"
            columns: ["followup_id"]
            isOneToOne: false
            referencedRelation: "lead_followups"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_followups: {
        Row: {
          body: string
          bounced_at: string | null
          channel: string
          click_count: number
          clicked_at: string | null
          complained_at: string | null
          created_at: string
          delivered_at: string | null
          engagement_status: string
          id: string
          lead_notification_id: string | null
          open_count: number
          opened_at: string | null
          org_id: string
          recipient_email: string | null
          recipient_phone: string | null
          sent_by: string | null
          source: string
          subject: string | null
          tracking_id: string
        }
        Insert: {
          body: string
          bounced_at?: string | null
          channel?: string
          click_count?: number
          clicked_at?: string | null
          complained_at?: string | null
          created_at?: string
          delivered_at?: string | null
          engagement_status?: string
          id?: string
          lead_notification_id?: string | null
          open_count?: number
          opened_at?: string | null
          org_id: string
          recipient_email?: string | null
          recipient_phone?: string | null
          sent_by?: string | null
          source?: string
          subject?: string | null
          tracking_id?: string
        }
        Update: {
          body?: string
          bounced_at?: string | null
          channel?: string
          click_count?: number
          clicked_at?: string | null
          complained_at?: string | null
          created_at?: string
          delivered_at?: string | null
          engagement_status?: string
          id?: string
          lead_notification_id?: string | null
          open_count?: number
          opened_at?: string | null
          org_id?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          sent_by?: string | null
          source?: string
          subject?: string | null
          tracking_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_followups_lead_notification_id_fkey"
            columns: ["lead_notification_id"]
            isOneToOne: false
            referencedRelation: "lead_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_followups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notifications: {
        Row: {
          contact_id: string | null
          created_at: string
          email: string
          id: string
          is_read: boolean
          metadata: Json
          org_id: string
          page_id: string | null
          project_id: string | null
          source: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          metadata?: Json
          org_id: string
          page_id?: string | null
          project_id?: string | null
          source?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          metadata?: Json
          org_id?: string
          page_id?: string | null
          project_id?: string | null
          source?: string
        }
        Relationships: []
      }
      links: {
        Row: {
          category: string
          created_at: string | null
          id: string
          org_id: string
          project_id: string
          title: string
          url: string
        }
        Insert: {
          category?: string
          created_at?: string | null
          id?: string
          org_id: string
          project_id: string
          title?: string
          url?: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          org_id?: string
          project_id?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_assets: {
        Row: {
          asset_type: string
          config: Json
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          org_id: string
          project_id: string | null
          share_token: string
          storage_path: string | null
          template_id: string
          title: string
          updated_at: string
        }
        Insert: {
          asset_type?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          org_id: string
          project_id?: string | null
          share_token?: string
          storage_path?: string | null
          template_id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          asset_type?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          org_id?: string
          project_id?: string | null
          share_token?: string
          storage_path?: string | null
          template_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          body: string
          created_at: string | null
          done: boolean
          id: string
          links: string[] | null
          org_id: string
          project_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string
          created_at?: string | null
          done?: boolean
          id?: string
          links?: string[] | null
          org_id: string
          project_id: string
          title?: string
          type?: string
        }
        Update: {
          body?: string
          created_at?: string | null
          done?: boolean
          id?: string
          links?: string[] | null
          org_id?: string
          project_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      order_refunds: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          error_message: string | null
          id: string
          order_id: string
          org_id: string
          reason: string | null
          requested_by: string | null
          status: string
          stripe_refund_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          order_id: string
          org_id: string
          reason?: string | null
          requested_by?: string | null
          status?: string
          stripe_refund_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          order_id?: string
          org_id?: string
          reason?: string | null
          requested_by?: string | null
          status?: string
          stripe_refund_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_cents: number
          checkout_session_id: string | null
          created_at: string
          currency: string
          customer_email: string | null
          id: string
          metadata: Json
          org_id: string
          page_id: string | null
          page_product_id: string | null
          product_name: string | null
          refunded_cents: number
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          checkout_session_id?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          id?: string
          metadata?: Json
          org_id: string
          page_id?: string | null
          page_product_id?: string | null
          product_name?: string | null
          refunded_cents?: number
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          checkout_session_id?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          id?: string
          metadata?: Json
          org_id?: string
          page_id?: string | null
          page_product_id?: string | null
          product_name?: string | null
          refunded_cents?: number
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          brand_logo_url: string | null
          brand_name: string | null
          brand_primary_color: string | null
          created_at: string | null
          custom_domain: string | null
          default_local_business: Json | null
          domain_verified: boolean | null
          from_phone: string | null
          id: string
          name: string
          plan: string
          slug: string
          studio_brand: Json | null
        }
        Insert: {
          brand_logo_url?: string | null
          brand_name?: string | null
          brand_primary_color?: string | null
          created_at?: string | null
          custom_domain?: string | null
          default_local_business?: Json | null
          domain_verified?: boolean | null
          from_phone?: string | null
          id?: string
          name: string
          plan?: string
          slug: string
          studio_brand?: Json | null
        }
        Update: {
          brand_logo_url?: string | null
          brand_name?: string | null
          brand_primary_color?: string | null
          created_at?: string | null
          custom_domain?: string | null
          default_local_business?: Json | null
          domain_verified?: boolean | null
          from_phone?: string | null
          id?: string
          name?: string
          plan?: string
          slug?: string
          studio_brand?: Json | null
        }
        Relationships: []
      }
      page_products: {
        Row: {
          amount_cents: number
          block_id: string
          created_at: string
          currency: string
          description: string | null
          id: string
          image_url: string | null
          mode: string
          name: string
          org_id: string
          page_id: string
          provider: string
          recurring_interval: string | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          block_id: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          mode?: string
          name: string
          org_id: string
          page_id: string
          provider?: string
          recurring_interval?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          block_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          mode?: string
          name?: string
          org_id?: string
          page_id?: string
          provider?: string
          recurring_interval?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_products_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_products_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_products_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages_public"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          country: string | null
          created_at: string
          id: string
          org_id: string
          page_id: string
          referrer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          org_id: string
          page_id: string
          referrer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          org_id?: string
          page_id?: string
          referrer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_views_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_views_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages_public"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          active_hook: string | null
          content_blocks: Json | null
          created_at: string | null
          funnel_id: string | null
          funnel_step_id: string | null
          id: string
          is_published: boolean
          local_business: Json | null
          next_page_id: string | null
          org_id: string
          project_id: string | null
          published_content_blocks: Json | null
          published_url: string | null
          slug: string
          step_index: number
          theme: string
          title: string
        }
        Insert: {
          active_hook?: string | null
          content_blocks?: Json | null
          created_at?: string | null
          funnel_id?: string | null
          funnel_step_id?: string | null
          id?: string
          is_published?: boolean
          local_business?: Json | null
          next_page_id?: string | null
          org_id: string
          project_id?: string | null
          published_content_blocks?: Json | null
          published_url?: string | null
          slug: string
          step_index?: number
          theme?: string
          title?: string
        }
        Update: {
          active_hook?: string | null
          content_blocks?: Json | null
          created_at?: string | null
          funnel_id?: string | null
          funnel_step_id?: string | null
          id?: string
          is_published?: boolean
          local_business?: Json | null
          next_page_id?: string | null
          org_id?: string
          project_id?: string | null
          published_content_blocks?: Json | null
          published_url?: string | null
          slug?: string
          step_index?: number
          theme?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_funnel_step_id_fkey"
            columns: ["funnel_step_id"]
            isOneToOne: false
            referencedRelation: "funnel_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_next_page_id_fkey"
            columns: ["next_page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_next_page_id_fkey"
            columns: ["next_page_id"]
            isOneToOne: false
            referencedRelation: "pages_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_accounts: {
        Row: {
          account_label: string | null
          created_at: string
          created_by: string | null
          encrypted_secret_key: string
          id: string
          is_active: boolean
          last_verified_at: string | null
          org_id: string
          provider: string
          publishable_key: string | null
          updated_at: string
          verification_status: string
          webhook_secret_encrypted: string | null
        }
        Insert: {
          account_label?: string | null
          created_at?: string
          created_by?: string | null
          encrypted_secret_key: string
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          org_id: string
          provider?: string
          publishable_key?: string | null
          updated_at?: string
          verification_status?: string
          webhook_secret_encrypted?: string | null
        }
        Update: {
          account_label?: string | null
          created_at?: string
          created_by?: string | null
          encrypted_secret_key?: string
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          org_id?: string
          provider?: string
          publishable_key?: string | null
          updated_at?: string
          verification_status?: string
          webhook_secret_encrypted?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      presentq_decks: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          metadata: Json
          org_id: string
          page_id: string | null
          project_id: string | null
          share_token: string
          slide_count: number
          slides: Json
          source_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json
          org_id: string
          page_id?: string | null
          project_id?: string | null
          share_token?: string
          slide_count?: number
          slides?: Json
          source_url?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json
          org_id?: string
          page_id?: string | null
          project_id?: string | null
          share_token?: string
          slide_count?: number
          slides?: Json
          source_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "presentq_decks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presentq_decks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presentq_decks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presentq_decks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_context: {
        Row: {
          context_type: string
          created_at: string
          directive: string
          id: string
          org_id: string
          project_id: string
        }
        Insert: {
          context_type?: string
          created_at?: string
          directive: string
          id?: string
          org_id: string
          project_id: string
        }
        Update: {
          context_type?: string
          created_at?: string
          directive?: string
          id?: string
          org_id?: string
          project_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          auto_followup_enabled: boolean
          brand_override: Json | null
          created_at: string | null
          custom_domain: string | null
          deleted_at: string | null
          domain_verified: boolean | null
          goal: string | null
          id: string
          name: string
          org_id: string
          slug: string
          status: string
        }
        Insert: {
          auto_followup_enabled?: boolean
          brand_override?: Json | null
          created_at?: string | null
          custom_domain?: string | null
          deleted_at?: string | null
          domain_verified?: boolean | null
          goal?: string | null
          id?: string
          name: string
          org_id: string
          slug: string
          status?: string
        }
        Update: {
          auto_followup_enabled?: boolean
          brand_override?: Json | null
          created_at?: string | null
          custom_domain?: string | null
          deleted_at?: string | null
          domain_verified?: boolean | null
          goal?: string | null
          id?: string
          name?: string
          org_id?: string
          slug?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          org_id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          org_id: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          org_id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      queued_behavior_log: {
        Row: {
          behavior_trigger: string
          contact_id: string
          id: string
          org_id: string
          queued_at: string
          sequence_id: string
        }
        Insert: {
          behavior_trigger: string
          contact_id: string
          id?: string
          org_id: string
          queued_at?: string
          sequence_id: string
        }
        Update: {
          behavior_trigger?: string
          contact_id?: string
          id?: string
          org_id?: string
          queued_at?: string
          sequence_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referred_email: string | null
          referred_user_id: string | null
          referrer_user_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_user_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_user_id_fkey"
            columns: ["referrer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      render_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          metadata: Json
          org_id: string
          output_url: string | null
          progress: number
          provider: string
          started_at: string | null
          status: string
          updated_at: string
          video_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          org_id: string
          output_url?: string | null
          progress?: number
          provider?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          video_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          org_id?: string
          output_url?: string | null
          progress?: number
          provider?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          video_id?: string
        }
        Relationships: []
      }
      saved_campaigns: {
        Row: {
          auto_winner: boolean
          created_at: string
          created_by: string | null
          deployed_at: string | null
          id: string
          is_winner: boolean
          linked_asset_ids: string[]
          linked_page_ids: string[]
          metrics: Json
          metrics_updated_at: string | null
          name: string
          notes: string | null
          org_id: string
          performance_tier: string
          plan: Json
          project_id: string | null
          rationale: string | null
          updated_at: string
        }
        Insert: {
          auto_winner?: boolean
          created_at?: string
          created_by?: string | null
          deployed_at?: string | null
          id?: string
          is_winner?: boolean
          linked_asset_ids?: string[]
          linked_page_ids?: string[]
          metrics?: Json
          metrics_updated_at?: string | null
          name?: string
          notes?: string | null
          org_id: string
          performance_tier?: string
          plan?: Json
          project_id?: string | null
          rationale?: string | null
          updated_at?: string
        }
        Update: {
          auto_winner?: boolean
          created_at?: string
          created_by?: string | null
          deployed_at?: string | null
          id?: string
          is_winner?: boolean
          linked_asset_ids?: string[]
          linked_page_ids?: string[]
          metrics?: Json
          metrics_updated_at?: string | null
          name?: string
          notes?: string | null
          org_id?: string
          performance_tier?: string
          plan?: Json
          project_id?: string | null
          rationale?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_followups: {
        Row: {
          attempts: number
          body: string
          channel: string
          created_at: string
          id: string
          last_error: string | null
          lead_notification_id: string | null
          org_id: string
          recipient_email: string | null
          recipient_phone: string | null
          scheduled_by: string
          send_at: string
          sent_at: string | null
          source: string
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          body: string
          channel?: string
          created_at?: string
          id?: string
          last_error?: string | null
          lead_notification_id?: string | null
          org_id: string
          recipient_email?: string | null
          recipient_phone?: string | null
          scheduled_by: string
          send_at: string
          sent_at?: string | null
          source?: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          body?: string
          channel?: string
          created_at?: string
          id?: string
          last_error?: string | null
          lead_notification_id?: string | null
          org_id?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          scheduled_by?: string
          send_at?: string
          sent_at?: string | null
          source?: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shared_blueprints: {
        Row: {
          blueprint_data: Json
          created_at: string
          id: string
          org_id: string
          project_name: string | null
          share_token: string
        }
        Insert: {
          blueprint_data?: Json
          created_at?: string
          id?: string
          org_id: string
          project_name?: string | null
          share_token?: string
        }
        Update: {
          blueprint_data?: Json
          created_at?: string
          id?: string
          org_id?: string
          project_name?: string | null
          share_token?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      social_campaigns: {
        Row: {
          audio_suggestion: string | null
          body: string
          campaign_id: string | null
          campaign_theme: string | null
          content_type: string
          created_at: string
          created_by: string | null
          created_page_id: string | null
          cta: string | null
          generation_mode: string
          hashtags: string[]
          hook: string
          id: string
          image_url: string | null
          media_suggestion: string | null
          narrative_day: number | null
          narrative_role: string | null
          org_id: string
          platform: string
          posted_at: string | null
          project_id: string | null
          refinement_count: number
          scheduled_at: string | null
          signal_source_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          audio_suggestion?: string | null
          body?: string
          campaign_id?: string | null
          campaign_theme?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          created_page_id?: string | null
          cta?: string | null
          generation_mode?: string
          hashtags?: string[]
          hook?: string
          id?: string
          image_url?: string | null
          media_suggestion?: string | null
          narrative_day?: number | null
          narrative_role?: string | null
          org_id: string
          platform?: string
          posted_at?: string | null
          project_id?: string | null
          refinement_count?: number
          scheduled_at?: string | null
          signal_source_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          audio_suggestion?: string | null
          body?: string
          campaign_id?: string | null
          campaign_theme?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          created_page_id?: string | null
          cta?: string | null
          generation_mode?: string
          hashtags?: string[]
          hook?: string
          id?: string
          image_url?: string | null
          media_suggestion?: string | null
          narrative_day?: number | null
          narrative_role?: string | null
          org_id?: string
          platform?: string
          posted_at?: string | null
          project_id?: string | null
          refinement_count?: number
          scheduled_at?: string | null
          signal_source_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_campaigns_created_page_id_fkey"
            columns: ["created_page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_campaigns_created_page_id_fkey"
            columns: ["created_page_id"]
            isOneToOne: false
            referencedRelation: "pages_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_blocks: {
        Row: {
          block_type: string
          content: Json
          created_at: string
          id: string
          order_index: number
          org_id: string
          project_id: string
          status: string
        }
        Insert: {
          block_type?: string
          content?: Json
          created_at?: string
          id?: string
          order_index?: number
          org_id: string
          project_id: string
          status?: string
        }
        Update: {
          block_type?: string
          content?: Json
          created_at?: string
          id?: string
          order_index?: number
          org_id?: string
          project_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_blocks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_blocks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_videos: {
        Row: {
          audio_preview_url: string | null
          audio_storage_path: string | null
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          id: string
          metadata: Json
          org_id: string
          phase: number
          project_id: string
          script: string
          status: string
          template: string
          title: string
          updated_at: string
          voice_id: string | null
          voice_name: string | null
        }
        Insert: {
          audio_preview_url?: string | null
          audio_storage_path?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          metadata?: Json
          org_id: string
          phase?: number
          project_id: string
          script?: string
          status?: string
          template?: string
          title?: string
          updated_at?: string
          voice_id?: string | null
          voice_name?: string | null
        }
        Update: {
          audio_preview_url?: string | null
          audio_storage_path?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          metadata?: Json
          org_id?: string
          phase?: number
          project_id?: string
          script?: string
          status?: string
          template?: string
          title?: string
          updated_at?: string
          voice_id?: string | null
          voice_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_videos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          engagement_score: number
          first_name: string | null
          id: string
          last_engaged_at: string | null
          last_name: string | null
          org_id: string
          project_id: string | null
          source: string
          status: string
          subscribed_at: string
          tags: string[] | null
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          engagement_score?: number
          first_name?: string | null
          id?: string
          last_engaged_at?: string | null
          last_name?: string | null
          org_id: string
          project_id?: string | null
          source?: string
          status?: string
          subscribed_at?: string
          tags?: string[] | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          engagement_score?: number
          first_name?: string | null
          id?: string
          last_engaged_at?: string | null
          last_name?: string | null
          org_id?: string
          project_id?: string | null
          source?: string
          status?: string
          subscribed_at?: string
          tags?: string[] | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscribers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscribers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          id: string
          one_time_purchase: boolean | null
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          one_time_purchase?: boolean | null
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          one_time_purchase?: boolean | null
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      users: {
        Row: {
          avatar_url: string | null
          blocked_at: string | null
          blocked_reason: string | null
          created_at: string | null
          display_name: string | null
          email: string
          has_completed_onboarding: boolean
          id: string
          org_id: string
          referral_code: string | null
          referral_reward_expires_at: string | null
          role: string
          timezone: string | null
        }
        Insert: {
          avatar_url?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          has_completed_onboarding?: boolean
          id: string
          org_id: string
          referral_code?: string | null
          referral_reward_expires_at?: string | null
          role?: string
          timezone?: string | null
        }
        Update: {
          avatar_url?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          has_completed_onboarding?: boolean
          id?: string
          org_id?: string
          referral_code?: string | null
          referral_reward_expires_at?: string | null
          role?: string
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          last_status_code: number | null
          last_triggered_at: string | null
          org_id: string
          project_id: string | null
          secret: string
          url: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          last_status_code?: number | null
          last_triggered_at?: string | null
          org_id: string
          project_id?: string | null
          secret: string
          url: string
        }
        Update: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          last_status_code?: number | null
          last_triggered_at?: string | null
          org_id?: string
          project_id?: string | null
          secret?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_endpoints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ab_tests_public: {
        Row: {
          field_name: string | null
          id: string | null
          page_id: string | null
          variant_a: string | null
          variant_b: string | null
        }
        Insert: {
          field_name?: string | null
          id?: string | null
          page_id?: string | null
          variant_a?: string | null
          variant_b?: string | null
        }
        Update: {
          field_name?: string | null
          id?: string | null
          page_id?: string | null
          variant_a?: string | null
          variant_b?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_tests_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_tests_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages_public"
            referencedColumns: ["id"]
          },
        ]
      }
      pages_public: {
        Row: {
          content_blocks: Json | null
          id: string | null
          local_business: Json | null
          next_page_id: string | null
          next_slug: string | null
          org_id: string | null
          project_id: string | null
          slug: string | null
          theme: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pages_next_page_id_fkey"
            columns: ["next_page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_next_page_id_fkey"
            columns: ["next_page_id"]
            isOneToOne: false
            referencedRelation: "pages_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      acquire_field_lock: {
        Args: {
          _field_key: string
          _project_id: string
          _surface: string
          _user_color: string
          _user_name: string
        }
        Returns: {
          locked_by: string
          locked_by_color: string
          locked_by_name: string
          success: boolean
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      evaluate_followup_triggers: { Args: never; Returns: number }
      get_org_subscription_tier: { Args: { _org_id: string }; Returns: string }
      get_shared_blueprint: {
        Args: { _token: string }
        Returns: {
          blueprint_data: Json
          project_name: string
        }[]
      }
      get_user_org_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      purge_expired_deleted_projects: { Args: never; Returns: number }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recalc_campaign_metrics: {
        Args: { _campaign_id: string }
        Returns: undefined
      }
      recalc_org_campaign_metrics: {
        Args: { _org_id: string }
        Returns: number
      }
      release_field_lock: {
        Args: { _field_key: string; _project_id: string; _surface: string }
        Returns: undefined
      }
      restore_project: { Args: { _project_id: string }; Returns: boolean }
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
