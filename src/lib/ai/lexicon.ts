// Finnish job-ad lexicon used by the offline demo engine.
// Each concept lists Finnish stems (matched as word prefixes, so inflected
// forms like "siivouksesta" hit "siivou") and English terms for CV matching.

export interface Concept {
  id: string;
  label: string;
  kind: "experience" | "skill" | "education" | "certificate" | "other";
  fi: string[];
  en: string[];
  soft?: boolean; // traits a CV cannot prove → "unknown"
  advice?: string;
  question?: { fi: string; en: string };
}

export const CONCEPTS: Concept[] = [
  {
    id: "cleaning", label: "Cleaning / facility care", kind: "experience",
    fi: ["siivo", "laitoshuol", "puhtaanapi", "puhtaus", "kiinteistöhuol"],
    en: ["clean", "housekeep", "janitor", "custodian", "sanitation", "room attendant", "facility care"],
    advice: "If you have any cleaning experience (even informal or abroad), list it. A 'puhtausalan perustutkinto' or a short cleaning course (e.g. via TE-palvelut) strengthens applications.",
    question: { fi: "Millaista kokemusta sinulla on siivoustyöstä?", en: "What experience do you have with cleaning work?" },
  },
  {
    id: "waste", label: "Waste handling / recycling", kind: "skill",
    fi: ["jäte", "jätehuol", "kierrät", "lajittel"], en: ["waste", "recycl", "sorting"],
  },
  {
    id: "disinfection", label: "Disinfection / hygiene", kind: "skill",
    fi: ["desinfi", "hygienia", "aseptii"], en: ["disinfect", "sanitis", "sanitiz", "hygiene"],
  },
  {
    id: "customer_service", label: "Customer service", kind: "experience",
    fi: ["asiakaspalvel", "asiakas"], en: ["customer service", "customer", "client", "front desk", "receptionist"],
    question: { fi: "Kerro tilanteesta, jossa palvelit hankalaa asiakasta.", en: "Tell about a situation where you served a difficult customer." },
  },
  {
    id: "sales", label: "Sales", kind: "experience",
    fi: ["myyn", "myyjä"], en: ["sales", "selling", "retail", "shop assistant"],
  },
  {
    id: "cashier", label: "Cashier work", kind: "experience",
    fi: ["kassa"], en: ["cashier", "checkout", "till", "pos"],
  },
  {
    id: "warehouse", label: "Warehouse / logistics", kind: "experience",
    fi: ["varasto", "logistiik", "keräily", "keräilijä", "lähettämö"],
    en: ["warehouse", "logistics", "picking", "picker", "packing", "inventory", "stock"],
    question: { fi: "Onko sinulla kokemusta varastotyöstä tai keräilystä?", en: "Do you have experience in warehouse work or order picking?" },
  },
  {
    id: "forklift", label: "Forklift licence (trukkikortti)", kind: "certificate",
    fi: ["trukki"], en: ["forklift"],
    advice: "The Finnish forklift card (trukkikortti) is a one-day course, often available through TE-palvelut or private training providers.",
  },
  {
    id: "driving", label: "Driving licence", kind: "certificate",
    fi: ["ajokortti", "ajokortin", "b-kortti", "ajo-oikeus"], en: ["driving licence", "driver's license", "driving license", "driver license", "category b"],
    advice: "Foreign licences may need to be exchanged for a Finnish one via Traficom; check whether yours is valid in Finland.",
  },
  {
    id: "hygiene", label: "Hygiene passport (hygieniapassi)", kind: "certificate",
    fi: ["hygieniapass"], en: ["hygiene passport", "hygiene certificate", "food hygiene"],
    advice: "The hygiene passport test (Ruokavirasto) can be taken in English. Study the free material and book a test with an approved examiner.",
  },
  {
    id: "safety_card", label: "Occupational safety card (työturvallisuuskortti)", kind: "certificate",
    fi: ["työturvallisuuskort", "tturva"], en: ["occupational safety card", "safety card", "work safety card"],
    advice: "The työturvallisuuskortti is a one-day course (also offered in English) from Työturvallisuuskeskus TTK.",
  },
  {
    id: "hot_work", label: "Hot work card (tulityökortti)", kind: "certificate",
    fi: ["tulityö"], en: ["hot work"],
    advice: "The tulityökortti is a one-day course from SPEK-approved trainers.",
  },
  {
    id: "first_aid", label: "First aid (EA1)", kind: "certificate",
    fi: ["ensiapu", "ea1", "ea 1"], en: ["first aid", "cpr"],
    advice: "Finnish Red Cross (SPR) runs EA1 first-aid courses, some in English.",
  },
  {
    id: "kitchen", label: "Kitchen / restaurant", kind: "experience",
    fi: ["keittiö", "ravintola", "kokki", "tarjoilu", "ruoanvalmist", "astianpes"],
    en: ["kitchen", "restaurant", "cook", "chef", "waiter", "waitress", "food preparation", "dishwasher", "catering"],
  },
  {
    id: "care", label: "Care work", kind: "experience",
    fi: ["hoito", "hoiva", "lähihoitaj", "hoitaja", "vanhus", "vanhust"],
    en: ["care", "caregiver", "nursing", "elderly", "practical nurse", "care assistant"],
    question: { fi: "Miten kohtaat asiakkaan, joka on hämmentynyt tai levoton?", en: "How do you respond to a client who is confused or restless?" },
  },
  {
    id: "childcare", label: "Early childhood education", kind: "experience",
    fi: ["varhaiskasvatu", "päiväkoti", "lastenhoi", "lasten"], en: ["childcare", "kindergarten", "daycare", "early childhood", "children", "nanny"],
  },
  {
    id: "healthcare_degree", label: "Healthcare qualification", kind: "education",
    fi: ["sairaanhoitaj", "lähihoitajan tutkin", "valvira"], en: ["registered nurse", "nursing degree", "valvira"],
    advice: "Foreign healthcare qualifications must be recognised by Valvira before working in a licensed role.",
  },
  {
    id: "degree", label: "Relevant degree / vocational qualification", kind: "education",
    fi: ["tutkin", "koulutu", "perustutkin", "ammattitutkin", "amk", "korkeakoulu"],
    en: ["degree", "bachelor", "master", "diploma", "qualification", "vocational", "university", "college"],
    advice: "Foreign degrees can be recognised by the Finnish National Agency for Education (Opetushallitus) if an employer requires a Finnish-equivalent qualification.",
  },
  {
    id: "programming", label: "Software development", kind: "skill",
    fi: ["ohjelmoin", "ohjelmistokehit", "sovelluskehit", "koodaus"],
    en: ["software", "developer", "programming", "engineer", "coding", "development"],
  },
  { id: "javascript", label: "JavaScript / TypeScript", kind: "skill", fi: ["javascript", "typescript"], en: ["javascript", "typescript", "node.js", "nodejs"] },
  { id: "react", label: "React", kind: "skill", fi: ["react"], en: ["react"] },
  { id: "python", label: "Python", kind: "skill", fi: ["python"], en: ["python"] },
  { id: "sql", label: "SQL / databases", kind: "skill", fi: ["sql", "tietokan"], en: ["sql", "database", "postgres", "mysql"] },
  { id: "cloud", label: "Cloud (AWS/Azure/GCP)", kind: "skill", fi: ["pilvi", "aws", "azure"], en: ["aws", "azure", "gcp", "cloud"] },
  { id: "office", label: "MS Office / Excel", kind: "skill", fi: ["excel", "office", "toimisto-ohjelm"], en: ["excel", "microsoft office", "ms office", "word", "powerpoint"] },
  { id: "accounting", label: "Accounting / bookkeeping", kind: "experience", fi: ["kirjanpi", "taloushallin", "reskontr"], en: ["accounting", "bookkeeping", "accounts payable", "finance"] },
  { id: "construction", label: "Construction", kind: "experience", fi: ["rakennu", "raken"], en: ["construction", "building site", "carpenter"] },
  { id: "manufacturing", label: "Production / manufacturing", kind: "experience", fi: ["tuotanto", "tehdas", "kokoonpan", "tuotannon"], en: ["production", "manufacturing", "factory", "assembly", "operator"] },
  { id: "welding", label: "Welding", kind: "skill", fi: ["hitsa"], en: ["welding", "welder"] },
  { id: "electrical", label: "Electrical work", kind: "skill", fi: ["sähkö"], en: ["electrician", "electrical"] },
  { id: "delivery", label: "Delivery / driving work", kind: "experience", fi: ["kuljetu", "lähetti", "jakelu", "kuljettaj"], en: ["delivery", "courier", "driver", "distribution"] },
  { id: "security", label: "Security work", kind: "experience", fi: ["vartij", "turvallisuusal"], en: ["security guard", "security officer"] },
  { id: "shift", label: "Shift / weekend work", kind: "other", fi: ["vuorotyö", "vuoroty", "viikonlop", "iltavuor", "yövuor", "kolmivuor"], en: ["shift", "weekend", "night shift"], soft: true },
  { id: "teamwork", label: "Teamwork", kind: "other", fi: ["tiimi", "yhteistyö", "työyhtei"], en: ["team", "teamwork", "collaborat"], soft: true },
  { id: "independent", label: "Works independently", kind: "other", fi: ["itsenäi", "oma-alottei", "oma-aloittei"], en: ["independent", "self-directed", "initiative"], soft: true },
  { id: "reliable", label: "Reliability / punctuality", kind: "other", fi: ["luotetta", "täsmällis", "huolelli", "tunnollis"], en: ["reliable", "punctual", "careful", "conscientious"], soft: true },
  { id: "attitude", label: "Positive attitude / service mindset", kind: "other", fi: ["asenne", "palveluhenki", "reipas", "iloinen", "positiivi"], en: ["attitude", "positive", "service-minded", "cheerful"], soft: true },
  { id: "physical", label: "Physically demanding work", kind: "other", fi: ["fyysi", "ruumiillis"], en: ["physical", "lifting"], soft: true },
];

export interface LangSpec {
  name: string;
  fi: string[];
  en: string[];
}

export const LANGUAGES: LangSpec[] = [
  { name: "Finnish", fi: ["suomen", "suomea", "suomi"], en: ["finnish"] },
  { name: "Swedish", fi: ["ruotsin", "ruotsia", "ruotsi"], en: ["swedish"] },
  { name: "English", fi: ["englannin", "englantia", "englanti"], en: ["english"] },
  { name: "Russian", fi: ["venäjän", "venäjää"], en: ["russian"] },
  { name: "Estonian", fi: ["viron", "viroa"], en: ["estonian"] },
];

// Common job-ad vocabulary shown in the "Vocabulary" panel.
export const VOCAB: Record<string, [string, string]> = {
  haemme: ["we are looking for", "Opening phrase: 'Haemme...' = we are hiring..."],
  edellytämme: ["we require", "What follows is mandatory."],
  "edellytyksenä": ["a prerequisite is", "Mandatory requirement."],
  vaadimme: ["we require", "Mandatory."],
  odotamme: ["we expect", "Usually requirements."],
  toivomme: ["we hope for", "Usually preferred, not mandatory."],
  eduksi: ["an advantage", "'Eduksi katsotaan' = considered an advantage (preferred)."],
  arvostamme: ["we value", "Preferred."],
  tarjoamme: ["we offer", "What the employer gives you."],
  tehtäv: ["tasks / duties", "tehtävä = task, tehtäviin kuuluu = duties include"],
  työaika: ["working hours", ""],
  "osa-aikai": ["part-time", ""],
  kokoaikai: ["full-time", ""],
  "määräaikai": ["fixed-term", "The contract has an end date."],
  vakituin: ["permanent", ""],
  toistaiseksi: ["until further notice (permanent)", "'toistaiseksi voimassa oleva' = permanent contract"],
  palkka: ["salary", ""],
  palkkaus: ["pay / salary basis", "Often 'TES:n mukainen' = per collective agreement."],
  tes: ["collective agreement", "Minimum pay/conditions set by the sector's agreement."],
  työehtosopimu: ["collective agreement", ""],
  hakemus: ["application", ""],
  viimeistään: ["at the latest", "Deadline marker."],
  "haku päättyy": ["application closes", ""],
  ansioluettelo: ["CV / résumé", ""],
  cv: ["CV", ""],
  palkkatoive: ["salary expectation", "Some ads ask you to include it."],
  työkokemus: ["work experience", ""],
  kokemus: ["experience", ""],
  osaaminen: ["competence / know-how", ""],
  kielitaito: ["language skills", ""],
  sujuva: ["fluent", "≈ B2–C1"],
  "hyvä suomen": ["good Finnish", "≈ B1–B2"],
  "tyydyttävä": ["satisfactory", "≈ A2–B1"],
  perehdytys: ["job induction / onboarding", "Training given at start."],
  perehdytämme: ["we will train you", "Good sign for newcomers."],
  koeaika: ["probation period", "Usually up to 6 months."],
  työvuoro: ["work shift", ""],
  vuorotyö: ["shift work", ""],
  aloitus: ["start", "'Aloitus heti' = start immediately"],
  heti: ["immediately", ""],
  sopimuksen: ["by agreement", "'sopimuksen mukaan' = as agreed"],
  työpaikka: ["workplace / job", ""],
  työnantaja: ["employer", ""],
  työntekijä: ["employee", ""],
  rekrytoin: ["recruitment", ""],
  haastattelu: ["interview", "'Haastattelemme jo hakuaikana' = interviews during the application period"],
  hakuaika: ["application period", ""],
  "rikostausta": ["criminal background check", "Required for work with children/vulnerable people."],
  puhtaus: ["cleanliness", ""],
  siivous: ["cleaning", ""],
  laitoshuoltaja: ["institutional cleaner / facility care worker", "Cleans hospitals, schools, care homes."],
  asiakaspalvelu: ["customer service", ""],
  varasto: ["warehouse", ""],
  keräily: ["order picking", ""],
  ajokortti: ["driving licence", ""],
  trukkikortti: ["forklift licence", ""],
  hygieniapassi: ["hygiene passport", "Required for handling unpackaged food."],
  työturvallisuuskortti: ["occupational safety card", ""],
  ensiapu: ["first aid", ""],
  tiimi: ["team", ""],
  itsenäinen: ["independent", ""],
  huolellinen: ["careful / meticulous", ""],
  luotettava: ["reliable", ""],
  reipas: ["energetic / brisk", "Common trait word in Finnish ads."],
  palveluhenkinen: ["service-minded", ""],
  ammattitaito: ["professional skill", ""],
  tutkinto: ["degree / qualification", ""],
  perustutkinto: ["vocational upper-secondary qualification", ""],
  lähihoitaja: ["practical nurse", ""],
  varhaiskasvatus: ["early childhood education", ""],
  vuokratyö: ["agency work", "You're employed by a staffing agency."],
  henkilöstöpalvelu: ["staffing agency", ""],
  kuukausipalkka: ["monthly salary", ""],
  tuntipalkka: ["hourly wage", ""],
  "työterveys": ["occupational healthcare", "Common benefit."],
  lounasetu: ["lunch benefit", ""],
  liikuntaetu: ["sports/culture benefit", ""],
};

export const FI_CITIES = [
  "Helsinki", "Espoo", "Vantaa", "Tampere", "Turku", "Oulu", "Jyväskylä", "Lahti", "Kuopio", "Pori",
  "Kouvola", "Joensuu", "Lappeenranta", "Hämeenlinna", "Vaasa", "Seinäjoki", "Rovaniemi", "Mikkeli",
  "Kotka", "Salo", "Porvoo", "Kokkola", "Hyvinkää", "Lohja", "Järvenpää", "Rauma", "Kerava", "Kajaani",
  "Nurmijärvi", "Kirkkonummi", "Tuusula", "Kangasala", "Savonlinna", "Riihimäki", "Imatra", "Nokia",
];
