import { CAT_COLORS } from "./cat-design";
import type { CatId, CatPreset } from "./types";

/**
 * The cast. Add a new cat here and it becomes available to every mini-game.
 */
export const CAT_PRESETS: Record<CatId, CatPreset> = {
  Miuska: {
    id: "Miuska",
    name: "Miuska",
    displayName: "Миуска",
    description: "чёрный кот с жёлтыми глазами",
    colors: {
      fur: CAT_COLORS.fur,
      markings: null,
      eyes: "#FFD700",
      innerEar: CAT_COLORS.innerEar,
      nose: CAT_COLORS.nose,
      eyeWhite: CAT_COLORS.eyeWhite,
      pupil: CAT_COLORS.pupil,
      mouth: CAT_COLORS.mouth,
      whisker: CAT_COLORS.whisker,
    },
    scale: 1,
    width: 80,
    height: 70,
    balloonColor: "#FF6B6B",
  },
  Aliska: {
    id: "Aliska",
    name: "Aliska",
    displayName: "Алиска",
    description: "чёрно-белый кот с зелёными глазами",
    colors: {
      fur: CAT_COLORS.fur,
      markings: CAT_COLORS.markings,
      eyes: "#4CAF50",
      innerEar: CAT_COLORS.innerEar,
      nose: CAT_COLORS.nose,
      eyeWhite: CAT_COLORS.eyeWhite,
      pupil: CAT_COLORS.pupil,
      mouth: CAT_COLORS.mouth,
      whisker: CAT_COLORS.whisker,
    },
    scale: 1.2,
    width: 100,
    height: 85,
    balloonColor: "#4ECDC4",
  },
  Viki: {
    id: "Viki",
    name: "Viki",
    displayName: "Вики",
    description: "серый котёнок с коричневыми глазами",
    colors: {
      fur: "#9E9E9E",
      markings: null,
      eyes: "#8B4513",
      innerEar: CAT_COLORS.innerEar,
      nose: CAT_COLORS.nose,
      eyeWhite: CAT_COLORS.eyeWhite,
      pupil: CAT_COLORS.pupil,
      mouth: CAT_COLORS.mouth,
      whisker: CAT_COLORS.whisker,
    },
    scale: 0.75,
    width: 60,
    height: 53,
    balloonColor: "#9B59B6",
  },
  Yashka: {
    id: "Yashka",
    name: "Yashka",
    displayName: "Яшка",
    description: "чёрный котёнок с серо-голубым хвостиком",
    colors: {
      fur: CAT_COLORS.fur,
      markings: null,
      eyes: "#6EC1E4",
      innerEar: CAT_COLORS.innerEar,
      nose: CAT_COLORS.nose,
      eyeWhite: CAT_COLORS.eyeWhite,
      pupil: CAT_COLORS.pupil,
      mouth: CAT_COLORS.mouth,
      whisker: CAT_COLORS.whisker,
      // His tail is the one thing that is not black.
      tail: "#7FA0BC",
    },
    scale: 0.65,
    width: 52,
    height: 46,
    balloonColor: "#FF8C42",
  },
};

export const CAT_IDS = Object.keys(CAT_PRESETS) as CatId[];

export function getCatPreset(id: CatId): CatPreset {
  return CAT_PRESETS[id];
}

/** Russian display name, e.g. for UI copy. */
export function catName(id: CatId): string {
  return CAT_PRESETS[id].displayName;
}

/** Comma-separated Russian cast names, e.g. "Миуска, Алиска и Вики". */
export function castNames(ids: CatId[] = CAT_IDS): string {
  const names = ids.map(catName);
  if (names.length < 2) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} и ${names[names.length - 1]}`;
}
