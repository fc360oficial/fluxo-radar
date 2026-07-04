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

  const authHeader = req.headers.get('Authorization')!
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authErr } = await supabaseUser.auth.getUser()
  if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

  const { data: callerProfile } = await supabaseAdmin.from('profiles').select('role, company_id').eq('id', user.id).single()
  if (!callerProfile || !['admin', 'supervisor'].includes(callerProfile.role)) {
    return new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403, headers: corsHeaders })
  }

  const { user_id } = await req.json()

  // Garante que o membro pertence à mesma empresa
  const { data: target } = await supabaseAdmin.from('profiles').select('company_id').eq('id', user_id).single()
  if (!target || target.company_id !== callerProfile.company_id) {
    return new Response(JSON.stringify({ error: 'Member not found' }), { status: 404, headers: corsHeaders })
  }

  // Não permite excluir a si mesmo
  if (user_id === user.id) {
    return new Response(JSON.stringify({ error: 'Cannot delete yourself' }), { status: 400, headers: corsHeaders })
  }

  await supabaseAdmin.from('profiles').delete().eq('id', user_id)
  await supabaseAdmin.auth.admin.deleteUser(user_id)

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
