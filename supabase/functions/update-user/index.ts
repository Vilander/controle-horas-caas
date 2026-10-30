import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Libera o CORS para o navegador
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Proteção Manual Segura
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

    if (callerProfile?.role !== "admin") throw new Error("Apenas administradores podem editar usuários.");

    const { target_user_id, full_name, phone, role } = await req.json();

    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      target_user_id,
      {
        phone: phone || null,
        user_metadata: { full_name, role },
      }
    );

    if (updateError) throw updateError;

    // Garante que o espelho local da tabela profiles force o update do papel
    await supabaseAdmin.from("profiles").update({ role }).eq("id", target_user_id);

    return new Response(JSON.stringify({ user: updatedUser.user }), {
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