import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
  const { data, error } = await supabase.rpc('check_rls'); // Likely won't work
  if (error) {
      // Try probing by seeing if we can see other people's data?
      // Not possible to know whose data is whose without knowing the logic.
      console.log('Cannot check RLS directly via RPC.');
  }

  // Check if we can see anything at all.
  const tables = ['pedidos', 'orcamentos', 'clientes', 'usuarios', 'produtos'];
  for (const t of tables) {
      const { data: d, error: e } = await supabase.from(t).select('count', {count: 'exact', head: true});
      console.log(`Table ${t}: count=${d !== null ? d : 'null'}, error=${e ? e.code : 'none'}`);
  }
}
checkRLS();
