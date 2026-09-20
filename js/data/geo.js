/* Countries and cities. Dubai sits high on purpose — it is where the studio is. */
export const COUNTRIES = [
  { name:'United States',        code:'US', flag:'🇺🇸', cities:['San Francisco','New York','Los Angeles','Chicago','Miami','Austin','Seattle','New Orleans'] },
  { name:'United Arab Emirates', code:'AE', flag:'🇦🇪', cities:['Dubai','Abu Dhabi','Sharjah','Ras Al Khaimah'] },
  { name:'United Kingdom',       code:'GB', flag:'🇬🇧', cities:['London','Manchester','Edinburgh','Bristol','Brighton','Glasgow','Leeds'] },
  { name:'France',               code:'FR', flag:'🇫🇷', cities:['Paris','Lyon','Marseille','Bordeaux','Nice','Toulouse'] },
  { name:'Japan',                code:'JP', flag:'🇯🇵', cities:['Tokyo','Osaka','Kyoto','Fukuoka','Sapporo','Nagoya'] },
  { name:'Germany',              code:'DE', flag:'🇩🇪', cities:['Berlin','Munich','Hamburg','Cologne','Frankfurt'] },
  { name:'Spain',                code:'ES', flag:'🇪🇸', cities:['Madrid','Barcelona','Valencia','Seville','Bilbao'] },
  { name:'Italy',                code:'IT', flag:'🇮🇹', cities:['Rome','Milan','Florence','Naples','Turin','Bologna'] },
  { name:'Netherlands',          code:'NL', flag:'🇳🇱', cities:['Amsterdam','Rotterdam','Utrecht','The Hague'] },
  { name:'Türkiye',              code:'TR', flag:'🇹🇷', cities:['Istanbul','Izmir','Antalya','Ankara'] },
  { name:'Portugal',             code:'PT', flag:'🇵🇹', cities:['Lisbon','Porto','Faro'] },
  { name:'Greece',               code:'GR', flag:'🇬🇷', cities:['Athens','Thessaloniki','Mykonos'] },
  { name:'Australia',            code:'AU', flag:'🇦🇺', cities:['Sydney','Melbourne','Brisbane','Perth','Adelaide'] },
  { name:'Canada',               code:'CA', flag:'🇨🇦', cities:['Toronto','Vancouver','Montreal','Calgary','Ottawa'] },
  { name:'Singapore',            code:'SG', flag:'🇸🇬', cities:['Singapore'] },
  { name:'Mexico',               code:'MX', flag:'🇲🇽', cities:['Mexico City','Guadalajara','Tulum','Monterrey'] },
  { name:'Brazil',               code:'BR', flag:'🇧🇷', cities:['São Paulo','Rio de Janeiro','Salvador','Brasília'] },
  { name:'India',                code:'IN', flag:'🇮🇳', cities:['Mumbai','Delhi','Bangalore','Goa','Jaipur'] },
  { name:'Thailand',             code:'TH', flag:'🇹🇭', cities:['Bangkok','Chiang Mai','Phuket'] },
  { name:'Ireland',              code:'IE', flag:'🇮🇪', cities:['Dublin','Cork','Galway'] },
  { name:'Sweden',               code:'SE', flag:'🇸🇪', cities:['Stockholm','Gothenburg','Malmö'] },
  { name:'Denmark',              code:'DK', flag:'🇩🇰', cities:['Copenhagen','Aarhus'] },
  { name:'Norway',               code:'NO', flag:'🇳🇴', cities:['Oslo','Bergen'] },
  { name:'Switzerland',          code:'CH', flag:'🇨🇭', cities:['Zurich','Geneva','Basel'] },
  { name:'Austria',              code:'AT', flag:'🇦🇹', cities:['Vienna','Salzburg','Graz'] },
  { name:'Belgium',              code:'BE', flag:'🇧🇪', cities:['Brussels','Antwerp','Ghent'] },
  { name:'South Korea',          code:'KR', flag:'🇰🇷', cities:['Seoul','Busan','Jeju'] },
  { name:'South Africa',         code:'ZA', flag:'🇿🇦', cities:['Cape Town','Johannesburg','Durban'] },
];

export const CITY2COUNTRY = {};
COUNTRIES.forEach(c => c.cities.forEach(city => { CITY2COUNTRY[city] = c.name; }));

export const CATS = [
  { key:'Nightlife',  label:'Nightlife',    icon:'sparkle'  },
  { key:'Music',      label:'Music',        icon:'note'     },
  { key:'Food',       label:'Food & Drink', icon:'wine'     },
  { key:'Fitness',    label:'Fitness',      icon:'bolt'     },
  { key:'Wellness',   label:'Wellness',     icon:'leaf'     },
  { key:'Art',        label:'Arts',         icon:'palette'  },
  { key:'Sports',     label:'Sports',       icon:'ball'     },
  { key:'Talks',      label:'Talks',        icon:'mic'      },
  { key:'Comedy',     label:'Comedy',       icon:'mask'     },
  { key:'Markets',    label:'Markets',      icon:'bag'      },
  { key:'Film',       label:'Film',         icon:'clapper'  },
  { key:'Theatre',    label:'Theatre',      icon:'star'     },
  { key:'Workshops',  label:'Workshops',    icon:'tools'    },
  { key:'Outdoors',   label:'Outdoors',     icon:'mountain' },
  { key:'Community',  label:'Community',    icon:'users'    },
];
export const catLabel = k => (CATS.find(c => c.key === k) || {}).label || k;
export const catIcon  = k => (CATS.find(c => c.key === k) || {}).icon  || 'sparkle';

/* Cover gradients. Every one of these is a dark Ink-family wash — the imagery
   supplies the colour, the brand palette stays intact underneath it. */
export const COV = {
  Nightlife:{ g:['#241826','#0E0B12'] }, Music:{ g:['#1B1A2E','#0C0B12'] },
  Food:     { g:['#2A1C14','#100C0A'] }, Fitness:{ g:['#2B1A12','#100B0A'] },
  Wellness: { g:['#152420','#0A0F0E'] }, Art:    { g:['#101F26','#080D11'] },
  Sports:   { g:['#1A2413','#0A0E08'] }, Talks:  { g:['#121A28','#080B11'] },
  Comedy:   { g:['#261D10','#100C08'] }, Markets:{ g:['#1F1A24','#0C0A10'] },
  Film:     { g:['#181422','#0A080F'] }, Theatre:{ g:['#231320','#0F080D'] },
  Workshops:{ g:['#22190F','#0E0A07'] }, Outdoors:{g:['#122019','#080D0B'] },
  Community:{ g:['#1E1826','#0C0A10'] },
};

/* Cover art is generated, not fetched — see js/artwork.js. */
