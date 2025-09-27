"use client";

import { useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateAgencyDialog } from "./CreateAgencyDialog";
import { Switch } from "@/components/ui/switch";
import { toggleAgencyStatus } from "../actions";
import { toast } from "sonner";

type Agency = {
  id: string;
  name: string;
  created_at: string;
  is_active: boolean;
};

export function AgencyManager({ initialAgencies }: { initialAgencies: Agency[] }) {
  const [agencies, setAgencies] = useState(initialAgencies);
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (agencyId: string, newStatus: boolean) => {
    // Optimistic update
    setAgencies(agencies.map(a => a.id === agencyId ? { ...a, is_active: newStatus } : a));

    startTransition(async () => {
      const result = await toggleAgencyStatus(agencyId, newStatus);
      if (result.error) {
        toast.error(result.error);
        // Revert on error
        setAgencies(agencies.map(a => a.id === agencyId ? { ...a, is_active: !newStatus } : a));
      } else {
        toast.success(result.message)
      }
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Imobiliárias</h2>
        <CreateAgencyDialog />
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agencies.map((agency) => (
              <TableRow key={agency.id}>
                <TableCell className="font-medium">{agency.name}</TableCell>
                <TableCell>
                  {new Date(agency.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={agency.is_active}
                    onCheckedChange={(checked) => handleStatusChange(agency.id, checked)}
                    disabled={isPending}
                    aria-label="Ativar ou desativar imobiliária"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}