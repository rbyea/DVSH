/** Keep only digits for RU mobile, normalize to 11 digits starting with 7. */
export function extractRuPhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, '');

  if (digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`;
  }

  if (digits.length > 0 && !digits.startsWith('7')) {
    digits = `7${digits}`;
  }

  return digits.slice(0, 11);
}

/** Format as +7 999 123-45-67 while typing. */
export function formatRuPhoneInput(value: string): string {
  const digits = extractRuPhoneDigits(value);

  if (!digits) {
    return '';
  }

  const rest = digits.slice(1);
  let result = '+7';

  if (rest.length === 0) {
    return result;
  }

  result += ` ${rest.slice(0, 3)}`;

  if (rest.length <= 3) {
    return result;
  }

  result += ` ${rest.slice(3, 6)}`;

  if (rest.length <= 6) {
    return result;
  }

  result += `-${rest.slice(6, 8)}`;

  if (rest.length <= 8) {
    return result;
  }

  return `${result}-${rest.slice(8, 10)}`;
}

export function isValidRuPhone(value: string): boolean {
  return extractRuPhoneDigits(value).length === 11;
}
