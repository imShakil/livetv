'use client';

import { ListFilter, Search } from 'lucide-react';

export default function ChannelFiltersBar({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  categories,
  queryPlaceholder = 'Search channels'
}) {
  return (
    <div className="grid gap-2.5 md:gap-3 md:grid-cols-[1.6fr_1fr]">
      <label className="flex items-center gap-2 rounded-lg border border-steel/20 bg-white px-3 py-2.5">
        <Search className="h-4 w-4 text-steel" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={queryPlaceholder}
          className="w-full border-none bg-transparent text-sm outline-none placeholder:text-steel/70"
        />
      </label>

      <label className="flex items-center gap-2 rounded-lg border border-steel/20 bg-white px-3 py-2.5">
        <ListFilter className="h-4 w-4 text-steel" />
        <select
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="w-full bg-transparent text-sm outline-none"
        >
          {categories.map((entry) => (
            <option key={entry} value={entry}>
              {entry === 'all' ? 'All categories' : entry}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
