/* ==========================================================================
   build-pages.js, generates the "by reason" and "by country" landing pages
   and injects the two mega-menu dropdowns into every existing page.

   Single source of truth for the nav so all 29 pages stay identical.
   Run with:  node build-pages.js
   Safe to re-run (idempotent: skips nav blocks already upgraded).
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

/* ----------------------------------------------------------------- icons */
const ICON = {
  briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></svg>',
  cap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5"/></svg>',
  plane: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5l-7 7 3 1 1 3 3-3"/><path d="M21 3 9 15"/><path d="M21 3l-4 14-4-4"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.5 3-3.4 3-5.5A4.5 4.5 0 0 0 12 5 4.5 4.5 0 0 0 2 8.5c0 2.1 1.5 4 3 5.5l7 7z"/></svg>',
  ship: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18l1.6-5.5a1 1 0 0 1 1-.7h12.8a1 1 0 0 1 1 .7L21 18"/><path d="M12 11.8V6l5 3"/><path d="M2 21c1 0 1.5-1 3-1s2 1 3.5 1 2-1 3.5-1 2 1 3.5 1 2-1 3-1"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4v5c0 4.5-3 7.5-8 9-5-1.5-8-4.5-8-9V7l8-4z"/><path d="M9 12l2 2 4-4"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
};

/* ------------------------------------------------------------- reasons data */
const reasons = [
  {
    slug: 'business', file: 'visa-for-business.html', nav: 'Business trips', sub: 'Meetings, conferences, deals',
    icon: 'briefcase', lower: 'business‑trip',
    h1: 'Need a visa for a business trip?',
    intro: 'Conferences, client meetings, signing a deal, business travel comes with tight dates and extra paperwork. We handle the annoying parts so you make the meeting.',
    pains: [
      ['Invitation letters are a pain', 'A big chunk of rejections come from missing or badly‑worded invitation and sponsor letters. We tell you exactly what yours needs to say.'],
      ['You found out late', 'Business trips get booked fast. When you need a visa in days, not weeks, we put it on the priority track.'],
      ['You go back a lot', 'One‑entry visas are a hassle if you travel there often. We get you multiple‑entry wherever it’s allowed.']
    ],
    sol: [
      ['We sort the letters', 'Invitation, employer and sponsor letters, we give you the exact wording embassies actually want to see.'],
      ['Built for deadlines', 'Priority review and same‑day document checks for when the trip is, well, next week.'],
      ['A human checks it all', 'Every file is read by someone who has done this exact visa hundreds of times.']
    ],
    needs: ['Passport valid 6+ months', 'Invitation letter from the host company', 'Proof of employment or business registration', 'Recent bank statements', 'Travel and accommodation details'],
    dests: ['usa', 'uk', 'schengen', 'uae', 'india']
  },
  {
    slug: 'study', file: 'visa-for-study.html', nav: 'Study & education', sub: 'Universities & courses abroad',
    icon: 'cap', lower: 'student',
    h1: 'Need a student visa?',
    intro: 'Got the offer? Amazing. Now the visa, and student visas have the most moving parts of any kind. We keep them straight so you make the start of term.',
    pains: [
      ['Proving you can afford it', 'Schools and embassies want very specific proof of funds. Get the format wrong and it’s a refusal, we make sure yours qualifies.'],
      ['So many acceptance steps', 'CAS, I‑20, SEVIS, admission letters… the acronyms alone are a maze. We walk you through each one.'],
      ['Term starts soon', 'Miss the visa window and you miss the semester. We work backwards from your start date.']
    ],
    sol: [
      ['We map every step', 'From acceptance letter to the visa appointment, you get a clear checklist in plain English.'],
      ['We pressure‑test your funds', 'We check your financial evidence the way an officer will, before it’s submitted.'],
      ['We beat the term deadline', 'Faster review tiers so your visa lands before orientation does.']
    ],
    needs: ['Acceptance letter / CAS / I‑20 from your school', 'Proof of funds for tuition + living costs', 'Passport valid for your full course', 'Academic transcripts and certificates', 'Proof of accommodation'],
    dests: ['usa', 'uk', 'canada', 'australia', 'schengen']
  },
  {
    slug: 'tourism', file: 'visa-for-tourism.html', nav: 'Tourism & travel', sub: 'Holidays & sightseeing',
    icon: 'plane', lower: 'tourist',
    h1: 'Just want to travel?',
    intro: 'A holiday shouldn’t start with a bureaucratic headache. Tell us where you’re going and we’ll get the tourist visa sorted while you plan the fun stuff.',
    pains: [
      ['Which visa do I even need?', 'Tourist? Visitor? eVisa? Visa‑on‑arrival? We match you to the right one so you don’t apply for the wrong thing.'],
      ['Proving you’ll come back', 'Officers want to see ties home and a return plan. We help you show it cleanly.'],
      ['It feels like a lot for a short trip', 'For a 5‑day getaway, the paperwork feels absurd. We make it quick and boring (in a good way).']
    ],
    sol: [
      ['We pick the right one', 'No guessing between near‑identical options, we choose the correct visa for your trip.'],
      ['We prep your “return” story', 'Flights, ties and funds, presented the way embassies like to see them.'],
      ['Fast turnaround', 'Most tourist visas move quickly with us, often days, not weeks.']
    ],
    needs: ['Passport valid 6+ months', 'Return or onward flight details', 'Hotel or accommodation bookings', 'Recent bank statements', 'Travel insurance (required by some countries)'],
    dests: ['schengen', 'uae', 'usa', 'uk', 'australia']
  },
  {
    slug: 'family', file: 'visa-for-family.html', nav: 'Family & friends', sub: 'Weddings, visits, new babies',
    icon: 'heart', lower: 'visitor',
    h1: 'Visiting family or friends abroad?',
    intro: 'Weddings, new babies, or just missing people, don’t let a visa make you miss the moment. We handle the sponsor letters and proof so you actually get there.',
    pains: [
      ['The invitation letter', 'Your host usually has to write a specific invitation and prove their status. We tell them exactly what to include.'],
      ['Proving the relationship', 'Embassies want evidence you really know each other. We help you put it together without the awkwardness.'],
      ['Timing around the event', 'The wedding isn’t going to wait. We plan the application around your date.']
    ],
    sol: [
      ['We guide your host', 'A simple template and checklist for the person inviting you, no stress on their end either.'],
      ['We organise the proof', 'Relationship evidence, host status, accommodation, sorted and tidy.'],
      ['We plan around the date', 'Tell us when the event is and we work backwards so you’re there for it.']
    ],
    needs: ['Passport valid 6+ months', 'Invitation letter from your host', 'Proof of your relationship', 'Host’s status or residence proof', 'Your return travel details'],
    dests: ['usa', 'uk', 'schengen', 'canada', 'india']
  },
  {
    slug: 'cruise', file: 'visa-for-cruise.html', nav: 'Cruises', sub: 'Multi‑country sailings',
    icon: 'ship', lower: 'cruise',
    h1: 'Going on a cruise?',
    intro: 'Cruises are sneaky, one trip can touch several countries, each with its own rules. We map every port so you’re not turned away at the gangway.',
    pains: [
      ['Many countries, one trip', 'Each port can have different entry rules. Miss one and you’re stuck on the ship, we check them all.'],
      ['Transit vs. entry confusion', 'Sometimes you need a visa just to step off for the day. We sort out which ports need what.'],
      ['One wrong port ruins the day', 'A single missing visa can cost you a whole shore excursion. We don’t let that happen.']
    ],
    sol: [
      ['We check every port', 'Your full itinerary, port by port, against current rules, nothing slips through.'],
      ['We bundle what you need', 'Multi‑country and transit visas handled together, in one tidy plan.'],
      ['One clear plan', 'You get a single, simple breakdown of where you can step off and what’s required.']
    ],
    needs: ['Passport valid 6+ months', 'Full cruise itinerary with every port', 'Cabin / booking confirmation', 'Any required transit visas', 'Travel insurance'],
    dests: ['schengen', 'italy', 'spain', 'uae', 'usa']
  }
];

/* ------------------------------------------------------------ countries data */
const sharedSol = (name) => [
  ['We find the exact visa', 'No guessing between near‑identical options, we match you to the right visa for ' + name + '.'],
  ['A real person checks it', 'Your documents get reviewed against ' + name + '’s current rules before anything is submitted.'],
  ['We submit, you track', 'We file it and you watch it move in real time, no refreshing a government site at 2am.']
];

const countries = [
  { slug:'schengen', file:'visa-schengen.html', name:'Schengen Area', flag:'🇪🇺', region:'Europe', processing:'3–5 days', fee:'€90 gov', diff:'Medium', schengen:true,
    blurb:'One visa, 27 European countries. Sounds simple, until you realise you have to apply to the right country’s consulate, in the right way.',
    pains:[
      ['Which consulate do I apply to?','You apply to the country where you’ll spend the most time (or enter first). Get it wrong and it’s an instant rejection. We figure it out for you.'],
      ['Funds + insurance, done right','Schengen wants specific travel insurance and bank evidence. We make sure yours actually qualifies.'],
      ['One trip, many countries','Multi‑country itineraries confuse the form. We map it so it’s crystal clear.']
    ],
    types:[['Short‑stay (Type C)','Tourism, business or family, up to 90 days'],['Multiple‑entry','For people who travel to Europe often'],['Airport transit (Type A)','Just changing planes in Schengen']],
    needs:['Passport valid 3+ months beyond your stay','Schengen travel insurance (€30,000+ cover)','Proof of accommodation for the whole trip','Round‑trip flight reservation','Recent bank statements'] },

  { slug:'france', file:'visa-france.html', name:'France', flag:'🇫🇷', region:'Europe', processing:'3–5 days', fee:'€90 gov', diff:'Medium', schengen:true,
    blurb:'France runs on the Schengen visa, but the French consulate has its own appointment system and quirks. We know them.',
    pains:[
      ['Appointments vanish fast','French consulate slots get booked out quickly. We help you grab one and prep so you only go once.'],
      ['Apply through France, or not?','If France is your main destination, you must apply through France. We confirm before you waste a slot.'],
      ['Detailed documentation','France likes its paperwork precise. We make sure every page is in order.']
    ],
    types:[['Short‑stay (Schengen C)','Tourism, business, family up to 90 days'],['Long‑stay (VLS‑TS)','Study, work or moving for 90+ days'],['Student visa','For université and grande école places']],
    needs:['Passport valid 3+ months beyond your stay','Schengen travel insurance (€30,000+ cover)','Proof of accommodation in France','Round‑trip flight reservation','Recent bank statements'] },

  { slug:'italy', file:'visa-italy.html', name:'Italy', flag:'🇮🇹', region:'Europe', processing:'3–5 days', fee:'€90 gov', diff:'Medium', schengen:true,
    blurb:'Italy is a Schengen country, so the visa covers all 27, but you must apply through Italy if it’s your main stop.',
    pains:[
      ['Is Italy your main destination?','If you’re spending the most time in Italy, you apply through Italy. We check so it’s not rejected on a technicality.'],
      ['Insurance + funds','Italian consulates are strict on insurance and proof of funds. We make sure yours fits.'],
      ['Peak‑season backlogs','Summer slots fill up. We plan early so the trip isn’t at risk.']
    ],
    types:[['Short‑stay (Schengen C)','Tourism, business, family up to 90 days'],['Multiple‑entry','For frequent visitors'],['Study visa','For Italian universities and courses']],
    needs:['Passport valid 3+ months beyond your stay','Schengen travel insurance (€30,000+ cover)','Proof of accommodation in Italy','Round‑trip flight reservation','Recent bank statements'] },

  { slug:'switzerland', file:'visa-switzerland.html', name:'Switzerland', flag:'🇨🇭', region:'Europe', processing:'3–5 days', fee:'€90 gov', diff:'Medium', schengen:true,
    blurb:'Switzerland is in the Schengen Area (but not the EU). Same short‑stay visa, Swiss consulate process, we handle the details.',
    pains:[
      ['In Schengen, not the EU','It confuses people. The Schengen visa still applies, we make sure you apply the right way.'],
      ['High proof‑of‑funds bar','Switzerland is pricey, so funds evidence matters. We help you show enough.'],
      ['Precise paperwork','Swiss consulates expect everything just so. We get it there.']
    ],
    types:[['Short‑stay (Schengen C)','Tourism, business, family up to 90 days'],['Multiple‑entry','For regular travellers'],['Transit','Passing through Swiss airports']],
    needs:['Passport valid 3+ months beyond your stay','Schengen travel insurance (€30,000+ cover)','Proof of accommodation in Switzerland','Round‑trip flight reservation','Recent bank statements'] },

  { slug:'germany', file:'visa-germany.html', name:'Germany', flag:'🇩🇪', region:'Europe', processing:'3–5 days', fee:'€90 gov', diff:'Medium', schengen:true,
    blurb:'Germany is a Schengen country known for thorough, by‑the‑book applications. We make “thorough” painless.',
    pains:[
      ['Famously strict documentation','Germany checks the details. We make sure nothing is missing or out of format.'],
      ['Appointment bottlenecks','German consulate slots are in demand. We help you prep so one appointment does it.'],
      ['Apply through Germany?','Main destination Germany means applying through Germany. We confirm first.']
    ],
    types:[['Short‑stay (Schengen C)','Tourism, business, family up to 90 days'],['National (D) visa','Work, study or moving long‑term'],['Job seeker / work','For employment in Germany']],
    needs:['Passport valid 3+ months beyond your stay','Schengen travel insurance (€30,000+ cover)','Proof of accommodation in Germany','Round‑trip flight reservation','Recent bank statements'] },

  { slug:'spain', file:'visa-spain.html', name:'Spain', flag:'🇪🇸', region:'Europe', processing:'3–5 days', fee:'€90 gov', diff:'Medium', schengen:true,
    blurb:'Spain is a Schengen country and a very popular one, which means busy consulates and high demand for slots.',
    pains:[
      ['Slots in high demand','Spanish consulate appointments go fast. We help you secure and prep one.'],
      ['Insurance + accommodation','Spain wants valid insurance and confirmed stays. We make sure yours pass.'],
      ['Main‑destination rule','Spending most time in Spain? Apply through Spain. We double‑check.']
    ],
    types:[['Short‑stay (Schengen C)','Tourism, business, family up to 90 days'],['Student visa','For Spanish universities and language schools'],['Digital nomad','Remote work from Spain']],
    needs:['Passport valid 3+ months beyond your stay','Schengen travel insurance (€30,000+ cover)','Proof of accommodation in Spain','Round‑trip flight reservation','Recent bank statements'] },

  { slug:'uk', file:'visa-uk.html', name:'United Kingdom', flag:'🇬🇧', region:'Europe', processing:'3–5 days', fee:'£115 gov', diff:'Medium', schengen:false,
    blurb:'The UK isn’t in Schengen, it has its own Standard Visitor visa and a famously detailed application.',
    pains:[
      ['Heavy financial scrutiny','UK caseworkers look closely at your finances. We help your bank evidence tell the right story.'],
      ['The 6‑month visitor rules','What you can and can’t do on a visitor visa trips people up. We keep you on the right side.'],
      ['Past refusals haunt you','A previous refusal needs careful handling. We address it head‑on in your application.']
    ],
    types:[['Standard Visitor','Tourism, business or family, up to 6 months'],['Student visa','For UK universities and colleges'],['Skilled Worker','For a UK job offer']],
    needs:['Passport valid for your whole stay','Detailed bank statements','Accommodation and travel plans','Proof of ties to your home country','Travel history (if any)'] },

  { slug:'usa', file:'visa-usa.html', name:'United States', flag:'🇺🇸', region:'Americas', processing:'3–5 days prep', fee:'$185 gov', diff:'Complex', schengen:false,
    blurb:'US visas mean the DS‑160 form and an in‑person interview. The prep is everything, and it’s exactly what we’re best at.',
    pains:[
      ['The DS‑160 is brutal','One wrong answer on the DS‑160 can sink your application. We get it right line by line.'],
      ['The interview is nerve‑wracking','Most people walk in unprepared. We brief you on the likely questions and what to bring.'],
      ['Proving you’ll return','You have to show strong ties home (non‑immigrant intent). We help you make the case.']
    ],
    types:[['B1/B2 Visitor','Business and tourism'],['F‑1 Student','Full‑time study in the US'],['J‑1 Exchange','Exchange and training programs']],
    needs:['Passport valid 6+ months','Completed DS‑160 confirmation','US‑spec photo (2×2 inch)','Interview appointment confirmation','Proof of ties to your home country'] },

  { slug:'canada', file:'visa-canada.html', name:'Canada', flag:'🇨🇦', region:'Americas', processing:'2–4 days', fee:'C$100 gov', diff:'Medium', schengen:false,
    blurb:'Canada’s visitor visa is mostly online, but the proof‑of‑funds and ties bar is real, and the forms are particular.',
    pains:[
      ['Proof of funds + ties','Canada wants to see you can support yourself and will come home. We help you show both.'],
      ['Fiddly online forms','The IRCC portal isn’t friendly. We make sure every field is filled correctly.'],
      ['Biometrics step','Most applicants need biometrics. We tell you exactly when and where.']
    ],
    types:[['Visitor (TRV)','Tourism, business or family'],['Study Permit','For Canadian schools and universities'],['Work Permit','For an approved job offer']],
    needs:['Passport valid for your stay','Proof of funds','Travel and accommodation details','Proof of ties to your home country','Biometrics (when required)'] },

  { slug:'australia', file:'visa-australia.html', name:'Australia', flag:'🇦🇺', region:'Asia‑Pacific', processing:'2–4 days', fee:'A$190 gov', diff:'Easy', schengen:false,
    blurb:'Australia is fully online, no stamp in your passport. The catch is choosing the right subclass for your trip.',
    pains:[
      ['Too many subclasses','600, 651, 462… picking the wrong subclass means starting over. We pick the right one.'],
      ['Health + character checks','Some visas need health or police checks. We flag it early so there’s no surprise.'],
      ['Genuine‑visitor test','You still have to show real intent and funds. We help you demonstrate it.']
    ],
    types:[['Visitor (600)','Tourism, business or family'],['Student (500)','Study at an Australian institution'],['Working Holiday (417/462)','Work and travel for eligible ages']],
    needs:['Passport valid for your stay','Proof of funds','Travel and accommodation details','Health/character checks (if required)','Proof of ties to your home country'] },

  { slug:'india', file:'visa-india.html', name:'India', flag:'🇮🇳', region:'Asia‑Pacific', processing:'2–4 days', fee:'$25–80 gov', diff:'Easy', schengen:false,
    blurb:'India’s e‑Visa is quick, if you pick the right category and your photo and passport scan meet the exact spec.',
    pains:[
      ['Photo + scan rejections','India’s e‑Visa rejects photos and scans over tiny spec issues. We get them right the first time.'],
      ['Which e‑Visa category?','Tourist, business, medical, the wrong category causes delays. We match it to your trip.'],
      ['Entry‑point rules','e‑Visas only work at certain airports and seaports. We confirm yours is covered.']
    ],
    types:[['e‑Tourist','Holidays and visiting friends/family'],['e‑Business','Meetings and business activities'],['e‑Medical','Treatment at Indian hospitals']],
    needs:['Passport valid 6+ months','Spec‑compliant photo and passport scan','Return or onward ticket','Proof of accommodation','Trip details for your category'] },

  { slug:'uae', file:'visa-uae.html', name:'United Arab Emirates', flag:'🇦🇪', region:'Middle East', processing:'1–3 days', fee:'$90 gov', diff:'Easy', schengen:false,
    blurb:'Dubai and the wider UAE are fast and online. We just make sure your sponsor and photo details are spot‑on.',
    pains:[
      ['Sponsor/photo details','Small mismatches in sponsor info or photos cause delays. We check before submitting.'],
      ['30 or 60 days?','Picking the wrong length is a common mistake. We match it to your stay.'],
      ['Tight timelines','People often book the UAE last‑minute. Good news: it’s one of the fastest with us.']
    ],
    types:[['30‑day Tourist','Short holidays and stopovers'],['60‑day Tourist','Longer stays and visiting family'],['Transit','Short stops between flights']],
    needs:['Passport valid 6+ months','Passport‑style photo (UAE spec)','Confirmed return ticket','Hotel or host details','Recent bank statement (sometimes)'] }
];

const bySlug = {};
countries.forEach((c) => (bySlug[c.slug] = c));

/* Official government / ministry sites + how-to-apply per country */
const officialSites = {
  schengen:     { name: 'European Commission, Visa Policy', url: 'https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en', applyUrl: 'https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy/short-stay-visa_en', applyVia: 'the consulate of your main destination (or first entry) country' },
  france:       { name: 'France‑Visas (official portal)', url: 'https://france-visas.gouv.fr/en/', applyUrl: 'https://france-visas.gouv.fr/en/', applyVia: 'France‑Visas online, then a VFS/TLScontact appointment' },
  italy:        { name: 'Visa for Italy, Ministry of Foreign Affairs', url: 'https://vistoperitalia.esteri.it/home/en', applyUrl: 'https://vistoperitalia.esteri.it/home/en', applyVia: 'the Italy visa portal, then your local Italian consulate or VFS' },
  switzerland:  { name: 'State Secretariat for Migration (SEM)', url: 'https://www.sem.admin.ch/sem/en/home.html', applyUrl: 'https://www.sem.admin.ch/sem/en/home/themen/einreise/visumantragsformular.html', applyVia: 'the Swiss representation (embassy/consulate) or its visa centre' },
  germany:      { name: 'German Federal Foreign Office', url: 'https://www.auswaertiges-amt.de/en/visa-service', applyUrl: 'https://videx.diplo.de/videx/desktop/index.html', applyVia: 'the German mission via the VIDEX form and an appointment' },
  spain:        { name: 'Spain, Ministry of Foreign Affairs', url: 'https://www.exteriores.gob.es/en/ServiciosAlCiudadano/Paginas/Servicios-consulares.aspx', applyUrl: 'https://www.exteriores.gob.es/en/ServiciosAlCiudadano/Paginas/Servicios-consulares.aspx', applyVia: 'the Spanish consulate or its visa centre (BLS)' },
  uk:           { name: 'UK Government (GOV.UK)', url: 'https://www.gov.uk/browse/visas-immigration', applyUrl: 'https://www.gov.uk/apply-to-come-to-the-uk', applyVia: 'GOV.UK online, then a UKVCAS biometrics appointment' },
  usa:          { name: 'U.S. Department of State, Travel', url: 'https://travel.state.gov/content/travel/en/us-visas.html', applyUrl: 'https://ceac.state.gov/genniv/', applyVia: 'the DS‑160 form, fee payment, then an embassy interview' },
  canada:       { name: 'IRCC (Government of Canada)', url: 'https://www.canada.ca/en/immigration-refugees-citizenship.html', applyUrl: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/apply-visitor-visa.html', applyVia: 'your IRCC online account, then biometrics' },
  australia:    { name: 'Australian Department of Home Affairs', url: 'https://immi.homeaffairs.gov.au/', applyUrl: 'https://online.immi.gov.au/lusc/login', applyVia: 'ImmiAccount online (fully electronic)' },
  india:        { name: 'Indian e‑Visa (Govt. of India)', url: 'https://indianvisaonline.gov.in/evisa/', applyUrl: 'https://indianvisaonline.gov.in/evisa/Registration', applyVia: 'the official Indian e‑Visa portal' },
  uae:          { name: 'UAE Govt. (ICP)', url: 'https://icp.gov.ae/en/', applyUrl: 'https://smartservices.icp.gov.ae/echannels/web/client/default.html#/login', applyVia: 'an approved channel (airline, hotel, or the ICP/GDRFA portals)' }
};

/* ----------------------------------------------------------- shared chrome */
const reasonMenuHTML = reasons.map((r) =>
  '<a role="menuitem" href="' + r.file + '"><span class="mi-ico">' + ICON[r.icon] +
  '</span><span class="mi-txt"><strong>' + r.nav + '</strong><span class="mi-sub">' + r.sub + '</span></span></a>'
).join('\n        ');

const menuColumns = [
  [{ head: 'Europe', slugs: ['schengen', 'france', 'italy', 'switzerland', 'germany', 'spain', 'uk'] }],
  [{ head: 'Americas', slugs: ['usa', 'canada'] }, { head: 'Middle East', slugs: ['uae'] }],
  [{ head: 'Asia‑Pacific', slugs: ['australia', 'india'] }]
];
const countryMenuHTML = menuColumns.map((col) =>
  '<div class="nav__menu-col">' + col.map((grp) =>
    '<p class="nav__menu-head">' + grp.head + '</p>' + grp.slugs.map((s) => {
      const c = bySlug[s];
      return '<a href="' + c.file + '"><span class="flag">' + c.flag + '</span> <span class="cn">' + c.name + '</span></a>';
    }).join('')
  ).join('') + '</div>'
).join('\n        ');

const NAV_LINKS_INNER =
`<a class="nav__link" href="do-i-need-a-visa.html">Do I need a visa?</a>
      <div class="nav__item nav__item--has-menu">
        <button type="button" class="nav__link nav__trigger" aria-expanded="false" aria-haspopup="true">By purpose of visit <svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
        <div class="nav__menu" role="menu">
        ${reasonMenuHTML}
        <a class="nav__menu-feat" href="pricing.html"><span class="mi-ico">${ICON.bolt}</span><span class="mi-txt"><strong>Need it urgently?</strong><span class="mi-sub">See expedited options →</span></span></a>
        </div>
      </div>
      <div class="nav__item nav__item--has-menu">
        <button type="button" class="nav__link nav__trigger" aria-expanded="false" aria-haspopup="true">By country <svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
        <div class="nav__menu nav__menu--wide" role="menu">
        ${countryMenuHTML}
        </div>
      </div>
      <a class="nav__link" href="pricing.html">Pricing</a>`;

const mobileReason = reasons.map((r) => '<a href="' + r.file + '">' + r.nav + '</a>').join('\n        ');
const mobileCountry = countries.map((c) => '<a href="' + c.file + '">' + c.flag + ' ' + c.name + '</a>').join('\n          ');

const MOBILE_LINKS_INNER =
`<a class="m-link" href="do-i-need-a-visa.html">Do I need a visa?</a>
    <a class="m-link" href="pricing.html">Pricing</a>
    <div class="m-group">
      <p class="m-group__head">By purpose of visit</p>
      ${mobileReason}
    </div>
    <div class="m-group">
      <p class="m-group__head">By country</p>
      <div class="m-group__grid">
          ${mobileCountry}
      </div>
    </div>`;

const FOOTER =
`  <footer class="footer">
    <div class="container">
      <div class="footer__grid">
        <div class="footer__brand footer__col--brand">
          <a class="brand" href="index.html" aria-label="All In One Visa, home">
            <img src="logo.png" class="brand__img" alt="All In One Visa" />
          </a>
          <p class="footer__desc">One application. Every visa. Zero confusion. We remove the anxiety from getting a visa so you can get back to the trip.</p>
          <div class="footer__social">
            <a href="#" aria-label="All In One Visa on Instagram"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="3.5"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor"/></svg></a>
            <a href="#" aria-label="All In One Visa on X"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l16 16M20 4L4 20"/></svg></a>
            <a href="#" aria-label="All In One Visa on LinkedIn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 10v7M7 7v.01M11 17v-4a2 2 0 0 1 4 0v4M11 13v4"/></svg></a>
          </div>
        </div>
        <div class="footer__col--services">
          <h4>By purpose</h4>
          <a class="f-link" href="visa-for-business.html">Business trips</a>
          <a class="f-link" href="visa-for-study.html">Study &amp; education</a>
          <a class="f-link" href="visa-for-tourism.html">Tourism &amp; travel</a>
          <a class="f-link" href="visa-for-family.html">Family &amp; friends</a>
          <a class="f-link" href="visa-for-cruise.html">Cruises</a>
        </div>
        <div class="footer__col--company">
          <h4>Popular countries</h4>
          <a class="f-link" href="visa-schengen.html">Schengen visa</a>
          <a class="f-link" href="visa-usa.html">US visa</a>
          <a class="f-link" href="visa-uk.html">UK visa</a>
          <a class="f-link" href="visa-canada.html">Canada visa</a>
          <a class="f-link" href="visa-australia.html">Australia visa</a>
        </div>
        <div class="footer__col--news">
          <h4>Stay in the know</h4>
          <p class="footer__desc" style="margin-top:0">Visa rule changes, deadline reminders, and travel‑ready tips. No spam.</p>
          <form class="footer__news" data-newsletter>
            <input type="email" placeholder="you@email.com" required autocomplete="email" aria-label="Email address" />
            <button type="submit">Join</button>
          </form>
          <p class="footer__desc" style="margin-top:var(--sp-2)"><a class="f-link" href="tel:+18885550142" style="padding:0">+1 (888) 555‑0142</a></p>
        </div>
      </div>
      <div class="footer__bottom">
        <span>© <span data-year>2026</span> All In One Visa. Built with care for travelers everywhere.</span>
        <nav aria-label="Legal">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="track-application.html">Track application</a>
          <a href="contact.html">Support</a>
        </nav>
      </div>
    </div>
  </footer>`;

function buildNav(cta) {
  return `  <nav class="nav nav--solid" aria-label="Primary navigation">
    <div class="nav__inner">
      <a class="brand" href="index.html" aria-label="All In One Visa, home">
        <img src="logo.png" class="brand__img" alt="All In One Visa" />
      </a>
      <div class="nav__links">
        ${NAV_LINKS_INNER}
      </div>
      ${cta}
      <button class="nav__toggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobileMenu"><span></span></button>
    </div>
  </nav>

  <div class="mobile-menu" id="mobileMenu">
    ${MOBILE_LINKS_INNER}
    <div class="mobile-menu__foot">
      <a class="btn btn--primary btn--block" href="contact.html">Talk to a Visa Expert</a>
      <a class="mobile-menu__phone" href="tel:+18885550142">Talk to us · +1 (888) 555‑0142</a>
    </div>
  </div>`;
}

const HEAD = (title, desc) =>
`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="style.css?v=12" />
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' fill='%230D0D0F'/%3E%3Cg fill='none' stroke='%23FFD23F' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='7'/%3E%3Cpath d='M5 12h14'/%3E%3Cpath d='M12 5a11 11 0 0 1 0 14 11 11 0 0 1 0-14z'/%3E%3C/g%3E%3C/svg%3E" />
</head>
<body>`;

function page(title, desc, mainHTML, cta) {
  return HEAD(title, desc) + '\n\n' + buildNav(cta || '<a class="btn btn--primary nav__cta hide-mobile" href="contact.html">Talk to a Visa Expert</a>') +
    '\n\n  <main>\n' + mainHTML + '\n  </main>\n\n' + FOOTER + '\n\n  <script src="main.js?v=11"></script>\n</body>\n</html>\n';
}

const ctaBand = (h2, p) =>
`    <section class="section section--navy">
      <div class="container">
        <div class="cta-band reveal">
          <h2>${h2}</h2>
          <p>${p}</p>
          <div class="hero__cta">
            <a class="btn btn--primary btn--lg" href="contact.html">Talk to a Visa Expert</a>
            <a class="btn btn--ghost btn--lg" href="do-i-need-a-visa.html">Check what I need</a>
          </div>
        </div>
      </div>
    </section>`;

const painCards = (pains, icon) => pains.map((p) =>
`          <article class="card card--lift reveal">
            <div class="icon-badge" aria-hidden="true">${ICON[icon]}</div>
            <h3>${p[0]}</h3>
            <p>${p[1]}</p>
          </article>`).join('\n');

const diffCards = (sol) => sol.map((s) =>
`          <article class="diff reveal">
            <div class="icon-badge" aria-hidden="true">${ICON.shield}</div>
            <div><h3>${s[0]}</h3><p>${s[1]}</p></div>
          </article>`).join('\n');

const checklist = (needs) => '<ul class="checklist">' + needs.map((n) =>
  '<li>' + ICON.check + '<span>' + n + '</span></li>').join('') + '</ul>';

const destChips = (slugs) => '<div class="dest-chips">' + slugs.map((s) => {
  const c = bySlug[s];
  return '<a href="' + c.file + '">' + c.flag + ' ' + c.name + '</a>';
}).join('') + '</div>';

/* --------------------------------------------------------- reason page body */
function reasonBody(r) {
  return `    <section class="page-head">
      <div class="container">
        <p class="eyebrow" style="justify-content:center">For ${r.nav.toLowerCase()}</p>
        <h1>${r.h1}</h1>
        <p>${r.intro}</p>
        <div style="margin-top:var(--sp-3);display:flex;gap:var(--sp-1);justify-content:center;flex-wrap:wrap">
          <a class="btn btn--primary" href="contact.html">Talk to a Visa Expert</a>
          <a class="btn btn--ghost" href="do-i-need-a-visa.html">Check what I need</a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head reveal"><p class="eyebrow">The annoying part</p><h2>Why ${r.lower} visas trip people up</h2></div>
        <div class="grid grid-3" data-stagger>
${painCards(r.pains, 'alert')}
        </div>
      </div>
    </section>

    <section class="section section--surface-2">
      <div class="container">
        <div class="section-head reveal"><p class="eyebrow">How we help</p><h2>All In One Visa sorts it</h2></div>
        <div class="diff-grid" data-stagger>
${diffCards(r.sol)}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container split">
        <div class="reveal-left">
          <p class="eyebrow">What you’ll usually need</p>
          <h2 style="margin:var(--sp-2) 0">Have these handy</h2>
          ${checklist(r.needs)}
          <p class="muted mt-2">Missing something? That’s literally our job, we’ll tell you exactly what’s acceptable.</p>
        </div>
        <div class="reveal-right">
          <div class="card">
            <h3>Where are you headed?</h3>
            <p class="mt-2">Popular ${r.lower} destinations we handle:</p>
            <div class="mt-2">${destChips(r.dests)}</div>
            <a class="btn btn--primary btn--block mt-3" href="do-i-need-a-visa.html">Check my requirements</a>
          </div>
        </div>
      </div>
    </section>

${ctaBand('Sorted. Let’s get you that visa.', 'Free to check, no account needed. Most people are done in under five minutes.')}`;
}

/* -------------------------------------------------------- country page body */
function countryBody(c) {
  const official = officialSites[c.slug] || { name: 'the official government site', url: '#', applyUrl: '#', applyVia: 'the official channel' };
  const howSection =
`    <section class="section">
      <div class="container narrow">
        <div class="section-head reveal"><p class="eyebrow">Official information</p><h2>How to apply for a ${c.name} visa</h2></div>
        <div class="grid grid-2" data-stagger style="align-items:start">
          <div class="card reveal">
            <h3>Do it yourself</h3>
            <ol class="how-list mt-2">
              <li>Check the official requirements and rules on the government site.</li>
              <li>Complete the application and gather documents, applying via ${official.applyVia}.</li>
              <li>Pay the fee, book biometrics or an interview if required, then submit and track.</li>
            </ol>
            <a class="btn btn--ghost btn--block mt-3" href="${official.url}" target="_blank" rel="noopener noreferrer">Visit ${official.name}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>
            </a>
          </div>
          <div class="card reveal" style="border-color:var(--gold);box-shadow:var(--sh-gold)">
            <h3>Or let us handle it</h3>
            <p class="mt-2">We complete the forms, pre‑check every document against ${c.name}'s current rules, book the appointment, and submit, so a small mistake never costs you the trip.</p>
            <a class="btn btn--primary btn--block mt-3" href="apply.html">Get my free quote</a>
          </div>
        </div>
        <p class="muted text-center mt-3" style="font-size:0.82rem">Official links are for your reference. Government fees are paid directly to the authority, never to us.</p>
      </div>
    </section>`;
  const typeCards = c.types.map((t) =>
`          <article class="card card--lift reveal">
            <div class="icon-badge" aria-hidden="true">${ICON.plane}</div>
            <h3>${t[0]}</h3>
            <p>${t[1]}</p>
          </article>`).join('\n');

  let sideCard;
  if (c.slug === 'schengen') {
    sideCard = `<div class="card"><h3>Popular Schengen countries</h3><p class="mt-2">Same visa, different consulate. Tap yours:</p><div class="mt-2">${destChips(['france','italy','switzerland','germany','spain'])}</div></div>`;
  } else if (c.schengen) {
    sideCard = `<div class="card"><h3>Good to know</h3><p class="mt-2">${c.name} is part of the <strong>Schengen Area</strong>, so this visa lets you travel across all 27 Schengen countries.</p><a class="link-arrow mt-2" href="visa-schengen.html" style="display:inline-flex">How the Schengen visa works <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></div>`;
  } else {
    sideCard = `<div class="card"><h3>Not sure this is the one?</h3><p class="mt-2">Run a free 30‑second check and we’ll confirm the exact visa for your trip to ${c.name}.</p><a class="btn btn--primary btn--block mt-3" href="do-i-need-a-visa.html">Check my requirements</a></div>`;
  }

  return `    <section class="page-head">
      <div class="container">
        <p class="eyebrow" style="justify-content:center">${c.flag} ${c.region}</p>
        <h1>${c.name} visa, without the guesswork</h1>
        <p>${c.blurb}</p>
        <dl class="facts-row" style="max-width:640px;margin-inline:auto">
          <div class="fact"><dt>Processing</dt><dd>${c.processing}</dd></div>
          <div class="fact"><dt>Typical gov fee</dt><dd>${c.fee}</dd></div>
          <div class="fact"><dt>Difficulty</dt><dd>${c.diff}</dd></div>
        </dl>
        <div style="margin-top:var(--sp-3);display:flex;gap:var(--sp-1);justify-content:center;flex-wrap:wrap">
          <a class="btn btn--primary" href="contact.html">Talk to a Visa Expert</a>
          <a class="btn btn--ghost" href="${official.applyUrl}" target="_blank" rel="noopener noreferrer">Start Application on Ministry's online portal
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>
          </a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head reveal"><p class="eyebrow">The annoying part</p><h2>What trips people up with ${c.name}</h2></div>
        <div class="grid grid-3" data-stagger>
${painCards(c.pains, 'alert')}
        </div>
      </div>
    </section>

    <section class="section section--surface-2">
      <div class="container">
        <div class="section-head reveal"><p class="eyebrow">How we help</p><h2>How we make ${c.name} easy</h2></div>
        <div class="diff-grid" data-stagger>
${diffCards(sharedSol(c.name))}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head reveal"><p class="eyebrow">Visa options</p><h2>${c.name} visa types we handle</h2></div>
        <div class="grid grid-3" data-stagger>
${typeCards}
        </div>
      </div>
    </section>

    <section class="section section--surface-2">
      <div class="container split">
        <div class="reveal-left">
          <p class="eyebrow">Checklist</p>
          <h2 style="margin:var(--sp-2) 0">What you’ll usually need</h2>
          ${checklist(c.needs)}
        </div>
        <div class="reveal-right">${sideCard}</div>
      </div>
    </section>

${howSection}

${ctaBand('Ready for your ' + c.name + ' visa?', 'Free to check, no account needed. A real specialist reviews every application before it’s submitted.')}`;
}

/* --------------------------------------------------- do-i-need-a-visa page */
const CHECKER_FORM =
`        <form id="reqForm" novalidate aria-label="Check your visa requirements">
          <div class="field">
            <label for="hResident">I'm a resident of</label>
            <select class="select" id="hResident"></select>
          </div>
          <div class="field">
            <label for="hPassport">I hold a passport from</label>
            <select class="select" id="hPassport" autocomplete="country-name"></select>
          </div>
          <div id="destWrap">
            <div class="field hero-dest">
              <label for="hDest1">I am going to</label>
              <select class="select dest-select" id="hDest1" required></select>
            </div>
          </div>
          <div class="hero-form__addrow">
            <button type="button" class="hero-form__add" id="addDest"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg> Add destination</button>
          </div>
          <div class="field" id="fPurpose">
            <label for="hPurpose">My purpose of trip is</label>
            <select class="select" id="hPurpose" required></select>
          </div>
          <button class="btn btn--primary btn--block" type="submit">Check Requirements</button>
          <p class="hero-form__note">Free to check · Takes 30 seconds · No account required</p>
        </form>`;

const doINeedBody =
`    <section class="page-head" style="padding-bottom:var(--sp-4)">
      <div class="container">
        <p class="eyebrow" style="justify-content:center">Free check · 30 seconds · no account</p>
        <h1>Do I need a visa?</h1>
        <p>Tell us your passport and where you’re going. We’ll tell you straight, visa or no visa, and exactly what it takes to get one.</p>
      </div>
    </section>

    <section class="section" style="padding-top:0">
      <div class="container narrow">
        <div class="hero-form" id="check" style="max-width:560px;margin-inline:auto">
          <div class="hero-form__head"><h2>Check your requirements</h2><p>Everything you need to know, in 30 seconds.</p></div>
${CHECKER_FORM}
        </div>
      </div>
    </section>

    <section class="section section--surface-2">
      <div class="container">
        <div class="section-head center reveal"><p class="eyebrow">What you’ll get</p><h2>No jargon. Just a straight answer.</h2></div>
        <div class="grid grid-3" data-stagger>
          <article class="card card--lift reveal"><div class="icon-badge" aria-hidden="true">${ICON.shield}</div><h3>The exact visa</h3><p>We tell you which visa you actually need, or if you don’t need one at all.</p></article>
          <article class="card card--lift reveal"><div class="icon-badge" aria-hidden="true">${ICON.check}</div><h3>The real checklist</h3><p>The documents that genuinely matter for your passport and destination, nothing extra.</p></article>
          <article class="card card--lift reveal"><div class="icon-badge" aria-hidden="true">${ICON.bolt}</div><h3>The honest timeline</h3><p>How long it takes and what it costs, so there are no nasty surprises later.</p></article>
        </div>
      </div>
    </section>

${ctaBand('Found out you need one? We’ve got it.', 'Start your application and a real specialist takes it from there. Free to begin.')}`;

/* ----------------------------------------------- track-application page ---- */
const trackBody =
`    <section class="page-head" style="padding-bottom:var(--sp-4)">
      <div class="container">
        <p class="eyebrow" style="justify-content:center">Track application</p>
        <h1>Where's my application?</h1>
        <p>Enter your reference number and the email you applied with to see the latest status, updated by your specialist.</p>
      </div>
    </section>

    <section class="section" style="padding-top:0">
      <div class="container narrow">
        <div class="card" style="max-width:520px;margin-inline:auto">
          <form id="trackForm" novalidate>
            <div class="field"><label for="tRef">Reference number</label><input class="input" id="tRef" placeholder="AIOV-2026-48217" required /></div>
            <div class="field mb-0"><label for="tEmail">Email on the application</label><input class="input" type="email" id="tEmail" placeholder="you@email.com" required /></div>
            <p class="field__error" id="tErr" style="display:none;margin-top:var(--sp-1)"></p>
            <button class="btn btn--primary btn--block" type="submit" style="margin-top:var(--sp-2)">Track my application</button>
          </form>
        </div>

        <div id="tResult" style="display:none;max-width:560px;margin:var(--sp-4) auto 0">
          <div class="card">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--sp-2);flex-wrap:wrap;margin-bottom:var(--sp-3)">
              <div>
                <div class="mono" style="font-size:0.8rem;color:var(--ink-soft)" id="rRef"></div>
                <h3 id="rName" style="margin-top:2px"></h3>
                <div class="muted" id="rTrip" style="font-size:0.9rem"></div>
              </div>
              <span class="tag" id="rStage"></span>
            </div>
            <div class="status-track" id="rTrack"></div>
            <div id="rNoteWrap" style="display:none;margin-top:var(--sp-2);padding-top:var(--sp-2);border-top:1px solid var(--border)">
              <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--ink-soft)">Latest update from your specialist</div>
              <p id="rNote" style="margin-top:4px;color:var(--ink)"></p>
            </div>
            <div class="eta-card" style="margin-top:var(--sp-3)">
              <div class="label">Questions?</div>
              <div class="date" style="font-size:1.1rem">We're one message away</div>
              <a class="btn btn--primary btn--block" href="contact.html" style="margin-top:var(--sp-2)">Talk to your specialist</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <script>
    (function(){
      var form=document.getElementById('trackForm'); if(!form) return;
      var qs=new URLSearchParams(location.search); if(qs.get('ref')) document.getElementById('tRef').value=qs.get('ref');
      var err=document.getElementById('tErr');
      function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }
      form.addEventListener('submit', function(e){
        e.preventDefault(); err.style.display='none';
        var ref=document.getElementById('tRef').value.trim(), email=document.getElementById('tEmail').value.trim();
        if(!ref||!email){ err.textContent='Please enter both your reference and email.'; err.style.display='block'; return; }
        fetch('/api/track?ref='+encodeURIComponent(ref)+'&email='+encodeURIComponent(email))
          .then(function(r){ return r.json().then(function(j){ return {ok:r.ok,data:j}; }); })
          .then(function(r){
            if(!r.ok){ err.textContent=(r.data&&r.data.error)||'No application found.'; err.style.display='block'; document.getElementById('tResult').style.display='none'; return; }
            render(r.data);
          })
          .catch(function(){ err.textContent='Something went wrong, please try again.'; err.style.display='block'; });
      });
      function render(d){
        document.getElementById('rRef').textContent='Reference '+d.ref;
        document.getElementById('rName').textContent='Hi '+((d.name||'there').split(' ')[0])+', here is your status';
        document.getElementById('rTrip').textContent=[d.destination,d.purpose].filter(Boolean).join(' · ');
        document.getElementById('rStage').textContent=d.status;
        var checkSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
        document.getElementById('rTrack').innerHTML=d.statuses.map(function(s,i){
          var cls=i<d.statusIndex?'is-done':(i===d.statusIndex?'is-current':'is-pending');
          return '<div class="st-item '+cls+'"><span class="st-item__dot">'+(i<d.statusIndex?checkSvg:'')+'</span><div class="st-item__title">'+esc(s)+'</div></div>';
        }).join('');
        var nw=document.getElementById('rNoteWrap');
        if(d.statusNote){ document.getElementById('rNote').textContent=d.statusNote; nw.style.display='block'; } else { nw.style.display='none'; }
        var box=document.getElementById('tResult'); box.style.display='block'; box.scrollIntoView({behavior:'smooth',block:'nearest'});
      }
    })();
    </script>`;

/* ------------------------------------------------------------------ write */
function write(file, html) {
  fs.writeFileSync(path.join(ROOT, file), html);
  console.log('  wrote', file);
}

console.log('Generating landing pages…');
write('do-i-need-a-visa.html', page('Do I need a visa?, All In One Visa',
  'Free 30-second visa check. Tell us your passport and destination and we’ll tell you exactly what you need.',
  doINeedBody, '<a class="btn btn--primary nav__cta hide-mobile" href="contact.html">Talk to a Visa Expert</a>'));

write('track-application.html', page('Track your application — All In One Visa',
  'Check the live status of your visa application. Enter your reference number and email to see where it is in the process.',
  trackBody, '<a class="btn btn--primary nav__cta hide-mobile" href="contact.html">Talk to a Visa Expert</a>'));

reasons.forEach((r) => write(r.file, page(
  r.nav + ' visas, All In One Visa',
  r.intro,
  reasonBody(r))));

countries.forEach((c) => write(c.file, page(
  c.name + ' visa, requirements & how to apply | All In One Visa',
  c.blurb,
  countryBody(c))));

/* ----------------------------------------------- inject nav into existing */
console.log('Updating nav on existing pages…');
const existing = ['index.html','how-it-works.html','visa-types.html','pricing.html','about.html','contact.html','apply.html','checkout.html','dashboard.html','success.html'];
existing.forEach((file) => {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) { console.log('  skip (missing)', file); return; }
  let html = fs.readFileSync(fp, 'utf8');
  let changed = false;

  if (!html.includes('nav__item--has-menu')) {
    html = html.replace(/<div class="nav__links">[\s\S]*?<\/div>\s*\n/, '<div class="nav__links">\n        ' + NAV_LINKS_INNER + '\n      </div>\n      ');
    changed = true;
  }
  if (!html.includes('m-group')) {
    html = html.replace(/(<div class="mobile-menu" id="mobileMenu">)[\s\S]*?(<div class="mobile-menu__foot">)/,
      '$1\n    ' + MOBILE_LINKS_INNER + '\n    $2');
    changed = true;
  }
  if (changed) { fs.writeFileSync(fp, html); console.log('  updated', file); }
  else console.log('  already current', file);
});

console.log('Done.');
