const CONSENT_STORAGE_KEY = 'dvsh_employee_pdn_consent_v1';

export function hasStoredEmployeePdnConsent(): boolean {
  try {
    return Boolean(localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function storeEmployeePdnConsent(): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, new Date().toISOString());
  } catch {
    // ignore quota / private mode
  }
}
