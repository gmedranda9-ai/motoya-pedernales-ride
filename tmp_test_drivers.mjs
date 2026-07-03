import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL || 'https://uukxicfeqicieljcdqzy.supabase.co';
const key = process.env.SUPABASE_ANON_KEY;
if (!key) { console.error('No anon key'); process.exit(1); }
const supabase = createClient(url, key);
async function test() {
  const res1 = await supabase.from('conductores').select('*').eq('disponible', true).eq('estado', 'aprobado').eq('suscripcion_activa', true).order('calificacion_promedio', { ascending: false });
  console.log('SELECT * count:', res1.data?.length, 'error:', res1.error?.message);
  const res2 = await supabase.from('conductores').select('id, nombre, foto, placa, modelo_moto, calificacion_promedio, disponible, telefono, color, conductor_lat, conductor_lng').eq('disponible', true).eq('estado', 'aprobado').eq('suscripcion_activa', true).order('calificacion_promedio', { ascending: false });
  console.log('explicit count:', res2.data?.length, 'error:', res2.error?.message);
}
test();
