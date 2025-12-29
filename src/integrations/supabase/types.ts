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
      capstone_assignments: {
        Row: {
          assignment_name: string
          audience: string | null
          created_at: string
          deliverable_format: string | null
          discipline: string
          estimated_time: string | null
          id: string
          instructions: Json
          resource_attachments: Json | null
          role: string | null
          scenario: string
          source_label: string | null
          source_tier: string
          source_url: string | null
          step_title: string
        }
        Insert: {
          assignment_name: string
          audience?: string | null
          created_at?: string
          deliverable_format?: string | null
          discipline: string
          estimated_time?: string | null
          id?: string
          instructions: Json
          resource_attachments?: Json | null
          role?: string | null
          scenario: string
          source_label?: string | null
          source_tier: string
          source_url?: string | null
          step_title: string
        }
        Update: {
          assignment_name?: string
          audience?: string | null
          created_at?: string
          deliverable_format?: string | null
          discipline?: string
          estimated_time?: string | null
          id?: string
          instructions?: Json
          resource_attachments?: Json | null
          role?: string | null
          scenario?: string
          source_label?: string | null
          source_tier?: string
          source_url?: string | null
          step_title?: string
        }
        Relationships: []
      }
      community_syllabi: {
        Row: {
          composition_type: string | null
          created_at: string | null
          derived_from: string[] | null
          discipline: string
          discipline_path: string | null
          id: string
          is_ad_hoc: boolean | null
          modules: Json
          narrative_flow: string | null
          raw_sources: Json | null
          search_term: string | null
          source: string
          topic_pillars: Json | null
        }
        Insert: {
          composition_type?: string | null
          created_at?: string | null
          derived_from?: string[] | null
          discipline: string
          discipline_path?: string | null
          id?: string
          is_ad_hoc?: boolean | null
          modules: Json
          narrative_flow?: string | null
          raw_sources?: Json | null
          search_term?: string | null
          source: string
          topic_pillars?: Json | null
        }
        Update: {
          composition_type?: string | null
          created_at?: string | null
          derived_from?: string[] | null
          discipline?: string
          discipline_path?: string | null
          id?: string
          is_ad_hoc?: boolean | null
          modules?: Json
          narrative_flow?: string | null
          raw_sources?: Json | null
          search_term?: string | null
          source?: string
          topic_pillars?: Json | null
        }
        Relationships: []
      }
      discipline_images: {
        Row: {
          created_at: string
          discipline_name: string
          id: string
          image_url: string
        }
        Insert: {
          created_at?: string
          discipline_name: string
          id?: string
          image_url: string
        }
        Update: {
          created_at?: string
          discipline_name?: string
          id?: string
          image_url?: string
        }
        Relationships: []
      }
      disciplines: {
        Row: {
          created_at: string | null
          id: string
          l1: string
          l2: string | null
          l3: string | null
          l4: string | null
          l5: string | null
          l6: string | null
          search_text: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          l1: string
          l2?: string | null
          l3?: string | null
          l4?: string | null
          l5?: string | null
          l6?: string | null
          search_text?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          l1?: string
          l2?: string | null
          l3?: string | null
          l4?: string | null
          l5?: string | null
          l6?: string | null
          search_text?: string | null
        }
        Relationships: []
      }
      learning_schedules: {
        Row: {
          availability: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          saved_syllabus_id: string
          start_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          availability: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          saved_syllabus_id: string
          start_date?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          availability?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          saved_syllabus_id?: string
          start_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_schedules_saved_syllabus_id_fkey"
            columns: ["saved_syllabus_id"]
            isOneToOne: false
            referencedRelation: "saved_syllabi"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          custom_sources: Json | null
          enabled_sources: Json | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          custom_sources?: Json | null
          enabled_sources?: Json | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          custom_sources?: Json | null
          enabled_sources?: Json | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reported_links: {
        Row: {
          created_at: string
          discipline: string | null
          id: string
          report_count: number
          report_reason: string | null
          reported_by: string | null
          resource_type: string
          step_title: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          discipline?: string | null
          id?: string
          report_count?: number
          report_reason?: string | null
          reported_by?: string | null
          resource_type: string
          step_title?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          discipline?: string | null
          id?: string
          report_count?: number
          report_reason?: string | null
          reported_by?: string | null
          resource_type?: string
          step_title?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "reported_links_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_syllabi: {
        Row: {
          created_at: string | null
          discipline: string
          discipline_path: string | null
          id: string
          modules: Json
          narrative_flow: string | null
          raw_sources: Json | null
          source: string
          source_url: string | null
          topic_pillars: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          discipline: string
          discipline_path?: string | null
          id?: string
          modules: Json
          narrative_flow?: string | null
          raw_sources?: Json | null
          source: string
          source_url?: string | null
          topic_pillars?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          discipline?: string
          discipline_path?: string | null
          id?: string
          modules?: Json
          narrative_flow?: string | null
          raw_sources?: Json | null
          source?: string
          source_url?: string | null
          topic_pillars?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      schedule_events: {
        Row: {
          completed_at: string | null
          created_at: string | null
          estimated_minutes: number
          id: string
          is_done: boolean | null
          module_index: number
          schedule_id: string
          scheduled_date: string
          step_title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          estimated_minutes?: number
          id?: string
          is_done?: boolean | null
          module_index: number
          schedule_id: string
          scheduled_date: string
          step_title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          estimated_minutes?: number
          id?: string
          is_done?: boolean | null
          module_index?: number
          schedule_id?: string
          scheduled_date?: string
          step_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_events_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "learning_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      step_resources: {
        Row: {
          created_at: string | null
          discipline: string
          id: string
          resources: Json
          step_title: string
          syllabus_urls: Json | null
        }
        Insert: {
          created_at?: string | null
          discipline: string
          id?: string
          resources: Json
          step_title: string
          syllabus_urls?: Json | null
        }
        Update: {
          created_at?: string | null
          discipline?: string
          id?: string
          resources?: Json
          step_title?: string
          syllabus_urls?: Json | null
        }
        Relationships: []
      }
      step_summaries: {
        Row: {
          created_at: string | null
          discipline: string
          id: string
          length: string | null
          step_title: string
          summary: string
        }
        Insert: {
          created_at?: string | null
          discipline: string
          id?: string
          length?: string | null
          step_title: string
          summary: string
        }
        Update: {
          created_at?: string | null
          discipline?: string
          id?: string
          length?: string | null
          step_title?: string
          summary?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          discipline_id: string
          id: string
          notes: string | null
          started_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          discipline_id: string
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          discipline_id?: string
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_disciplines_fuzzy:
        | {
            Args: { search_term: string; similarity_threshold?: number }
            Returns: {
              id: string
              l1: string
              l2: string
              l3: string
              l4: string
              l5: string
              l6: string
              match_type: string
              similarity_score: number
            }[]
          }
        | {
            Args: { search_term: string; similarity_threshold?: number }
            Returns: {
              id: string
              l1: string
              l2: string
              l3: string
              l4: string
              l5: string
              l6: string
              match_type: string
              similarity_score: number
            }[]
          }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
