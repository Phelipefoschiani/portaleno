import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- PEDIDOS ---');
  const { data: p, error: pe } = await supabase.from('pedidos').select('*').limit(1);
  if (p && p.length > 0) console.log(Object.keys(p[0]));
  else console.log('No pedidos or error:', pe);

  console.log('--- ORCAMENTOS ---');
  const { data: o, error: oe } = await supabase.from('orcamentos').select('*').limit(1);
  if (o && o.length > 0) console.log(Object.keys(o[0]));
  else console.log('No orcamentos or error:', oe);

  console.log('--- ITENS_PEDIDO ---');
  const { data: ip, error: ipe } = await supabase.from('itens_pedido').select('*').limit(1);
  if (ip && ip.length > 0) console.log(Object.keys(ip[0]));
  else console.log('No itens_pedido or error:', ipe);

  console.log('--- ITENS_ORCAMENTO ---');
  const { data: io, error: ioe } = await supabase.from('itens_orcamento').select('*').limit(1);
  if (io && io.length > 0) console.log(Object.keys(io[0]));
  else console.log('No itens_orcamento or error:', ioe);

  console.log('--- SOLICITACOES_INSUMO ---');
  const { data: si, error: sie } = await supabase.from('solicitacoes_insumo').select('*').limit(1);
  if (si && si.length > 0) console.log(Object.keys(si[0]));
  else console.log('No solicitacoes_insumo or error:', sie);
}
check();
