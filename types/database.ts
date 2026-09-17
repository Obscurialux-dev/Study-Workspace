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
          uas_score: number | null;
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
          uas_score?: number | null;
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
          uas_score?: number | null;
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
      materials: {
        Row: {
          id: string;
          course_id: string;
          user_id: string;
          session_id: string | null;
          title: string;
          module_name: string | null;
          topic: string | null;
          content: string | null;
          source: string | null;
          file_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          user_id: string;
          session_id?: string | null;
          title: string;
          module_name?: string | null;
          topic?: string | null;
          content?: string | null;
          source?: string | null;
          file_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          user_id?: string;
          session_id?: string | null;
          title?: string;
          module_name?: string | null;
          topic?: string | null;
          content?: string | null;
          source?: string | null;
          file_path?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "materials_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materials_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "tuton_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          course_id: string | null;
          material_id: string | null;
          title: string;
          content: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id?: string | null;
          material_id?: string | null;
          title: string;
          content?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string | null;
          material_id?: string | null;
          title?: string;
          content?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notes_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notes_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
        ];
      };
      assignments: {
        Row: {
          id: string;
          course_id: string;
          user_id: string;
          session_id: string | null;
          title: string;
          description: string | null;
          deadline: string;
          status: string;
          external_url: string | null;
          file_path: string | null;
          score: number | null;
          score_max: number | null;
          feedback: string | null;
          score_recorded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          user_id: string;
          session_id?: string | null;
          title: string;
          description?: string | null;
          deadline: string;
          status?: string;
          external_url?: string | null;
          file_path?: string | null;
          score?: number | null;
          score_max?: number | null;
          feedback?: string | null;
          score_recorded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          user_id?: string;
          session_id?: string | null;
          title?: string;
          description?: string | null;
          deadline?: string;
          status?: string;
          external_url?: string | null;
          file_path?: string | null;
          score?: number | null;
          score_max?: number | null;
          feedback?: string | null;
          score_recorded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "tuton_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      discussions: {
        Row: {
          id: string;
          course_id: string;
          user_id: string;
          session_id: string | null;
          title: string;
          deadline: string;
          external_url: string | null;
          response_text: string | null;
          status: string;
          score: number | null;
          score_max: number | null;
          feedback: string | null;
          score_recorded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          user_id: string;
          session_id?: string | null;
          title: string;
          deadline: string;
          external_url?: string | null;
          response_text?: string | null;
          status?: string;
          score?: number | null;
          score_max?: number | null;
          feedback?: string | null;
          score_recorded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          user_id?: string;
          session_id?: string | null;
          title?: string;
          deadline?: string;
          external_url?: string | null;
          response_text?: string | null;
          status?: string;
          score?: number | null;
          score_max?: number | null;
          feedback?: string | null;
          score_recorded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "discussions_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discussions_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "tuton_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      exam_topics: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          material_id: string | null;
          title: string;
          description: string | null;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          material_id?: string | null;
          title: string;
          description?: string | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          material_id?: string | null;
          title?: string;
          description?: string | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exam_topics_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exam_topics_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
        ];
      };
      questions: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          exam_topic_id: string | null;
          material_id: string | null;
          question: string;
          option_a: string;
          option_b: string;
          option_c: string;
          option_d: string;
          correct_answer: string;
          explanation: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          exam_topic_id?: string | null;
          material_id?: string | null;
          question: string;
          option_a: string;
          option_b: string;
          option_c: string;
          option_d: string;
          correct_answer: string;
          explanation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          exam_topic_id?: string | null;
          material_id?: string | null;
          question?: string;
          option_a?: string;
          option_b?: string;
          option_c?: string;
          option_d?: string;
          correct_answer?: string;
          explanation?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questions_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_exam_topic_id_fkey";
            columns: ["exam_topic_id"];
            isOneToOne: false;
            referencedRelation: "exam_topics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_attempts: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          total_questions: number;
          correct_answers: number;
          score: number;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          total_questions: number;
          correct_answers?: number;
          score?: number;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          total_questions?: number;
          correct_answers?: number;
          score?: number;
          started_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_answers: {
        Row: {
          id: string;
          attempt_id: string;
          question_id: string;
          position: number;
          selected_answer: string | null;
          is_correct: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          question_id: string;
          position: number;
          selected_answer?: string | null;
          is_correct?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          attempt_id?: string;
          question_id?: string;
          position?: number;
          selected_answer?: string | null;
          is_correct?: boolean | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_answers_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "quiz_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
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

export type Material = Database["public"]["Tables"]["materials"]["Row"];

export type Note = Database["public"]["Tables"]["notes"]["Row"];

export type Assignment = Database["public"]["Tables"]["assignments"]["Row"];

export type Discussion = Database["public"]["Tables"]["discussions"]["Row"];

export type ExamTopic = Database["public"]["Tables"]["exam_topics"]["Row"];

export type Question = Database["public"]["Tables"]["questions"]["Row"];

export type QuizAttempt = Database["public"]["Tables"]["quiz_attempts"]["Row"];

export type QuizAnswer = Database["public"]["Tables"]["quiz_answers"]["Row"];
