export const TURKEY_REGIONS = {
  marmara: {
    label: "Marmara",
    description: "limanlar, metropoller ve güçlü sahne ağlarının kesiştiği bölge",
  },
  ege: {
    label: "Ege",
    description: "kıyı kültürüyle kent anlatılarını aynı ritimde buluşturan bölge",
  },
  akdeniz: {
    label: "Akdeniz",
    description: "yüksek enerjisi, sokak dili ve çok katmanlı şehir kültürüyle öne çıkan bölge",
  },
  icanadolu: {
    label: "İç Anadolu",
    description: "başkentten bozkır kentlerine uzanan bağımsız üretim hattının merkezi",
  },
  karadeniz: {
    label: "Karadeniz",
    description: "kıyı şehirleriyle iç kesimlerin farklı anlatılarını taşıyan bölge",
  },
  doguanadolu: {
    label: "Doğu Anadolu",
    description: "yüksek coğrafyası ve güçlü yerel hafızasıyla özgün hikâyeler üreten bölge",
  },
  guneydogu: {
    label: "Güneydoğu Anadolu",
    description: "köklü kültürel belleği ve genç sahneleriyle yeni sesler çıkaran bölge",
  },
} as const;

export type TurkeyRegionId = keyof typeof TURKEY_REGIONS;

export interface TurkeyCity {
  id: string;
  name: string;
  plate: number;
  region: TurkeyRegionId;
}

export const TURKEY_CITIES = [
  { id: "adana", name: "Adana", plate: 1, region: "akdeniz" },
  { id: "adiyaman", name: "Adıyaman", plate: 2, region: "guneydogu" },
  { id: "afyonkarahisar", name: "Afyonkarahisar", plate: 3, region: "ege" },
  { id: "agri", name: "Ağrı", plate: 4, region: "doguanadolu" },
  { id: "amasya", name: "Amasya", plate: 5, region: "karadeniz" },
  { id: "ankara", name: "Ankara", plate: 6, region: "icanadolu" },
  { id: "antalya", name: "Antalya", plate: 7, region: "akdeniz" },
  { id: "artvin", name: "Artvin", plate: 8, region: "karadeniz" },
  { id: "aydin", name: "Aydın", plate: 9, region: "ege" },
  { id: "balikesir", name: "Balıkesir", plate: 10, region: "marmara" },
  { id: "bilecik", name: "Bilecik", plate: 11, region: "marmara" },
  { id: "bingol", name: "Bingöl", plate: 12, region: "doguanadolu" },
  { id: "bitlis", name: "Bitlis", plate: 13, region: "doguanadolu" },
  { id: "bolu", name: "Bolu", plate: 14, region: "karadeniz" },
  { id: "burdur", name: "Burdur", plate: 15, region: "akdeniz" },
  { id: "bursa", name: "Bursa", plate: 16, region: "marmara" },
  { id: "canakkale", name: "Çanakkale", plate: 17, region: "marmara" },
  { id: "cankiri", name: "Çankırı", plate: 18, region: "icanadolu" },
  { id: "corum", name: "Çorum", plate: 19, region: "karadeniz" },
  { id: "denizli", name: "Denizli", plate: 20, region: "ege" },
  { id: "diyarbakir", name: "Diyarbakır", plate: 21, region: "guneydogu" },
  { id: "edirne", name: "Edirne", plate: 22, region: "marmara" },
  { id: "elazig", name: "Elazığ", plate: 23, region: "doguanadolu" },
  { id: "erzincan", name: "Erzincan", plate: 24, region: "doguanadolu" },
  { id: "erzurum", name: "Erzurum", plate: 25, region: "doguanadolu" },
  { id: "eskisehir", name: "Eskişehir", plate: 26, region: "icanadolu" },
  { id: "gaziantep", name: "Gaziantep", plate: 27, region: "guneydogu" },
  { id: "giresun", name: "Giresun", plate: 28, region: "karadeniz" },
  { id: "gumushane", name: "Gümüşhane", plate: 29, region: "karadeniz" },
  { id: "hakkari", name: "Hakkâri", plate: 30, region: "doguanadolu" },
  { id: "hatay", name: "Hatay", plate: 31, region: "akdeniz" },
  { id: "isparta", name: "Isparta", plate: 32, region: "akdeniz" },
  { id: "mersin", name: "Mersin", plate: 33, region: "akdeniz" },
  { id: "istanbul", name: "İstanbul", plate: 34, region: "marmara" },
  { id: "izmir", name: "İzmir", plate: 35, region: "ege" },
  { id: "kars", name: "Kars", plate: 36, region: "doguanadolu" },
  { id: "kastamonu", name: "Kastamonu", plate: 37, region: "karadeniz" },
  { id: "kayseri", name: "Kayseri", plate: 38, region: "icanadolu" },
  { id: "kirklareli", name: "Kırklareli", plate: 39, region: "marmara" },
  { id: "kirsehir", name: "Kırşehir", plate: 40, region: "icanadolu" },
  { id: "kocaeli", name: "Kocaeli", plate: 41, region: "marmara" },
  { id: "konya", name: "Konya", plate: 42, region: "icanadolu" },
  { id: "kutahya", name: "Kütahya", plate: 43, region: "ege" },
  { id: "malatya", name: "Malatya", plate: 44, region: "doguanadolu" },
  { id: "manisa", name: "Manisa", plate: 45, region: "ege" },
  { id: "kahramanmaras", name: "Kahramanmaraş", plate: 46, region: "akdeniz" },
  { id: "mardin", name: "Mardin", plate: 47, region: "guneydogu" },
  { id: "mugla", name: "Muğla", plate: 48, region: "ege" },
  { id: "mus", name: "Muş", plate: 49, region: "doguanadolu" },
  { id: "nevsehir", name: "Nevşehir", plate: 50, region: "icanadolu" },
  { id: "nigde", name: "Niğde", plate: 51, region: "icanadolu" },
  { id: "ordu", name: "Ordu", plate: 52, region: "karadeniz" },
  { id: "rize", name: "Rize", plate: 53, region: "karadeniz" },
  { id: "sakarya", name: "Sakarya", plate: 54, region: "marmara" },
  { id: "samsun", name: "Samsun", plate: 55, region: "karadeniz" },
  { id: "siirt", name: "Siirt", plate: 56, region: "guneydogu" },
  { id: "sinop", name: "Sinop", plate: 57, region: "karadeniz" },
  { id: "sivas", name: "Sivas", plate: 58, region: "icanadolu" },
  { id: "tekirdag", name: "Tekirdağ", plate: 59, region: "marmara" },
  { id: "tokat", name: "Tokat", plate: 60, region: "karadeniz" },
  { id: "trabzon", name: "Trabzon", plate: 61, region: "karadeniz" },
  { id: "tunceli", name: "Tunceli", plate: 62, region: "doguanadolu" },
  { id: "sanliurfa", name: "Şanlıurfa", plate: 63, region: "guneydogu" },
  { id: "usak", name: "Uşak", plate: 64, region: "ege" },
  { id: "van", name: "Van", plate: 65, region: "doguanadolu" },
  { id: "yozgat", name: "Yozgat", plate: 66, region: "icanadolu" },
  { id: "zonguldak", name: "Zonguldak", plate: 67, region: "karadeniz" },
  { id: "aksaray", name: "Aksaray", plate: 68, region: "icanadolu" },
  { id: "bayburt", name: "Bayburt", plate: 69, region: "karadeniz" },
  { id: "karaman", name: "Karaman", plate: 70, region: "icanadolu" },
  { id: "kirikkale", name: "Kırıkkale", plate: 71, region: "icanadolu" },
  { id: "batman", name: "Batman", plate: 72, region: "guneydogu" },
  { id: "sirnak", name: "Şırnak", plate: 73, region: "guneydogu" },
  { id: "bartin", name: "Bartın", plate: 74, region: "karadeniz" },
  { id: "ardahan", name: "Ardahan", plate: 75, region: "doguanadolu" },
  { id: "igdir", name: "Iğdır", plate: 76, region: "doguanadolu" },
  { id: "yalova", name: "Yalova", plate: 77, region: "marmara" },
  { id: "karabuk", name: "Karabük", plate: 78, region: "karadeniz" },
  { id: "kilis", name: "Kilis", plate: 79, region: "guneydogu" },
  { id: "osmaniye", name: "Osmaniye", plate: 80, region: "akdeniz" },
  { id: "duzce", name: "Düzce", plate: 81, region: "karadeniz" },
] as const satisfies readonly TurkeyCity[];

export const TURKEY_CITY_NAMES = TURKEY_CITIES.map((city) => city.name) as [
  string,
  ...string[],
];

export const TURKEY_CITY_BY_ID = Object.fromEntries(
  TURKEY_CITIES.map((city) => [city.id, city])
) as Record<string, TurkeyCity>;

const CITY_ALIASES: Record<string, string> = {
  afyon: "afyonkarahisar",
  antep: "gaziantep",
  icel: "mersin",
  kmaras: "kahramanmaras",
  maras: "kahramanmaras",
  urfa: "sanliurfa",
};

function compactCityName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function findTurkeyCity(value: string | null | undefined): TurkeyCity | null {
  if (!value) return null;
  const compact = compactCityName(value);
  const directId = CITY_ALIASES[compact] ?? compact;
  if (TURKEY_CITY_BY_ID[directId]) return TURKEY_CITY_BY_ID[directId];

  return (
    TURKEY_CITIES.find((city) => compact.startsWith(city.id) || compact.includes(city.id)) ?? null
  );
}

export function cityDescription(city: TurkeyCity) {
  const region = TURKEY_REGIONS[city.region];
  return `${city.name}, ${region.label} Bölgesi'nde ${region.description}. RapLab TR şehir arşivi, buradan çıkan doğrulanmış sanatçılarla birlikte canlı olarak büyür.`;
}
