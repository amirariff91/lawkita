// Malaysian States and Major Cities

export interface StateDefinition {
  name: string;
  slug: string;
  code: string;
  cities: CityDefinition[];
}

export interface CityDefinition {
  name: string;
  slug: string;
}

export const MALAYSIAN_STATES: StateDefinition[] = [
  {
    name: "Kuala Lumpur",
    slug: "kuala-lumpur",
    code: "KL",
    cities: [
      { name: "Kuala Lumpur City Centre", slug: "city-centre" },
      { name: "Bangsar", slug: "bangsar" },
      { name: "Mont Kiara", slug: "mont-kiara" },
      { name: "Bukit Bintang", slug: "bukit-bintang" },
      { name: "Cheras", slug: "cheras" },
      { name: "Kepong", slug: "kepong" },
      { name: "Wangsa Maju", slug: "wangsa-maju" },
      { name: "Sentul", slug: "sentul" },
      { name: "Titiwangsa", slug: "titiwangsa" },
    ],
  },
  {
    name: "Selangor",
    slug: "selangor",
    code: "SLG",
    cities: [
      { name: "Petaling Jaya", slug: "petaling-jaya" },
      { name: "Shah Alam", slug: "shah-alam" },
      { name: "Subang Jaya", slug: "subang-jaya" },
      { name: "Klang", slug: "klang" },
      { name: "Kajang", slug: "kajang" },
      { name: "Ampang", slug: "ampang" },
      { name: "Puchong", slug: "puchong" },
      { name: "Cyberjaya", slug: "cyberjaya" },
      { name: "Rawang", slug: "rawang" },
      { name: "Serdang", slug: "serdang" },
      { name: "Sepang", slug: "sepang" },
      { name: "Bangi", slug: "bangi" },
    ],
  },
  {
    name: "Penang",
    slug: "penang",
    code: "PNG",
    cities: [
      { name: "George Town", slug: "george-town" },
      { name: "Butterworth", slug: "butterworth" },
      { name: "Bayan Lepas", slug: "bayan-lepas" },
      { name: "Bukit Mertajam", slug: "bukit-mertajam" },
      { name: "Jelutong", slug: "jelutong" },
      { name: "Tanjung Bungah", slug: "tanjung-bungah" },
    ],
  },
  {
    name: "Johor",
    slug: "johor",
    code: "JHR",
    cities: [
      { name: "Johor Bahru", slug: "johor-bahru" },
      { name: "Iskandar Puteri", slug: "iskandar-puteri" },
      { name: "Batu Pahat", slug: "batu-pahat" },
      { name: "Muar", slug: "muar" },
      { name: "Kluang", slug: "kluang" },
      { name: "Pontian", slug: "pontian" },
      { name: "Segamat", slug: "segamat" },
      { name: "Kulai", slug: "kulai" },
    ],
  },
  {
    name: "Perak",
    slug: "perak",
    code: "PRK",
    cities: [
      { name: "Ipoh", slug: "ipoh" },
      { name: "Taiping", slug: "taiping" },
      { name: "Teluk Intan", slug: "teluk-intan" },
      { name: "Sitiawan", slug: "sitiawan" },
      { name: "Kampar", slug: "kampar" },
      { name: "Lumut", slug: "lumut" },
    ],
  },
  {
    name: "Negeri Sembilan",
    slug: "negeri-sembilan",
    code: "NS",
    cities: [
      { name: "Seremban", slug: "seremban" },
      { name: "Port Dickson", slug: "port-dickson" },
      { name: "Nilai", slug: "nilai" },
      { name: "Rembau", slug: "rembau" },
    ],
  },
  {
    name: "Melaka",
    slug: "melaka",
    code: "MLK",
    cities: [
      { name: "Melaka City", slug: "melaka-city" },
      { name: "Alor Gajah", slug: "alor-gajah" },
      { name: "Jasin", slug: "jasin" },
      { name: "Ayer Keroh", slug: "ayer-keroh" },
    ],
  },
  {
    name: "Pahang",
    slug: "pahang",
    code: "PHG",
    cities: [
      { name: "Kuantan", slug: "kuantan" },
      { name: "Temerloh", slug: "temerloh" },
      { name: "Bentong", slug: "bentong" },
      { name: "Raub", slug: "raub" },
      { name: "Cameron Highlands", slug: "cameron-highlands" },
    ],
  },
  {
    name: "Terengganu",
    slug: "terengganu",
    code: "TRG",
    cities: [
      { name: "Kuala Terengganu", slug: "kuala-terengganu" },
      { name: "Kemaman", slug: "kemaman" },
      { name: "Dungun", slug: "dungun" },
      { name: "Marang", slug: "marang" },
    ],
  },
  {
    name: "Kelantan",
    slug: "kelantan",
    code: "KTN",
    cities: [
      { name: "Kota Bharu", slug: "kota-bharu" },
      { name: "Pasir Mas", slug: "pasir-mas" },
      { name: "Tumpat", slug: "tumpat" },
      { name: "Tanah Merah", slug: "tanah-merah" },
    ],
  },
  {
    name: "Kedah",
    slug: "kedah",
    code: "KDH",
    cities: [
      { name: "Alor Setar", slug: "alor-setar" },
      { name: "Sungai Petani", slug: "sungai-petani" },
      { name: "Kulim", slug: "kulim" },
      { name: "Langkawi", slug: "langkawi" },
      { name: "Jitra", slug: "jitra" },
    ],
  },
  {
    name: "Perlis",
    slug: "perlis",
    code: "PLS",
    cities: [
      { name: "Kangar", slug: "kangar" },
      { name: "Arau", slug: "arau" },
      { name: "Padang Besar", slug: "padang-besar" },
    ],
  },
  {
    name: "Sabah",
    slug: "sabah",
    code: "SBH",
    cities: [
      { name: "Kota Kinabalu", slug: "kota-kinabalu" },
      { name: "Sandakan", slug: "sandakan" },
      { name: "Tawau", slug: "tawau" },
      { name: "Lahad Datu", slug: "lahad-datu" },
      { name: "Keningau", slug: "keningau" },
    ],
  },
  {
    name: "Sarawak",
    slug: "sarawak",
    code: "SWK",
    cities: [
      { name: "Kuching", slug: "kuching" },
      { name: "Miri", slug: "miri" },
      { name: "Sibu", slug: "sibu" },
      { name: "Bintulu", slug: "bintulu" },
      { name: "Samarahan", slug: "samarahan" },
    ],
  },
  {
    name: "Putrajaya",
    slug: "putrajaya",
    code: "PJY",
    cities: [{ name: "Putrajaya", slug: "putrajaya" }],
  },
  {
    name: "Labuan",
    slug: "labuan",
    code: "LBN",
    cities: [{ name: "Labuan", slug: "labuan" }],
  },
];

// Get all states
export function getAllStates(): StateDefinition[] {
  return MALAYSIAN_STATES;
}

// Get state by slug
export function getStateBySlug(slug: string): StateDefinition | undefined {
  return MALAYSIAN_STATES.find((state) => state.slug === slug);
}

// Get city by slug within a state
export function getCityBySlug(
  stateSlug: string,
  citySlug: string
): CityDefinition | undefined {
  const state = getStateBySlug(stateSlug);
  return state?.cities.find((city) => city.slug === citySlug);
}

// Get all cities (flattened)
export function getAllCities(): (CityDefinition & { stateSlug: string; stateName: string })[] {
  return MALAYSIAN_STATES.flatMap((state) =>
    state.cities.map((city) => ({
      ...city,
      stateSlug: state.slug,
      stateName: state.name,
    }))
  );
}

// Get cities for a state
export function getCitiesForState(stateSlug: string): CityDefinition[] {
  const state = getStateBySlug(stateSlug);
  return state?.cities ?? [];
}

// State options for select
export function getStateOptions(): { label: string; value: string }[] {
  return MALAYSIAN_STATES.map((state) => ({
    label: state.name,
    value: state.slug,
  }));
}
