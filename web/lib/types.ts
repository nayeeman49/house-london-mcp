export type HousingTag =
  | "deadline-rush"
  | "repeat-sites"
  | "small-sites"
  | "friction"
  | "pitch-prep";

export type QuestionCategory =
  | "deadline"
  | "repeat"
  | "small-sites"
  | "friction"
  | "phantom"
  | "pitch"
  | "meta";

export type PolicyQuestion = {
  id: string;
  asker: string;
  role: string;
  category: QuestionCategory;
  tag: HousingTag;
  tagLabel: string;
  message: string;
  borough?: string;
  isCustom?: boolean;
};

export type EvidenceCard = {
  questionId: string;
  replyText: string;
  headline: string;
  mechanism: string;
  dataSource: string;
  policyAsk: string;
  caveat: string;
  processedAt: string;
  source: "mcp" | "script" | "template";
  mcpTool?: string;
  rawMetrics?: Record<string, unknown>;
};

export type ConversationRole = "user" | "analyst";

export type ConversationMessage = {
  id: string;
  role: ConversationRole;
  text: string;
  sentAt: string;
  mcpTool?: string;
};

export type PresetConversation = {
  questionId: string;
  messages: ConversationMessage[];
  latestCard: EvidenceCard;
  analystTurnCount: number;
  maxTurns: number;
  isComplete: boolean;
};

export type SessionStats = {
  questionsAnswered: number;
  mcpCalls: number;
  pitchesExported: number;
};

export type McpToolInfo = {
  name: string;
  description: string;
};

export type AppMetrics = {
  processedCount: number;
  mcpCalls: number;
  pitchesReady: number;
  headlineStat: string | null;
};
