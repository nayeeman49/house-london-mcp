import type { HousingTag } from "./types";

export type CaseId =
  | "deadline"
  | "repeat"
  | "small-sites"
  | "friction"
  | "pitch";

export type CaseDefinition = {
  id: CaseId;
  tag: HousingTag;
  label: string;
  subtitle: string;
  metricLabel: string;
  accent: string;
};

export const CASES: CaseDefinition[] = [
  {
    id: "repeat",
    tag: "repeat-sites",
    label: "Repeat Sites",
    subtitle: "Officer time re-adjudicating the same plot",
    metricLabel: "Repeat application share",
    accent: "#22c55e",
  },
  {
    id: "deadline",
    tag: "deadline-rush",
    label: "Deadline Rush",
    subtitle: "8-week KPI bunching and worse outcomes",
    metricLabel: "Deadline-day share",
    accent: "#f59e0b",
  },
  {
    id: "small-sites",
    tag: "small-sites",
    label: "Small Sites",
    subtitle: "London Plan 40% target vs reality",
    metricLabel: "Outer London small-app share",
    accent: "#38bdf8",
  },
  {
    id: "friction",
    tag: "friction",
    label: "Borough Friction",
    subtitle: "Delay, documents, approval rates",
    metricLabel: "Avg decision days",
    accent: "#a78bfa",
  },
  {
    id: "pitch",
    tag: "pitch-prep",
    label: "Pitch Prep",
    subtitle: "2-minute hackathon brief builder",
    metricLabel: "Headline stat",
    accent: "#fb7185",
  },
];

export function getCaseById(id: CaseId): CaseDefinition {
  return CASES.find((c) => c.id === id) ?? CASES[0];
}
