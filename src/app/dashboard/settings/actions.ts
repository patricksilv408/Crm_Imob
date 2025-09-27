"use server";

import { supabase } from "@/integrations/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function getAgencyIdForCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("real_estate_agency_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.real_estate_agency_id) {
    throw new Error("Usuário não associado a uma imobiliária.");
  }
  
  if (profile.role !== 'AdminImobiliaria' && profile.role !== 'SuperAdmin') {
    throw new Error("Acesso não autorizado.");
  }

  return profile.real_estate_agency_id;
}

export async function getWebhookConfig() {
  const agencyId = await getAgencyIdForCurrentUser();

  const { data: config } = await supabase
    .from("webhook_configs")
    .select("*")
    .eq("real_estate_agency_id", agencyId)
    .single();

  if (config) {
    return config;
  }

  // If no config exists, create one and return it
  const { data: newConfig, error } = await supabase
    .from("webhook_configs")
    .insert({ real_estate_agency_id: agencyId })
    .select()
    .single();

  if (error) {
    console.error("Error creating initial webhook config:", error);
    return null;
  }

  return newConfig;
}

const WebhookSchema = z.object({
  send_url: z.string().url("URL inválida").or(z.literal("")),
});

export async function updateWebhookSettings(formData: FormData) {
  try {
    const agencyId = await getAgencyIdForCurrentUser();
    const validatedFields = WebhookSchema.safeParse({
      send_url: formData.get("send_url"),
    });

    if (!validatedFields.success) {
      return { error: "URL de envio inválida." };
    }

    const { error } = await supabase
      .from("webhook_configs")
      .update({ send_url: validatedFields.data.send_url })
      .eq("real_estate_agency_id", agencyId);

    if (error) throw error;

    revalidatePath("/dashboard/settings");
    return { message: "Configurações salvas com sucesso!" };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function regenerateReceiveToken() {
    try {
        const agencyId = await getAgencyIdForCurrentUser();
        const newToken = crypto.randomUUID();

        const { error } = await supabase
            .from("webhook_configs")
            .update({ receive_token: newToken })
            .eq("real_estate_agency_id", agencyId);

        if (error) throw error;

        revalidatePath("/dashboard/settings");
        return { message: "Token regenerado com sucesso!" };
    } catch (error: any) {
        return { error: error.message };
    }
}