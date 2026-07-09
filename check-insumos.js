import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: d1, error: e1 } = await supabase.from('solicitacoes_insumo').select('count', { count: 'exact', head: true });
  console.log('solicitacoes_insumo:', d1, e1);
  const { data: d2, error: e2 } = await supabase.from('solicitacoes_insumos').select('count', { count: 'exact', head: true });
  console.log('solicitacoes_insumos:', d2, e2);
}
test();
