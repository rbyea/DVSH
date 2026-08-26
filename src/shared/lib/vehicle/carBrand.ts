export type CarBrand = {
  id: string;
  label: string;
  /** simple-icons slug, if the brand has a public mark */
  slug: string | null;
  letter: string;
};

type BrandSeed = {
  id: string;
  label: string;
  slug: string | null;
  aliases: string[];
};

const BRANDS: BrandSeed[] = [
  {
    id: 'mercedes',
    label: 'Mercedes-Benz',
    slug: 'mercedes',
    aliases: ['mercedes-benz', 'mercedes benz', 'mercedes', 'мерседес-бенц', 'мерседес', 'мерс'],
  },
  {
    id: 'landrover',
    label: 'Land Rover',
    slug: 'landrover',
    aliases: ['land rover', 'landrover', 'ленд ровер', 'лендровер'],
  },
  {
    id: 'greatwall',
    label: 'Great Wall',
    slug: null,
    aliases: ['great wall', 'greatwall', 'грейт вол'],
  },
  {
    id: 'alfa',
    label: 'Alfa Romeo',
    slug: 'alfaromeo',
    aliases: ['alfa romeo', 'alfaromeo', 'альфа ромео'],
  },
  {
    id: 'volkswagen',
    label: 'Volkswagen',
    slug: 'volkswagen',
    aliases: ['volkswagen', 'vw', 'фольксваген', 'фольцваген'],
  },
  {
    id: 'ssangyong',
    label: 'SsangYong',
    slug: null,
    aliases: ['ssangyong', 'ссангйонг', 'ссанг йонг'],
  },
  {
    id: 'mitsubishi',
    label: 'Mitsubishi',
    slug: 'mitsubishi',
    aliases: ['mitsubishi', 'митсубиси', 'мицубиси'],
  },
  {
    id: 'chevrolet',
    label: 'Chevrolet',
    slug: 'chevrolet',
    aliases: ['chevrolet', 'шевроле', 'шеви'],
  },
  { id: 'infiniti', label: 'Infiniti', slug: 'infiniti', aliases: ['infiniti', 'инфинити'] },
  { id: 'cadillac', label: 'Cadillac', slug: 'cadillac', aliases: ['cadillac', 'кадиллак'] },
  {
    id: 'hyundai',
    label: 'Hyundai',
    slug: 'hyundai',
    aliases: ['hyundai', 'хендай', 'хундай', 'хендэ'],
  },
  { id: 'toyota', label: 'Toyota', slug: 'toyota', aliases: ['toyota', 'тойота'] },
  { id: 'bmw', label: 'BMW', slug: 'bmw', aliases: ['bmw', 'бмв'] },
  { id: 'kia', label: 'Kia', slug: 'kia', aliases: ['kia', 'киа'] },
  { id: 'nissan', label: 'Nissan', slug: 'nissan', aliases: ['nissan', 'ниссан'] },
  { id: 'honda', label: 'Honda', slug: 'honda', aliases: ['honda', 'хонда'] },
  { id: 'ford', label: 'Ford', slug: 'ford', aliases: ['ford', 'форд'] },
  { id: 'audi', label: 'Audi', slug: 'audi', aliases: ['audi', 'ауди'] },
  { id: 'mazda', label: 'Mazda', slug: 'mazda', aliases: ['mazda', 'мазда'] },
  { id: 'renault', label: 'Renault', slug: 'renault', aliases: ['renault', 'рено'] },
  { id: 'skoda', label: 'Skoda', slug: 'skoda', aliases: ['skoda', 'škoda', 'шкода'] },
  { id: 'volvo', label: 'Volvo', slug: 'volvo', aliases: ['volvo', 'вольво'] },
  { id: 'lexus', label: 'Lexus', slug: 'lexus', aliases: ['lexus', 'лексус'] },
  { id: 'porsche', label: 'Porsche', slug: 'porsche', aliases: ['porsche', 'порше'] },
  { id: 'suzuki', label: 'Suzuki', slug: 'suzuki', aliases: ['suzuki', 'сузуки'] },
  { id: 'subaru', label: 'Subaru', slug: 'subaru', aliases: ['subaru', 'субару'] },
  { id: 'peugeot', label: 'Peugeot', slug: 'peugeot', aliases: ['peugeot', 'пежо'] },
  { id: 'citroen', label: 'Citroën', slug: 'citroen', aliases: ['citroen', 'citroën', 'ситроен'] },
  { id: 'fiat', label: 'Fiat', slug: 'fiat', aliases: ['fiat', 'фиат'] },
  { id: 'opel', label: 'Opel', slug: 'opel', aliases: ['opel', 'опель'] },
  { id: 'jeep', label: 'Jeep', slug: 'jeep', aliases: ['jeep', 'джип'] },
  { id: 'jaguar', label: 'Jaguar', slug: 'jaguar', aliases: ['jaguar', 'ягуар'] },
  { id: 'mini', label: 'MINI', slug: 'mini', aliases: ['mini', 'мини'] },
  { id: 'tesla', label: 'Tesla', slug: 'tesla', aliases: ['tesla', 'тесла'] },
  { id: 'geely', label: 'Geely', slug: null, aliases: ['geely', 'джили'] },
  { id: 'chery', label: 'Chery', slug: null, aliases: ['chery', 'чери'] },
  { id: 'haval', label: 'Haval', slug: null, aliases: ['haval', 'хавал'] },
  { id: 'changan', label: 'Changan', slug: null, aliases: ['changan', 'чанган'] },
  { id: 'exeed', label: 'Exeed', slug: null, aliases: ['exeed', 'эксид'] },
  { id: 'tank', label: 'Tank', slug: null, aliases: ['tank', 'танк'] },
  { id: 'omoda', label: 'Omoda', slug: null, aliases: ['omoda', 'омода'] },
  { id: 'jaecoo', label: 'Jaecoo', slug: null, aliases: ['jaecoo', 'джеку'] },
  { id: 'byd', label: 'BYD', slug: null, aliases: ['byd'] },
  { id: 'lada', label: 'Lada', slug: null, aliases: ['lada', 'ваз', 'лада'] },
  { id: 'uaz', label: 'UAZ', slug: null, aliases: ['uaz', 'уаз'] },
  { id: 'gaz', label: 'GAZ', slug: null, aliases: ['gaz', 'газ'] },
  { id: 'moskvich', label: 'Москвич', slug: null, aliases: ['moskvich', 'москвич'] },
  { id: 'genesis', label: 'Genesis', slug: 'genesis', aliases: ['genesis', 'генезис'] },
  { id: 'acura', label: 'Acura', slug: 'acura', aliases: ['acura', 'акура'] },
  { id: 'dodge', label: 'Dodge', slug: 'dodge', aliases: ['dodge', 'додж'] },
  { id: 'chrysler', label: 'Chrysler', slug: 'chrysler', aliases: ['chrysler', 'крайслер'] },
];

function normalizeBrandText(value: string): string {
  return value
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replaceAll(/[-_/.,]/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

const ALIAS_INDEX = BRANDS.flatMap((brand) =>
  brand.aliases.map((alias) => ({
    alias: normalizeBrandText(alias),
    brand,
  })),
).sort((left, right) => right.alias.length - left.alias.length);

export function resolveCarBrand(carModel: string): CarBrand | null {
  const normalized = normalizeBrandText(carModel);

  if (!normalized) {
    return null;
  }

  const match = ALIAS_INDEX.find(
    ({ alias }) => normalized === alias || normalized.startsWith(`${alias} `),
  );

  if (!match) {
    return null;
  }

  return {
    id: match.brand.id,
    label: match.brand.label,
    slug: match.brand.slug,
    letter: match.brand.label.slice(0, 1).toUpperCase(),
  };
}

function toCarBrand(seed: BrandSeed): CarBrand {
  return {
    id: seed.id,
    label: seed.label,
    slug: seed.slug,
    letter: seed.label.slice(0, 1).toUpperCase(),
  };
}

export function listCarBrands(): CarBrand[] {
  return BRANDS.map(toCarBrand).sort((left, right) =>
    left.label.localeCompare(right.label, 'ru', { sensitivity: 'base' }),
  );
}

export function collectCarBrands(carModels: string[]): CarBrand[] {
  const byId = new Map<string, CarBrand>();

  for (const carModel of carModels) {
    const brand = resolveCarBrand(carModel);

    if (brand) {
      byId.set(brand.id, brand);
    }
  }

  return [...byId.values()];
}

export function textStartsWithQuery(text: string, query: string): boolean {
  const normalizedQuery = normalizeBrandText(query);

  if (!normalizedQuery) {
    return true;
  }

  return normalizeBrandText(text).startsWith(normalizedQuery);
}

export function brandStartsWithQuery(brand: CarBrand, query: string): boolean {
  if (!normalizeBrandText(query)) {
    return true;
  }

  const seed = BRANDS.find((item) => item.id === brand.id);
  const haystack = [brand.label, brand.id, ...(seed?.aliases ?? [])];

  return haystack.some((item) => textStartsWithQuery(item, query));
}

export function carModelStartsWithQuery(carModel: string, query: string): boolean {
  if (textStartsWithQuery(carModel, query)) {
    return true;
  }

  const brand = resolveCarBrand(carModel);

  return brand != null && brandStartsWithQuery(brand, query);
}

export function simpleIconsUrl(slug: string): string {
  return `https://cdn.simpleicons.org/${slug}`;
}
