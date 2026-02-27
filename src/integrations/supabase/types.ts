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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      asesores: {
        Row: {
          created_at: string
          email: string
          id: string
          nombre: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          nombre: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          user_id?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          asesor_id: string | null
          ciclo_facturacion: string
          created_at: string
          dia_corte: number
          dia_pago: number
          es_grupo: boolean
          estado_credito: string
          fecha_registro: string
          id: string
          limite_dias_atraso_alerta: number
          linea_credito: number
          nombre: string
          parent_cliente_id: string | null
        }
        Insert: {
          asesor_id?: string | null
          ciclo_facturacion?: string
          created_at?: string
          dia_corte?: number
          dia_pago?: number
          es_grupo?: boolean
          estado_credito?: string
          fecha_registro?: string
          id?: string
          limite_dias_atraso_alerta?: number
          linea_credito?: number
          nombre: string
          parent_cliente_id?: string | null
        }
        Update: {
          asesor_id?: string | null
          ciclo_facturacion?: string
          created_at?: string
          dia_corte?: number
          dia_pago?: number
          es_grupo?: boolean
          estado_credito?: string
          fecha_registro?: string
          id?: string
          limite_dias_atraso_alerta?: number
          linea_credito?: number
          nombre?: string
          parent_cliente_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_asesor_id_fkey"
            columns: ["asesor_id"]
            isOneToOne: false
            referencedRelation: "asesores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_parent_cliente_id_fkey"
            columns: ["parent_cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas: {
        Row: {
          cliente_id: string
          created_at: string
          dias_gracia: number
          dpd: number
          estado: string
          fecha_emision: string
          fecha_pago: string | null
          fecha_vencimiento: string
          id: string
          monto: number
          notas_cobranza: string | null
          numero_factura: string | null
          periodo_facturacion: string | null
          tipo: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          dias_gracia?: number
          dpd?: number
          estado?: string
          fecha_emision?: string
          fecha_pago?: string | null
          fecha_vencimiento: string
          id?: string
          monto: number
          notas_cobranza?: string | null
          numero_factura?: string | null
          periodo_facturacion?: string | null
          tipo?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          dias_gracia?: number
          dpd?: number
          estado?: string
          fecha_emision?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string
          id?: string
          monto?: number
          notas_cobranza?: string | null
          numero_factura?: string | null
          periodo_facturacion?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "facturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_cobranza: {
        Row: {
          cliente_id: string
          contenido: string
          created_at: string
          id: string
          registrado_por: string | null
          tipo: string
        }
        Insert: {
          cliente_id: string
          contenido: string
          created_at?: string
          id?: string
          registrado_por?: string | null
          tipo?: string
        }
        Update: {
          cliente_id?: string
          contenido?: string
          created_at?: string
          id?: string
          registrado_por?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notas_cobranza_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          created_at: string
          factura_id: string
          fecha_pago: string
          id: string
          metodo: string
          monto: number
          referencia: string | null
          registrado_por: string | null
        }
        Insert: {
          created_at?: string
          factura_id: string
          fecha_pago?: string
          id?: string
          metodo?: string
          monto: number
          referencia?: string | null
          registrado_por?: string | null
        }
        Update: {
          created_at?: string
          factura_id?: string
          fecha_pago?: string
          id?: string
          metodo?: string
          monto?: number
          referencia?: string | null
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
        ]
      }
      promesas_pago: {
        Row: {
          cliente_id: string
          created_at: string
          estado: string
          factura_id: string | null
          fecha_promesa: string
          id: string
          monto_prometido: number
          notas: string | null
          registrado_por: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          estado?: string
          factura_id?: string | null
          fecha_promesa: string
          id?: string
          monto_prometido: number
          notas?: string | null
          registrado_por?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          estado?: string
          factura_id?: string | null
          fecha_promesa?: string
          id?: string
          monto_prometido?: number
          notas?: string | null
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promesas_pago_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promesas_pago_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "asesor"
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
      app_role: ["admin", "asesor"],
    },
  },
} as const
