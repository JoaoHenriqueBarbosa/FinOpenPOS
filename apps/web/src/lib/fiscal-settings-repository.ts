import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { fiscalSettings } from "@/lib/db/schema";
import type { FiscalSettings, SefazEnvironment, InvoiceModel } from "@finopenpos/fiscal";

/**
 * Load fiscal settings for a given user, mapping the DB row to the
 * domain FiscalSettings type.
 */
export async function loadFiscalSettings(
  userUid: string
): Promise<FiscalSettings | null> {
  const result = await db
    .select()
    .from(fiscalSettings)
    .where(eq(fiscalSettings.user_uid, userUid))
    .limit(1);

  if (result.length === 0) return null;

  const row = result[0];
  return {
    id: row.id,
    userUid: row.user_uid,
    companyName: row.company_name,
    tradeName: row.trade_name,
    taxId: row.tax_id,
    stateTaxId: row.state_tax_id,
    taxRegime: row.tax_regime as 1 | 2 | 3,
    stateCode: row.state_code,
    cityCode: row.city_code,
    cityName: row.city_name,
    street: row.street,
    streetNumber: row.street_number,
    district: row.district,
    zipCode: row.zip_code,
    addressComplement: row.address_complement,
    environment: row.environment as SefazEnvironment,
    nfeSeries: row.nfe_series ?? 1,
    nfceSeries: row.nfce_series ?? 1,
    nextNfeNumber: row.next_nfe_number ?? 1,
    nextNfceNumber: row.next_nfce_number ?? 1,
    cscId: row.csc_id,
    cscToken: row.csc_token,
    certificatePfx: row.certificate_pfx,
    certificatePassword: row.certificate_password,
    certificateValidUntil: row.certificate_valid_until,
    defaultNcm: row.default_ncm ?? "00000000",
    defaultCfop: row.default_cfop ?? "5102",
    defaultIcmsCst: row.default_icms_cst ?? "00",
    defaultPisCst: row.default_pis_cst ?? "99",
    defaultCofinsCst: row.default_cofins_cst ?? "99",
  };
}

/**
 * Increment the next invoice number for the given model (55=NF-e, 65=NFC-e).
 */
export async function incrementNextNumber(
  userUid: string,
  model: InvoiceModel
): Promise<void> {
  const field =
    model === 65
      ? fiscalSettings.next_nfce_number
      : fiscalSettings.next_nfe_number;

  const current = await db
    .select({ val: field })
    .from(fiscalSettings)
    .where(eq(fiscalSettings.user_uid, userUid))
    .limit(1);

  if (current[0]) {
    const nextVal = (current[0].val ?? 1) + 1;
    await db
      .update(fiscalSettings)
      .set(
        model === 65
          ? { next_nfce_number: nextVal }
          : { next_nfe_number: nextVal }
      )
      .where(eq(fiscalSettings.user_uid, userUid));
  }
}
