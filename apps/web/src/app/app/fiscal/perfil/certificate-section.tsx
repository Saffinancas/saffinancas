"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Trash2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadCertificate, revokeCertificate } from "@/lib/fiscal/certificates";

type Cert = {
  id: string;
  fileName: string;
  subjectCn: string | null;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  uploadedAt: string;
};

export function CertificateSection({ certificates }: { certificates: Cert[] }) {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Selecione o arquivo .pfx do seu certificado.");
      return;
    }
    if (!password) {
      setError("Informe a senha do certificado.");
      return;
    }
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const base64 = Buffer.from(buf).toString("base64");
      const res = await uploadCertificate({
        fileName: file.name,
        pfxBase64: base64,
        password,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setFile(null);
      setPassword("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revogar este certificado? Ele não será mais usado pra emissão.")) return;
    await revokeCertificate(id);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[var(--color-primary)]" />
          Certificado digital A1 (.pfx)
        </CardTitle>
        <CardDescription>
          Necessário apenas se você usar <strong>PBH direto</strong>. Providers como Focus NFe
          ou PlugNotas gerenciam o certificado por você. O arquivo + senha ficam criptografados
          AES-256-GCM no nosso banco e nunca são exibidos de volta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleUpload} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-file">Arquivo .pfx</Label>
              <input
                id="c-file"
                type="file"
                accept=".pfx,application/x-pkcs12"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm file:mr-3 file:rounded-[var(--radius)] file:border file:border-[var(--color-border)] file:bg-[var(--color-surface-muted)] file:px-3 file:py-2 file:text-sm file:cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-pwd">Senha do certificado</Label>
              <Input
                id="c-pwd"
                type="password"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          {error && (
            <p className="rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] px-3 py-2 text-xs text-[var(--color-expense)]">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Enviar certificado
          </Button>
        </form>

        {certificates.length > 0 && (
          <div className="border-t border-[var(--color-border)] pt-4">
            <p className="mb-2 text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">
              Certificados carregados
            </p>
            <ul className="space-y-2">
              {certificates.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{c.fileName}</p>
                    <p className="text-[10px] text-[var(--color-fg-subtle)]">
                      {c.subjectCn ?? "—"} ·{" "}
                      {c.validUntil
                        ? `válido até ${new Date(c.validUntil).toLocaleDateString("pt-BR")}`
                        : "validade não informada"}{" "}
                      · enviado em {new Date(c.uploadedAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.isActive ? (
                      <Badge variant="income">ativo</Badge>
                    ) : (
                      <Badge variant="default">revogado</Badge>
                    )}
                    {c.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(c.id)}
                        className="text-[var(--color-expense)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
