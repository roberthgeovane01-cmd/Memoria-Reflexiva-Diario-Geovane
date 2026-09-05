export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      approved_reflections: {
        Row: {
          approved_at: string;
          body: string;
          id: string;
          session_id: string;
          source_generation_id: string | null;
          title: string | null;
          user_id: string;
        };
        Insert: {
          approved_at?: string;
          body: string;
          id?: string;
          session_id: string;
          source_generation_id?: string | null;
          title?: string | null;
          user_id?: string;
        };
        Update: {
          approved_at?: string;
          body?: string;
          id?: string;
          session_id?: string;
          source_generation_id?: string | null;
          title?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "approved_reflections_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: true;
            referencedRelation: "reflection_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "approved_reflections_source_generation_id_fkey";
            columns: ["source_generation_id"];
            isOneToOne: false;
            referencedRelation: "generated_reflections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "approved_reflections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      author_profile_versions: {
        Row: {
          author_profile_id: string;
          created_at: string;
          id: string;
          snapshot: Json;
          user_id: string;
          version: number;
        };
        Insert: {
          author_profile_id: string;
          created_at?: string;
          id?: string;
          snapshot: Json;
          user_id: string;
          version: number;
        };
        Update: {
          author_profile_id?: string;
          created_at?: string;
          id?: string;
          snapshot?: Json;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "author_profile_versions_author_profile_id_fkey";
            columns: ["author_profile_id"];
            isOneToOne: false;
            referencedRelation: "author_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "author_profile_versions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      author_profiles: {
        Row: {
          avoidances: Json;
          created_at: string;
          id: string;
          lexicon: Json;
          profile_name: string;
          source_count: number;
          status: string;
          structure_preferences: Json;
          style_rules: Json;
          style_summary: string | null;
          updated_at: string;
          user_id: string;
          version: number;
        };
        Insert: {
          avoidances?: Json;
          created_at?: string;
          id?: string;
          lexicon?: Json;
          profile_name?: string;
          source_count?: number;
          status?: string;
          structure_preferences?: Json;
          style_rules?: Json;
          style_summary?: string | null;
          updated_at?: string;
          user_id: string;
          version?: number;
        };
        Update: {
          avoidances?: Json;
          created_at?: string;
          id?: string;
          lexicon?: Json;
          profile_name?: string;
          source_count?: number;
          status?: string;
          structure_preferences?: Json;
          style_rules?: Json;
          style_summary?: string | null;
          updated_at?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "author_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_sources: {
        Row: {
          created_at: string;
          id: string;
          metadata: Json;
          raw_text: string;
          session_id: string;
          source_author: string | null;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          metadata?: Json;
          raw_text: string;
          session_id: string;
          source_author?: string | null;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          metadata?: Json;
          raw_text?: string;
          session_id?: string;
          source_author?: string | null;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_sources_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: true;
            referencedRelation: "reflection_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_sources_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      generated_audio: {
        Row: {
          approved_reflection_id: string;
          created_at: string;
          duration_seconds: number | null;
          error_message: string | null;
          generation_settings: Json;
          id: string;
          mime_type: string;
          provider: string;
          provider_request_id: string | null;
          session_id: string;
          status: string;
          storage_path: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          approved_reflection_id: string;
          created_at?: string;
          duration_seconds?: number | null;
          error_message?: string | null;
          generation_settings?: Json;
          id?: string;
          mime_type?: string;
          provider?: string;
          provider_request_id?: string | null;
          session_id: string;
          status?: string;
          storage_path?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          approved_reflection_id?: string;
          created_at?: string;
          duration_seconds?: number | null;
          error_message?: string | null;
          generation_settings?: Json;
          id?: string;
          mime_type?: string;
          provider?: string;
          provider_request_id?: string | null;
          session_id?: string;
          status?: string;
          storage_path?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generated_audio_approved_reflection_id_fkey";
            columns: ["approved_reflection_id"];
            isOneToOne: false;
            referencedRelation: "approved_reflections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generated_audio_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "reflection_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generated_audio_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      generated_reflections: {
        Row: {
          body: string;
          created_at: string;
          generation_metadata: Json;
          id: string;
          input_snapshot: Json;
          model_name: string | null;
          model_provider: string | null;
          prompt_version: string | null;
          session_id: string;
          status: string;
          title: string | null;
          updated_at: string;
          user_id: string;
          version_number: number;
        };
        Insert: {
          body: string;
          created_at?: string;
          generation_metadata?: Json;
          id?: string;
          input_snapshot?: Json;
          model_name?: string | null;
          model_provider?: string | null;
          prompt_version?: string | null;
          session_id: string;
          status?: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
          version_number: number;
        };
        Update: {
          body?: string;
          created_at?: string;
          generation_metadata?: Json;
          id?: string;
          input_snapshot?: Json;
          model_name?: string | null;
          model_provider?: string | null;
          prompt_version?: string | null;
          session_id?: string;
          status?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "generated_reflections_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "reflection_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generated_reflections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      historical_reflection_chunks: {
        Row: {
          chunk_index: number;
          content: string;
          created_at: string;
          embedding: string | null;
          embedding_model: string | null;
          id: string;
          metadata: Json;
          reflection_id: string;
          user_id: string;
        };
        Insert: {
          chunk_index: number;
          content: string;
          created_at?: string;
          embedding?: string | null;
          embedding_model?: string | null;
          id?: string;
          metadata?: Json;
          reflection_id: string;
          user_id: string;
        };
        Update: {
          chunk_index?: number;
          content?: string;
          created_at?: string;
          embedding?: string | null;
          embedding_model?: string | null;
          id?: string;
          metadata?: Json;
          reflection_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "historical_reflection_chunks_reflection_id_fkey";
            columns: ["reflection_id"];
            isOneToOne: false;
            referencedRelation: "historical_reflections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "historical_reflection_chunks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      historical_reflections: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          import_batch_id: string | null;
          metadata: Json;
          original_date: string | null;
          source_reference: string | null;
          summary: string | null;
          themes: string[];
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          import_batch_id?: string | null;
          metadata?: Json;
          original_date?: string | null;
          source_reference?: string | null;
          summary?: string | null;
          themes?: string[];
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          import_batch_id?: string | null;
          metadata?: Json;
          original_date?: string | null;
          source_reference?: string | null;
          summary?: string | null;
          themes?: string[];
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "historical_reflections_import_batch_id_fkey";
            columns: ["import_batch_id"];
            isOneToOne: false;
            referencedRelation: "import_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "historical_reflections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      import_batches: {
        Row: {
          created_at: string;
          failed_items: number;
          id: string;
          metadata: Json;
          processed_items: number;
          source_name: string | null;
          status: string;
          total_items: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          failed_items?: number;
          id?: string;
          metadata?: Json;
          processed_items?: number;
          source_name?: string | null;
          status?: string;
          total_items?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          failed_items?: number;
          id?: string;
          metadata?: Json;
          processed_items?: number;
          source_name?: string | null;
          status?: string;
          total_items?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "import_batches_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reflection_comments: {
        Row: {
          audio_duration_seconds: number | null;
          audio_mime_type: string | null;
          audio_storage_path: string | null;
          created_at: string;
          id: string;
          input_mode: string;
          session_id: string;
          text_comment: string | null;
          transcript_edited: string | null;
          transcript_raw: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          audio_duration_seconds?: number | null;
          audio_mime_type?: string | null;
          audio_storage_path?: string | null;
          created_at?: string;
          id?: string;
          input_mode?: string;
          session_id: string;
          text_comment?: string | null;
          transcript_edited?: string | null;
          transcript_raw?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          audio_duration_seconds?: number | null;
          audio_mime_type?: string | null;
          audio_storage_path?: string | null;
          created_at?: string;
          id?: string;
          input_mode?: string;
          session_id?: string;
          text_comment?: string | null;
          transcript_edited?: string | null;
          transcript_raw?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reflection_comments_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: true;
            referencedRelation: "reflection_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reflection_comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reflection_edits: {
        Row: {
          body: string;
          created_at: string;
          generated_reflection_id: string;
          id: string;
          session_id: string;
          title: string | null;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          generated_reflection_id: string;
          id?: string;
          session_id: string;
          title?: string | null;
          user_id?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          generated_reflection_id?: string;
          id?: string;
          session_id?: string;
          title?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reflection_edits_generated_reflection_id_fkey";
            columns: ["generated_reflection_id"];
            isOneToOne: false;
            referencedRelation: "generated_reflections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reflection_edits_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "reflection_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reflection_edits_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reflection_sessions: {
        Row: {
          created_at: string;
          id: string;
          reflection_date: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          reflection_date?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          reflection_date?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reflection_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      retrieval_references: {
        Row: {
          chunk_id: string | null;
          created_at: string;
          generated_reflection_id: string;
          historical_reflection_id: string | null;
          id: string;
          rank: number;
          reference_text_snapshot: string;
          reference_title_snapshot: string | null;
          similarity: number | null;
          user_id: string;
        };
        Insert: {
          chunk_id?: string | null;
          created_at?: string;
          generated_reflection_id: string;
          historical_reflection_id?: string | null;
          id?: string;
          rank: number;
          reference_text_snapshot: string;
          reference_title_snapshot?: string | null;
          similarity?: number | null;
          user_id: string;
        };
        Update: {
          chunk_id?: string | null;
          created_at?: string;
          generated_reflection_id?: string;
          historical_reflection_id?: string | null;
          id?: string;
          rank?: number;
          reference_text_snapshot?: string;
          reference_title_snapshot?: string | null;
          similarity?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "retrieval_references_chunk_id_fkey";
            columns: ["chunk_id"];
            isOneToOne: false;
            referencedRelation: "historical_reflection_chunks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "retrieval_references_generated_reflection_id_fkey";
            columns: ["generated_reflection_id"];
            isOneToOne: false;
            referencedRelation: "generated_reflections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "retrieval_references_historical_reflection_id_fkey";
            columns: ["historical_reflection_id"];
            isOneToOne: false;
            referencedRelation: "historical_reflections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "retrieval_references_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      match_historical_reflection_chunks: {
        Args: {
          embedding_model_name: string;
          match_count?: number;
          match_threshold?: number;
          query_embedding: string;
        };
        Returns: {
          chunk_id: string;
          content: string;
          original_date: string;
          reflection_id: string;
          similarity: number;
          themes: string[];
          title: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
