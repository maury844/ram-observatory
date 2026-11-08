/**
 * Country table — ported verbatim from the prototype (template.html, const C).
 *
 * Columns: name, lat, lon, population (millions), UTC offset (hours, STANDARD time — no DST),
 * PCs per capita, smartphones per capita, consoles per capita, region.
 *
 * Per-capita values are hand-coded penetration tiers. They are not used as absolute counts:
 * each device column is rescaled so that the world total equals the installed base declared in
 * devices.ts (see deviceScales()).
 */

export type Region =
  | 'N. America'
  | 'Latin America'
  | 'Europe'
  | 'Middle East'
  | 'Africa'
  | 'Asia'
  | 'China'
  | 'Japan'
  | 'Oceania';

type Row = readonly [
  name: string,
  lat: number,
  lon: number,
  popM: number,
  utcOffset: number,
  pcPerCap: number,
  phonePerCap: number,
  consolePerCap: number,
  region: Region,
];

export interface Country {
  readonly name: string;
  readonly lat: number;
  readonly lon: number;
  /** Population in millions. */
  readonly popM: number;
  /** Standard-time UTC offset in hours (fractional offsets allowed, e.g. India 5.5). */
  readonly utcOffset: number;
  readonly perCapita: { readonly pc: number; readonly phone: number; readonly console: number };
  readonly region: Region;
}

// prettier-ignore
const ROWS: readonly Row[] = [
  ["United States",39.5,-98.5,335,-6,0.80,0.95,0.45,"N. America"],
  ["Canada",56,-106,40,-5,0.80,0.95,0.35,"N. America"],
  ["Mexico",23.6,-102.5,129,-6,0.30,0.80,0.08,"Latin America"],
  ["Guatemala",15.5,-90.3,18,-6,0.12,0.65,0.02,"Latin America"],
  ["Cuba",21.5,-79.5,11,-5,0.10,0.55,0.01,"Latin America"],
  ["Dominican Rep.",18.9,-70.2,11,-4,0.20,0.80,0.02,"Latin America"],
  ["Colombia",4.6,-74.1,52,-5,0.30,0.80,0.03,"Latin America"],
  ["Venezuela",8,-66,28,-4,0.20,0.65,0.02,"Latin America"],
  ["Ecuador",-1.8,-78.2,18,-5,0.25,0.75,0.02,"Latin America"],
  ["Peru",-9.2,-75,34,-5,0.25,0.75,0.02,"Latin America"],
  ["Bolivia",-16.5,-64.7,12,-4,0.20,0.75,0.02,"Latin America"],
  ["Brazil",-14,-52,216,-3,0.30,0.85,0.08,"Latin America"],
  ["Chile",-33.4,-70.7,20,-4,0.45,0.90,0.08,"Latin America"],
  ["Argentina",-34.6,-64,46,-3,0.40,0.85,0.06,"Latin America"],
  ["United Kingdom",54,-2,68,0,0.80,0.95,0.35,"Europe"],
  ["Ireland",53.3,-8,5,0,0.80,0.95,0.25,"Europe"],
  ["Portugal",39.5,-8,10,0,0.70,0.90,0.20,"Europe"],
  ["Spain",40.4,-3.7,48,1,0.75,0.95,0.25,"Europe"],
  ["France",46.6,2.3,68,1,0.80,0.95,0.30,"Europe"],
  ["Belgium",50.8,4.4,12,1,0.80,0.95,0.25,"Europe"],
  ["Netherlands",52.2,5.3,18,1,0.85,0.95,0.25,"Europe"],
  ["Germany",51.2,10.4,84,1,0.85,0.95,0.30,"Europe"],
  ["Switzerland",46.8,8.2,9,1,0.85,0.95,0.25,"Europe"],
  ["Austria",47.5,14.5,9,1,0.80,0.95,0.25,"Europe"],
  ["Italy",42.5,12.5,59,1,0.70,0.95,0.25,"Europe"],
  ["Czechia",49.8,15.5,11,1,0.75,0.95,0.20,"Europe"],
  ["Poland",52,19,37,1,0.65,0.90,0.20,"Europe"],
  ["Hungary",47.2,19.5,10,1,0.60,0.90,0.15,"Europe"],
  ["Sweden",62,15,10.5,1,0.85,0.95,0.30,"Europe"],
  ["Norway",64,12,5.5,1,0.85,0.95,0.30,"Europe"],
  ["Denmark",56,10,6,1,0.85,0.95,0.30,"Europe"],
  ["Finland",64,26,5.5,2,0.85,0.95,0.25,"Europe"],
  ["Greece",39,22,10.4,2,0.55,0.90,0.15,"Europe"],
  ["Romania",45.9,25,19,2,0.50,0.90,0.10,"Europe"],
  ["Ukraine",49,32,37,2,0.45,0.85,0.08,"Europe"],
  ["Turkey",39,35,85,3,0.35,0.85,0.06,"Middle East"],
  ["Russia",60,90,144,5,0.50,0.90,0.08,"Europe"],
  ["Israel",31.5,34.8,9.7,2,0.80,0.95,0.15,"Middle East"],
  ["Egypt",26.8,30,112,2,0.20,0.75,0.02,"Africa"],
  ["Saudi Arabia",24,45,36,3,0.55,0.95,0.20,"Middle East"],
  ["UAE",24,54,10,4,0.75,0.95,0.20,"Middle East"],
  ["Iraq",33,44,45,3,0.15,0.75,0.02,"Middle East"],
  ["Iran",32.5,53.5,89,3.5,0.30,0.80,0.03,"Middle East"],
  ["Morocco",32,-6,37,1,0.25,0.80,0.02,"Africa"],
  ["Algeria",28,2.5,45,1,0.20,0.75,0.02,"Africa"],
  ["Nigeria",9.5,8,224,1,0.05,0.45,0.01,"Africa"],
  ["Ghana",8,-1.5,34,0,0.08,0.55,0.01,"Africa"],
  ["Côte d'Ivoire",7.5,-5.5,29,0,0.05,0.55,0.01,"Africa"],
  ["Cameroon",5.5,12.5,29,1,0.05,0.50,0.01,"Africa"],
  ["DR Congo",-2.5,23.5,102,1,0.02,0.30,0.00,"Africa"],
  ["Sudan",15,30,48,2,0.04,0.35,0.00,"Africa"],
  ["Ethiopia",9,39,127,3,0.02,0.30,0.00,"Africa"],
  ["Kenya",0.5,37.5,55,3,0.06,0.60,0.01,"Africa"],
  ["Tanzania",-6.5,35,67,3,0.03,0.45,0.00,"Africa"],
  ["Uganda",1.5,32.5,48,3,0.03,0.35,0.00,"Africa"],
  ["Angola",-12,17.5,37,1,0.04,0.45,0.00,"Africa"],
  ["Mozambique",-18,35,34,2,0.02,0.35,0.00,"Africa"],
  ["Madagascar",-19,47,30,3,0.02,0.30,0.00,"Africa"],
  ["South Africa",-29,25,60,2,0.25,0.85,0.04,"Africa"],
  ["Kazakhstan",48,67,20,5,0.40,0.90,0.04,"Asia"],
  ["Uzbekistan",41.5,64.5,36,5,0.15,0.75,0.01,"Asia"],
  ["Afghanistan",33.5,66,42,4.5,0.02,0.40,0.00,"Asia"],
  ["Pakistan",30,69.5,240,5,0.05,0.50,0.01,"Asia"],
  ["India",22,79,1430,5.5,0.08,0.55,0.01,"Asia"],
  ["Nepal",28.2,84,31,5.75,0.06,0.60,0.00,"Asia"],
  ["Bangladesh",23.7,90.4,173,6,0.04,0.55,0.00,"Asia"],
  ["Sri Lanka",7.5,80.7,22,5.5,0.15,0.70,0.01,"Asia"],
  ["Myanmar",19.5,96.5,55,6.5,0.05,0.60,0.00,"Asia"],
  ["Thailand",15,101,72,7,0.30,0.90,0.03,"Asia"],
  ["Vietnam",16,107,99,7,0.20,0.80,0.01,"Asia"],
  ["Malaysia",3.5,102,34,8,0.40,0.95,0.04,"Asia"],
  ["Singapore",1.35,103.8,6,8,0.85,0.95,0.15,"Asia"],
  ["Indonesia",-2.5,118,278,7,0.12,0.75,0.01,"Asia"],
  ["Philippines",12.5,122,117,8,0.15,0.70,0.01,"Asia"],
  ["China",35,104,1410,8,0.28,0.85,0.01,"China"],
  ["Taiwan",23.7,121,23.5,8,0.80,0.95,0.10,"Asia"],
  ["South Korea",36.5,127.8,52,9,0.80,0.95,0.10,"Asia"],
  ["Japan",36.5,138,124,9,0.75,0.90,0.35,"Japan"],
  ["Australia",-25,134,26.5,10,0.85,0.95,0.35,"Oceania"],
  ["New Zealand",-41,174,5.2,12,0.85,0.95,0.30,"Oceania"],
];

export const COUNTRIES: readonly Country[] = ROWS.map(
  ([name, lat, lon, popM, utcOffset, pc, phone, consoleCap, region]) => ({
    name,
    lat,
    lon,
    popM,
    utcOffset,
    perCapita: { pc, phone, console: consoleCap },
    region,
  }),
);
