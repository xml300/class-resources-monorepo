import { Clock, Eye, EyeOff } from "lucide-react";
import { getPublishStatus } from "@repo/shared";
import {
  formatPublishDateTime,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "../lib/publishStatus";

export function PublishStatusBadge({
  publishedAt,
}: {
  publishedAt: string | null;
}) {
  const status = getPublishStatus(publishedAt);

  if (status === "published") {
    return (
      <span
        title={`Published ${formatPublishDateTime(publishedAt)}`}
        className="inline-flex items-center gap-1 rounded-full border border-emerald-800/70 bg-emerald-950/80 px-2.5 py-0.5 text-xs font-medium text-emerald-300"
      >
        <Eye className="h-3 w-3" />
        Published
      </span>
    );
  }

  if (status === "scheduled") {
    return (
      <span
        title={`Scheduled for ${formatPublishDateTime(publishedAt)}`}
        className="inline-flex items-center gap-1 rounded-full border border-amber-800/70 bg-amber-950/80 px-2.5 py-0.5 text-xs font-medium text-amber-300"
      >
        <Clock className="h-3 w-3" />
        Scheduled · {formatPublishDateTime(publishedAt)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
      <EyeOff className="h-3 w-3" />
      Draft
    </span>
  );
}

interface PublishControlProps {
  value: string | null;
  onChange: (nextIso: string | null) => void;
}

export function PublishControl({ value, onChange }: PublishControlProps) {
  const status = getPublishStatus(value);
  const mode: "draft" | "now" | "schedule" =
    value === null ? "draft" : status === "scheduled" ? "schedule" : "now";

  const setDraft = () => onChange(null);
  const setNow = () => onChange(new Date().toISOString());
  const setSchedule = () => {
    if (value && getPublishStatus(value) === "scheduled") return;
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setMinutes(0, 0, 0);
    onChange(tomorrow.toISOString());
  };

  return (
    <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-300">
          Publishing (publishedAt)
        </span>
        <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5 text-xs">
          <button
            type="button"
            onClick={setDraft}
            className={`rounded-md px-2.5 py-1 font-medium transition ${
              mode === "draft"
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Draft
          </button>
          <button
            type="button"
            onClick={setNow}
            className={`rounded-md px-2.5 py-1 font-medium transition ${
              mode === "now"
                ? "bg-emerald-800 text-emerald-50"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Publish Now
          </button>
          <button
            type="button"
            onClick={setSchedule}
            className={`rounded-md px-2.5 py-1 font-medium transition ${
              mode === "schedule"
                ? "bg-amber-800 text-amber-50"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Schedule
          </button>
        </div>
      </div>

      {value !== null && (
        <div>
          <label className="mb-1 block text-[11px] text-zinc-400">
            Publish date & time
          </label>
          <input
            type="datetime-local"
            value={toDatetimeLocalValue(value)}
            onChange={(e) => onChange(fromDatetimeLocalValue(e.target.value))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
