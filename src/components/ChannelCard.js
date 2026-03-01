'use client';

import { PlayCircle } from 'lucide-react';

export default function ChannelCard({ channel, isActive, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(channel)}
      className={`group flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition duration-200 ${
        isActive
          ? 'border-sea/70 bg-cyan-50 shadow-card'
          : 'border-steel/20 bg-white/90 hover:-translate-y-0.5 hover:border-sea/60 hover:bg-white hover:shadow-card'
      }`}
    >
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-sand/80 ring-1 ring-black/5 sm:h-12 sm:w-12">
        {channel.logo ? (
          <img
            src={channel.logo}
            alt={`${channel.name} logo`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold tracking-wide text-ember">
            LIVE
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink sm:text-sm">{channel.name}</p>
        <p className="truncate text-[11px] text-steel sm:text-xs">
          {channel.category || 'Uncategorized'}
          {channel.language ? ` · ${channel.language}` : ''}
        </p>
      </div>
      <PlayCircle className="hidden h-5 w-5 shrink-0 text-sea transition group-hover:scale-110 sm:block" />
    </button>
  );
}
