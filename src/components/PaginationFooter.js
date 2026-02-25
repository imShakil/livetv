'use client';

export default function PaginationFooter({
  page,
  totalPages,
  rangeStart,
  rangeEnd,
  totalCount,
  onPrevious,
  onNext
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-steel/15 pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-steel">
        Showing {rangeStart}-{rangeEnd} of {totalCount}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={page === 1}
          className="rounded-lg border border-steel/20 bg-white px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-40"
        >
          Previous
        </button>
        <span className="min-w-20 text-center text-xs font-semibold text-steel">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={page === totalPages}
          className="rounded-lg border border-steel/20 bg-white px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
