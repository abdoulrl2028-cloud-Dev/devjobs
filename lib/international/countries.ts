// Regiões/países usados nas vagas internacionais.
// As fontes de vagas são APIs/feeds autorizados (Remotive, JSearch, Adzuna)
// e nunca scraping de sites que proíbam.

export type JobRegion =
  | "br"
  | "us"
  | "ca"
  | "gb"
  | "fr"
  | "de"
  | "pt"
  | "es"
  | "it"
  | "africa"
  | "asia"
  | "latam"
  | "other";

export const REGIONS: { code: JobRegion; label: string }[] = [
  { code: "br", label: "Brasil" },
  { code: "us", label: "Estados Unidos" },
  { code: "ca", label: "Canadá" },
  { code: "gb", label: "Reino Unido" },
  { code: "fr", label: "França" },
  { code: "de", label: "Alemanha" },
  { code: "pt", label: "Portugal" },
  { code: "es", label: "Espanha" },
  { code: "it", label: "Itália" },
  { code: "africa", label: "África" },
  { code: "asia", label: "Ásia" },
  { code: "latam", label: "América Latina" },
  { code: "other", label: "Outros países" },
];

const FLAG_BY_REGION: Record<JobRegion, string> = {
  br: "🇧🇷",
  us: "🇺🇸",
  ca: "🇨🇦",
  gb: "🇬🇧",
  fr: "🇫🇷",
  de: "🇩🇪",
  pt: "🇵🇹",
  es: "🇪🇸",
  it: "🇮🇹",
  africa: "🌍",
  asia: "🌏",
  latam: "🌎",
  other: "🌐",
};

// País explícito (ISO2) → região. Sempre prioridade sobre inferência por cidade.
const COUNTRY_TO_REGION: Record<string, JobRegion> = {
  BR: "br",
  US: "us",
  CA: "ca",
  GB: "gb",
  UK: "gb",
  FR: "fr",
  DE: "de",
  PT: "pt",
  ES: "es",
  IT: "it",
  AO: "africa", // Angola
  MZ: "africa", // Moçambique
  CV: "africa", // Cabo Verde
  ZA: "africa",
  NG: "africa",
  KE: "africa",
  GH: "africa",
  EG: "africa",
  MA: "africa",
  TN: "africa",
  SN: "africa",
  CI: "africa",
  ET: "africa",
  IN: "asia",
  CN: "asia",
  JP: "asia",
  KR: "asia",
  SG: "asia",
  AE: "asia",
  IL: "asia",
  TR: "asia",
  ID: "asia",
  MY: "asia",
  TH: "asia",
  VN: "asia",
  PH: "asia",
  PK: "asia",
  BD: "asia",
  LK: "asia",
  AR: "latam",
  MX: "latam",
  CL: "latam",
  CO: "latam",
  PE: "latam",
  UY: "latam",
  EC: "latam",
  VE: "latam",
  BO: "latam",
  PY: "latam",
  CR: "latam",
  PA: "latam",
  DO: "latam",
  CU: "latam",
  AU: "other",
  NZ: "other",
  IE: "other",
  NL: "other",
  BE: "other",
  CH: "other",
  AT: "other",
  SE: "other",
  NO: "other",
  DK: "other",
  FI: "other",
  PL: "other",
  CZ: "other",
  RO: "other",
  GR: "other",
  HU: "other",
  UA: "other",
  RU: "other",
};

// Palavras/padrões de país → região (para textos livres como "Remote - Europe").
const COUNTRY_TEXT_PATTERNS: { re: RegExp; region: JobRegion }[] = [
  { re: /brasil|brazil|são paulo|sao paulo|rio de janeiro|belo horizonte|curitiba|florianópolis|florianopolis|porto alegre|recife|salvador|brasília|brasilia/g, region: "br" },
  { re: /\busa\b|\bunited states|\bus\b|new york|san francisco|california|texas|washington|chicago|austin|seattle|bay area/i, region: "us" },
  { re: /canad|toronto|vancouver|montreal|ottawa/i, region: "ca" },
  { re: /\b(london|england|scotland|wales)\b|united kingdom|uk\b|manchester|leeds|bristol|\bbritain/i, region: "gb" },
  { re: /france|paris|lyon|marseille|bordeaux/i, region: "fr" },
  { re: /germany|berlin|munich|munique|hamburg|frankfurt|cologne|dresden|leipzig|stuttgart/i, region: "de" },
  { re: /portugal|lisbon|lisboa|porto|braga|coimbra/i, region: "pt" },
  { re: /spain|madrid|barcelona|bilbao|valencia|seville|sevilla/i, region: "es" },
  { re: /italy|italia|milano|milan|roma|rome|turin|torino|nápoles|naples|florence/i, region: "it" },
  { re: /africa|lagos|nairobi|accra|cairo|casablanca|johannesburg|cape town|addington|luanda|maputo/i, region: "africa" },
  { re: /asia|india|bangalore|mumbai|delhi|singapore|tokyo|shanghai|hong kong|seoul|beijing|dubai|abu dhabi|manila|jakarta|bangkok|hanoi|tel aviv/i, region: "asia" },
  { re: /latin america|latam|mexico|mexico city|buenos aires|santiago|bogotá|bogota|lima|montevideo|saõ paulo|são paulo/i, region: "latam" },
];

// Cidades internacionais → país (código ISO2 de país implícito no texto da vaga).
const CITY_TO_COUNTRY: Record<string, string> = {
  "new york": "US",
  "san francisco": "US",
  "los angeles": "US",
  chicago: "US",
  austin: "US",
  seattle: "US",
  boston: "US",
  toronto: "CA",
  vancouver: "CA",
  montreal: "CA",
  ottawa: "CA",
  london: "GB",
  manchester: "GB",
  bristol: "GB",
  paris: "FR",
  lyon: "FR",
  berlin: "DE",
  "munique": "DE",
  munich: "DE",
  hamburg: "DE",
  frankfurt: "DE",
  lisbon: "PT",
  lisboa: "PT",
  porto: "PT",
  braga: "PT",
  madrid: "ES",
  barcelona: "ES",
  milan: "IT",
  milano: "IT",
  rome: "IT",
  roma: "IT",
  nairobi: "KE",
  lagos: "NG",
  accra: "GH",
  cairo: "EG",
  casablanca: "MA",
  johannesburg: "ZA",
  "cape town": "ZA",
  luanda: "AO",
  maputo: "MZ",
  prague: "CZ",
  warsaw: "PL",
  amsterdam: "NL",
  dublin: "IE",
  zurich: "CH",
  stockholm: "SE",
  oslo: "NO",
  copenhagen: "DK",
  helsinki: "FI",
  bangalore: "IN",
  mumbai: "IN",
  delhi: "IN",
  singapore: "SG",
  tokyo: "JP",
  osaka: "JP",
  shanghai: "CN",
  beijing: "CN",
  "hong kong": "HK",
  seoul: "KR",
  dubai: "AE",
  "abu dhabi": "AE",
  "tel aviv": "IL",
  manila: "PH",
  jakarta: "ID",
  bangkok: "TH",
  hanoi: "VN",
  mexico: "MX",
  "mexico city": "MX",
  "buenos aires": "AR",
  santiago: "CL",
  bogotá: "CO",
  bogota: "CO",
  lima: "PE",
  montevideo: "UY",
};

export function regionLabel(region: JobRegion | null | undefined): string {
  return REGIONS.find((r) => r.code === region)?.label ?? "Outros países";
}

export function flagFor(region: JobRegion | null | undefined, country?: string | null): string {
  if (country && COUNTRY_TO_REGION[country.toUpperCase()]) {
    return FLAG_BY_REGION[COUNTRY_TO_REGION[country.toUpperCase()]] ?? "🌐";
  }
  return region ? (FLAG_BY_REGION[region] ?? "🌐") : "🌐";
}

export function regionFromCountryCode(country: string | null | undefined): JobRegion | null {
  if (!country) return null;
  const code = country.trim().toUpperCase();
  return COUNTRY_TO_REGION[code] ?? null;
}

export function flipRegionForLocation(location: string | null | undefined): JobRegion | null {
  if (!location) return null;
  for (const p of COUNTRY_TEXT_PATTERNS) {
    if (p.re.test(location)) return p.region;
  }
  return null;
}

// Infere país/região a partir de textos livres ("Remote - Europe, São Paulo, BERLIN, UK, França").
export function inferCountry(text: string | null | undefined): { country: string | null; region: JobRegion | null } {
  if (!text) return { country: null, region: null };
  const lower = normalize(text);

  const codeMatch = lower.match(/\b([a-z]{2})\b/g);
  const tokens = new Set(codeMatch ?? []);
  const region = COUNTRY_TEXT_PATTERNS.find((p) => p.re.test(lower))?.region ?? null;

  // País explícito por padrão de texto completo.
  const countryText: Record<string, string> = {
    brasil: "BR", brazil: "BR", "united states": "US", usa: "US", "estados unidos": "US",
    canadá: "CA", canada: "CA",
    "reino unido": "GB", uk: "GB", britain: "GB", england: "GB",
    frança: "FR", france: "FR",
    alemanha: "DE", germany: "DE",
    portugal: "PT",
    espanha: "ES", spain: "ES",
    itália: "IT", italia: "IT", italy: "IT",
    angola: "AO", moçambique: "MZ", "cabo verde": "CV", nigeria: "NG", nigéria: "NG",
    quênia: "KE", quenia: "KE", kenya: "KE", gana: "GH", ghana: "GH",
    marrocos: "MA", "áfrica do sul": "ZA", "africa do sul": "ZA", south: "ZA",
    egito: "EG", egypt: "EG",
    índia: "IN", india: "IN", china: "CN", japão: "JP", japao: "JP", japan: "JP",
    "coreia do sul": "KR", singapura: "SG", singapore: "SG",
    emirados: "AE", "emiratos": "AE",
    méxico: "MX", mexico: "MX", argentina: "AR", chile: "CL", colômbia: "CO", colombia: "CO",
    peru: "PE", uruguai: "UY", uruguay: "UY",
    austrália: "AU", australia: "AU",
  };
  const words = lower.split(/[^a-zà-ú]+/).filter(Boolean);
  for (const word of words) {
    const hit = countryText[word];
    if (hit) return { country: hit, region: regionFromCountryCode(hit) ?? region };
  }

  // Nome de país por prefixo (evita "us" colidir com "usuario").
  for (const w of ["united states", "reino unido", "áfrica do sul", "africa do sul", "coreia do sul", "cabo verde", "hong kong", "abu dhabi", "estados unidos", "são paulo"]) {
    if (lower.includes(w)) {
      const hit = countryText[w];
      if (hit) return { country: hit, region: regionFromCountryCode(hit) ?? region };
    }
  }

  return { country: null, region };
}

// Normaliza texto para busca simples.
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export { COUNTRY_TO_REGION, CITY_TO_COUNTRY, FLAG_BY_REGION };