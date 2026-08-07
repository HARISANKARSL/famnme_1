export interface SacredPlace {
  templeId: string;
  name: string;
  location: string;
  state: string;
  info: string;
  story: string | null;
  visitingGuide: string | null;
  architecture: string | null;
  mentionInScripture: string | null;
  category?: string;
  religion: 'Hindu' | 'Christian' | 'Islam';
  type?: 'temple' | 'church' | 'mosque';  // defaults to 'temple' if absent (backward compat)
  // Hindu-specific (optional for churches/mosques)
  deity?: string;
  deities?: string[];
  // Christian/Islam-specific
  denomination?: string;
  district?: string;
}

// Backward-compatible alias — all existing code using Temple continues to work
export type Temple = SacredPlace;

export interface TempleConnection {
  temple: SacredPlace;
  connectionType: 'native_place' | 'deity_affinity' | 'ceremony_location' | 'kula_devata';
  reason: string;
  score: number;
  linkedPersonIds?: string[];
}
