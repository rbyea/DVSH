/** VIN excludes I, O, Q per ISO 3779. */
const VIN_CHAR_PATTERN = /[^A-HJ-NPR-Z0-9]/g;

/** Uppercase VIN, strip invalid chars, max 17. */
export function formatVinInput(value: string): string {
  return value.toUpperCase().replace(VIN_CHAR_PATTERN, '').slice(0, 17);
}

export function isValidVin(value: string): boolean {
  return formatVinInput(value).length === 17;
}
