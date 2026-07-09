import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: clientes } = await supabase.from('clientes').select('id').limit(1);
  if (!clientes?.[0]) return console.log('No client');
  
  const { data, error } = await supabase.from('orcamentos').insert([
    {
      cliente_id: clientes[0].id,
      representante_id: null,
      data: '2026-06-04',
      valor_total: 100,
      status: 'Orçamento',
      condicao_pagamento: 'A Combinar',
      prazo_entrega: '15 dias'
    }
  ]).select();
  console.log('Result:', data, error);
}
test();
