export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      family_trees: {
        Row: {
          id: string
          user_id: string
          tree_name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tree_name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tree_name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      family_members: {
        Row: {
          id: string
          tree_id: string
          first_name: string
          middle_name: string | null
          last_name: string | null
          maiden_name: string | null
          display_name: string | null
          gender: string | null
          date_of_birth: string | null
          date_of_birth_approx: boolean
          place_of_birth: string | null
          is_deceased: boolean
          date_of_death: string | null
          place_of_death: string | null
          burial_location: string | null
          memorial_note: string | null
          marital_status: string | null
          occupation: string | null
          nationality: string | null
          ethnicity: string | null
          biography: string | null
          personal_notes: string | null
          profile_photo_url: string | null
          relationship_to_primary: string
          position_x: number
          position_y: number
          is_primary_user: boolean
          visibility: string
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          tree_id: string
          first_name: string
          middle_name?: string | null
          last_name?: string | null
          maiden_name?: string | null
          display_name?: string | null
          gender?: string | null
          date_of_birth?: string | null
          date_of_birth_approx?: boolean
          place_of_birth?: string | null
          is_deceased?: boolean
          date_of_death?: string | null
          place_of_death?: string | null
          burial_location?: string | null
          memorial_note?: string | null
          marital_status?: string | null
          occupation?: string | null
          nationality?: string | null
          ethnicity?: string | null
          biography?: string | null
          personal_notes?: string | null
          profile_photo_url?: string | null
          relationship_to_primary: string
          position_x?: number
          position_y?: number
          is_primary_user?: boolean
          visibility?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          tree_id?: string
          first_name?: string
          middle_name?: string | null
          last_name?: string | null
          maiden_name?: string | null
          display_name?: string | null
          gender?: string | null
          date_of_birth?: string | null
          date_of_birth_approx?: boolean
          place_of_birth?: string | null
          is_deceased?: boolean
          date_of_death?: string | null
          place_of_death?: string | null
          burial_location?: string | null
          memorial_note?: string | null
          marital_status?: string | null
          occupation?: string | null
          nationality?: string | null
          ethnicity?: string | null
          biography?: string | null
          personal_notes?: string | null
          profile_photo_url?: string | null
          relationship_to_primary?: string
          position_x?: number
          position_y?: number
          is_primary_user?: boolean
          visibility?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      relationships: {
        Row: {
          id: string
          tree_id: string
          from_member_id: string
          to_member_id: string
          relationship_type: string
          marriage_date: string | null
          marriage_location: string | null
          divorce_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tree_id: string
          from_member_id: string
          to_member_id: string
          relationship_type: string
          marriage_date?: string | null
          marriage_location?: string | null
          divorce_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tree_id?: string
          from_member_id?: string
          to_member_id?: string
          relationship_type?: string
          marriage_date?: string | null
          marriage_location?: string | null
          divorce_date?: string | null
          created_at?: string
        }
      }
      life_events: {
        Row: {
          id: string
          member_id: string
          event_type: string
          event_date: string | null
          date_precision: string
          description: string | null
          location: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          event_type: string
          event_date?: string | null
          date_precision?: string
          description?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          event_type?: string
          event_date?: string | null
          date_precision?: string
          description?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      attachments: {
        Row: {
          id: string
          member_id: string
          file_name: string
          file_type: string
          file_url: string
          file_size: number | null
          mime_type: string | null
          caption: string | null
          upload_date: string
          storage_path: string
        }
        Insert: {
          id?: string
          member_id: string
          file_name: string
          file_type: string
          file_url: string
          file_size?: number | null
          mime_type?: string | null
          caption?: string | null
          upload_date?: string
          storage_path: string
        }
        Update: {
          id?: string
          member_id?: string
          file_name?: string
          file_type?: string
          file_url?: string
          file_size?: number | null
          mime_type?: string | null
          caption?: string | null
          upload_date?: string
          storage_path?: string
        }
      }
    }
  }
}
