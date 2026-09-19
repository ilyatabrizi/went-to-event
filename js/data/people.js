
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
  u.bg = BG[i % BG.length];
  u.initials = u.name.split(/\s+/).slice(0, 2).map(w => w[0]).join('');
});

export const ME = 'ava';
export const FRIENDS = ['maya','jules','ravi','dee','noor','sam','theo','ines','kenji','lucia','omar','priya','finn','zara'];



