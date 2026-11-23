
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  "public": {
          Tables: {
            "addresses": {
                  Row: {
                    "city": string,"created_at": string,"customer_id": string,"district": string | null,"id": string,"is_default": boolean,"label": string | null,"latitude": number | null,"line1": string,"line2": string | null,"longitude": number | null,"phone": string,"postal_code": string | null,"recipient_name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "city": string,"created_at"?: string,"customer_id": string,"district"?: string | null,"id"?: string,"is_default"?: boolean,"label"?: string | null,"latitude"?: number | null,"line1": string,"line2"?: string | null,"longitude"?: number | null,"phone": string,"postal_code"?: string | null,"recipient_name": string,"updated_at"?: string
                  }
                  Update: {
                    "city"?: string,"created_at"?: string,"customer_id"?: string,"district"?: string | null,"id"?: string,"is_default"?: boolean,"label"?: string | null,"latitude"?: number | null,"line1"?: string,"line2"?: string | null,"longitude"?: number | null,"phone"?: string,"postal_code"?: string | null,"recipient_name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "addresses_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"entity_id": string | null,"entity_type": string,"id": string,"metadata": NonNullable<Json>,"new_values": Json | null,"old_values": Json | null,"restaurant_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type": string,"id"?: string,"metadata"?: NonNullable<Json>,"new_values"?: Json | null,"old_values"?: Json | null,"restaurant_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"new_values"?: Json | null,"old_values"?: Json | null,"restaurant_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_logs_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_logs_restaurant_id_fkey"
      columns: ["restaurant_id"]
isOneToOne: false
      referencedRelation: "restaurants"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"display_order": number,"id": string,"image_path": string | null,"is_active": boolean,"name": NonNullable<Json>,"restaurant_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"display_order"?: number,"id"?: string,"image_path"?: string | null,"is_active"?: boolean,"name"?: NonNullable<Json>,"restaurant_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"display_order"?: number,"id"?: string,"image_path"?: string | null,"is_active"?: boolean,"name"?: NonNullable<Json>,"restaurant_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_restaurant_id_fkey"
      columns: ["restaurant_id"]
isOneToOne: false
      referencedRelation: "restaurants"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_telegram_contact_challenges": {
                  Row: {
                    "challenge_hash": string,"contact_verified_at": string | null,"created_at": string,"expires_at": string,"finalized_at": string | null,"phone_e164": string | null,"profile_id": string,"telegram_user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "challenge_hash": string,"contact_verified_at"?: string | null,"created_at"?: string,"expires_at": string,"finalized_at"?: string | null,"phone_e164"?: string | null,"profile_id": string,"telegram_user_id": string
                  }
                  Update: {
                    "challenge_hash"?: string,"contact_verified_at"?: string | null,"created_at"?: string,"expires_at"?: string,"finalized_at"?: string | null,"phone_e164"?: string | null,"profile_id"?: string,"telegram_user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customer_telegram_contact_challenges_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_telegram_identities": {
                  Row: {
                    "created_at": string,"phone_consent_at": string,"phone_e164": string,"phone_verified_at": string,"profile_id": string,"telegram_user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"phone_consent_at": string,"phone_e164": string,"phone_verified_at": string,"profile_id": string,"telegram_user_id": string
                  }
                  Update: {
                    "created_at"?: string,"phone_consent_at"?: string,"phone_e164"?: string,"phone_verified_at"?: string,"profile_id"?: string,"telegram_user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customer_telegram_identities_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_telegram_contact_rate_limits": {
                  Row: {
                    "request_count": number,"scope_id": string,"scope_type": string,"window_started_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "request_count"?: number,"scope_id": string,"scope_type": string,"window_started_at"?: string
                  }
                  Update: {
                    "request_count"?: number,"scope_id"?: string,"scope_type"?: string,"window_started_at"?: string
                  }
                  Relationships: []
                },"customer_telegram_webhook_updates": {
                  Row: {
                    "attempts": number,"created_at": string,"lease_expires_at": string | null,"lease_token": string | null,"processed_at": string | null,"update_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"lease_expires_at"?: string | null,"lease_token"?: string | null,"processed_at"?: string | null,"update_id": number
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"lease_expires_at"?: string | null,"lease_token"?: string | null,"processed_at"?: string | null,"update_id"?: number
                  }
                  Relationships: []
                },"notification_outbox": {
                  Row: {
                    "attempts": number,"created_at": string,"entity_id": string | null,"entity_type": string,"event_type": string,"failed_at": string | null,"id": string,"last_error": string | null,"locked_at": string | null,"max_attempts": number,"next_attempt_at": string,"payload": NonNullable<Json>,"restaurant_id": string,"sent_at": string | null,"status": Database["public"]['Enums']["notification_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"entity_id"?: string | null,"entity_type": string,"event_type": string,"failed_at"?: string | null,"id"?: string,"last_error"?: string | null,"locked_at"?: string | null,"max_attempts"?: number,"next_attempt_at"?: string,"payload"?: NonNullable<Json>,"restaurant_id": string,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["notification_status"],"updated_at"?: string
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string,"event_type"?: string,"failed_at"?: string | null,"id"?: string,"last_error"?: string | null,"locked_at"?: string | null,"max_attempts"?: number,"next_attempt_at"?: string,"payload"?: NonNullable<Json>,"restaurant_id"?: string,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["notification_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_outbox_restaurant_id_fkey"
      columns: ["restaurant_id"]
isOneToOne: false
      referencedRelation: "restaurants"
      referencedColumns: ["id"]
    }
                  ]
                },"order_idempotency_requests": {
                  Row: {
                    "completed_at": string | null,"created_at": string,"customer_id": string | null,"error_code": string | null,"expires_at": string,"id": string,"idempotency_key_hash": string,"order_id": string | null,"request_hash": string,"restaurant_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"created_at"?: string,"customer_id"?: string | null,"error_code"?: string | null,"expires_at": string,"id"?: string,"idempotency_key_hash": string,"order_id"?: string | null,"request_hash": string,"restaurant_id": string,"status"?: string
                  }
                  Update: {
                    "completed_at"?: string | null,"created_at"?: string,"customer_id"?: string | null,"error_code"?: string | null,"expires_at"?: string,"id"?: string,"idempotency_key_hash"?: string,"order_id"?: string | null,"request_hash"?: string,"restaurant_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_idempotency_requests_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_idempotency_requests_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_idempotency_requests_restaurant_id_fkey"
      columns: ["restaurant_id"]
isOneToOne: false
      referencedRelation: "restaurants"
      referencedColumns: ["id"]
    }
                  ]
                },"order_item_options": {
                  Row: {
                    "created_at": string,"id": string,"option_id": string | null,"option_name": NonNullable<Json>,"option_value_id": string | null,"order_item_id": string,"price_delta": number,"value_name": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"option_id"?: string | null,"option_name"?: NonNullable<Json>,"option_value_id"?: string | null,"order_item_id": string,"price_delta"?: number,"value_name"?: NonNullable<Json>
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"option_id"?: string | null,"option_name"?: NonNullable<Json>,"option_value_id"?: string | null,"order_item_id"?: string,"price_delta"?: number,"value_name"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_item_options_option_id_fkey"
      columns: ["option_id"]
isOneToOne: false
      referencedRelation: "product_options"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_item_options_option_value_id_fkey"
      columns: ["option_value_id"]
isOneToOne: false
      referencedRelation: "product_option_values"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_item_options_order_item_id_fkey"
      columns: ["order_item_id"]
isOneToOne: false
      referencedRelation: "order_items"
      referencedColumns: ["id"]
    }
                  ]
                },"order_items": {
                  Row: {
                    "created_at": string,"id": string,"line_total": number,"order_id": string,"product_id": string | null,"product_name": NonNullable<Json>,"quantity": number,"unit_price": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"line_total": number,"order_id": string,"product_id"?: string | null,"product_name"?: NonNullable<Json>,"quantity": number,"unit_price": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"line_total"?: number,"order_id"?: string,"product_id"?: string | null,"product_name"?: NonNullable<Json>,"quantity"?: number,"unit_price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"order_status_history": {
                  Row: {
                    "changed_by": string | null,"created_at": string,"id": string,"new_status": Database["public"]['Enums']["order_status"],"note": string | null,"order_id": string,"previous_status": Database["public"]['Enums']["order_status"] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_by"?: string | null,"created_at"?: string,"id"?: string,"new_status": Database["public"]['Enums']["order_status"],"note"?: string | null,"order_id": string,"previous_status"?: Database["public"]['Enums']["order_status"] | null
                  }
                  Update: {
                    "changed_by"?: string | null,"created_at"?: string,"id"?: string,"new_status"?: Database["public"]['Enums']["order_status"],"note"?: string | null,"order_id"?: string,"previous_status"?: Database["public"]['Enums']["order_status"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_status_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_status_history_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "address_id": string | null,"cancelled_at": string | null,"created_at": string,"currency": string,"customer_id": string | null,"customer_note": string | null,"delivery_fee": number,"discount_total": number,"fulfillment_type": Database["public"]['Enums']["fulfillment_type"],"id": string,"payment_method": Database["public"]['Enums']["payment_method"],"public_number": string | null,"restaurant_id": string,"status": Database["public"]['Enums']["order_status"],"subtotal": number,"total": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_id"?: string | null,"cancelled_at"?: string | null,"created_at"?: string,"currency"?: string,"customer_id"?: string | null,"customer_note"?: string | null,"delivery_fee"?: number,"discount_total"?: number,"fulfillment_type": Database["public"]['Enums']["fulfillment_type"],"id"?: string,"payment_method"?: Database["public"]['Enums']["payment_method"],"public_number"?: string | null,"restaurant_id": string,"status"?: Database["public"]['Enums']["order_status"],"subtotal": number,"total": number,"updated_at"?: string
                  }
                  Update: {
                    "address_id"?: string | null,"cancelled_at"?: string | null,"created_at"?: string,"currency"?: string,"customer_id"?: string | null,"customer_note"?: string | null,"delivery_fee"?: number,"discount_total"?: number,"fulfillment_type"?: Database["public"]['Enums']["fulfillment_type"],"id"?: string,"payment_method"?: Database["public"]['Enums']["payment_method"],"public_number"?: string | null,"restaurant_id"?: string,"status"?: Database["public"]['Enums']["order_status"],"subtotal"?: number,"total"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_address_id_fkey"
      columns: ["address_id"]
isOneToOne: false
      referencedRelation: "addresses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_restaurant_id_fkey"
      columns: ["restaurant_id"]
isOneToOne: false
      referencedRelation: "restaurants"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"created_at": string,"currency": string,"failed_at": string | null,"id": string,"order_id": string,"provider": Database["public"]['Enums']["payment_method"],"provider_reference": string | null,"status": Database["public"]['Enums']["payment_status"],"updated_at": string,"verified_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"currency"?: string,"failed_at"?: string | null,"id"?: string,"order_id": string,"provider": Database["public"]['Enums']["payment_method"],"provider_reference"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string,"verified_at"?: string | null
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"currency"?: string,"failed_at"?: string | null,"id"?: string,"order_id"?: string,"provider"?: Database["public"]['Enums']["payment_method"],"provider_reference"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string,"verified_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"product_option_values": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"display_order": number,"id": string,"is_available": boolean,"name": NonNullable<Json>,"option_id": string,"price_delta": number,"restaurant_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"display_order"?: number,"id"?: string,"is_available"?: boolean,"name"?: NonNullable<Json>,"option_id": string,"price_delta"?: number,"restaurant_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"display_order"?: number,"id"?: string,"is_available"?: boolean,"name"?: NonNullable<Json>,"option_id"?: string,"price_delta"?: number,"restaurant_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_option_values_option_id_fkey"
      columns: ["option_id"]
isOneToOne: false
      referencedRelation: "product_options"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_option_values_option_restaurant_check"
      columns: ["option_id","restaurant_id"]
isOneToOne: false
      referencedRelation: "product_options"
      referencedColumns: ["id","restaurant_id"]
    },{
      foreignKeyName: "product_option_values_restaurant_id_fkey"
      columns: ["restaurant_id"]
isOneToOne: false
      referencedRelation: "restaurants"
      referencedColumns: ["id"]
    }
                  ]
                },"product_options": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"display_order": number,"id": string,"is_required": boolean,"max_selections": number | null,"min_selections": number,"name": NonNullable<Json>,"product_id": string,"restaurant_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"display_order"?: number,"id"?: string,"is_required"?: boolean,"max_selections"?: number | null,"min_selections"?: number,"name"?: NonNullable<Json>,"product_id": string,"restaurant_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"display_order"?: number,"id"?: string,"is_required"?: boolean,"max_selections"?: number | null,"min_selections"?: number,"name"?: NonNullable<Json>,"product_id"?: string,"restaurant_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_options_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_options_product_restaurant_check"
      columns: ["product_id","restaurant_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id","restaurant_id"]
    },{
      foreignKeyName: "product_options_restaurant_id_fkey"
      columns: ["restaurant_id"]
isOneToOne: false
      referencedRelation: "restaurants"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "category_id": string | null,"created_at": string,"deleted_at": string | null,"description": NonNullable<Json>,"display_order": number,"id": string,"image_path": string | null,"is_available": boolean,"is_featured": boolean,"name": NonNullable<Json>,"price": number,"restaurant_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"description"?: NonNullable<Json>,"display_order"?: number,"id"?: string,"image_path"?: string | null,"is_available"?: boolean,"is_featured"?: boolean,"name"?: NonNullable<Json>,"price": number,"restaurant_id": string,"updated_at"?: string
                  }
                  Update: {
                    "category_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"description"?: NonNullable<Json>,"display_order"?: number,"id"?: string,"image_path"?: string | null,"is_available"?: boolean,"is_featured"?: boolean,"name"?: NonNullable<Json>,"price"?: number,"restaurant_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "products_category_restaurant_check"
      columns: ["category_id","restaurant_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id","restaurant_id"]
    },{
      foreignKeyName: "products_restaurant_id_fkey"
      columns: ["restaurant_id"]
isOneToOne: false
      referencedRelation: "restaurants"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string | null,"id": string,"locale": string,"phone": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"full_name"?: string | null,"id": string,"locale"?: string,"phone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string | null,"id"?: string,"locale"?: string,"phone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"promotions": {
                  Row: {
                    "code": string,"created_at": string,"deleted_at": string | null,"ends_at": string | null,"id": string,"is_active": boolean,"minimum_order_amount": number,"name": NonNullable<Json>,"promotion_type": Database["public"]['Enums']["promotion_type"],"restaurant_id": string,"starts_at": string | null,"updated_at": string,"usage_limit": number | null,"used_count": number,"value": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"deleted_at"?: string | null,"ends_at"?: string | null,"id"?: string,"is_active"?: boolean,"minimum_order_amount"?: number,"name"?: NonNullable<Json>,"promotion_type": Database["public"]['Enums']["promotion_type"],"restaurant_id": string,"starts_at"?: string | null,"updated_at"?: string,"usage_limit"?: number | null,"used_count"?: number,"value": number
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"deleted_at"?: string | null,"ends_at"?: string | null,"id"?: string,"is_active"?: boolean,"minimum_order_amount"?: number,"name"?: NonNullable<Json>,"promotion_type"?: Database["public"]['Enums']["promotion_type"],"restaurant_id"?: string,"starts_at"?: string | null,"updated_at"?: string,"usage_limit"?: number | null,"used_count"?: number,"value"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "promotions_restaurant_id_fkey"
      columns: ["restaurant_id"]
isOneToOne: false
      referencedRelation: "restaurants"
      referencedColumns: ["id"]
    }
                  ]
                },"restaurant_settings": {
                  Row: {
                    "created_at": string,"delivery_enabled": boolean,"delivery_fee": number,"free_delivery_threshold": number | null,"minimum_order_amount": number,"pickup_enabled": boolean,"restaurant_id": string,"updated_at": string,"working_hours": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"delivery_enabled"?: boolean,"delivery_fee"?: number,"free_delivery_threshold"?: number | null,"minimum_order_amount"?: number,"pickup_enabled"?: boolean,"restaurant_id": string,"updated_at"?: string,"working_hours"?: NonNullable<Json>
                  }
                  Update: {
                    "created_at"?: string,"delivery_enabled"?: boolean,"delivery_fee"?: number,"free_delivery_threshold"?: number | null,"minimum_order_amount"?: number,"pickup_enabled"?: boolean,"restaurant_id"?: string,"updated_at"?: string,"working_hours"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "restaurant_settings_restaurant_id_fkey"
      columns: ["restaurant_id"]
isOneToOne: true
      referencedRelation: "restaurants"
      referencedColumns: ["id"]
    }
                  ]
                },"restaurant_staff": {
                  Row: {
                    "auth_user_id": string,"created_at": string,"id": string,"is_active": boolean,"restaurant_id": string,"role_id": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth_user_id": string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"restaurant_id": string,"role_id": number,"updated_at"?: string
                  }
                  Update: {
                    "auth_user_id"?: string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"restaurant_id"?: string,"role_id"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "restaurant_staff_restaurant_id_fkey"
      columns: ["restaurant_id"]
isOneToOne: false
      referencedRelation: "restaurants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "restaurant_staff_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id"]
    }
                  ]
                },"restaurants": {
                  Row: {
                    "address": string | null,"branding": NonNullable<Json>,"created_at": string,"currency": string,"description": string | null,"id": string,"is_active": boolean,"name": string,"phone": string | null,"slug": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"branding"?: NonNullable<Json>,"created_at"?: string,"currency"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"phone"?: string | null,"slug": string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"branding"?: NonNullable<Json>,"created_at"?: string,"currency"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"phone"?: string | null,"slug"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"roles": {
                  Row: {
                    "id": number,"name": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"name": string,"slug": string
                  }
                  Update: {
                    "id"?: never,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "get_restaurant_dashboard":
{ Args: { "p_period"?: string,"p_restaurant_id": string }; Returns: Json
                           },
"has_restaurant_role":
{ Args: { "p_restaurant_id": string,"p_roles": (string)[] }; Returns: boolean
                           },
"is_restaurant_staff":
{ Args: { "p_restaurant_id": string }; Returns: boolean
                           }
"mark_cash_payment_paid":
{ Args: { "p_payment_id": string }; Returns: { "payment_id": string,"order_id": string,"status": Database["public"]["Enums"]["payment_status"],"verified_at": string }[]
                           }
"place_pickup_order":
{ Args: { "p_idempotency_key": string,"p_items": Json }; Returns: { "order_id": string,"public_number": string,"status": Database["public"]["Enums"]["order_status"],"subtotal": number,"total": number }[]
                 }
,"create_customer_telegram_contact_challenge":
{ Args: { "p_challenge_hash": string,"p_expires_at": string,"p_profile_id": string,"p_telegram_user_id": string }; Returns: string
                 }
,"record_customer_telegram_contact":
{ Args: { "p_challenge_hash": string,"p_phone_e164": string,"p_telegram_user_id": string }; Returns: string
                 }
,"finalize_customer_telegram_identity":
{ Args: { "p_challenge_hash": string }; Returns: string
                 }
,"check_customer_telegram_rate_limit":
{ Args: { "p_action": string,"p_ip_hash": string,"p_telegram_user_id"?: string | null }; Returns: boolean
                 }
,"claim_customer_telegram_webhook_update":
{ Args: { "p_update_id": number }; Returns: { "disposition": string,"lease_token": string | null }[]
                 }
,"complete_customer_telegram_webhook_update":
{ Args: { "p_lease_token": string,"p_update_id": number }; Returns: boolean
                 }
,"release_customer_telegram_webhook_update":
{ Args: { "p_lease_token": string,"p_update_id": number }; Returns: boolean
                 }
          }
          Enums: {
  "fulfillment_type": "pickup"|"delivery","notification_status": "pending"|"processing"|"sent"|"failed"|"cancelled","order_status": "pending"|"confirmed"|"preparing"|"ready"|"ready_for_pickup"|"completed"|"out_for_delivery"|"delivered"|"cancelled","payment_method": "cash"|"click"|"payme","payment_status": "pending"|"processing"|"verified"|"failed"|"refunded"|"cancelled","promotion_type": "percentage"|"fixed"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "fulfillment_type": ["pickup", "delivery"],"notification_status": ["pending", "processing", "sent", "failed", "cancelled"],"order_status": ["pending", "confirmed", "preparing", "ready", "ready_for_pickup", "completed", "out_for_delivery", "delivered", "cancelled"],"payment_method": ["cash", "click", "payme"],"payment_status": ["pending", "processing", "verified", "failed", "refunded", "cancelled"],"promotion_type": ["percentage", "fixed"]
          }
        }
} as const
