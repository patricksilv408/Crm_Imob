import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { redirect } from "next/navigation";
import { AgencyManager } from "./components/AgencyManager";
import { UserManager } from "./components/UserManager";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function AdminPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "SuperAdmin") {
    return redirect("/dashboard");
  }

  const { data: agencies, error: agenciesError } = await supabase
    .from("real_estate_agencies")
    .select("*");

  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id, email, role, real_estate_agency_id, real_estate_agencies(name)");

  if (agenciesError || usersError) {
    return <p>Erro ao carregar dados.</p>;
  }

  // Normalize the nested relationship which might be an array
  const normalizedUsers = users?.map(u => ({
    ...u,
    real_estate_agencies: Array.isArray(u.real_estate_agencies) 
      ? u.real_estate_agencies[0] 
      : u.real_estate_agencies,
  })) || [];

  return (
    <div className="flex flex-col items-center min-h-screen p-4 sm:p-8 bg-gray-50">
      <div className="w-full max-w-6xl p-4 sm:p-8 bg-white rounded-lg shadow-md">
        <div className="flex items-center mb-6">
          <Button asChild variant="outline" size="icon" className="mr-4">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Painel SuperAdmin</h1>
        </div>
        <div className="space-y-8">
          <AgencyManager initialAgencies={agencies || []} />
          <UserManager initialUsers={normalizedUsers} agencies={agencies || []} />
        </div>
      </div>
    </div>
  );
}