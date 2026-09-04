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

/* Unsplash, hotlinked with a deterministic pick per event. A gradient sits
   underneath every one, so a blocked or slow image degrades to brand, not to a
   grey hole. */
export const IMG = {
  Nightlife:['1470229722913-7c0e2dbbafd3','1492684223066-81342ee5ff30','1516450360452-9312f5e86fc7','1533174072545-7a4b6ad7a6c3','1571266028243-e4733b0f0bb0'],
  Music:['1459749411175-04bf5292ceea','1470225620780-dba8ba36b745','1501386761578-eac5c94b800a','1506157786151-b8491531f063','1524368535928-5b5e00ddc76b'],
  Food:['1414235077428-338989a2e8c0','1424847651672-bf20a4b0982b','1476224203421-9ac39bcb3327','1517248135467-4c7edcad34c4','1555939594-58d7cb561ad1'],
  Fitness:['1476480862126-209bfaa8edc8','1517836357463-d25dfeac3438','1518611012118-696072aa579a','1571019613454-1cb2f99b2d8b'],
  Wellness:['1506126613408-eca07ce68773','1544367567-0f2fcb009e0b','1591228127791-8e2eaef098d3','1545389336-cf090694435e'],
  Art:['1460661419201-fd4cecdf8a8b','1531058020387-3be344556be6','1536924940846-227afb31e2a5'],
  Sports:['1431324155629-1a6deb1dec8d','1461896836934-ffe607ba8211','1517649763962-0c623066013b'],
  Talks:['1475721027785-f74eccf877e2','1505373877841-8d25f7d46678','1515187029135-18ee286d815b'],
  Comedy:['1527224538127-2104bb71c51b','1585699324551-f6c309eedeca'],
  Markets:['1488459716781-31db52582fe9','1524850011238-e3d235c7d4c9'],
  Film:['1440404653325-ab127d49abc1','1489599849927-2ee91cede3ba'],
  Theatre:['1503095396549-807759245b35','1507924538820-ede94a04019d'],
  Workshops:['1452860606245-08befc0ff44b','1516321318423-f06f85e504b3'],
  Outdoors:['1454496522488-7a8e488e8606','1551632811-561732d1e306'],
  Community:['1511632765486-a01980e01a18','1528605248644-14dd04022da1'],
};
export const PORTRAITS = ['1438761681033-6461ffad8d80','1472099645785-5658abf4ff4e','1487412720507-e7ab37603c6f','1494790108377-be9c29b29330','1500648767791-00dcc994a43e','1502685104226-ee32379fefbe','1506794778202-cad84cf45f1d','1507003211169-0a1dd7228f2d','1517841905240-472988babdf9','1519345182560-3f2917c472ef','1522075469751-3a6694fb2f61','1524504388940-b1c1722653e1','1534528741775-53994a69daeb','1544005313-94ddf0286df2'];

export const photoUrl = (id, w = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=78&auto=format&fit=crop`;
