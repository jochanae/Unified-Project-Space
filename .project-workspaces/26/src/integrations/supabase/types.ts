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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_balance_history: {
        Row: {
          account_id: string | null
          balance: number
          created_at: string
          id: string
          snapshot_date: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          balance: number
          created_at?: string
          id?: string
          snapshot_date?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          balance?: number
          created_at?: string
          id?: string
          snapshot_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_balance_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_contributions: {
        Row: {
          account_id: string | null
          amount: number
          contribution_date: string
          contribution_type: string
          created_at: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          contribution_date?: string
          contribution_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          contribution_date?: string
          contribution_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_contributions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_number_masked: string | null
          account_type: Database["public"]["Enums"]["account_type"]
          balance: number
          category: Database["public"]["Enums"]["account_category"]
          created_at: string
          id: string
          institution: string | null
          is_manual: boolean
          name: string
          notes: string | null
          payment_url: string | null
          plaid_account_id: string | null
          total_contributions: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number_masked?: string | null
          account_type?: Database["public"]["Enums"]["account_type"]
          balance?: number
          category?: Database["public"]["Enums"]["account_category"]
          created_at?: string
          id?: string
          institution?: string | null
          is_manual?: boolean
          name: string
          notes?: string | null
          payment_url?: string | null
          plaid_account_id?: string | null
          total_contributions?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number_masked?: string | null
          account_type?: Database["public"]["Enums"]["account_type"]
          balance?: number
          category?: Database["public"]["Enums"]["account_category"]
          created_at?: string
          id?: string
          institution?: string | null
          is_manual?: boolean
          name?: string
          notes?: string | null
          payment_url?: string | null
          plaid_account_id?: string | null
          total_contributions?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_emails: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
          id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      autopay_history: {
        Row: {
          amount: number
          bill_id: string
          created_at: string
          error_message: string | null
          id: string
          payment_method_id: string | null
          processed_at: string
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          bill_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          payment_method_id?: string | null
          processed_at?: string
          status: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          bill_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          payment_method_id?: string | null
          processed_at?: string
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "autopay_history_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autopay_history_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "user_autopay_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_partner_referrals: {
        Row: {
          admin_notes: string | null
          base_monthly_fee: number | null
          business_type: string | null
          commission_amount: number | null
          commission_months_paid: number | null
          commission_months_total: number | null
          commission_percent: number | null
          commission_start_date: string | null
          contacted_at: string | null
          converted_at: string | null
          created_at: string
          deal_value: number | null
          estimated_seats: number | null
          id: string
          last_commission_date: string | null
          monthly_revenue: number | null
          notes: string | null
          partner_id: string | null
          payout_date: string | null
          payout_method: string | null
          payout_reference: string | null
          payout_status: Database["public"]["Enums"]["payout_status"]
          per_seat_fee: number | null
          referred_business_name: string
          referred_contact_email: string | null
          referred_contact_name: string | null
          referred_contact_phone: string | null
          referrer_professional_id: string | null
          referrer_type: Database["public"]["Enums"]["referrer_type"]
          referrer_user_id: string | null
          status: Database["public"]["Enums"]["b2b_referral_status"]
          stripe_subscription_id: string | null
          total_commission_paid: number | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          base_monthly_fee?: number | null
          business_type?: string | null
          commission_amount?: number | null
          commission_months_paid?: number | null
          commission_months_total?: number | null
          commission_percent?: number | null
          commission_start_date?: string | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          deal_value?: number | null
          estimated_seats?: number | null
          id?: string
          last_commission_date?: string | null
          monthly_revenue?: number | null
          notes?: string | null
          partner_id?: string | null
          payout_date?: string | null
          payout_method?: string | null
          payout_reference?: string | null
          payout_status?: Database["public"]["Enums"]["payout_status"]
          per_seat_fee?: number | null
          referred_business_name: string
          referred_contact_email?: string | null
          referred_contact_name?: string | null
          referred_contact_phone?: string | null
          referrer_professional_id?: string | null
          referrer_type?: Database["public"]["Enums"]["referrer_type"]
          referrer_user_id?: string | null
          status?: Database["public"]["Enums"]["b2b_referral_status"]
          stripe_subscription_id?: string | null
          total_commission_paid?: number | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          base_monthly_fee?: number | null
          business_type?: string | null
          commission_amount?: number | null
          commission_months_paid?: number | null
          commission_months_total?: number | null
          commission_percent?: number | null
          commission_start_date?: string | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          deal_value?: number | null
          estimated_seats?: number | null
          id?: string
          last_commission_date?: string | null
          monthly_revenue?: number | null
          notes?: string | null
          partner_id?: string | null
          payout_date?: string | null
          payout_method?: string | null
          payout_reference?: string | null
          payout_status?: Database["public"]["Enums"]["payout_status"]
          per_seat_fee?: number | null
          referred_business_name?: string
          referred_contact_email?: string | null
          referred_contact_name?: string | null
          referred_contact_phone?: string | null
          referrer_professional_id?: string | null
          referrer_type?: Database["public"]["Enums"]["referrer_type"]
          referrer_user_id?: string | null
          status?: Database["public"]["Enums"]["b2b_referral_status"]
          stripe_subscription_id?: string | null
          total_commission_paid?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_partner_referrals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_partner_referrals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_partner_referrals_referrer_professional_id_fkey"
            columns: ["referrer_professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_partner_referrals_referrer_professional_id_fkey"
            columns: ["referrer_professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_test_submissions: {
        Row: {
          browser: string | null
          bugs_reported: string | null
          checklist_data: Json
          created_at: string
          device: string | null
          general_feedback: string | null
          id: string
          items_completed: number | null
          progress_percent: number | null
          suggestions: string | null
          tester_name: string
          total_items: number | null
        }
        Insert: {
          browser?: string | null
          bugs_reported?: string | null
          checklist_data: Json
          created_at?: string
          device?: string | null
          general_feedback?: string | null
          id?: string
          items_completed?: number | null
          progress_percent?: number | null
          suggestions?: string | null
          tester_name: string
          total_items?: number | null
        }
        Update: {
          browser?: string | null
          bugs_reported?: string | null
          checklist_data?: Json
          created_at?: string
          device?: string | null
          general_feedback?: string | null
          id?: string
          items_completed?: number | null
          progress_percent?: number | null
          suggestions?: string | null
          tester_name?: string
          total_items?: number | null
        }
        Relationships: []
      }
      bill_payments: {
        Row: {
          account_id: string | null
          amount: number
          bill_id: string
          confirmation_number: string | null
          created_at: string
          id: string
          late_fee_amount: number | null
          linked_transaction_id: string | null
          notes: string | null
          paid_date: string
          payment_method: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          bill_id: string
          confirmation_number?: string | null
          created_at?: string
          id?: string
          late_fee_amount?: number | null
          linked_transaction_id?: string | null
          notes?: string | null
          paid_date?: string
          payment_method?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          bill_id?: string
          confirmation_number?: string | null
          created_at?: string
          id?: string
          late_fee_amount?: number | null
          linked_transaction_id?: string | null
          notes?: string | null
          paid_date?: string
          payment_method?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_tax_details: {
        Row: {
          bill_id: string
          created_at: string
          deductible_amount: number | null
          deduction_category: string | null
          id: string
          insurance_amount: number | null
          interest_amount: number | null
          is_tax_deductible: boolean | null
          notes: string | null
          principal_amount: number | null
          property_tax_amount: number | null
          student_loan_interest: number | null
          tax_year: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bill_id: string
          created_at?: string
          deductible_amount?: number | null
          deduction_category?: string | null
          id?: string
          insurance_amount?: number | null
          interest_amount?: number | null
          is_tax_deductible?: boolean | null
          notes?: string | null
          principal_amount?: number | null
          property_tax_amount?: number | null
          student_loan_interest?: number | null
          tax_year?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bill_id?: string
          created_at?: string
          deductible_amount?: number | null
          deduction_category?: string | null
          id?: string
          insurance_amount?: number | null
          interest_amount?: number | null
          is_tax_deductible?: boolean | null
          notes?: string | null
          principal_amount?: number | null
          property_tax_amount?: number | null
          student_loan_interest?: number | null
          tax_year?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_tax_details_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          amount: number
          autopay_account_last_four: string | null
          autopay_source: string | null
          category: Database["public"]["Enums"]["bill_category"]
          created_at: string
          due_date: string
          end_date: string | null
          frequency: Database["public"]["Enums"]["bill_frequency"]
          id: string
          is_autopay: boolean
          is_recurring: boolean
          is_variable_amount: boolean
          last_paid_date: string | null
          late_fee_amount: number | null
          linked_account_id: string | null
          linked_debt_id: string | null
          name: string
          notes: string | null
          payment_url: string | null
          remaining_balance: number | null
          reminder_days_before: number
          reminder_enabled: boolean
          scheduled_payment_date: string | null
          status: Database["public"]["Enums"]["bill_status"]
          total_payments: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          autopay_account_last_four?: string | null
          autopay_source?: string | null
          category?: Database["public"]["Enums"]["bill_category"]
          created_at?: string
          due_date: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["bill_frequency"]
          id?: string
          is_autopay?: boolean
          is_recurring?: boolean
          is_variable_amount?: boolean
          last_paid_date?: string | null
          late_fee_amount?: number | null
          linked_account_id?: string | null
          linked_debt_id?: string | null
          name: string
          notes?: string | null
          payment_url?: string | null
          remaining_balance?: number | null
          reminder_days_before?: number
          reminder_enabled?: boolean
          scheduled_payment_date?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
          total_payments?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          autopay_account_last_four?: string | null
          autopay_source?: string | null
          category?: Database["public"]["Enums"]["bill_category"]
          created_at?: string
          due_date?: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["bill_frequency"]
          id?: string
          is_autopay?: boolean
          is_recurring?: boolean
          is_variable_amount?: boolean
          last_paid_date?: string | null
          late_fee_amount?: number | null
          linked_account_id?: string | null
          linked_debt_id?: string | null
          name?: string
          notes?: string | null
          payment_url?: string | null
          remaining_balance?: number | null
          reminder_days_before?: number
          reminder_enabled?: boolean
          scheduled_payment_date?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
          total_payments?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_linked_debt_id_fkey"
            columns: ["linked_debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
        ]
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
      bloom_advice_history: {
        Row: {
          conclusion: string
          conditions: string | null
          created_at: string
          id: string
          is_active: boolean
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conclusion: string
          conditions?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conclusion?: string
          conditions?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bloom_bursts: {
        Row: {
          category: string
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          limit_amount: number
          name: string
          notes: string | null
          spent_amount: number
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          limit_amount?: number
          name: string
          notes?: string | null
          spent_amount?: number
          start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          limit_amount?: number
          name?: string
          notes?: string | null
          spent_amount?: number
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bloom_coach_conversations: {
        Row: {
          category: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bloom_coach_feedback: {
        Row: {
          created_at: string
          feedback_type: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_type: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_type?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bloom_coach_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "bloom_coach_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      bloom_coach_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bloom_coach_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "bloom_coach_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      bloom_coach_profiles: {
        Row: {
          age_range: string | null
          biggest_challenge: string[] | null
          coaching_style: string | null
          created_at: string
          employment_type: string | null
          family_status: string | null
          financial_literacy: string | null
          has_dependents: boolean | null
          id: string
          income_range: string | null
          is_complete: boolean | null
          num_dependents: number | null
          risk_tolerance: string | null
          top_financial_goals: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_range?: string | null
          biggest_challenge?: string[] | null
          coaching_style?: string | null
          created_at?: string
          employment_type?: string | null
          family_status?: string | null
          financial_literacy?: string | null
          has_dependents?: boolean | null
          id?: string
          income_range?: string | null
          is_complete?: boolean | null
          num_dependents?: number | null
          risk_tolerance?: string | null
          top_financial_goals?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_range?: string | null
          biggest_challenge?: string[] | null
          coaching_style?: string | null
          created_at?: string
          employment_type?: string | null
          family_status?: string | null
          financial_literacy?: string | null
          has_dependents?: boolean | null
          id?: string
          income_range?: string | null
          is_complete?: boolean | null
          num_dependents?: number | null
          risk_tolerance?: string | null
          top_financial_goals?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bloom_coach_saved_notes: {
        Row: {
          category: string
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          message_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bloom_coach_saved_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "bloom_coach_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bloom_coach_saved_notes_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "bloom_coach_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      bloom_financial_plans: {
        Row: {
          conversation_id: string | null
          created_at: string
          current_amount: number | null
          description: string | null
          id: string
          linked_goal_id: string | null
          plan_type: string
          priority: string
          status: string
          target_amount: number | null
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          current_amount?: number | null
          description?: string | null
          id?: string
          linked_goal_id?: string | null
          plan_type?: string
          priority?: string
          status?: string
          target_amount?: number | null
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          current_amount?: number | null
          description?: string | null
          id?: string
          linked_goal_id?: string | null
          plan_type?: string
          priority?: string
          status?: string
          target_amount?: number | null
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bloom_financial_plans_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "bloom_coach_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bloom_financial_plans_linked_goal_id_fkey"
            columns: ["linked_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      bloom_plan_actions: {
        Row: {
          amount: number | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          frequency: string | null
          id: string
          is_completed: boolean
          linked_account_id: string | null
          linked_bill_id: string | null
          linked_debt_id: string | null
          milestone_id: string
          order_index: number
          plan_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          frequency?: string | null
          id?: string
          is_completed?: boolean
          linked_account_id?: string | null
          linked_bill_id?: string | null
          linked_debt_id?: string | null
          milestone_id: string
          order_index?: number
          plan_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          frequency?: string | null
          id?: string
          is_completed?: boolean
          linked_account_id?: string | null
          linked_bill_id?: string | null
          linked_debt_id?: string | null
          milestone_id?: string
          order_index?: number
          plan_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bloom_plan_actions_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bloom_plan_actions_linked_bill_id_fkey"
            columns: ["linked_bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bloom_plan_actions_linked_debt_id_fkey"
            columns: ["linked_debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bloom_plan_actions_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "bloom_plan_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bloom_plan_actions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "bloom_financial_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      bloom_plan_milestones: {
        Row: {
          created_at: string
          current_amount: number | null
          description: string | null
          id: string
          order_index: number
          plan_id: string
          status: string
          target_amount: number | null
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number | null
          description?: string | null
          id?: string
          order_index?: number
          plan_id: string
          status?: string
          target_amount?: number | null
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_amount?: number | null
          description?: string | null
          id?: string
          order_index?: number
          plan_id?: string
          status?: string
          target_amount?: number | null
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bloom_plan_milestones_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "bloom_financial_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      bloom_price_alerts: {
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
      bloom_watchlist: {
        Row: {
          created_at: string
          id: string
          symbol: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          symbol: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_activity: {
        Row: {
          activity_type: string
          budget_id: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          budget_id: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          budget_id?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_activity_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_alert_settings: {
        Row: {
          created_at: string
          custom_enabled: boolean
          custom_threshold: number | null
          email_notifications: boolean
          enabled: boolean
          id: string
          push_notifications: boolean
          threshold_100: boolean
          threshold_75: boolean
          threshold_90: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_enabled?: boolean
          custom_threshold?: number | null
          email_notifications?: boolean
          enabled?: boolean
          id?: string
          push_notifications?: boolean
          threshold_100?: boolean
          threshold_75?: boolean
          threshold_90?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_enabled?: boolean
          custom_threshold?: number | null
          email_notifications?: boolean
          enabled?: boolean
          id?: string
          push_notifications?: boolean
          threshold_100?: boolean
          threshold_75?: boolean
          threshold_90?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_alerts: {
        Row: {
          alert_type: string
          budget_id: string
          created_at: string
          id: string
          is_dismissed: boolean
          is_read: boolean
          message: string
          threshold_percent: number
          user_id: string
        }
        Insert: {
          alert_type: string
          budget_id: string
          created_at?: string
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message: string
          threshold_percent: number
          user_id: string
        }
        Update: {
          alert_type?: string
          budget_id?: string
          created_at?: string
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message?: string
          threshold_percent?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_alerts_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_collaborators: {
        Row: {
          budget_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          budget_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          budget_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_collaborators_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_comments: {
        Row: {
          budget_id: string
          content: string
          created_at: string
          id: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_id: string
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_id?: string
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_comments_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "budget_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_invitations: {
        Row: {
          budget_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invite_token: string
          invited_by: string
          role: string
          status: string
        }
        Insert: {
          budget_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invite_token: string
          invited_by: string
          role?: string
          status?: string
        }
        Update: {
          budget_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_invitations_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_transactions: {
        Row: {
          amount: number
          budget_id: string
          created_at: string
          description: string | null
          id: string
          receipt_url: string | null
          transaction_date: string
          user_id: string
        }
        Insert: {
          amount: number
          budget_id: string
          created_at?: string
          description?: string | null
          id?: string
          receipt_url?: string | null
          transaction_date?: string
          user_id: string
        }
        Update: {
          amount?: number
          budget_id?: string
          created_at?: string
          description?: string | null
          id?: string
          receipt_url?: string | null
          transaction_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_transactions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount: number
          auto_contribute: boolean
          category: Database["public"]["Enums"]["budget_category"]
          contribution_percent: number
          created_at: string
          id: string
          is_active: boolean
          linked_goal_id: string | null
          name: string
          period: string
          spent: number
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          auto_contribute?: boolean
          category?: Database["public"]["Enums"]["budget_category"]
          contribution_percent?: number
          created_at?: string
          id?: string
          is_active?: boolean
          linked_goal_id?: string | null
          name: string
          period?: string
          spent?: number
          start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          auto_contribute?: boolean
          category?: Database["public"]["Enums"]["budget_category"]
          contribution_percent?: number
          created_at?: string
          id?: string
          is_active?: boolean
          linked_goal_id?: string | null
          name?: string
          period?: string
          spent?: number
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_linked_goal_id_fkey"
            columns: ["linked_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
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
      business_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          is_deductible: boolean
          notes: string | null
          receipt_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          is_deductible?: boolean
          notes?: string | null
          receipt_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          is_deductible?: boolean
          notes?: string | null
          receipt_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      card_interest: {
        Row: {
          created_at: string
          email: string
          family_size: number | null
          full_name: string
          has_kids: boolean | null
          id: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          email: string
          family_size?: number | null
          full_name: string
          has_kids?: boolean | null
          id?: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          family_size?: number | null
          full_name?: string
          has_kids?: boolean | null
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      card_themes: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          gradient_end: string
          gradient_start: string
          icon: string | null
          id: string
          image_url: string | null
          is_premium: boolean
          name: string
          unlock_requirement: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          gradient_end: string
          gradient_start: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_premium?: boolean
          name: string
          unlock_requirement?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          gradient_end?: string
          gradient_start?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_premium?: boolean
          name?: string
          unlock_requirement?: string | null
        }
        Relationships: []
      }
      charitable_donations: {
        Row: {
          amount: number
          created_at: string
          donation_date: string
          donation_type: string
          id: string
          is_tax_eligible: boolean
          notes: string | null
          organization: string
          receipt_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          donation_date?: string
          donation_type?: string
          id?: string
          is_tax_eligible?: boolean
          notes?: string | null
          organization: string
          receipt_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          donation_date?: string
          donation_type?: string
          id?: string
          is_tax_eligible?: boolean
          notes?: string | null
          organization?: string
          receipt_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_accounts: {
        Row: {
          created_at: string
          credit_limit: number
          current_balance: number
          id: string
          last_updated: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_limit?: number
          current_balance?: number
          id?: string
          last_updated?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          credit_limit?: number
          current_balance?: number
          id?: string
          last_updated?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_products: {
        Row: {
          affiliate_url: string | null
          annual_fee: number
          apr_range: string | null
          category: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          issuer: string
          name: string
          product_type: string
          rating: number | null
          rewards_description: string | null
          updated_at: string
        }
        Insert: {
          affiliate_url?: string | null
          annual_fee?: number
          apr_range?: string | null
          category?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          issuer: string
          name: string
          product_type?: string
          rating?: number | null
          rewards_description?: string | null
          updated_at?: string
        }
        Update: {
          affiliate_url?: string | null
          annual_fee?: number
          apr_range?: string | null
          category?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          issuer?: string
          name?: string
          product_type?: string
          rating?: number | null
          rewards_description?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      credit_score_goals: {
        Row: {
          achieved_at: string | null
          created_at: string
          current_score: number | null
          id: string
          is_achieved: boolean
          notes: string | null
          starting_score: number
          target_date: string | null
          target_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string
          current_score?: number | null
          id?: string
          is_achieved?: boolean
          notes?: string | null
          starting_score: number
          target_date?: string | null
          target_score: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          created_at?: string
          current_score?: number | null
          id?: string
          is_achieved?: boolean
          notes?: string | null
          starting_score?: number
          target_date?: string | null
          target_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_scores: {
        Row: {
          bureau: string
          created_at: string
          id: string
          notes: string | null
          score: number
          score_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bureau?: string
          created_at?: string
          id?: string
          notes?: string | null
          score: number
          score_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bureau?: string
          created_at?: string
          id?: string
          notes?: string | null
          score?: number
          score_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_quote_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          id: string
          name: string
          reason: string
          requested_rate: string
          reviewed_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          reason: string
          requested_rate: string
          reviewed_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          reason?: string
          requested_rate?: string
          reviewed_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      dashboard_highlights: {
        Row: {
          color_variant: string | null
          content: string
          created_at: string | null
          display_order: number | null
          ends_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          partner_id: string | null
          starts_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          color_variant?: string | null
          content: string
          created_at?: string | null
          display_order?: number | null
          ends_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          partner_id?: string | null
          starts_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          color_variant?: string | null
          content?: string
          created_at?: string | null
          display_order?: number | null
          ends_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          partner_id?: string | null
          starts_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_highlights_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_highlights_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners_public"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_payments: {
        Row: {
          amount: number
          created_at: string
          debt_id: string
          id: string
          notes: string | null
          payment_date: string
          payment_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          debt_id: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          debt_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          created_at: string
          creditor: string | null
          current_balance: number
          debt_type: string
          due_day: number | null
          id: string
          interest_rate: number
          linked_account_id: string | null
          minimum_payment: number
          name: string
          notes: string | null
          original_balance: number
          payment_url: string | null
          priority_order: number | null
          remaining_term_months: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creditor?: string | null
          current_balance?: number
          debt_type?: string
          due_day?: number | null
          id?: string
          interest_rate?: number
          linked_account_id?: string | null
          minimum_payment?: number
          name: string
          notes?: string | null
          original_balance?: number
          payment_url?: string | null
          priority_order?: number | null
          remaining_term_months?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          creditor?: string | null
          current_balance?: number
          debt_type?: string
          due_day?: number | null
          id?: string
          interest_rate?: number
          linked_account_id?: string | null
          minimum_payment?: number
          name?: string
          notes?: string | null
          original_balance?: number
          payment_url?: string | null
          priority_order?: number | null
          remaining_term_months?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debts_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_links: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          platform: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          platform?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          platform?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      event_reminders: {
        Row: {
          created_at: string
          event_id: string
          event_time: string
          event_title: string
          id: string
          is_notified: boolean
          reminder_set_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_time: string
          event_title: string
          id?: string
          is_notified?: boolean
          reminder_set_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_time?: string
          event_title?: string
          id?: string
          is_notified?: boolean
          reminder_set_at?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string | null
          event_type: string
          id: string
          image_url: string | null
          is_featured: boolean
          is_published: boolean
          location: string | null
          max_attendees: number | null
          meeting_url: string | null
          partner_id: string | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          location?: string | null
          max_attendees?: number | null
          meeting_url?: string | null
          partner_id?: string | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          location?: string | null
          max_attendees?: number | null
          meeting_url?: string | null
          partner_id?: string | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners_public"
            referencedColumns: ["id"]
          },
        ]
      }
      expectation_acknowledgments: {
        Row: {
          acknowledged_at: string
          created_at: string
          expectations_version: number
          id: string
          kid_profile_id: string
        }
        Insert: {
          acknowledged_at?: string
          created_at?: string
          expectations_version?: number
          id?: string
          kid_profile_id: string
        }
        Update: {
          acknowledged_at?: string
          created_at?: string
          expectations_version?: number
          id?: string
          kid_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expectation_acknowledgments_kid_profile_id_fkey"
            columns: ["kid_profile_id"]
            isOneToOne: false
            referencedRelation: "kids_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expectation_acknowledgments_kid_profile_id_fkey"
            columns: ["kid_profile_id"]
            isOneToOne: false
            referencedRelation: "kids_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      family_chat_messages: {
        Row: {
          created_at: string
          emoji_reaction: string | null
          family_link_id: string
          id: string
          is_read: boolean
          message: string
          sender_id: string
          sender_type: string
          sticker_url: string | null
        }
        Insert: {
          created_at?: string
          emoji_reaction?: string | null
          family_link_id: string
          id?: string
          is_read?: boolean
          message: string
          sender_id: string
          sender_type: string
          sticker_url?: string | null
        }
        Update: {
          created_at?: string
          emoji_reaction?: string | null
          family_link_id?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_id?: string
          sender_type?: string
          sticker_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_chat_messages_family_link_id_fkey"
            columns: ["family_link_id"]
            isOneToOne: false
            referencedRelation: "family_links"
            referencedColumns: ["id"]
          },
        ]
      }
      family_expectations: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          kid_profile_id: string
          parent_user_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          kid_profile_id: string
          parent_user_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          kid_profile_id?: string
          parent_user_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_expectations_kid_profile_id_fkey"
            columns: ["kid_profile_id"]
            isOneToOne: false
            referencedRelation: "kids_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_expectations_kid_profile_id_fkey"
            columns: ["kid_profile_id"]
            isOneToOne: false
            referencedRelation: "kids_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      family_group_members: {
        Row: {
          family_group_id: string
          id: string
          joined_at: string
          kid_profile_id: string | null
          member_type: string
          role: string
          user_id: string | null
        }
        Insert: {
          family_group_id: string
          id?: string
          joined_at?: string
          kid_profile_id?: string | null
          member_type: string
          role?: string
          user_id?: string | null
        }
        Update: {
          family_group_id?: string
          id?: string
          joined_at?: string
          kid_profile_id?: string | null
          member_type?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_group_members_family_group_id_fkey"
            columns: ["family_group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_group_members_kid_profile_id_fkey"
            columns: ["kid_profile_id"]
            isOneToOne: false
            referencedRelation: "kids_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_group_members_kid_profile_id_fkey"
            columns: ["kid_profile_id"]
            isOneToOne: false
            referencedRelation: "kids_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      family_groups: {
        Row: {
          created_at: string
          created_by: string
          group_message_count: number
          group_message_limit: number
          id: string
          invite_code: string
          max_kids: number
          name: string
          subscription_tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          group_message_count?: number
          group_message_limit?: number
          id?: string
          invite_code?: string
          max_kids?: number
          name: string
          subscription_tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          group_message_count?: number
          group_message_limit?: number
          id?: string
          invite_code?: string
          max_kids?: number
          name?: string
          subscription_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_links: {
        Row: {
          accepted_at: string | null
          can_approve_spending: boolean
          can_assign_chores: boolean
          can_set_allowance: boolean
          can_view_transactions: boolean
          created_at: string
          id: string
          invited_at: string
          kid_profile_id: string
          parent_user_id: string
          relationship: string
          status: Database["public"]["Enums"]["family_link_status"]
        }
        Insert: {
          accepted_at?: string | null
          can_approve_spending?: boolean
          can_assign_chores?: boolean
          can_set_allowance?: boolean
          can_view_transactions?: boolean
          created_at?: string
          id?: string
          invited_at?: string
          kid_profile_id: string
          parent_user_id: string
          relationship?: string
          status?: Database["public"]["Enums"]["family_link_status"]
        }
        Update: {
          accepted_at?: string | null
          can_approve_spending?: boolean
          can_assign_chores?: boolean
          can_set_allowance?: boolean
          can_view_transactions?: boolean
          created_at?: string
          id?: string
          invited_at?: string
          kid_profile_id?: string
          parent_user_id?: string
          relationship?: string
          status?: Database["public"]["Enums"]["family_link_status"]
        }
        Relationships: [
          {
            foreignKeyName: "family_links_kid_profile_id_fkey"
            columns: ["kid_profile_id"]
            isOneToOne: false
            referencedRelation: "kids_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_links_kid_profile_id_fkey"
            columns: ["kid_profile_id"]
            isOneToOne: false
            referencedRelation: "kids_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          feature_key: string
          feature_name: string
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          feature_key: string
          feature_name: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          feature_key?: string
          feature_name?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      feature_usage: {
        Row: {
          created_at: string
          feature_name: string
          id: string
          updated_at: string
          usage_count: number
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_name: string
          id?: string
          updated_at?: string
          usage_count?: number
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature_name?: string
          id?: string
          updated_at?: string
          usage_count?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_tips: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          publish_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          publish_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          publish_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      founder_profile: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          name: string
          social_links: Json | null
          title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          name: string
          social_links?: Json | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          name?: string
          social_links?: Json | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gmail_connections: {
        Row: {
          access_token: string
          access_token_vault_id: string | null
          created_at: string
          expires_at: string
          gmail_address: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          refresh_token: string
          refresh_token_vault_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string
          access_token_vault_id?: string | null
          created_at?: string
          expires_at: string
          gmail_address?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          refresh_token?: string
          refresh_token_vault_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          access_token_vault_id?: string | null
          created_at?: string
          expires_at?: string
          gmail_address?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          refresh_token?: string
          refresh_token_vault_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goal_activity: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          goal_id: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          goal_id: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          goal_id?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_activity_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_collaborators: {
        Row: {
          goal_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["collaborator_role"]
          user_id: string
        }
        Insert: {
          goal_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["collaborator_role"]
          user_id: string
        }
        Update: {
          goal_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["collaborator_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_collaborators_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_comments: {
        Row: {
          content: string
          created_at: string
          goal_id: string
          id: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          goal_id: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          goal_id?: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_comments_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "goal_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_contributions: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          goal_id: string
          id: string
          is_approved: boolean
          notes: string | null
          receipt_url: string | null
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          goal_id: string
          id?: string
          is_approved?: boolean
          notes?: string | null
          receipt_url?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          goal_id?: string
          id?: string
          is_approved?: boolean
          notes?: string | null
          receipt_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          goal_id: string
          id: string
          invite_token: string
          invited_by: string
          role: Database["public"]["Enums"]["collaborator_role"]
          status: Database["public"]["Enums"]["invitation_status"]
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          goal_id: string
          id?: string
          invite_token: string
          invited_by: string
          role?: Database["public"]["Enums"]["collaborator_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          goal_id?: string
          id?: string
          invite_token?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["collaborator_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "goal_invitations_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          current_amount: number
          deadline: string | null
          description: string | null
          goal_type: Database["public"]["Enums"]["goal_type"]
          id: string
          invite_code: string | null
          is_archived: boolean
          target_amount: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          deadline?: string | null
          description?: string | null
          goal_type?: Database["public"]["Enums"]["goal_type"]
          id?: string
          invite_code?: string | null
          is_archived?: boolean
          target_amount?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          deadline?: string | null
          description?: string | null
          goal_type?: Database["public"]["Enums"]["goal_type"]
          id?: string
          invite_code?: string | null
          is_archived?: boolean
          target_amount?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_chat_messages: {
        Row: {
          created_at: string
          family_group_id: string
          id: string
          message: string
          message_type: string
          related_chore_id: string | null
          sender_id: string
          sender_type: string
          sticker_url: string | null
        }
        Insert: {
          created_at?: string
          family_group_id: string
          id?: string
          message: string
          message_type?: string
          related_chore_id?: string | null
          sender_id: string
          sender_type: string
          sticker_url?: string | null
        }
        Update: {
          created_at?: string
          family_group_id?: string
          id?: string
          message?: string
          message_type?: string
          related_chore_id?: string | null
          sender_id?: string
          sender_type?: string
          sticker_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_chat_messages_family_group_id_fkey"
            columns: ["family_group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_chat_messages_related_chore_id_fkey"
            columns: ["related_chore_id"]
            isOneToOne: false
            referencedRelation: "kid_chores"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          family_group_id: string
          id: string
          is_assignable: boolean | null
          name: string
          role: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          family_group_id: string
          id?: string
          is_assignable?: boolean | null
          name: string
          role?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          family_group_id?: string
          id?: string
          is_assignable?: boolean | null
          name?: string
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_members_family_group_id_fkey"
            columns: ["family_group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      household_task_assignments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_by: string
          assigned_to_kid_id: string | null
          assigned_to_user_id: string | null
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          reward_amount: number | null
          status: string | null
          task_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_by: string
          assigned_to_kid_id?: string | null
          assigned_to_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          reward_amount?: number | null
          status?: string | null
          task_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_by?: string
          assigned_to_kid_id?: string | null
          assigned_to_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          reward_amount?: number | null
          status?: string | null
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_task_assignments_assigned_to_kid_id_fkey"
            columns: ["assigned_to_kid_id"]
            isOneToOne: false
            referencedRelation: "kids_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_task_assignments_assigned_to_kid_id_fkey"
            columns: ["assigned_to_kid_id"]
            isOneToOne: false
            referencedRelation: "kids_profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "household_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      household_tasks: {
        Row: {
          category: string | null
          created_at: string
          default_reward: number | null
          description: string | null
          eligible_member_ids: string[] | null
          family_group_id: string | null
          id: string
          is_active: boolean | null
          is_recurring: boolean | null
          recurrence_pattern: string | null
          rotation_enabled: boolean | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          default_reward?: number | null
          description?: string | null
          eligible_member_ids?: string[] | null
          family_group_id?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          recurrence_pattern?: string | null
          rotation_enabled?: boolean | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          default_reward?: number | null
          description?: string | null
          eligible_member_ids?: string[] | null
          family_group_id?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          recurrence_pattern?: string | null
          rotation_enabled?: boolean | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_tasks_family_group_id_fkey"
            columns: ["family_group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      inspirational_quotes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      insurance_policies: {
        Row: {
          coverage_amount: number | null
          created_at: string
          deductible: number | null
          end_date: string | null
          id: string
          name: string
          notes: string | null
          policy_number: string | null
          policy_type: string
          premium_amount: number
          premium_frequency: string
          provider: string | null
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          coverage_amount?: number | null
          created_at?: string
          deductible?: number | null
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          policy_number?: string | null
          policy_type?: string
          premium_amount?: number
          premium_frequency?: string
          provider?: string | null
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          coverage_amount?: number | null
          created_at?: string
          deductible?: number | null
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          policy_number?: string | null
          policy_type?: string
          premium_amount?: number
          premium_frequency?: string
          provider?: string | null
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kid_allowances: {
        Row: {
          amount: number
          created_at: string
          frequency: string
          id: string
          is_active: boolean
          kid_id: string
          next_payout_date: string
          notes: string | null
          set_by: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          kid_id: string
          next_payout_date: string
          notes?: string | null
          set_by?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          kid_id?: string
          next_payout_date?: string
          notes?: string | null
          set_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kid_allowances_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kid_allowances_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      kid_chores: {
        Row: {
          approved_at: string | null
          assigned_by: string | null
          checklist: Json | null
          chore_type: string
          claimed_at: string | null
          claimed_by: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          family_group_id: string | null
          icon: string | null
          id: string
          is_bonus: boolean
          is_group_visible: boolean
          is_recurring: boolean
          kid_id: string
          recurrence_pattern: string | null
          reward_amount: number
          status: Database["public"]["Enums"]["chore_status"]
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          assigned_by?: string | null
          checklist?: Json | null
          chore_type?: string
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          family_group_id?: string | null
          icon?: string | null
          id?: string
          is_bonus?: boolean
          is_group_visible?: boolean
          is_recurring?: boolean
          kid_id: string
          recurrence_pattern?: string | null
          reward_amount?: number
          status?: Database["public"]["Enums"]["chore_status"]
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          assigned_by?: string | null
          checklist?: Json | null
          chore_type?: string
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          family_group_id?: string | null
          icon?: string | null
          id?: string
          is_bonus?: boolean
          is_group_visible?: boolean
          is_recurring?: boolean
          kid_id?: string
          recurrence_pattern?: string | null
          reward_amount?: number
          status?: Database["public"]["Enums"]["chore_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kid_chores_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "kids_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kid_chores_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "kids_profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kid_chores_family_group_id_fkey"
            columns: ["family_group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kid_chores_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kid_chores_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      kid_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          is_pinned: boolean | null
          kid_id: string
          note_type: string | null
          parent_user_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          kid_id: string
          note_type?: string | null
          parent_user_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          kid_id?: string
          note_type?: string | null
          parent_user_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kid_notes_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kid_notes_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      kid_savings_goals: {
        Row: {
          bucket_type: string
          completed_at: string | null
          created_at: string
          current_amount: number
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_completed: boolean
          kid_id: string
          target_amount: number
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          bucket_type?: string
          completed_at?: string | null
          created_at?: string
          current_amount?: number
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_completed?: boolean
          kid_id: string
          target_amount: number
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          bucket_type?: string
          completed_at?: string | null
          created_at?: string
          current_amount?: number
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_completed?: boolean
          kid_id?: string
          target_amount?: number
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kid_savings_goals_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kid_savings_goals_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      kid_transactions: {
        Row: {
          amount: number
          bucket: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          kid_id: string
          related_chore_id: string | null
          transaction_date: string
          type: Database["public"]["Enums"]["kid_transaction_type"]
        }
        Insert: {
          amount: number
          bucket?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kid_id: string
          related_chore_id?: string | null
          transaction_date?: string
          type: Database["public"]["Enums"]["kid_transaction_type"]
        }
        Update: {
          amount?: number
          bucket?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kid_id?: string
          related_chore_id?: string | null
          transaction_date?: string
          type?: Database["public"]["Enums"]["kid_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "kid_transactions_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kid_transactions_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      kids_profiles: {
        Row: {
          age_tier: Database["public"]["Enums"]["kid_age_tier"]
          avatar_emoji: string | null
          avatar_url: string | null
          birth_date: string
          card_theme_id: string | null
          chart_color: string | null
          created_at: string
          current_balance: number
          dark_mode_enabled: boolean
          display_name: string | null
          first_name: string | null
          give_balance: number
          id: string
          last_active_at: string | null
          last_name: string | null
          notifications_enabled: boolean
          pin_hash: string
          save_balance: number
          security_answer_hash: string | null
          security_question: string | null
          sound_effects_enabled: boolean
          spend_balance: number
          split_give_percent: number
          split_save_percent: number
          split_spend_percent: number
          streak_days: number
          total_earned: number
          total_saved: number
          total_spent: number
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          age_tier: Database["public"]["Enums"]["kid_age_tier"]
          avatar_emoji?: string | null
          avatar_url?: string | null
          birth_date: string
          card_theme_id?: string | null
          chart_color?: string | null
          created_at?: string
          current_balance?: number
          dark_mode_enabled?: boolean
          display_name?: string | null
          first_name?: string | null
          give_balance?: number
          id?: string
          last_active_at?: string | null
          last_name?: string | null
          notifications_enabled?: boolean
          pin_hash: string
          save_balance?: number
          security_answer_hash?: string | null
          security_question?: string | null
          sound_effects_enabled?: boolean
          spend_balance?: number
          split_give_percent?: number
          split_save_percent?: number
          split_spend_percent?: number
          streak_days?: number
          total_earned?: number
          total_saved?: number
          total_spent?: number
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          age_tier?: Database["public"]["Enums"]["kid_age_tier"]
          avatar_emoji?: string | null
          avatar_url?: string | null
          birth_date?: string
          card_theme_id?: string | null
          chart_color?: string | null
          created_at?: string
          current_balance?: number
          dark_mode_enabled?: boolean
          display_name?: string | null
          first_name?: string | null
          give_balance?: number
          id?: string
          last_active_at?: string | null
          last_name?: string | null
          notifications_enabled?: boolean
          pin_hash?: string
          save_balance?: number
          security_answer_hash?: string | null
          security_question?: string | null
          sound_effects_enabled?: boolean
          spend_balance?: number
          split_give_percent?: number
          split_save_percent?: number
          split_spend_percent?: number
          streak_days?: number
          total_earned?: number
          total_saved?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kids_profiles_card_theme_id_fkey"
            columns: ["card_theme_id"]
            isOneToOne: false
            referencedRelation: "card_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_content: {
        Row: {
          age_group: string | null
          category: string
          chapters: Json | null
          content: string | null
          content_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          duration_minutes: number | null
          featured_order: number | null
          id: string
          is_featured: boolean
          is_premium: boolean
          is_published: boolean
          partner_id: string | null
          sort_order: number | null
          subcategory: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          type: string
          updated_at: string
          video_id: string | null
          video_type: string | null
          view_count: number
        }
        Insert: {
          age_group?: string | null
          category?: string
          chapters?: Json | null
          content?: string | null
          content_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          featured_order?: number | null
          id?: string
          is_featured?: boolean
          is_premium?: boolean
          is_published?: boolean
          partner_id?: string | null
          sort_order?: number | null
          subcategory?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          type?: string
          updated_at?: string
          video_id?: string | null
          video_type?: string | null
          view_count?: number
        }
        Update: {
          age_group?: string | null
          category?: string
          chapters?: Json | null
          content?: string | null
          content_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          featured_order?: number | null
          id?: string
          is_featured?: boolean
          is_premium?: boolean
          is_published?: boolean
          partner_id?: string | null
          sort_order?: number | null
          subcategory?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          type?: string
          updated_at?: string
          video_id?: string | null
          video_type?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "learning_content_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_content_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners_public"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_favorites: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_sections: {
        Row: {
          content: string | null
          created_at: string
          estimated_minutes: number | null
          id: string
          key_points: string[] | null
          lesson_id: string
          section_number: number
          section_type: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          estimated_minutes?: number | null
          id: string
          key_points?: string[] | null
          lesson_id: string
          section_number?: number
          section_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          estimated_minutes?: number | null
          id?: string
          key_points?: string[] | null
          lesson_id?: string
          section_number?: number
          section_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      livestream_settings: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          partner_id: string | null
          stream_title: string | null
          stream_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          partner_id?: string | null
          stream_title?: string | null
          stream_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          partner_id?: string | null
          stream_title?: string | null
          stream_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "livestream_settings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livestream_settings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners_public"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          is_used: boolean
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          is_used?: boolean
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          is_used?: boolean
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      monthly_income: {
        Row: {
          created_at: string
          id: string
          month: number
          notes: string | null
          total_income: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          notes?: string | null
          total_income?: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          notes?: string | null
          total_income?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      newsletter_items: {
        Row: {
          category: string
          content: string | null
          created_at: string
          created_by: string | null
          external_link: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_published: boolean
          priority: number
          published_at: string | null
          source: string | null
          summary: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          external_link?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          priority?: number
          published_at?: string | null
          source?: string | null
          summary: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          external_link?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          priority?: number
          published_at?: string | null
          source?: string | null
          summary?: string
          title?: string
          updated_at?: string
          video_url?: string | null
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
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_members: {
        Row: {
          id: string
          joined_at: string
          partner_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          partner_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          partner_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_members_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_members_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners_public"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          address: string | null
          branding_level: string | null
          contact_email: string | null
          contact_info: string | null
          contact_logo_url: string | null
          created_at: string
          custom_domain: string | null
          design_theme: string | null
          external_website_url: string | null
          hero_description: string | null
          hero_title: string | null
          highlights_text: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          office_name: string | null
          owner_user_id: string
          phone: string | null
          primary_color: string | null
          seats_purchased: number | null
          seats_used: number | null
          secondary_color: string | null
          show_name_with_logo: boolean
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          branding_level?: string | null
          contact_email?: string | null
          contact_info?: string | null
          contact_logo_url?: string | null
          created_at?: string
          custom_domain?: string | null
          design_theme?: string | null
          external_website_url?: string | null
          hero_description?: string | null
          hero_title?: string | null
          highlights_text?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          office_name?: string | null
          owner_user_id: string
          phone?: string | null
          primary_color?: string | null
          seats_purchased?: number | null
          seats_used?: number | null
          secondary_color?: string | null
          show_name_with_logo?: boolean
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          branding_level?: string | null
          contact_email?: string | null
          contact_info?: string | null
          contact_logo_url?: string | null
          created_at?: string
          custom_domain?: string | null
          design_theme?: string | null
          external_website_url?: string | null
          hero_description?: string | null
          hero_title?: string | null
          highlights_text?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          office_name?: string | null
          owner_user_id?: string
          phone?: string | null
          primary_color?: string | null
          seats_purchased?: number | null
          seats_used?: number | null
          secondary_color?: string | null
          show_name_with_logo?: boolean
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string
          details: string | null
          display_name: string
          entity_id: string
          entity_type: string
          id: string
          instructions: string | null
          is_primary: boolean | null
          method_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          display_name: string
          entity_id: string
          entity_type: string
          id?: string
          instructions?: string | null
          is_primary?: boolean | null
          method_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          display_name?: string
          entity_id?: string
          entity_type?: string
          id?: string
          instructions?: string | null
          is_primary?: boolean | null
          method_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payroll_details: {
        Row: {
          created_at: string
          dental_insurance: number
          disability_insurance: number
          employer_name: string | null
          federal_tax: number
          fsa: number
          gross_pay: number
          health_insurance: number
          hsa: number
          id: string
          life_insurance: number
          local_tax: number
          medicare: number
          net_pay: number
          notes: string | null
          other_deductions: number
          other_deductions_label: string | null
          pay_period: string | null
          retirement_401k: number
          social_security: number
          state_tax: number
          transaction_id: string
          union_dues: number
          updated_at: string
          user_id: string
          vision_insurance: number
        }
        Insert: {
          created_at?: string
          dental_insurance?: number
          disability_insurance?: number
          employer_name?: string | null
          federal_tax?: number
          fsa?: number
          gross_pay?: number
          health_insurance?: number
          hsa?: number
          id?: string
          life_insurance?: number
          local_tax?: number
          medicare?: number
          net_pay?: number
          notes?: string | null
          other_deductions?: number
          other_deductions_label?: string | null
          pay_period?: string | null
          retirement_401k?: number
          social_security?: number
          state_tax?: number
          transaction_id: string
          union_dues?: number
          updated_at?: string
          user_id: string
          vision_insurance?: number
        }
        Update: {
          created_at?: string
          dental_insurance?: number
          disability_insurance?: number
          employer_name?: string | null
          federal_tax?: number
          fsa?: number
          gross_pay?: number
          health_insurance?: number
          hsa?: number
          id?: string
          life_insurance?: number
          local_tax?: number
          medicare?: number
          net_pay?: number
          notes?: string | null
          other_deductions?: number
          other_deductions_label?: string | null
          pay_period?: string | null
          retirement_401k?: number
          social_security?: number
          state_tax?: number
          transaction_id?: string
          union_dues?: number
          updated_at?: string
          user_id?: string
          vision_insurance?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_details_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_email_bills: {
        Row: {
          approved_at: string | null
          confidence_score: number | null
          created_at: string
          created_bill_id: string | null
          detected_amount: number | null
          detected_category: string | null
          detected_due_date: string | null
          detected_payee: string
          from_address: string | null
          id: string
          raw_content: string | null
          received_at: string | null
          rejected_at: string | null
          source_email_id: string
          status: string
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          confidence_score?: number | null
          created_at?: string
          created_bill_id?: string | null
          detected_amount?: number | null
          detected_category?: string | null
          detected_due_date?: string | null
          detected_payee: string
          from_address?: string | null
          id?: string
          raw_content?: string | null
          received_at?: string | null
          rejected_at?: string | null
          source_email_id: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          confidence_score?: number | null
          created_at?: string
          created_bill_id?: string | null
          detected_amount?: number | null
          detected_category?: string | null
          detected_due_date?: string | null
          detected_payee?: string
          from_address?: string | null
          id?: string
          raw_content?: string | null
          received_at?: string | null
          rejected_at?: string | null
          source_email_id?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_email_bills_created_bill_id_fkey"
            columns: ["created_bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      plaid_items: {
        Row: {
          created_at: string
          id: string
          institution_id: string | null
          institution_name: string | null
          plaid_access_token: string
          plaid_item_id: string
          status: string
          updated_at: string
          user_id: string
          vault_secret_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id?: string | null
          institution_name?: string | null
          plaid_access_token: string
          plaid_item_id: string
          status?: string
          updated_at?: string
          user_id: string
          vault_secret_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string | null
          institution_name?: string | null
          plaid_access_token?: string
          plaid_item_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          vault_secret_id?: string | null
        }
        Relationships: []
      }
      platform_api_keys: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_configured: boolean
          key_hint: string | null
          last_verified_at: string | null
          service_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_configured?: boolean
          key_hint?: string | null
          last_verified_at?: string | null
          service_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_configured?: boolean
          key_hint?: string | null
          last_verified_at?: string | null
          service_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      professional_applications: {
        Row: {
          admin_notes: string | null
          avatar_url: string | null
          bio: string
          calendar_url: string | null
          certifications: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          linkedin_url: string | null
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialties: string[] | null
          specialty: string
          states_licensed: string[] | null
          status: string
          submitted_at: string
          title: string
          updated_at: string
          user_id: string | null
          website_url: string | null
          years_experience: number | null
        }
        Insert: {
          admin_notes?: string | null
          avatar_url?: string | null
          bio: string
          calendar_url?: string | null
          certifications?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          linkedin_url?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialties?: string[] | null
          specialty: string
          states_licensed?: string[] | null
          status?: string
          submitted_at?: string
          title: string
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
          years_experience?: number | null
        }
        Update: {
          admin_notes?: string | null
          avatar_url?: string | null
          bio?: string
          calendar_url?: string | null
          certifications?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          linkedin_url?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialties?: string[] | null
          specialty?: string
          states_licensed?: string[] | null
          status?: string
          submitted_at?: string
          title?: string
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      professional_profile_views: {
        Row: {
          id: string
          professional_id: string
          referrer_url: string | null
          viewed_at: string
          viewer_ip_hash: string | null
          viewer_user_id: string | null
        }
        Insert: {
          id?: string
          professional_id: string
          referrer_url?: string | null
          viewed_at?: string
          viewer_ip_hash?: string | null
          viewer_user_id?: string | null
        }
        Update: {
          id?: string
          professional_id?: string
          referrer_url?: string | null
          viewed_at?: string
          viewer_ip_hash?: string | null
          viewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_profile_views_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_profile_views_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_referrals: {
        Row: {
          converted_at: string | null
          converted_to_premium: boolean | null
          created_at: string
          id: string
          professional_id: string
          referred_email: string | null
          referred_user_id: string | null
          signup_completed: boolean | null
        }
        Insert: {
          converted_at?: string | null
          converted_to_premium?: boolean | null
          created_at?: string
          id?: string
          professional_id: string
          referred_email?: string | null
          referred_user_id?: string | null
          signup_completed?: boolean | null
        }
        Update: {
          converted_at?: string | null
          converted_to_premium?: boolean | null
          created_at?: string
          id?: string
          professional_id?: string
          referred_email?: string | null
          referred_user_id?: string | null
          signup_completed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_referrals_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_referrals_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_reviews: {
        Row: {
          created_at: string
          id: string
          professional_id: string
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          professional_id: string
          rating: number
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          professional_id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          avatar_url: string | null
          bio: string | null
          calendar_url: string | null
          claim_token_expires_at: string | null
          claim_token_hash: string | null
          claim_token_issued_by: string | null
          claimed_at: string | null
          contact_email: string | null
          created_at: string
          id: string
          is_active: boolean
          is_featured: boolean
          is_verified: boolean
          name: string
          partner_id: string | null
          payout_method: string | null
          qr_code_url: string | null
          rating: number | null
          review_count: number | null
          specialties: string[] | null
          specialty: string
          states_licensed: string[] | null
          stripe_connect_account_id: string | null
          title: string | null
          updated_at: string
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          calendar_url?: string | null
          claim_token_expires_at?: string | null
          claim_token_hash?: string | null
          claim_token_issued_by?: string | null
          claimed_at?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_verified?: boolean
          name: string
          partner_id?: string | null
          payout_method?: string | null
          qr_code_url?: string | null
          rating?: number | null
          review_count?: number | null
          specialties?: string[] | null
          specialty?: string
          states_licensed?: string[] | null
          stripe_connect_account_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          calendar_url?: string | null
          claim_token_expires_at?: string | null
          claim_token_hash?: string | null
          claim_token_issued_by?: string | null
          claimed_at?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_verified?: boolean
          name?: string
          partner_id?: string | null
          payout_method?: string | null
          qr_code_url?: string | null
          rating?: number | null
          review_count?: number | null
          specialties?: string[] | null
          specialty?: string
          states_licensed?: string[] | null
          stripe_connect_account_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          biometric_enabled: boolean | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_premium: boolean | null
          last_name: string | null
          nav_tips_dismissed: boolean | null
          partner_id: string | null
          payout_method: string | null
          phone_number: string | null
          phone_verified: boolean | null
          premium_checked_at: string | null
          premium_until: string | null
          profile_image_url: string | null
          stripe_connect_account_id: string | null
          stripe_customer_id: string | null
          updated_at: string
          variable_review_day: number | null
          variable_review_enabled: boolean | null
          welcome_checklist_completed: Json | null
          welcome_checklist_hidden: boolean | null
        }
        Insert: {
          biometric_enabled?: boolean | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          is_premium?: boolean | null
          last_name?: string | null
          nav_tips_dismissed?: boolean | null
          partner_id?: string | null
          payout_method?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          premium_checked_at?: string | null
          premium_until?: string | null
          profile_image_url?: string | null
          stripe_connect_account_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          variable_review_day?: number | null
          variable_review_enabled?: boolean | null
          welcome_checklist_completed?: Json | null
          welcome_checklist_hidden?: boolean | null
        }
        Update: {
          biometric_enabled?: boolean | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_premium?: boolean | null
          last_name?: string | null
          nav_tips_dismissed?: boolean | null
          partner_id?: string | null
          payout_method?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          premium_checked_at?: string | null
          premium_until?: string | null
          profile_image_url?: string | null
          stripe_connect_account_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          variable_review_day?: number | null
          variable_review_enabled?: boolean | null
          welcome_checklist_completed?: Json | null
          welcome_checklist_hidden?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners_public"
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
      quinn_blueprint_cards: {
        Row: {
          archived: boolean
          callout: string | null
          card_type: string
          conversation_id: string | null
          created_at: string
          id: string
          message_id: string | null
          mode_lens: string | null
          pinned: boolean
          project_id: string | null
          promoted_to_plan_id: string | null
          sections: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          callout?: string | null
          card_type: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          mode_lens?: string | null
          pinned?: boolean
          project_id?: string | null
          promoted_to_plan_id?: string | null
          sections?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          callout?: string | null
          card_type?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          mode_lens?: string | null
          pinned?: boolean
          project_id?: string | null
          promoted_to_plan_id?: string | null
          sections?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quinn_blueprint_cards_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "bloom_coach_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quinn_blueprint_cards_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "bloom_coach_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quinn_blueprint_cards_promoted_to_plan_id_fkey"
            columns: ["promoted_to_plan_id"]
            isOneToOne: false
            referencedRelation: "bloom_financial_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      quinn_cards: {
        Row: {
          callout: string | null
          card_type: string
          created_at: string
          id: string
          pinned: boolean
          sections: Json
          source: string
          source_message_excerpt: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          callout?: string | null
          card_type: string
          created_at?: string
          id?: string
          pinned?: boolean
          sections?: Json
          source?: string
          source_message_excerpt?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          callout?: string | null
          card_type?: string
          created_at?: string
          id?: string
          pinned?: boolean
          sections?: Json
          source?: string
          source_message_excerpt?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quinn_memories: {
        Row: {
          base_score: number
          content: string
          created_at: string
          current_score: number
          decay_days: number | null
          emotional_weight: number
          id: string
          is_active: boolean
          is_pinned: boolean
          last_referenced_at: string
          metadata: Json
          project_id: string | null
          source_conversation_id: string | null
          source_message_id: string | null
          tier: Database["public"]["Enums"]["quinn_memory_tier"]
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          base_score?: number
          content: string
          created_at?: string
          current_score?: number
          decay_days?: number | null
          emotional_weight?: number
          id?: string
          is_active?: boolean
          is_pinned?: boolean
          last_referenced_at?: string
          metadata?: Json
          project_id?: string | null
          source_conversation_id?: string | null
          source_message_id?: string | null
          tier: Database["public"]["Enums"]["quinn_memory_tier"]
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          base_score?: number
          content?: string
          created_at?: string
          current_score?: number
          decay_days?: number | null
          emotional_weight?: number
          id?: string
          is_active?: boolean
          is_pinned?: boolean
          last_referenced_at?: string
          metadata?: Json
          project_id?: string | null
          source_conversation_id?: string | null
          source_message_id?: string | null
          tier?: Database["public"]["Enums"]["quinn_memory_tier"]
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quinn_private_usage: {
        Row: {
          created_at: string
          id: string
          message_count: number
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_count?: number
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_count?: number
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_likes: {
        Row: {
          created_at: string
          id: string
          quote_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quote_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quote_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_likes_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "inspirational_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          created_at: string
          id: string
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      referral_commission_payments: {
        Row: {
          commission_amount: number
          created_at: string
          id: string
          month_number: number
          paid_at: string | null
          partner_id: string | null
          partner_payment_amount: number
          payout_method: string | null
          referral_id: string
          status: string
          stripe_invoice_id: string | null
          stripe_transfer_id: string | null
          updated_at: string
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          id?: string
          month_number: number
          paid_at?: string | null
          partner_id?: string | null
          partner_payment_amount?: number
          payout_method?: string | null
          referral_id: string
          status?: string
          stripe_invoice_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          commission_amount?: number
          created_at?: string
          id?: string
          month_number?: number
          paid_at?: string | null
          partner_id?: string | null
          partner_payment_amount?: number
          payout_method?: string | null
          referral_id?: string
          status?: string
          stripe_invoice_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_commission_payments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commission_payments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commission_payments_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "b2b_partner_referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commission_payments_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "b2b_partner_referrals_user_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_conversions: {
        Row: {
          converted_at: string | null
          created_at: string
          credit_amount: number | null
          credited_at: string | null
          id: string
          referral_code: string
          referred_user_id: string
          referrer_user_id: string
          status: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          credit_amount?: number | null
          credited_at?: string | null
          id?: string
          referral_code: string
          referred_user_id: string
          referrer_user_id: string
          status?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          credit_amount?: number | null
          credited_at?: string | null
          id?: string
          referral_code?: string
          referred_user_id?: string
          referrer_user_id?: string
          status?: string
        }
        Relationships: []
      }
      scheduled_autopay: {
        Row: {
          amount: number
          bill_id: string
          created_at: string
          error_message: string | null
          id: string
          payment_method_id: string
          processed_at: string | null
          retry_count: number | null
          scheduled_date: string
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          bill_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          payment_method_id: string
          processed_at?: string | null
          retry_count?: number | null
          scheduled_date: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bill_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          payment_method_id?: string
          processed_at?: string | null
          retry_count?: number | null
          scheduled_date?: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_autopay_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_autopay_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "user_autopay_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reports: {
        Row: {
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          email: string
          frequency: string
          id: string
          include_charts: boolean
          is_active: boolean
          last_sent_at: string | null
          next_send_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          email: string
          frequency: string
          id?: string
          include_charts?: boolean
          is_active?: boolean
          last_sent_at?: string | null
          next_send_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          email?: string
          frequency?: string
          id?: string
          include_charts?: boolean
          is_active?: boolean
          last_sent_at?: string | null
          next_send_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sms_bill_matches: {
        Row: {
          bill_id: string
          confidence: string
          created_at: string
          id: string
          match_reason: string | null
          resolved_at: string | null
          status: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          bill_id: string
          confidence?: string
          created_at?: string
          id?: string
          match_reason?: string | null
          resolved_at?: string | null
          status?: string
          transaction_id: string
          user_id: string
        }
        Update: {
          bill_id?: string
          confidence?: string
          created_at?: string
          id?: string
          match_reason?: string | null
          resolved_at?: string | null
          status?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_bill_matches_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_bill_matches_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_transaction_logs: {
        Row: {
          created_at: string
          error_message: string | null
          from_number: string
          id: string
          message_body: string
          parsed_amount: number | null
          parsed_category: string | null
          parsed_title: string | null
          status: string | null
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          from_number: string
          id?: string
          message_body: string
          parsed_amount?: number | null
          parsed_category?: string | null
          parsed_title?: string | null
          status?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          from_number?: string
          id?: string
          message_body?: string
          parsed_amount?: number | null
          parsed_category?: string | null
          parsed_title?: string | null
          status?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_transaction_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
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
      sync_history: {
        Row: {
          accounts_synced: number
          created_at: string
          error_message: string | null
          id: string
          status: string
          sync_type: string
          user_id: string
        }
        Insert: {
          accounts_synced?: number
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          sync_type?: string
          user_id: string
        }
        Update: {
          accounts_synced?: number
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          sync_type?: string
          user_id?: string
        }
        Relationships: []
      }
      tax_deductions: {
        Row: {
          created_at: string
          education_expenses: number
          filing_status: string
          gross_income: number
          hsa_contributions: number
          id: string
          medical_expenses: number
          mortgage_interest: number
          other_deductions: number
          retirement_contributions: number
          state_local_taxes: number
          tax_year: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          education_expenses?: number
          filing_status?: string
          gross_income?: number
          hsa_contributions?: number
          id?: string
          medical_expenses?: number
          mortgage_interest?: number
          other_deductions?: number
          retirement_contributions?: number
          state_local_taxes?: number
          tax_year?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          education_expenses?: number
          filing_status?: string
          gross_income?: number
          hsa_contributions?: number
          id?: string
          medical_expenses?: number
          mortgage_interest?: number
          other_deductions?: number
          retirement_contributions?: number
          state_local_taxes?: number
          tax_year?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tax_documents: {
        Row: {
          document_type: string
          file_url: string
          id: string
          name: string
          tax_year: number
          uploaded_at: string
          user_id: string
        }
        Insert: {
          document_type?: string
          file_url: string
          id?: string
          name: string
          tax_year?: number
          uploaded_at?: string
          user_id: string
        }
        Update: {
          document_type?: string
          file_url?: string
          id?: string
          name?: string
          tax_year?: number
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          bloom_burst_id: string | null
          category: string
          created_at: string
          id: string
          income_source: string | null
          is_archived: boolean
          is_pending: boolean
          is_recurring: boolean
          is_tax_deductible: boolean
          linked_bill_id: string | null
          merchant: string | null
          next_recurrence_date: string | null
          notes: string | null
          parent_transaction_id: string | null
          plaid_transaction_id: string | null
          receipt_url: string | null
          recurrence_pattern: string | null
          source_recurring_id: string | null
          title: string
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          bloom_burst_id?: string | null
          category?: string
          created_at?: string
          id?: string
          income_source?: string | null
          is_archived?: boolean
          is_pending?: boolean
          is_recurring?: boolean
          is_tax_deductible?: boolean
          linked_bill_id?: string | null
          merchant?: string | null
          next_recurrence_date?: string | null
          notes?: string | null
          parent_transaction_id?: string | null
          plaid_transaction_id?: string | null
          receipt_url?: string | null
          recurrence_pattern?: string | null
          source_recurring_id?: string | null
          title: string
          transaction_date?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          bloom_burst_id?: string | null
          category?: string
          created_at?: string
          id?: string
          income_source?: string | null
          is_archived?: boolean
          is_pending?: boolean
          is_recurring?: boolean
          is_tax_deductible?: boolean
          linked_bill_id?: string | null
          merchant?: string | null
          next_recurrence_date?: string | null
          notes?: string | null
          parent_transaction_id?: string | null
          plaid_transaction_id?: string | null
          receipt_url?: string | null
          recurrence_pattern?: string | null
          source_recurring_id?: string | null
          title?: string
          transaction_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_bloom_burst_id_fkey"
            columns: ["bloom_burst_id"]
            isOneToOne: false
            referencedRelation: "bloom_bursts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_linked_bill_id_fkey"
            columns: ["linked_bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_parent_transaction_id_fkey"
            columns: ["parent_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_source_recurring_id_fkey"
            columns: ["source_recurring_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          from_account_id: string | null
          id: string
          notes: string | null
          status: string
          to_account_id: string | null
          transfer_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          from_account_id?: string | null
          id?: string
          notes?: string | null
          status?: string
          to_account_id?: string | null
          transfer_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          from_account_id?: string | null
          id?: string
          notes?: string | null
          status?: string
          to_account_id?: string | null
          transfer_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorials: {
        Row: {
          category: string
          content: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty_level: string
          display_order: number
          duration_minutes: number | null
          id: string
          is_published: boolean
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
          view_count: number
        }
        Insert: {
          category?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string
          display_order?: number
          duration_minutes?: number | null
          id?: string
          is_published?: boolean
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
          view_count?: number
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string
          display_order?: number
          duration_minutes?: number | null
          id?: string
          is_published?: boolean
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
          view_count?: number
        }
        Relationships: []
      }
      user_api_tokens: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          token_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          token_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          token_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_autopay_methods: {
        Row: {
          bank_name: string | null
          brand: string | null
          created_at: string
          display_name: string
          id: string
          is_default: boolean | null
          is_verified: boolean | null
          last_four: string | null
          method_type: string
          plaid_account_id: string | null
          plaid_item_id: string | null
          plaid_processor_token: string | null
          stripe_customer_id: string | null
          stripe_payment_method_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_name?: string | null
          brand?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_default?: boolean | null
          is_verified?: boolean | null
          last_four?: string | null
          method_type: string
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          plaid_processor_token?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_name?: string | null
          brand?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_default?: boolean | null
          is_verified?: boolean | null
          last_four?: string | null
          method_type?: string
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          plaid_processor_token?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_autopay_methods_plaid_item_id_fkey"
            columns: ["plaid_item_id"]
            isOneToOne: false
            referencedRelation: "plaid_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_autopay_methods_plaid_item_id_fkey"
            columns: ["plaid_item_id"]
            isOneToOne: false
            referencedRelation: "plaid_items_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      user_footer_preferences: {
        Row: {
          created_at: string
          id: string
          left_shortcuts: Json
          right_shortcuts: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          left_shortcuts?: Json
          right_shortcuts?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          left_shortcuts?: Json
          right_shortcuts?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_referrals: {
        Row: {
          created_at: string
          credits_earned: number
          credits_used: number
          id: string
          referral_code: string
          referral_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_earned?: number
          credits_used?: number
          id?: string
          referral_code: string
          referral_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_earned?: number
          credits_used?: number
          id?: string
          referral_code?: string
          referral_count?: number
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
      user_settings: {
        Row: {
          appearance_preferences: Json | null
          created_at: string
          id: string
          navigation_preferences: Json | null
          notification_preferences: Json | null
          plaid_sync_frequency: string
          privacy_preferences: Json | null
          sync_notifications_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          appearance_preferences?: Json | null
          created_at?: string
          id?: string
          navigation_preferences?: Json | null
          notification_preferences?: Json | null
          plaid_sync_frequency?: string
          privacy_preferences?: Json | null
          sync_notifications_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          appearance_preferences?: Json | null
          created_at?: string
          id?: string
          navigation_preferences?: Json | null
          notification_preferences?: Json | null
          plaid_sync_frequency?: string
          privacy_preferences?: Json | null
          sync_notifications_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_task_templates: {
        Row: {
          category: string
          created_at: string
          default_reward: number
          display_order: number
          id: string
          recurring: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          default_reward?: number
          display_order?: number
          id?: string
          recurring?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          default_reward?: number
          display_order?: number
          id?: string
          recurring?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vault_items: {
        Row: {
          conversation_id: string | null
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          notes: string | null
          project_id: string | null
          size_bytes: number | null
          storage_path: string
          tags: string[] | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          project_id?: string | null
          size_bytes?: number | null
          storage_path: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          project_id?: string | null
          size_bytes?: number | null
          storage_path?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vision_board_items: {
        Row: {
          affirmation: string | null
          audio_url: string | null
          board_id: string | null
          category: string
          completed_at: string | null
          created_at: string
          current_amount: number
          description: string | null
          hide_details: boolean
          id: string
          image_alt: string | null
          image_url: string | null
          is_completed: boolean
          is_pinned: boolean
          notes: string | null
          position_x: number
          position_y: number
          priority: number
          size: string
          status: string
          tags: string[] | null
          target_amount: number | null
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          affirmation?: string | null
          audio_url?: string | null
          board_id?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          current_amount?: number
          description?: string | null
          hide_details?: boolean
          id?: string
          image_alt?: string | null
          image_url?: string | null
          is_completed?: boolean
          is_pinned?: boolean
          notes?: string | null
          position_x?: number
          position_y?: number
          priority?: number
          size?: string
          status?: string
          tags?: string[] | null
          target_amount?: number | null
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          affirmation?: string | null
          audio_url?: string | null
          board_id?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          current_amount?: number
          description?: string | null
          hide_details?: boolean
          id?: string
          image_alt?: string | null
          image_url?: string | null
          is_completed?: boolean
          is_pinned?: boolean
          notes?: string | null
          position_x?: number
          position_y?: number
          priority?: number
          size?: string
          status?: string
          tags?: string[] | null
          target_amount?: number | null
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vision_board_items_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "vision_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_board_snapshots: {
        Row: {
          board_id: string
          created_at: string
          id: string
          snapshot_data: Json
          title: string | null
          user_id: string
        }
        Insert: {
          board_id: string
          created_at?: string
          id?: string
          snapshot_data?: Json
          title?: string | null
          user_id: string
        }
        Update: {
          board_id?: string
          created_at?: string
          id?: string
          snapshot_data?: Json
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vision_board_snapshots_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "vision_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_boards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webauthn_credentials: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string | null
          device_type: string | null
          id: string
          last_used_at: string | null
          public_key: string
          rp_id: string | null
          transports: string[] | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          rp_id?: string | null
          transports?: string[] | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          rp_id?: string | null
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      b2b_partner_referrals_user_safe: {
        Row: {
          business_type: string | null
          created_at: string | null
          id: string | null
          referred_business_name: string | null
          referrer_professional_id: string | null
          referrer_type: Database["public"]["Enums"]["referrer_type"] | null
          referrer_user_id: string | null
          status: Database["public"]["Enums"]["b2b_referral_status"] | null
          updated_at: string | null
        }
        Insert: {
          business_type?: string | null
          created_at?: string | null
          id?: string | null
          referred_business_name?: string | null
          referrer_professional_id?: string | null
          referrer_type?: Database["public"]["Enums"]["referrer_type"] | null
          referrer_user_id?: string | null
          status?: Database["public"]["Enums"]["b2b_referral_status"] | null
          updated_at?: string | null
        }
        Update: {
          business_type?: string | null
          created_at?: string | null
          id?: string | null
          referred_business_name?: string | null
          referrer_professional_id?: string | null
          referrer_type?: Database["public"]["Enums"]["referrer_type"] | null
          referrer_user_id?: string | null
          status?: Database["public"]["Enums"]["b2b_referral_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_partner_referrals_referrer_professional_id_fkey"
            columns: ["referrer_professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_partner_referrals_referrer_professional_id_fkey"
            columns: ["referrer_professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      events_public: {
        Row: {
          created_at: string | null
          description: string | null
          end_time: string | null
          event_type: string | null
          id: string | null
          is_published: boolean | null
          partner_id: string | null
          start_time: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          id?: string | null
          is_published?: boolean | null
          partner_id?: string | null
          start_time?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          id?: string | null
          is_published?: boolean | null
          partner_id?: string | null
          start_time?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners_public"
            referencedColumns: ["id"]
          },
        ]
      }
      kids_profiles_safe: {
        Row: {
          age_tier: Database["public"]["Enums"]["kid_age_tier"] | null
          avatar_emoji: string | null
          avatar_url: string | null
          birth_date: string | null
          card_theme_id: string | null
          chart_color: string | null
          created_at: string | null
          current_balance: number | null
          dark_mode_enabled: boolean | null
          display_name: string | null
          first_name: string | null
          give_balance: number | null
          id: string | null
          last_active_at: string | null
          last_name: string | null
          notifications_enabled: boolean | null
          save_balance: number | null
          sound_effects_enabled: boolean | null
          spend_balance: number | null
          split_give_percent: number | null
          split_save_percent: number | null
          split_spend_percent: number | null
          streak_days: number | null
          total_earned: number | null
          total_saved: number | null
          total_spent: number | null
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          age_tier?: Database["public"]["Enums"]["kid_age_tier"] | null
          avatar_emoji?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          card_theme_id?: string | null
          chart_color?: string | null
          created_at?: string | null
          current_balance?: number | null
          dark_mode_enabled?: boolean | null
          display_name?: string | null
          first_name?: string | null
          give_balance?: number | null
          id?: string | null
          last_active_at?: string | null
          last_name?: string | null
          notifications_enabled?: boolean | null
          save_balance?: number | null
          sound_effects_enabled?: boolean | null
          spend_balance?: number | null
          split_give_percent?: number | null
          split_save_percent?: number | null
          split_spend_percent?: number | null
          streak_days?: number | null
          total_earned?: number | null
          total_saved?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          age_tier?: Database["public"]["Enums"]["kid_age_tier"] | null
          avatar_emoji?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          card_theme_id?: string | null
          chart_color?: string | null
          created_at?: string | null
          current_balance?: number | null
          dark_mode_enabled?: boolean | null
          display_name?: string | null
          first_name?: string | null
          give_balance?: number | null
          id?: string | null
          last_active_at?: string | null
          last_name?: string | null
          notifications_enabled?: boolean | null
          save_balance?: number | null
          sound_effects_enabled?: boolean | null
          spend_balance?: number | null
          split_give_percent?: number | null
          split_save_percent?: number | null
          split_spend_percent?: number | null
          streak_days?: number | null
          total_earned?: number | null
          total_saved?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kids_profiles_card_theme_id_fkey"
            columns: ["card_theme_id"]
            isOneToOne: false
            referencedRelation: "card_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      partners_public: {
        Row: {
          address: string | null
          branding_level: string | null
          contact_info: string | null
          contact_logo_url: string | null
          design_theme: string | null
          external_website_url: string | null
          hero_description: string | null
          hero_title: string | null
          highlights_text: string | null
          id: string | null
          is_active: boolean | null
          logo_url: string | null
          name: string | null
          office_name: string | null
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          show_name_with_logo: boolean | null
          slug: string | null
          tagline: string | null
        }
        Insert: {
          address?: string | null
          branding_level?: string | null
          contact_info?: string | null
          contact_logo_url?: string | null
          design_theme?: string | null
          external_website_url?: string | null
          hero_description?: string | null
          hero_title?: string | null
          highlights_text?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          office_name?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_name_with_logo?: boolean | null
          slug?: string | null
          tagline?: string | null
        }
        Update: {
          address?: string | null
          branding_level?: string | null
          contact_info?: string | null
          contact_logo_url?: string | null
          design_theme?: string | null
          external_website_url?: string | null
          hero_description?: string | null
          hero_title?: string | null
          highlights_text?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          office_name?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_name_with_logo?: boolean | null
          slug?: string | null
          tagline?: string | null
        }
        Relationships: []
      }
      plaid_items_safe: {
        Row: {
          created_at: string | null
          id: string | null
          institution_id: string | null
          institution_name: string | null
          plaid_item_id: string | null
          status: string | null
          token_status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          institution_id?: string | null
          institution_name?: string | null
          plaid_item_id?: string | null
          status?: string | null
          token_status?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          institution_id?: string | null
          institution_name?: string | null
          plaid_item_id?: string | null
          status?: string | null
          token_status?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      professional_reviews_public: {
        Row: {
          created_at: string | null
          id: string | null
          professional_id: string | null
          rating: number | null
          review_text: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          professional_id?: string | null
          rating?: number | null
          review_text?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          professional_id?: string | null
          rating?: number | null
          review_text?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          calendar_url: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          is_featured: boolean | null
          is_verified: boolean | null
          name: string | null
          partner_id: string | null
          qr_code_url: string | null
          rating: number | null
          review_count: number | null
          specialties: string[] | null
          specialty: string | null
          states_licensed: string[] | null
          title: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          calendar_url?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          name?: string | null
          partner_id?: string | null
          qr_code_url?: string | null
          rating?: number | null
          review_count?: number | null
          specialties?: string[] | null
          specialty?: string | null
          states_licensed?: string[] | null
          title?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          calendar_url?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          name?: string | null
          partner_id?: string | null
          qr_code_url?: string | null
          rating?: number | null
          review_count?: number | null
          specialties?: string[] | null
          specialty?: string | null
          states_licensed?: string[] | null
          title?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_partner_safe: {
        Row: {
          created_at: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          partner_id: string | null
          profile_image_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          partner_id?: string | null
          profile_image_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          partner_id?: string | null
          profile_image_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access_kid_avatar: { Args: { p_path: string }; Returns: boolean }
      can_send_group_message: { Args: { group_id: string }; Returns: boolean }
      check_and_increment_usage: {
        Args: {
          p_daily_limit: number
          p_feature_name: string
          p_user_id: string
        }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          p_key: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: Json
      }
      claim_professional_profile: { Args: { p_token: string }; Returns: string }
      cleanup_rate_limits: {
        Args: { p_older_than_minutes?: number }
        Returns: number
      }
      decay_quinn_memories: { Args: never; Returns: Json }
      generate_referral_code: { Args: never; Returns: string }
      get_family_group_kids_safe: {
        Args: { p_group_id: string }
        Returns: {
          age_tier: Database["public"]["Enums"]["kid_age_tier"]
          avatar_emoji: string
          avatar_url: string
          chart_color: string
          current_balance: number
          display_name: string
          first_name: string
          give_balance: number
          id: string
          last_name: string
          save_balance: number
          spend_balance: number
          username: string
        }[]
      }
      get_feature_usage: {
        Args: {
          p_daily_limit: number
          p_feature_name: string
          p_user_id: string
        }
        Returns: Json
      }
      get_gmail_tokens_secure: {
        Args: { p_user_id: string }
        Returns: {
          access_token: string
          refresh_token: string
        }[]
      }
      get_kid_profile_for_parent: {
        Args: { p_kid_id: string }
        Returns: {
          age_tier: Database["public"]["Enums"]["kid_age_tier"]
          avatar_emoji: string
          avatar_url: string
          birth_date: string
          card_theme_id: string
          chart_color: string
          created_at: string
          current_balance: number
          dark_mode_enabled: boolean
          display_name: string
          first_name: string
          give_balance: number
          id: string
          last_active_at: string
          last_name: string
          notifications_enabled: boolean
          save_balance: number
          sound_effects_enabled: boolean
          spend_balance: number
          split_give_percent: number
          split_save_percent: number
          split_spend_percent: number
          streak_days: number
          total_earned: number
          total_saved: number
          total_spent: number
          updated_at: string
          user_id: string
          username: string
        }[]
      }
      get_kid_profile_ids_for_user: {
        Args: { user_uuid: string }
        Returns: string[]
      }
      get_linked_kid_ids: { Args: { parent_id: string }; Returns: string[] }
      get_linked_kids_profiles: {
        Args: { p_parent_id: string }
        Returns: {
          age_tier: Database["public"]["Enums"]["kid_age_tier"]
          avatar_emoji: string
          avatar_url: string
          birth_date: string
          card_theme_id: string
          chart_color: string
          created_at: string
          current_balance: number
          dark_mode_enabled: boolean
          display_name: string
          first_name: string
          give_balance: number
          id: string
          last_active_at: string
          last_name: string
          notifications_enabled: boolean
          save_balance: number
          sound_effects_enabled: boolean
          spend_balance: number
          split_give_percent: number
          split_save_percent: number
          split_spend_percent: number
          streak_days: number
          total_earned: number
          total_saved: number
          total_spent: number
          updated_at: string
          user_id: string
          username: string
        }[]
      }
      get_own_kid_id: { Args: never; Returns: string }
      get_partner_stripe_ids: {
        Args: { p_partner_id: string }
        Returns: {
          stripe_customer_id: string
          stripe_subscription_id: string
        }[]
      }
      get_plaid_access_token_secure: {
        Args: { p_item_id: string }
        Returns: string
      }
      get_plaid_token: { Args: { p_plaid_item_id: string }; Returns: string }
      get_user_partner_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_quinn_private_usage: {
        Args: { p_user_id: string }
        Returns: number
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_by_email: { Args: { check_email: string }; Returns: boolean }
      is_budget_admin: {
        Args: { budget_id: string; user_id: string }
        Returns: boolean
      }
      is_budget_collaborator: {
        Args: { budget_id: string; user_id: string }
        Returns: boolean
      }
      is_family_group_admin: {
        Args: { check_user_id: string; group_id: string }
        Returns: boolean
      }
      is_family_group_member: {
        Args: { check_user_id: string; group_id: string }
        Returns: boolean
      }
      is_goal_admin: {
        Args: { goal_id: string; user_id: string }
        Returns: boolean
      }
      is_goal_collaborator: {
        Args: { goal_id: string; user_id: string }
        Returns: boolean
      }
      is_own_kid_account: { Args: { profile_id: string }; Returns: boolean }
      is_own_kid_profile: { Args: { profile_id: string }; Returns: boolean }
      is_parent_of_kid: {
        Args: { kid_id: string; parent_id: string }
        Returns: boolean
      }
      is_partner_member: {
        Args: { _partner_id: string; _user_id: string }
        Returns: boolean
      }
      issue_professional_claim_token: {
        Args: { p_expires_in_days?: number; p_professional_id: string }
        Returns: {
          claim_token: string
          expires_at: string
        }[]
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id?: string
          p_entity_type: string
        }
        Returns: string
      }
      map_transaction_to_budget_category: {
        Args: { p_category: string; p_type: string }
        Returns: Database["public"]["Enums"]["budget_category"]
      }
      migrate_plaid_tokens_to_vault: { Args: never; Returns: undefined }
      parent_update_kid_profile: {
        Args: {
          p_avatar_emoji?: string
          p_chart_color?: string
          p_display_name?: string
          p_first_name?: string
          p_kid_id: string
          p_last_name?: string
          p_split_give_percent?: number
          p_split_save_percent?: number
          p_split_spend_percent?: number
        }
        Returns: boolean
      }
      process_monthly_budget_contributions: { Args: never; Returns: undefined }
      realtime_topic_user_id: { Args: { topic: string }; Returns: string }
      recalculate_budget_spent: {
        Args: { p_budget_id: string }
        Returns: undefined
      }
      reset_rate_limit: { Args: { p_key: string }; Returns: undefined }
      store_plaid_token: {
        Args: { p_access_token: string; p_plaid_item_id: string }
        Returns: string
      }
    }
    Enums: {
      account_category: "asset" | "liability"
      account_type:
        | "checking"
        | "savings"
        | "money_market"
        | "cd"
        | "credit_card"
        | "line_of_credit"
        | "mortgage"
        | "heloc"
        | "auto_loan"
        | "student_loan"
        | "personal_loan"
        | "investment"
        | "brokerage"
        | "retirement_401k"
        | "retirement_ira"
        | "retirement_roth"
        | "real_estate"
        | "vehicle"
        | "insurance"
        | "annuity"
        | "crypto"
        | "other"
        | "cash"
      app_role: "admin" | "moderator" | "user" | "super_admin"
      b2b_referral_status:
        | "pending"
        | "contacted"
        | "negotiating"
        | "converted"
        | "rejected"
      bill_category:
        | "utilities"
        | "subscriptions"
        | "insurance"
        | "rent"
        | "phone"
        | "internet"
        | "streaming"
        | "gym"
        | "transportation"
        | "loans"
        | "credit_card"
        | "other"
        | "mortgage"
        | "property_tax"
        | "student_loan"
        | "medical"
        | "business"
      bill_frequency:
        | "one_time"
        | "weekly"
        | "biweekly"
        | "monthly"
        | "quarterly"
        | "semi_annual"
        | "annual"
      bill_status:
        | "pending"
        | "partially_paid"
        | "skipped"
        | "paid"
        | "overdue"
        | "cancelled"
      budget_category:
        | "housing"
        | "transportation"
        | "food"
        | "utilities"
        | "healthcare"
        | "insurance"
        | "savings"
        | "entertainment"
        | "shopping"
        | "personal"
        | "education"
        | "debt"
        | "gifts"
        | "travel"
        | "other"
        | "business"
      chore_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "approved"
        | "rejected"
      collaborator_role: "owner" | "organizer" | "contributor" | "viewer"
      family_link_status: "pending" | "active" | "declined"
      goal_type:
        | "individual"
        | "joint"
        | "family"
        | "friends"
        | "business"
        | "community"
      invitation_status: "pending" | "accepted" | "declined" | "expired"
      kid_age_tier: "under_10" | "teen"
      kid_transaction_type:
        | "allowance"
        | "chore_reward"
        | "deposit"
        | "withdrawal"
        | "spending"
        | "gift"
        | "savings"
      payout_status: "pending" | "processing" | "paid"
      quinn_memory_tier:
        | "foundational"
        | "identity"
        | "episodic"
        | "contextual"
        | "transient"
      referrer_type: "professional" | "user"
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
      account_category: ["asset", "liability"],
      account_type: [
        "checking",
        "savings",
        "money_market",
        "cd",
        "credit_card",
        "line_of_credit",
        "mortgage",
        "heloc",
        "auto_loan",
        "student_loan",
        "personal_loan",
        "investment",
        "brokerage",
        "retirement_401k",
        "retirement_ira",
        "retirement_roth",
        "real_estate",
        "vehicle",
        "insurance",
        "annuity",
        "crypto",
        "other",
        "cash",
      ],
      app_role: ["admin", "moderator", "user", "super_admin"],
      b2b_referral_status: [
        "pending",
        "contacted",
        "negotiating",
        "converted",
        "rejected",
      ],
      bill_category: [
        "utilities",
        "subscriptions",
        "insurance",
        "rent",
        "phone",
        "internet",
        "streaming",
        "gym",
        "transportation",
        "loans",
        "credit_card",
        "other",
        "mortgage",
        "property_tax",
        "student_loan",
        "medical",
        "business",
      ],
      bill_frequency: [
        "one_time",
        "weekly",
        "biweekly",
        "monthly",
        "quarterly",
        "semi_annual",
        "annual",
      ],
      bill_status: [
        "pending",
        "partially_paid",
        "skipped",
        "paid",
        "overdue",
        "cancelled",
      ],
      budget_category: [
        "housing",
        "transportation",
        "food",
        "utilities",
        "healthcare",
        "insurance",
        "savings",
        "entertainment",
        "shopping",
        "personal",
        "education",
        "debt",
        "gifts",
        "travel",
        "other",
        "business",
      ],
      chore_status: [
        "pending",
        "in_progress",
        "completed",
        "approved",
        "rejected",
      ],
      collaborator_role: ["owner", "organizer", "contributor", "viewer"],
      family_link_status: ["pending", "active", "declined"],
      goal_type: [
        "individual",
        "joint",
        "family",
        "friends",
        "business",
        "community",
      ],
      invitation_status: ["pending", "accepted", "declined", "expired"],
      kid_age_tier: ["under_10", "teen"],
      kid_transaction_type: [
        "allowance",
        "chore_reward",
        "deposit",
        "withdrawal",
        "spending",
        "gift",
        "savings",
      ],
      payout_status: ["pending", "processing", "paid"],
      quinn_memory_tier: [
        "foundational",
        "identity",
        "episodic",
        "contextual",
        "transient",
      ],
      referrer_type: ["professional", "user"],
    },
  },
} as const
