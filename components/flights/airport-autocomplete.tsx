"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Airplane01Icon, Location01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import {
  type Airport,
  AIRPORT_MIN_CHARS,
  getRecentAirports,
  addRecentAirport,
  searchAirports,
} from "@/lib/api/flights";

export interface AirportAutocompleteProps {
  id?: string;
  label: string;
  placeholder?: string;
  value: string;
  selectedAirport: Airport | null;
  onSelect: (airport: Airport | null) => void;
  onInputChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  helperText?: string;
  excludeIata?: string | null;
}

/**
 * Accessible airport autocomplete.
 * - Triggers from 2 characters across IATA/city/name (backend matches all three)
 * - 300ms debounce, request dedup via module-level pending Map, result cache via Map
 * - Versioned recent searches from localStorage (rendered when input is idle)
 * - Input stays responsive: list updates are deferred (useDeferredValue) and transitions
 * - Full keyboard and screen-reader support (combobox + listbox + active-descendant)
 */
export function AirportAutocomplete({
  id,
  label,
  placeholder = "City, airport, or code e.g. LOS",
  value,
  selectedAirport,
  onSelect,
  onInputChange,
  error,
  disabled,
  helperText,
  excludeIata,
}: AirportAutocompleteProps) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  const listboxId = `${inputId}-listbox`;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState(value);
  const [results, setResults] = React.useState<Airport[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [recent, setRecent] = React.useState<Airport[]>([]);

  // Keep internal query in sync when parent resets value (e.g. URL hydration)
  React.useEffect(() => {
    setQuery(value);
  }, [value]);

  // Load recent searches once on mount
  React.useEffect(() => {
    setRecent(getRecentAirports());
  }, []);

  // Debounce: 300ms, 2-char minimum
  const deferredQuery = React.useDeferredValue(query);
  const debounceRef = React.useRef<number | null>(null);

  const filteredResults = React.useMemo(() => {
    if (!excludeIata) return results;
    const needle = excludeIata.toUpperCase();
    return results.filter((a) => a.iata_code.toUpperCase() !== needle);
  }, [results, excludeIata]);

  // useDeferredValue keeps typing responsive while list updates are low priority
  const deferredResults = React.useDeferredValue(filteredResults);

  const showRecent = query.trim().length < AIRPORT_MIN_CHARS && recent.length > 0;
  const listItems: Airport[] = showRecent ? recent : deferredResults;

  // Single-flight: searchAirports owns cache + dedup (module-level Maps).
  // The component only debounces and filters — no duplicated Map lookups.
  const fetchResults = React.useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < AIRPORT_MIN_CHARS) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const data = await searchAirports(trimmed);
      const needle = excludeIata?.toUpperCase();
      setResults(needle ? data.filter((a) => a.iata_code.toUpperCase() !== needle) : data);
    } finally {
      setIsSearching(false);
    }
  }, [excludeIata]);

  // Debounced effect (300ms per spec §53)
  React.useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    const q = deferredQuery;
    if (q.trim().length < AIRPORT_MIN_CHARS) {
      setIsSearching(false);
      setResults([]);
      setActiveIndex(-1);
      return;
    }

    debounceRef.current = window.setTimeout(() => {
      // Use transition so typing stays high priority (vercel: rerender-transitions)
      React.startTransition(() => {
        void fetchResults(q);
      });
    }, 300);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [deferredQuery, fetchResults]);

  const handleInputChange = (next: string) => {
    setQuery(next);
    onInputChange(next);
    setOpen(true);
    setActiveIndex(-1);
    // If user edits after a selection, clear the selection so origin/destination
    // validation requires a fresh autocomplete pick (no free-text IATA bypass)
    if (selectedAirport && next.trim().toUpperCase() !== selectedAirport.iata_code) {
      onSelect(null);
    }
  };

  const handleSelect = (airport: Airport) => {
    setQuery(`${airport.city ? airport.city + " " : ""}(${airport.iata_code})`);
    onInputChange(`${airport.city ? airport.city + " " : ""}(${airport.iata_code})`);
    onSelect(airport);
    addRecentAirport(airport);
    setRecent(getRecentAirports());
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleClear = () => {
    setQuery("");
    onInputChange("");
    onSelect(null);
    setResults([]);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, listItems.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < listItems.length) {
        event.preventDefault();
        handleSelect(listItems[activeIndex]);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const displayValue = selectedAirport
    ? `${selectedAirport.city ? selectedAirport.city + " — " : ""}${selectedAirport.name} (${selectedAirport.iata_code})`
    : query;

  // rendering-conditional-render: ternary not && for conditional UI
  return (
    <div className="w-full space-y-1.5">
      <label htmlFor={inputId} className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase">
        {label}
      </label>

      <div className="relative">
        <div className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
          <HugeiconsIcon icon={Location01Icon} size={16} aria-hidden="true" />
        </div>

        <input
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${inputId}-option-${activeIndex}` : undefined}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperId}
          placeholder={placeholder}
          disabled={disabled}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Delay close to allow click selection
            window.setTimeout(() => setOpen(false), 180);
          }}
          onKeyDown={onKeyDown}
          className={cn(
            "flex h-10 w-full rounded-xl border border-input bg-card py-2 pr-9 pl-9 text-sm text-foreground shadow-xs transition-colors",
            "placeholder:text-muted-foreground",
            "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30",
          )}
        />

        {query.length > 0 ? (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={handleClear}
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span aria-hidden="true" className="text-sm leading-none">×</span>
          </button>
        ) : null}
      </div>

      {selectedAirport ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <HugeiconsIcon icon={Tick01Icon} size={12} aria-hidden="true" className="text-emerald-600" />
          <span className="truncate">
            Selected: {selectedAirport.iata_code} — {selectedAirport.city || selectedAirport.name}
          </span>
        </p>
      ) : null}

      {open ? (
        <div className="relative">
          <div
            id={listboxId}
            role="listbox"
            aria-label={`${label} suggestions`}
            className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg"
          >
            {isSearching ? (
              <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground" role="status" aria-live="polite">
                <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
                <span>Searching airports…</span>
              </div>
            ) : listItems.length === 0 ? (
              <div className="px-3 py-3 text-xs leading-relaxed text-muted-foreground">
                {query.trim().length < AIRPORT_MIN_CHARS ? (
                  <span>Type at least 2 characters to search by code, city, or name.</span>
                ) : (
                  <span>No airports found for “{query.trim()}”. Try another spelling.</span>
                )}
              </div>
            ) : (
              <>
                {showRecent ? (
                  <div className="px-2 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Recent searches</div>
                ) : null}
                {listItems.map((airport, index) => {
                  const isActive = index === activeIndex;
                  const isSelected = selectedAirport?.iata_code === airport.iata_code;
                  return (
                    <button
                      key={`${airport.iata_code}-${index}`}
                      id={`${inputId}-option-${index}`}
                      role="option"
                      type="button"
                      aria-selected={isSelected}
                      onMouseDown={(e) => {
                        // Prevent input blur before click
                        e.preventDefault();
                        handleSelect(airport);
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        isActive ? "bg-muted text-foreground" : "hover:bg-muted/60",
                        isSelected && "bg-primary/10",
                      )}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <HugeiconsIcon icon={Airplane01Icon} size={14} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-1.5">
                          <span className="text-sm font-semibold text-foreground">{airport.iata_code}</span>
                          <span className="truncate text-xs text-muted-foreground">{airport.city || ""}</span>
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{airport.name}</span>
                      </span>
                      {isSelected ? <HugeiconsIcon icon={Tick01Icon} size={14} aria-hidden="true" className="text-primary" /> : null}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      ) : null}

      {error ? (
        <p id={errorId} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
