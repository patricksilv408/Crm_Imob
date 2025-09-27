"use server";

import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const AgencySchema = z.object({
  name: z.string().min(1, "Nome da imobiliária é obrigatório"),
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
}

export async function createAgency(formData: FormData) {
  const supabase = createSupabaseServerClient();
  try {
    await checkSuperAdmin();

    const validatedFields = AgencySchema.safeParse({
      name: formData.get("name"),
    });

    if (!validatedFields.success) {
      return { error: "Dados inválidos." };
    }

    const { error } = await supabase
      .from("real_estate_agencies")
      .insert([{ name: validatedFields.data.name }]);

    if (error) throw error;

    revalidatePath("/dashboard/admin");
    return { message: "Imobiliária criada com sucesso!" };
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