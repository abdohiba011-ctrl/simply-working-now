// Brand → Models cascading map for the bike wizard.
// Keep brand keys identical to legacy BIKE_BRANDS so existing rows stay valid.

export const BRAND_MODELS: Record<string, string[]> = {
  Honda: [
    "PCX 160", "PCX 125", "Forza 350", "ADV 160", "Vario 160",
    "CB125F", "CB300R", "CBR500R", "CB650R", "Africa Twin 1100",
    "Rebel 500", "SH 350i", "Click 125", "Wave 110", "Other",
  ],
  Yamaha: [
    "NMAX 155", "Aerox 155", "XMAX 300", "TMAX 560", "MT-07",
    "MT-09", "R3", "R7", "R1", "Tracer 9", "MT-03", "FZ-S",
    "Fascino 125", "Other",
  ],
  Vespa: [
    "Primavera 50", "Primavera 125", "Primavera 150",
    "Sprint 125", "Sprint 150", "GTS 125", "GTS 300",
    "GTV 300", "Elettrica", "PX 150", "Other",
  ],
  Kymco: [
    "Agility 50", "Agility 125", "People 125", "Like 200",
    "Downtown 350", "X-Town 300", "AK 550", "Super 8 150", "Other",
  ],
  Peugeot: [
    "Kisbee 50", "Speedfight 50", "Speedfight 125",
    "Tweet 125", "Django 50", "Django 125", "Django 150",
    "Pulsion 125", "Citystar 50", "Citystar 125", "Other",
  ],
  Piaggio: [
    "Liberty 50", "Liberty 125", "Liberty 150", "Beverly 300",
    "Beverly 400", "MP3 300", "MP3 500", "Medley 125",
    "Medley 150", "Zip 50", "Zip 100", "Other",
  ],
  Sym: [
    "Symphony 50", "Symphony 125", "Jet 14", "Joyride 200",
    "Cruisym 300", "Maxsym 400", "Citycom 300", "Other",
  ],
  BMW: [
    "C 400 X", "C 400 GT", "C 650 Sport", "G 310 R", "G 310 GS",
    "F 750 GS", "F 850 GS", "R 1250 GS", "S 1000 RR", "Other",
  ],
  Suzuki: [
    "Burgman 200", "Burgman 400", "Address 110", "GSX-R125",
    "GSX-R600", "GSX-R750", "GSX-S750", "V-Strom 650",
    "V-Strom 1050", "Hayabusa", "Other",
  ],
  Aprilia: [
    "SR 50", "SR 125", "SR Motard 125", "Tuono 125", "Tuono 660",
    "RS 125", "RS 660", "RSV4", "Caponord", "Other",
  ],
  Benelli: [
    "TNT 125", "TNT 300", "TNT 600", "Leoncino 250", "Leoncino 500",
    "Leoncino 800", "TRK 251", "TRK 502", "TRK 800", "Other",
  ],
  Ducati: [
    "Monster", "Streetfighter V2", "Streetfighter V4",
    "Panigale V2", "Panigale V4", "Multistrada V2", "Multistrada V4",
    "Hypermotard", "Diavel", "Scrambler", "Other",
  ],
  Triumph: [
    "Street Triple", "Speed Triple", "Tiger 660", "Tiger 850",
    "Tiger 900", "Bonneville", "Trident 660", "Speed Twin", "Other",
  ],
  "Super Soco": [
    "CPx", "TC", "TC Max", "TS", "TSx", "Other",
  ],
  Other: ["Other (specify in name)"],
};

export const BIKE_BRANDS_V2 = Object.keys(BRAND_MODELS);

export function modelsForBrand(brand: string | null | undefined): string[] {
  if (!brand) return [];
  return BRAND_MODELS[brand] ?? [];
}
