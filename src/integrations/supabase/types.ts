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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      bookmarks: {
        Row: {
          analysis_type: string
          context_after: string | null
          context_before: string | null
          created_at: string | null
          id: string
          note: string | null
          project_id: string
          segment_id: number
          selected_text: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_type: string
          context_after?: string | null
          context_before?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          project_id: string
          segment_id: number
          selected_text: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_type?: string
          context_after?: string | null
          context_before?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          project_id?: string
          segment_id?: number
          selected_text?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      converted_files: {
        Row: {
          created_at: string | null
          filename: string
          id: string
          original_type: string | null
          research_id: string
          text_content: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          filename: string
          id?: string
          original_type?: string | null
          research_id: string
          text_content: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          filename?: string
          id?: string
          original_type?: string | null
          research_id?: string
          text_content?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      enterprise_inquiries: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          status: string
          team_size: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          status?: string
          team_size: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          status?: string
          team_size?: string
          updated_at?: string
        }
        Relationships: []
      }
      FileStorage: {
        Row: {
          "Assistant ID": string | null
          embedding: string | null
          id: string
          "Project name": string | null
          project_id: string
          "User ID": string | null
          "User message": string | null
          Счетчик: number | null
        }
        Insert: {
          "Assistant ID"?: string | null
          embedding?: string | null
          id?: string
          "Project name"?: string | null
          project_id: string
          "User ID"?: string | null
          "User message"?: string | null
          Счетчик?: number | null
        }
        Update: {
          "Assistant ID"?: string | null
          embedding?: string | null
          id?: string
          "Project name"?: string | null
          project_id?: string
          "User ID"?: string | null
          "User message"?: string | null
          Счетчик?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_filestorage_research"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "researches"
            referencedColumns: ["Project ID"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          research_id: string | null
          segment_id: number | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          research_id?: string | null
          segment_id?: number | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          research_id?: string | null
          segment_id?: number | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_notifications_research"
            columns: ["research_id"]
            isOneToOne: false
            referencedRelation: "researches"
            referencedColumns: ["Project ID"]
          },
          {
            foreignKeyName: "fk_notifications_segment"
            columns: ["research_id", "segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["Project ID", "Сегмент ID"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      researches: {
        Row: {
          created_at: string
          description: string | null
          generated_segments: Json | null
          id: string
          "Project ID": string
          "Project name": string
          segmentsCount: number | null
          status: string | null
          updated_at: string
          "User ID": string
        }
        Insert: {
          created_at?: string
          description?: string | null
          generated_segments?: Json | null
          id?: string
          "Project ID": string
          "Project name": string
          segmentsCount?: number | null
          status?: string | null
          updated_at?: string
          "User ID": string
        }
        Update: {
          created_at?: string
          description?: string | null
          generated_segments?: Json | null
          id?: string
          "Project ID"?: string
          "Project name"?: string
          segmentsCount?: number | null
          status?: string | null
          updated_at?: string
          "User ID"?: string
        }
        Relationships: []
      }
      segment_analyses: {
        Row: {
          analysis_type: string
          content: Json | null
          id: string
          "Project ID": string
          "Название сегмента": string | null
          "Сегмент ID": number
        }
        Insert: {
          analysis_type: string
          content?: Json | null
          id?: string
          "Project ID": string
          "Название сегмента"?: string | null
          "Сегмент ID": number
        }
        Update: {
          analysis_type?: string
          content?: Json | null
          id?: string
          "Project ID"?: string
          "Название сегмента"?: string | null
          "Сегмент ID"?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_segment_analyses_research"
            columns: ["Project ID"]
            isOneToOne: false
            referencedRelation: "researches"
            referencedColumns: ["Project ID"]
          },
          {
            foreignKeyName: "fk_segment_analyses_segment"
            columns: ["Project ID", "Сегмент ID"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["Project ID", "Сегмент ID"]
          },
        ]
      }
      segments: {
        Row: {
          description: string | null
          id: string
          is_selected: boolean | null
          message: string | null
          problems: string | null
          "Project ID": string
          "Название сегмента": string
          "Сегмент ID": number
        }
        Insert: {
          description?: string | null
          id?: string
          is_selected?: boolean | null
          message?: string | null
          problems?: string | null
          "Project ID": string
          "Название сегмента": string
          "Сегмент ID": number
        }
        Update: {
          description?: string | null
          id?: string
          is_selected?: boolean | null
          message?: string | null
          problems?: string | null
          "Project ID"?: string
          "Название сегмента"?: string
          "Сегмент ID"?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_segments_research"
            columns: ["Project ID"]
            isOneToOne: false
            referencedRelation: "researches"
            referencedColumns: ["Project ID"]
          },
        ]
      }
      top_segments: {
        Row: {
          created_at: string
          description: string | null
          full_analysis: string | null
          id: string
          project_id: string
          rank: number
          reasoning: string | null
          segment_id: number
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          full_analysis?: string | null
          id?: string
          project_id: string
          rank: number
          reasoning?: string | null
          segment_id: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          full_analysis?: string | null
          id?: string
          project_id?: string
          rank?: number
          reasoning?: string | null
          segment_id?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      cleanup_old_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_validated_notification: {
        Args: {
          p_action_url?: string
          p_message?: string
          p_research_id?: string
          p_segment_id?: number
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      get_analysis_display_name: {
        Args: { analysis_type: string }
        Returns: string
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      match_documents: {
        Args:
          | { filter: Json; match_count: number; query_embedding: string }
          | {
              filter_params?: Json
              match_count: number
              query_embedding: string
            }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
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
