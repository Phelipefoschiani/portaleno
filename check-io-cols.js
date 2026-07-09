import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: io, error: ioe } = await supabase.from('itens_orcamento').select('*').limit(1);
  if (ioe) {
      console.log('Error selecting from itens_orcamento:', ioe);
  } else {
      // If empty, I can't see columns. I'll try to insert a dummy (it will fail on FK if id is wrong)
      const { error: insErr } = await supabase.from('itens_orcamento').insert({ orcamento_id: '00000000-0000-0000-0000-000000000000' });
      console.log('Insert attempt error (look for invalid column):', insErr);
  }
}
check();
