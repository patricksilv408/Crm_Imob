import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Cog } from "lucide-react";
import { WebhookSettings } from "./components/WebhookSettings";
import { getWebhookConfig } from "./actions";

export default async function SettingsPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, real_estate_agency_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "SuperAdmin" && profile?.role !== "AdminImobiliaria") {
    return redirect("/dashboard");
  }
  
  if (!profile.real_estate_agency_id) {
     return (
      <div className="flex flex-col items-center min-h-screen p-4 sm:p-8 bg-gray-50">
        <div className="w-full max-w-4xl p-8 bg-white rounded-lg shadow-md text-center">
           <p>Você precisa estar associado a uma imobiliária para configurar webhooks.</p>
            <Button asChild variant="link" className="mt-4">
                <Link href="/dashboard">Voltar ao Dashboard</Link>
            </Button>
        </div>
      </div>
    );
  }

  const webhookConfig = await getWebhookConfig();

  return (
    <div className="flex flex-col items-center min-h-screen p-4 sm:p-8 bg-gray-50">
      <div className="w-full max-w-4xl p-4 sm:p-8 bg-white rounded-lg shadow-md">
        <div className="flex items-center mb-6">
          <Button asChild variant="outline" size="icon" className="mr-4">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold flex items-center">
            <Cog className="mr-3 h-8 w-8" />
            Configurações
          </h1>
        </div>
        <div className="space-y-8">
          <WebhookSettings initialConfig={webhookConfig} />
        </div>
      </div>
    </div>
  );
}