/**
 * Données géographiques de base : grandes villes du monde (lat/lng approximatifs).
 * La densité de ces lumières redessine la Terre habitée — pas besoin de tracé
 * de côtes. Le champ `weight` module l'affluence simulée initiale.
 */

export type CitySeed = {
  name: string;
  cc: string;
  lat: number;
  lng: number;
  weight: number;
};

export const COUNTRY_NAMES: Record<string, string> = {
  FR: "France", GB: "United Kingdom", DE: "Germany", ES: "Spain", IT: "Italy",
  NL: "Netherlands", PT: "Portugal", IE: "Ireland", GR: "Greece", SE: "Sweden",
  NO: "Norway", FI: "Finland", DK: "Denmark", PL: "Poland", UA: "Ukraine",
  AT: "Austria", RU: "Russia", TR: "Türkiye", US: "United States", CA: "Canada",
  MX: "Mexico", BR: "Brazil", AR: "Argentina", CL: "Chile", CO: "Colombia",
  PE: "Peru", VE: "Venezuela", UY: "Uruguay", EC: "Ecuador", PA: "Panama",
  CU: "Cuba", CN: "China", JP: "Japan", KR: "South Korea", IN: "India",
  PK: "Pakistan", BD: "Bangladesh", TH: "Thailand", VN: "Vietnam", ID: "Indonesia",
  MY: "Malaysia", SG: "Singapore", PH: "Philippines", HK: "Hong Kong", TW: "Taiwan",
  IR: "Iran", IQ: "Iraq", SA: "Saudi Arabia", AE: "UAE", IL: "Israel", EG: "Egypt",
  NG: "Nigeria", KE: "Kenya", ZA: "South Africa", CD: "DR Congo", MA: "Morocco",
  DZ: "Algeria", TN: "Tunisia", ET: "Ethiopia", GH: "Ghana", SN: "Senegal",
  AU: "Australia", NZ: "New Zealand",
};

export const CITY_SEED: CitySeed[] = [
  ["Tokyo","JP",35.68,139.69,9],["Delhi","IN",28.61,77.21,8],["Shanghai","CN",31.23,121.47,8],
  ["São Paulo","BR",-23.55,-46.63,7],["Mexico City","MX",19.43,-99.13,7],["Cairo","EG",30.04,31.24,6],
  ["Mumbai","IN",19.08,72.88,7],["Beijing","CN",39.90,116.41,7],["Dhaka","BD",23.81,90.41,6],
  ["Osaka","JP",34.69,135.50,5],["New York","US",40.71,-74.01,8],["Karachi","PK",24.86,67.01,6],
  ["Buenos Aires","AR",-34.60,-58.38,6],["Istanbul","TR",41.01,28.98,6],["Kolkata","IN",22.57,88.36,6],
  ["Manila","PH",14.60,120.98,6],["Lagos","NG",6.52,3.38,6],["Rio de Janeiro","BR",-22.91,-43.17,5],
  ["Los Angeles","US",34.05,-118.24,7],["Moscow","RU",55.75,37.62,6],["Paris","FR",48.85,2.35,7],
  ["London","GB",51.51,-0.13,7],["Bangkok","TH",13.76,100.50,6],["Jakarta","ID",-6.21,106.85,6],
  ["Seoul","KR",37.57,126.98,7],["Lima","PE",-12.05,-77.04,5],["Bogotá","CO",4.71,-74.07,5],
  ["Johannesburg","ZA",-26.20,28.05,5],["Chicago","US",41.88,-87.63,5],["Toronto","CA",43.65,-79.38,5],
  ["Madrid","ES",40.42,-3.70,5],["Berlin","DE",52.52,13.40,5],["Rome","IT",41.90,12.50,5],
  ["Sydney","AU",-33.87,151.21,5],["Melbourne","AU",-37.81,144.96,4],["Singapore","SG",1.35,103.82,5],
  ["Kuala Lumpur","MY",3.14,101.69,4],["Ho Chi Minh City","VN",10.82,106.63,5],["Hong Kong","HK",22.32,114.17,5],
  ["Tehran","IR",35.69,51.39,5],["Riyadh","SA",24.71,46.68,4],["Baghdad","IQ",33.31,44.36,4],
  ["Nairobi","KE",-1.29,36.82,4],["Kinshasa","CD",-4.32,15.31,5],["Casablanca","MA",33.57,-7.59,4],
  ["Tel Aviv","IL",32.08,34.78,4],["Dubai","AE",25.20,55.27,5],["San Francisco","US",37.77,-122.42,5],
  ["Seattle","US",47.61,-122.33,4],["Miami","US",25.76,-80.19,4],["Houston","US",29.76,-95.37,4],
  ["Vancouver","CA",49.28,-123.12,4],["Santiago","CL",-33.45,-70.67,4],["Caracas","VE",10.48,-66.90,4],
  ["Amsterdam","NL",52.37,4.90,4],["Barcelona","ES",41.39,2.17,4],["Milan","IT",45.46,9.19,4],
  ["Munich","DE",48.14,11.58,4],["Vienna","AT",48.21,16.37,4],["Warsaw","PL",52.23,21.01,4],
  ["Kyiv","UA",50.45,30.52,4],["Stockholm","SE",59.33,18.06,4],["Oslo","NO",59.91,10.75,3],
  ["Helsinki","FI",60.17,24.94,3],["Copenhagen","DK",55.68,12.57,3],["Dublin","IE",53.35,-6.26,3],
  ["Lisbon","PT",38.72,-9.14,3],["Athens","GR",37.98,23.73,3],["Lyon","FR",45.76,4.83,4],
  ["Marseille","FR",43.30,5.37,3],["Reims","FR",49.26,4.03,2],["Auckland","NZ",-36.85,174.76,3],
  ["Perth","AU",-31.95,115.86,3],["Chennai","IN",13.08,80.27,5],["Bangalore","IN",12.97,77.59,6],
  ["Hyderabad","IN",17.38,78.49,5],["Lahore","PK",31.55,74.34,5],["Chengdu","CN",30.57,104.07,5],
  ["Guangzhou","CN",23.13,113.26,6],["Shenzhen","CN",22.54,114.06,6],["Taipei","TW",25.03,121.56,4],
  ["Addis Ababa","ET",9.03,38.74,4],["Accra","GH",5.60,-0.19,3],["Dakar","SN",14.72,-17.47,3],
  ["Algiers","DZ",36.75,3.06,4],["Tunis","TN",36.81,10.18,3],["Montevideo","UY",-34.90,-56.16,3],
  ["Quito","EC",-0.18,-78.47,3],["Panama City","PA",8.98,-79.52,3],["Havana","CU",23.11,-82.37,3],
  ["Atlanta","US",33.75,-84.39,4],["Boston","US",42.36,-71.06,4],["Washington","US",38.90,-77.04,4],
  ["Dallas","US",32.78,-96.80,4],["Denver","US",39.74,-104.99,3],["Phoenix","US",33.45,-112.07,3],
].map(([name, cc, lat, lng, weight]) => ({
  name: name as string,
  cc: cc as string,
  lat: lat as number,
  lng: lng as number,
  weight: weight as number,
}));

/** Ville "vous" par défaut (géoloc IP simulée). */
export const SELF_CITY = "Lyon";
