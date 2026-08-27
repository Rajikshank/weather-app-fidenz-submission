import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, LogOut, Moon, RefreshCw, Sun } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { RankedCity, RankingsResponse } from "../../shared/contracts";
import { useAuthSession } from "../auth/auth-context";
import { BrandMark } from "../components/BrandMark";
import { CityRanking } from "../components/CityRanking";
import { MetricStrip } from "../components/MetricStrip";
import { NearbyLocationButton, type LocationStatus } from "../components/NearbyLocationButton";
import { OcuLoader } from "../components/OcuLoader";
import { OcularPulse } from "../components/OcularPulse";
import type { NearbyCity } from "../../shared/contracts";

// Analytics sit below the primary decision surface, so defer the charting
// runtime until the dashboard has rendered its immediately useful content.
const CityComparisonChart = lazy(() => import("../components/CityComparisonChart").then((module) => ({ default: module.CityComparisonChart })));
const ScoreBreakdown = lazy(() => import("../components/ScoreBreakdown").then((module) => ({ default: module.ScoreBreakdown })));

async function loadRankings(getAccessToken: () => Promise<string | null>) {
  const token = await getAccessToken();
  const response = await fetch("/api/rankings", { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  if (!response.ok) throw new Error(response.status === 401 ? "Your session has expired." : "Weather observations are temporarily unavailable.");
  return response.json() as Promise<RankingsResponse>;
}

async function loadNearby(getAccessToken: () => Promise<string | null>, latitude: number, longitude: number) {
  const token = await getAccessToken();
  const parameters = new URLSearchParams({ lat: String(latitude), lon: String(longitude) });
  const response = await fetch(`/api/location?${parameters}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  if (!response.ok) throw new Error(response.status === 401 ? "Your session has expired." : "Nearby weather is temporarily unavailable.");
  return response.json() as Promise<NearbyCity>;
}

export function DashboardPage() {
  const auth = useAuthSession();
  const [selectedId, setSelectedId] = useState("");
  const [nearby, setNearby] = useState<NearbyCity | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationMessage, setLocationMessage] = useState("");
  const [dark, setDark] = useState(() => localStorage.getItem("ocu-theme") === "dark");
  const query = useQuery({ queryKey: ["rankings"], queryFn: () => loadRankings(auth.getAccessToken) });
  const selected = useMemo(() => selectedId === "nearby" && nearby ? nearby : query.data?.cities.find((city) => city.cityId === selectedId) ?? query.data?.cities[0], [nearby, query.data, selectedId]);
  const displayName = auth.userName === auth.userEmail ? "User" : auth.userName;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("ocu-theme", dark ? "dark" : "light");
  }, [dark]);

  const requestNearby = () => {
    if (nearby) {
      setSelectedId("nearby");
      setLocationMessage(`${nearby.cityName} nearby observation selected.`);
      return;
    }
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      setLocationMessage("Location is not supported by this browser.");
      return;
    }

    setLocationStatus("requesting");
    setLocationMessage("Requesting browser location…");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const result = await loadNearby(auth.getAccessToken, coords.latitude, coords.longitude);
        setNearby(result);
        setSelectedId("nearby");
        setLocationStatus("success");
        setLocationMessage(`${result.cityName} nearby observation selected.`);
      } catch (error) {
        setLocationStatus("error");
        setLocationMessage(error instanceof Error ? error.message : "Nearby weather is temporarily unavailable.");
      }
    }, (error) => {
      setLocationStatus(error.code === error.PERMISSION_DENIED ? "denied" : "error");
      setLocationMessage(error.code === error.PERMISSION_DENIED ? "Location permission was not granted. Your city ranking is unchanged." : "Your location could not be determined. Please try again.");
    }, { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 });
  };

  if (query.isLoading) return <OcuLoader />;
  if (query.isError) return (
    <main className="state-page" id="main-content"><BrandMark /><AlertTriangle size={30} /><h1>Conditions couldn’t be read.</h1><p>{query.error.message}</p><button className="primary-button" onClick={() => void query.refetch()}><RefreshCw size={17} />Try again</button></main>
  );
  if (!selected || !query.data?.cities.length) {
    const failureCount = query.data?.failures.length ?? 0;
    return (
      <main className="state-page" id="main-content">
        <BrandMark />
        <AlertTriangle size={30} />
        <h1>Weather observations unavailable.</h1>
        <p>{failureCount > 0 ? `All ${failureCount} configured city requests failed upstream.` : "No city observations were returned."}</p>
        <button className="primary-button" onClick={() => void query.refetch()}><RefreshCw size={17} />Try again</button>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="topbar">
        <BrandMark />
        <div className="header-actions">
          <button className="icon-button" type="button" onClick={() => setDark((value) => !value)} aria-label={dark ? "Use light theme" : "Use dark theme"}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
          <span className="user-chip"><i>{displayName.charAt(0)}</i><span>{displayName}<small>{auth.userEmail}</small></span></span>
          <button className="icon-button" type="button" onClick={auth.logout} aria-label="Log out"><LogOut size={18} /></button>
        </div>
      </header>
      {query.data.partial && <div className="partial-banner" role="status"><AlertTriangle size={17} />Showing {query.data.metadata.returned} of {query.data.metadata.requested} cities. Some upstream observations failed.</div>}
      <main className="dashboard" id="main-content">
        <section className="dashboard-intro">
          <div><p className="eyebrow">Current ocular environment</p><h1>Ocular climate, ranked.</h1></div>
          <div className="freshness"><span className="live-dot" />Updated {new Date(query.data.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}<button type="button" onClick={() => void query.refetch()} aria-label="Refresh observations"><RefreshCw size={15} /></button></div>
        </section>
        <div className="dashboard-grid dashboard-grid--primary">
          <section className="hero-card" aria-labelledby="city-summary-title">
            <div className="hero-copy">
              <div className="hero-meta-row">
                <span className={`rank-label ${selected.rank === null ? "rank-label--nearby" : ""}`}>{selected.rank === null ? "Near you · unranked" : `Rank ${String(selected.rank).padStart(2, "0")} · ${selected.country}`}</span>
                <NearbyLocationButton status={locationStatus} cityName={nearby?.cityName} message={locationMessage} active={selectedId === "nearby"} onRequest={requestNearby} />
              </div>
              <h2 id="city-summary-title">{selected.cityName}</h2>
              <p className="condition-label">{selected.classification}</p>
              <p className="factor-summary">{selected.summary}</p>
              <p className="weather-context">{selected.description} · observed {new Date(selected.observedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
            <OcularPulse score={selected.score} factors={selected.factors} cityName={selected.cityName} classification={selected.classification} />
            <MetricStrip city={selected} />
          </section>
          <CityRanking cities={query.data.cities} selectedId={selected.rank === null ? "" : selected.cityId} onSelect={(city: RankedCity) => {
            setSelectedId(city.cityId);
            if (nearby) setLocationMessage(`${nearby.cityName} nearby observation is ready.`);
          }} />
        </div>
        <div className="dashboard-grid dashboard-grid--analysis">
          <Suspense fallback={<AnalyticsSkeleton />}>
            <CityComparisonChart cities={query.data.cities} selectedId={selected.rank === null ? "" : selected.cityId} />
            <ScoreBreakdown key={selected.cityId} city={selected} />
          </Suspense>
        </div>
      </main>
      <footer><span>OcuComfort</span><span>Environmental guidance, not medical advice</span></footer>
    </div>
  );
}

function AnalyticsSkeleton() {
  return <><section className="analytics-skeleton" aria-label="Loading city comparison" /><section className="analytics-skeleton analytics-skeleton--compact" aria-label="Loading score explanation" /></>;
}
