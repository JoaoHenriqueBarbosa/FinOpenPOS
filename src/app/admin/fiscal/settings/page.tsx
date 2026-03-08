"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2Icon, CheckCircleIcon, XCircleIcon, ShieldCheckIcon } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

export default function FiscalSettingsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery(trpc.fiscalSettings.get.queryOptions()) as { data: any; isLoading: boolean };
  const { data: certInfo } = useQuery(trpc.fiscalSettings.certificateInfo.queryOptions()) as { data: any };
  const t = useTranslations("fiscalSettings");
  const tc = useTranslations("common");

  const [certFile, setCertFile] = useState<string | null>(null);
  const [certFileName, setCertFileName] = useState("");
  const [selectedState, setSelectedState] = useState(settings?.state_code ?? "");
  const [cepLoading, setCepLoading] = useState(false);
  const { data: citiesData = [] } = useQuery(
    trpc.cities.listByState.queryOptions(
      { state_code: selectedState },
      { enabled: selectedState.length === 2 }
    )
  );

  const upsertMutation = useMutation(trpc.fiscalSettings.upsert.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.fiscalSettings.get.queryOptions());
      queryClient.invalidateQueries(trpc.fiscalSettings.certificateInfo.queryOptions());
      toast.success(t("saved"));
    },
    onError: () => toast.error(t("saveError")),
  }));

  const testMutation = useMutation(trpc.fiscalSettings.testConnection.mutationOptions({
    onSuccess: (data) => {
      if (data.online) {
        toast.success(t("testSuccess"));
      } else {
        toast.error(`${t("testError")}: ${data.statusMessage}`);
      }
    },
    onError: () => toast.error(t("testError")),
  }));

  const form = useForm({
    defaultValues: {
      company_name: settings?.company_name ?? "",
      trade_name: settings?.trade_name ?? "",
      tax_id: settings?.tax_id ?? "",
      state_tax_id: settings?.state_tax_id ?? "",
      tax_regime: String(settings?.tax_regime ?? "1"),
      state_code: settings?.state_code ?? "",
      city_code: settings?.city_code ?? "",
      city_name: settings?.city_name ?? "",
      street: settings?.street ?? "",
      street_number: settings?.street_number ?? "",
      district: settings?.district ?? "",
      zip_code: settings?.zip_code ?? "",
      address_complement: settings?.address_complement ?? "",
      environment: String(settings?.environment ?? "2"),
      nfe_series: settings?.nfe_series ?? 1,
      nfce_series: settings?.nfce_series ?? 1,
      csc_id: settings?.csc_id ?? "",
      csc_token: settings?.csc_token ?? "",
      certificate_password: "",
      default_ncm: settings?.default_ncm ?? "00000000",
      default_cfop: settings?.default_cfop ?? "5102",
      default_icms_cst: settings?.default_icms_cst ?? "00",
      default_pis_cst: settings?.default_pis_cst ?? "99",
      default_cofins_cst: settings?.default_cofins_cst ?? "99",
    },
    onSubmit: ({ value }) => {
      upsertMutation.mutate({
        company_name: value.company_name,
        trade_name: value.trade_name || undefined,
        tax_id: value.tax_id,
        state_tax_id: value.state_tax_id,
        tax_regime: parseInt(value.tax_regime),
        state_code: value.state_code,
        city_code: value.city_code,
        city_name: value.city_name,
        street: value.street,
        street_number: value.street_number,
        district: value.district,
        zip_code: value.zip_code,
        address_complement: value.address_complement || undefined,
        environment: parseInt(value.environment),
        nfe_series: value.nfe_series,
        nfce_series: value.nfce_series,
        csc_id: value.csc_id || undefined,
        csc_token: value.csc_token || undefined,
        certificate_pfx_base64: certFile || undefined,
        certificate_password: value.certificate_password || undefined,
        default_ncm: value.default_ncm || undefined,
        default_cfop: value.default_cfop || undefined,
        default_icms_cst: value.default_icms_cst || undefined,
        default_pis_cst: value.default_pis_cst || undefined,
        default_cofins_cst: value.default_cofins_cst || undefined,
      });
    },
  });

  const handleCepLookup = async (cep: string) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const result = await queryClient.fetchQuery(
        trpc.cities.lookupCep.queryOptions({ cep: clean })
      );
      if (result) {
        form.setFieldValue("street", result.street);
        form.setFieldValue("district", result.district);
        form.setFieldValue("state_code", result.state_code);
        form.setFieldValue("city_name", result.city_name);
        if (result.city_code) {
          form.setFieldValue("city_code", result.city_code);
        }
        setSelectedState(result.state_code);
      }
    } catch {}
    setCepLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCertFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setCertFile(base64);
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card><CardHeader><Skeleton className="h-8 w-48" /></CardHeader><CardContent className="space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }}
      className="space-y-6 max-w-3xl"
    >
      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t("companyInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="company_name">
              {(field) => (
                <div className="space-y-2">
                  <Label>{t("companyName")}</Label>
                  <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
                </div>
              )}
            </form.Field>
            <form.Field name="trade_name">
              {(field) => (
                <div className="space-y-2">
                  <Label>{t("tradeName")}</Label>
                  <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
                </div>
              )}
            </form.Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <form.Field name="tax_id">
              {(field) => (
                <div className="space-y-2">
                  <Label>{t("taxId")}</Label>
                  <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} maxLength={14} placeholder="00000000000000" />
                </div>
              )}
            </form.Field>
            <form.Field name="state_tax_id">
              {(field) => (
                <div className="space-y-2">
                  <Label>{t("stateTaxId")}</Label>
                  <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
                </div>
              )}
            </form.Field>
            <form.Field name="tax_regime">
              {(field) => (
                <div className="space-y-2">
                  <Label>{t("taxRegime")}</Label>
                  <Select value={field.state.value} onValueChange={field.handleChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t("taxRegimeSimples")}</SelectItem>
                      <SelectItem value="2">{t("taxRegimeSimplesExcess")}</SelectItem>
                      <SelectItem value="3">{t("taxRegimeNormal")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle>{t("address")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <form.Field name="zip_code">
              {(field) => (
                <div className="space-y-2">
                  <Label>{t("zipCode")}</Label>
                  <div className="relative">
                    <Input
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        if (e.target.value.replace(/\D/g, "").length === 8) {
                          handleCepLookup(e.target.value);
                        }
                      }}
                      maxLength={9}
                      placeholder="80010000"
                    />
                    {cepLoading && <Loader2Icon className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                </div>
              )}
            </form.Field>
            <div className="space-y-2">
              <Label>{t("stateCode")}</Label>
              <Combobox
                items={[
                  { id: "AC", name: "AC - Acre" }, { id: "AL", name: "AL - Alagoas" },
                  { id: "AM", name: "AM - Amazonas" }, { id: "AP", name: "AP - Amapá" },
                  { id: "BA", name: "BA - Bahia" }, { id: "CE", name: "CE - Ceará" },
                  { id: "DF", name: "DF - Distrito Federal" }, { id: "ES", name: "ES - Espírito Santo" },
                  { id: "GO", name: "GO - Goiás" }, { id: "MA", name: "MA - Maranhão" },
                  { id: "MG", name: "MG - Minas Gerais" }, { id: "MS", name: "MS - Mato Grosso do Sul" },
                  { id: "MT", name: "MT - Mato Grosso" }, { id: "PA", name: "PA - Pará" },
                  { id: "PB", name: "PB - Paraíba" }, { id: "PE", name: "PE - Pernambuco" },
                  { id: "PI", name: "PI - Piauí" }, { id: "PR", name: "PR - Paraná" },
                  { id: "RJ", name: "RJ - Rio de Janeiro" }, { id: "RN", name: "RN - Rio Grande do Norte" },
                  { id: "RO", name: "RO - Rondônia" }, { id: "RR", name: "RR - Roraima" },
                  { id: "RS", name: "RS - Rio Grande do Sul" }, { id: "SC", name: "SC - Santa Catarina" },
                  { id: "SE", name: "SE - Sergipe" }, { id: "SP", name: "SP - São Paulo" },
                  { id: "TO", name: "TO - Tocantins" },
                ]}
                placeholder={t("stateCode")}
                onSelect={(id) => {
                  const uf = String(id);
                  form.setFieldValue("state_code", uf);
                  setSelectedState(uf);
                  form.setFieldValue("city_code", "");
                  form.setFieldValue("city_name", "");
                }}
              />
              {form.getFieldValue("state_code") && (
                <p className="text-xs text-muted-foreground">{form.getFieldValue("state_code")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("cityName")}</Label>
              <Combobox
                items={citiesData.map((c) => ({ id: c.id, name: c.name }))}
                placeholder={t("cityName")}
                onSelect={(id) => {
                  const city = citiesData.find((c) => c.id === id);
                  if (city) {
                    form.setFieldValue("city_code", String(city.id));
                    form.setFieldValue("city_name", city.name);
                  }
                }}
              />
              {form.getFieldValue("city_name") && (
                <p className="text-xs text-muted-foreground">
                  {form.getFieldValue("city_name")} ({form.getFieldValue("city_code")})
                </p>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <form.Field name="street">
              {(field) => (
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("street")}</Label>
                  <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
                </div>
              )}
            </form.Field>
            <form.Field name="street_number">
              {(field) => (
                <div className="space-y-2">
                  <Label>{t("streetNumber")}</Label>
                  <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
                </div>
              )}
            </form.Field>
            <form.Field name="district">
              {(field) => (
                <div className="space-y-2">
                  <Label>{t("district")}</Label>
                  <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
                </div>
              )}
            </form.Field>
          </div>
          <form.Field name="address_complement">
            {(field) => (
              <div className="space-y-2">
                <Label>{t("addressComplement")}</Label>
                <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
              </div>
            )}
          </form.Field>
        </CardContent>
      </Card>

      {/* Environment & Numbering */}
      <Card>
        <CardHeader>
          <CardTitle>{t("environment")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form.Field name="environment">
            {(field) => (
              <div className="space-y-2">
                <Label>{t("environment")}</Label>
                <Select value={field.state.value} onValueChange={field.handleChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">{t("homologation")}</SelectItem>
                    <SelectItem value="1">{t("production")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="nfe_series">
              {(field) => (
                <div className="space-y-2">
                  <Label>{t("nfeSeries")}</Label>
                  <Input type="number" value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />
                </div>
              )}
            </form.Field>
            <form.Field name="nfce_series">
              {(field) => (
                <div className="space-y-2">
                  <Label>{t("nfceSeries")}</Label>
                  <Input type="number" value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />
                </div>
              )}
            </form.Field>
          </div>
        </CardContent>
      </Card>

      {/* NFC-e CSC */}
      <Card>
        <CardHeader>
          <CardTitle>{t("nfceSettings")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <form.Field name="csc_id">
            {(field) => (
              <div className="space-y-2">
                <Label>{t("cscId")}</Label>
                <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
              </div>
            )}
          </form.Field>
          <form.Field name="csc_token">
            {(field) => (
              <div className="space-y-2">
                <Label>{t("cscToken")}</Label>
                <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
              </div>
            )}
          </form.Field>
        </CardContent>
      </Card>

      {/* Certificate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5" />
            {t("certificate")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {certInfo && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">{t("certificateUploaded")}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>{t("certificateCommonName")}: {certInfo.commonName}</p>
                <p>{t("certificateExpiry")}: {new Date(certInfo.validUntil).toLocaleDateString()}</p>
              </div>
            </div>
          )}
          {!certInfo && settings?.certificate_pfx !== true && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <XCircleIcon className="h-4 w-4 text-red-500" />
              {t("certificateNotUploaded")}
            </div>
          )}
          <div className="space-y-2">
            <Label>{t("certificateFile")}</Label>
            <div className="flex items-center gap-2">
              <Input type="file" accept=".pfx,.p12" onChange={handleFileChange} className="flex-1" />
              {certFileName && <Badge variant="secondary">{certFileName}</Badge>}
            </div>
          </div>
          <form.Field name="certificate_password">
            {(field) => (
              <div className="space-y-2">
                <Label>{t("certificatePassword")}</Label>
                <Input type="password" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
              </div>
            )}
          </form.Field>
          <Button type="button" variant="outline" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
            {testMutation.isPending && <Loader2Icon className="h-4 w-4 animate-spin mr-2" />}
            {t("testConnection")}
          </Button>
        </CardContent>
      </Card>

      {/* Default Fiscal Fields */}
      <Card>
        <CardHeader>
          <CardTitle>{t("defaults")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <form.Field name="default_ncm">
            {(field) => (
              <div className="space-y-2">
                <Label>{t("defaultNcm")}</Label>
                <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} maxLength={8} />
              </div>
            )}
          </form.Field>
          <form.Field name="default_cfop">
            {(field) => (
              <div className="space-y-2">
                <Label>{t("defaultCfop")}</Label>
                <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} maxLength={4} />
              </div>
            )}
          </form.Field>
          <form.Field name="default_icms_cst">
            {(field) => (
              <div className="space-y-2">
                <Label>{t("defaultIcmsCst")}</Label>
                <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} maxLength={3} />
              </div>
            )}
          </form.Field>
          <form.Field name="default_pis_cst">
            {(field) => (
              <div className="space-y-2">
                <Label>{t("defaultPisCst")}</Label>
                <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} maxLength={2} />
              </div>
            )}
          </form.Field>
          <form.Field name="default_cofins_cst">
            {(field) => (
              <div className="space-y-2">
                <Label>{t("defaultCofinsCst")}</Label>
                <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} maxLength={2} />
              </div>
            )}
          </form.Field>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={upsertMutation.isPending} size="lg">
          {upsertMutation.isPending && <Loader2Icon className="h-4 w-4 animate-spin mr-2" />}
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
