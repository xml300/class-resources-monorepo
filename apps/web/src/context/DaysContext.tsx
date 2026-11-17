import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { DayWithResourcesDTO } from "@repo/shared";
import { api } from "../lib/api";

interface DaysContextValue {
  days: DayWithResourcesDTO[];
  activeDay: DayWithResourcesDTO | null;
  setActiveDayNumber: (dayNumber: number) => void;
  refreshDays: () => Promise<DayWithResourcesDTO[] | undefined>;
  loading: boolean;
  error: string | null;
}

const DaysContext = createContext<DaysContextValue | undefined>(undefined);

export function DaysProvider({ children }: { children: ReactNode }) {
  const [days, setDays] = useState<DayWithResourcesDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const dayParamRaw = searchParams.get("day");
  const dayParam = dayParamRaw ? Number(dayParamRaw) : NaN;
  const hasValidDayParam = Number.isFinite(dayParam) && dayParam > 0;

  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(
    () => (hasValidDayParam ? dayParam : null)
  );

  useEffect(() => {
    if (hasValidDayParam) {
      setSelectedDayNumber(dayParam);
    }
  }, [hasValidDayParam, dayParam]);

  const refreshDays = useCallback(async () => {
    try {
      const data = await api.getPublicDays();
      setDays(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load days");
      return undefined;
    }
  }, []);

  useEffect(() => {
    refreshDays().finally(() => setLoading(false));
  }, [refreshDays]);

  const targetDayNumber = hasValidDayParam ? dayParam : selectedDayNumber;
  const activeDay =
    (targetDayNumber !== null
      ? days.find((d) => d.dayNumber === targetDayNumber)
      : undefined) ??
    days[0] ??
    null;

  const setActiveDayNumber = (dayNumber: number) => {
    setSelectedDayNumber(dayNumber);
    if (location.pathname !== "/") {
      navigate(`/?day=${dayNumber}`);
    } else {
      setSearchParams({ day: String(dayNumber) });
    }
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
