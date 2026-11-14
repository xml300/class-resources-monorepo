import {
  BookOpen,
  Code2,
  ClipboardList,
  FileText,
  Presentation,
  Video,
} from "lucide-react";
import { RESOURCE_TYPE_LABELS, type ResourceType } from "@repo/shared";

const STYLE_MAP: Record<ResourceType, { bg: string; icon: typeof FileText }> = {
  SLIDES: {
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Presentation,
  },
  VIDEO: {
    bg: "bg-rose-50 text-rose-700 border-rose-200",
    icon: Video,
  },
  READING: {
    bg: "bg-sky-50 text-sky-700 border-sky-200",
    icon: BookOpen,
  },
  CODE: {
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: Code2,
  },
  ASSIGNMENT: {
    bg: "bg-violet-50 text-violet-700 border-violet-200",
    icon: ClipboardList,
  },
  OTHER: {
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    icon: FileText,
  },
};

export function ResourceBadge({ type }: { type: ResourceType }) {
  const config = STYLE_MAP[type] || STYLE_MAP.OTHER;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.bg}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {RESOURCE_TYPE_LABELS[type]}
    </span>
  );
}
