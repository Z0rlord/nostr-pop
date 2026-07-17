/**
 * Foreign-country schools from https://international.tenshinryu.net/foreign-country-dojo
 * Shared by seed-foreign-dojos.mjs, seed-staging-multidojo.mjs, backfill-prod-multidojo.mjs
 *
 * Japan branch codes (for UI grouping) live in src/lib/dojo-groups.ts — keep in sync.
 */

/** @typedef {{ name: string, email: string | null, note?: string }} Leader */

/**
 * @typedef {object} ForeignSchool
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string} location
 * @property {string} timezone
 * @property {"federation"|"headquarters"|"branch"|"keikokai"|"online"} kind
 * @property {Leader[]} leaders
 */

/** @type {ForeignSchool[]} */
export const FOREIGN_SCHOOLS = [
  {
    id: "tenshinryu-foreign-fit",
    code: "FIT",
    name: "FIT (Federación Iberoamericana de Tenshinryu)",
    location: "Spanish & Portuguese speaking countries",
    timezone: "UTC",
    kind: "federation",
    leaders: [
      {
        name: "Gabriel García Getsujyo",
        email: null,
        note: "Saikō-Sekininsha / Representante Oficial",
      },
    ],
  },
  {
    id: "tenshinryu-foreign-au",
    code: "AU",
    name: "Australia Headquarters (Samurai Dojo PCh)",
    location: "Queensland, Australia",
    timezone: "Australia/Brisbane",
    kind: "headquarters",
    leaders: [
      {
        name: 'Peter "Chewy" Chmielewski',
        email: null,
        note: "Organizer — contact via swordschool.com.au",
      },
    ],
  },
  {
    id: "tenshinryu-foreign-es",
    code: "ES",
    name: "Spain Branch (BUGEIKAN)",
    location: "Valencia, Spain",
    timezone: "Europe/Madrid",
    kind: "branch",
    leaders: [
      {
        name: "Marisol García",
        email: "tenshinryu@bugeikan.es",
        note: "Chief Director",
      },
    ],
  },
  {
    id: "tenshinryu-foreign-it",
    code: "IT",
    name: "Italy Branch (Sei ryu dojo Padova)",
    location: "Padova, Italy",
    timezone: "Europe/Rome",
    kind: "branch",
    leaders: [
      { name: "Giovanni Nalesso", email: "kherydan@tiscali.it", note: "Organizer" },
      { name: "Alessio Guarnieri", email: "aguarnieri55@gmail.com", note: "Organizer" },
    ],
  },
  {
    id: "tenshinryu-foreign-hk",
    code: "HK",
    name: "Hong Kong Keikokai",
    location: "Hong Kong",
    timezone: "Asia/Hong_Kong",
    kind: "keikokai",
    leaders: [],
  },
  {
    id: "tenshinryu-foreign-ru",
    code: "RU",
    name: "Russia Keikokai",
    location: "Moscow, Russia",
    timezone: "Europe/Moscow",
    kind: "keikokai",
    leaders: [],
  },
  {
    id: "tenshinryu-foreign-mx",
    code: "MX",
    name: "Mexico Keikokai",
    location: "Mexico",
    timezone: "America/Mexico_City",
    kind: "keikokai",
    leaders: [],
  },
  {
    id: "tenshinryu-foreign-fr",
    code: "FR",
    name: "France Keikokai",
    location: "France",
    timezone: "Europe/Paris",
    kind: "keikokai",
    leaders: [],
  },
  {
    id: "tenshinryu-foreign-de",
    code: "DE",
    name: "Germany Keikokai",
    location: "Germany",
    timezone: "Europe/Berlin",
    kind: "keikokai",
    leaders: [],
  },
  {
    id: "tenshinryu-foreign-gr",
    code: "GR",
    name: "Greece Keikokai",
    location: "Greece",
    timezone: "Europe/Athens",
    kind: "keikokai",
    leaders: [],
  },
  {
    id: "tenshinryu-foreign-cl",
    code: "CL",
    name: "Chile Keikokai (KI RYU KAI BUGEIKAN)",
    location: "Los Andes / Buin, Chile",
    timezone: "America/Santiago",
    kind: "keikokai",
    leaders: [
      {
        name: "Luciano Vera Escudero",
        email: "tenshinryuchile@gmail.com",
        note: "Líder",
      },
    ],
  },
  {
    id: "tenshinryu-foreign-uk",
    code: "UK",
    name: "UK Keikokai",
    location: "United Kingdom",
    timezone: "Europe/London",
    kind: "keikokai",
    leaders: [
      {
        name: "UK Keikokai Leader",
        email: "tenshinryu-uk@outlook.com",
      },
    ],
  },
  {
    id: "tenshinryu-foreign-at",
    code: "AT",
    name: "Austria Keikokai",
    location: "Austria",
    timezone: "Europe/Vienna",
    kind: "keikokai",
    leaders: [
      {
        name: "Austria Keikokai Leader",
        email: "tenshinryu@kagami.at",
      },
    ],
  },
  {
    id: "tenshinryu-foreign-nl",
    code: "NL",
    name: "Netherlands Online Group",
    location: "Heerlen, Netherlands",
    timezone: "Europe/Amsterdam",
    kind: "online",
    leaders: [
      {
        name: "Jean Debets",
        email: "jean.debets.1960@gmail.com",
      },
    ],
  },
  {
    id: "tenshinryu-foreign-ro",
    code: "RO",
    name: "Romania Online Group",
    location: "Romania",
    timezone: "Europe/Bucharest",
    kind: "online",
    leaders: [],
  },
  {
    id: "tenshinryu-foreign-ca",
    code: "CA",
    name: "Vancouver Online Group",
    location: "Vancouver, Canada",
    timezone: "America/Vancouver",
    kind: "online",
    leaders: [
      {
        name: "Adrian Fuentes",
        email: "fuentesadrian@hotmail.com",
      },
    ],
  },
  {
    id: "tenshinryu-foreign-ny",
    code: "NY",
    name: "New York Online Group",
    location: "New York, USA",
    timezone: "America/New_York",
    kind: "online",
    leaders: [
      {
        name: "Eric Kuster",
        email: "erickuster83@gmail.com",
        note: "Leader",
      },
    ],
  },
];

export const FOREIGN_CODE_BY_ID = Object.fromEntries(
  FOREIGN_SCHOOLS.map((s) => [s.id, s.code])
);

/** Japan branch codes — keep in sync with src/lib/dojo-groups.ts */
export const JAPAN_BRANCH_CODES = [
  "HQ",
  "SETAGAYA",
  "KAWAGOE",
  "SHINJUKU",
  "YOKOHAMA",
  "SHINYURI",
  "KAWASAKI",
];
