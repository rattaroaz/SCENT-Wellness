/** Strip to up to 10 US digits for storage/API. */
export function digitsOnly(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) return d.slice(1, 11);
  return d.slice(0, 10);
}

/** Display as xxx-xxx-xxxx */
export function formatPhoneDisplay(phone: string): string {
  const d = digitsOnly(phone);
  if (d.length === 0) return "";
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Format while typing in an input */
export function formatPhoneInput(value: string): string {
  return formatPhoneDisplay(value);
}
