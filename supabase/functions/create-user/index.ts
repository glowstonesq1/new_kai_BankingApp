import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Verify the caller is authenticated
    const { data: { user: callerUser }, error: authError } = await adminClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify caller is an admin
    const { data: callerProfile } = await adminClient
      .from('users')
      .select('role')
      .eq('id', callerUser.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized: admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { username, display_name, password } = await req.json()

    if (!username || !display_name || !password) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const uname = username.trim().toLowerCase()
    const dname = display_name.trim()
    const email = `${uname}@kidbank.app`

    // Check username uniqueness
    const { data: existing } = await adminClient
      .from('users')
      .select('id')
      .eq('username', uname)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ error: 'Username already taken' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create auth user with admin API — email auto-confirmed, no signUp side-effects
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username: uname, display_name: dname, role: 'kid' },
    })

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const uid = newUser.user.id

    // Create profile record
    const { error: profileError } = await adminClient.from('users').upsert({
      id: uid,
      username: uname,
      display_name: dname,
      role: 'kid',
      is_frozen: false,
    }, { onConflict: 'id' })

    if (profileError) {
      await adminClient.auth.admin.deleteUser(uid)
      return new Response(JSON.stringify({ error: 'Failed to create user profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create bank account
    await adminClient.from('accounts').upsert({ user_id: uid, balance: 0 }, { onConflict: 'user_id' })

    return new Response(
      JSON.stringify({ success: true, user_id: uid, username: uname, display_name: dname }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('create-user error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
