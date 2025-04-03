// types/supabase.ts
export type TrainingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          github_id: string | null;
          google_id: string | null;
          facebook_id: string | null;
          full_name: string | null;
          created_at: string;
          verified: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          github_id?: string | null;
          google_id?: string | null;
          facebook_id?: string | null;
          full_name?: string | null;
          created_at?: string;
          verified?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          github_id?: string | null;
          google_id?: string | null;
          facebook_id?: string | null;
          full_name?: string | null;
          created_at?: string;
          verified?: boolean;
          updated_at?: string;
        };
      };
      user_payment: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          credits_balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          credits_balance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          credits_balance?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      lora_training: {
        Row: {
          id: string;
          user_id: string;
          lora_name: string | null;
          training_params: any | null;
          input_files: any | null;
          output_lora: string | null;
          training_status: TrainingStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lora_name?: string | null;
          training_params?: any | null;
          input_files?: any | null;
          output_lora?: string | null;
          training_status?: TrainingStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lora_name?: string | null;
          training_params?: any | null;
          input_files?: any | null;
          output_lora?: string | null;
          training_status?: TrainingStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      image_generation: {
        Row: {
          id: string;
          user_id: string;
          lora_id: string;
          generated_images: any | null;
          generation_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lora_id: string;
          generated_images?: any | null;
          generation_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lora_id?: string;
          generated_images?: any | null;
          generation_status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          transaction_type: string | null;
          transaction_amount: number | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_type?: string | null;
          transaction_amount?: number | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_type?: string | null;
          transaction_amount?: number | null;
          reason?: string | null;
          created_at?: string;
        };
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
  };
};