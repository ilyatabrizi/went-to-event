import { CATS, CITY2COUNTRY, catLabel } from './geo.js';
import { hashStr, rng, pick, money } from '../util.js';
import { FRIENDS } from './people.js';

export const BY_ID = {};
let NEXT_ID = 9000;
export const nextId = () => NEXT_ID++;

/* The hand-written San Francisco catalogue. Everything else in the world is
   generated from a seed, but the city a demo opens on has to be real writing —
   generated copy is where a pitch gets caught. */
const SF = [
  { id:1, cat:'Nightlife', title:'Warehouse Sessions Vol. 9', host:'Substrata Collective', hostEvents:24,
    when:'Tonight · 9:00 PM', dateLong:'Fri, 6 Sep', timeRange:'9:00 PM – 3:00 AM', venue:'Pier 70',
    address:'420 22nd St, Dogpatch', dist:1.2, going:214, friends:['maya','jules','ravi'], soon:true,
    about:'Four rooms, one raw industrial shell on the waterfront. House and techno until sunrise with a rotating cast of local selectors. 21+, ID at the door.',
    tiers:[{name:'General Admission',desc:'Entry after 9pm',price:25},{name:'Early + Drink',desc:'Entry + house cocktail',price:38},{name:'VIP Table',desc:'Reserved table for four',price:120}] },
  { id:2, cat:'Wellness', title:'Sunrise Rooftop Yoga', host:'The Assembly', hostEvents:58,
    when:'Sat · 7:00 AM', dateLong:'Sat, 7 Sep', timeRange:'7:00 – 8:15 AM', venue:'The Assembly Rooftop',
    address:'150 Valencia St', dist:0.6, going:42, friends:['dee'],
    about:'Start the weekend above the fog with a slow vinyasa flow as the city wakes up. All levels welcome, mats provided.',
    tiers:[{name:'RSVP',desc:'Free · bring a mat',price:0}] },
  { id:3, cat:'Food', title:'Third Culture Supper Club', host:'Mira Okafor', hostEvents:11,
    when:'Sat · 7:30 PM', dateLong:'Sat, 7 Sep', timeRange:'7:30 – 10:30 PM', venue:'Mission Kitchen',
    address:'2820 Mission St', dist:2.1, going:28, friends:['priya'], member:true,
    about:'A five-course communal dinner tracing one chef’s diasporic memory across three continents, paired with natural wines. One long table.',
    tiers:[{name:'Communal Seat',desc:'5 courses + wine pairing',price:65},{name:'Chef’s Counter',desc:'Front row + two extra courses',price:95}] },
  { id:4, cat:'Talks', title:'Founders & Frontiers', host:'Civic Hall SF', hostEvents:132,
    when:'Wed · 6:00 PM', dateLong:'Wed, 11 Sep', timeRange:'6:00 – 8:00 PM', venue:'Civic Hall',
    address:'135 Mission St', dist:0.9, going:130, friends:['noor','sam','maya','jules','dee'],
    about:'Three operators who scaled hard things share what broke and what they’d do differently. Moderated Q&A, then drinks.',
    tiers:[{name:'General',desc:'Free · seats limited',price:0},{name:'Supporter',desc:'Reserved front seating',price:10}] },
  { id:5, cat:'Art', title:'Analog Film Photo Walk', host:'Grain Society', hostEvents:19,
    when:'Sun · 10:00 AM', dateLong:'Sun, 8 Sep', timeRange:'10:00 AM – 12:00 PM', venue:'Dolores Park',
    address:'19th & Dolores St', dist:1.8, going:36, friends:['ravi','dee'],
    about:'A guided two-hour walk shooting 35mm around the Mission. Bring any film camera; we cover metering and composition.',
    tiers:[{name:'Photo Walk',desc:'2 hrs · film not included',price:15}] },
  { id:6, cat:'Sports', title:'Five-a-Side Night League', host:'Crocker Courts', hostEvents:76,
    when:'Thu · 8:00 PM', dateLong:'Thu, 12 Sep', timeRange:'8:00 – 9:30 PM', venue:'Crocker Courts',
    address:'260 Bush St', dist:1.1, going:60, friends:['ravi','dee','sam','noor'],
    about:'Casual, competitive five-a-side under the lights. Solo players welcome — we balance the teams. No metal studs.',
    tiers:[{name:'Player Spot',desc:'Per player · 90 mins',price:12}] },
  { id:7, cat:'Fitness', title:'Sunrise Bridge Run · 5K', host:'Ridgeline Run Club', hostEvents:64,
    when:'Sat · 6:45 AM', dateLong:'Sat, 7 Sep', timeRange:'6:45 – 8:00 AM', venue:'Crissy Field',
    address:'1199 East Beach', dist:2.4, going:88, friends:['jules','dee'],
    about:'A social 5K along the waterfront to the bridge and back, three pace groups so nobody runs alone. Coffee at the finish.',
    tiers:[{name:'RSVP',desc:'Free · all paces',price:0},{name:'Club Kit',desc:'RSVP + technical tee',price:28}] },
  { id:8, cat:'Fitness', title:'Forge Strength: Open-Gym HIIT', host:'Forge Strength', hostEvents:41,
    when:'Mon · 6:30 PM', dateLong:'Mon, 9 Sep', timeRange:'6:30 – 7:30 PM', venue:'Forge SoMa',
    address:'88 Bluxome St', dist:0.8, going:40, friends:['sam'],
    about:'A coached 60-minute circuit — kettlebells, rowers, sleds. Scalable for every level; chalk and water provided.',
    tiers:[{name:'Drop-in',desc:'One session',price:18},{name:'Class + Recovery',desc:'Session + sauna',price:30}] },
  { id:9, cat:'Outdoors', title:'Lands End Coastal Hike', host:'Trailheads', hostEvents:52,
    when:'Sun · 9:00 AM', dateLong:'Sun, 8 Sep', timeRange:'9:00 – 11:30 AM', venue:'Lands End Trailhead',
    address:'680 Point Lobos Ave', dist:3.0, going:33, friends:['ravi','finn'],
    about:'A guided coastal hike with ocean views the whole way. Easy pace, small group, water provided.',
    tiers:[{name:'RSVP',desc:'Free · all levels',price:0}] },
  { id:10, cat:'Nightlife', title:'Basement Disco: All Vinyl', host:'Nightbloom Records', hostEvents:37,
    when:'Sat · 10:00 PM', dateLong:'Sat, 7 Sep', timeRange:'10:00 PM – 2:00 AM', venue:'The Cellar',
    address:'715 Harrison St', dist:1.4, going:120, friends:['maya','sam','kenji'],
    about:'Strictly wax — disco, boogie and Italo across two turntables and a wall of records. Low ceiling, big system.',
    tiers:[{name:'Advance',desc:'Entry before midnight',price:20},{name:'Door',desc:'Entry all night',price:25}] },
  { id:11, cat:'Music', title:'Nightbloom Live: Neo-Soul', host:'Nightbloom Records', hostEvents:37,
    when:'Sun · 8:00 PM', dateLong:'Sun, 8 Sep', timeRange:'8:00 – 11:00 PM', venue:'Great Star Hall',
    address:'636 Jackson St', dist:1.6, going:96, friends:['maya','jules','ravi'],
    about:'A live neo-soul quartet with guest vocalists, warm horns and a late-set jam. Seated early, standing once it hits.',
    tiers:[{name:'General',desc:'Standing room',price:28},{name:'Reserved',desc:'Seated · first two rows',price:48}] },
  { id:12, cat:'Music', title:'Courtyard Jazz Sundays', host:'The Assembly', hostEvents:58,
    when:'Sun · 4:00 PM', dateLong:'Sun, 8 Sep', timeRange:'4:00 – 7:00 PM', venue:'The Assembly Courtyard',
    address:'150 Valencia St', dist:0.6, going:54, friends:['dee'],
    about:'An easy afternoon of live trio jazz in the open courtyard, natural wine and small plates. Family and dog friendly.',
    tiers:[{name:'RSVP',desc:'Free entry',price:0},{name:'Reserved Table',desc:'Table for two + first round',price:35}] },
  { id:13, cat:'Wellness', title:'Sound Bath & Breathwork', host:'The Assembly', hostEvents:58,
    when:'Wed · 7:30 PM', dateLong:'Wed, 11 Sep', timeRange:'7:30 – 8:45 PM', venue:'The Assembly Studio',
    address:'150 Valencia St', dist:0.6, going:30, friends:[],
    about:'Seventy-five minutes of guided breathwork settling into a crystal-bowl sound bath. Bolsters and blankets provided.',
    tiers:[{name:'Mat Space',desc:'Bolster + blanket',price:24}] },
  { id:14, cat:'Food', title:'Natural Wine Crawl', host:'Mira Okafor', hostEvents:11,
    when:'Fri · 6:30 PM', dateLong:'Fri, 13 Sep', timeRange:'6:30 – 9:30 PM', venue:'Starts at Bar Part Time',
    address:'496 14th St', dist:1.9, going:47, friends:['maya','noor','ines'],
    about:'Three low-intervention wine bars, a host-poured flight at each and snacks along the way. Small group, walkable route.',
    tiers:[{name:'Crawl Ticket',desc:'3 flights + snacks',price:45}] },
  { id:15, cat:'Comedy', title:'Laugh Cellar: Late Set', host:'Laugh Cellar', hostEvents:88,
    when:'Sat · 9:30 PM', dateLong:'Sat, 7 Sep', timeRange:'9:30 – 11:00 PM', venue:'The Laugh Cellar',
    address:'50 Mason St', dist:1.0, going:72, friends:['sam','noor'],
    about:'Six comics, one tight late set and a surprise headliner working new material. Two-item minimum; front rows are fair game.',
    tiers:[{name:'General',desc:'Open seating',price:18},{name:'Front Row',desc:'Reserved · closest tables',price:32}] },
  { id:16, cat:'Markets', title:'Twilight Makers Market', host:'Grain Society', hostEvents:19,
    when:'Sun · 3:00 PM', dateLong:'Sun, 8 Sep', timeRange:'3:00 – 8:00 PM', venue:'Thrive City Plaza',
    address:'1 Warriors Way', dist:2.6, going:210, friends:['zara'],
    about:'Forty independent makers — ceramics, print, jewellery, small-batch food — with live music as the sun drops. Free entry.',
    tiers:[{name:'Free Entry',desc:'Come and go all evening',price:0}] },
  { id:17, cat:'Film', title:'Rooftop Cinema: Cult Classics', host:'Civic Hall SF', hostEvents:132,
    when:'Fri · 8:30 PM', dateLong:'Fri, 13 Sep', timeRange:'8:30 – 11:00 PM', venue:'Civic Hall Roof',
    address:'135 Mission St', dist:0.9, going:140, friends:['jules','dee','maya'], member:true,
    about:'A cult classic under the stars with wireless headphones, deck chairs and a small bar. Bring a jacket — it gets breezy.',
    tiers:[{name:'Deck Chair',desc:'Seat + headphones',price:16},{name:'Sofa for Two',desc:'Shared sofa + blanket',price:38}] },
  { id:18, cat:'Nightlife', title:'Members’ Rooftop Table', host:'Went To Event', hostEvents:9,
    when:'Sat · 8:00 PM', dateLong:'Sat, 7 Sep', timeRange:'8:00 PM – late', venue:'The Terrace',
    address:'Members only · SoMa', dist:1.0, going:36, friends:['theo','ines','zara'], member:true,
    about:'A members-only rooftop table with a welcome pour, a resident selector and the city skyline. Verified members only.',
    tiers:[{name:'Member Seat',desc:'Welcome pour included',price:0}] },
];

function finish(e, city) {
  e.city = city;
  e.country = CITY2COUNTRY[city] || '';
  const prices = e.tiers.map(t => t.price);
  e.minPrice = Math.min(...prices);
  e.priceLabel = money(e.minPrice);
  e.catLabel = catLabel(e.cat);
  BY_ID[e.id] = e;
  return e;
}
SF.forEach(e => finish(e, 'San Francisco'));

/* ---- generator ----------------------------------------------------------
   A city the user picks has to feel inhabited within one frame. Seeded on the
   city name, so Tokyo is the same Tokyo every time you come back to it. */
const TPL = {
  Nightlife:[['Warehouse Sessions','a raw industrial shell, four rooms, house and techno until sunrise'],['Basement Disco','strictly vinyl — disco, boogie and Italo on a big system in a low room'],['Rooftop After Hours','open-air decks, skyline on every side and a resident selector until late']],
  Music:[['Live: Neo-Soul Quartet','warm horns, guest vocalists and a late-set jam that runs long'],['Courtyard Jazz','a live trio in the open air with natural wine and small plates'],['Vinyl Listening Room','one album, start to finish, on a system built for it']],
  Food:[['Supper Club','a communal dinner at one long table, paired with low-intervention wine'],['Natural Wine Crawl','three bars, a host-poured flight at each and snacks along the way'],['Night Market Kitchen','a dozen kitchens, one courtyard, everything under twelve']],
  Fitness:[['Sunrise 5K','a social run in three pace groups so nobody runs alone. Coffee at the finish'],['Open-Gym HIIT','a coached 60-minute circuit, scalable for every level'],['Climb & Coffee','a beginner-friendly bouldering session, then flat whites next door']],
  Wellness:[['Sunrise Rooftop Yoga','a slow vinyasa flow as the city wakes up. Mats provided'],['Sound Bath & Breathwork','guided breathwork settling into a crystal-bowl sound bath'],['Cold Plunge Social','contrast therapy with a sauna, a plunge and better conversation than expected']],
  Art:[['Analog Photo Walk','a guided two-hour walk shooting 35mm. Bring any film camera'],['Late Gallery Opening','a new show, the artist in the room and a bar that stays open'],['Life Drawing Social','a two-hour session with a model, all materials included']],
  Sports:[['Five-a-Side Night League','casual, competitive, under the lights. Solo players welcome'],['Sunday Padel Ladder','doubles, rotating partners, all levels'],['Harbour Swim Club','an open-water loop with kayak cover and hot drinks after']],
  Talks:[['Founders & Frontiers','three operators on what broke and what they would do differently'],['Design in Practice','a working session with people who ship, not slides'],['City Futures','how this city is changing, argued properly, then drinks']],
  Comedy:[['Late Set','six comics, one tight hour and a surprise headliner working new material'],['New Material Night','half-finished jokes tested on a forgiving room'],['Improv Jam','the audience picks, the cast suffers, everybody wins']],
  Markets:[['Twilight Makers Market','forty independent makers with live music as the sun drops'],['Sunday Flea','print, ceramics, vintage and one very good coffee cart'],['Record Fair','crates, dealers and a listening station that always has a queue']],
  Film:[['Rooftop Cinema','a cult classic under the stars with wireless headphones and deck chairs'],['Director’s Cut Night','the long version, on film, with the projectionist explaining why'],['Short Film Showcase','eight shorts, a Q&A and a bar that stays open after']],
  Theatre:[['Studio Night','a new play at half length, staged in the round for forty people'],['Dance: New Work','three pieces in progress, shown honestly with notes after']],
  Workshops:[['Ceramics: Hand-Building','one evening, one pot, everything fired and posted to you'],['Film Developing 101','shoot in the afternoon, develop it yourself by nine'],['Cocktail Fundamentals','three classics, why they work, and how to fix yours']],
  Outdoors:[['Coastal Hike','a guided walk with ocean views the whole way. Easy pace, small group'],['Golden Hour Cycle','a flat 20km loop timed to finish exactly at sunset'],['Foraging Walk','what is edible here, with someone who genuinely knows']],
  Community:[['Neighbourhood Potluck','bring a dish, meet the street, stay longer than planned'],['Repair Café','bring the broken thing, leave with it working'],['New In Town','a low-stakes drink for people who moved here in the last year']],
};
const HOSTS = ['Substrata Collective','Nightbloom Records','The Assembly','Grain Society','Civic Hall','Trailheads','Ridgeline Run Club','Forge Strength','Laugh Cellar','Long Table Society','Mercury Rooms','Northline Studio'];
const VENUES = ['The Terrace','Pier Warehouse','Old Print Works','The Cellar','Courtyard No. 4','Riverside Rooms','The Glasshouse','Depot 12','Union Hall','The Attic','Harbour Studio','Palm Court'];
const STREETS = ['Market St','Old Quarter','Harbour Rd','Station Rd','Mill Lane','Bridge St','Central Ave','Riverside','The Docks','Cathedral Sq'];
const DAYS = ['Tonight','Tomorrow','Fri','Sat','Sat','Sun','Sun','Mon','Tue','Wed','Thu'];
const TIMES = [['7:00 AM','7:00 – 8:15 AM'],['9:00 AM','9:00 – 11:30 AM'],['12:30 PM','12:30 – 3:00 PM'],['4:00 PM','4:00 – 7:00 PM'],['6:30 PM','6:30 – 9:30 PM'],['8:00 PM','8:00 – 11:00 PM'],['10:00 PM','10:00 PM – 2:00 AM']];
const DATES = ['Fri, 6 Sep','Sat, 7 Sep','Sun, 8 Sep','Mon, 9 Sep','Tue, 10 Sep','Wed, 11 Sep','Thu, 12 Sep','Fri, 13 Sep','Sat, 14 Sep'];

const CACHE = { 'San Francisco': SF };

export function eventsForCity(city) {
  if (CACHE[city]) return CACHE[city];
  const seed = hashStr(city);
  const r = rng(seed);
  const list = [];
  const keys = CATS.map(c => c.key);
  const n = 9 + Math.floor(r() * 17);   /* 9–25, so cities differ at a glance */
  for (let i = 0; i < n; i++) {
    const cat = keys[(i * 7 + seed) % keys.length];
    const tpl = pick(r, TPL[cat] || TPL.Nightlife);
    const ti = pick(r, TIMES);
    const free = r() < 0.3;
    const base = 12 + Math.floor(r() * 46);
    const tiers = free
      ? [{ name:'RSVP', desc:'Free entry', price:0 }]
      : [{ name:'General', desc:'Standard entry', price:base },
         { name:'Plus One', desc:'Entry + welcome drink', price:base + 12 }];
    const nf = Math.floor(r() * 4);
    const friends = [];
    for (let f = 0; f < nf; f++) {
      const k = FRIENDS[Math.floor(r() * FRIENDS.length)];
      if (!friends.includes(k)) friends.push(k);
    }
    const day = pick(r, DAYS);
    list.push(finish({
      id: hashStr(city + i) % 900000 + 100000,
      cat, title: tpl[0], about: tpl[1].charAt(0).toUpperCase() + tpl[1].slice(1) + '.',
      host: pick(r, HOSTS), hostEvents: 6 + Math.floor(r() * 120),
      when: day + ' · ' + ti[0], dateLong: pick(r, DATES), timeRange: ti[1],
      venue: pick(r, VENUES), address: (10 + Math.floor(r() * 180)) + ' ' + pick(r, STREETS) + ', ' + city,
      dist: Math.round(r() * 48) / 10 + 0.2,
      going: 12 + Math.floor(r() * 260), friends,
      member: r() < 0.09, soon: day === 'Tonight',
      tiers,
    }, city));
  }
  CACHE[city] = list;
  return list;
}

export function addEvent(ev, city) {
  finish(ev, city);
  const list = eventsForCity(city);
  list.unshift(ev);
  return ev;
}
export const byId = id => BY_ID[id] || SF[0];
export { SF };
