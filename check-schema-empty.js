import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: si } = await supabase.from('solicitacoes_insumo').select('*').limit(1);
  console.log('solicitacoes_insumo cols:', si && si.length > 0 ? Object.keys(si[0]) : 'empty');

  const { data: io } = await supabase.from('itens_orcamento').select('*').limit(1);
  console.log('itens_orcamento cols:', io && io.length > 0 ? Object.keys(io[0]) : 'empty');
}
check();
