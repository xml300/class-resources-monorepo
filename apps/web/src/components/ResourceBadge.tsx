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
    bg: "bg-amber-950/60 text-amber-300 border-amber-800/60",
    icon: Presentation,
  },
  VIDEO: {
    bg: "bg-rose-950/60 text-rose-300 border-rose-800/60",
    icon: Video,
  },
  READING: {
    bg: "bg-sky-950/60 text-sky-300 border-sky-800/60",
    icon: BookOpen,
  },
  CODE: {
    bg: "bg-emerald-950/70 text-emerald-300 border-emerald-800/60",
    icon: Code2,
  },
  ASSIGNMENT: {
    bg: "bg-teal-950/70 text-teal-300 border-teal-800/60",
    icon: ClipboardList,
  },
  OTHER: {
    bg: "bg-zinc-800 text-zinc-300 border-zinc-700",
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
