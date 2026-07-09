import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  console.log('Testing complex fetch for pedidos...');
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, items:itens_pedido(*), solicitacoes_insumos:solicitacoes_insumo(*)");
  
  if (error) {
      console.log('PEDIDOS FETCH ERROR:', error);
  } else {
      console.log('PEDIDOS FETCH SUCCESS, count:', data.length);
  }

  console.log('Testing complex fetch for orcamentos...');
  const { data: o, error: oe } = await supabase
    .from("orcamentos")
    .select("*, items:itens_orcamento(*)");
  
  if (oe) {
      console.log('ORCAMENTOS FETCH ERROR:', oe);
  } else {
      console.log('ORCAMENTOS FETCH SUCCESS, count:', o.length);
  }
}
testFetch();
