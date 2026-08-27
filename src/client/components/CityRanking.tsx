import { ArrowDownUp, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { RankedCity } from "../../shared/contracts";

interface CityRankingProps {
  cities: RankedCity[];
  selectedId: string;
  onSelect: (city: RankedCity) => void;
}

/** Search and display order are local presentation choices; canonical ranks never change. */
export function CityRanking({ cities, selectedId, onSelect }: CityRankingProps) {
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState<"best" | "lowest">("best");
  const visibleCities = useMemo(() => {
    const matching = cities.filter((city) => city.cityName.toLowerCase().includes(query.toLowerCase()));
    return direction === "best" ? matching : [...matching].reverse();
  }, [cities, direction, query]);

  return (
    <section className="ranking-panel" aria-labelledby="ranking-title">
      <div className="section-heading">
        <div><p className="eyebrow">Live comparison</p><h2 id="ranking-title">City field notes</h2></div>
        <span className="count-badge">{cities.length} cities</span>
      </div>
      <div className="ranking-tools">
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search cities</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a city" />
        </label>
        <button className="sort-button" type="button" onClick={() => setDirection((current) => current === "best" ? "lowest" : "best")}>
          <ArrowDownUp size={16} aria-hidden="true" /> {direction === "best" ? "Best first" : "Lowest first"}
        </button>
      </div>
      <ol className="city-list" aria-label="Cities ranked by ocular comfort">
        {visibleCities.map((city) => (
          <li key={city.cityId}>
            <button className={`city-row ${selectedId === city.cityId ? "city-row--selected" : ""}`} type="button" onClick={() => onSelect(city)} aria-pressed={selectedId === city.cityId}>
              <span className="rank-number">{String(city.rank).padStart(2, "0")}</span>
              <span className="city-name"><strong>{city.cityName}</strong><small>{city.country} · {city.description}</small></span>
              <span className={`score-chip score-chip--${city.classification.toLowerCase().replaceAll(" ", "-")}`}>{city.score}</span>
            </button>
          </li>
        ))}
      </ol>
      {visibleCities.length === 0 && <p className="empty-message">No city matches “{query}”.</p>}
    </section>
  );
}
