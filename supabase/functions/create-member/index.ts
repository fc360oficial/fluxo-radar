import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verifica que o caller é admin/supervisor
  const authHeader = req.headers.get('Authorization')!
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: authErr } = await supabaseUser.auth.getUser()
  if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

  const { data: profile } = await supabaseAdmin.from('profiles').select('role, company_id').eq('id', user.id).single()
  if (!profile || !['admin', 'supervisor'].includes(profile.role)) {
    return new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403, headers: corsHeaders })
  }

  const { name, email, phone, role } = await req.json()

  // Gera PIN único
  let pin = ''
  for (let i = 0; i < 20; i++) {
    const candidate = String(Math.floor(100000 + Math.random() * 900000))
    const { count } = await supabaseAdmin.from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .eq('interviewer_pin', candidate)
    if (count === 0) { pin = candidate; break }
  }
  if (!pin) return new Response(JSON.stringify({ error: 'Could not generate unique PIN' }), { status: 500, headers: corsHeaders })

  const memberEmail = email || `pin${pin}@radar.flx`

  // Cria usuário via Admin API (único jeito correto)
  const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: memberEmail,
    password: pin,
    email_confirm: true,
    user_metadata: { name },
  })
  if (createErr) return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: corsHeaders })

  // Insere profile
  const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
    id: newUser.user.id,
    company_id: profile.company_id,
    name,
    email: memberEmail,
    phone: phone || null,
    role: role || 'interviewer',
    interviewer_pin: pin,
    status: 'active',
  })
  if (profileErr) {
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
    return new Response(JSON.stringify({ error: profileErr.message }), { status: 400, headers: corsHeaders })
  }

  return new Response(
    JSON.stringify({ user_id: newUser.user.id, pin, name, email: memberEmail }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
