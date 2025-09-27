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
    const validatedUrl = WebhookSchema.safeParse({
      send_url: formData.get("send_url"),
    });

    if (!validatedUrl.success) {
      return { error: "URL de envio inválida." };
    }

    const payloadConfig = {
        lead: formData.getAll("lead_fields"),
        agent: formData.getAll("agent_fields"),
        agency: formData.getAll("agency_fields"),
        event_type: formData.get("event_type") === "on",
    };

    const { error } = await supabase
      .from("webhook_configs")
      .update({ 
          send_url: validatedUrl.data.send_url,
          send_payload_config: payloadConfig
      })
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

export async function sendTestWebhook() {
    try {
        const agencyId = await getAgencyIdForCurrentUser();
        const { data: config, error: configError } = await supabase
            .from("webhook_configs")
            .select("send_url, send_payload_config")
            .eq("real_estate_agency_id", agencyId)
            .single();

        if (configError || !config) {
            return { error: "Configuração de webhook não encontrada." };
        }

        if (!config.send_url) {
            return { error: "URL de envio não configurada." };
        }

        const fullMockPayload: any = {
            lead: {
              id: "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
              customer_name: "Lead de Teste",
              customer_phone: "11999999999",
              customer_email: "lead.teste@example.com",
              status: "NEW",
              source: "Webhook Test",
              notes: "Esta é uma nota de teste.",
              created_at: new Date().toISOString()
            },
            agent: {
              id: "b1c2d3e4-f5g6-h7i8-j9k0-l1m2n3o4p5q6",
              email: "corretor.teste@example.com"
            },
            agency: {
              id: agencyId,
              name: "Imobiliária Teste"
            },
            event_type: "test_event"
        };

        const payloadToSend: any = {};
        const configPayload = config.send_payload_config as any;

        if (configPayload.event_type) {
            payloadToSend.event_type = fullMockPayload.event_type;
        }
        
        for (const entity of ['lead', 'agent', 'agency']) {
            if (configPayload[entity]?.length > 0) {
                payloadToSend[entity] = {};
                for (const field of configPayload[entity]) {
                    if(fullMockPayload[entity] && fullMockPayload[entity][field] !== undefined) {
                       payloadToSend[entity][field] = fullMockPayload[entity][field];
                    }
                }
            }
        }

        const response = await fetch(config.send_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadToSend),
        });

        if (!response.ok) {
            throw new Error(`Seu endpoint respondeu com o status: ${response.status}`);
        }

        return { message: "Webhook de teste enviado com sucesso!" };

    } catch (error: any) {
        return { error: `Falha ao enviar webhook: ${error.message}` };
    }
}