import { useState, type FormEvent } from "react";
import { KeyRound, Lock, ShieldAlert } from "lucide-react";
import type { DayWithResourcesDTO } from "@repo/shared";
import { api, ApiError } from "../lib/api";

interface DayLockedCardProps {
  day: DayWithResourcesDTO;
  sectionLabel: string;
  onUnlocked: () => Promise<void> | void;
}

export function DayLockedCard({
  day,
  sectionLabel,
  onUnlocked,
}: DayLockedCardProps) {
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(
    null
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim() || unlocking) return;
    setUnlocking(true);
    setError(null);
    setRemainingAttempts(null);
    try {
      await api.unlockDay(day.id, password);
      setPassword("");
      await onUnlocked();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.remainingAttempts !== undefined) {
          setRemainingAttempts(err.remainingAttempts);
        }
      } else {
        setError(err instanceof Error ? err.message : "Failed to unlock day");
      }
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-800/50 bg-zinc-900/80 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-amber-700/50 bg-amber-950/60 text-amber-300">
        <Lock className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-zinc-100">
        Day {day.dayNumber} is Password Protected
      </h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-zinc-400">
        Enter the class password for Day {day.dayNumber}:{" "}
        <span className="text-zinc-200">{day.title}</span> to unlock its{" "}
        {sectionLabel}.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mx-auto mt-5 flex max-w-sm flex-col gap-2.5 sm:flex-row"
      >
        <div className="relative flex-1">
          <KeyRound className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter day password"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-2 pr-3 pl-9 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={unlocking || !password.trim()}
          className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {unlocking ? "Unlocking..." : "Unlock"}
        </button>
      </form>

      {error && (
        <div className="mx-auto mt-3 flex max-w-sm items-center justify-center gap-1.5 text-xs text-red-400">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          <span>
            {error}
            {remainingAttempts !== null
              ? ` (${remainingAttempts} ${remainingAttempts === 1 ? "attempt" : "attempts"} remaining)`
              : ""}
          </span>
        </div>
      )}
    </div>
  );
}
