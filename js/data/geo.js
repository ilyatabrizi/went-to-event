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

/* SEVEN categories, remapped in the DATA rather than papered over with a
   fallback. Fifteen over eighteen events meant most chips returned one result
   or none, and the rail was 1,859px wide inside a 375px viewport. */
export const CATS = [
  { key:'Nightlife', label:'Nightlife',    icon:'sparkle'  },
  { key:'Music',     label:'Music',        icon:'note'     },
  { key:'Food',      label:'Food & Drink', icon:'wine'     },
  { key:'Arts',      label:'Arts',         icon:'palette'  },
  { key:'Active',    label:'Active',       icon:'bolt'     },
  { key:'Stage',     label:'Stage',        icon:'mic'      },
  { key:'Markets',   label:'Markets',      icon:'bag'      },
];

/* The old fifteen fold into the seven. Applied once, where events are built. */
export const CAT_MAP = {
  Nightlife:'Nightlife', Music:'Music', Food:'Food',
  Art:'Arts', Film:'Arts', Workshops:'Arts',
  Fitness:'Active', Sports:'Active', Wellness:'Active', Outdoors:'Active',
  Theatre:'Stage', Comedy:'Stage', Talks:'Stage',
  Markets:'Markets', Community:'Markets',
};
export const foldCat = (k) => CAT_MAP[k] || 'Nightlife';
export const catLabel = k => (CATS.find(c => c.key === k) || {}).label || k;
export const catIcon  = k => (CATS.find(c => c.key === k) || {}).icon  || 'sparkle';


/* Cover art is generated, not fetched — see js/artwork.js. */
