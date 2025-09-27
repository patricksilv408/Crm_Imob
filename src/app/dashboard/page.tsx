import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { redirect } from "next/navigation";
import DashboardView from "./components/DashboardView";
import { LeadManager } from "./components/LeadManager";
import { User } from "@supabase/supabase-js";

type Profile = {
  role: string | null;
  real_estate_agency_id: string | null;
};

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, real_estate_agency_id")
    .eq("id", user.id)
    .single();

  return (
    <DashboardView user={user} profile={profile}>
      <LeadManager profile={profile} user={user} />
    </DashboardView>
  );
}