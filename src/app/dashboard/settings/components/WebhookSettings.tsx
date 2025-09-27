"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { regenerateReceiveToken, updateWebhookSettings } from "../actions";
import { toast } from "sonner";
import { Copy, RefreshCw } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";

type WebhookConfig = {
  id: string;
  real_estate_agency_id: string;
  send_url: string | null;
  receive_token: string;
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
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

export function WebhookSettings({ initialConfig }: { initialConfig: WebhookConfig | null }) {
  const [state, formAction] = useFormState(updateWebhookSettings, { message: null, error: null });

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const handleRegenerateToken = async () => {
    if (confirm("Tem certeza que deseja gerar um novo token? O token antigo deixará de funcionar.")) {
        const result = await regenerateReceiveToken();
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(result.message);
        }
    }
  }

  if (!initialConfig) {
    return <p>Não foi possível carregar as configurações de webhook.</p>;
  }

  const receiveUrl = `${window.location.origin}/api/webhooks/leads`;

  const receiveExample = `{
    "customer_name": "João da Silva",
    "customer_email": "joao.silva@example.com",
    "customer_phone": "11999998888",
    "source": "Facebook Ads",
    "notes": "Cliente interessado em apartamentos de 2 quartos na zona sul."
  }`;

  const sendExample = `{
    "lead": {
      "id": "a1b2c3d4-...",
      "customer_name": "Maria Oliveira",
      "customer_phone": "21988887777",
      "status": "NEW",
      "source": "Portal Imobiliário"
    },
    "agent": {
      "id": "e5f6g7h8-...",
      "email": "corretor@imobiliaria.com"
    },
    "agency": {
      "id": "i9j0k1l2-...",
      "name": "Imobiliária Feliz"
    },
    "event_type": "lead_assigned"
  }`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recebimento de Leads</CardTitle>
          <CardDescription>
            Use esta URL e token para enviar leads de fontes externas (como n8n, Zapier ou seu site) para o CRM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="receive_url">URL do Webhook</Label>
            <div className="flex items-center gap-2">
              <Input id="receive_url" value={receiveUrl} readOnly />
              <Button variant="outline" size="icon" onClick={() => handleCopyToClipboard(receiveUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="receive_token">Token de Autenticação (Bearer)</Label>
            <div className="flex items-center gap-2">
              <Input id="receive_token" value={initialConfig.receive_token} readOnly />
              <Button variant="outline" size="icon" onClick={() => handleCopyToClipboard(initialConfig.receive_token)}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleRegenerateToken}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
             <p className="text-xs text-muted-foreground mt-1">Envie este token no cabeçalho `Authorization` como `Bearer SEU_TOKEN`.</p>
          </div>
          <div>
            <Label>Exemplo de Payload (JSON) esperado:</Label>
            <CodeBlock code={receiveExample} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Envio de Notificações</CardTitle>
          <CardDescription>
            Configure a URL para a qual o CRM enviará webhooks de notificação (ex: lead atribuído, lead vencido).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={formAction}>
            <Label htmlFor="send_url">Sua URL para receber notificações</Label>
            <Input
              id="send_url"
              name="send_url"
              placeholder="https://seu-workflow.n8n.cloud/webhook/..."
              defaultValue={initialConfig.send_url || ""}
            />
            <div className="flex justify-end mt-4">
                <SubmitButton />
            </div>
            {state?.message && <p className="text-sm text-green-600 mt-2">{state.message}</p>}
            {state?.error && <p className="text-sm text-red-600 mt-2">{state.error}</p>}
          </form>
           <div>
            <Label>Exemplo de Payload (JSON) que será enviado:</Label>
            <CodeBlock code={sendExample} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}