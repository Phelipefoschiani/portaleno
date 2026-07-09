import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    // We can't directly list tables with anon key usually unless there's a view or RPC
    // But we can try to probe them.
    const tables = [
        'usuarios', 'clientes', 'produtos', 'pedidos', 'itens_pedido', 'pedidos_itens',
        'orcamentos', 'itens_orcamento', 'orcamentos_itens', 'solicitacoes_insumo', 
        'solicitacoes_insumos', 'insumos', 'estoque_mandioca', 'pesagens_mandioca',
        'compras_mandioca', 'recebimentos', 'vendas'
    ];
    
    for (const table of tables) {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (!error) {
            console.log(`Table EXISTS: ${table}`);
        } else if (error.code === 'PGRST204' || error.code === '42P01') {
            // 42P01 is "relation does not exist" in standard Postgres, 
            // PostgREST might return different codes.
            // console.log(`Table MISSING: ${table} (${error.code})`);
        } else {
            // Some other error (maybe permission or column missing)
            console.log(`Table PROBABLY EXISTS but error on 'id': ${table} (${error.code}: ${error.message})`);
            // Try selecting *
             const { error: errorAlt } = await supabase.from(table).select('*').limit(1);
             if (!errorAlt) console.log(`Table EXISTS (select * worked): ${table}`);
        }
    }
}
listTables();
