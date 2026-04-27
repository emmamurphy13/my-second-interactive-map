export const LIBRARIES = [
  {
    name: 'Bronx Library Center',
    borough: 'Bronx',
    neighborhood: 'Fordham',
    address: '310 East Kingsbridge Road, Bronx, NY 10458',
    coordinates: [-73.8907, 40.8574],
    attendance: 40723,
    focus: 'Family & Youth',
    programs: [
      'Storytime and early literacy',
      'Homework help and tutoring',
      'Teen tech lab',
      'Computer basics',
    ],
  },
  {
    name: 'Parkchester',
    borough: 'Bronx',
    neighborhood: 'Parkchester',
    address: '1985 Westchester Avenue, Bronx, NY 10462',
    coordinates: [-73.8557, 40.8338],
    attendance: 25531,
    focus: 'Digital Skills',
    programs: [
      'TechConnect help',
      'Job search support',
      'Digital literacy classes',
      'Family chess club',
    ],
  },
  {
    name: 'Soundview',
    borough: 'Bronx',
    neighborhood: 'Soundview',
    address: '660 Soundview Avenue, Bronx, NY 10473',
    coordinates: [-73.8699, 40.8213],
    attendance: 15743,
    focus: 'Community Health',
    programs: [
      'Storytime and early literacy',
      'Community wellness workshops',
      'Teen makers sessions',
      'Summer reading club',
    ],
  },
  {
    name: 'Mott Haven',
    borough: 'Bronx',
    neighborhood: 'Mott Haven',
    address: '321 East 140th Street, Bronx, NY 10454',
    coordinates: [-73.9187, 40.8088],
    attendance: 14737,
    focus: 'Career & College',
    programs: [
      'Resume and interview coaching',
      'College readiness',
      'Teen advisory board',
      'Family homework help',
    ],
  },
  {
    name: 'Seward Park',
    borough: 'Manhattan',
    neighborhood: 'Lower East Side',
    address: '192 East Broadway, New York, NY 10002',
    coordinates: [-73.9901, 40.7148],
    attendance: 20368,
    focus: 'Language & Literacy',
    programs: [
      'ESOL conversation circles',
      'Family storytime',
      'Bilingual book club',
      'Computer basics',
    ],
  },
  {
    name: 'Ottendorfer',
    borough: 'Manhattan',
    neighborhood: 'East Village',
    address: '135 2nd Avenue, New York, NY 10003',
    coordinates: [-73.9872, 40.7283],
    attendance: 17285,
    focus: 'Culture & History',
    programs: [
      'Neighborhood history talks',
      'Genealogy help',
      'Author visits',
      'Arts and crafts',
    ],
  },
  {
    name: 'Inwood',
    borough: 'Manhattan',
    neighborhood: 'Inwood',
    address: '4790 Broadway, New York, NY 10034',
    coordinates: [-73.9261, 40.8673],
    attendance: 14987,
    focus: 'Teens & STEM',
    programs: [
      'Homework help',
      'STEM discovery club',
      'Teen open lab',
      'Music and media hours',
    ],
  },
  {
    name: 'Fort Washington',
    borough: 'Manhattan',
    neighborhood: 'Washington Heights',
    address: '535 West 179th Street, New York, NY 10033',
    coordinates: [-73.9361, 40.8497],
    attendance: 14832,
    focus: 'Career & College',
    programs: [
      'College prep advising',
      'Job search help',
      'Reading circles',
      'Digital skills workshops',
    ],
  },
  {
    name: 'Dongan Hills',
    borough: 'Staten Island',
    neighborhood: 'Dongan Hills',
    address: '1617 Richmond Road, Staten Island, NY 10304',
    coordinates: [-74.1001, 40.5786],
    attendance: 15368,
    focus: 'Family & Makers',
    programs: [
      'Family storytime',
      'Knitting and crafts',
      'Computer basics',
      'Local history hour',
    ],
  },
  {
    name: 'New Dorp',
    borough: 'Staten Island',
    neighborhood: 'New Dorp',
    address: '309 New Dorp Lane, Staten Island, NY 10306',
    coordinates: [-74.1147, 40.5738],
    attendance: 12074,
    focus: 'Technology & Media',
    programs: [
      'Teen gaming club',
      'Resume coaching',
      'Digital literacy classes',
      'Memoir writing workshop',
    ],
  },
  {
    name: 'St. George Library Center',
    borough: 'Staten Island',
    neighborhood: 'St. George',
    address: '5 Central Avenue, Staten Island, NY 10301',
    coordinates: [-74.0746, 40.6432],
    attendance: 11566,
    focus: 'Civic & Arts',
    programs: [
      'Civic information desk',
      'Children’s storytime',
      'Arts workshops',
      'Job search support',
    ],
  },
  {
    name: 'Great Kills',
    borough: 'Staten Island',
    neighborhood: 'Great Kills',
    address: '56 Giffords Lane, Staten Island, NY 10308',
    coordinates: [-74.1581, 40.5535],
    attendance: 9906,
    focus: 'Adult Learning',
    programs: [
      'Book club',
      'Homework help',
      'Senior tech hour',
      'Early literacy play time',
    ],
  },
];

export const BOROUGH_ORDER = ['Bronx', 'Manhattan', 'Staten Island'];

export const BOROUGH_COLORS = {
  Bronx: '#1b7f5a',
  Manhattan: '#0033a1',
  'Staten Island': '#6b4ca5',
  Brooklyn: '#d46a1f',
  Queens: '#b42318',
};

export function getBoroughOptions(libraries = LIBRARIES) {
  return BOROUGH_ORDER.filter((borough) =>
    libraries.some((library) => library.borough === borough)
  ).map((borough) => ({ value: borough, label: borough }));
}

export function getFocusOptions(libraries = LIBRARIES) {
  return [...new Set(libraries.map((library) => library.focus))].map(
    (focus) => ({
      value: focus,
      label: focus,
    })
  );
}

export function buildFeatureCollection(libraries = LIBRARIES) {
  return {
    type: 'FeatureCollection',
    features: libraries.map((library) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: library.coordinates,
      },
      properties: {
        ...library,
        programsText: library.programs.join(' • '),
      },
    })),
  };
}

export function buildSummary(libraries = LIBRARIES) {
  const boroughs = new Set(libraries.map((library) => library.borough));
  const totalPrograms = libraries.reduce(
    (sum, library) => sum + library.programs.length,
    0
  );
  const topLibrary =
    [...libraries].sort(
      (left, right) => right.attendance - left.attendance
    )[0] ?? null;

  return {
    libraryCount: libraries.length,
    boroughCount: boroughs.size,
    totalPrograms,
    topLibrary,
  };
}

export function buildMapCenter(libraries = LIBRARIES) {
  if (libraries.length === 0) {
    return { longitude: -74.006, latitude: 40.7128 };
  }

  const totals = libraries.reduce(
    (accumulator, library) => {
      accumulator.longitude += library.coordinates[0];
      accumulator.latitude += library.coordinates[1];
      return accumulator;
    },
    { longitude: 0, latitude: 0 }
  );

  return {
    longitude: totals.longitude / libraries.length,
    latitude: totals.latitude / libraries.length,
  };
}

export function buildGoogleMapsHref(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
