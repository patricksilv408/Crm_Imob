"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserProfile } from "../actions";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { Pencil } from "lucide-react";

type User = {
  id: string;
  email: string | null;
  role: string | null;
  real_estate_agency_id: string | null;
};

type Agency = {
  id: string;
  name: string;
};

export function EditUserDialog({ user, agencies }: { user: User, agencies: Agency[] }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [role, setRole] = useState(user.role || "");
  const [agencyId, setAgencyId] = useState(user.real_estate_agency_id || "null");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("userId", user.id);
    formData.append("role", role);
    formData.append("agencyId", agencyId);
    
    const result = await updateUserProfile(formData);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message);
      closeButtonRef.current?.click();
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Função
            </Label>
            <Select name="role" value={role} onValueChange={setRole}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AdminImobiliaria">Admin Imobiliária</SelectItem>
                <SelectItem value="Corretor">Corretor</SelectItem>
                <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="agencyId" className="text-right">
              Imobiliária
            </Label>
            <Select name="agencyId" value={agencyId} onValueChange={setAgencyId}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione a imobiliária" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">Nenhuma</SelectItem>
                {agencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" ref={closeButtonRef}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit">Salvar Alterações</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}