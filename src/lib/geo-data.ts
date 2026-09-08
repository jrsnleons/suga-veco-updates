export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface CityBounds {
  name: string;
  center: GeoPoint;
  zoom: number;
}

export const METRO_CEBU_CENTER: GeoPoint = {
  lat: 10.3157,
  lng: 123.8854,
};

export const CEBU_MUNICIPALITIES: Record<string, CityBounds> = {
  "Cebu City": {
    name: "Cebu City",
    center: { lat: 10.3157, lng: 123.8854 },
    zoom: 13,
  },
  "Mandaue City": {
    name: "Mandaue City",
    center: { lat: 10.3344, lng: 123.9350 },
    zoom: 13,
  },
  "Talisay City": {
    name: "Talisay City",
    center: { lat: 10.2588, lng: 123.8440 },
    zoom: 13,
  },
  "Consolacion": {
    name: "Consolacion",
    center: { lat: 10.3768, lng: 123.9575 },
    zoom: 13,
  },
  "Liloan": {
    name: "Liloan",
    center: { lat: 10.4000, lng: 123.9980 },
    zoom: 13,
  },
  "Minglanilla": {
    name: "Minglanilla",
    center: { lat: 10.2440, lng: 123.7970 },
    zoom: 13,
  },
  "City of Naga": {
    name: "City of Naga",
    center: { lat: 10.2070, lng: 123.7580 },
    zoom: 13,
  },
  "San Fernando": {
    name: "San Fernando",
    center: { lat: 10.1630, lng: 123.7080 },
    zoom: 13,
  },
};

export const BARANGAY_COORDS: Record<string, GeoPoint> = {
  // Cebu City
  "Lahug": { lat: 10.3370, lng: 123.8998 },
  "Guadalupe": { lat: 10.3275, lng: 123.8785 },
  "Apas": { lat: 10.3392, lng: 123.9090 },
  "Mabolo": { lat: 10.3190, lng: 123.9160 },
  "Kasambagan": { lat: 10.3245, lng: 123.9125 },
  "Capitol Site": { lat: 10.3175, lng: 123.8890 },
  "Camputhaw": { lat: 10.3188, lng: 123.8950 },
  "Banilad": { lat: 10.3450, lng: 123.9120 },
  "Talamban": { lat: 10.3690, lng: 123.9180 },
  "San Roque": { lat: 10.2980, lng: 123.9050 },
  "Tejero": { lat: 10.3015, lng: 123.9100 },
  "Tinago": { lat: 10.3005, lng: 123.9070 },
  "Labangon": { lat: 10.3050, lng: 123.8780 },
  "Tisa": { lat: 10.3010, lng: 123.8690 },
  "Basak San Nicolas": { lat: 10.2890, lng: 123.8760 },
  "Basak Pardo": { lat: 10.2860, lng: 123.8680 },
  "Punta Princesa": { lat: 10.2970, lng: 123.8730 },
  "Mambaling": { lat: 10.2920, lng: 123.8830 },
  "Kalunasan": { lat: 10.3320, lng: 123.8670 },
  "Inayawan": { lat: 10.2740, lng: 123.8660 },
  "Bulacao": { lat: 10.2750, lng: 123.8550 },
  "Cogon Ramos": { lat: 10.3090, lng: 123.8940 },
  "Zapatera": { lat: 10.3120, lng: 123.9010 },
  "Carreta": { lat: 10.3100, lng: 123.9100 },
  "Sambag 1": { lat: 10.3090, lng: 123.8870 },
  "Sambag 2": { lat: 10.3140, lng: 123.8850 },
  "Lorega San Miguel": { lat: 10.3080, lng: 123.9030 },
  "Day-as": { lat: 10.3040, lng: 123.9020 },
  "T. Padilla": { lat: 10.3045, lng: 123.9080 },
  "Pari-an": { lat: 10.2990, lng: 123.9030 },
  "Ermita": { lat: 10.2930, lng: 123.8990 },
  "Suba": { lat: 10.2910, lng: 123.8940 },
  "Pasil": { lat: 10.2920, lng: 123.8910 },
  "Busay": { lat: 10.3580, lng: 123.8790 },
  "Bacayan": { lat: 10.3780, lng: 123.9210 },
  "Pulangbato": { lat: 10.3840, lng: 123.9090 },

  // Mandaue City
  "Maguikay": { lat: 10.3344, lng: 123.9350 },
  "Tipolo": { lat: 10.3210, lng: 123.9310 },
  "Subangdaku": { lat: 10.3235, lng: 123.9240 },
  "Cabancalan": { lat: 10.3510, lng: 123.9330 },
  "Casuntingan": { lat: 10.3440, lng: 123.9310 },
  "Bakilid": { lat: 10.3290, lng: 123.9390 },
  "Canduman": { lat: 10.3600, lng: 123.9410 },
  "Tabok": { lat: 10.3540, lng: 123.9490 },
  "Paknaan": { lat: 10.3460, lng: 123.9610 },
  "Centro": { lat: 10.3260, lng: 123.9440 },
  "Alang-alang": { lat: 10.3330, lng: 123.9450 },
  "Guizo": { lat: 10.3260, lng: 123.9380 },
  "Ibabao-Estancia": { lat: 10.3310, lng: 123.9460 },
  "Jagobiao": { lat: 10.3650, lng: 123.9460 },
  "Labogon": { lat: 10.3500, lng: 123.9550 },
  "Looc": { lat: 10.3160, lng: 123.9460 },
  "Opao": { lat: 10.3180, lng: 123.9530 },
  "Pagsabungan": { lat: 10.3570, lng: 123.9430 },
  "Umapad": { lat: 10.3330, lng: 123.9610 },

  // Consolacion
  "Consolacion": { lat: 10.3768, lng: 123.9575 },
  "Cansaga": { lat: 10.3680, lng: 123.9620 },
  "Jugan": { lat: 10.3810, lng: 123.9680 },
  "Pitogo": { lat: 10.3740, lng: 123.9520 },
  "Lamac": { lat: 10.3880, lng: 123.9480 },
  "Pulpogan": { lat: 10.3720, lng: 123.9540 },
  "Tayud": { lat: 10.3720, lng: 123.9780 },
  "Nangka": { lat: 10.3850, lng: 123.9560 },
  "Tolotolo": { lat: 10.3950, lng: 123.9350 },
  "Tugbongan": { lat: 10.3640, lng: 123.9710 },
  "Cabangahan": { lat: 10.3920, lng: 123.9210 },
  "Casili": { lat: 10.3710, lng: 123.9380 },

  // Liloan
  "Liloan": { lat: 10.4000, lng: 123.9980 },
  "Yati": { lat: 10.4010, lng: 123.9980 },
  "Poblacion": { lat: 10.4025, lng: 124.0010 },
  "Cotcot": { lat: 10.4210, lng: 124.0150 },
  "Jubay": { lat: 10.4120, lng: 124.0080 },
  "Catarman": { lat: 10.4050, lng: 124.0120 },
  "Cabadiangan": { lat: 10.4280, lng: 123.9850 },
  "Calero": { lat: 10.3980, lng: 124.0040 },
  "San Roque (Liloan)": { lat: 10.4100, lng: 123.9950 },
  "San Vicente": { lat: 10.3920, lng: 123.9850 },

  // Talisay City
  "Talisay City": { lat: 10.2588, lng: 123.8440 },
  "Tabunok": { lat: 10.2670, lng: 123.8480 },
  "Cadulawan": { lat: 10.2520, lng: 123.8370 },
  "Linao": { lat: 10.2550, lng: 123.8320 },
  "Dumlog": { lat: 10.2460, lng: 123.8540 },
  "Pooc": { lat: 10.2420, lng: 123.8480 },
  "Mohon": { lat: 10.2510, lng: 123.8420 },
  "San Isidro": { lat: 10.2720, lng: 123.8400 },
  "Biasong": { lat: 10.2640, lng: 123.8580 },
  "Cansojong": { lat: 10.2610, lng: 123.8500 },
  "Lawaan": { lat: 10.2680, lng: 123.8330 },
  "Jaclupan": { lat: 10.2810, lng: 123.8210 },

  // Minglanilla
  "Minglanilla": { lat: 10.2440, lng: 123.7970 },
  "Lipata": { lat: 10.2500, lng: 123.8200 },
  "Pakigne": { lat: 10.2470, lng: 123.8120 },
  "Tungkil": { lat: 10.2420, lng: 123.8050 },
  "Tunghaan": { lat: 10.2380, lng: 123.7920 },
  "Calajo-an": { lat: 10.2330, lng: 123.7850 },
  "Tubod": { lat: 10.2480, lng: 123.7890 },
  "Tulay": { lat: 10.2410, lng: 123.7990 },
  "Tungkop": { lat: 10.2280, lng: 123.7780 },
  "Vito": { lat: 10.2420, lng: 123.7880 },

  // City of Naga
  "City of Naga": { lat: 10.2070, lng: 123.7580 },
  "Colon": { lat: 10.2050, lng: 123.7560 },
  "Tangke": { lat: 10.2100, lng: 123.7620 },
  "Tinaan": { lat: 10.1980, lng: 123.7480 },
  "Tuyan": { lat: 10.2150, lng: 123.7680 },
  "Inayagan": { lat: 10.2240, lng: 123.7780 },
  "Balirong": { lat: 10.2210, lng: 123.7450 },
  "Cantao-an": { lat: 10.2320, lng: 123.7380 },
  "Langtad": { lat: 10.1900, lng: 123.7410 },
  "Mainit": { lat: 10.2020, lng: 123.7350 },
  "Pangdan": { lat: 10.2120, lng: 123.7490 },

  // San Fernando
  "San Fernando": { lat: 10.1630, lng: 123.7080 },
  "Panadtaran": { lat: 10.1680, lng: 123.7150 },
  "Pitalo": { lat: 10.1740, lng: 123.7220 },
  "Sangat": { lat: 10.1800, lng: 123.7310 },
  "South Poblacion": { lat: 10.1610, lng: 123.7050 },
  "Balungag": { lat: 10.1750, lng: 123.6890 },
  "Bato": { lat: 10.1520, lng: 123.7020 },
  "Ilaya": { lat: 10.1650, lng: 123.6950 },
  "Liburon": { lat: 10.1700, lng: 123.6780 },
  "Magsico": { lat: 10.1850, lng: 123.6920 },
};

/**
 * Returns the best geographical coordinate for an area string and city.
 */
export function resolveCoordinates(area: string, city: string): GeoPoint {
  // Check exact barangay match
  if (BARANGAY_COORDS[area]) {
    return BARANGAY_COORDS[area];
  }

  // Check if any known barangay is contained in the area title
  for (const [key, coords] of Object.entries(BARANGAY_COORDS)) {
    if (area.toLowerCase().includes(key.toLowerCase())) {
      return coords;
    }
  }

  // Check city center
  if (CEBU_MUNICIPALITIES[city]) {
    return CEBU_MUNICIPALITIES[city].center;
  }

  return METRO_CEBU_CENTER;
}

export const CEBU_BARANGAY_CITIES: Record<string, string[]> = {
  "Consolacion": [
    "Cabangahan", "Cansaga", "Casili", "Danglag", "Garing", "Jugan", 
    "Lamac", "Nangka", "Panas", "Panoypoy", "Pitogo", "Poblacion Occidental", 
    "Poblacion Oriental", "Polog", "Pugalo", "Pulpogan", "Sacsac", "Tayud", 
    "Tilhaong", "Tolotolo", "Tugbongan"
  ],
  "Liloan": [
    "Cabadiangan", "Calero", "Catarman", "Cotcot", "Jubay", "Lataban", 
    "Mulao", "Poblacion", "San Roque", "San Vicente", "Santa Cruz", 
    "Tabla", "Tayud", "Yati"
  ],
  "Cebu City": [
    "Adlaon", "Agsungot", "Apas", "Babag", "Bacayan", "Banilad", 
    "Basak Pardo", "Basak San Nicolas", "Binaliw", "Bonbon", "Budlaan", 
    "Buhisan", "Bulacao", "Buot-Taup", "Busay", "Calamba", "Cambinocot", 
    "Camputhaw", "Capitol Site", "Carreta", "Cogon Pardo", "Cogon Ramos", 
    "Day-as", "Duljo Fatima", "Ermita", "Guadalupe", "Guba", "Hipodromo", 
    "Inayawan", "Kalubihan", "Kalunasan", "Kamagayan", "Kasambagan", 
    "Kinasang-an", "Labangon", "Lahug", "Lorega San Miguel", "Lusaran", 
    "Luz", "Mabini", "Mabolo", "Malubog", "Mambaling", "Pahina Central", 
    "Pahina San Nicolas", "Pamutan", "Pardo", "Pari-an", "Paril", "Pasil", 
    "Pit-os", "Poblacion", "Pulangbato", "Pung-ol Sibugay", "Punta Princesa", 
    "Quiot", "Sambag 1", "Sambag 2", "San Antonio", "San Jose", 
    "San Nicolas Proper", "San Roque", "Santa Cruz", "Sapangdaku", 
    "Sawang Calero", "Sinsin", "Sirao", "Suba", "Sudlon 1", "Sudlon 2", 
    "T. Padilla", "Tabunan", "Tagbao", "Talamban", "Taptap", "Tejero", 
    "Tinago", "Tisa", "Toong", "Zapatera"
  ],
  "Mandaue City": [
    "Alang-alang", "Bakilid", "Banilad", "Basak", "Cabancalan", "Cambaro", 
    "Canduman", "Casili", "Casuntingan", "Centro", "Cubacub", "Guizo", 
    "Ibabao-Estancia", "Jagobiao", "Labogon", "Looc", "Maguikay", 
    "Mantuyong", "Opao", "Pagsabungan", "Paknaan", "Subangdaku", "Tabok", 
    "Tawason", "Tingub", "Tipolo", "Umapad"
  ],
  "Talisay City": [
    "Biasong", "Bulacao", "Cadulawan", "Camp IV", "Cansojong", "Dumlog", 
    "Jaclupan", "Lagtang", "Lawaan I", "Lawaan II", "Lawaan", "Linao", "Maghaway", 
    "Manipis", "Mohon", "Poblacion", "Pooc", "San Isidro", "San Roque", 
    "Tabunok", "Tangke", "Tapul"
  ],
  "Minglanilla": [
    "Calajo-an", "Camp 7", "Camp 8", "Cuanos", "Guindarohan", 
    "Linao-Lipata", "Lipata", "Manduang", "Pakigne", "Poblacion Ward 1", 
    "Poblacion Ward 2", "Tubod", "Tulay", "Tunghaan", "Tungkil", "Tungkop", "Vito"
  ],
  "City of Naga": [
    "Alfaco", "Bairan", "Balirong", "Cabungbungan", "Cantao-an", "Central Poblacion", 
    "Cogon", "Colon", "East Poblacion", "Inayagan", "Inoburan", "Jaguimit", 
    "Lanas", "Langtad", "Lutac", "Mainit", "Mayana", "Naalad", 
    "North Poblacion", "Pangdan", "Patag", "South Poblacion", "Tagjaguimit", 
    "Tangke", "Tinaan", "Tuyan", "Uling", "West Poblacion"
  ],
  "San Fernando": [
    "Balungag", "Bato", "Bolo", "Buagsong", "Cabrera", "Can-asujan", 
    "Ilaya", "Lantawan", "Liburon", "Magsico", "Panadtaran", "Pitalo", 
    "San Isidro", "Sangat", "South Poblacion", "Tabionan", "Taoc", 
    "Tonggo", "Tubod"
  ]
};

export function getCanonicalCityForBarangay(barangay: string, fallbackCity = 'Cebu City'): string {
  if (!barangay) return fallbackCity;
  const norm = barangay.toLowerCase().trim();

  // Direct check in CEBU_MUNICIPALITIES
  if (CEBU_MUNICIPALITIES[barangay]) return barangay;

  for (const [city, brgys] of Object.entries(CEBU_BARANGAY_CITIES)) {
    if (brgys.some(b => b.toLowerCase().trim() === norm)) {
      return city;
    }
  }

  // Substring check
  for (const [city, brgys] of Object.entries(CEBU_BARANGAY_CITIES)) {
    if (brgys.some(b => norm.includes(b.toLowerCase().trim()))) {
      return city;
    }
  }

  return fallbackCity;
}
