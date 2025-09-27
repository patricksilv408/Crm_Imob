"use server";

import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { createSupabaseServiceRoleClient } from "@/integrations/supabase/service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CreateUserSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  role: z.enum(["AdminImobiliaria", "Corretor"]),
});

async function checkAgencyAdmin() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, real_estate_agency_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "AdminImobiliaria" || !profile.real_estate_agency_id) {
    throw new Error("Acesso não autorizado ou não associado a uma imobiliária.");
  }
  
  return { user, profile };
}

export async function createUserInAgency(formData: FormData) {
  try {
    const { profile } = await checkAgencyAdmin();

    const validatedFields = CreateUserSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role"),
    });

    if (!validatedFields.success) {
      return { error: "Dados inválidos." };
    }

    const { email, password, role } = validatedFields.data;
    
    const supabaseService = createSupabaseServiceRoleClient();
    const { data: authData, error: authError } = await supabaseService.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw new Error(`Erro ao criar usuário: ${authError.message}`);

    const supabase = createSupabaseServerClient();
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        role,
        real_estate_agency_id: profile.real_estate_agency_id,
      });

    if (profileError) {
      await supabaseService.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Erro ao criar perfil: ${profileError.message}`);
    }

    revalidatePath("/dashboard/manage-users");
    return { message: "Usuário criado com sucesso!" };
  } catch (error: any) {
    return { error: error.message };
  }
}