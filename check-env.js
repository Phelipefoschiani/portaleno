console.log(Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('DATABASE') || k.includes('PG') || k.includes('PORT') || k.includes('URL')));
