import type { PolicyQuestion } from "./types";

export const POLICY_QUESTIONS: PolicyQuestion[] = [
  {
    id: "q-repeat-1",
    asker: "Sarah Chen",
    role: "GLA analyst",
    category: "repeat",
    tag: "repeat-sites",
    tagLabel: "Workload",
    message:
      "How much planning officer time goes to the same address twice? I need a number for tomorrow's brief.",
  },
  {
    id: "q-repeat-2",
    asker: "Marcus Okonkwo",
    role: "Local journalist",
    category: "repeat",
    tag: "repeat-sites",
    tagLabel: "Pipeline",
    message:
      "Are Section 73 amendments inflating our 'approved homes' count without adding new sites?",
  },
  {
    id: "q-deadline-1",
    asker: "Cllr Patel",
    role: "Bexley planning",
    category: "deadline",
    tag: "deadline-rush",
    tagLabel: "Timeliness",
    borough: "Bexley",
    message:
      "We hit the 8-week target but applicants say we rush refusals on the deadline. Is that visible in the data?",
  },
  {
    id: "q-deadline-2",
    asker: "MHCLG observer",
    role: "Policy reviewer",
    category: "deadline",
    tag: "deadline-rush",
    tagLabel: "KPI design",
    message:
      "Why do so many London decisions land exactly on day 56? Is P152 driving perverse outcomes?",
  },
  {
    id: "q-small-1",
    asker: "Cllr Williams",
    role: "Outer London",
    category: "small-sites",
    tag: "small-sites",
    tagLabel: "London Plan",
    message:
      "The Plan says 40% from small sites. We're nowhere near it. Is outer London refusing them or not getting applications?",
  },
  {
    id: "q-small-2",
    asker: "Design code lead",
    role: "MHCLG",
    category: "small-sites",
    tag: "small-sites",
    tagLabel: "Design codes",
    message:
      "Would design-code automation help small-site delivery, or is the blocker committee refusal?",
  },
  {
    id: "q-friction-1",
    asker: "Developer liaison",
    role: "Lambeth",
    category: "friction",
    tag: "friction",
    tagLabel: "Borough compare",
    borough: "Lambeth",
    message:
      "How does Lambeth compare on decision delay and approval rate for housing applications?",
  },
  {
    id: "q-friction-2",
    asker: "Planning consultant",
    role: "Private sector",
    category: "friction",
    tag: "friction",
    tagLabel: "Documents",
    borough: "Greenwich",
    message:
      "Greenwich has a bad reputation for refusals — what do the Foundations numbers actually show?",
  },
  {
    id: "q-pitch-1",
    asker: "Hackathon team",
    role: "House London #2",
    category: "pitch",
    tag: "pitch-prep",
    tagLabel: "Opening stat",
    message: "Give me one number I can open a 2-minute pitch with tomorrow.",
  },
  {
    id: "q-pitch-2",
    asker: "Hackathon team",
    role: "House London #2",
    category: "pitch",
    tag: "pitch-prep",
    tagLabel: "Policy ask",
    message:
      "What's the single policy intervention that follows from repeat applications and deadline bunching?",
  },
  {
    id: "q-phantom-1",
    asker: "Campaigner",
    role: "Policy network",
    category: "phantom",
    tag: "repeat-sites",
    tagLabel: "Land banking",
    message:
      "Permissions granted but homes not built — how much of the pipeline is repeat bites vs new supply?",
  },
];
