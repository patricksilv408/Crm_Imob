"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createLead } from "../actions";
import { toast } from "sonner";
import { useRef } from "react";

export function CreateLeadDialog() {
  const formRef = useRef<HTMLFormElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = await createLead(formData);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message);
      formRef.current?.reset();
      closeButtonRef.current?.click();
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Adicionar Lead</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Lead</DialogTitle>
          <DialogDescription>
            Preencha as informações abaixo para cadastrar um novo lead.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="customer_name" className="text-right">
              Nome
            </Label>
            <Input
              id="customer_name"
              name="customer_name"
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="customer_phone" className="text-right">
              Telefone
            </Label>
            <Input
              id="customer_phone"
              name="customer_phone"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="customer_email" className="text-right">
              Email
            </Label>
            <Input
              id="customer_email"
              name="customer_email"
              type="email"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Observações
            </Label>
            <Textarea
              id="notes"
              name="notes"
              className="col-span-3"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" ref={closeButtonRef}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}