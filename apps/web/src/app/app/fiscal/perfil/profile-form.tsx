"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertFiscalProfile, type FiscalProfileInput } from "@/lib/fiscal/profile";
import { PROVIDER_LABEL, PROVIDER_DESCRIPTION } from "@/lib/fiscal/provider-meta";

type Address = {
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  cityCode?: string;
  cityName?: string;
  stateCode?: string;
  zipCode?: string;
};

type InitialState = {
  documentType: "PF" | "PJ";
  documentNumber: string;
  legalName: string;
  tradeName: string | null;
  municipalInscription: string | null;
  stateInscription: string | null;
  cityCode: string;
  cityName: string;
  stateCode: string;
  address: Record<string, string>;
  contactEmail: string | null;
  contactPhone: string | null;
  regime: string;
  preferredProvider: string;
  environment: "homologacao" | "producao";
};

export function ProfileForm({ initial }: { initial: InitialState | null }) {
  const router = useRouter();
  const [docType, setDocType] = React.useState<"PF" | "PJ">(initial?.documentType ?? "PJ");
  const [docNumber, setDocNumber] = React.useState(initial?.documentNumber ?? "");
  const [legalName, setLegalName] = React.useState(initial?.legalName ?? "");
  const [tradeName, setTradeName] = React.useState(initial?.tradeName ?? "");
  const [im, setIm] = React.useState(initial?.municipalInscription ?? "");
  const [cityCode, setCityCode] = React.useState(initial?.cityCode ?? "3106200");
  const [cityName, setCityName] = React.useState(initial?.cityName ?? "Belo Horizonte");
  const [stateCode, setStateCode] = React.useState(initial?.stateCode ?? "MG");
  const [address, setAddress] = React.useState<Address>(initial?.address ?? {});
  const [email, setEmail] = React.useState(initial?.contactEmail ?? "");
  const [phone, setPhone] = React.useState(initial?.contactPhone ?? "");
  const [regime, setRegime] = React.useState(initial?.regime ?? "simples_nacional");
  const [provider, setProvider] = React.useState(initial?.preferredProvider ?? "sim");
  const [environment, setEnvironment] = React.useState<"homologacao" | "producao">(
    initial?.environment ?? "homologacao",
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!docNumber || !legalName) {
      setError("Informe documento e razão social.");
      return;
    }
    setLoading(true);
    try {
      await upsertFiscalProfile({
        documentType: docType,
        documentNumber: docNumber,
        legalName,
        tradeName: tradeName || null,
        municipalInscription: im || null,
        cityCode,
        cityName,
        stateCode,
        address: {
          street: address.street ?? "",
          number: address.number ?? "",
          complement: address.complement,
          district: address.district ?? "",
          cityCode,
          cityName,
          stateCode,
          zipCode: address.zipCode ?? "",
        },
        contactEmail: email || null,
        contactPhone: phone || null,
        regime: regime as FiscalProfileInput["regime"],
        preferredProvider: provider as FiscalProfileInput["preferredProvider"],
        environment,
      });
      setSavedAt(Date.now());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-doctype">Tipo</Label>
          <select
            id="p-doctype"
            aria-label="Tipo de documento"
            value={docType}
            onChange={(e) => setDocType(e.target.value as "PF" | "PJ")}
            className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
          >
            <option value="PJ">CNPJ</option>
            <option value="PF">CPF</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-doc">{docType === "PJ" ? "CNPJ" : "CPF"}</Label>
          <Input
            id="p-doc"
            required
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value)}
            placeholder={docType === "PJ" ? "00.000.000/0001-00" : "000.000.000-00"}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-legal">Razão social / Nome completo</Label>
          <Input
            id="p-legal"
            required
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-trade">Nome fantasia</Label>
          <Input
            id="p-trade"
            value={tradeName}
            onChange={(e) => setTradeName(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-im">Inscrição Municipal</Label>
          <Input id="p-im" value={im} onChange={(e) => setIm(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-city">Cidade</Label>
          <Input
            id="p-city"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-uf">UF</Label>
          <Input
            id="p-uf"
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value.toUpperCase().slice(0, 2))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p-citycode">Código IBGE do município</Label>
        <Input
          id="p-citycode"
          value={cityCode}
          onChange={(e) => setCityCode(e.target.value.replace(/\D/g, "").slice(0, 7))}
          placeholder="3106200 (Belo Horizonte)"
        />
        <p className="text-[10px] text-[var(--color-fg-subtle)]">
          Lista oficial: ibge.gov.br/explica/codigos-dos-municipios.php
        </p>
      </div>

      <fieldset className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
        <legend className="px-1 text-xs font-medium text-[var(--color-fg-muted)]">Endereço</legend>
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="a-street">Logradouro</Label>
            <Input
              id="a-street"
              value={address.street ?? ""}
              onChange={(e) => setAddress({ ...address, street: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="a-number">Número</Label>
            <Input
              id="a-number"
              value={address.number ?? ""}
              onChange={(e) => setAddress({ ...address, number: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="a-zip">CEP</Label>
            <Input
              id="a-zip"
              value={address.zipCode ?? ""}
              onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="a-district">Bairro</Label>
            <Input
              id="a-district"
              value={address.district ?? ""}
              onChange={(e) => setAddress({ ...address, district: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="a-comp">Complemento</Label>
            <Input
              id="a-comp"
              value={address.complement ?? ""}
              onChange={(e) => setAddress({ ...address, complement: e.target.value })}
            />
          </div>
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-email">E-mail de contato</Label>
          <Input
            id="p-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-phone">Telefone</Label>
          <Input id="p-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-regime">Regime tributário</Label>
          <select
            id="p-regime"
            aria-label="Regime tributário"
            value={regime}
            onChange={(e) => setRegime(e.target.value)}
            className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
          >
            <option value="mei">MEI</option>
            <option value="simples_nacional">Simples Nacional</option>
            <option value="lucro_presumido">Lucro Presumido</option>
            <option value="lucro_real">Lucro Real</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-env">Ambiente</Label>
          <select
            id="p-env"
            aria-label="Ambiente"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as "homologacao" | "producao")}
            className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
          >
            <option value="homologacao">Homologação (testes)</option>
            <option value="producao">Produção (notas reais)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p-provider">Provider de emissão</Label>
        <select
          id="p-provider"
          aria-label="Provider de emissão"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
        >
          {Object.entries(PROVIDER_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-[var(--color-fg-subtle)]">
          {PROVIDER_DESCRIPTION[provider as keyof typeof PROVIDER_DESCRIPTION]}
        </p>
      </div>

      {error && (
        <p className="rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] px-3 py-2 text-xs text-[var(--color-expense)]">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar perfil
        </Button>
        {savedAt && Date.now() - savedAt < 5000 && (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--color-income)]">
            <Check className="h-3 w-3" /> Salvo.
          </span>
        )}
      </div>
    </form>
  );
}
