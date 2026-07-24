import { useEffect, useRef, useState } from 'react';
import type { Building } from '../types';
import { searchBuildings } from '../data';

interface SearchBarProps {
  onPick: (building: Building) => void;
}

const MAX_RESULTS = 8;

/**
 * Address search in the header.
 * Case-insensitive, 8 results maximum.
 */
export default function SearchBar({ onPick }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Building[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const found = searchBuildings(query).slice(0, MAX_RESULTS);
    setResults(found);
    setOpen(query.trim().length > 0 && found.length > 0);
  }, [query]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function pick(building: Building) {
    setQuery(`${building.address}, ${building.city}`);
    setOpen(false);
    onPick(building);
  }

  return (
    <div className="app-header__search search-bar" ref={rootRef}>
      <input
        type="search"
        value={query}
        placeholder="Search for an address or a city"
        aria-label="Search for an address"
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (results.length > 0 && query.trim().length > 0) setOpen(true);
        }}
      />
      {open && (
        <ul className="search-bar__results" role="listbox">
          {results.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                className="search-bar__result"
                onClick={() => pick(b)}
              >
                <span className={`dpe-badge dpe-badge--sm dpe-${b.certificate.label.toLowerCase()}`}>
                  {b.certificate.label}
                </span>
                <span className="search-bar__text">
                  <span className="search-bar__address">{b.address}</span>
                  <span className="search-bar__city">
                    {b.city} {b.postcode}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
