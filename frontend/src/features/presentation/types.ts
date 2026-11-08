export type Language = 'zh' | 'en';
export type Copy = Record<Language, string>;
export type Box = [number, number, number, number];
export type Region = { box: Box; coordinateWidth: number; coordinateHeight: number; origin: 'model-recorded' | 'author-verified' };
export type Issue = {
  id: string; title: Copy; sourceRegion: Region; draftRegion: Region; finalRegion: Region;
  sourceEvidence: Copy; draftEvidence: Copy; verification: 'confirmed' | 'corrected' | 'uncertain' | 'not-recorded';
  targetIds: string[]; transactionId: string | null; factId: string | null;
  recordedEvidence: { source: string; draft: string };
  labelPosition: [number, number]; sourceEndpoint: [number, number] | null; draftEndpoint: [number, number] | null;
  leaderSide: 'top' | 'right';
};
export type PresentationCase = {
  id: string; title: Copy;
  provenance: { sourceCommit: string; runId: string | null; conditionId: string | null; upstreamHashes: Record<string, string>; bundledHashes: Record<string, string> };
  dimensions: { width: number; height: number; viewBox: Box };
  images: { reference: string; draftPreview: string; finalPreview: string };
  svg: { draft: string; final: string };
  sam: { mode: 'recorded' | 'reference-crop-illustration'; segmentationCount: number | null; assets: { id: string; name: Copy; image: string; sourceRegion: Region; draftRegion?: Region; maskSvg?: string; displayHeight?: number; evidence?: { assetId: string; svgElementId: string; sha256: string; recovery: string } }[]; reason: string };
  issues: Issue[];
  issueMap?: { id: string; region: Region; labelPosition?: [number,number] | null; labelAnchor?: 'start'|'end'; sourceEvidence: string; draftEvidence: string; repair: string }[];
  repair: {
    kind: 'transaction-snapshot' | 'final-comparison'; beforeSvg: string; afterSvg: string; transactionId: string;
    context: string; region: Region; operations: { op: string; targetId: string; description: Copy }[];
    executionStatus: 'recorded-complete' | 'not-recorded'; plannedOperations: number | null; executedOperations: number | null;
    unresolvedCount: number | null; unresolvedItems?: unknown[]; visualQualityPass: boolean | null; transactionOperations: number;
    replay: { fullResultHashMatches: boolean; journalMatches: boolean; outsideTargetsUnchanged: boolean; beforeHash: string; afterHash: string };
  };
  gapGuidance: { state: 'triggered' | 'not-triggered' | 'not-recorded'; summary: Copy };
  editTarget: { elementId: string; textNodePath: number[]; originalText: string; exampleText: string; focusCamera: Box };
  modelLabels: Record<string, string | null>;
  objectCounts: { text: number; graphics: number; connectors: number };
  transformations: string[];
};
export type SceneId = 'opening' | 'assets' | 'draft' | 'evidence' | 'targets' | 'repair' | 'editable';
export type PresentationState = {
  scene: SceneId; language: Language; selectedAsset: string; selectedOperation: number;
  comparisonMode: 'before' | 'after'; temporaryBefore: boolean;
  overlay: 'none' | 'menu' | 'case' | 'details' | 'guidance' | 'retained';
  editedText: string; inputDraft: string; editing: boolean;
  fullReference: boolean; fullDraft: boolean; issueMapOpen: boolean;
  navigation: 'forward' | 'direct' | 'back'; revision: number;
};
