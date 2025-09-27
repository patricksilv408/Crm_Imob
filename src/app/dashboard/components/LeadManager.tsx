import { createSupabaseServerClient } from "@/integrations/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateLeadDialog } from "./CreateLeadDialog";
import { User } from "@supabase/supabase-js";

type Lead = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  status: string;
  created_at: string;
};

type Profile = {
  role: string | null;
  real_estate_agency_id: string | null;
};

export async function LeadManager({
  profile,
  user,
}: {
  profile: Profile | null;
  user: User;
}) {
  const supabase = createSupabaseServerClient();

  if (!profile || (!profile.real_estate_agency_id && profile.role !== 'SuperAdmin')) {
    return <p>Você não está associado a uma imobiliária ou não tem permissão para ver os leads.</p>;
  }

  let query = supabase.from("leads").select("*");

  if (profile.role === "AdminImobiliaria") {
    query = query.eq("real_estate_agency_id", profile.real_estate_agency_id);
  } else if (profile.role === "Corretor") {
    query = query.eq("assigned_to", user.id);
  }
  // SuperAdmin sees all leads, so no filter is applied

  const { data: leads, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    console.error(error);
    return <p>Erro ao carregar leads.</p>;
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Leads</h2>
        {profile.role !== "SuperAdmin" && <CreateLeadDialog />}
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads && leads.length > 0 ? (
              leads.map((lead: Lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">
                    {lead.customer_name}
                  </TableCell>
                  <TableCell>
                    {lead.customer_phone || lead.customer_email}
                  </TableCell>
                  <TableCell>
                    <Badge>{lead.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(lead.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Nenhum lead encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}