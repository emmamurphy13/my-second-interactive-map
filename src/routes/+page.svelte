<script>
  import ArticleHeader from '$lib/components/Article/ArticleHeader.svelte';
  import ArticleBody from '$lib/components/Article/ArticleBody.svelte';
  import MethodologyBox from '$lib/components/Article/MethodologyBox.svelte';
  import Dashboard from '$lib/components/Data/Dashboard.svelte';
  import BigNumber from '$lib/components/Data/BigNumber.svelte';
  import Card from '$lib/components/Data/Card.svelte';
  import CardGrid from '$lib/components/Data/CardGrid.svelte';
  import TagList from '$lib/components/Data/TagList.svelte';
  import DropdownInput from '$lib/components/Forms/DropdownInput.svelte';
  import SearchInput from '$lib/components/Forms/SearchInput.svelte';
  import Map from '$lib/components/Maps/Map.svelte';
  import MapLayer from '$lib/components/Maps/MapLayer.svelte';

  let { data } = $props();

  let searchQuery = $state('');
  let boroughFilter = $state('all');
  let focusFilter = $state('all');

  const formatter = new Intl.NumberFormat('en-US');

  const PROGRAM_COLORS = ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8'];

  function buildProgramScale(libraries) {
    const rankedLibraries = libraries
      .map((library, index) => ({
        index,
        totalPrograms: Number(library.totalPrograms ?? 0),
      }))
      .sort((left, right) => {
        if (left.totalPrograms !== right.totalPrograms) {
          return left.totalPrograms - right.totalPrograms;
        }

        return left.index - right.index;
      });

    if (rankedLibraries.length === 0) {
      return {
        expression: [
          'match',
          ['get', 'programTier'],
          1,
          PROGRAM_COLORS[0],
          2,
          PROGRAM_COLORS[1],
          3,
          PROGRAM_COLORS[2],
          4,
          PROGRAM_COLORS[3],
          PROGRAM_COLORS[3],
        ],
        items: PROGRAM_COLORS.map((color, tier) => ({
          tier: tier + 1,
          color,
          label: 'No branches',
        })),
        tiersByIndex: new Map(),
      };
    }

    const chunkSize = Math.ceil(rankedLibraries.length / PROGRAM_COLORS.length);
    const tierAssignments = new globalThis.Map();
    const tierValues = Array.from({ length: PROGRAM_COLORS.length }, () => []);

    rankedLibraries.forEach((entry, sortedIndex) => {
      const tier = Math.min(
        PROGRAM_COLORS.length,
        Math.floor(sortedIndex / chunkSize) + 1
      );
      tierAssignments.set(entry.index, tier);
      tierValues[tier - 1].push(entry.totalPrograms);
    });

    return {
      expression: [
        'match',
        ['get', 'programTier'],
        1,
        PROGRAM_COLORS[0],
        2,
        PROGRAM_COLORS[1],
        3,
        PROGRAM_COLORS[2],
        4,
        PROGRAM_COLORS[3],
        PROGRAM_COLORS[3],
      ],
      items: tierValues.map((values, tierIndex) => {
        const color = PROGRAM_COLORS[tierIndex];

        if (values.length === 0) {
          return {
            tier: tierIndex + 1,
            color,
            label: 'No branches',
          };
        }

        const minimum = values[0];
        const maximum = values[values.length - 1];

        if (tierIndex === PROGRAM_COLORS.length - 1) {
          return {
            tier: tierIndex + 1,
            color,
            label: `${minimum}+ programs`,
          };
        }

        if (minimum === maximum) {
          return {
            tier: tierIndex + 1,
            color,
            label: `${minimum} program${minimum === 1 ? '' : 's'}`,
          };
        }

        return {
          tier: tierIndex + 1,
          color,
          label: `${minimum}–${maximum} programs`,
        };
      }),
      tiersByIndex: tierAssignments,
    };
  }

  const programScale = $derived.by(() => buildProgramScale(data.libraries));

  const librariesWithProgramTier = $derived.by(() =>
    data.libraries.map((library, index) => ({
      ...library,
      programTier: programScale.tiersByIndex.get(index) ?? 1,
    }))
  );

  const filteredLibraries = $derived(
    librariesWithProgramTier.filter((library) => {
      const searchText =
        `${library.name} ${library.neighborhood} ${library.address} ${library.programs.join(' ')}`.toLowerCase();
      const matchesSearch =
        !searchQuery || searchText.includes(searchQuery.toLowerCase());
      const matchesBorough =
        boroughFilter === 'all' || library.borough === boroughFilter;
      const matchesFocus =
        focusFilter === 'all' || library.focus === focusFilter;

      return matchesSearch && matchesBorough && matchesFocus;
    })
  );

  const mapLibraries = $derived(filteredLibraries);

  const mapCenter = $derived.by(() => {
    if (mapLibraries.length === 0) {
      return data.mapCenter;
    }

    const totals = mapLibraries.reduce(
      (accumulator, library) => {
        accumulator.longitude += library.coordinates[0];
        accumulator.latitude += library.coordinates[1];
        return accumulator;
      },
      { longitude: 0, latitude: 0 }
    );

    return {
      longitude: totals.longitude / mapLibraries.length,
      latitude: totals.latitude / mapLibraries.length,
    };
  });

  const mapGeojson = $derived({
    type: 'FeatureCollection',
    features: mapLibraries.map((library) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: library.coordinates,
      },
      properties: library,
    })),
  });

  const visibleSummary = $derived({
    libraryCount: filteredLibraries.length,
    boroughCount: new Set(filteredLibraries.map((library) => library.borough))
      .size,
    programCount: filteredLibraries.reduce(
      (sum, library) => sum + library.programs.length,
      0
    ),
    topLibrary:
      [...filteredLibraries].sort(
        (left, right) => right.attendance - left.attendance
      )[0] ?? data.summary.topLibrary,
  });

  const libraryOptions = $derived(
    data.boroughOptions.map((option) => ({
      ...option,
      label: option.value === 'all' ? 'All boroughs' : option.label,
    }))
  );

  const focusOptions = $derived([
    { value: 'all', label: 'All programs' },
    ...data.focusOptions,
  ]);

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function buildPopupHtml(library) {
    const enrollmentMarkup = [
      `<li>Adult: ${formatter.format(library.adultProgram ?? 0)} programs · ${formatter.format(library.adultAttendance ?? 0)} enrollment</li>`,
      `<li>Young adult: ${formatter.format(library.youngAdultProgram ?? 0)} programs · ${formatter.format(library.youngAdultAttendance ?? 0)} enrollment</li>`,
      `<li>Juvenile: ${formatter.format(library.juvenileProgram ?? 0)} programs · ${formatter.format(library.juvenileAttendance ?? 0)} enrollment</li>`,
      `<li>Outreach: ${formatter.format(library.outreachProgram ?? 0)} programs · ${formatter.format(library.outreachAttendance ?? 0)} enrollment</li>`,
    ].join('');

    return `
      <div class="map-popup">
        <strong>${escapeHtml(library.name)}</strong>
        <p>${escapeHtml(library.neighborhood)} · ${escapeHtml(library.borough)}</p>
        <p>${escapeHtml(library.address)}</p>
        <p>${formatter.format(library.attendance)} annual visits</p>
        <p><strong>Program enrollment</strong></p>
        <ul>${enrollmentMarkup}</ul>
        <p><strong>Total programs:</strong> ${formatter.format(library.totalPrograms ?? 0)}</p>
      </div>
    `;
  }

  function buildMapsHref(address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
</script>

<svelte:head>
  <title>{data.pageTitle} | NYCity News Service</title>
  <meta name="description" content={data.pageDescription} />
</svelte:head>

<div class="page-shell">
  <ArticleHeader
    headline={data.pageTitle}
    byline="NYCity News Service"
    pubDate="2026-04-26"
  />

  <ArticleBody>
    <p class="lede">
      Explore selected New York Public Library branches, their attendance, and
      the recurring programs that anchor each neighborhood branch. The markers
      on the map are colored by borough so you can see how the library system
      stretches across the city.
    </p>
  </ArticleBody>

  <Dashboard>
    <BigNumber
      number={formatter.format(visibleSummary.libraryCount)}
      label="Libraries shown"
    />
    <BigNumber
      number={formatter.format(visibleSummary.boroughCount)}
      label="Boroughs represented"
    />
    <BigNumber
      number={formatter.format(visibleSummary.programCount)}
      label="Program listings"
    />
  </Dashboard>

  <section class="explorer" aria-label="NYC library map and filters">
    <div class="controls-panel">
      <SearchInput
        bind:value={searchQuery}
        label="Search libraries"
        placeholder="Search by branch, address, or program…"
      />
      <DropdownInput
        label="Borough"
        placeholder="All boroughs…"
        options={libraryOptions}
        value={boroughFilter}
        onchange={(event) => {
          boroughFilter = event.currentTarget.value;
        }}
      />
      <DropdownInput
        label="Program focus"
        placeholder="All programs…"
        options={focusOptions}
        value={focusFilter}
        onchange={(event) => {
          focusFilter = event.currentTarget.value;
        }}
      />
    </div>

    <div class="map-and-summary">
      <div class="map-panel">
        <Map
          longitude={mapCenter.longitude}
          latitude={mapCenter.latitude}
          zoom={10}
          border={true}
          height={620}
          caption="NYC public library branches colored by a four-level program scale. Click a marker to see a popup with address and programs."
          credit="Map tiles by OpenFreeMap / OpenStreetMap contributors"
        >
          <MapLayer
            id="library-markers"
            type="circle"
            data={mapGeojson}
            paint={{
              'circle-radius': 8,
              'circle-color': programScale.expression,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            }}
            popup={(feature) => buildPopupHtml(feature.properties)}
          />
        </Map>

        <div class="legend" aria-label="Program scale legend">
          <span class="legend-title">Programs per branch</span>
          {#each programScale.items as item (item.tier)}
            <span class="legend-item">
              <span
                class="legend-swatch"
                style={`background-color: ${item.color}`}
              ></span>
              {item.label}
            </span>
          {/each}
        </div>
      </div>

      <aside class="summary-panel">
        <Card>
          <h3>{data.summary.topLibrary?.name}</h3>
          <p>
            {data.summary.topLibrary?.borough} · {data.summary.topLibrary
              ?.neighborhood}
          </p>
          <p class="summary-text">
            The busiest branch in this starter map is
            {data.summary.topLibrary?.name} with
            {formatter.format(data.summary.topLibrary?.attendance ?? 0)} annual visits.
          </p>
          <TagList
            label="Featured programs"
            tags={data.summary.topLibrary?.programs ?? []}
          />
        </Card>

        <MethodologyBox title="About this map">
          <p>
            Branch names, attendance counts, and addresses are adapted from the
            reference library dataset. Program labels are curated to show how
            the map can pair locations with recurring neighborhood services, and
            the dot colors rise from lighter to darker blue as program counts go up.
          </p>
          <p>
            Want to dig deeper? Visit the
            <a
              href="https://www.nypl.org/locations"
              target="_blank"
              rel="noreferrer"
            >NYPL locations directory</a>
            or open the branch page on
            <a
              href={buildMapsHref(data.summary.topLibrary?.address ?? '')}
              target="_blank"
              rel="noreferrer"
            >Google Maps</a>.
          </p>
        </MethodologyBox>
      </aside>
    </div>
  </section>

  <section class="results-section" aria-labelledby="library-results-title">
    <div class="section-intro">
      <h2 id="library-results-title">Featured branches</h2>
      <p>
        These cards update as you search and filter. Each one highlights the
        branch’s attendance, neighborhood, and a sample of programs readers can
        explore.
      </p>
    </div>

    {#if filteredLibraries.length === 0}
      <p class="no-results">
        No libraries match your search. Try a different keyword or filter.
      </p>
    {:else}
      <CardGrid>
        {#each filteredLibraries as library (library.name)}
          <Card>
            <h3>{library.name}</h3>
            <p>{library.neighborhood} · {library.borough}</p>
            <p class="attendance-line">
              {formatter.format(library.attendance)} annual visits
            </p>
            <p class="address-line">{library.address}</p>
            <TagList label="Programs" tags={library.programs} />
            <p class="card-link">
              <a
                href={buildMapsHref(library.address)}
                target="_blank"
                rel="noreferrer"
              >
                View on Google Maps
              </a>
            </p>
          </Card>
        {/each}
      </CardGrid>
    {/if}
  </section>
</div>

<style lang="scss">
  @use '$lib/styles' as *;

  .page-shell {
    width: 100%;
    max-width: var(--max-width-wide);
    margin: 0 auto;
    padding: var(--spacing-lg) var(--spacing-md) var(--spacing-xxl);
  }

  .lede {
    font-size: var(--font-size-lg);
    line-height: var(--leading-relaxed);
  }

  .explorer {
    margin-top: var(--spacing-lg);
  }

  .controls-panel {
    display: grid;
    gap: var(--spacing-sm);
    grid-template-columns: 1fr;
    margin-bottom: var(--spacing-md);

    @include tablet {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .map-and-summary {
    display: grid;
    gap: var(--spacing-md);

    @include desktop {
      grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.75fr);
      align-items: start;
    }
  }

  .map-panel {
    display: grid;
    gap: var(--spacing-xs);
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
    align-items: center;
  }

  .legend-title {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    margin-right: var(--spacing-xxs);
  }

  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xxs);
    font-size: var(--font-size-sm);
  }

  .legend-swatch {
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
  }

  .summary-panel {
    display: grid;
    gap: var(--spacing-md);
  }

  .summary-text {
    margin-bottom: 0;
  }

  .results-section {
    margin-top: var(--spacing-xxl);
  }

  .section-intro {
    max-width: 65ch;
    margin-bottom: var(--spacing-md);
  }

  .no-results {
    font-size: var(--font-size-lg);
  }

  .attendance-line {
    font-weight: var(--font-weight-semibold);
  }

  .address-line {
    color: var(--color-medium-gray);
  }

  :global(.map-popup) {
    max-width: 240px;
  }

  :global(.map-popup p) {
    margin: 0.35rem 0;
  }

  :global(.map-popup ul) {
    margin: 0.5rem 0 0;
    padding-left: 1rem;
  }
</style>
