const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Usar service role para operaciones de backend si es necesario, o manejar a través del token de usuario
);

module.exports = supabase;
