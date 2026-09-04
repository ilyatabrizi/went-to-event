import { PORTRAITS, photoUrl } from './geo.js';

export const USERS = {
  ava:   { name:'Ava Reyes',        handle:'avareyes',   bio:'Chasing warehouse sets and slow rooftop mornings.', followers:428,     following:186 },
  maya:  { name:'Maya Sato',        handle:'mayasato',   bio:'DJ-adjacent. I know someone at every door.',        followers:'12.4k', following:301, member:true },
  jules: { name:'Jules Amara',      handle:'julesa',     bio:'Film photos, late dinners, longer walks.',          followers:2140,    following:412 },
  ravi:  { name:'Ravi Deshpande',   handle:'ravid',      bio:'Climbing, curries and questionable 6am plans.',     followers:876,     following:534 },
  dee:   { name:'Dee Larson',       handle:'deelarson',  bio:'Sunrise yoga, sunset negronis.',                    followers:1503,    following:288 },
  noor:  { name:'Noor Haddad',      handle:'noorh',      bio:'Comedy nights and market Sundays.',                 followers:934,     following:377 },
  sam:   { name:'Sam Ortega',       handle:'samo',       bio:'Five-a-side, then tacos. Non-negotiable.',          followers:645,     following:503 },
  theo:  { name:'Theo Marchetti',   handle:'theom',      bio:'Host & member. Rooftop tables, long tables.',       followers:'21.8k', following:120, member:true },
  ines:  { name:'Ines Laurent',     handle:'ineslaurent',bio:'Natural wine, neo-soul, no small talk.',            followers:'8.1k',  following:214, member:true },
  kenji: { name:'Kenji Watanabe',   handle:'kenjiw',     bio:'Vinyl only. Ramen after.',                          followers:3120,    following:198 },
  lucia: { name:'Lucia Ferreira',   handle:'luciaf',     bio:'Dancer. Two left feet on purpose.',                 followers:'15.2k', following:265, member:true },
  omar:  { name:'Omar Aziz',        handle:'omaraziz',   bio:'Desert runs and rooftop shisha.',                   followers:1890,    following:441 },
  priya: { name:'Priya Nair',       handle:'priyan',     bio:'Supper clubs and spice routes.',                    followers:2670,    following:312 },
  finn:  { name:'Finn O’Brien',     handle:'finnob',     bio:'Trad sessions, sea swims, pints.',                  followers:712,     following:389 },
  zara:  { name:'Zara Malik',       handle:'zaramalik',  bio:'Curator. If it’s beautiful, I’ll find it.',         followers:'9.4k',  following:158, member:true },
};

const BG = ['#2A2036','#20303A','#33261B','#243020','#1E2838','#2E1F30','#1F3028','#301F26'];
Object.keys(USERS).forEach((k, i) => {
  const u = USERS[k];
  u.key = k;
  u.photo = photoUrl(PORTRAITS[i % PORTRAITS.length], 200);
  u.bg = BG[i % BG.length];
  u.initials = u.name.split(/\s+/).slice(0, 2).map(w => w[0]).join('');
});

export const ME = 'ava';
export const FRIENDS = ['maya','jules','ravi','dee','noor','sam','theo','ines','kenji','lucia','omar','priya','finn','zara'];

export const POSTS = [
  { id:'p1', author:'maya',  ago:'2h', text:'that warehouse set last night is still ringing in my ears. four rooms, zero phones, all gas.', photo:'cov:Nightlife', likes:212, replies:14, eventId:1 },
  { id:'p2', author:'theo',  ago:'5h', text:'morning run by the bridge, oat flat white, nothing else on the calendar. this is the weekend.', photo:null, likes:531, replies:33, eventId:7 },
  { id:'p3', author:'ines',  ago:'1d', text:'wine crawl report: bar three had a pet-nat that ruined me for supermarket rosé forever.', photo:'cov:Food', likes:98, replies:7, eventId:14 },
  { id:'p4', author:'jules', ago:'1d', text:'neo-soul quartet plus a surprise vocalist. goosebumps. Nightbloom never misses.', photo:null, likes:140, replies:9, eventId:11 },
  { id:'p5', author:'kenji', ago:'2d', text:'all-vinyl basement, low ceiling, big system. exactly how it should be done.', photo:'cov:Nightlife', likes:203, replies:12, eventId:10 },
  { id:'p6', author:'dee',   ago:'2d', text:'sunrise yoga then negronis by six. balance is real and I have found it.', photo:'cov:Wellness', likes:76, replies:5, eventId:2 },
  { id:'p7', author:'zara',  ago:'3d', text:'the makers market keeps getting better. came for ceramics, left with a print and a plant.', photo:'cov:Markets', likes:167, replies:8, eventId:16 },
  { id:'p8', author:'ava',   ago:'3d', text:'saved six things for this weekend and I will attend exactly two of them, as tradition demands.', photo:null, likes:64, replies:11, eventId:null },
];

export const CONVOS = [
  { user:'maya',  ago:'2m',        unread:2, msgs:[{f:'them',t:'are you going to Warehouse Sessions tonight??',w:'9:02 PM'},{f:'them',t:'jules and I are at mine at 8 if you want to pregame',w:'9:02 PM'}] },
  { user:'theo',  ago:'1h',        unread:0, msgs:[{f:'me',t:'that bridge run wrecked me in the best way',w:'8:10 AM'},{f:'them',t:'haha welcome to the club. same time next Saturday?',w:'8:12 AM'},{f:'me',t:'deal',w:'8:13 AM'}] },
  { user:'ines',  ago:'3h',        unread:1, msgs:[{f:'them',t:'sending you the wine bar list from the crawl',w:'6:40 PM'},{f:'them',t:'bar three first, trust me',w:'6:41 PM'}] },
  { user:'kenji', ago:'5h',        unread:0, msgs:[{f:'them',t:'found a first-press of the record they closed with',w:'4:15 PM'},{f:'me',t:'no way. bring it Sunday',w:'4:20 PM'}] },
  { user:'jules', ago:'Yesterday', unread:0, msgs:[{f:'them',t:'photo dump from the jazz courtyard incoming',w:'2:15 PM'},{f:'me',t:'yes please',w:'2:20 PM'}] },
  { user:'lucia', ago:'Yesterday', unread:0, msgs:[{f:'them',t:'salsa social on thursday, you in?',w:'7:02 PM'}] },
  { user:'dee',   ago:'Mon',       unread:0, msgs:[{f:'me',t:'yoga sat morning?',w:'9:00 AM'},{f:'them',t:'always. I’ll save you a mat',w:'9:05 AM'}] },
  { user:'omar',  ago:'Mon',       unread:0, msgs:[{f:'them',t:'rooftop later this week? weather looks perfect',w:'5:30 PM'}] },
  { user:'priya', ago:'Tue',       unread:0, msgs:[{f:'them',t:'got us two seats at the supper club',w:'11:10 AM'},{f:'me',t:'you are a legend',w:'11:12 AM'}] },
  { user:'sam',   ago:'Wed',       unread:0, msgs:[{f:'them',t:'five-a-side, we’re one short',w:'6:00 PM'},{f:'me',t:'on my way',w:'6:04 PM'}] },
  { user:'zara',  ago:'Wed',       unread:0, msgs:[{f:'them',t:'members table saturday — got you on the list',w:'1:00 PM'}] },
];

export const NOTIFS = [
  { ic:'userplus',  user:'kenji', text:'started following you',                                        ago:'8m',  unread:true,  go:{ to:'user', key:'kenji' } },
  { ic:'heart',     user:'maya',  text:'liked your post',                                              ago:'22m', unread:true,  go:{ to:'profile' } },
  { ic:'bell',      eventId:1,    text:'Warehouse Sessions starts in 3 hours — your RSVP is confirmed',ago:'1h',  unread:true,  go:{ to:'event', id:1 } },
  { ic:'users',     eventId:11,   text:'Maya and 4 friends are going to Nightbloom Live',              ago:'2h',  unread:true,  go:{ to:'event', id:11 } },
  { ic:'chat',      user:'ines',  text:'sent you a message',                                           ago:'3h',  unread:false, go:{ to:'thread', key:'ines' } },
  { ic:'diamond',                 text:'A members-only event just dropped near you',                   ago:'5h',  unread:false, go:{ to:'event', id:18 } },
  { ic:'sparkle',   user:'theo',  text:'posted a new event you might like',                            ago:'6h',  unread:false, go:{ to:'user', key:'theo' } },
  { ic:'ticket',    eventId:7,    text:'Price kept — Sunrise Bridge Run is still free to RSVP',        ago:'9h',  unread:false, go:{ to:'event', id:7 } },
  { ic:'userplus',  user:'lucia', text:'started following you',                                        ago:'1d',  unread:false, go:{ to:'user', key:'lucia' } },
  { ic:'cal',       eventId:4,    text:'Reminder: Founders & Frontiers is on Wednesday',               ago:'1d',  unread:false, go:{ to:'event', id:4 } },
  { ic:'heart',     user:'jules', text:'and 11 others liked your post',                                ago:'1d',  unread:false, go:{ to:'profile' } },
  { ic:'shield',                  text:'Thanks — the report you filed was reviewed and actioned',      ago:'2d',  unread:false, go:null },
  { ic:'users',     eventId:16,   text:'Zara saved Twilight Makers Market',                            ago:'2d',  unread:false, go:{ to:'event', id:16 } },
  { ic:'diamond',                 text:'Your City Concierge plan for the weekend is ready',            ago:'3d',  unread:false, go:{ to:'premium' } },
];
