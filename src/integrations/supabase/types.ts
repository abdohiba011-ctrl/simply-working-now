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
      agency_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          last_payment_id: string | null
          plan: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_payment_id?: string | null
          plan?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_payment_id?: string | null
          plan?: string
          status?: string
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
          city_id: string | null
          created_at: string
          daily_price: number | null
          description: string | null
          engine_cc: number | null
          features: string[] | null
          fuel_capacity: string | null
          fuel_type: string | null
          id: string
          is_approved: boolean | null
          is_original: boolean | null
          main_image_url: string | null
          name: string
          owner_id: string | null
          rating: number | null
          review_count: number | null
          seat_height: string | null
          top_speed: string | null
          transmission: string | null
          updated_at: string
          weight: string | null
        }
        Insert: {
          approval_status?: string | null
          availability_status?: string | null
          business_status?: string | null
          city_id?: string | null
          created_at?: string
          daily_price?: number | null
          description?: string | null
          engine_cc?: number | null
          features?: string[] | null
          fuel_capacity?: string | null
          fuel_type?: string | null
          id?: string
          is_approved?: boolean | null
          is_original?: boolean | null
          main_image_url?: string | null
          name: string
          owner_id?: string | null
          rating?: number | null
          review_count?: number | null
          seat_height?: string | null
          top_speed?: string | null
          transmission?: string | null
          updated_at?: string
          weight?: string | null
        }
        Update: {
          approval_status?: string | null
          availability_status?: string | null
          business_status?: string | null
          city_id?: string | null
          created_at?: string
          daily_price?: number | null
          description?: string | null
          engine_cc?: number | null
          features?: string[] | null
          fuel_capacity?: string | null
          fuel_type?: string | null
          id?: string
          is_approved?: boolean | null
          is_original?: boolean | null
          main_image_url?: string | null
          name?: string
          owner_id?: string | null
          rating?: number | null
          review_count?: number | null
          seat_height?: string | null
          top_speed?: string | null
          transmission?: string | null
          updated_at?: string
          weight?: string | null
        }
        Relationships: [
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
          {
            foreignKeyName: "booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "business_bookings_view"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "booking_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "business_bookings_view"
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
          {
            foreignKeyName: "booking_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "business_bookings_view"
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
          avatar_url: string | null
          business_address: string | null
          business_email: string | null
          business_logo_url: string | null
          business_name: string | null
          business_phone: string | null
          business_registration: string | null
          business_type: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          family_name_on_id: string | null
          first_name_on_id: string | null
          frozen_reason: string | null
          full_name_on_id: string | null
          id: string
          id_back_image_url: string | null
          id_card_number: string | null
          id_front_image_url: string | null
          is_frozen: boolean | null
          is_verified: boolean | null
          last_active_at: string | null
          name: string | null
          nationality: string | null
          phone: string | null
          phone_verified: boolean | null
          rejection_reason: string | null
          selfie_with_id_url: string | null
          subscription_plan: string | null
          trust_score: number | null
          updated_at: string
          user_type: string | null
          verification_status: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          business_address?: string | null
          business_email?: string | null
          business_logo_url?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_registration?: string | null
          business_type?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          family_name_on_id?: string | null
          first_name_on_id?: string | null
          frozen_reason?: string | null
          full_name_on_id?: string | null
          id: string
          id_back_image_url?: string | null
          id_card_number?: string | null
          id_front_image_url?: string | null
          is_frozen?: boolean | null
          is_verified?: boolean | null
          last_active_at?: string | null
          name?: string | null
          nationality?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          rejection_reason?: string | null
          selfie_with_id_url?: string | null
          subscription_plan?: string | null
          trust_score?: number | null
          updated_at?: string
          user_type?: string | null
          verification_status?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          business_address?: string | null
          business_email?: string | null
          business_logo_url?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_registration?: string | null
          business_type?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          family_name_on_id?: string | null
          first_name_on_id?: string | null
          frozen_reason?: string | null
          full_name_on_id?: string | null
          id?: string
          id_back_image_url?: string | null
          id_card_number?: string | null
          id_front_image_url?: string | null
          is_frozen?: boolean | null
          is_verified?: boolean | null
          last_active_at?: string | null
          name?: string | null
          nationality?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          rejection_reason?: string | null
          selfie_with_id_url?: string | null
          subscription_plan?: string | null
          trust_score?: number | null
          updated_at?: string
          user_type?: string | null
          verification_status?: string | null
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
            referencedRelation: "service_cities"
            referencedColumns: ["id"]
          },
        ]
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
      business_bookings_view: {
        Row: {
          admin_status: string | null
          amount_paid: number | null
          assigned_at: string | null
          assigned_to_business: string | null
          bike_id: string | null
          booking_status: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          contract_status: string | null
          contract_url: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_fee: number | null
          delivery_location: string | null
          delivery_method: string | null
          helmet_included: boolean | null
          id: string | null
          insurance_included: boolean | null
          payment_method: string | null
          payment_status: string | null
          pickup_date: string | null
          pickup_location: string | null
          pickup_time: string | null
          return_date: string | null
          return_location: string | null
          return_time: string | null
          signed_contract_url: string | null
          source: string | null
          special_requests: string | null
          total_days: number | null
          total_price: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_status?: string | null
          amount_paid?: number | null
          assigned_at?: string | null
          assigned_to_business?: string | null
          bike_id?: string | null
          booking_status?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          contract_status?: string | null
          contract_url?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number | null
          delivery_location?: string | null
          delivery_method?: string | null
          helmet_included?: boolean | null
          id?: string | null
          insurance_included?: boolean | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_date?: string | null
          pickup_location?: string | null
          pickup_time?: string | null
          return_date?: string | null
          return_location?: string | null
          return_time?: string | null
          signed_contract_url?: string | null
          source?: string | null
          special_requests?: string | null
          total_days?: number | null
          total_price?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_status?: string | null
          amount_paid?: number | null
          assigned_at?: string | null
          assigned_to_business?: string | null
          bike_id?: string | null
          booking_status?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          contract_status?: string | null
          contract_url?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number | null
          delivery_location?: string | null
          delivery_method?: string | null
          helmet_included?: boolean | null
          id?: string | null
          insurance_included?: boolean | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_date?: string | null
          pickup_location?: string | null
          pickup_time?: string | null
          return_date?: string | null
          return_location?: string | null
          return_time?: string | null
          signed_contract_url?: string | null
          source?: string | null
          special_requests?: string | null
          total_days?: number | null
          total_price?: number | null
          updated_at?: string | null
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
    }
    Enums: {
      app_role: "admin" | "business" | "user"
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
      app_role: ["admin", "business", "user"],
    },
  },
} as const
