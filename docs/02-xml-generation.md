# XML Generation

## Overview

The XML generation layer builds complete, unsigned NF-e/NFC-e XML documents according to the MOC 4.00 specification. After generation, the XML is signed with a digital certificate and sent to SEFAZ.

**Files**: `xml-builder.ts`, `xml-utils.ts`, `complement.ts`

## XML Builder (`xml-builder.ts`)

### Entry point

```typescript
buildInvoiceXml(data: InvoiceBuildData): { xml: string; accessKey: string }
```

### Build flow

1. **State lookup** — Convert UF to IBGE code via `state-codes.ts`
2. **Random code** — Generate 8-digit `cNF` for the access key
3. **Access key** — Build 44-digit key via `AccessKey.build()` with mod-11 check digit
4. **Items loop** — For each item:
   - Call `buildIcmsXml()` → accumulate ICMS totals
   - Call `buildPisXml()`, `buildCofinsXml()`, `buildIpiXml()` as needed
   - Build `<det nItem="N">` with `<prod>` + `<imposto>`
5. **Assemble groups** — `ide`, `emit`, `dest`, `det[]`, `total`, `transp`, `pag`, `infAdic`
6. **Wrap** — `<?xml?><NFe xmlns="..."><infNFe Id="NFe{accessKey}" versao="4.00">...</infNFe></NFe>`

### NF-e XML structure (simplified)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe35..." versao="4.00">
    <ide>...</ide>          <!-- identification: model, series, number, dates -->
    <emit>                  <!-- issuer -->
      <enderEmit>...</enderEmit>
    </emit>
    <dest>                  <!-- recipient (optional for NFC-e) -->
      <enderDest>...</enderDest>
    </dest>
    <det nItem="1">         <!-- item 1 -->
      <prod>...</prod>
      <imposto>
        <ICMS><ICMS00>...</ICMS00></ICMS>
        <PIS><PISAliq>...</PISAliq></PIS>
        <COFINS><COFINSAliq>...</COFINSAliq></COFINS>
      </imposto>
    </det>
    <total>
      <ICMSTot>...</ICMSTot>
    </total>
    <transp>...</transp>    <!-- transport -->
    <pag>...</pag>          <!-- payment -->
    <infAdic>...</infAdic>  <!-- additional info -->
  </infNFe>
</NFe>
```

### Address helper (DRY)

The `buildAddressFields()` helper generates the common address tag sequence (xLgr, nro, xCpl, xBairro, cMun, xMun, UF, CEP, cPais, xPais) used by `enderEmit`, `retirada`, and `entrega`.

```typescript
function buildAddressFields(a: {
  street: string; number: string; complement?: string;
  district: string; cityCode: string; cityName: string;
  stateCode: string; zipCode?: string; includeCountry?: boolean;
}): string[]
```

### Special sections

- **NFref** — Referenced invoices (NF-e, NFC-e, ECF, producer note)
- **Withdrawal/Delivery** — pickup/delivery addresses with TaxId
- **autXML** — Authorized XML access parties
- **retTrib** — Tax retention (PIS, COFINS, CSLL, IRRF retained values)
- **infAdic** — Additional info, contributor/fiscal observations, process references

## XML Utilities (`xml-utils.ts`)

Shared across the module (xml-builder, convert, complement, contingency, qrcode):

```typescript
escapeXml(str)                     // Escape &, <, >, ", '
tag(name, attrs?, children?)       // Build <name attr="v">children</name>
extractXmlTagValue(xml, tagName)   // Regex extract tag text content
```

### tag() behavior

- String children → escaped (`tag("xNome", {}, "Foo & Bar")` → `<xNome>Foo &amp; Bar</xNome>`)
- Array children → concatenated raw (for nesting pre-built tags)
- No children → empty element (`<tag></tag>`)

## Complement (`complement.ts`)

Post-authorization operations on signed XML:

### attachProtocol

```typescript
attachProtocol(requestXml: string, responseXml: string): string
```

Combines the signed NF-e (`<NFe>`) with the SEFAZ protocol response (`<protNFe>`) into the canonical `<nfeProc>` wrapper:

```xml
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>...</NFe>
  <protNFe versao="4.00">
    <infProt>
      <cStat>100</cStat>      <!-- authorized -->
      <nProt>135...</nProt>    <!-- protocol number -->
      ...
    </infProt>
  </protNFe>
</nfeProc>
```

### Validation logic

- Matches `digVal` between request signature and response
- Validates `cStat` is in `VALID_PROTOCOL_STATUSES` (100, 150, etc.)
- Throws on rejection (110, 205, 301, 302, 303) with descriptive error

## TXT-to-XML Conversion (`convert.ts`)

Converts legacy SPED TXT format (pipe-delimited) to NF-e XML. Used for batch import from older systems.

- Supports layouts: LOCAL, LOCAL_V12, LOCAL_V13, SEBRAE
- Field definitions in `txt-structures.ts`
- Validation in `valid-txt.ts`
- Uses its own `xmlTag()` and `addChild()` helpers (simpler than `tag()`)

## Re-exports

`xml-builder.ts` re-exports `tag` and `escapeXml` from `xml-utils.ts` for backward compatibility (tests import `{ tag }` from xml-builder).
