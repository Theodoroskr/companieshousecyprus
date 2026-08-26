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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      change_feed_runs: {
        Row: {
          changed_count: number
          chunks_refreshed: number | null
          enqueued_count: number
          finished_at: string | null
          id: string
          indexnow_status: string | null
          indexnow_submitted: number
          message: string | null
          started_at: string
          status: string
          window_end: string
          window_start: string
        }
        Insert: {
          changed_count?: number
          chunks_refreshed?: number | null
          enqueued_count?: number
          finished_at?: string | null
          id?: string
          indexnow_status?: string | null
          indexnow_submitted?: number
          message?: string | null
          started_at?: string
          status?: string
          window_end: string
          window_start: string
        }
        Update: {
          changed_count?: number
          chunks_refreshed?: number | null
          enqueued_count?: number
          finished_at?: string | null
          id?: string
          indexnow_status?: string | null
          indexnow_submitted?: number
          message?: string | null
          started_at?: string
          status?: string
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          a4a_code: string | null
          address_full: string | null
          building: string | null
          district_el: string | null
          district_en: string | null
          is_foreign_address: boolean | null
          locality: string | null
          name: string
          official_no: string | null
          officials_count: number | null
          postcode: string | null
          reg_number: number
          registration_date: string | null
          report_years: number[] | null
          slug: string
          status_date: string | null
          status_el: string | null
          status_en: string | null
          status_group: string
          street: string | null
          subtype_el: string | null
          subtype_en: string | null
          type_code: string
          type_el: string | null
          type_en: string | null
          updated_at: string | null
        }
        Insert: {
          a4a_code?: string | null
          address_full?: string | null
          building?: string | null
          district_el?: string | null
          district_en?: string | null
          is_foreign_address?: boolean | null
          locality?: string | null
          name: string
          official_no?: string | null
          officials_count?: number | null
          postcode?: string | null
          reg_number: number
          registration_date?: string | null
          report_years?: number[] | null
          slug: string
          status_date?: string | null
          status_el?: string | null
          status_en?: string | null
          status_group: string
          street?: string | null
          subtype_el?: string | null
          subtype_en?: string | null
          type_code: string
          type_el?: string | null
          type_en?: string | null
          updated_at?: string | null
        }
        Update: {
          a4a_code?: string | null
          address_full?: string | null
          building?: string | null
          district_el?: string | null
          district_en?: string | null
          is_foreign_address?: boolean | null
          locality?: string | null
          name?: string
          official_no?: string | null
          officials_count?: number | null
          postcode?: string | null
          reg_number?: number
          registration_date?: string | null
          report_years?: number[] | null
          slug?: string
          status_date?: string | null
          status_el?: string | null
          status_en?: string | null
          status_group?: string
          street?: string | null
          subtype_el?: string | null
          subtype_en?: string | null
          type_code?: string
          type_el?: string | null
          type_en?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      guide_editorial: {
        Row: {
          date_published: string
          guide_slug: string
          guide_version: string
          last_reviewed: string
          legal_disclaimer: string
          official_source_links: Json
          reviewer_name: string
          reviewer_role: string
          tax_disclaimer: string
          updated_at: string
        }
        Insert: {
          date_published: string
          guide_slug: string
          guide_version: string
          last_reviewed: string
          legal_disclaimer: string
          official_source_links?: Json
          reviewer_name: string
          reviewer_role: string
          tax_disclaimer: string
          updated_at?: string
        }
        Update: {
          date_published?: string
          guide_slug?: string
          guide_version?: string
          last_reviewed?: string
          legal_disclaimer?: string
          official_source_links?: Json
          reviewer_name?: string
          reviewer_role?: string
          tax_disclaimer?: string
          updated_at?: string
        }
        Relationships: []
      }
      guide_fees: {
        Row: {
          amount: string
          guide_slug: string
          id: string
          label: string
          last_verified: string | null
          needs_verification: boolean
          note: string | null
          sort_order: number
          source_url: string | null
          updated_at: string
        }
        Insert: {
          amount: string
          guide_slug: string
          id?: string
          label: string
          last_verified?: string | null
          needs_verification?: boolean
          note?: string | null
          sort_order?: number
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: string
          guide_slug?: string
          id?: string
          label?: string
          last_verified?: string | null
          needs_verification?: boolean
          note?: string | null
          sort_order?: number
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      guide_leads: {
        Row: {
          assigned_partner: string | null
          business_activity: string
          consent_at: string
          consent_text_version: string
          corporate_shareholder: boolean | null
          countries_of_operation: string | null
          country: string
          created_at: string
          email: string
          form_source: string
          full_name: string
          id: string
          landing_page: string | null
          lead_status: string
          lead_type: string
          nationality: string | null
          notes: string | null
          referral_url: string | null
          services_requested: string[]
          shareholder_count: string | null
          telephone: string | null
          timeframe: string
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          assigned_partner?: string | null
          business_activity: string
          consent_at?: string
          consent_text_version: string
          corporate_shareholder?: boolean | null
          countries_of_operation?: string | null
          country: string
          created_at?: string
          email: string
          form_source: string
          full_name: string
          id?: string
          landing_page?: string | null
          lead_status?: string
          lead_type: string
          nationality?: string | null
          notes?: string | null
          referral_url?: string | null
          services_requested?: string[]
          shareholder_count?: string | null
          telephone?: string | null
          timeframe: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          assigned_partner?: string | null
          business_activity?: string
          consent_at?: string
          consent_text_version?: string
          corporate_shareholder?: boolean | null
          countries_of_operation?: string | null
          country?: string
          created_at?: string
          email?: string
          form_source?: string
          full_name?: string
          id?: string
          landing_page?: string | null
          lead_status?: string
          lead_type?: string
          nationality?: string | null
          notes?: string | null
          referral_url?: string | null
          services_requested?: string[]
          shareholder_count?: string | null
          telephone?: string | null
          timeframe?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      import_runs: {
        Row: {
          bytes_processed: number | null
          created_at: string
          created_by: string | null
          file_size: number | null
          filename: string | null
          finished_at: string | null
          id: string
          kind: string
          message: string | null
          mode: string
          rows_failed: number
          rows_processed: number
          stage: string | null
          status: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          bytes_processed?: number | null
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          filename?: string | null
          finished_at?: string | null
          id?: string
          kind: string
          message?: string | null
          mode?: string
          rows_failed?: number
          rows_processed?: number
          stage?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          bytes_processed?: number | null
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          filename?: string | null
          finished_at?: string | null
          id?: string
          kind?: string
          message?: string | null
          mode?: string
          rows_failed?: number
          rows_processed?: number
          stage?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      indexnow_queue: {
        Row: {
          attempts: number
          last_error: string | null
          path: string | null
          queued_at: string
          slug: string
          submitted_at: string | null
        }
        Insert: {
          attempts?: number
          last_error?: string | null
          path?: string | null
          queued_at?: string
          slug: string
          submitted_at?: string | null
        }
        Update: {
          attempts?: number
          last_error?: string | null
          path?: string | null
          queued_at?: string
          slug?: string
          submitted_at?: string | null
        }
        Relationships: []
      }
      indexnow_state: {
        Row: {
          consecutive_rate_limits: number
          id: boolean
          last_error: string | null
          last_run_at: string | null
          last_submitted_count: number
          lease_until: string | null
          paused_at: string | null
          paused_reason: string | null
        }
        Insert: {
          consecutive_rate_limits?: number
          id?: boolean
          last_error?: string | null
          last_run_at?: string | null
          last_submitted_count?: number
          lease_until?: string | null
          paused_at?: string | null
          paused_reason?: string | null
        }
        Update: {
          consecutive_rate_limits?: number
          id?: boolean
          last_error?: string | null
          last_run_at?: string | null
          last_submitted_count?: number
          lease_until?: string | null
          paused_at?: string | null
          paused_reason?: string | null
        }
        Relationships: []
      }
      job_state: {
        Row: {
          key: string
          last_error: string | null
          last_run_at: string | null
          locked_until: string | null
          paused: boolean
          secret: string | null
          updated_at: string
        }
        Insert: {
          key: string
          last_error?: string | null
          last_run_at?: string | null
          locked_until?: string | null
          paused?: boolean
          secret?: string | null
          updated_at?: string
        }
        Update: {
          key?: string
          last_error?: string | null
          last_run_at?: string | null
          locked_until?: string | null
          paused?: boolean
          secret?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      officials: {
        Row: {
          id: number
          person_name: string
          position_el: string | null
          position_en: string | null
          slug: string
        }
        Insert: {
          id?: number
          person_name: string
          position_el?: string | null
          position_en?: string | null
          slug: string
        }
        Update: {
          id?: number
          person_name?: string
          position_el?: string | null
          position_en?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "officials_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["slug"]
          },
        ]
      }
      order_documents: {
        Row: {
          content_type: string | null
          created_at: string
          id: string
          name: string
          order_id: string
          order_item_id: string
          path: string
          size_bytes: number
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          id?: string
          name: string
          order_id: string
          order_item_id: string
          path: string
          size_bytes?: number
        }
        Update: {
          content_type?: string | null
          created_at?: string
          id?: string
          name?: string
          order_id?: string
          order_item_id?: string
          path?: string
          size_bytes?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_documents_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          a4a_attempts: number
          a4a_code: string | null
          a4a_kind: string | null
          a4a_next_attempt_at: string | null
          a4a_reference: string | null
          company_name: string | null
          company_number: string | null
          company_slug: string | null
          created_at: string
          delivered_at: string | null
          document_name: string | null
          document_path: string | null
          document_price_cents: number
          document_size: number | null
          due_date: string | null
          fulfilment_message: string | null
          fulfilment_status: string
          id: string
          order_id: string
          product_name: string
          product_slug: string
          quantity: number
          report_json: Json | null
          screening_request_id: string | null
          service_fee_cents: number
          total_cents: number
          vat_cents: number
        }
        Insert: {
          a4a_attempts?: number
          a4a_code?: string | null
          a4a_kind?: string | null
          a4a_next_attempt_at?: string | null
          a4a_reference?: string | null
          company_name?: string | null
          company_number?: string | null
          company_slug?: string | null
          created_at?: string
          delivered_at?: string | null
          document_name?: string | null
          document_path?: string | null
          document_price_cents?: number
          document_size?: number | null
          due_date?: string | null
          fulfilment_message?: string | null
          fulfilment_status?: string
          id?: string
          order_id: string
          product_name: string
          product_slug: string
          quantity?: number
          report_json?: Json | null
          screening_request_id?: string | null
          service_fee_cents?: number
          total_cents?: number
          vat_cents?: number
        }
        Update: {
          a4a_attempts?: number
          a4a_code?: string | null
          a4a_kind?: string | null
          a4a_next_attempt_at?: string | null
          a4a_reference?: string | null
          company_name?: string | null
          company_number?: string | null
          company_slug?: string | null
          created_at?: string
          delivered_at?: string | null
          document_name?: string | null
          document_path?: string | null
          document_price_cents?: number
          document_size?: number | null
          due_date?: string | null
          fulfilment_message?: string | null
          fulfilment_status?: string
          id?: string
          order_id?: string
          product_name?: string
          product_slug?: string
          quantity?: number
          report_json?: Json | null
          screening_request_id?: string | null
          service_fee_cents?: number
          total_cents?: number
          vat_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_screening_request_id_fkey"
            columns: ["screening_request_id"]
            isOneToOne: false
            referencedRelation: "screening_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          access_token: string
          checkout_url: string | null
          created_at: string
          delivered_at: string | null
          due_date: string | null
          email: string
          firm: string | null
          full_name: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_order_id: string | null
          payment_provider: string | null
          payment_state: string | null
          phone: string | null
          reference: string
          reminder_sent_at: string | null
          service_fee_cents: number
          status: string
          subtotal_cents: number
          total_cents: number
          updated_at: string
          user_id: string | null
          vat_cents: number
          vat_number: string | null
        }
        Insert: {
          access_token: string
          checkout_url?: string | null
          created_at?: string
          delivered_at?: string | null
          due_date?: string | null
          email: string
          firm?: string | null
          full_name: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_order_id?: string | null
          payment_provider?: string | null
          payment_state?: string | null
          phone?: string | null
          reference: string
          reminder_sent_at?: string | null
          service_fee_cents?: number
          status?: string
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          user_id?: string | null
          vat_cents?: number
          vat_number?: string | null
        }
        Update: {
          access_token?: string
          checkout_url?: string | null
          created_at?: string
          delivered_at?: string | null
          due_date?: string | null
          email?: string
          firm?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_order_id?: string | null
          payment_provider?: string | null
          payment_state?: string | null
          phone?: string | null
          reference?: string
          reminder_sent_at?: string | null
          service_fee_cents?: number
          status?: string
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          user_id?: string | null
          vat_cents?: number
          vat_number?: string | null
        }
        Relationships: []
      }
      sanctions_addresses: {
        Row: {
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string
          full_address: string
          id: string
          postcode: string | null
          region: string | null
          sanctions_entry_id: string
          street: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          full_address: string
          id?: string
          postcode?: string | null
          region?: string | null
          sanctions_entry_id: string
          street?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          full_address?: string
          id?: string
          postcode?: string | null
          region?: string | null
          sanctions_entry_id?: string
          street?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sanctions_addresses_sanctions_entry_id_fkey"
            columns: ["sanctions_entry_id"]
            isOneToOne: false
            referencedRelation: "sanctions_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      sanctions_aliases: {
        Row: {
          alias_name: string
          alias_name_normalized: string
          alias_type: string
          created_at: string
          id: string
          is_primary: boolean
          name_language: string | null
          sanctions_entry_id: string
        }
        Insert: {
          alias_name: string
          alias_name_normalized: string
          alias_type?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          name_language?: string | null
          sanctions_entry_id: string
        }
        Update: {
          alias_name?: string
          alias_name_normalized?: string
          alias_type?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          name_language?: string | null
          sanctions_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sanctions_aliases_sanctions_entry_id_fkey"
            columns: ["sanctions_entry_id"]
            isOneToOne: false
            referencedRelation: "sanctions_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      sanctions_entries: {
        Row: {
          active_from: string
          active_to: string | null
          created_at: string
          designation_date: string | null
          entity_type: string
          first_seen_import_id: string | null
          id: string
          is_active: boolean
          last_amended_date: string | null
          last_seen_import_id: string | null
          legal_basis: string | null
          listing_reason: string | null
          name_original_script: string | null
          primary_name: string
          primary_name_normalized: string
          raw_record: Json
          record_hash: string | null
          sanctions_programme: string | null
          source_id: string
          source_record_id: string
          updated_at: string
        }
        Insert: {
          active_from?: string
          active_to?: string | null
          created_at?: string
          designation_date?: string | null
          entity_type?: string
          first_seen_import_id?: string | null
          id?: string
          is_active?: boolean
          last_amended_date?: string | null
          last_seen_import_id?: string | null
          legal_basis?: string | null
          listing_reason?: string | null
          name_original_script?: string | null
          primary_name: string
          primary_name_normalized: string
          raw_record?: Json
          record_hash?: string | null
          sanctions_programme?: string | null
          source_id: string
          source_record_id: string
          updated_at?: string
        }
        Update: {
          active_from?: string
          active_to?: string | null
          created_at?: string
          designation_date?: string | null
          entity_type?: string
          first_seen_import_id?: string | null
          id?: string
          is_active?: boolean
          last_amended_date?: string | null
          last_seen_import_id?: string | null
          legal_basis?: string | null
          listing_reason?: string | null
          name_original_script?: string | null
          primary_name?: string
          primary_name_normalized?: string
          raw_record?: Json
          record_hash?: string | null
          sanctions_programme?: string | null
          source_id?: string
          source_record_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sanctions_entries_first_seen_import_id_fkey"
            columns: ["first_seen_import_id"]
            isOneToOne: false
            referencedRelation: "sanctions_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_entries_last_seen_import_id_fkey"
            columns: ["last_seen_import_id"]
            isOneToOne: false
            referencedRelation: "sanctions_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_entries_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sanctions_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sanctions_identifiers: {
        Row: {
          created_at: string
          expiry_date: string | null
          id: string
          identifier_type: string
          identifier_value: string
          issue_date: string | null
          issuing_country: string | null
          sanctions_entry_id: string
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          identifier_type: string
          identifier_value: string
          issue_date?: string | null
          issuing_country?: string | null
          sanctions_entry_id: string
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          identifier_type?: string
          identifier_value?: string
          issue_date?: string | null
          issuing_country?: string | null
          sanctions_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sanctions_identifiers_sanctions_entry_id_fkey"
            columns: ["sanctions_entry_id"]
            isOneToOne: false
            referencedRelation: "sanctions_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      sanctions_import_changes: {
        Row: {
          change_type: string
          detected_at: string
          id: string
          import_id: string
          new_record: Json | null
          previous_record: Json | null
          source_record_id: string
        }
        Insert: {
          change_type: string
          detected_at?: string
          id?: string
          import_id: string
          new_record?: Json | null
          previous_record?: Json | null
          source_record_id: string
        }
        Update: {
          change_type?: string
          detected_at?: string
          id?: string
          import_id?: string
          new_record?: Json | null
          previous_record?: Json | null
          source_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sanctions_import_changes_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "sanctions_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      sanctions_imports: {
        Row: {
          added_count: number
          completed_at: string | null
          created_at: string
          diagnostic_details: Json | null
          digest_mismatch: boolean
          error_message: string | null
          file_hash_sha256: string | null
          file_name: string | null
          file_size_bytes: number | null
          id: string
          modified_count: number
          official_digest_header: string | null
          official_digest_sha256: string | null
          record_count: number | null
          removed_count: number
          retrieved_at: string | null
          source_id: string
          source_last_modified: string | null
          started_at: string
          status: string
          storage_path: string | null
        }
        Insert: {
          added_count?: number
          completed_at?: string | null
          created_at?: string
          diagnostic_details?: Json | null
          digest_mismatch?: boolean
          error_message?: string | null
          file_hash_sha256?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          modified_count?: number
          official_digest_header?: string | null
          official_digest_sha256?: string | null
          record_count?: number | null
          removed_count?: number
          retrieved_at?: string | null
          source_id: string
          source_last_modified?: string | null
          started_at?: string
          status?: string
          storage_path?: string | null
        }
        Update: {
          added_count?: number
          completed_at?: string | null
          created_at?: string
          diagnostic_details?: Json | null
          digest_mismatch?: boolean
          error_message?: string | null
          file_hash_sha256?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          modified_count?: number
          official_digest_header?: string | null
          official_digest_sha256?: string | null
          record_count?: number | null
          removed_count?: number
          retrieved_at?: string | null
          source_id?: string
          source_last_modified?: string | null
          started_at?: string
          status?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sanctions_imports_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sanctions_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sanctions_person_details: {
        Row: {
          citizenships: Json
          date_of_birth: Json
          gender: string | null
          nationalities: Json
          place_of_birth: Json
          sanctions_entry_id: string
          titles: Json
        }
        Insert: {
          citizenships?: Json
          date_of_birth?: Json
          gender?: string | null
          nationalities?: Json
          place_of_birth?: Json
          sanctions_entry_id: string
          titles?: Json
        }
        Update: {
          citizenships?: Json
          date_of_birth?: Json
          gender?: string | null
          nationalities?: Json
          place_of_birth?: Json
          sanctions_entry_id?: string
          titles?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sanctions_person_details_sanctions_entry_id_fkey"
            columns: ["sanctions_entry_id"]
            isOneToOne: true
            referencedRelation: "sanctions_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      sanctions_relationships: {
        Row: {
          created_at: string
          id: string
          related_name: string
          related_source_record_id: string | null
          relationship_type: string
          sanctions_entry_id: string
          source_description: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          related_name: string
          related_source_record_id?: string | null
          relationship_type?: string
          sanctions_entry_id: string
          source_description?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          related_name?: string
          related_source_record_id?: string | null
          relationship_type?: string
          sanctions_entry_id?: string
          source_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sanctions_relationships_sanctions_entry_id_fkey"
            columns: ["sanctions_entry_id"]
            isOneToOne: false
            referencedRelation: "sanctions_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      sanctions_sources: {
        Row: {
          authority: string
          created_at: string
          expected_content_type: string
          format_name: string
          format_version: string
          id: string
          import_locked_at: string | null
          information_url: string | null
          is_active: boolean
          jurisdiction: string
          last_connection_test_at: string | null
          last_connection_test_ok: boolean | null
          source_code: string
          source_name: string
          source_url: string
          update_frequency: string
          updated_at: string
        }
        Insert: {
          authority: string
          created_at?: string
          expected_content_type?: string
          format_name: string
          format_version: string
          id?: string
          import_locked_at?: string | null
          information_url?: string | null
          is_active?: boolean
          jurisdiction: string
          last_connection_test_at?: string | null
          last_connection_test_ok?: boolean | null
          source_code: string
          source_name: string
          source_url: string
          update_frequency?: string
          updated_at?: string
        }
        Update: {
          authority?: string
          created_at?: string
          expected_content_type?: string
          format_name?: string
          format_version?: string
          id?: string
          import_locked_at?: string | null
          information_url?: string | null
          is_active?: boolean
          jurisdiction?: string
          last_connection_test_at?: string | null
          last_connection_test_ok?: boolean | null
          source_code?: string
          source_name?: string
          source_url?: string
          update_frequency?: string
          updated_at?: string
        }
        Relationships: []
      }
      sanctions_staging: {
        Row: {
          created_at: string
          id: number
          import_id: string
          payload: Json
          record_hash: string
          source_record_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          import_id: string
          payload: Json
          record_hash: string
          source_record_id: string
        }
        Update: {
          created_at?: string
          id?: number
          import_id?: string
          payload?: Json
          record_hash?: string
          source_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sanctions_staging_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "sanctions_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      sanctions_subject_records: {
        Row: {
          confidence_score: number | null
          correlation_evidence: Json
          correlation_method: string | null
          created_at: string
          id: string
          relationship_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          sanctions_entry_id: string
          sanctions_subject_id: string
        }
        Insert: {
          confidence_score?: number | null
          correlation_evidence?: Json
          correlation_method?: string | null
          created_at?: string
          id?: string
          relationship_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sanctions_entry_id: string
          sanctions_subject_id: string
        }
        Update: {
          confidence_score?: number | null
          correlation_evidence?: Json
          correlation_method?: string | null
          created_at?: string
          id?: string
          relationship_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sanctions_entry_id?: string
          sanctions_subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sanctions_subject_records_sanctions_entry_id_fkey"
            columns: ["sanctions_entry_id"]
            isOneToOne: false
            referencedRelation: "sanctions_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_subject_records_sanctions_subject_id_fkey"
            columns: ["sanctions_subject_id"]
            isOneToOne: false
            referencedRelation: "sanctions_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      sanctions_subjects: {
        Row: {
          canonical_name: string
          canonical_name_normalized: string
          created_at: string
          id: string
          review_status: string
          subject_type: string
          updated_at: string
        }
        Insert: {
          canonical_name: string
          canonical_name_normalized: string
          created_at?: string
          id?: string
          review_status?: string
          subject_type: string
          updated_at?: string
        }
        Update: {
          canonical_name?: string
          canonical_name_normalized?: string
          created_at?: string
          id?: string
          review_status?: string
          subject_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      screening_audit_log: {
        Row: {
          actor: string | null
          created_at: string
          event_data: Json
          event_type: string
          id: number
          screening_candidate_id: string | null
          screening_request_id: string | null
        }
        Insert: {
          actor?: string | null
          created_at?: string
          event_data?: Json
          event_type: string
          id?: never
          screening_candidate_id?: string | null
          screening_request_id?: string | null
        }
        Update: {
          actor?: string | null
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: never
          screening_candidate_id?: string | null
          screening_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screening_audit_log_screening_request_id_fkey"
            columns: ["screening_request_id"]
            isOneToOne: false
            referencedRelation: "screening_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_candidates: {
        Row: {
          address_match: boolean | null
          conflicting_attributes: Json
          corroborating_attributes: Json
          created_at: string
          date_of_birth_match: boolean | null
          entity_type_match: boolean | null
          id: string
          identifier_match: boolean
          jurisdiction_match: boolean | null
          match_level: number | null
          match_score: number
          matched_alias_type: string | null
          matched_name: string
          name_similarity: number | null
          name_used: string
          nationality_match: boolean | null
          sanctions_entry_id: string
          score_contributions: Json
          screening_request_id: string
          source_code: string
          system_classification: string
        }
        Insert: {
          address_match?: boolean | null
          conflicting_attributes?: Json
          corroborating_attributes?: Json
          created_at?: string
          date_of_birth_match?: boolean | null
          entity_type_match?: boolean | null
          id?: string
          identifier_match?: boolean
          jurisdiction_match?: boolean | null
          match_level?: number | null
          match_score?: number
          matched_alias_type?: string | null
          matched_name: string
          name_similarity?: number | null
          name_used: string
          nationality_match?: boolean | null
          sanctions_entry_id: string
          score_contributions?: Json
          screening_request_id: string
          source_code: string
          system_classification: string
        }
        Update: {
          address_match?: boolean | null
          conflicting_attributes?: Json
          corroborating_attributes?: Json
          created_at?: string
          date_of_birth_match?: boolean | null
          entity_type_match?: boolean | null
          id?: string
          identifier_match?: boolean
          jurisdiction_match?: boolean | null
          match_level?: number | null
          match_score?: number
          matched_alias_type?: string | null
          matched_name?: string
          name_similarity?: number | null
          name_used?: string
          nationality_match?: boolean | null
          sanctions_entry_id?: string
          score_contributions?: Json
          screening_request_id?: string
          source_code?: string
          system_classification?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_candidates_sanctions_entry_id_fkey"
            columns: ["sanctions_entry_id"]
            isOneToOne: false
            referencedRelation: "sanctions_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_candidates_screening_request_id_fkey"
            columns: ["screening_request_id"]
            isOneToOne: false
            referencedRelation: "screening_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_decisions: {
        Row: {
          created_at: string
          decision: string
          decision_source: string
          id: string
          rationale: string
          reviewed_at: string | null
          reviewed_by: string | null
          screening_candidate_id: string
        }
        Insert: {
          created_at?: string
          decision: string
          decision_source: string
          id?: string
          rationale: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screening_candidate_id: string
        }
        Update: {
          created_at?: string
          decision?: string
          decision_source?: string
          id?: string
          rationale?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screening_candidate_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_decisions_screening_candidate_id_fkey"
            columns: ["screening_candidate_id"]
            isOneToOne: false
            referencedRelation: "screening_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_requests: {
        Row: {
          address: string | null
          company_id: string | null
          completed_at: string | null
          date_of_birth: string | null
          entity_only: boolean
          error_message: string | null
          excluded_categories: Json
          id: string
          jurisdiction: string | null
          lei: string | null
          nationality: string | null
          normalized_name: string
          not_screened: Json
          outcome: string | null
          parent_request_id: string | null
          previous_names: Json
          registration_number: string | null
          requested_at: string
          requested_by: string | null
          rules_version: string
          scope_version: string
          screening_reference: string
          source_context: string
          source_file_hashes: Json
          source_import_ids: Json
          sources_requested: Json
          status: string
          subject_aliases: Json
          subject_name: string
          subject_role: string
          subject_type: string
        }
        Insert: {
          address?: string | null
          company_id?: string | null
          completed_at?: string | null
          date_of_birth?: string | null
          entity_only?: boolean
          error_message?: string | null
          excluded_categories?: Json
          id?: string
          jurisdiction?: string | null
          lei?: string | null
          nationality?: string | null
          normalized_name: string
          not_screened?: Json
          outcome?: string | null
          parent_request_id?: string | null
          previous_names?: Json
          registration_number?: string | null
          requested_at?: string
          requested_by?: string | null
          rules_version: string
          scope_version?: string
          screening_reference: string
          source_context?: string
          source_file_hashes?: Json
          source_import_ids?: Json
          sources_requested?: Json
          status?: string
          subject_aliases?: Json
          subject_name: string
          subject_role?: string
          subject_type: string
        }
        Update: {
          address?: string | null
          company_id?: string | null
          completed_at?: string | null
          date_of_birth?: string | null
          entity_only?: boolean
          error_message?: string | null
          excluded_categories?: Json
          id?: string
          jurisdiction?: string | null
          lei?: string | null
          nationality?: string | null
          normalized_name?: string
          not_screened?: Json
          outcome?: string | null
          parent_request_id?: string | null
          previous_names?: Json
          registration_number?: string | null
          requested_at?: string
          requested_by?: string | null
          rules_version?: string
          scope_version?: string
          screening_reference?: string
          source_context?: string
          source_file_hashes?: Json
          source_import_ids?: Json
          sources_requested?: Json
          status?: string
          subject_aliases?: Json
          subject_name?: string
          subject_role?: string
          subject_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_requests_parent_request_id_fkey"
            columns: ["parent_request_id"]
            isOneToOne: false
            referencedRelation: "screening_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_rules_config: {
        Row: {
          key: string
          rules_version: string
          thresholds: Json
          updated_at: string
          updated_by: string | null
          weights: Json
        }
        Insert: {
          key: string
          rules_version: string
          thresholds: Json
          updated_at?: string
          updated_by?: string | null
          weights: Json
        }
        Update: {
          key?: string
          rules_version?: string
          thresholds?: Json
          updated_at?: string
          updated_by?: string | null
          weights?: Json
        }
        Relationships: []
      }
      sitemap_chunks: {
        Row: {
          chunk_index: number
          lastmod: string | null
          refreshed_at: string
          url_count: number
        }
        Insert: {
          chunk_index: number
          lastmod?: string | null
          refreshed_at?: string
          url_count: number
        }
        Update: {
          chunk_index?: number
          lastmod?: string | null
          refreshed_at?: string
          url_count?: number
        }
        Relationships: []
      }
      sitemap_health_runs: {
        Row: {
          alert_error: string | null
          alert_kind: string | null
          alert_signature: string | null
          alerted: boolean
          checked_at: string
          checked_count: number
          duration_ms: number | null
          failing_count: number
          failures: Json
          healthy: boolean
          id: string
        }
        Insert: {
          alert_error?: string | null
          alert_kind?: string | null
          alert_signature?: string | null
          alerted?: boolean
          checked_at?: string
          checked_count?: number
          duration_ms?: number | null
          failing_count?: number
          failures?: Json
          healthy: boolean
          id?: string
        }
        Update: {
          alert_error?: string | null
          alert_kind?: string | null
          alert_signature?: string | null
          alerted?: boolean
          checked_at?: string
          checked_count?: number
          duration_ms?: number | null
          failing_count?: number
          failures?: Json
          healthy?: boolean
          id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      backfill_officials_count_chunk: {
        Args: { batch_size: number; start_offset: number }
        Returns: {
          next_offset: number
          updated: number
        }[]
      }
      clear_officials: { Args: never; Returns: undefined }
      companies_by_letter_page: {
        Args: { p_letter: string; p_limit?: number; p_offset?: number }
        Returns: {
          district_en: string
          locality: string
          name: string
          official_no: string
          reg_number: number
          slug: string
          status_en: string
          status_group: string
          total_matches: number
          type_code: string
        }[]
      }
      companies_district_counts: {
        Args: never
        Returns: {
          count: number
          name: string
        }[]
      }
      enqueue_indexnow_urls: { Args: { _paths: string[] }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_officials_count_for_slugs: {
        Args: { slugs: string[] }
        Returns: undefined
      }
      indexnow_acquire_lease: { Args: { _seconds?: number }; Returns: boolean }
      indexnow_release_lease: { Args: never; Returns: undefined }
      insert_officials_import_batch: {
        Args: { rows: Json }
        Returns: {
          inserted: number
          skipped: number
        }[]
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      refresh_officials_count: { Args: never; Returns: number }
      refresh_sitemap_chunks: { Args: never; Returns: number }
      reset_officials_counts_chunk: {
        Args: { batch_size?: number }
        Returns: number
      }
      sanctions_publish_import: {
        Args: { _import_id: string }
        Returns: {
          active_total: number
          added: number
          modified: number
          reactivated: number
          removed: number
        }[]
      }
      sanctions_try_lock: { Args: { _source_code: string }; Returns: boolean }
      sanctions_unlock: { Args: { _source_code: string }; Returns: boolean }
      screening_identifier_candidates: {
        Args: { p_identifiers: Json; p_sources?: string[] }
        Returns: {
          entity_type: string
          identifier_type: string
          identifier_value: string
          issuing_country: string
          primary_name: string
          sanctions_entry_id: string
          source_code: string
        }[]
      }
      screening_name_candidates: {
        Args: {
          p_entity_types?: string[]
          p_limit?: number
          p_min_sim?: number
          p_names: string[]
          p_sources?: string[]
        }
        Returns: {
          entity_type: string
          matched_alias_type: string
          matched_name: string
          name_similarity: number
          name_used: string
          primary_name: string
          sanctions_entry_id: string
          source_code: string
        }[]
      }
      search_companies_page: {
        Args: {
          p_cap?: number
          p_limit?: number
          p_offset?: number
          p_patterns: string[]
          p_statuses?: string[]
          p_types?: string[]
        }
        Returns: {
          capped: boolean
          district_en: string
          locality: string
          name: string
          official_no: string
          reg_number: number
          slug: string
          status_en: string
          status_group: string
          total_matches: number
          type_code: string
        }[]
      }
      truncate_officials_only: { Args: never; Returns: undefined }
      update_officials_count_for_slugs: {
        Args: { slugs: string[] }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "client"
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
      app_role: ["admin", "moderator", "user", "client"],
    },
  },
} as const
