export { formatChassisNumberInput, isValidChassisNumber } from './chassisNumber';
export {
  formatMileageDelta,
  formatMileageKm,
  getMinAllowedMileage,
  resolveMinAllowedMileage,
} from './mileage';
export {
  extractRuLicensePlateParts,
  formatRuLicensePlateInput,
  formatRuLicensePlateMask,
  formatRuLicensePlateMaskedInput,
  isValidRuLicensePlate,
  normalizeRuLicensePlate,
} from './ruLicensePlate';
export { formatVinInput, isValidVin } from './vin';
export {
  resolveCarBrand,
  simpleIconsUrl,
  listCarBrands,
  collectCarBrands,
  brandStartsWithQuery,
  carModelStartsWithQuery,
} from './carBrand';
export type { CarBrand } from './carBrand';
