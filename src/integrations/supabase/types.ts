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
      case_files: {
        Row: {
          created_at: string
          filename: string
          id: string
          mime_type: string | null
          piece_id: string | null
          project_id: string | null
          size_bytes: number | null
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          mime_type?: string | null
          piece_id?: string | null
          project_id?: string | null
          size_bytes?: number | null
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          mime_type?: string | null
          piece_id?: string | null
          project_id?: string | null
          size_bytes?: number | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_files_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          endpoint: string | null
          error: string | null
          id: string
          integration: string
          ok: boolean | null
          request_summary: string | null
          response_summary: string | null
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          endpoint?: string | null
          error?: string | null
          id?: string
          integration: string
          ok?: boolean | null
          request_summary?: string | null
          response_summary?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          endpoint?: string | null
          error?: string | null
          id?: string
          integration?: string
          ok?: boolean | null
          request_summary?: string | null
          response_summary?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      piece_versions: {
        Row: {
          content_html: string | null
          content_text: string | null
          created_at: string
          id: string
          notes: string | null
          piece_id: string
          user_id: string
        }
        Insert: {
          content_html?: string | null
          content_text?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          piece_id: string
          user_id: string
        }
        Update: {
          content_html?: string | null
          content_text?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          piece_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "piece_versions_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      pieces: {
        Row: {
          area: string | null
          checklist: Json | null
          content_html: string | null
          content_text: string | null
          created_at: string
          id: string
          input_data: Json
          model_used: string | null
          observations: string | null
          piece_type: string
          project_id: string | null
          status: Database["public"]["Enums"]["piece_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string | null
          checklist?: Json | null
          content_html?: string | null
          content_text?: string | null
          created_at?: string
          id?: string
          input_data?: Json
          model_used?: string | null
          observations?: string | null
          piece_type?: string
          project_id?: string | null
          status?: Database["public"]["Enums"]["piece_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string | null
          checklist?: Json | null
          content_html?: string | null
          content_text?: string | null
          created_at?: string
          id?: string
          input_data?: Json
          model_used?: string | null
          observations?: string | null
          piece_type?: string
          project_id?: string | null
          status?: Database["public"]["Enums"]["piece_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pieces_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          oab: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          oab?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          oab?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          area: string | null
          client_name: string | null
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string | null
          client_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string | null
          client_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          is_secret: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          description?: string | null
          is_secret?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          description?: string | null
          is_secret?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      useful_links: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          title: string
          url: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          title: string
          url: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          title?: string
          url?: string
        }
        Relationships: []
      }
      user_link_favorites: {
        Row: {
          created_at: string
          link_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          link_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          link_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_link_favorites_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "useful_links"
            referencedColumns: ["id"]
          },
        ]
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
      workspace_context_items: {
        Row: {
          created_at: string
          display_order: number
          id: string
          payload: Json
          preview: string | null
          source_url: string | null
          storage_path: string | null
          title: string
          type: Database["public"]["Enums"]["context_item_type"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          payload?: Json
          preview?: string | null
          source_url?: string | null
          storage_path?: string | null
          title: string
          type: Database["public"]["Enums"]["context_item_type"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          payload?: Json
          preview?: string | null
          source_url?: string | null
          storage_path?: string | null
          title?: string
          type?: Database["public"]["Enums"]["context_item_type"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_context_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          agent_config: Json
          created_at: string
          id: string
          instructions: string
          mode: Database["public"]["Enums"]["workspace_mode"]
          piece_id: string | null
          project_id: string | null
          template_mode: string | null
          thinking: Database["public"]["Enums"]["thinking_level"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_config?: Json
          created_at?: string
          id?: string
          instructions?: string
          mode?: Database["public"]["Enums"]["workspace_mode"]
          piece_id?: string | null
          project_id?: string | null
          template_mode?: string | null
          thinking?: Database["public"]["Enums"]["thinking_level"]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_config?: Json
          created_at?: string
          id?: string
          instructions?: string
          mode?: Database["public"]["Enums"]["workspace_mode"]
          piece_id?: string | null
          project_id?: string | null
          template_mode?: string | null
          thinking?: Database["public"]["Enums"]["thinking_level"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      context_item_type:
        | "documento"
        | "modelo"
        | "legislacao"
        | "jurisprudencia"
        | "web"
        | "biblioteca_item"
        | "bibliotecario"
        | "prompt"
        | "transcricao"
        | "url"
        | "texto"
      piece_status: "draft" | "generating" | "ready" | "exported" | "archived"
      thinking_level: "baixo" | "medio" | "alto"
      workspace_mode: "padrao" | "agentico"
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
      app_role: ["admin", "user"],
      context_item_type: [
        "documento",
        "modelo",
        "legislacao",
        "jurisprudencia",
        "web",
        "biblioteca_item",
        "bibliotecario",
        "prompt",
        "transcricao",
        "url",
        "texto",
      ],
      piece_status: ["draft", "generating", "ready", "exported", "archived"],
      thinking_level: ["baixo", "medio", "alto"],
      workspace_mode: ["padrao", "agentico"],
    },
  },
} as const
