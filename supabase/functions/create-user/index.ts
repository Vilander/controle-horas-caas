import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Falta o cabeçalho de autorização");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !callerUser) throw new Error("Token inválido ou não autorizado");

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", callerUser.id)
      .single();

    if (callerProfile?.role !== "admin") {
      throw new Error("Apenas administradores podem cadastrar operadores.");
    }

    const { email, password, full_name, role } = await req.json();

    // Cria o utilizador no auth.users
    // (O Trigger do PostgreSQL será disparado automaticamente e criará o perfil)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

    if (createError) throw createError;

    // A atualização redundante (upsert) manual foi removida para não colidir com o Trigger.

    return new Response(JSON.stringify({ user: newUser.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});