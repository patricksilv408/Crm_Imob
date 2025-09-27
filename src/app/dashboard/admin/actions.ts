"use server";

import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { createSupabaseServiceRoleClient } from "@/integrations/supabase/service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const AgencyWithAdminSchema = z.object({
  name: z.string().min(1, "Nome da imobiliária é obrigatório"),
  admin_email: z.string().email("Email do administrador inválido"),
  admin_password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
});

const UserUpdateSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["SuperAdmin", "AdminImobiliaria", "Corretor"]),
  agencyId: z.string().uuid().nullable(),
});

async function checkSuperAdmin() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "SuperAdmin") {
    throw new Error("Acesso não autorizado.");
  }
  return user;
}

export async function createAgency(formData: FormData) {
  try {
    await checkSuperAdmin();

    const validatedFields = AgencyWithAdminSchema.safeParse({
      name: formData.get("name"),
      admin_email: formData.get("admin_email"),
      admin_password: formData.get("admin_password"),
    });

    if (!validatedFields.success) {
      return { error: "Dados inválidos." };
    }
    
    const { name, admin_email, admin_password } = validatedFields.data;
    const supabase = createSupabaseServerClient();

    // 1. Create agency
    const { data: agency, error: agencyError } = await supabase
      .from("real_estate_agencies")
      .insert({ name })
      .select()
      .single();

    if (agencyError) throw new Error(`Erro ao criar imobiliária: ${agencyError.message}`);

    // 2. Create admin user for the agency
    const supabaseService = createSupabaseServiceRoleClient();
    const { data: authData, error: authError } = await supabaseService.auth.admin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true, // Auto-confirm user
    });

    if (authError) {
      // Rollback: delete the created agency
      await supabase.from("real_estate_agencies").delete().eq("id", agency.id);
      throw new Error(`Erro ao criar usuário admin: ${authError.message}`);
    }

    // 3. Create profile for the admin user
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        role: 'AdminImobiliaria',
        real_estate_agency_id: agency.id,
      });

    if (profileError) {
      // Rollback: delete user and agency
      await supabaseService.auth.admin.deleteUser(authData.user.id);
      await supabase.from("real_estate_agencies").delete().eq("id", agency.id);
      throw new Error(`Erro ao criar perfil do usuário: ${profileError.message}`);
    }

    revalidatePath("/dashboard/admin");
    return { message: "Imobiliária e admin criados com sucesso!" };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateUserProfile(formData: FormData) {
  const supabase = createSupabaseServerClient();
  try {
    await checkSuperAdmin();

    const validatedFields = UserUpdateSchema.safeParse({
      userId: formData.get("userId"),
      role: formData.get("role"),
      agencyId: formData.get("agencyId") === "null" ? null : formData.get("agencyId"),
    });

    if (!validatedFields.success) {
      console.error(validatedFields.error.flatten().fieldErrors);
      return { error: "Dados de atualização inválidos." };
    }
    
    const { userId, role, agencyId } = validatedFields.data;

    const { error } = await supabase
      .from("profiles")
      .update({ role, real_estate_agency_id: agencyId })
      .eq("id", userId);

    if (error) throw error;

    revalidatePath("/dashboard/admin");
    return { message: "Usuário atualizado com sucesso!" };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteUser(formData: FormData) {
  try {
    const user = await checkSuperAdmin();
    const userId = formData.get('userId') as string;

    if (user.id === userId) {
      return { error: "Não é possível excluir a si mesmo." };
    }

    const supabaseService = createSupabaseServiceRoleClient();
    const { error } = await supabaseService.auth.admin.deleteUser(userId);

    if (error) throw error;

    revalidatePath("/dashboard/admin");
    return { message: "Usuário excluído com sucesso!" };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function toggleAgencyStatus(agencyId: string, newStatus: boolean) {
  try {
    await checkSuperAdmin();
    const supabase = createSupabaseServerClient();

    const { error } = await supabase
      .from("real_estate_agencies")
      .update({ is_active: newStatus })
      .eq("id", agencyId);

    if (error) throw error;

    revalidatePath("/dashboard/admin");
    return { message: `Imobiliária ${newStatus ? 'ativada' : 'desativada'} com sucesso!` };
  } catch (error: any) {
    return { error: error.message };
  }
}