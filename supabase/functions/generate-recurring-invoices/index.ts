import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all active clients with recurring billing
    const { data: clientes, error: clientesError } = await supabase
      .from('clientes')
      .select('*')
      .eq('estado_credito', 'activo')
      .in('ciclo_facturacion', ['mensual', 'quincenal']);

    if (clientesError) throw clientesError;
    if (!clientes || clientes.length === 0) {
      return new Response(JSON.stringify({ message: 'No hay clientes con facturación recurrente', generated: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const today = new Date();
    const todayDay = today.getDate();
    let generated = 0;

    for (const cliente of clientes) {
      // Check if today is the billing day (dia_corte)
      const shouldGenerate = todayDay === cliente.dia_corte;
      if (!shouldGenerate) continue;

      // Check if invoice already exists for this period
      const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM
      const periodo = `${currentMonth}`;

      const { data: existing } = await supabase
        .from('facturas')
        .select('id')
        .eq('cliente_id', cliente.id)
        .eq('periodo_facturacion', periodo)
        .eq('tipo', 'recurrente')
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Calculate due date based on dia_pago
      const dueDate = new Date(today.getFullYear(), today.getMonth(), cliente.dia_pago);
      if (dueDate <= today) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }

      // Generate invoice number
      const invoiceNumber = `REC-${cliente.id.slice(0, 4).toUpperCase()}-${currentMonth}`;

      const { error: insertError } = await supabase.from('facturas').insert({
        cliente_id: cliente.id,
        monto: cliente.linea_credito * 0.1, // Default: 10% of credit line (configurable)
        fecha_emision: today.toISOString().split('T')[0],
        fecha_vencimiento: dueDate.toISOString().split('T')[0],
        estado: 'pendiente',
        tipo: 'recurrente',
        periodo_facturacion: periodo,
        numero_factura: invoiceNumber,
        dias_gracia: 3,
      });

      if (!insertError) generated++;
    }

    return new Response(
      JSON.stringify({ message: `Facturas generadas: ${generated}`, generated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
