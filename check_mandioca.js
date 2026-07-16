import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('compras_mandioca').select('*').limit(1);
  console.log('Result:', data);
  if (error) {
    console.error('Error fetching:', error);
  } else if (data && data.length > 0) {
    console.log('Columns in first row:', Object.keys(data[0]));
  } else {
    console.log('No rows in compras_mandioca to inspect columns');
    // Try to insert a dummy row or check structure via a query that fails
    const { error: insertError } = await supabase.from('compras_mandioca').insert([{
      fornecedor_id: null,
      data: new Date().toISOString(),
      tipo_pesagem: 'total',
      quantidade_total: 0,
      status_pagamento: 'Pendente',
      casca_kg: 0,
      destopo_kg: 0,
      ordem_compra_id: '00000000-0000-0000-0000-000000000000'
    }]).select();
    console.log('Dummy insert with ordem_compra_id error (if any):', insertError);
  }
}
check();
