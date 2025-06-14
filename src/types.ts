export interface Character {
  id: string;
  char: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  isComposing: boolean;
  element?: SVGTextElement;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PlacementResult {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  score: number;
}

export interface FontMetrics {
  unitsPerEm: number;
  ascender: number;
  descender: number;
}

export interface CompositionState {
  text: string;
  isComposing: boolean;
  characters: Character[];
}

export interface LayoutCalculationMessage {
  type: 'calculate';
  characterId: string;
  characters: Character[];
  newChar: string;
  viewportWidth: number;
  viewportHeight: number;
  fontMetrics: FontMetrics;
}

export interface LayoutResultMessage {
  type: 'result';
  characterId: string;
  placement: PlacementResult;
  characters: Character[];
}
