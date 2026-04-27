const LOCATIONS_URL =
  'https://data.cityofnewyork.us/resource/feuq-due4.json?$limit=5000';
const ATTENDANCE_URL =
  'https://data.cityofnewyork.us/resource/ne9z-skhf.json?$limit=50000';

const BOROUGH_ORDER = ['Bronx', 'Manhattan', 'Staten Island'];

function toNumber(value) {
  if (value == null) return 0;
  return Number(String(value).replaceAll(',', '').trim()) || 0;
}

function normalizeBranchName(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\*.*$/g, '')
    .replace(/network/g, '')
    .replace(/borough office/g, '')
    .replace(/library center/g, 'librarycenter')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function mapBorough(value) {
  if (value === 'Bronx') return 'Bronx';
  if (value === 'Manhattan') return 'Manhattan';
  if (value === 'Staten Island') return 'Staten Island';
  return value;
}

function buildAddress(location) {
  const street =
    `${location.housenum ?? ''} ${location.streetname ?? ''}`.trim();
  const city = location.city ? `${location.city}, ` : '';
  const zip = location.zip ? ` ${location.zip}` : '';
  return `${street}, ${city}NY${zip}`.trim();
}

function buildFocus(
  adultAttendance,
  youngAdultAttendance,
  juvenileAttendance,
  outreachAttendance
) {
  const metrics = [
    { label: 'Adult programs', value: adultAttendance },
    { label: 'Young adult programs', value: youngAdultAttendance },
    { label: 'Juvenile programs', value: juvenileAttendance },
    { label: 'Outreach services', value: outreachAttendance },
  ];

  return metrics.sort((left, right) => right.value - left.value)[0].label;
}

function buildSummary(libraries) {
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

function buildMapCenter(libraries) {
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

function buildFeatureCollection(libraries) {
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

export async function load({ fetch }) {
  const [locationsResponse, attendanceResponse] = await Promise.all([
    fetch(LOCATIONS_URL),
    fetch(ATTENDANCE_URL),
  ]);

  const [locationsRows, attendanceRows] = await Promise.all([
    locationsResponse.json(),
    attendanceResponse.json(),
  ]);

  const nyplLocationsByName = new Map(
    locationsRows
      .filter((row) => row.system === 'NYPL')
      .map((row) => [normalizeBranchName(row.name), row])
  );

  const libraries = attendanceRows
    .filter((row) => BOROUGH_ORDER.includes(row['boro_central_library']))
    .filter((row) => row.branch)
    .map((row) => {
      const branchName = String(row.branch).replace(/\*.*$/g, '').trim();
      const normalized = normalizeBranchName(branchName);

      const totalAttendance = toNumber(row._total_attendance);
      if (totalAttendance <= 0) return null;

      const location = nyplLocationsByName.get(normalized);
      if (!location?.the_geom?.coordinates) return null;

      const adultAttendance = toNumber(row.adult_attendance);
      const adultProgram = toNumber(row.adult_program);
      const youngAdultAttendance = toNumber(row.young_adult_attendance);
      const youngAdultProgram = toNumber(row.young_adult_program);
      const juvenileAttendance = toNumber(row.juvenile_attendance);
      const juvenileProgram = toNumber(row.juvenile_program);
      const outreachAttendance = toNumber(row.outreach_services_attendance);
      const outreachProgram = toNumber(row.outreach_services_program);
      const totalPrograms = toNumber(row._total_program);

      return {
        name: location.name ?? branchName,
        borough: mapBorough(row['boro_central_library']),
        neighborhood: location.city ?? 'New York',
        address: buildAddress(location),
        coordinates: location.the_geom.coordinates,
        attendance: totalAttendance,
        focus: buildFocus(
          adultAttendance,
          youngAdultAttendance,
          juvenileAttendance,
          outreachAttendance
        ),
        adultProgram,
        adultAttendance,
        youngAdultProgram,
        youngAdultAttendance,
        juvenileProgram,
        juvenileAttendance,
        outreachProgram,
        outreachAttendance,
        totalPrograms,
        programs: [
          `Adult attendance: ${adultAttendance.toLocaleString('en-US')}`,
          `Young adult attendance: ${youngAdultAttendance.toLocaleString('en-US')}`,
          `Juvenile attendance: ${juvenileAttendance.toLocaleString('en-US')}`,
          `Outreach attendance: ${outreachAttendance.toLocaleString('en-US')}`,
          `Total programs: ${totalPrograms.toLocaleString('en-US')}`,
        ],
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.attendance - left.attendance);

  const boroughOptions = [
    { value: 'all', label: 'All boroughs' },
    ...BOROUGH_ORDER.filter((borough) =>
      libraries.some((library) => library.borough === borough)
    ).map((borough) => ({ value: borough, label: borough })),
  ];

  const focusOptions = [
    ...new Set(libraries.map((library) => library.focus)),
  ].map((focus) => ({ value: focus, label: focus }));

  return {
    showHeader: true,
    showFooter: true,
    pageTitle: 'NYPL Branch Program Attendance Map',
    pageDescription:
      'Explore NYPL branch locations and click any point to view program attendance from NYC Open Data.',
    boroughOrder: BOROUGH_ORDER,
    boroughOptions,
    focusOptions,
    libraries,
    libraryGeojson: buildFeatureCollection(libraries),
    mapCenter: buildMapCenter(libraries),
    summary: buildSummary(libraries),
  };
}
