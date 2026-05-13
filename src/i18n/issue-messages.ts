import type { Locale } from "@/i18n/dictionary";
import type { ValidationIssue } from "@/types/events";

const eventLabels: Record<Locale, Record<string, string>> = {
  zh: {
    quiz_started: "開始測驗",
    answer_snapshot: "答案快照",
    quiz_result: "測驗結果",
    feedback: "回饋"
  },
  en: {
    quiz_started: "quiz_started",
    answer_snapshot: "answer_snapshot",
    quiz_result: "quiz_result",
    feedback: "feedback"
  },
  ja: {
    quiz_started: "開始",
    answer_snapshot: "回答記録",
    quiz_result: "結果生成",
    feedback: "フィードバック"
  }
};

export function localizeIssueMessage(issue: ValidationIssue, locale: Locale) {
  if (locale === "en") return issue.message;

  const duplicateEvent = issue.message.match(/^(\d+) duplicate event row\(s\) detected in this quiz run$/);
  if (duplicateEvent) {
    return locale === "zh"
      ? `偵測到 ${duplicateEvent[1]} 筆重複事件列。`
      : `${duplicateEvent[1]} 件の重複イベント行が検出されました。`;
  }

  const duplicateAnswerSnapshot = issue.message.match(/^(\d+) answer_snapshot events found; expected exactly one$/);
  if (duplicateAnswerSnapshot) {
    return locale === "zh"
      ? `找到 ${duplicateAnswerSnapshot[1]} 筆答案快照事件，預期只會有 1 筆。`
      : `${duplicateAnswerSnapshot[1]} 件の回答記録イベントがあります。期待値は 1 件です。`;
  }

  const duplicateQuizResult = issue.message.match(/^(\d+) quiz_result events found; expected at most one$/);
  if (duplicateQuizResult) {
    return locale === "zh"
      ? `找到 ${duplicateQuizResult[1]} 筆測驗結果事件，預期最多 1 筆。`
      : `${duplicateQuizResult[1]} 件の結果生成イベントがあります。期待値は最大 1 件です。`;
  }

  const answerCount = issue.message.match(/^answerCount is (\d+), but payload\.answers contains (\d+)$/);
  if (answerCount) {
    return locale === "zh"
      ? `答案數欄位為 ${answerCount[1]}，但答案陣列只有 ${answerCount[2]} 筆。`
      : `回答数フィールドは ${answerCount[1]} ですが、回答配列は ${answerCount[2]} 件です。`;
  }

  const answersLength = issue.message.match(
    /^answers\.length metadata is (\d+), but payload\.answers contains (\d+)$/
  );
  if (answersLength) {
    return locale === "zh"
      ? `答案陣列長度中繼資料為 ${answersLength[1]}，但實際答案陣列只有 ${answersLength[2]} 筆。`
      : `回答配列の長さメタデータは ${answersLength[1]} ですが、実際の回答配列は ${answersLength[2]} 件です。`;
  }

  const questionnaireCount = issue.message.match(
    /^Questionnaire baseline expects (\d+) answers, but payload\.answers contains (\d+)$/
  );
  if (questionnaireCount) {
    return locale === "zh"
      ? `問卷基準預期 ${questionnaireCount[1]} 題，但答案陣列只有 ${questionnaireCount[2]} 筆。`
      : `質問票の基準は ${questionnaireCount[1]} 件ですが、回答配列は ${questionnaireCount[2]} 件です。`;
  }

  const incomplete = issue.message.match(/^Incomplete quiz run; missing (.+)$/);
  if (incomplete) {
    const missing = localizeMissingEvents(incomplete[1], locale);
    return locale === "zh" ? `測驗不完整，缺少 ${missing}。` : `クイズが不完全です。${missing} がありません。`;
  }

  const malformedJson = issue.message.match(/^Malformed JSON in (.+?): (.+)$/);
  if (malformedJson) {
    const field = localizeFieldName(malformedJson[1], locale);
    const reason = localizeJsonReason(malformedJson[2], locale);
    return locale === "zh" ? `${field} 的 JSON 格式錯誤：${reason}` : `${field} の JSON 形式エラー：${reason}`;
  }

  const invalidAxes = issue.message.match(/^Invalid axis values: (.+)$/);
  if (invalidAxes) {
    const axes = invalidAxes[1]
      .split(",")
      .map((axis) => localizeAxisName(axis.trim(), locale))
      .join(locale === "ja" ? "、" : "、");
    return locale === "zh" ? `軸向值無效：${axes}` : `軸値が無効です：${axes}`;
  }

  if (issue.message === "Missing eventType") {
    return locale === "zh" ? "缺少事件類型欄位。" : "イベント種別フィールドがありません。";
  }

  if (issue.message.startsWith("Missing quizRunId")) {
    return locale === "zh"
      ? "缺少測驗紀錄 ID；此列已放入系統產生的雜湊測驗紀錄。"
      : "クイズ実行 ID がありません。この行はシステム生成のハッシュ付きクイズ実行に分離されました。";
  }

  return issue.message;
}

function localizeMissingEvents(value: string, locale: Locale) {
  const items = value
    .split(/\s+and\s+|,\s*/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => eventLabels[locale][item] ?? item);

  if (locale === "ja") return items.join(" と ");
  return items.join(" 和 ");
}

function localizeJsonReason(reason: string, locale: Locale) {
  const expected = reason.match(/Expected ['"]?(.+?)['"]?$/);
  if (expected) {
    return locale === "zh"
      ? `JSON 解析失敗，預期出現「${expected[1]}」。`
      : `JSON 解析に失敗しました。「${expected[1]}」が必要です。`;
  }

  if (reason.toLowerCase().includes("unexpected")) {
    return locale === "zh" ? `JSON 解析失敗：${reason}` : `JSON 解析に失敗しました：${reason}`;
  }

  return reason;
}

function localizeFieldName(field: string, locale: Locale) {
  const labels: Record<Locale, Record<string, string>> = {
    zh: {
      payload: "資料內容欄位",
      rawEvent: "原始事件欄位",
      "rawEvent.payload": "原始事件中的資料內容欄位"
    },
    en: {
      payload: "payload",
      rawEvent: "rawEvent"
    },
    ja: {
      payload: "データ内容フィールド",
      rawEvent: "元イベントフィールド",
      "rawEvent.payload": "元イベント内のデータ内容フィールド"
    }
  };

  return labels[locale][field] ?? field;
}

function localizeAxisName(axis: string, locale: Locale) {
  const labels: Record<Locale, Record<string, string>> = {
    zh: {
      richnessAxis: "濃郁度",
      brothBodyAxis: "湯體厚度",
      impactAxis: "衝擊感",
      noodleBodyAxis: "麵體口感"
    },
    en: {
      richnessAxis: "richnessAxis",
      brothBodyAxis: "brothBodyAxis",
      impactAxis: "impactAxis",
      noodleBodyAxis: "noodleBodyAxis"
    },
    ja: {
      richnessAxis: "濃厚さ",
      brothBodyAxis: "スープの厚み",
      impactAxis: "インパクト",
      noodleBodyAxis: "麺の食感"
    }
  };

  return labels[locale][axis] ?? axis;
}
