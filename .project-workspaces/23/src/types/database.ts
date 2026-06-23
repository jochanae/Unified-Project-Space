export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      contacts: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          org_id: string
          source_project_id: string | null
          tags: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          org_id: string
          source_project_id?: string | null
          tags?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          org_id?: string
          source_project_id?: string | null
          tags?: string | null
        }
        Relationships: [
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
      links: {
        Row: {
          id: string
          project_id: string
          org_id: string
          title: string
          url: string
          category: string
          created_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          org_id: string
          title?: string
          url?: string
          category?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          org_id?: string
          title?: string
          url?: string
          category?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          id: string
          project_id: string
          org_id: string
          type: string
          title: string
          body: string
          links: string[] | null
          done: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          org_id: string
          type?: string
          title?: string
          body?: string
          links?: string[] | null
          done?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          org_id?: string
          type?: string
          title?: string
          body?: string
          links?: string[] | null
          done?: boolean
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          plan: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          plan?: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          plan?: string
          slug?: string
        }
        Relationships: []
      }
      pages: {
        Row: {
          content_blocks: Json | null
          created_at: string | null
          funnel_step_id: string
          id: string
          is_published: boolean
          org_id: string
          published_content_blocks: Json | null
          published_url: string | null
          slug: string
        }
        Insert: {
          content_blocks?: Json | null
          created_at?: string | null
          funnel_step_id: string
          id?: string
          is_published?: boolean
          org_id: string
          published_content_blocks?: Json | null
          published_url?: string | null
          slug: string
        }
        Update: {
          content_blocks?: Json | null
          created_at?: string | null
          funnel_step_id?: string
          id?: string
          is_published?: boolean
          org_id?: string
          published_content_blocks?: Json | null
          published_url?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_funnel_step_id_fkey"
            columns: ["funnel_step_id"]
            isOneToOne: false
            referencedRelation: "funnel_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          goal: string | null
          id: string
          name: string
          org_id: string
          slug: string
          status: string
        }
        Insert: {
          created_at?: string | null
          goal?: string | null
          id?: string
          name: string
          org_id: string
          slug: string
          status?: string
        }
        Update: {
          created_at?: string | null
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
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          org_id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          org_id: string
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          org_id?: string
          role?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
