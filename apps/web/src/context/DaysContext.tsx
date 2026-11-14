import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";
import type { DayWithResourcesDTO } from "@repo/shared";
import { api } from "../lib/api";

interface DaysContextValue {
  days: DayWithResourcesDTO[];
  activeDay: DayWithResourcesDTO | null;
  setActiveDayNumber: (dayNumber: number) => void;
  refreshDays: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const DaysContext = createContext<DaysContextValue | undefined>(undefined);

export function DaysProvider({ children }: { children: ReactNode }) {
  const [days, setDays] = useState<DayWithResourcesDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const refreshDays = useCallback(async () => {
    try {
      const data = await api.getPublicDays();
      setDays(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load days");
    }
  }, []);

  useEffect(() => {
    refreshDays().finally(() => setLoading(false));
  }, [refreshDays]);

  const dayParam = Number(searchParams.get("day"));
  const activeDay =
    days.find((d) => d.dayNumber === dayParam) ?? days[0] ?? null;

  const setActiveDayNumber = (dayNumber: number) => {
    setSearchParams({ day: String(dayNumber) });
  };

  return (
    <DaysContext.Provider
      value={{
        days,
        activeDay,
        setActiveDayNumber,
        refreshDays,
        loading,
        error,
      }}
    >
      {children}
    </DaysContext.Provider>
  );
}

export function useDays() {
  const ctx = useContext(DaysContext);
  if (!ctx) {
    throw new Error("useDays must be used within DaysProvider");
  }
  return ctx;
}
