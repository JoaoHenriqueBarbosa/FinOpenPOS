/**
 * Address result from a CEP (zip code) lookup.
 *
 * [pt-BR] Resultado de endereco de uma consulta de CEP.
 */
export interface CepResult {
  /** Zip code / [pt-BR] CEP */
  zip_code: string;
  /** Street name / [pt-BR] Logradouro */
  street: string;
  /** District/neighborhood / [pt-BR] Bairro */
  district: string;
  /** City name / [pt-BR] Nome da cidade */
  city_name: string;
  /** IBGE city code / [pt-BR] Codigo IBGE da cidade */
  city_code: string;
  /** State abbreviation / [pt-BR] Sigla do estado */
  state_code: string;
}

/**
 * Lookup address by CEP using ViaCEP with BrasilAPI as fallback.
 *
 * [pt-BR] Consulta endereco pelo CEP usando ViaCEP com BrasilAPI como fallback.
 */
export async function lookupCep(cep: string): Promise<CepResult | null> {
  const cleanCep = cep.replace(/\D/g, "");
  if (cleanCep.length !== 8) return null;

  // Try ViaCEP first
  try {
    const result = await fetchViaCep(cleanCep);
    if (result) return result;
  } catch {}

  // Fallback to BrasilAPI
  try {
    const result = await fetchBrasilApi(cleanCep);
    if (result) return result;
  } catch {}

  return null;
}

async function fetchViaCep(cep: string): Promise<CepResult | null> {
  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (data.erro) return null;

  return {
    zip_code: cep,
    street: data.logradouro || "",
    district: data.bairro || "",
    city_name: data.localidade || "",
    city_code: data.ibge || "",
    state_code: data.uf || "",
  };
}

async function fetchBrasilApi(cep: string): Promise<CepResult | null> {
  const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;

  const data = await res.json();

  return {
    zip_code: cep,
    street: data.street || "",
    district: data.neighborhood || "",
    city_name: data.city || "",
    city_code: "", // BrasilAPI v2 doesn't return IBGE code
    state_code: data.state || "",
  };
}
