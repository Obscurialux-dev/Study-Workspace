export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          user_id: string;
          code: string;
          name: string;
          description: string | null;
          semester: string | null;
          color: string | null;
          icon: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          code: string;
          name: string;
          description?: string | null;
          semester?: string | null;
          color?: string | null;
          icon?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          semester?: string | null;
          color?: string | null;
          icon?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tuton_sessions: {
        Row: {
          id: string;
          course_id: string;
          session_number: number;
          title: string;
          start_date: string;
          end_date: string;
          material_label: string | null;
          activity_label: string | null;
          activity_type: string;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          session_number: number;
          title: string;
          start_date: string;
          end_date: string;
          material_label?: string | null;
          activity_label?: string | null;
          activity_type?: string;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          session_number?: number;
          title?: string;
          start_date?: string;
          end_date?: string;
          material_label?: string | null;
          activity_label?: string | null;
          activity_type?: string;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type Course = Database["public"]["Tables"]["courses"]["Row"];

export type TutonSession =
  Database["public"]["Tables"]["tuton_sessions"]["Row"];
