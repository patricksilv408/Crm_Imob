"use server";

import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const LeadSchema = z.object({
  customer_name: z.string().min(1, "Nome do cliente é obrigatório"),
  customer_phone: z.string().optional(),
  customer_email: z.string().email("Email inválido").optional().or(z.literal('')),
  notes: z.string().optional(),
});

export async function createLead(formData: FormData) {
  const supabase = createSupabaseServerClient();
  const validatedFields = LeadSchema.safeParse({
    customer_name: formData.get("customer_name"),
    customer_phone: formData.get("customer_phone"),
    customer_email: formData.get("customer_email"),
    notes: formData.get("notes"),
  });

  if (!validatedFields.success) {
    return {
      error: "Dados inválidos.",
    };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: "Usuário não autenticado." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("real_estate_agency_id, role")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile || !profile.real_estate_agency_id) {
    return { error: "Perfil não encontrado ou não associado a uma imobiliária." };
  }

  const { error: insertError } = await supabase.from("leads").insert([
    {
      ...validatedFields.data,
      real_estate_agency_id: profile.real_estate_agency_id,
      assigned_to: profile.role === 'Corretor' ? userData.user.id : null,
      status: 'NEW', // Usando o valor do ENUM
    },
  ]);

  if (insertError) {
    console.error("Error creating lead:", insertError);
    return { error: "Não foi possível criar o lead." };
  }

  revalidatePath("/dashboard");
  return { message: "Lead criado com sucesso!" };
}