/** Chassis / frame number (номер шасси) when VIN is missing. */
const CHASSIS_CHAR_PATTERN = /[^A-Z0-9-]/g;

/** Uppercase chassis number, strip invalid chars, max 25. */
export function formatChassisNumberInput(value: string): string {
  return value.toUpperCase().replace(CHASSIS_CHAR_PATTERN, '').slice(0, 25);
}

export function isValidChassisNumber(value: string): boolean {
  const formatted = formatChassisNumberInput(value);
  return formatted.length >= 5 && formatted.length <= 25;
}
