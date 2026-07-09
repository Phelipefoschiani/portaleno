import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testPersist() {
  const { data: clientes } = await supabase.from('clientes').select('id').limit(1);
  if (!clientes?.[0]) return console.log('No client');
  
  const clienteId = clientes[0].id;
  const testId = 'test-' + Date.now();

  console.log('Inserting test pedido...');
  const { data, error } = await supabase.from('pedidos').insert([
    {
      cliente_id: clienteId,
      data: new Date().toISOString().split('T')[0],
      valor_total: 10,
      custo_total: 4,
      margem: 6,
      status: 'Enviado',
      observacoes: testId
    }
  ]).select();

  if (error) return console.error('Insert error:', error);
  console.log('Inserted:', data);

  console.log('Verifying persistence...');
  const { data: verify, error: verErr } = await supabase.from('pedidos').select('*').eq('observacoes', testId);
  console.log('Verification result:', verify, verErr);

  if (verify && verify.length > 0) {
      console.log('SUCCESS: Data persisted.');
  } else {
      console.log('FAILURE: Data not found after insert.');
  }
}
testPersist();
