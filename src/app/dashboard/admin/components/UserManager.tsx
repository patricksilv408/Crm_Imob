"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EditUserDialog } from "./EditUserDialog";

type User = {
  id: string;
  email: string | null;
  role: string | null;
  real_estate_agency_id: string | null;
  real_estate_agencies: { name: string } | null;
};

type Agency = {
  id: string;
  name: string;
};

export function UserManager({ initialUsers, agencies }: { initialUsers: User[], agencies: Agency[] }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Usuários</h2>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Imobiliária</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>
                  {user.role ? <Badge>{user.role}</Badge> : "Não definida"}
                </TableCell>
                <TableCell>
                  {user.real_estate_agencies?.name || "N/A"}
                </TableCell>
                <TableCell className="text-right">
                  <EditUserDialog user={user} agencies={agencies} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}