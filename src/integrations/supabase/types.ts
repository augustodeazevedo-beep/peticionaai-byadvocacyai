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
      ai_governance_prefs: {
        Row: {
          ai_disclosure_enabled: boolean
          ai_disclosure_text: string
          block_export_on_critical: boolean
          created_at: string
          defensive_mode: boolean
          human_in_loop: boolean
          temporary_chats: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_disclosure_enabled?: boolean
          ai_disclosure_text?: string
          block_export_on_critical?: boolean
          created_at?: string
          defensive_mode?: boolean
          human_in_loop?: boolean
          temporary_chats?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_disclosure_enabled?: boolean
          ai_disclosure_text?: string
          block_export_on_critical?: boolean
          created_at?: string
          defensive_mode?: boolean
          human_in_loop?: boolean
          temporary_chats?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
            foreignKeyName: "case_files_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_files_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "public_shared_pieces"
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
      detectai_checks: {
        Row: {
          content_hash: string | null
          created_at: string
          findings: Json
          id: string
          model: string | null
          score: number
          stages: Json | null
          text_preview: string
          user_id: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          findings?: Json
          id?: string
          model?: string | null
          score: number
          stages?: Json | null
          text_preview: string
          user_id: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          findings?: Json
          id?: string
          model?: string | null
          score?: number
          stages?: Json | null
          text_preview?: string
          user_id?: string
        }
        Relationships: []
      }
      detectai_prefs: {
        Row: {
          allowlist_patterns: string[]
          block_threshold: string
          created_at: string
          enforce_on_export: boolean
          enforce_on_finalize: boolean
          id: string
          llm_auditor_enabled: boolean
          rules: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          allowlist_patterns?: string[]
          block_threshold?: string
          created_at?: string
          enforce_on_export?: boolean
          enforce_on_finalize?: boolean
          id?: string
          llm_auditor_enabled?: boolean
          rules?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          allowlist_patterns?: string[]
          block_threshold?: string
          created_at?: string
          enforce_on_export?: boolean
          enforce_on_finalize?: boolean
          id?: string
          llm_auditor_enabled?: boolean
          rules?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      jurisprudencia_buscas: {
        Row: {
          court: string | null
          created_at: string
          executed_at: string
          id: string
          page: number
          pub_from: string | null
          pub_to: string | null
          query: string
          total_results: number | null
          trial_from: string | null
          trial_to: string | null
          user_id: string
        }
        Insert: {
          court?: string | null
          created_at?: string
          executed_at?: string
          id?: string
          page?: number
          pub_from?: string | null
          pub_to?: string | null
          query: string
          total_results?: number | null
          trial_from?: string | null
          trial_to?: string | null
          user_id: string
        }
        Update: {
          court?: string | null
          created_at?: string
          executed_at?: string
          id?: string
          page?: number
          pub_from?: string | null
          pub_to?: string | null
          query?: string
          total_results?: number | null
          trial_from?: string | null
          trial_to?: string | null
          user_id?: string
        }
        Relationships: []
      }
      jurisprudencia_selecoes: {
        Row: {
          court: string
          created_at: string
          decision_id: string
          decision_type: string | null
          id: string
          judging_body: string | null
          judgment_date: string | null
          piece_id: string | null
          process_number: string
          publication_date: string | null
          rapporteur: string | null
          raw: Json | null
          syllabus: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          court: string
          created_at?: string
          decision_id: string
          decision_type?: string | null
          id?: string
          judging_body?: string | null
          judgment_date?: string | null
          piece_id?: string | null
          process_number: string
          publication_date?: string | null
          rapporteur?: string | null
          raw?: Json | null
          syllabus: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          court?: string
          created_at?: string
          decision_id?: string
          decision_type?: string | null
          id?: string
          judging_body?: string | null
          judgment_date?: string | null
          piece_id?: string | null
          process_number?: string
          publication_date?: string | null
          rapporteur?: string | null
          raw?: Json | null
          syllabus?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jurisprudencia_selecoes_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jurisprudencia_selecoes_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jurisprudencia_selecoes_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "public_shared_pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      librarian_items: {
        Row: {
          created_at: string
          librarian_id: string
          library_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          librarian_id: string
          library_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          librarian_id?: string
          library_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "librarian_items_librarian_id_fkey"
            columns: ["librarian_id"]
            isOneToOne: false
            referencedRelation: "librarians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "librarian_items_library_item_id_fkey"
            columns: ["library_item_id"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["id"]
          },
        ]
      }
      librarians: {
        Row: {
          color: string
          created_at: string
          description: string | null
          formatting_rules: Json
          icon: string
          id: string
          is_active: boolean
          model_piece_ids: string[]
          name: string
          piece_type: string | null
          practice_area: string | null
          reasoning_prompt: string | null
          updated_at: string
          user_id: string
          visual_law_defaults: Json
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          formatting_rules?: Json
          icon?: string
          id?: string
          is_active?: boolean
          model_piece_ids?: string[]
          name: string
          piece_type?: string | null
          practice_area?: string | null
          reasoning_prompt?: string | null
          updated_at?: string
          user_id: string
          visual_law_defaults?: Json
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          formatting_rules?: Json
          icon?: string
          id?: string
          is_active?: boolean
          model_piece_ids?: string[]
          name?: string
          piece_type?: string | null
          practice_area?: string | null
          reasoning_prompt?: string | null
          updated_at?: string
          user_id?: string
          visual_law_defaults?: Json
        }
        Relationships: []
      }
      library_folders: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "library_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      library_items: {
        Row: {
          content_text: string | null
          created_at: string
          description: string | null
          folder_id: string | null
          id: string
          is_favorite: boolean
          is_shared: boolean
          metadata: Json
          mime_type: string | null
          ocr_status: string | null
          ocr_text: string | null
          size_bytes: number | null
          source: Database["public"]["Enums"]["document_source"]
          source_url: string | null
          storage_path: string | null
          tags: string[]
          template_strictness:
            | Database["public"]["Enums"]["template_strictness"]
            | null
          title: string
          type: Database["public"]["Enums"]["library_item_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          content_text?: string | null
          created_at?: string
          description?: string | null
          folder_id?: string | null
          id?: string
          is_favorite?: boolean
          is_shared?: boolean
          metadata?: Json
          mime_type?: string | null
          ocr_status?: string | null
          ocr_text?: string | null
          size_bytes?: number | null
          source?: Database["public"]["Enums"]["document_source"]
          source_url?: string | null
          storage_path?: string | null
          tags?: string[]
          template_strictness?:
            | Database["public"]["Enums"]["template_strictness"]
            | null
          title: string
          type: Database["public"]["Enums"]["library_item_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          content_text?: string | null
          created_at?: string
          description?: string | null
          folder_id?: string | null
          id?: string
          is_favorite?: boolean
          is_shared?: boolean
          metadata?: Json
          mime_type?: string | null
          ocr_status?: string | null
          ocr_text?: string | null
          size_bytes?: number | null
          source?: Database["public"]["Enums"]["document_source"]
          source_url?: string | null
          storage_path?: string | null
          tags?: string[]
          template_strictness?:
            | Database["public"]["Enums"]["template_strictness"]
            | null
          title?: string
          type?: Database["public"]["Enums"]["library_item_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_items_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "library_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      office_brand: {
        Row: {
          address: string | null
          closing_text: string | null
          created_at: string
          default_city: string | null
          email: string | null
          firm_name: string | null
          font_family: string | null
          letterhead_enabled: boolean
          letterhead_layout: string
          logo_url: string | null
          oab_registration: string | null
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          signature_block: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          closing_text?: string | null
          created_at?: string
          default_city?: string | null
          email?: string | null
          firm_name?: string | null
          font_family?: string | null
          letterhead_enabled?: boolean
          letterhead_layout?: string
          logo_url?: string | null
          oab_registration?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          signature_block?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          closing_text?: string | null
          created_at?: string
          default_city?: string | null
          email?: string | null
          firm_name?: string | null
          font_family?: string | null
          letterhead_enabled?: boolean
          letterhead_layout?: string
          logo_url?: string | null
          oab_registration?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          signature_block?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      piece_audits: {
        Row: {
          content_hash: string
          created_at: string
          findings: Json
          id: string
          model: string | null
          piece_id: string
          score: number
          stages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          content_hash: string
          created_at?: string
          findings?: Json
          id?: string
          model?: string | null
          piece_id: string
          score?: number
          stages?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          content_hash?: string
          created_at?: string
          findings?: Json
          id?: string
          model?: string | null
          piece_id?: string
          score?: number
          stages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "piece_audits_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piece_audits_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piece_audits_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "public_shared_pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      piece_templates: {
        Row: {
          area: string
          content_md: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          last_used_at: string | null
          name: string
          piece_type: string
          prompt_hints: string | null
          scope: string
          structure: Json
          style_overrides: Json
          tags: string[]
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          area: string
          content_md?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          last_used_at?: string | null
          name: string
          piece_type: string
          prompt_hints?: string | null
          scope?: string
          structure?: Json
          style_overrides?: Json
          tags?: string[]
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          area?: string
          content_md?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          last_used_at?: string | null
          name?: string
          piece_type?: string
          prompt_hints?: string | null
          scope?: string
          structure?: Json
          style_overrides?: Json
          tags?: string[]
          updated_at?: string
          usage_count?: number
          user_id?: string
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
          {
            foreignKeyName: "piece_versions_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piece_versions_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "public_shared_pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      piece_visual_styles: {
        Row: {
          color_palette: string
          custom_accent: string | null
          custom_primary: string | null
          density: Database["public"]["Enums"]["visual_law_density"]
          direction: Database["public"]["Enums"]["visual_law_direction"]
          elements: Json
          extra_instructions: string | null
          font: string
          piece_id: string
          template: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color_palette?: string
          custom_accent?: string | null
          custom_primary?: string | null
          density?: Database["public"]["Enums"]["visual_law_density"]
          direction?: Database["public"]["Enums"]["visual_law_direction"]
          elements?: Json
          extra_instructions?: string | null
          font?: string
          piece_id: string
          template?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color_palette?: string
          custom_accent?: string | null
          custom_primary?: string | null
          density?: Database["public"]["Enums"]["visual_law_density"]
          direction?: Database["public"]["Enums"]["visual_law_direction"]
          elements?: Json
          extra_instructions?: string | null
          font?: string
          piece_id?: string
          template?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      piece_visual_versions: {
        Row: {
          created_at: string
          id: string
          pdf_storage_path: string | null
          piece_id: string
          style_snapshot: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pdf_storage_path?: string | null
          piece_id: string
          style_snapshot?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pdf_storage_path?: string | null
          piece_id?: string
          style_snapshot?: Json
          user_id?: string
        }
        Relationships: []
      }
      pieces: {
        Row: {
          area: string | null
          assembly_options: Json
          brand_overrides: Json
          checklist: Json | null
          content_html: string | null
          content_text: string | null
          created_at: string
          id: string
          input_data: Json
          is_shared: boolean
          model_used: string | null
          observations: string | null
          piece_type: string
          project_id: string | null
          public_slug: string | null
          status: Database["public"]["Enums"]["piece_status"]
          template_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string | null
          assembly_options?: Json
          brand_overrides?: Json
          checklist?: Json | null
          content_html?: string | null
          content_text?: string | null
          created_at?: string
          id?: string
          input_data?: Json
          is_shared?: boolean
          model_used?: string | null
          observations?: string | null
          piece_type?: string
          project_id?: string | null
          public_slug?: string | null
          status?: Database["public"]["Enums"]["piece_status"]
          template_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string | null
          assembly_options?: Json
          brand_overrides?: Json
          checklist?: Json | null
          content_html?: string | null
          content_text?: string | null
          created_at?: string
          id?: string
          input_data?: Json
          is_shared?: boolean
          model_used?: string | null
          observations?: string | null
          piece_type?: string
          project_id?: string | null
          public_slug?: string | null
          status?: Database["public"]["Enums"]["piece_status"]
          template_id?: string | null
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
          cnj_number: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string | null
          client_name?: string | null
          cnj_number?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string | null
          client_name?: string | null
          cnj_number?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      protocolo_attachments: {
        Row: {
          created_at: string
          filename: string
          id: string
          mime_type: string | null
          ordem: number
          protocolo_id: string
          sha256: string | null
          size_bytes: number | null
          source: string
          source_ref: string | null
          storage_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          mime_type?: string | null
          ordem?: number
          protocolo_id: string
          sha256?: string | null
          size_bytes?: number | null
          source: string
          source_ref?: string | null
          storage_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          mime_type?: string | null
          ordem?: number
          protocolo_id?: string
          sha256?: string | null
          size_bytes?: number | null
          source?: string
          source_ref?: string | null
          storage_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocolo_attachments_protocolo_id_fkey"
            columns: ["protocolo_id"]
            isOneToOne: false
            referencedRelation: "protocolos"
            referencedColumns: ["id"]
          },
        ]
      }
      protocolos: {
        Row: {
          bundle_path: string | null
          classe: string | null
          comprovante_path: string | null
          created_at: string
          id: string
          numero_processo: string | null
          observacoes: string | null
          orgao: string | null
          partes: Json | null
          piece_id: string | null
          protocolado_at: string | null
          signed_pdf_path: string | null
          sistema: string | null
          status: Database["public"]["Enums"]["protocolo_status"]
          tribunal_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bundle_path?: string | null
          classe?: string | null
          comprovante_path?: string | null
          created_at?: string
          id?: string
          numero_processo?: string | null
          observacoes?: string | null
          orgao?: string | null
          partes?: Json | null
          piece_id?: string | null
          protocolado_at?: string | null
          signed_pdf_path?: string | null
          sistema?: string | null
          status?: Database["public"]["Enums"]["protocolo_status"]
          tribunal_code: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bundle_path?: string | null
          classe?: string | null
          comprovante_path?: string | null
          created_at?: string
          id?: string
          numero_processo?: string | null
          observacoes?: string | null
          orgao?: string | null
          partes?: Json | null
          piece_id?: string | null
          protocolado_at?: string | null
          signed_pdf_path?: string | null
          sistema?: string | null
          status?: Database["public"]["Enums"]["protocolo_status"]
          tribunal_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocolos_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocolos_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocolos_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "public_shared_pieces"
            referencedColumns: ["id"]
          },
        ]
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
      token_usage: {
        Row: {
          completion_tokens: number
          cost_usd_estimate: number | null
          created_at: string
          id: string
          model: string | null
          piece_id: string | null
          prompt_tokens: number
          provider: string
          purpose: string | null
          total_tokens: number
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          completion_tokens?: number
          cost_usd_estimate?: number | null
          created_at?: string
          id?: string
          model?: string | null
          piece_id?: string | null
          prompt_tokens?: number
          provider: string
          purpose?: string | null
          total_tokens?: number
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          completion_tokens?: number
          cost_usd_estimate?: number | null
          created_at?: string
          id?: string
          model?: string | null
          piece_id?: string | null
          prompt_tokens?: number
          provider?: string
          purpose?: string | null
          total_tokens?: number
          user_id?: string
          workspace_id?: string | null
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
      user_certificates: {
        Row: {
          cipher_iv: string
          cipher_tag: string
          created_at: string
          fingerprint: string | null
          id: string
          issuer_cn: string | null
          label: string
          pfx_encrypted: string
          subject_cn: string | null
          updated_at: string
          user_id: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          cipher_iv: string
          cipher_tag: string
          created_at?: string
          fingerprint?: string | null
          id?: string
          issuer_cn?: string | null
          label: string
          pfx_encrypted: string
          subject_cn?: string | null
          updated_at?: string
          user_id: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          cipher_iv?: string
          cipher_tag?: string
          created_at?: string
          fingerprint?: string | null
          id?: string
          issuer_cn?: string | null
          label?: string
          pfx_encrypted?: string
          subject_cn?: string | null
          updated_at?: string
          user_id?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      user_encryption_keys: {
        Row: {
          created_at: string
          hint: string | null
          kdf_iterations: number
          salt: string
          updated_at: string
          user_id: string
          verifier_hash: string
          verifier_salt: string
        }
        Insert: {
          created_at?: string
          hint?: string | null
          kdf_iterations?: number
          salt: string
          updated_at?: string
          user_id: string
          verifier_hash: string
          verifier_salt: string
        }
        Update: {
          created_at?: string
          hint?: string | null
          kdf_iterations?: number
          salt?: string
          updated_at?: string
          user_id?: string
          verifier_hash?: string
          verifier_salt?: string
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          api_key_encrypted: string | null
          created_at: string
          endpoint: string | null
          id: string
          is_active: boolean
          model: string | null
          monthly_token_cap: number | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_encrypted?: string | null
          created_at?: string
          endpoint?: string | null
          id?: string
          is_active?: boolean
          model?: string | null
          monthly_token_cap?: number | null
          provider?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key_encrypted?: string | null
          created_at?: string
          endpoint?: string | null
          id?: string
          is_active?: boolean
          model?: string | null
          monthly_token_cap?: number | null
          provider?: string
          updated_at?: string
          user_id?: string
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
      vl_versions: {
        Row: {
          config: Json
          content: string
          created_at: string
          direction: string
          id: string
          legal_metadata: Json
          piece_id: string
          prompt: string
          risk: Json | null
          user_id: string
          validation: Json | null
        }
        Insert: {
          config: Json
          content: string
          created_at?: string
          direction: string
          id?: string
          legal_metadata?: Json
          piece_id: string
          prompt?: string
          risk?: Json | null
          user_id: string
          validation?: Json | null
        }
        Update: {
          config?: Json
          content?: string
          created_at?: string
          direction?: string
          id?: string
          legal_metadata?: Json
          piece_id?: string
          prompt?: string
          risk?: Json | null
          user_id?: string
          validation?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "vl_versions_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vl_versions_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vl_versions_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "public_shared_pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_context_items: {
        Row: {
          created_at: string
          display_order: number
          id: string
          library_item_id: string | null
          ocr_required: boolean
          payload: Json
          preview: string | null
          source_url: string | null
          storage_path: string | null
          strictness: Database["public"]["Enums"]["template_strictness"] | null
          title: string
          type: Database["public"]["Enums"]["context_item_type"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          library_item_id?: string | null
          ocr_required?: boolean
          payload?: Json
          preview?: string | null
          source_url?: string | null
          storage_path?: string | null
          strictness?: Database["public"]["Enums"]["template_strictness"] | null
          title: string
          type: Database["public"]["Enums"]["context_item_type"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          library_item_id?: string | null
          ocr_required?: boolean
          payload?: Json
          preview?: string | null
          source_url?: string | null
          storage_path?: string | null
          strictness?: Database["public"]["Enums"]["template_strictness"] | null
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
            foreignKeyName: "workspaces_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "public_shared_pieces"
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
      pieces_public: {
        Row: {
          content_html: string | null
          content_text: string | null
          id: string | null
          public_slug: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content_html?: string | null
          content_text?: string | null
          id?: string | null
          public_slug?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content_html?: string | null
          content_text?: string | null
          id?: string | null
          public_slug?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      public_shared_pieces: {
        Row: {
          area: string | null
          content_html: string | null
          content_text: string | null
          id: string | null
          piece_type: string | null
          public_slug: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          area?: string | null
          content_html?: string | null
          content_text?: string | null
          id?: string | null
          piece_type?: string | null
          public_slug?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          area?: string | null
          content_html?: string | null
          content_text?: string | null
          id?: string | null
          piece_type?: string | null
          public_slug?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      public_shared_vl_versions: {
        Row: {
          config: Json | null
          content: string | null
          created_at: string | null
          direction: string | null
          id: string | null
          piece_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vl_versions_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vl_versions_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vl_versions_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "public_shared_pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      vl_versions_public: {
        Row: {
          content: string | null
          created_at: string | null
          direction: string | null
          id: string | null
          piece_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vl_versions_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vl_versions_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vl_versions_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "public_shared_pieces"
            referencedColumns: ["id"]
          },
        ]
      }
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
      document_source: "upload" | "url" | "texto" | "transcricao" | "biblioteca"
      library_item_type:
        | "prompt"
        | "documento"
        | "legislacao"
        | "jurisprudencia"
        | "modelo"
        | "podcast"
        | "diagrama"
        | "referencia_web"
      piece_status: "draft" | "generating" | "ready" | "exported" | "archived"
      protocolo_status:
        | "rascunho"
        | "assinado"
        | "empacotado"
        | "protocolado"
        | "confirmado"
        | "erro"
      template_strictness: "flexivel" | "rigoroso" | "molde"
      thinking_level: "baixo" | "medio" | "alto"
      visual_law_density: "enxuto" | "padrao" | "confortavel"
      visual_law_direction: "organizar" | "explicar" | "mais_visual"
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
      document_source: ["upload", "url", "texto", "transcricao", "biblioteca"],
      library_item_type: [
        "prompt",
        "documento",
        "legislacao",
        "jurisprudencia",
        "modelo",
        "podcast",
        "diagrama",
        "referencia_web",
      ],
      piece_status: ["draft", "generating", "ready", "exported", "archived"],
      protocolo_status: [
        "rascunho",
        "assinado",
        "empacotado",
        "protocolado",
        "confirmado",
        "erro",
      ],
      template_strictness: ["flexivel", "rigoroso", "molde"],
      thinking_level: ["baixo", "medio", "alto"],
      visual_law_density: ["enxuto", "padrao", "confortavel"],
      visual_law_direction: ["organizar", "explicar", "mais_visual"],
      workspace_mode: ["padrao", "agentico"],
    },
  },
} as const
