import type { AxisKey } from "@/types/events";
import type { QuestionnaireInfluenceRow } from "@/types/analytics";

export const QUESTIONNAIRE_EXPECTED_ANSWER_COUNT = 39;

export const QUESTION_STAGE_ORDER = [
  "CORE_AXES",
  "FLAVOR_PROFILE",
  "PROTEIN_PREFERENCES",
  "NOODLE_TOPPING",
  "ALLERGENS"
] as const;

export const QUESTION_STAGE_COUNTS: Record<string, number> = {
  CORE_AXES: 4,
  FLAVOR_PROFILE: 5,
  PROTEIN_PREFERENCES: 8,
  NOODLE_TOPPING: 16,
  ALLERGENS: 6
};

export const QUESTION_AXIS_MAP: Record<string, AxisKey> = {
  axis_richness: "richnessAxis",
  axis_broth_body: "brothBodyAxis",
  axis_impact: "impactAxis",
  axis_noodle_body: "noodleBodyAxis",
  noodle_thickness: "noodleBodyAxis",
  noodle_firmness: "noodleBodyAxis",
  noodle_chewiness: "noodleBodyAxis"
};

export const QUESTIONNAIRE_INFLUENCE_ROWS: QuestionnaireInfluenceRow[] = [
  { component: "coreAxes", label: "coreAxes", weight: 43, noteKey: "directType" },
  { component: "flavorProfile", label: "flavorProfile", weight: 18, noteKey: "flavorMatch" },
  { component: "noodle", label: "noodle", weight: 15, noteKey: "noodleTexture" },
  { component: "proteinPreference", label: "proteinPreference", weight: 12, noteKey: "proteinMatch" },
  { component: "topping", label: "topping", weight: 7, noteKey: "toppingMatch" },
  { component: "archetypeAlignment", label: "archetypeAlignment", weight: 5, noteKey: "alignment" },
  { component: "allergenGate", label: "allergenGate", weight: 0, noteKey: "allergenGate" }
];

export const KNOWN_QUESTION_LABELS: Record<
  string,
  {
    zh: string;
    en: string;
    ja: string;
    left?: { zh: string; en: string; ja: string };
    right?: { zh: string; en: string; ja: string };
  }
> = {
  axis_richness: {
    zh: "你想吃清爽還是濃厚？",
    en: "Light or rich?",
    ja: "あっさり系か濃厚系か？",
    left: { zh: "清爽", en: "Light", ja: "あっさり" },
    right: { zh: "濃厚", en: "Rich", ja: "濃厚" }
  },
  axis_broth_body: {
    zh: "你想要清湯還是白湯？",
    en: "Clear broth or cloudy broth?",
    ja: "清湯か白湯か？",
    left: { zh: "清湯", en: "Clear", ja: "清湯" },
    right: { zh: "白湯", en: "Cloudy", ja: "白湯" }
  },
  axis_impact: {
    zh: "你想要溫和還是重口？",
    en: "Gentle or punchy?",
    ja: "やさしい味かパンチのある味か？",
    left: { zh: "溫和", en: "Gentle", ja: "やさしい" },
    right: { zh: "重口", en: "Punchy", ja: "濃い味" }
  },
  axis_noodle_body: {
    zh: "你想要細滑還是粗嚼？",
    en: "Silky-thin or chewy-thick noodles?",
    ja: "細くなめらかか、太く噛みごたえか？",
    left: { zh: "細滑", en: "Silky", ja: "細滑" },
    right: { zh: "粗嚼", en: "Chewy", ja: "太め" }
  },
  flavor_meat_vs_sea: {
    zh: "你比較偏肉香還是海味？",
    en: "Meaty aroma or seafood umami?",
    ja: "肉の香りか魚介の旨味か？",
    left: { zh: "肉香", en: "Meaty", ja: "肉香" },
    right: { zh: "海味", en: "Seafood", ja: "魚介" }
  },
  flavor_fermented: {
    zh: "你想要味噌或發酵香嗎？",
    en: "Do you want miso or fermented aroma?",
    ja: "味噌や発酵香が欲しいですか？",
    left: { zh: "不太要", en: "Not much", ja: "控えめ" },
    right: { zh: "很想要", en: "Strongly want", ja: "欲しい" }
  },
  flavor_citrus: {
    zh: "你喜歡清香、柑橘、轉味感嗎？",
    en: "Do you like fresh, citrusy flavor shifts?",
    ja: "清香、柑橘、味変感は好きですか？",
    left: { zh: "不太要", en: "Not much", ja: "控えめ" },
    right: { zh: "很想要", en: "Strongly want", ja: "欲しい" }
  },
  flavor_spice: {
    zh: "你接受香料感嗎？",
    en: "Are you open to spice aroma?",
    ja: "スパイス感は受け入れられますか？",
    left: { zh: "不太要", en: "Not much", ja: "控えめ" },
    right: { zh: "很可以", en: "Very open", ja: "かなり好き" }
  },
  flavor_fatty_sweet: {
    zh: "你喜歡肉脂甜香感嗎？",
    en: "Do you like fatty-sweet richness?",
    ja: "肉脂の甘い香りは好きですか？",
    left: { zh: "乾淨俐落", en: "Clean", ja: "すっきり" },
    right: { zh: "越濃越香", en: "Richer is better", ja: "濃いほど良い" }
  },
  protein_pork: { zh: "你對豬系接受度如何？", en: "How open are you to pork-based ramen?", ja: "豚系への許容度は？" },
  protein_chicken: { zh: "你對雞系接受度如何？", en: "How open are you to chicken-based ramen?", ja: "鶏系への許容度は？" },
  protein_beef: { zh: "你對牛香接受度如何？", en: "How open are you to beef aroma?", ja: "牛の香りへの許容度は？" },
  protein_duck: { zh: "你對鴨香接受度如何？", en: "How open are you to duck aroma?", ja: "鴨の香りへの許容度は？" },
  protein_shrimp: { zh: "你對蝦鮮接受度如何？", en: "How open are you to shrimp umami?", ja: "海老の旨味への許容度は？" },
  protein_shellfish: { zh: "你對貝鮮接受度如何？", en: "How open are you to shellfish umami?", ja: "貝の旨味への許容度は？" },
  protein_fish: { zh: "你對魚介感接受度如何？", en: "How open are you to fish-forward ramen?", ja: "魚介感への許容度は？" },
  protein_miso: { zh: "你對味噌／發酵系接受度如何？", en: "How open are you to miso or fermented styles?", ja: "味噌・発酵系への許容度は？" },
  noodle_thickness: {
    zh: "你喜歡細麵還是粗麵？",
    en: "Thin noodles or thick noodles?",
    ja: "細麺か太麺か？",
    left: { zh: "細麵", en: "Thin", ja: "細麺" },
    right: { zh: "粗麵", en: "Thick", ja: "太麺" }
  },
  noodle_firmness: {
    zh: "你喜歡偏軟還是偏硬？",
    en: "Soft or firm noodles?",
    ja: "柔らかめか硬めか？",
    left: { zh: "偏軟", en: "Soft", ja: "柔らかめ" },
    right: { zh: "偏硬", en: "Firm", ja: "硬め" }
  },
  noodle_chewiness: {
    zh: "你喜歡滑順還是更有嚼勁？",
    en: "Smooth or chewy noodles?",
    ja: "なめらかか、噛みごたえか？",
    left: { zh: "滑順", en: "Smooth", ja: "なめらか" },
    right: { zh: "有嚼勁", en: "Chewy", ja: "噛みごたえ" }
  },
  noodle_curl: {
    zh: "你喜歡比較直還是比較捲？",
    en: "Straight or curly noodles?",
    ja: "ストレート麺か縮れ麺か？",
    left: { zh: "比較直", en: "Straight", ja: "ストレート" },
    right: { zh: "比較捲", en: "Curly", ja: "縮れ" }
  },
  topping_chashu: { zh: "你想要叉燒多明顯？", en: "How much chashu presence do you want?", ja: "チャーシューの存在感はどれくらい欲しいですか？" },
  topping_beef: { zh: "你想要牛肉配料多明顯？", en: "How much beef topping presence do you want?", ja: "牛肉トッピングの存在感はどれくらい欲しいですか？" },
  topping_egg: { zh: "你想要蛋嗎？", en: "Do you want egg?", ja: "卵は欲しいですか？" },
  topping_nori: { zh: "你想要海苔嗎？", en: "Do you want nori?", ja: "海苔は欲しいですか？" },
  topping_spinach: { zh: "你想要菠菜嗎？", en: "Do you want spinach?", ja: "ほうれん草は欲しいですか？" },
  topping_menma: { zh: "你想要筍乾嗎？", en: "Do you want menma?", ja: "メンマは欲しいですか？" },
  topping_veg_pile: { zh: "你想要很多菜嗎？", en: "Do you want a pile of vegetables?", ja: "野菜多めが欲しいですか？" },
  topping_corn: { zh: "你想要玉米嗎？", en: "Do you want corn?", ja: "コーンは欲しいですか？" },
  topping_butter: { zh: "你想要奶油嗎？", en: "Do you want butter?", ja: "バターは欲しいですか？" },
  topping_garlic: { zh: "你想要蒜嗎？", en: "Do you want garlic?", ja: "ニンニクは欲しいですか？" },
  topping_backfat: { zh: "你想要背脂／油脂感嗎？", en: "Do you want backfat or oily richness?", ja: "背脂や油脂感は欲しいですか？" },
  topping_seafood: { zh: "你想要海鮮料嗎？", en: "Do you want seafood toppings?", ja: "海鮮トッピングは欲しいですか？" },
  crustacean: { zh: "甲殼類（蝦、蟹）", en: "Crustaceans (shrimp, crab)", ja: "甲殻類（えび、かに）" },
  shellfish: { zh: "貝類", en: "Shellfish", ja: "貝類" },
  egg: { zh: "蛋", en: "Egg", ja: "卵" },
  milk: { zh: "乳製品", en: "Dairy", ja: "乳製品" },
  beef: { zh: "牛肉", en: "Beef", ja: "牛肉" },
  pork: { zh: "豬肉", en: "Pork", ja: "豚肉" }
};

export function localizeQuestionLabel(questionId: string, fallback: string, locale: "zh" | "en" | "ja") {
  const knownLabel = KNOWN_QUESTION_LABELS[questionId]?.[locale];
  if (knownLabel) return knownLabel;

  const loadTestLabel = localizeLoadTestQuestion(questionId, fallback, locale);
  if (loadTestLabel) return loadTestLabel;

  return fallback;
}

export function localizeChoiceLabel(
  questionId: string,
  side: "left" | "right",
  fallback: string,
  locale: "zh" | "en" | "ja"
) {
  const knownLabel = KNOWN_QUESTION_LABELS[questionId]?.[side]?.[locale];
  if (knownLabel) return knownLabel;

  const normalized = fallback.trim().toLowerCase();
  if (normalized === "left") {
    return locale === "zh" ? "左側" : locale === "ja" ? "左側" : "Left";
  }
  if (normalized === "right") {
    return locale === "zh" ? "右側" : locale === "ja" ? "右側" : "Right";
  }

  return fallback;
}

function localizeLoadTestQuestion(questionId: string, fallback: string, locale: "zh" | "en" | "ja") {
  const fromId = questionId.match(/^loadtest_(.+)_(\d+)$/);
  const fromLabel = fallback.match(/^Load test ([A-Z_]+) (\d+)$/);
  const rawStage = fromId?.[1] ?? fromLabel?.[1]?.toLowerCase();
  const questionNumber = fromId?.[2] ?? fromLabel?.[2];
  if (!rawStage || !questionNumber) return null;

  const stage = rawStage.toUpperCase();
  const stageLabel = LOAD_TEST_STAGE_LABELS[locale][stage] ?? stage;
  if (locale === "zh") return `壓力測試：${stageLabel}第 ${questionNumber} 題`;
  if (locale === "ja") return `負荷テスト：${stageLabel} ${questionNumber} 問目`;
  return `Load test: ${stageLabel} Q${questionNumber}`;
}

const LOAD_TEST_STAGE_LABELS: Record<"zh" | "en" | "ja", Record<string, string>> = {
  zh: {
    CORE_AXES: "主型四軸",
    FLAVOR_PROFILE: "風味傾向",
    PROTEIN_PREFERENCES: "素材接受度",
    NOODLE_TOPPING: "麵與配料",
    ALLERGENS: "過敏與排除"
  },
  en: {
    CORE_AXES: "Core axes",
    FLAVOR_PROFILE: "Flavor profile",
    PROTEIN_PREFERENCES: "Ingredient acceptance",
    NOODLE_TOPPING: "Noodles and toppings",
    ALLERGENS: "Allergens and exclusions"
  },
  ja: {
    CORE_AXES: "主軸",
    FLAVOR_PROFILE: "味の傾向",
    PROTEIN_PREFERENCES: "素材の許容度",
    NOODLE_TOPPING: "麺とトッピング",
    ALLERGENS: "アレルゲンと除外"
  }
};
