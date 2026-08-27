export type BankEvidenceGrade = "strong" | "moderate" | "emerging" | "anecdotal";

export type BankSource = {
  label: string;
  url: string;
};

export type BankGuide = {
  url: string;
  source: string;
};

export type BankProtocol = {
  id: string;
  name: string;
  title: string;
  benefit: string;
  subtitle: string;
  rationale: string;
  origin?: string;
  kind: string;
  family?: string;
  tier?: "beginner" | "intermediate" | "advanced";
  tierTarget?: string;
  targets: string[];
  durationMinutes: number;
  evidence: {
    grade: BankEvidenceGrade;
    summary: string;
    sources: BankSource[];
  };
  indications: string[];
  avoidWhen?: string[];
  guide: BankGuide | null;
};

export declare const PROTOCOLS: BankProtocol[];
export declare function protocolCore(id: string): BankProtocol;
export declare function hasProtocol(id: string): boolean;
