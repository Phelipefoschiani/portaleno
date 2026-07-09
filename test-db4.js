import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('orcamentos').insert([
    {
      cliente_id: 'ec4bbca9-dbcf-432d-965a-8b8ca7dc1c48',
      representante_id: null,
      data: '2026-06-04',
      valor_total: 100,
      status: 'Orcamento',
      condicao_pagamento: 'A Combinar',
      prazo_entrega: '15 dias'
    }
  ]).select();
  console.log('Result orcamentos:', data, error);
}
test();
