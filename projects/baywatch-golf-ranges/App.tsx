"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type RangeStatus = "Open now" | "Filling up" | "Waitlist";

type GolfRange = {
  id: string;
  name: string;
  area: string;
  address?: string;
  distance: number;
  drive: number;
  available: number;
  total: number;
  waitMinutes: number;
  price: string;
  hours: string;
  features: string[];
  source?: string;
  freshness?: {
    ageMinutes: number;
    isFresh: boolean;
    label: string;
  };
  x: string;
  y: string;
};

const fallbackRanges: GolfRange[] = [
  {
    id: "fairfield-golf-center",
    name: "Fairfield Golf Center",
    area: "Fairfield",
    distance: 2.4,
    drive: 7,
    available: 14,
    total: 36,
    waitMinutes: 0,
    price: "$14",
    hours: "Open until 10 PM",
    features: ["TrackMan", "Covered", "Lights"],
    x: "35%",
    y: "30%",
  },
  {
    id: "oak-hills-range",
    name: "Oak Hills Range",
    area: "Norwalk",
    distance: 4.8,
    drive: 12,
    available: 5,
    total: 24,
    waitMinutes: 10,
    price: "$12",
    hours: "Open until 9 PM",
    features: ["Grass tees", "Lessons", "Putting"],
    x: "64%",
    y: "47%",
  },
  {
    id: "sterling-farms",
    name: "Sterling Farms",
    area: "Stamford",
    distance: 7.1,
    drive: 18,
    available: 0,
    total: 44,
    waitMinutes: 30,
    price: "$16",
    hours: "Open until 10 PM",
    features: ["Toptracer", "Covered", "Food"],
    x: "77%",
    y: "70%",
  },
  {
    id: "smith-richardson",
    name: "Smith Richardson",
    area: "Fairfield",
    distance: 8.3,
    drive: 20,
    available: 19,
    total: 40,
    waitMinutes: 0,
    price: "$13",
    hours: "Open until 9 PM",
    features: ["Grass tees", "Lights", "Club rental"],
    x: "23%",
    y: "71%",
  },
];

const filters = ["All ranges", "Available now", "Under 5 mi", "Toptracer"];

function availabilityTone(range: GolfRange) {
  if (range.freshness && !range.freshness.isFresh) return "stale";
  if (range.available === 0) return "busy";
  if (range.available / Math.max(range.total, 1) <= 0.25) return "limited";
  return "open";
}

function availabilityLabel(range: GolfRange) {
  if (range.available === 0) return "Full";
  return `${range.available} bays open`;
}

function rangeStatus(range: GolfRange): RangeStatus | "Update needed" {
  if (range.freshness && !range.freshness.isFresh) return "Update needed";
  if (range.available === 0) return "Waitlist";
  if (range.available / Math.max(range.total, 1) <= 0.25) return "Filling up";
  return "Open now";
}

function waitLabel(range: GolfRange) {
  if (range.freshness && !range.freshness.isFresh) return "Check with range";
  if (range.waitMinutes === 0) return "Walk right in";
  return `About ${range.waitMinutes} min`;
}

export default function Home() {
  const [ranges, setRanges] = useState<GolfRange[]>(fallbackRanges);
  const [activeFilter, setActiveFilter] = useState("All ranges");
  const [view, setView] = useState<"list" | "map">("list");
  const [saved, setSaved] = useState<string[]>(["fairfield-golf-center"]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [updated, setUpdated] = useState("sample data");
  const [locationState, setLocationState] = useState<
    "idle" | "loading" | "active" | "denied"
  >("idle");

  const loadRanges = useCallback(
    async (latitude?: number, longitude?: number) => {
      setRanges(fallbackRanges);
      setUpdated("sample data");
    },
    [],
  );

  useEffect(() => {
    loadRanges().catch(() => {
      // Keep the bundled pilot data visible if live service setup is incomplete.
    });
  }, [loadRanges]);

  const visibleRanges = useMemo(() => {
    return ranges.filter((range) => {
      const matchesQuery = `${range.name} ${range.area}`
        .toLowerCase()
        .includes(query.toLowerCase());
      if (!matchesQuery) return false;
      if (activeFilter === "Available now") return range.available > 0;
      if (activeFilter === "Under 5 mi") return range.distance < 5;
      if (activeFilter === "Toptracer")
        return range.features.some((feature) =>
          ["Toptracer", "TrackMan"].includes(feature),
        );
      return true;
    });
  }, [activeFilter, query]);

  const refresh = () => {
    loadRanges().catch(() => setUpdated("could not refresh"));
  };

  const useLocation = () => setLocationState("denied");

  return (
    <main>
      <div className="demo-notice">INTERACTIVE PORTFOLIO DEMO · Sample ranges, bay counts, prices, and travel times. No live availability or location collection.</div>
      <header className="topbar">
        <a className="brand" href="#" aria-label="Baywatch home">
          <span className="brand-mark" aria-hidden="true">
            ●
          </span>
          baywatch
        </a>
        <nav aria-label="Primary navigation">
          <a className="nav-active" href="#nearby">
            Explore
          </a>
          
          <a href="#how-it-works">About this demo</a>
        </nav>
        <span className="profile" aria-label="Demo">Demo</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">FAIRFIELD COUNTY, CT</p>
          <h1>Find an open bay.<br />Go hit balls.</h1>
          <p className="hero-sub">
            Compare sample driving range availability, so you can spend less time waiting
            and more time swinging.
          </p>
        </div>

        <div className="search-panel">
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by range or town"
              aria-label="Search by range or town"
            />
            <button
              type="button"
              className="location-button"
              disabled aria-label="Sample location: Fairfield County"
              
            >
              <span aria-hidden="true">◎</span>{" "}
              {locationState === "loading"
                ? "Locating…"
                : locationState === "active"
                  ? "Location active"
                  : locationState === "denied"
                    ? "Location unavailable"
                    : "Sample location"}
            </button>
          </label>
          <div className="live-note">
            <span className="pulse-dot" aria-hidden="true" />
            Availability: {updated}
            <button type="button" onClick={refresh}>
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="content" id="nearby">
        <div className="section-heading">
          <div>
            <p className="section-kicker">NEAR YOU</p>
            <h2>{visibleRanges.length} ranges nearby</h2>
          </div>
          <div className="view-toggle" aria-label="Choose view">
            <button
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
            >
              ☷ <span>List</span>
            </button>
            <button
              className={view === "map" ? "active" : ""}
              onClick={() => setView("map")}
              aria-pressed={view === "map"}
            >
              ◉ <span>Map</span>
            </button>
          </div>
        </div>

        <div className="filter-row" aria-label="Filter ranges">
          {filters.map((filter) => (
            <button
              key={filter}
              className={activeFilter === filter ? "active" : ""}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        {view === "list" ? (
          <div className="range-grid">
            {visibleRanges.map((range) => {
              const tone = availabilityTone(range);
              return (
                <article
                  className={`range-card ${selected === range.id ? "selected" : ""}`}
                  key={range.id}
                  onClick={() =>
                    setSelected(selected === range.id ? null : range.id)
                  }
                >
                  <div className="card-topline">
                    <span className={`status ${tone}`}>
                      <span aria-hidden="true" />
                      {rangeStatus(range)}
                    </span>
                    <button
                      className={`save-button ${saved.includes(range.id) ? "saved" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSaved((current) =>
                          current.includes(range.id)
                            ? current.filter((id) => id !== range.id)
                            : [...current, range.id],
                        );
                      }}
                      aria-label={
                        saved.includes(range.id)
                          ? `Unsave ${range.name}`
                          : `Save ${range.name}`
                      }
                    >
                      {saved.includes(range.id) ? "♥" : "♡"}
                    </button>
                  </div>

                  <h3>{range.name}</h3>
                  <p className="range-meta">
                    {range.area} <span>•</span> {range.distance} mi{" "}
                    <span>•</span> {range.drive} min
                  </p>

                  <div className={`availability ${tone}`}>
                    <div>
                      <p>{availabilityLabel(range)}</p>
                      <span>
                        {range.available} of {range.total} available
                      </span>
                    </div>
                    <strong>{waitLabel(range)}</strong>
                  </div>

                  <div className="bay-meter" aria-hidden="true">
                    {Array.from({ length: 10 }).map((_, index) => (
                      <span
                        className={
                          index <
                          Math.round(
                            (range.available / Math.max(range.total, 1)) * 10,
                          )
                            ? tone
                            : ""
                        }
                        key={index}
                      />
                    ))}
                  </div>

                  <div className="feature-row">
                    {range.features.map((feature) => (
                      <span key={feature}>{feature}</span>
                    ))}
                  </div>

                  <div className="card-footer">
                    <div>
                      <span>FROM</span>
                      <strong>{range.price}</strong>
                      <span>/ bucket</span>
                    </div>
                    <p>{range.hours}</p>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(range.name + " " + range.area)}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                    >
                      Directions ↗
                    </a>
                  </div>
                </article>
              );
            })}
            {visibleRanges.length === 0 && (
              <div className="empty-state">
                <span>⛳</span>
                <h3>No ranges match those filters</h3>
                <button
                  onClick={() => {
                    setActiveFilter("All ranges");
                    setQuery("");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="map-view">
            <div className="map-road road-one" />
            <div className="map-road road-two" />
            <div className="map-road road-three" />
            <div className="water" />
            <span className="map-town town-one">FAIRFIELD</span>
            <span className="map-town town-two">NORWALK</span>
            <span className="map-town town-three">STAMFORD</span>
            <div className="you-marker">
              <span />
              You
            </div>
            {visibleRanges.map((range) => (
              <button
                className={`map-pin ${availabilityTone(range)} ${selected === range.id ? "selected" : ""}`}
                style={{ left: range.x, top: range.y }}
                key={range.id}
                onClick={() => setSelected(range.id)}
                aria-label={`${range.name}, ${availabilityLabel(range)}`}
              >
                {range.available}
                <span>{range.name}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="confidence-strip">
        <div>
          <span aria-hidden="true">◷</span>
          <p>
            <strong>A sample availability experience</strong>
            This standalone preview uses fixed sample data. The original private service is separate from this visitor preview.
          </p>
        </div>
        <a href="#how-it-works">About this preview →</a>
      </section>

      <footer id="how-it-works">
        <a className="brand brand-footer" href="#">
          <span className="brand-mark" aria-hidden="true">
            ●
          </span>
          baywatch
        </a>
        <p>Built for spontaneous range sessions.</p>
        <span>Availability expires when a range stops confirming updates.</span>
      </footer>
    </main>
  );
}
