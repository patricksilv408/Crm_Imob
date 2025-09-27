import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { UserList } from "./components/UserList";

export default async function ManageUsersPage() {
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

  if (profile?.role !== "AdminImobiliaria" || !profile.real_estate_agency_id) {
    return redirect("/dashboard");
  }

  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("real_estate_agency_id", profile.real_estate_agency_id);

  if (usersError) {
    return <p>Erro ao carregar usuários.</p>;
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-4 sm:p-8 bg-gray-50">
      <div className="w-full max-w-4xl p-4 sm:p-8 bg-white rounded-lg shadow-md">
        <div className="flex items-center mb-6">
          <Button asChild variant="outline" size="icon" className="mr-4">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
        </div>
        <UserList initialUsers={users || []} />
      </div>
    </div>
  );
}