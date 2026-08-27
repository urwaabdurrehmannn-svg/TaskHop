/**
 * Hand-written mirror of supabase/migrations/0001_init.sql.
 * If the schema changes, update this file and the migration together.
 * (Regenerate later with `supabase gen types typescript` once the CLI is linked.)
 */

export type TaskStatusRow = 'open' | 'matching' | 'in_progress' | 'completed' | 'cancelled';
export type AvailabilityRow = 'available_now' | 'available_soon' | 'busy';
export type ExchangeTypeRow = 'skill' | 'money';
export type PaymentStatusRow = 'payment_pending' | 'paid';
export type InterestInitiatorRow = 'helper' | 'owner';
export type ReportTargetTypeRow = 'user' | 'task';
export type ReportReasonRow = 'scam_fraud' | 'harassment' | 'fake_information' | 'inappropriate_behavior' | 'spam' | 'other';
export type ReportStatusRow = 'open' | 'reviewed' | 'resolved';
export type NotificationTypeRow = 'new_message' | 'interest_accepted' | 'new_interest' | 'new_task_match';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          avatar_url: string | null;
          bio: string | null;
          location: string | null;
          availability: AvailabilityRow;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          avatar_url?: string | null;
          bio?: string | null;
          location?: string | null;
          availability?: AvailabilityRow;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          avatar_url?: string | null;
          bio?: string | null;
          location?: string | null;
          availability?: AvailabilityRow;
          created_at?: string;
        };
        Relationships: [];
      };
      skills: {
        Row: {
          id: string;
          name: string;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_skills: {
        Row: {
          user_id: string;
          skill_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          skill_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          skill_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          created_by: string;
          title: string;
          description: string;
          category: string;
          deadline: string | null;
          status: TaskStatusRow;
          exchange_type: ExchangeTypeRow;
          offered_skill: string | null;
          offered_amount: number | null;
          payment_status: PaymentStatusRow | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          created_by: string;
          title: string;
          description: string;
          category: string;
          deadline?: string | null;
          status?: TaskStatusRow;
          exchange_type: ExchangeTypeRow;
          offered_skill?: string | null;
          offered_amount?: number | null;
          payment_status?: PaymentStatusRow | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          created_by?: string;
          title?: string;
          description?: string;
          category?: string;
          deadline?: string | null;
          status?: TaskStatusRow;
          exchange_type?: ExchangeTypeRow;
          offered_skill?: string | null;
          offered_amount?: number | null;
          payment_status?: PaymentStatusRow | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      task_skills: {
        Row: {
          task_id: string;
          skill_id: string;
        };
        Insert: {
          task_id: string;
          skill_id: string;
        };
        Update: {
          task_id?: string;
          skill_id?: string;
        };
        Relationships: [];
      };
      task_interests: {
        Row: {
          id: string;
          task_id: string;
          helper_id: string;
          initiated_by: InterestInitiatorRow;
          accepted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          helper_id: string;
          initiated_by?: InterestInitiatorRow;
          accepted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          helper_id?: string;
          initiated_by?: InterestInitiatorRow;
          accepted?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          task_interest_id: string;
          sender_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_interest_id: string;
          sender_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_interest_id?: string;
          sender_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: ReportTargetTypeRow;
          reported_user_id: string | null;
          reported_task_id: string | null;
          reason: ReportReasonRow;
          description: string | null;
          status: ReportStatusRow;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: ReportTargetTypeRow;
          reported_user_id?: string | null;
          reported_task_id?: string | null;
          reason: ReportReasonRow;
          description?: string | null;
          status?: ReportStatusRow;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          target_type?: ReportTargetTypeRow;
          reported_user_id?: string | null;
          reported_task_id?: string | null;
          reason?: ReportReasonRow;
          description?: string | null;
          status?: ReportStatusRow;
          created_at?: string;
        };
        Relationships: [];
      };
      blocks: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          blocker_id?: string;
          blocked_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          task_id: string;
          reviewer_id: string;
          reviewed_user_id: string;
          rating: number;
          body: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          reviewer_id: string;
          reviewed_user_id: string;
          rating: number;
          body?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          reviewer_id?: string;
          reviewed_user_id?: string;
          rating?: number;
          body?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          type: NotificationTypeRow;
          title: string;
          body: string;
          data: Record<string, unknown>;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          type: NotificationTypeRow;
          title: string;
          body: string;
          data?: Record<string, unknown>;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          type?: NotificationTypeRow;
          title?: string;
          body?: string;
          data?: Record<string, unknown>;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      device_push_tokens: {
        Row: {
          id: string;
          user_id: string;
          expo_push_token: string;
          platform: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          expo_push_token: string;
          platform?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          expo_push_token?: string;
          platform?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      accept_helper: {
        Args: {
          p_task_id: string;
          p_task_interest_id: string;
        };
        Returns: void;
      };
      register_device_push_token: {
        Args: {
          p_expo_push_token: string;
          p_platform: string;
        };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
