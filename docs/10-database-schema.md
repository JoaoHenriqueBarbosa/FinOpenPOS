# Database Schema (Fiscal)

## Overview

The fiscal module adds 4 tables to the PGLite database (Drizzle ORM). All tables are multi-tenant, keyed by `user_uid`. The schema follows the convention: monetary values in cents (integer), names in snake_case.

**File**: `src/lib/db/schema.ts`

## Tables

### fiscalSettings

One row per user. Stores company info, certificate, SEFAZ configuration, and default tax codes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial PK | Auto-increment ID |
| `user_uid` | text UNIQUE | User identifier (multi-tenancy key) |
| **Company** | | |
| `company_name` | text | Razao Social |
| `trade_name` | text | Nome Fantasia (optional) |
| `tax_id` | text | CNPJ (14 digits) |
| `state_tax_id` | text | Inscricao Estadual (IE) |
| `tax_regime` | text | CRT: "1" (Simples), "2" (excess), "3" (Normal) |
| **Address** | | |
| `state_code` | text | UF (e.g. "SP") |
| `city_code` | text | IBGE city code |
| `city_name` | text | City name |
| `street` | text | Logradouro |
| `street_number` | text | Number |
| `district` | text | Bairro |
| `zip_code` | text | CEP (8 digits) |
| `address_complement` | text | Complemento (optional) |
| **SEFAZ** | | |
| `environment` | text | "1" (production) or "2" (homologation) |
| `nfe_series` | integer | NF-e series (default 1) |
| `nfce_series` | integer | NFC-e series (default 1) |
| `next_nfe_number` | integer | Next NF-e number counter |
| `next_nfce_number` | integer | Next NFC-e number counter |
| **NFC-e Security** | | |
| `csc_id` | text | CSC identifier (for QR code) |
| `csc_token` | text | CSC secret token |
| **Certificate** | | |
| `certificate_pfx` | bytea | Raw PFX binary (nullable) |
| `certificate_password` | text | PFX password (nullable) |
| `certificate_valid_until` | timestamp | Certificate expiry date |
| **Defaults** | | |
| `default_ncm` | text | Default NCM code for products |
| `default_cfop` | text | Default CFOP (e.g. "5102") |
| `default_icms_cst` | text | Default ICMS CST (e.g. "00") |
| `default_pis_cst` | text | Default PIS CST (e.g. "99") |
| `default_cofins_cst` | text | Default COFINS CST (e.g. "99") |

### invoices

One row per issued invoice. Tracks the complete lifecycle from pending to authorized/cancelled.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial PK | |
| `user_uid` | text | Multi-tenancy key |
| `order_id` | integer FK | Reference to orders table |
| `model` | integer | 55 (NF-e) or 65 (NFC-e) |
| `series` | integer | Series number |
| `number` | integer | Invoice sequential number |
| `access_key` | text | 44-digit chave de acesso |
| `operation_nature` | text | Natureza da operacao (e.g. "Venda") |
| `operation_type` | integer | 0 (entrada) or 1 (saida) |
| `status` | text | pending, authorized, rejected, cancelled, denied, contingency, voided |
| `environment` | integer | 1 or 2 |
| **XML Storage** | | |
| `request_xml` | text | Signed XML sent to SEFAZ |
| `response_xml` | text | Raw SEFAZ response |
| `protocol_xml` | text | nfeProc (NFe + protNFe) |
| **SEFAZ Response** | | |
| `protocol_number` | text | nProt from SEFAZ |
| `status_code` | integer | cStat (100=authorized, etc.) |
| `status_message` | text | xMotivo |
| **Timestamps** | | |
| `issued_at` | timestamp | When XML was generated |
| `authorized_at` | timestamp | When SEFAZ authorized |
| **Contingency** | | |
| `is_contingency` | boolean | Was issued in contingency mode |
| `contingency_type` | text | svc-an, svc-rs, offline |
| `contingency_at` | timestamp | When contingency was activated |
| `contingency_reason` | text | Reason for contingency |
| **Recipient** | | |
| `recipient_tax_id` | text | CPF/CNPJ of recipient |
| `recipient_name` | text | Recipient name |
| `total_amount` | integer | Total in cents |

### invoiceItems

One row per item in an invoice.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial PK | |
| `invoice_id` | integer FK | Reference to invoices |
| `product_id` | integer FK | Reference to products (optional) |
| `item_number` | integer | nItem (1-based position) |
| `product_code` | text | cProd |
| `description` | text | xProd |
| `ncm` | text | NCM code (8 digits) |
| `cfop` | text | CFOP code (4 digits) |
| `unit_of_measure` | text | uCom (e.g. "UN", "KG") |
| `quantity` | integer | ×1000 (1500 = 1.500) |
| `unit_price` | integer | Cents (1050 = R$10.50) |
| `total_price` | integer | Cents |
| `icms_cst` | text | ICMS CST code |
| `icms_rate` | integer | ×100 (1800 = 18.00%) |
| `icms_amount` | integer | Cents |
| `pis_cst` | text | PIS CST code |
| `cofins_cst` | text | COFINS CST code |

### invoiceEvents

Audit log for invoice lifecycle events (cancellation, voiding, etc.).

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial PK | |
| `invoice_id` | integer FK | Reference to invoices |
| `event_type` | text | "cancellation", "voiding", etc. |
| `sequence` | integer | nSeqEvento |
| `protocol_number` | text | nProt from SEFAZ response |
| `status_code` | integer | cStat |
| `reason` | text | xJust |
| `request_xml` | text | Signed event XML |
| `response_xml` | text | SEFAZ event response |
| `created_at` | timestamp | Event timestamp |

### cities (Reference)

IBGE city codes, seeded from the IBGE API (~5570 rows).

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer PK | IBGE city code |
| `name` | text | City name |
| `state_code` | text | UF (e.g. "SP") |

### products (Extended)

The existing products table was extended with optional fiscal fields:

| Column | Type | Description |
|--------|------|-------------|
| `ncm` | text | NCM code (nullable, uses default from settings) |
| `cfop` | text | CFOP code (nullable) |
| `icms_cst` | text | ICMS CST (nullable) |
| `pis_cst` | text | PIS CST (nullable) |
| `cofins_cst` | text | COFINS CST (nullable) |
| `unit_of_measure` | text | Unit (nullable, default "UN") |

## Seeding (`seed.ts`)

The `cities` table is seeded from the IBGE API:

```
https://servicodados.ibge.gov.br/api/v1/localidades/municipios
```

This runs automatically on `bun run dev` (via drizzle-kit push + seed).
