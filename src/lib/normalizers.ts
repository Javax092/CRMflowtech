export function onlyDigits(value?: string | null) {
  return value ? value.replace(/\D/g, "") : null;
}

export function normalizeInstagram(value?: string | null) {
  if (!value) return null;
  const clean = value
    .toLowerCase()
    .replace(/https?:\/\/(www\.)?instagram\.com\//g, "")
    .replace(/[@\s/]/g, "")
    .trim();
  return clean || null;
}

export function normalizeEmail(value?: string | null) {
  const clean = value?.trim().toLowerCase();
  return clean || null;
}

export function normalizeCompanyName(value?: string | null) {
  if (!value) return null;
  const clean = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
  return clean || null;
}

export function normalizeLeadInput<T extends Record<string, unknown>>(data: T) {
  const whatsapp = typeof data.whatsapp === "string" ? onlyDigits(data.whatsapp) : null;
  const instagram = typeof data.instagram === "string" ? normalizeInstagram(data.instagram) : null;
  const email = typeof data.email === "string" ? normalizeEmail(data.email) : null;
  const companyName =
    typeof data.companyName === "string" ? normalizeCompanyName(data.companyName) : null;

  return {
    ...data,
    whatsapp,
    whatsappNormalized: whatsapp,
    instagram,
    instagramNormalized: instagram,
    email,
    emailNormalized: email,
    companyNameNormalized: companyName
  };
}
