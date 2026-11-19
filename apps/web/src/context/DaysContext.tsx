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

const ACTIVE_DAY_STORAGE_KEY = "class-resources:active-day";

function readStoredDayNumber(): number | null {
  try {
    const raw = localStorage.getItem(ACTIVE_DAY_STORAGE_KEY);
    if (!raw) return null;
    const num = Number(raw);
    return Number.isInteger(num) && num > 0 ? num : null;
  } catch {
    return null;
  }
}

function writeStoredDayNumber(dayNumber: number): void {
  try {
    localStorage.setItem(ACTIVE_DAY_STORAGE_KEY, String(dayNumber));
  } catch {
    // ignore storage errors
  }
}

function resolveSectionListPath(pathname: string): string | null {
  if (pathname === "/" || pathname === "/exercises" || pathname === "/code" || pathname === "/projects") {
    return pathname;
  }
  if (pathname.startsWith("/exercises/")) return "/exercises";
  if (pathname.startsWith("/code/")) return "/code";
  if (pathname.startsWith("/projects/")) return "/projects";
  return null;
}

interface DaysContextValue {
  days: DayWithResourcesDTO[];
  activeDay: DayWithResourcesDTO | null;
  setActiveDayNumber: (dayNumber: number) => void;
  syncActiveDayNumber: (dayNumber: number) => void;
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
  const hasValidDayParam = Number.isInteger(dayParam) && dayParam > 0;

  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(
    () => (hasValidDayParam ? dayParam : readStoredDayNumber())
  );

  useEffect(() => {
    if (hasValidDayParam) {
      setSelectedDayNumber(dayParam);
      writeStoredDayNumber(dayParam);
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

  // Keep storage in sync once days resolve
  useEffect(() => {
    if (activeDay) {
      writeStoredDayNumber(activeDay.dayNumber);
    }
  }, [activeDay]);

  const syncActiveDayNumber = useCallback((dayNumber: number) => {
    if (!Number.isInteger(dayNumber) || dayNumber <= 0) return;
    setSelectedDayNumber(dayNumber);
    writeStoredDayNumber(dayNumber);
  }, []);

  const setActiveDayNumber = useCallback(
    (dayNumber: number) => {
      setSelectedDayNumber(dayNumber);
      writeStoredDayNumber(dayNumber);

      const sectionPath = resolveSectionListPath(location.pathname);
      if (sectionPath === location.pathname) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set("day", String(dayNumber));
            return next;
          },
          { replace: false }
        );
      } else if (sectionPath) {
        navigate(`${sectionPath}?day=${dayNumber}`);
      } else {
        navigate(`/?day=${dayNumber}`);
      }
    },
    [location.pathname, navigate, setSearchParams]
  );

  return (
    <DaysContext.Provider
      value={{
        days,
        activeDay,
        setActiveDayNumber,
        syncActiveDayNumber,
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
