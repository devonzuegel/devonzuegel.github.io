// Researched venue facts. Keep room capacities separate from whole-building figures.
export const venueProfiles = [
  {
    names: ["Audio", "Audio SF", "Audio San Francisco"],
    metro: "sf",
    description:
      "An electronic-music nightclub on 11th Street with a standing dance floor.",
    source:
      "https://thevendry.com/venue/161337/audio-san-francisco-ca/space/16582",
    capacity: {
      min: 400,
      max: 400,
      source:
        "https://thevendry.com/venue/161337/audio-san-francisco-ca/space/16582",
      configuration: "Standing",
      approximate: true,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["August Hall"],
    metro: "sf",
    description:
      "Historic music hall with 32-foot ceilings, stained glass, and a separate Green Room.",
    source: "https://www.augusthallsf.com/venue-overview/",
    capacity: {
      min: 951,
      max: 951,
      source: "https://www.augusthallsf.com/venue-overview/",
      configuration: "Includes Green Room; concert layout varies",
      approximate: false,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["Bill Graham Civic Auditorium"],
    metro: "sf",
    description:
      "Large historic Civic Center auditorium with flexible concert configurations.",
    source: "https://sflive.art/place/bill-graham-civic-auditorium/",
    capacity: {
      min: 8500,
      max: 8500,
      source: "https://sflive.art/place/bill-graham-civic-auditorium/",
      configuration: "Maximum venue occupancy; layout varies",
      approximate: false,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["Bing Concert Hall"],
    metro: "sf",
    description:
      "Stanford concert hall with vineyard-style seating terraces surrounding the stage.",
    source: "https://maps.stanford.edu/ada/building-ada.cfm?FACIL_ID=08-650",
    capacity: {
      min: 842,
      max: 842,
      source: "https://maps.stanford.edu/ada/building-ada.cfm?FACIL_ID=08-650",
      configuration: "Seated",
      approximate: false,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["Channel 24", "Channel24"],
    metro: "sf",
    description:
      "Sacramento music venue opened in 2025, with a main concert room, bars, and an open-air patio.",
    source: "https://channel24sac.com/venue-info/",
    capacity: {
      min: 2150,
      max: 2150,
      source: "https://channel24sac.com/venue-info/",
      configuration: "Main concert room",
      approximate: false,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["Blue Note Napa Summer Sessions"],
    metro: "sf",
    description:
      "Outdoor concerts at The Meritage Resort; audience size and seating vary by show.",
    source: "https://www.bluenotejazz.com/napa/faq-summer-sessions/",
    capacity: {
      min: 600,
      max: 3000,
      source: "https://www.bluenotejazz.com/napa/faq-summer-sessions/",
      configuration: "Show-dependent outdoor configuration",
      approximate: false,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["Brick and Mortar Music Hall", "Brick & Mortar Music Hall"],
    metro: "sf",
    description:
      "Small Mission District music club in a former jazz venue, presenting an eclectic mix of live acts.",
    source:
      "https://www.timeout.com/san-francisco/things-to-do/brick-and-mortar-music-hall",
    capacity: {
      min: 250,
      max: 250,
      source:
        "https://www.timeout.com/san-francisco/things-to-do/brick-and-mortar-music-hall",
      configuration: "Standing",
      approximate: true,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["Crybaby"],
    metro: "sf",
    description: "Uptown Oakland club hosting live bands and DJ nights.",
    source:
      "https://www.kqed.org/arts/13910010/crybaby-nightclub-oakland-opening-uptown",
    capacity: {
      min: 400,
      max: 400,
      source:
        "https://www.kqed.org/arts/13910010/crybaby-nightclub-oakland-opening-uptown",
      configuration: "Standing",
      approximate: true,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["Crest Theatre", "Crest Theater"],
    metro: "sf",
    description:
      "Historic Sacramento theater hosting concerts and film screenings.",
    source:
      "https://www.bizbash.com/venue-directory/conference-centers/convention-centers-auditoriums/venue/13459659/crest-theatre",
    capacity: {
      min: 975,
      max: 975,
      source:
        "https://www.bizbash.com/venue-directory/conference-centers/convention-centers-auditoriums/venue/13459659/crest-theatre",
      configuration: "Seated",
      approximate: false,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["Ace of Spades"],
    metro: "sf",
    description:
      "Concert club in Sacramento’s R Street district with a main showroom and adjoining lounge.",
    source:
      "https://cwpa2018.ucdavis.edu/sites/cwpa2018.ucdavis.edu/files/Sacramento%20CVB-Unique%20Venues/index.pdf",
    capacity: {
      min: 1000,
      max: 1000,
      source:
        "https://cwpa2018.ucdavis.edu/sites/cwpa2018.ucdavis.edu/files/Sacramento%20CVB-Unique%20Venues/index.pdf",
      configuration: "Published venue estimate; configuration varies",
      approximate: true,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["Chase Center"],
    metro: "sf",
    description:
      "Large indoor arena in Mission Bay, used for basketball and arena-scale concerts.",
    source: "https://en.wikipedia.org/wiki/Chase_Center",
    capacity: {
      min: 18064,
      max: 18064,
      source: "https://en.wikipedia.org/wiki/Chase_Center",
      configuration: "Basketball seating reference; concert capacity varies",
      approximate: true,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["620 Jones Terrace"],
    metro: "sf",
    description:
      "Heated outdoor terrace and bars at 620 Jones. Published whole-building capacities do not isolate the terrace.",
    source: "https://620-jones.com/images-tour/",
    capacity: null,
  },
  {
    names: ["Halcyon", "Halcyon SF"],
    metro: "sf",
    description:
      "Electronic-music nightclub with a main dance floor, production lighting, and a Pioneer Pro Audio sound system.",
    source: "https://halcyon-sf.com/main/private-events/",
    capacity: {
      min: 300,
      max: 400,
      source: "https://halcyon-sf.com/main/private-events/",
      configuration: "Main floor, standing",
      approximate: false,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["F8", "F8 Nightclub", "F8 1192 Folsom"],
    metro: "sf",
    description:
      "Multi-room Folsom Street nightclub for electronic music and DJ nights.",
    source: "https://www.feightsf.com/contact",
    capacity: {
      min: 250,
      max: 250,
      source: "https://www.feightsf.com/contact",
      configuration: "Whole venue",
      approximate: false,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["Public Works"],
    metro: "sf",
    description:
      "Mission District event space with three rooms for club nights, live music, and private events.",
    source: "https://publicsf.com/private-events/",
    capacity: {
      min: 1000,
      max: 1000,
      source: "https://publicsf.com/private-events/",
      configuration:
        "Full venue maximum across three rooms; individual rooms are smaller",
      approximate: true,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["Bottom of the Hill", "Bottom of Hill"],
    metro: "sf",
    description: "Small live-music club presenting multi-band bills.",
    source: "https://bottomofthehill.com/booking.html",
    capacity: {
      min: 325,
      max: 325,
      source: "https://bottomofthehill.com/booking.html",
      configuration: "Paid audience capacity",
      approximate: false,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["The Chapel", "Chapel"],
    metro: "sf",
    description:
      "Converted chapel with a high arched ceiling and a mezzanine overlooking the main concert floor.",
    source: "https://www.mixonline.com/the-wire/qscthechapelsf",
    capacity: {
      min: 500,
      max: 500,
      source: "https://www.mixonline.com/the-wire/qscthechapelsf",
      configuration: "Main music room",
      approximate: true,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["The Warfield", "Warfield"],
    metro: "sf",
    description:
      "Former vaudeville and movie palace, now a concert theater with a balcony.",
    source: "https://www.thewarfieldtheatre.com/venue-info",
    capacity: {
      min: 2250,
      max: 2250,
      source: "https://www.thewarfieldtheatre.com/venue-info",
      configuration: "Concert configuration varies",
      approximate: false,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["The Fillmore", "Fillmore"],
    metro: "sf",
    description: "Historic San Francisco concert hall.",
    source:
      "https://promo-img.livenation.com/clubco/clubupload/16388/foodpdf.pdf",
    capacity: {
      min: 1100,
      max: 1100,
      source:
        "https://promo-img.livenation.com/clubco/clubupload/16388/foodpdf.pdf",
      configuration: "Published technical-pack capacity",
      approximate: true,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["Rickshaw Stop"],
    metro: "sf",
    description:
      "Former TV studio with high ceilings and a mezzanine above the main music room.",
    source: "https://rickshawstop.com/about/",
    capacity: {
      min: 350,
      max: 400,
      source: "https://www.jambase.com/venue/rickshaw-stop",
      configuration: "Published listings vary: 350–400",
      approximate: true,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["Great American Music Hall", "GAMH"],
    metro: "sf",
    description:
      "Ornate historic music hall with a standing floor, balcony, and modern concert sound system.",
    source: "https://www.sfuva.com/great-american-music-hall",
    capacity: {
      min: 650,
      max: 650,
      source: "https://www.sfuva.com/great-american-music-hall",
      configuration: "Standing",
      approximate: false,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["Swedish American Hall"],
    metro: "sf",
    description: "Historic hall with separate event rooms above Cafe du Nord.",
    source:
      "https://www.swedishamericanhall.com/swedish-american-hall-weddings-fb",
    capacity: {
      min: 225,
      max: 300,
      source:
        "https://www.swedishamericanhall.com/swedish-american-hall-weddings-fb",
      configuration: "Freja Hall: 225 theater seats / 300 standing",
      approximate: true,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["Baby’s All Right", "Baby's All Right"],
    metro: "nyc",
    description: "Small live-music room with its own bar in Williamsburg.",
    source: "https://babysallright.com/s/BabysBackline.pdf",
    capacity: {
      min: 280,
      max: 280,
      source: "https://babysallright.com/s/BabysBackline.pdf",
      configuration: "Live room",
      approximate: false,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["Knockdown Center"],
    metro: "nyc",
    description:
      "Large converted industrial venue in Maspeth, with an atrium used for concerts and dance events.",
    source: "https://grayarea.co/venues/the-knockdown-center/spotlight",
    capacity: {
      min: 3100,
      max: 3100,
      source: "https://grayarea.co/venues/the-knockdown-center/spotlight",
      configuration: "Atrium; other rooms differ",
      approximate: true,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["Culture Room"],
    metro: "miami",
    description:
      "Fort Lauderdale live-music club with a standing floor and balcony.",
    source: "https://artistandfan.com/venues/venues/view/culture-room",
    capacity: {
      min: 650,
      max: 650,
      source: "https://artistandfan.com/venues/venues/view/culture-room",
      configuration: "Standing and balcony",
      approximate: true,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["ZeyZey"],
    metro: "miami",
    description: "Outdoor Miami live-music and DJ venue with food vendors.",
    source: "https://www.indieonthemove.com/venues/zeyzey-miami-florida",
    capacity: {
      min: 1000,
      max: 1200,
      source: "https://www.indieonthemove.com/venues/zeyzey-miami-florida",
      configuration: "Outdoor main stage; published estimates vary",
      approximate: true,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["Market Hotel"],
    metro: "nyc",
    description:
      "Independent upstairs music venue in a former bank building in Bushwick.",
    source: "https://www.markethotel.org/about",
    capacity: null,
  },
  {
    names: ["99 Scott"],
    metro: "nyc",
    description:
      "Industrial event space with a high-ceilinged main room, large windows, and a separate courtyard.",
    source: "https://www.99scott.com/spaces/main-room",
    capacity: {
      min: 900,
      max: 900,
      source: "https://www.99scott.com/spaces/main-room",
      configuration: "Main room, standing; courtyard not included",
      approximate: false,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["Fox Theater", "Fox Theater - Oakland", "Fox Theater Oakland"],
    metro: "sf",
    description:
      "Restored Uptown Oakland theater with ornate original interiors and a modern concert sound system.",
    source: "https://thefoxoakland.com/",
    capacity: {
      min: 2800,
      max: 2800,
      source: "https://thefoxoakland.com/",
      configuration: "Maximum concert configuration",
      approximate: false,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["Lagniappe"],
    metro: "miami",
    description:
      "Miami venue with live music every night, including jazz residencies.",
    source: "https://www.lagniappehouse.com/music-schedule.html",
    capacity: null,
  },
  {
    names: ["Miami Beach Bandshell"],
    metro: "miami",
    description:
      "Open-air theater built in 1961, hosting concerts and festivals in North Beach.",
    source:
      "https://www.miamibeachfl.gov/city-hall/parks-and-recreation/rentals/north-shore-bandshell-rentals/",
    capacity: null,
  },
  {
    names: ["Bowery Ballroom"],
    metro: "nyc",
    description: "Concert hall with a wraparound balcony and a mezzanine bar.",
    source: "https://elegantaffairscaterers.com/locations/bowery-ballroom/",
    capacity: null,
  },
  {
    names: ["The Independent", "Independent"],
    metro: "sf",
    description:
      "Divisadero Street music club with viewing platforms and a second-floor balcony; hosts both emerging and established artists.",
    source: "https://www.anotherplanetevents.com/the-independent-sf",
    capacity: {
      min: 500,
      max: 500,
      source: "https://www.anotherplanetevents.com/the-independent-sf",
      configuration: "500 standing / 300 seated",
      approximate: false,
      verifiedAt: "2026-10-02",
    },
  },
  {
    names: ["Cafe du Nord"],
    metro: "sf",
    description:
      "Live-music club at the Swedish American Hall complex on Market Street.",
    source: "https://cafedunord.com/",
    capacity: null,
  },
];

const normalize = (name) =>
  String(name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
const profiles = new Map(
  venueProfiles.flatMap((p) =>
    p.names.map((name) => [`${p.metro}:${normalize(name)}`, p]),
  ),
);
export function enrichVenue(venue, metro) {
  if (!venue) return venue;
  const p = profiles.get(`${venue.metro || metro}:${normalize(venue.name)}`);
  if (!p) return venue;
  // A named sub-room must never inherit the full venue's occupancy.
  const capacity = venue.capacity || (!venue.room ? p.capacity : null);
  return {
    ...venue,
    capacity,
    description: venue.description || p.description,
    descriptionSource: venue.descriptionSource || (!venue.description ? p.source : undefined),
    provenance: {...venue.provenance,
      ...((!venue.description || venue.descriptionSource===p.source) ? {description:{secondary:true,sources:[{name:"Venue reference",url:p.source}],match:"Researched venue name and metro"}} : {}),
      ...((!venue.capacity || venue.capacity.source===p.capacity?.source) && capacity ? {capacity:{secondary:true,sources:[{name:"Capacity reference",url:capacity.source||p.source}],match:"Researched venue name and metro; whole venue"}} : {})},
  };
}
export function enrichEventVenue(event) {
  const venue = enrichVenue(event.venue, event.metro);
  return venue === event.venue ? event : { ...event, venue };
}
