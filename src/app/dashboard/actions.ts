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
</dyad-execute-sql>

<dyad-write path="src/app/api/webhooks/leads/route.ts" description="Atualizar webhook route para usar os novos tipos ENUM">
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";

const LeadWebhookSchema = z.object({
  customer_name: z.string().min(1, "Nome do cliente é obrigatório"),
  customer_email: z.string().email("Email inválido").optional().nullable(),
  customer_phone: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => {
          return cookieStore.get(name)?.value;
        },
        set: (name: string, value: string, options: CookieOptions) => {
            try {
                cookieStore.set({ name, value, ...options });
            } catch (error) {
                // Ignore error
            }
        },
        remove: (name: string, options: CookieOptions) => {
            try {
                cookieStore.set({ name, value: '', ...options });
            } catch (error) {
                // Ignore error
            }
        },
      },
    }
  );

  // 1. Authenticate the request
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authorization header is missing or invalid." },
      { status: 401 }
    );
  }

  const receiveToken = authHeader.split(" ")[1];

  const { data: webhookConfig, error: tokenError } = await supabase
    .from("webhook_configs")
    .select("real_estate_agency_id")
    .eq("receive_token", receiveToken)
    .single();

  if (tokenError || !webhookConfig) {
    return NextResponse.json({ error: "Invalid token." }, { status: 403 });
  }

  // 2. Validate the request body
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validatedFields = LeadWebhookSchema.safeParse(body);

  if (!validatedFields.success) {
    return NextResponse.json(
      {
        error: "Invalid lead data.",
        details: validatedFields.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  // 3. Create the lead
  const { error: insertError } = await supabase.from("leads").insert([
    {
      ...validatedFields.data,
      real_estate_agency_id: webhookConfig.real_estate_agency_id,
      status: "NEW", // Usando o valor do ENUM
    },
  ]);

  if (insertError) {
    console.error("Error inserting lead from webhook:", insertError);
    return NextResponse.json(
      { error: "Failed to create lead." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: "Lead created successfully." },
    { status: 201 }
  );
}