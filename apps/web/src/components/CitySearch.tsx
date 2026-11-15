import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";
import type { City } from "@/lib/types";

const EMPTY_QUERY_LIMIT = 20;
const SEARCH_RESULT_LIMIT = 40;

export function CitySearch({
  cities,
  onSelect,
}: {
  cities: City[];
  onSelect: (cityId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const blurTimer = useRef<number | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return cities;
    return cities.filter((city) =>
      [city.name, city.country, city.region, city.id, ...city.aliases].some((value) =>
        value.toLowerCase().includes(needle),
      ),
    );
  }, [cities, query]);

  const suggestions = useMemo(() => {
    if (!query.trim()) {
      return [...cities]
        .sort((a, b) => a.anchorRank - b.anchorRank || b.population - a.population)
        .slice(0, EMPTY_QUERY_LIMIT);
    }
    return filtered.slice(0, SEARCH_RESULT_LIMIT);
  }, [cities, filtered, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const row = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (city: City) => {
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
    onSelect(city.id);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="city-search" id="tour-city-search">
      <div className="city-search__panel">
        {open ? (
          <div id="city-search-results" className="city-search__results" ref={listRef} role="listbox" aria-label="City results">
            {suggestions.map((city, index) => (
              <button
                key={city.id}
                type="button"
                role="option"
                aria-selected={index === active}
                data-index={index}
                className={`city-search__item ${index === active ? "city-search__item--active" : ""}`}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(city);
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[12px] text-[var(--text)]">{city.name}</span>
                  <span className="block font-mono text-[8px] text-[var(--text-muted)]">
                    {city.country} · {city.lat.toFixed(2)}, {city.lon.toFixed(2)}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[8px] text-[var(--accent-dim)]">{city.region}</span>
              </button>
            ))}
            {!suggestions.length ? <div className="city-search__empty">No city matched.</div> : null}
            {suggestions.length < filtered.length ? (
              <div className="city-search__empty px-2 py-1 text-[8px]">
                SHOWING {suggestions.length} OF {filtered.length} · REFINE SEARCH
              </div>
            ) : null}
          </div>
        ) : null}
        <label className="city-search__row">
          <Search size={13} className="shrink-0 text-[var(--accent)]" />
          <span className="city-search__prefix">FIND CITY</span>
          <input
            ref={inputRef}
            className="city-search__input"
            value={query}
            placeholder="Search a city, country, or region…"
            aria-label="Search for a city"
            role="combobox"
            aria-expanded={open}
            aria-controls="city-search-results"
            onFocus={() => {
              if (blurTimer.current) window.clearTimeout(blurTimer.current);
              setOpen(true);
            }}
            onBlur={() => {
              blurTimer.current = window.setTimeout(() => setOpen(false), 120);
            }}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setOpen(true);
                setActive((index) => Math.min(suggestions.length - 1, index + 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => Math.max(0, index - 1));
              } else if (event.key === "Enter") {
                event.preventDefault();
                const city = suggestions[active];
                if (city) choose(city);
              } else if (event.key === "Escape") {
                setOpen(false);
                inputRef.current?.blur();
              }
            }}
          />
          <span className="hidden font-mono text-[8px] text-[var(--text-muted)] md:inline">[ / ]</span>
          <span className="city-search__count">{filtered.length}</span>
          <CornerDownLeft size={11} className="shrink-0 text-[var(--text-muted)]" />
        </label>
      </div>
    </div>
  );
}
