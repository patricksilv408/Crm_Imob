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
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => {
          const cookieStore = cookies();
          return cookieStore.get(name)?.value;
        },
        set: (name: string, value: string, options: CookieOptions) => {
            try {
                const cookieStore = cookies();
                cookieStore.set({ name, value, ...options });
            } catch (error) {
                // Ignore error
            }
        },
        remove: (name: string, options: CookieOptions) => {
            try {
                const cookieStore = cookies();
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
      status: "NEW", // Default status for new leads from webhook
    },
  ]);

  if (insertError) {
    console.error("Error inserting lead from webhook:", insertError);
    return NextResponse.json(
      { error: "Failed to create lead." },
      { status: 500 }
    );
  }

  // TODO: Trigger lead distribution logic here in the future.
  // TODO: Trigger notification webhook to n8n here in the future.

  return NextResponse.json(
    { message: "Lead created successfully." },
    { status: 201 }
  );
}