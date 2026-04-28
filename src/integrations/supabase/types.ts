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
      admin_employees: {
        Row: {
          created_at: string
          id: string
          is_super_admin: boolean | null
          permissions: Json | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_super_admin?: boolean | null
          permissions?: Json | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_super_admin?: boolean | null
          permissions?: Json | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agencies: {
        Row: {
          address: string | null
          bio: string | null
          business_name: string
          city: string | null
          created_at: string
          ice: string | null
          id: string
          is_locked: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          phone: string | null
          primary_neighborhood: string | null
          profile_id: string
          rc: string | null
          subscription_plan: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          verification_status: string | null
        }
        Insert: {
          address?: string | null
          bio?: string | null
          business_name: string
          city?: string | null
          created_at?: string
          ice?: string | null
          id?: string
          is_locked?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          phone?: string | null
          primary_neighborhood?: string | null
          profile_id: string
          rc?: string | null
          subscription_plan?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          verification_status?: string | null
        }
        Update: {
          address?: string | null
          bio?: string | null
          business_name?: string
          city?: string | null
          created_at?: string
          ice?: string | null
          id?: string
          is_locked?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          phone?: string | null
          primary_neighborhood?: string | null
          profile_id?: string
          rc?: string | null
          subscription_plan?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agencies_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agencies_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          grace_period_ends_at: string | null
          id: string
          last_payment_id: string | null
          locked_at: string | null
          plan: string
          status: string
          trial_ends_at: string | null
          trial_reminder_sent_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_ends_at?: string | null
          id?: string
          last_payment_id?: string | null
          locked_at?: string | null
          plan?: string
          status?: string
          trial_ends_at?: string | null
          trial_reminder_sent_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_ends_at?: string | null
          id?: string
          last_payment_id?: string | null
          locked_at?: string | null
          plan?: string
          status?: string
          trial_ends_at?: string | null
          trial_reminder_sent_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agency_wallet_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          currency: string
          description: string | null
          id: string
          metadata: Json | null
          method: string | null
          reference: string | null
          related_booking_id: string | null
          related_payment_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          method?: string | null
          reference?: string | null
          related_booking_id?: string | null
          related_payment_id?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          method?: string | null
          reference?: string | null
          related_booking_id?: string | null
          related_payment_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      agency_wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agency_withdrawal_requests: {
        Row: {
          amount: number
          bank_account_label: string | null
          bank_iban: string | null
          created_at: string
          currency: string
          id: string
          notes: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          bank_account_label?: string | null
          bank_iban?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bank_account_label?: string | null
          bank_iban?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          action_description: string | null
          action_type: string | null
          actor_email: string | null
          actor_id: string | null
          actor_name: string | null
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          metadata: Json | null
          new_data: Json | null
          new_value: Json | null
          old_data: Json | null
          old_value: Json | null
          record_id: string | null
          table_name: string | null
          target_resource_id: string | null
          target_resource_type: string | null
          target_user_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          action_description?: string | null
          action_type?: string | null
          actor_email?: string | null
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          new_value?: Json | null
          old_data?: Json | null
          old_value?: Json | null
          record_id?: string | null
          table_name?: string | null
          target_resource_id?: string | null
          target_resource_type?: string | null
          target_user_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          action_description?: string | null
          action_type?: string | null
          actor_email?: string | null
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          new_value?: Json | null
          old_data?: Json | null
          old_value?: Json | null
          record_id?: string | null
          table_name?: string | null
          target_resource_id?: string | null
          target_resource_type?: string | null
          target_user_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bike_holds: {
        Row: {
          bike_id: string
          created_at: string
          expires_at: string
          id: string
          pickup_date: string
          return_date: string
          user_id: string
        }
        Insert: {
          bike_id: string
          created_at?: string
          expires_at?: string
          id?: string
          pickup_date: string
          return_date: string
          user_id: string
        }
        Update: {
          bike_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          pickup_date?: string
          return_date?: string
          user_id?: string
        }
        Relationships: []
      }
      bike_inventory: {
        Row: {
          available_count: number | null
          available_quantity: number | null
          bike_type_id: string
          city_id: string | null
          created_at: string
          id: string
          location: string
          location_id: string | null
          quantity: number | null
          total_count: number | null
          updated_at: string
        }
        Insert: {
          available_count?: number | null
          available_quantity?: number | null
          bike_type_id: string
          city_id?: string | null
          created_at?: string
          id?: string
          location: string
          location_id?: string | null
          quantity?: number | null
          total_count?: number | null
          updated_at?: string
        }
        Update: {
          available_count?: number | null
          available_quantity?: number | null
          bike_type_id?: string
          city_id?: string | null
          created_at?: string
          id?: string
          location?: string
          location_id?: string | null
          quantity?: number | null
          total_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bike_inventory_bike_type_id_fkey"
            columns: ["bike_type_id"]
            isOneToOne: false
            referencedRelation: "bike_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bike_inventory_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "city_bike_counts"
            referencedColumns: ["city_id"]
          },
          {
            foreignKeyName: "bike_inventory_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "service_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bike_inventory_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "service_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      bike_reviews: {
        Row: {
          bike_type_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewer_name: string
          user_id: string | null
        }
        Insert: {
          bike_type_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewer_name: string
          user_id?: string | null
        }
        Update: {
          bike_type_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewer_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bike_type_images: {
        Row: {
          bike_type_id: string
          created_at: string
          display_order: number | null
          id: string
          image_url: string
        }
        Insert: {
          bike_type_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          image_url: string
        }
        Update: {
          bike_type_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "bike_type_images_bike_type_id_fkey"
            columns: ["bike_type_id"]
            isOneToOne: false
            referencedRelation: "bike_types"
            referencedColumns: ["id"]
          },
        ]
      }
      bike_types: {
        Row: {
          approval_status: string | null
          availability_status: string | null
          business_status: string | null
          category: string | null
          city_id: string | null
          color: string | null
          created_at: string
          daily_price: number | null
          deposit_amount: number | null
          description: string | null
          engine_cc: number | null
          features: string[] | null
          fuel_capacity: string | null
          fuel_type: string | null
          id: string
          is_approved: boolean | null
          is_original: boolean | null
          license_required: string | null
          main_image_url: string | null
          mileage_km: number | null
          min_age: number | null
          min_experience_years: number | null
          monthly_price: number | null
          name: string
          neighborhood: string | null
          owner_id: string | null
          rating: number | null
          review_count: number | null
          seat_height: string | null
          top_speed: string | null
          transmission: string | null
          updated_at: string
          weekly_price: number | null
          weight: string | null
          year: number | null
        }
        Insert: {
          approval_status?: string | null
          availability_status?: string | null
          business_status?: string | null
          category?: string | null
          city_id?: string | null
          color?: string | null
          created_at?: string
          daily_price?: number | null
          deposit_amount?: number | null
          description?: string | null
          engine_cc?: number | null
          features?: string[] | null
          fuel_capacity?: string | null
          fuel_type?: string | null
          id?: string
          is_approved?: boolean | null
          is_original?: boolean | null
          license_required?: string | null
          main_image_url?: string | null
          mileage_km?: number | null
          min_age?: number | null
          min_experience_years?: number | null
          monthly_price?: number | null
          name: string
          neighborhood?: string | null
          owner_id?: string | null
          rating?: number | null
          review_count?: number | null
          seat_height?: string | null
          top_speed?: string | null
          transmission?: string | null
          updated_at?: string
          weekly_price?: number | null
          weight?: string | null
          year?: number | null
        }
        Update: {
          approval_status?: string | null
          availability_status?: string | null
          business_status?: string | null
          category?: string | null
          city_id?: string | null
          color?: string | null
          created_at?: string
          daily_price?: number | null
          deposit_amount?: number | null
          description?: string | null
          engine_cc?: number | null
          features?: string[] | null
          fuel_capacity?: string | null
          fuel_type?: string | null
          id?: string
          is_approved?: boolean | null
          is_original?: boolean | null
          license_required?: string | null
          main_image_url?: string | null
          mileage_km?: number | null
          min_age?: number | null
          min_experience_years?: number | null
          monthly_price?: number | null
          name?: string
          neighborhood?: string | null
          owner_id?: string | null
          rating?: number | null
          review_count?: number | null
          seat_height?: string | null
          top_speed?: string | null
          transmission?: string | null
          updated_at?: string
          weekly_price?: number | null
          weight?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bike_types_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "city_bike_counts"
            referencedColumns: ["city_id"]
          },
          {
            foreignKeyName: "bike_types_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "service_cities"
            referencedColumns: ["id"]
          },
        ]
      }
      bikes: {
        Row: {
          agency_id: string | null
          approval_status: string
          available: boolean | null
          bike_type_id: string
          condition: string | null
          created_at: string
          id: string
          license_plate: string | null
          location: string | null
          notes: string | null
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          approval_status?: string
          available?: boolean | null
          bike_type_id: string
          condition?: string | null
          created_at?: string
          id?: string
          license_plate?: string | null
          location?: string | null
          notes?: string | null
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          approval_status?: string
          available?: boolean | null
          bike_type_id?: string
          condition?: string | null
          created_at?: string
          id?: string
          license_plate?: string | null
          location?: string | null
          notes?: string | null
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bikes_bike_type_id_fkey"
            columns: ["bike_type_id"]
            isOneToOne: false
            referencedRelation: "bike_types"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_events: {
        Row: {
          action: string | null
          actor_id: string | null
          actor_name: string | null
          actor_type: string | null
          booking_id: string
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          from_state: string | null
          id: string
          meta: Json | null
          metadata: Json | null
          new_status: string | null
          notes: string | null
          old_status: string | null
          to_state: string | null
        }
        Insert: {
          action?: string | null
          actor_id?: string | null
          actor_name?: string | null
          actor_type?: string | null
          booking_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type: string
          from_state?: string | null
          id?: string
          meta?: Json | null
          metadata?: Json | null
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          to_state?: string | null
        }
        Update: {
          action?: string | null
          actor_id?: string | null
          actor_name?: string | null
          actor_type?: string | null
          booking_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          from_state?: string | null
          id?: string
          meta?: Json | null
          metadata?: Json | null
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          to_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_messages: {
        Row: {
          attachment_url: string | null
          body: string | null
          booking_id: string
          created_at: string
          flag_reasons: string[] | null
          flagged: boolean
          id: string
          message_type: string
          read_at: string | null
          sender_id: string | null
          sender_role: string
        }
        Insert: {
          attachment_url?: string | null
          body?: string | null
          booking_id: string
          created_at?: string
          flag_reasons?: string[] | null
          flagged?: boolean
          id?: string
          message_type?: string
          read_at?: string | null
          sender_id?: string | null
          sender_role: string
        }
        Update: {
          attachment_url?: string | null
          body?: string | null
          booking_id?: string
          created_at?: string
          flag_reasons?: string[] | null
          flagged?: boolean
          id?: string
          message_type?: string
          read_at?: string | null
          sender_id?: string | null
          sender_role?: string
        }
        Relationships: []
      }
      booking_notes: {
        Row: {
          booking_id: string
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          note: string
          title: string | null
        }
        Insert: {
          booking_id: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note: string
          title?: string | null
        }
        Update: {
          booking_id?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          currency: string | null
          external_reference: string | null
          id: string
          method: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_type: string | null
          provider: string | null
          receipt_url: string | null
          recorded_by: string | null
          recorded_by_name: string | null
          reference: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          currency?: string | null
          external_reference?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_type?: string | null
          provider?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          recorded_by_name?: string | null
          reference?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          currency?: string | null
          external_reference?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_type?: string | null
          provider?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          recorded_by_name?: string | null
          reference?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          admin_notes: string | null
          admin_status: string | null
          amount_paid: number | null
          assigned_at: string | null
          assigned_to_business: string | null
          bike_id: string | null
          booking_status: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          contract_status: string | null
          contract_url: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_fee: number | null
          delivery_location: string | null
          delivery_method: string | null
          discount_amount: number | null
          helmet_included: boolean | null
          id: string
          insurance_included: boolean | null
          notes: string | null
          payment_method: string | null
          payment_status: string | null
          pickup_date: string
          pickup_location: string | null
          pickup_time: string | null
          pricing_breakdown: Json | null
          rating: number | null
          rejected_at: string | null
          rejected_by: string | null
          rejected_reason_code: string | null
          rejected_reason_text: string | null
          return_date: string
          return_location: string | null
          return_time: string | null
          review: string | null
          signed_contract_url: string | null
          source: string | null
          special_requests: string | null
          status: string | null
          total_days: number | null
          total_price: number | null
          unconfirmed_at: string | null
          unconfirmed_by: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          admin_status?: string | null
          amount_paid?: number | null
          assigned_at?: string | null
          assigned_to_business?: string | null
          bike_id?: string | null
          booking_status?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          contract_status?: string | null
          contract_url?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number | null
          delivery_location?: string | null
          delivery_method?: string | null
          discount_amount?: number | null
          helmet_included?: boolean | null
          id?: string
          insurance_included?: boolean | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_date: string
          pickup_location?: string | null
          pickup_time?: string | null
          pricing_breakdown?: Json | null
          rating?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_reason_code?: string | null
          rejected_reason_text?: string | null
          return_date: string
          return_location?: string | null
          return_time?: string | null
          review?: string | null
          signed_contract_url?: string | null
          source?: string | null
          special_requests?: string | null
          status?: string | null
          total_days?: number | null
          total_price?: number | null
          unconfirmed_at?: string | null
          unconfirmed_by?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          admin_status?: string | null
          amount_paid?: number | null
          assigned_at?: string | null
          assigned_to_business?: string | null
          bike_id?: string | null
          booking_status?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          contract_status?: string | null
          contract_url?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number | null
          delivery_location?: string | null
          delivery_method?: string | null
          discount_amount?: number | null
          helmet_included?: boolean | null
          id?: string
          insurance_included?: boolean | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_date?: string
          pickup_location?: string | null
          pickup_time?: string | null
          pricing_breakdown?: Json | null
          rating?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_reason_code?: string | null
          rejected_reason_text?: string | null
          return_date?: string
          return_location?: string | null
          return_time?: string | null
          review?: string | null
          signed_contract_url?: string | null
          source?: string | null
          special_requests?: string | null
          status?: string | null
          total_days?: number | null
          total_price?: number | null
          unconfirmed_at?: string | null
          unconfirmed_by?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes_public"
            referencedColumns: ["id"]
          },
        ]
      }
      client_file_downloads: {
        Row: {
          created_at: string
          downloaded_by: string | null
          downloaded_by_name: string | null
          file_id: string
          id: string
        }
        Insert: {
          created_at?: string
          downloaded_by?: string | null
          downloaded_by_name?: string | null
          file_id: string
          id?: string
        }
        Update: {
          created_at?: string
          downloaded_by?: string | null
          downloaded_by_name?: string | null
          file_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_file_downloads_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "client_files"
            referencedColumns: ["id"]
          },
        ]
      }
      client_files: {
        Row: {
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          uploaded_by: string | null
          uploaded_by_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_by?: string | null
          uploaded_by_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
          uploaded_by_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      client_timeline_events: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          actor_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          label: string | null
          metadata: Json | null
          related_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          actor_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type: string
          id?: string
          label?: string | null
          metadata?: Json | null
          related_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          actor_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          label?: string | null
          metadata?: Json | null
          related_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      client_trust_events: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          created_at: string
          created_by: string | null
          delta: number | null
          event_type: string
          id: string
          points: number | null
          reason: string | null
          related_booking_id: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          created_by?: string | null
          delta?: number | null
          event_type: string
          id?: string
          points?: number | null
          reason?: string | null
          related_booking_id?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          created_by?: string | null
          delta?: number | null
          event_type?: string
          id?: string
          points?: number | null
          reason?: string | null
          related_booking_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          business_type: string | null
          created_at: string
          email: string | null
          id: string
          message: string | null
          metadata: Json | null
          name: string | null
          phone: string | null
          status: string | null
          type: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_type?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_type?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pricing_tiers: {
        Row: {
          created_at: string
          daily_price: number | null
          description: string | null
          display_order: number | null
          duration_days: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_days: number | null
          min_days: number | null
          name: string
          name_key: string | null
          tier_key: string | null
          tier_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_price?: number | null
          description?: string | null
          display_order?: number | null
          duration_days?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_days?: number | null
          min_days?: number | null
          name: string
          name_key?: string | null
          tier_key?: string | null
          tier_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_price?: number | null
          description?: string | null
          display_order?: number | null
          duration_days?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_days?: number | null
          min_days?: number | null
          name?: string
          name_key?: string | null
          tier_key?: string | null
          tier_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          address_line: string | null
          avatar_url: string | null
          bio: string | null
          blocked_reason: string | null
          business_address: string | null
          business_city: string | null
          business_description: string | null
          business_email: string | null
          business_logo_url: string | null
          business_name: string | null
          business_phone: string | null
          business_type: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          email_notifications_enabled: boolean
          email_verified: boolean | null
          family_name_on_id: string | null
          first_name_on_id: string | null
          frozen_reason: string | null
          full_name: string | null
          full_name_on_id: string | null
          gender: string | null
          ice: string | null
          id: string
          id_back_image_url: string | null
          id_card_back_url: string | null
          id_card_number: string | null
          id_card_url: string | null
          id_front_image_url: string | null
          is_blocked: boolean | null
          is_frozen: boolean | null
          is_verified: boolean | null
          last_active_at: string | null
          last_login_at: string | null
          license_back_image_url: string | null
          license_back_url: string | null
          license_front_image_url: string | null
          license_url: string | null
          loyalty_points: number | null
          name: string | null
          nationality: string | null
          phone: string | null
          phone_verified: boolean | null
          preferred_language: string | null
          push_notifications_enabled: boolean
          rc: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          selfie_image_url: string | null
          selfie_url: string | null
          selfie_with_id_url: string | null
          submitted_at: string | null
          trust_score: number | null
          trust_tier: string | null
          updated_at: string
          user_id: string
          user_type: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          address?: string | null
          address_line?: string | null
          avatar_url?: string | null
          bio?: string | null
          blocked_reason?: string | null
          business_address?: string | null
          business_city?: string | null
          business_description?: string | null
          business_email?: string | null
          business_logo_url?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          email_notifications_enabled?: boolean
          email_verified?: boolean | null
          family_name_on_id?: string | null
          first_name_on_id?: string | null
          frozen_reason?: string | null
          full_name?: string | null
          full_name_on_id?: string | null
          gender?: string | null
          ice?: string | null
          id?: string
          id_back_image_url?: string | null
          id_card_back_url?: string | null
          id_card_number?: string | null
          id_card_url?: string | null
          id_front_image_url?: string | null
          is_blocked?: boolean | null
          is_frozen?: boolean | null
          is_verified?: boolean | null
          last_active_at?: string | null
          last_login_at?: string | null
          license_back_image_url?: string | null
          license_back_url?: string | null
          license_front_image_url?: string | null
          license_url?: string | null
          loyalty_points?: number | null
          name?: string | null
          nationality?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          preferred_language?: string | null
          push_notifications_enabled?: boolean
          rc?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          selfie_image_url?: string | null
          selfie_url?: string | null
          selfie_with_id_url?: string | null
          submitted_at?: string | null
          trust_score?: number | null
          trust_tier?: string | null
          updated_at?: string
          user_id: string
          user_type?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          address?: string | null
          address_line?: string | null
          avatar_url?: string | null
          bio?: string | null
          blocked_reason?: string | null
          business_address?: string | null
          business_city?: string | null
          business_description?: string | null
          business_email?: string | null
          business_logo_url?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          email_notifications_enabled?: boolean
          email_verified?: boolean | null
          family_name_on_id?: string | null
          first_name_on_id?: string | null
          frozen_reason?: string | null
          full_name?: string | null
          full_name_on_id?: string | null
          gender?: string | null
          ice?: string | null
          id?: string
          id_back_image_url?: string | null
          id_card_back_url?: string | null
          id_card_number?: string | null
          id_card_url?: string | null
          id_front_image_url?: string | null
          is_blocked?: boolean | null
          is_frozen?: boolean | null
          is_verified?: boolean | null
          last_active_at?: string | null
          last_login_at?: string | null
          license_back_image_url?: string | null
          license_back_url?: string | null
          license_front_image_url?: string | null
          license_url?: string | null
          loyalty_points?: number | null
          name?: string | null
          nationality?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          preferred_language?: string | null
          push_notifications_enabled?: boolean
          rc?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          selfie_image_url?: string | null
          selfie_url?: string | null
          selfie_with_id_url?: string | null
          submitted_at?: string | null
          trust_score?: number | null
          trust_tier?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      renter_wallet_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          currency: string
          description: string | null
          id: string
          metadata: Json | null
          method: string | null
          reference: string | null
          related_booking_id: string | null
          related_payment_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          method?: string | null
          reference?: string | null
          related_booking_id?: string | null
          related_payment_id?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          method?: string | null
          reference?: string | null
          related_booking_id?: string | null
          related_payment_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      renter_wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_cities: {
        Row: {
          bikes_count: number | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_coming_soon: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          name_key: string | null
          price_from: number | null
          show_in_homepage: boolean | null
          updated_at: string
        }
        Insert: {
          bikes_count?: number | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_coming_soon?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          name_key?: string | null
          price_from?: number | null
          show_in_homepage?: boolean | null
          updated_at?: string
        }
        Update: {
          bikes_count?: number | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_coming_soon?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          name_key?: string | null
          price_from?: number | null
          show_in_homepage?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      service_locations: {
        Row: {
          city_id: string | null
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          city_id?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          city_id?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_locations_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "city_bike_counts"
            referencedColumns: ["city_id"]
          },
          {
            foreignKeyName: "service_locations_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "service_cities"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_locations: {
        Row: {
          address: string
          created_at: string
          id: string
          is_default: boolean | null
          label: string
          latitude: number | null
          longitude: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          label: string
          latitude?: number | null
          longitude?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notes: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          is_pinned: boolean | null
          note: string
          note_description: string | null
          note_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          note: string
          note_description?: string | null
          note_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          note?: string
          note_description?: string | null
          note_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          max_attempts: number
          purpose: string
          used_at: string | null
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          max_attempts?: number
          purpose: string
          used_at?: string | null
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          max_attempts?: number
          purpose?: string
          used_at?: string | null
        }
        Relationships: []
      }
      youcanpay_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          id: string
          paid_at: string | null
          purpose: string
          raw_response: Json | null
          related_booking_id: string | null
          related_subscription_id: string | null
          related_wallet_user_id: string | null
          status: string
          token_id: string | null
          transaction_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          paid_at?: string | null
          purpose: string
          raw_response?: Json | null
          related_booking_id?: string | null
          related_subscription_id?: string | null
          related_wallet_user_id?: string | null
          status?: string
          token_id?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          paid_at?: string | null
          purpose?: string
          raw_response?: Json | null
          related_booking_id?: string | null
          related_subscription_id?: string | null
          related_wallet_user_id?: string | null
          status?: string
          token_id?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      bikes_public: {
        Row: {
          agency_id: string | null
          available: boolean | null
          bike_type_id: string | null
          condition: string | null
          created_at: string | null
          id: string | null
          location: string | null
          owner_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bikes_bike_type_id_fkey"
            columns: ["bike_type_id"]
            isOneToOne: false
            referencedRelation: "bike_types"
            referencedColumns: ["id"]
          },
        ]
      }
      city_bike_counts: {
        Row: {
          bikes_available: number | null
          city_id: string | null
          name: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          business_city: string | null
          business_description: string | null
          business_logo_url: string | null
          business_name: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          is_verified: boolean | null
          name: string | null
          trust_tier: string | null
          user_id: string | null
          user_type: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_city?: string | null
          business_description?: string | null
          business_logo_url?: string | null
          business_name?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          name?: string | null
          trust_tier?: string | null
          user_id?: string | null
          user_type?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_city?: string | null
          business_description?: string | null
          business_logo_url?: string | null
          business_name?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          name?: string | null
          trust_tier?: string | null
          user_id?: string | null
          user_type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_agency_role_to_self: {
        Args: {
          _business_name: string
          _business_type: string
          _city: string
          _neighborhood?: string
          _phone?: string
        }
        Returns: Json
      }
      admin_role_sync_status: {
        Args: never
        Returns: {
          missing_role: string
          user_id: string
        }[]
      }
      confirm_booking: { Args: { _booking_id: string }; Returns: Json }
      create_bike_hold: {
        Args: { _bike_id: string; _pickup: string; _return: string }
        Returns: {
          expires_at: string
          hold_id: string
        }[]
      }
      credit_renter_wallet: {
        Args: {
          _amount: number
          _description?: string
          _method?: string
          _payment_id?: string
          _reference?: string
          _user_id: string
        }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enforce_subscription_lifecycle: {
        Args: never
        Returns: {
          reminders_due: number
          transitioned_to_locked: number
          transitioned_to_past_due: number
        }[]
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          _action: string
          _details?: Json
          _record_id?: string
          _table_name?: string
        }
        Returns: string
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      promote_hold_to_booking: {
        Args: {
          _customer_email: string
          _customer_name: string
          _customer_phone: string
          _delivery_method?: string
          _hold_id: string
          _pickup_location?: string
        }
        Returns: string
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      request_plan_downgrade: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "renter" | "agency" | "admin"
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
      app_role: ["renter", "agency", "admin"],
    },
  },
} as const
