export function currency(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value));
}

export function date(value?: Date | string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}

export function dateTimeInput(value?: Date | string | null) {
  if (!value) return "";
  const dateValue = new Date(value);
  return dateValue.toISOString().slice(0, 10);
}
