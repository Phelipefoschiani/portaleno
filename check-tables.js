import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.rpc('get_tables'); // Won't work without the function
  console.log('Tables:', data, error);
}

// Alternative check
async function test2() {
    const { data: p } = await supabase.from('pedidos').select('id').limit(1);
    console.log('Pedidos exists');
    const { data: ip, error: ipe } = await supabase.from('itens_pedido').select('*').limit(1);
    console.log('itens_pedido:', ip, ipe);
    const { data: pi, error: pie } = await supabase.from('pedidos_itens').select('*').limit(1);
    console.log('pedidos_itens:', pi, pie);
}
test2();
