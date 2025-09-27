"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { regenerateReceiveToken, updateWebhookSettings, sendTestWebhook } from "../actions";
import { toast } from "sonner";
import { Copy, RefreshCw, Send, ChevronDown, ChevronUp } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";

type WebhookConfig = {
  id: string;
  real_estate_agency_id: string;
  send_url: string | null;
  receive_token: string;
  send_payload_config: any;
};

const CodeBlock = ({ code }: { code: string }) => (
  <pre className="bg-gray-100 p-4 rounded-md text-sm text-gray-800 overflow-x-auto">
    <code>{JSON.stringify(JSON.parse(code), null, 2)}</code>
  </pre>
);

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar Configurações"}
    </Button>
  );
}

const PAYLOAD_FIELDS = {
    lead: { label: "Lead", fields: ["id", "customer_name", "customer_phone", "customer_email", "status", "source", "notes", "created_at"] },
    agent: { label: "Corretor", fields: ["id", "email"] },
    agency: { label: "Imobiliária", fields: ["id", "name"] },
};

export function WebhookSettings({ initialConfig }: { initialConfig: WebhookConfig | null }) {
  const [state, formAction] = useFormState(updateWebhookSettings, { message: null, error: null });
  const [isPending, startTransition] = useTransition();
  const [testReceiveForm, setTestReceiveForm] = useState({
      customer_name: "Cliente de Teste",
      customer_phone: "11987654321",
      customer_email: "cliente.teste@email.com",
      source: "Teste via CRM",
      notes: "Esta é uma observação de teste."
  });

  if (!initialConfig) {
    return <p>Não foi possível carregar as configurações de webhook.</p>;
  }

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const handleRegenerateToken = async () => {
    if (confirm("Tem certeza que deseja gerar um novo token? O token antigo deixará de funcionar.")) {
        const result = await regenerateReceiveToken();
        if (result.error) toast.error(result.error);
        else toast.success(result.message);
    }
  }

  const handleSendTest = () => {
    startTransition(async () => {
        const result = await sendTestWebhook();
        if (result.error) toast.error(result.error);
        else toast.success(result.message);
    });
  }

  const handleTestReceive = async (e: React.FormEvent) => {
      e.preventDefault();
      startTransition(async () => {
          const response = await fetch('/api/webhooks/leads', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${initialConfig.receive_token}`
              },
              body: JSON.stringify(testReceiveForm)
          });
          const result = await response.json();
          if(response.ok) {
              toast.success("Webhook de teste recebido com sucesso! Verifique a lista de leads.");
          } else {
              toast.error(`Erro: ${result.error}`);
          }
      });
  }

  const receiveUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/leads` : '';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recebimento de Leads</CardTitle>
          <CardDescription>
            Use esta URL e token para enviar leads de fontes externas para o CRM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="receive_url">URL do Webhook</Label>
            <div className="flex items-center gap-2">
              <Input id="receive_url" value={receiveUrl} readOnly />
              <Button variant="outline" size="icon" onClick={() => handleCopyToClipboard(receiveUrl)}><Copy className="h-4 w-4" /></Button>
            </div>
          </div>
          <div>
            <Label htmlFor="receive_token">Token de Autenticação (Bearer)</Label>
            <div className="flex items-center gap-2">
              <Input id="receive_token" value={initialConfig.receive_token} readOnly />
              <Button variant="outline" size="icon" onClick={() => handleCopyToClipboard(initialConfig.receive_token)}><Copy className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={handleRegenerateToken}><RefreshCw className="h-4 w-4" /></Button>
            </div>
             <p className="text-xs text-muted-foreground mt-1">Envie este token no cabeçalho `Authorization` como `Bearer SEU_TOKEN`.</p>
          </div>
          <Collapsible>
            <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full">Testar Recebimento <ChevronDown className="h-4 w-4 ml-2" /></Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 border rounded-md mt-2 space-y-4">
                <p className="text-sm text-muted-foreground">Use o formulário abaixo para simular um webhook chegando de uma fonte externa.</p>
                <form onSubmit={handleTestReceive} className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="test_name">Nome</Label>
                        <Input id="test_name" value={testReceiveForm.customer_name} onChange={e => setTestReceiveForm({...testReceiveForm, customer_name: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="test_phone">Telefone</Label>
                        <Input id="test_phone" value={testReceiveForm.customer_phone} onChange={e => setTestReceiveForm({...testReceiveForm, customer_phone: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="test_email">Email</Label>
                        <Input id="test_email" type="email" value={testReceiveForm.customer_email} onChange={e => setTestReceiveForm({...testReceiveForm, customer_email: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="test_notes">Observações</Label>
                        <Textarea id="test_notes" value={testReceiveForm.notes} onChange={e => setTestReceiveForm({...testReceiveForm, notes: e.target.value})} />
                    </div>
                    <Button type="submit" disabled={isPending}>{isPending ? "Enviando..." : "Enviar Teste"}</Button>
                </form>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Envio de Notificações</CardTitle>
          <CardDescription>
            Configure a URL e os campos para os quais o CRM enviará webhooks de notificação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-6">
            <div>
                <Label htmlFor="send_url">Sua URL para receber notificações</Label>
                <Input id="send_url" name="send_url" placeholder="https://seu-workflow.n8n.cloud/webhook/..." defaultValue={initialConfig.send_url || ""} />
            </div>
            
            <Collapsible>
                <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full">Configurar Campos do Payload <ChevronDown className="h-4 w-4 ml-2" /></Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 border rounded-md mt-2 space-y-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="event_type" name="event_type" defaultChecked={initialConfig.send_payload_config?.event_type} />
                        <Label htmlFor="event_type" className="font-medium">event_type</Label>
                    </div>
                    {Object.entries(PAYLOAD_FIELDS).map(([entity, {label, fields}]) => (
                        <div key={entity}>
                            <h4 className="font-semibold mb-2">{label}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {fields.map(field => (
                                    <div key={field} className="flex items-center space-x-2">
                                        <Checkbox id={`${entity}_${field}`} name={`${entity}_fields`} value={field} defaultChecked={initialConfig.send_payload_config?.[entity]?.includes(field)} />
                                        <Label htmlFor={`${entity}_${field}`}>{field}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </CollapsibleContent>
            </Collapsible>

            <div className="flex justify-between items-center">
                <Button type="button" variant="secondary" onClick={handleSendTest} disabled={isPending}>
                    <Send className="h-4 w-4 mr-2" />
                    {isPending ? "Enviando Teste..." : "Testar Envio"}
                </Button>
                <SubmitButton />
            </div>
            {state?.message && <p className="text-sm text-green-600 mt-2 text-right">{state.message}</p>}
            {state?.error && <p className="text-sm text-red-600 mt-2 text-right">{state.error}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}