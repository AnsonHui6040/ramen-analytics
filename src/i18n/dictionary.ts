import type { IssueCategory, IssueSeverity } from "@/types/events";

export const LOCALES = ["zh", "en", "ja"] as const;
export type Locale = (typeof LOCALES)[number];

export const localeNames: Record<Locale, string> = {
  zh: "中文",
  en: "English",
  ja: "日本語"
};

export function isLocale(value: string | null): value is Locale {
  return value === "zh" || value === "en" || value === "ja";
}

export const dictionaries = {
  zh: {
    app: {
      eyebrow: "ramen-style-finder CSV 分析",
      title: "拉麵分析儀表板",
      subtitle: "本機解析測驗事件 CSV，聚焦比例、分布、完成率、答案模式與回饋品質。",
      darkMode: "切換深色模式",
      filteredCsv: "匯出篩選 CSV",
      summaryJson: "匯出摘要 JSON",
      reset: "重設"
    },
    upload: {
      title: "上傳測驗事件 CSV",
      description: "支援多個 CSV 檔案，本機瀏覽器解析，不會自動上傳到任何伺服器。",
      chooseCsv: "選擇 CSV",
      demoMode: "示範模式",
      privacyTitle: "隱私預設",
      privacyItems: [
        "ID 只顯示雜湊值，不顯示原始 sessionId 或 quizRunId。",
        "壓力測試資料預設不納入有效統計。",
        "回饋留言預設隱藏，需要確認後才重新解析顯示。"
      ],
      progressPreparing: "準備背景解析",
      progressReady: "分析完成",
      parsingFile: (fileName: string) => `正在解析 ${fileName}`,
      parsedRows: (rows: string, fileName: string) => `已從 ${fileName} 解析 ${rows} 筆資料`,
      finishedFile: (fileName: string) => `${fileName} 解析完成`,
      invalidFileType: "請選擇 CSV 檔案"
    },
    loaded: {
      summary: (files: number, events: string, runs: string) =>
        `已載入 ${files} 個檔案、${events} 筆事件列、${runs} 個測驗紀錄。`,
      exposeComments: "顯示回饋留言",
      exposeConfirm: "顯示原始回饋留言可能包含個資或敏感內容。確定要重新解析並顯示留言？",
      loadTestOnly: "目前載入的資料全部是壓力測試資料；有效統計會維持排除狀態。若要檢視測試分布，請把「有效性」篩選切到「壓力測試」。"
    },
    filters: {
      type: "類型",
      appVersion: "應用版本",
      source: "來源",
      validity: "有效性",
      feedback: "回饋",
      from: "起始日期",
      to: "結束日期",
      allTypes: "全部類型",
      allVersions: "全部版本",
      allSources: "全部來源",
      allRuns: "全部測驗紀錄",
      valid: "有效",
      invalid: "無效",
      loadTest: "壓力測試",
      allFeedback: "全部回饋",
      hasFeedback: "有回饋",
      noFeedback: "無回饋",
      reset: "重設篩選"
    },
    kpi: {
      totalQuizRuns: "總測驗紀錄",
      validCompletedRuns: "有效完成",
      excludedLoadTestRuns: "排除壓力測試",
      completionRate: "完成率",
      feedbackRate: "回饋率",
      averageRating: "平均評分",
      malformedRows: "格式錯誤列",
      duplicateEventCounts: "重複事件"
    },
    charts: {
      exportPng: (title: string) => `匯出 ${title} PNG`,
      noData: "目前篩選條件沒有圖表資料",
      pngExportFailed: "PNG 匯出失敗",
      typeDistribution: {
        title: "類型分布",
        description: "依有效完成測驗統計類型代碼與類型名稱比例"
      },
      axisAnalysis: {
        title: "軸向分析",
        description: "濃郁度、湯體厚度、衝擊感、麵體口感各自列出完整 16 型由高至低排行",
        overall: "整體"
      },
      completionFunnel: {
        title: "完成漏斗",
        description: "從開始測驗、答案快照、產生結果到有效完成的事件流"
      },
      questionDirection: {
        title: "題目方向分布",
        description: "各題在左側、右側、中立、已勾選與未勾選方向上的比例",
        question: "題目",
        share: "比例"
      },
      questionnaireInfluence: {
        title: "問卷影響模型",
        description: "依 ramen-style-finder scoring 權重解讀各題組對結果的影響",
        weight: "權重",
        notes: {
          directType: "主型四軸，直接影響 typeCode",
          flavorMatch: "風味輪廓，用於推薦相似度",
          proteinMatch: "素材接受度，用於推薦相似度",
          noodleTexture: "麵體口感，影響四軸與推薦",
          toppingMatch: "配料偏好，用於推薦相似度",
          alignment: "結果四軸與原型對齊度",
          allergenGate: "過敏原是排除/警示條件，不是偏好加分"
        }
      },
      feedbackRating: {
        title: "回饋評分分布",
        description: "評分直方圖與平均分",
        average: "平均評分"
      },
      flavorTags: {
        title: "風味標籤分析",
        description: "測驗結果中的熱門風味標籤"
      },
      allergens: {
        title: "過敏原警示分析",
        description: "有效完成測驗中的過敏原警示出現頻率"
      },
      preferenceHighlights: {
        title: "風味與配料偏好",
        description: "把風味、素材、配料與過敏原拆成單項百分比，方便快速判斷偏好"
      },
      versionAnalysis: {
        title: "版本分析",
        description: "依應用版本比較完成率、回饋率與平均評分"
      },
      directionLabels: {
        left: "偏左側",
        right: "偏右側",
        neutral: "中立",
        selected: "已勾選",
        not_selected: "未勾選",
        unknown: "未知"
      },
      versionSeries: {
        completionRate: "完成率",
        feedbackRate: "回饋率",
        averageRating: "平均評分"
      }
    },
    stageLabels: {
      CORE_AXES: "主型四軸",
      FLAVOR_PROFILE: "風味傾向",
      PROTEIN_PREFERENCES: "素材接受度",
      NOODLE_TOPPING: "麵與配料",
      ALLERGENS: "過敏與排除",
      UNKNOWN: "未知題組"
    },
    influenceComponents: {
      coreAxes: "主型四軸",
      flavorProfile: "風味傾向",
      proteinPreference: "素材接受度",
      noodle: "麵體偏好",
      topping: "配料偏好",
      archetypeAlignment: "主型對齊",
      allergenGate: "過敏原排除"
    },
    preferenceCategories: {
      flavor: "風味",
      protein: "素材",
      topping: "配料",
      allergen: "過敏原"
    },
    funnelStages: {
      quiz_started: "開始測驗",
      answer_snapshot: "答案快照",
      quiz_result: "產生結果",
      feedback: "送出回饋",
      valid_completed: "有效完成",
      structurally_completed: "結構完整"
    },
    axes: {
      richnessAxis: "濃郁度",
      brothBodyAxis: "湯體厚度",
      impactAxis: "衝擊感",
      noodleBodyAxis: "麵體口感"
    },
    validation: {
      title: "驗證面板",
      description: "JSON 格式錯誤、重複事件、不完整測驗與資料結構一致性檢查",
      issues: "項問題",
      noIssues: "目前篩選條件沒有驗證問題"
    },
    tables: {
      title: "資料表",
      description: "可搜尋的測驗紀錄、答案、回饋與驗證問題資料表",
      search: "搜尋資料表",
      runs: "測驗紀錄",
      answers: "答案",
      feedback: "回饋",
      issues: "驗證問題",
      noRows: "沒有資料",
      limit: (shown: string, total: string) => `為了瀏覽器效能，只顯示前 ${shown} 筆，共 ${total} 筆。`,
      headers: {
        runHash: "測驗雜湊",
        status: "狀態",
        type: "類型",
        version: "版本",
        source: "來源",
        feedback: "回饋",
        rating: "評分",
        events: "事件數",
        answers: "答案數",
        stage: "題組",
        question: "題目",
        leftLabel: "左側標籤",
        rightLabel: "右側標籤",
        direction: "方向",
        selected: "選取",
        axis: "軸向",
        value: "數值",
        comment: "留言",
        length: "長度",
        timestamp: "時間",
        severity: "嚴重度",
        category: "分類",
        row: "列",
        message: "訊息"
      }
    },
    values: {
      yes: "是",
      no: "否",
      hidden: "[已隱藏]",
      valid: "有效",
      invalid: "無效",
      loadTest: "壓力測試",
      unknown: "未知",
      left: "偏左側",
      right: "偏右側",
      neutral: "中立",
      selected: "已勾選",
      not_selected: "未勾選",
      sourceLabels: {
        production: "正式資料",
        "ramen-style-finder-load-test": "壓力測試",
        "load-test": "壓力測試"
      }
    },
    demo: {
      title: "示範預覽",
      description:
        "點示範模式會載入合成範例 CSV，包含有效完成測驗、壓力測試排除、重複答案快照、不完整測驗與 JSON 格式錯誤範例。",
      tiles: ["16 型百分比分布", "四軸 16 型排行", "完成漏斗", "驗證問題"],
      cards: [
        ["10 萬筆以上", "背景解析與記憶化儀表板轉換"],
        ["隱私", "無後端、ID 雜湊、留言預設隱藏"],
        ["匯出", "篩選 CSV、摘要 JSON、圖表 PNG 截圖"],
        ["驗證", "JSON 格式錯誤、重複資料、答案數不一致與不完整測驗"]
      ]
    }
  },
  en: {
    app: {
      eyebrow: "ramen-style-finder CSV analytics",
      title: "Ramen Analytics",
      subtitle: "Parse quiz event CSV locally and inspect proportions, distributions, completion rates, answer patterns, and feedback quality.",
      darkMode: "Toggle dark mode",
      filteredCsv: "Filtered CSV",
      summaryJson: "Summary JSON",
      reset: "Reset"
    },
    upload: {
      title: "Upload quiz event CSV",
      description: "Supports multiple CSV files. Parsing runs locally in your browser and is not uploaded automatically.",
      chooseCsv: "Choose CSV",
      demoMode: "Demo mode",
      privacyTitle: "Privacy defaults",
      privacyItems: [
        "IDs are hashed; raw sessionId and quizRunId are not displayed.",
        "Load-test runs are excluded from valid stats by default.",
        "Feedback comments stay hidden unless you confirm and re-parse."
      ],
      progressPreparing: "Preparing parser worker",
      progressReady: "Analytics ready",
      parsingFile: (fileName: string) => `Parsing ${fileName}`,
      parsedRows: (rows: string, fileName: string) => `Parsed ${rows} rows from ${fileName}`,
      finishedFile: (fileName: string) => `Finished ${fileName}`,
      invalidFileType: "Choose CSV files"
    },
    loaded: {
      summary: (files: number, events: string, runs: string) =>
        `Loaded ${files} file(s), ${events} event rows, ${runs} hashed quiz runs.`,
      exposeComments: "Show feedback comments",
      exposeConfirm: "Raw feedback comments may contain personal or sensitive information. Re-parse and show comments?",
      loadTestOnly: "All loaded rows are load-test data. Valid stats still exclude them. To inspect test distributions, set Validity to Load-test."
    },
    filters: {
      type: "Type",
      appVersion: "App version",
      source: "Source",
      validity: "Validity",
      feedback: "Feedback",
      from: "From",
      to: "To",
      allTypes: "All types",
      allVersions: "All versions",
      allSources: "All sources",
      allRuns: "All runs",
      valid: "Valid",
      invalid: "Invalid",
      loadTest: "Load-test",
      allFeedback: "All feedback",
      hasFeedback: "Has feedback",
      noFeedback: "No feedback",
      reset: "Reset filters"
    },
    kpi: {
      totalQuizRuns: "Total quiz runs",
      validCompletedRuns: "Valid completed",
      excludedLoadTestRuns: "Excluded load-test",
      completionRate: "Completion rate",
      feedbackRate: "Feedback rate",
      averageRating: "Average rating",
      malformedRows: "Malformed rows",
      duplicateEventCounts: "Duplicate events"
    },
    charts: {
      exportPng: (title: string) => `Export ${title} as PNG`,
      noData: "No chart data for current filters",
      pngExportFailed: "PNG export failed",
      typeDistribution: {
        title: "Type Distribution",
        description: "typeCode / typeName proportions"
      },
      axisAnalysis: {
        title: "Axis Analysis",
        description: "full 16-type ranking for richness, broth body, impact, and noodle texture",
        overall: "overall"
      },
      completionFunnel: {
        title: "Completion Funnel",
        description: "quiz_started to valid_completed"
      },
      questionDirection: {
        title: "Question Direction Distribution",
        description: "left / right / neutral / selected / not_selected by question",
        question: "Question",
        share: "share"
      },
      questionnaireInfluence: {
        title: "Questionnaire Influence Model",
        description: "How ramen-style-finder scoring weights each question group",
        weight: "Weight",
        notes: {
          directType: "Core axes directly shape the typeCode",
          flavorMatch: "Flavor profile contributes to recommendation similarity",
          proteinMatch: "Ingredient acceptance contributes to recommendation similarity",
          noodleTexture: "Noodle texture affects axes and recommendation matching",
          toppingMatch: "Topping preferences contribute to recommendation similarity",
          alignment: "Alignment between result axes and ramen prototypes",
          allergenGate: "Allergens are exclusion/warning gates, not preference boosts"
        }
      },
      feedbackRating: {
        title: "Feedback Rating Distribution",
        description: "rating histogram and average",
        average: "Average rating"
      },
      flavorTags: {
        title: "Flavor Tag Analysis",
        description: "top flavor tags from quiz_result payload"
      },
      allergens: {
        title: "Allergen Warning Analysis",
        description: "warning frequency by valid completed run"
      },
      preferenceHighlights: {
        title: "Flavor and Topping Preferences",
        description: "single-item percentages for flavor, ingredient, topping, and allergen signals"
      },
      versionAnalysis: {
        title: "Version Analysis",
        description: "completion rate, feedback rate, average rating by appVersion"
      },
      directionLabels: {
        left: "Left",
        right: "Right",
        neutral: "Neutral",
        selected: "Selected",
        not_selected: "Not selected",
        unknown: "Unknown"
      },
      versionSeries: {
        completionRate: "Completion rate",
        feedbackRate: "Feedback rate",
        averageRating: "Average rating"
      }
    },
    stageLabels: {
      CORE_AXES: "Core axes",
      FLAVOR_PROFILE: "Flavor profile",
      PROTEIN_PREFERENCES: "Ingredient acceptance",
      NOODLE_TOPPING: "Noodles and toppings",
      ALLERGENS: "Allergens and exclusions",
      UNKNOWN: "Unknown stage"
    },
    influenceComponents: {
      coreAxes: "Core axes",
      flavorProfile: "Flavor profile",
      proteinPreference: "Ingredient acceptance",
      noodle: "Noodle preferences",
      topping: "Topping preferences",
      archetypeAlignment: "Type alignment",
      allergenGate: "Allergen gate"
    },
    preferenceCategories: {
      flavor: "Flavor",
      protein: "Ingredient",
      topping: "Topping",
      allergen: "Allergen"
    },
    funnelStages: {
      quiz_started: "quiz_started",
      answer_snapshot: "answer_snapshot",
      quiz_result: "quiz_result",
      feedback: "feedback",
      valid_completed: "valid_completed",
      structurally_completed: "structurally completed"
    },
    axes: {
      richnessAxis: "richness",
      brothBodyAxis: "broth body",
      impactAxis: "impact",
      noodleBodyAxis: "noodle body"
    },
    validation: {
      title: "Validation Panel",
      description: "malformed rows, duplicate events, incomplete runs, and schema consistency checks",
      issues: "issues",
      noIssues: "No validation issues for current filters"
    },
    tables: {
      title: "Data Tables",
      description: "searchable hashed run, answer, feedback, and validation tables",
      search: "Search tables",
      runs: "Quiz runs",
      answers: "Answers",
      feedback: "Feedback",
      issues: "Issues",
      noRows: "No rows",
      limit: (shown: string, total: string) =>
        `Showing first ${shown} rows of ${total} for browser performance.`,
      headers: {
        runHash: "Run hash",
        status: "Status",
        type: "Type",
        version: "Version",
        source: "Source",
        feedback: "Feedback",
        rating: "Rating",
        events: "Events",
        answers: "Answers",
        stage: "Stage",
        question: "Question",
        leftLabel: "Left label",
        rightLabel: "Right label",
        direction: "Direction",
        selected: "Selected",
        axis: "Axis",
        value: "Value",
        comment: "Comment",
        length: "Length",
        timestamp: "Timestamp",
        severity: "Severity",
        category: "Category",
        row: "Row",
        message: "Message"
      }
    },
    values: {
      yes: "yes",
      no: "no",
      hidden: "[hidden]",
      valid: "valid",
      invalid: "invalid",
      loadTest: "load-test",
      unknown: "unknown",
      left: "left",
      right: "right",
      neutral: "neutral",
      selected: "selected",
      not_selected: "not selected",
      sourceLabels: {
        production: "production",
        "ramen-style-finder-load-test": "load-test",
        "load-test": "load-test"
      }
    },
    demo: {
      title: "Demo preview",
      description:
        "Demo mode loads a synthetic sample CSV with valid runs, load-test exclusion, duplicate answer_snapshot, incomplete run, and malformed JSON examples.",
      tiles: ["16-type distribution", "4-axis rankings", "Completion funnel", "Validation issues"],
      cards: [
        ["100k+ rows", "Worker parsing and memoized dashboard transforms"],
        ["Privacy", "No backend, hashed IDs, hidden comments by default"],
        ["Exports", "Filtered CSV, summary JSON, PNG chart screenshots"],
        ["Validation", "Malformed JSON, duplicates, answer mismatches, incomplete runs"]
      ]
    }
  },
  ja: {
    app: {
      eyebrow: "ramen-style-finder CSV 分析",
      title: "ラーメン分析ダッシュボード",
      subtitle: "クイズイベント CSV をブラウザ内で解析し、比率、分布、完了率、回答傾向、フィードバック品質を確認できます。",
      darkMode: "ダークモード切り替え",
      filteredCsv: "絞り込み CSV",
      summaryJson: "サマリー JSON",
      reset: "リセット"
    },
    upload: {
      title: "クイズイベント CSV をアップロード",
      description: "複数の CSV ファイルに対応。解析はブラウザ内で行われ、自動アップロードはありません。",
      chooseCsv: "CSV を選択",
      demoMode: "デモモード",
      privacyTitle: "プライバシー設定",
      privacyItems: [
        "ID はハッシュのみ表示し、元の sessionId / quizRunId は表示しません。",
        "負荷テストデータは有効統計から既定で除外します。",
        "フィードバックコメントは既定で非表示です。表示時は確認後に再解析します。"
      ],
      progressPreparing: "バックグラウンド解析を準備中",
      progressReady: "分析完了",
      parsingFile: (fileName: string) => `${fileName} を解析中`,
      parsedRows: (rows: string, fileName: string) => `${fileName} から ${rows} 行を解析しました`,
      finishedFile: (fileName: string) => `${fileName} の解析が完了しました`,
      invalidFileType: "CSV ファイルを選択してください"
    },
    loaded: {
      summary: (files: number, events: string, runs: string) =>
        `${files} ファイル、${events} 件のイベント行、${runs} 件のクイズ実行を読み込みました。`,
      exposeComments: "フィードバックコメントを表示",
      exposeConfirm:
        "生のフィードバックコメントには個人情報や機密情報が含まれる可能性があります。再解析してコメントを表示しますか？",
      loadTestOnly: "読み込まれたデータはすべて負荷テストです。有効統計では除外されたままです。テスト分布を見るには「有効性」を「負荷テスト」に切り替えてください。"
    },
    filters: {
      type: "タイプ",
      appVersion: "アプリバージョン",
      source: "ソース",
      validity: "有効性",
      feedback: "フィードバック",
      from: "開始日",
      to: "終了日",
      allTypes: "すべてのタイプ",
      allVersions: "すべてのバージョン",
      allSources: "すべてのソース",
      allRuns: "すべてのクイズ実行",
      valid: "有効",
      invalid: "無効",
      loadTest: "負荷テスト",
      allFeedback: "すべてのフィードバック",
      hasFeedback: "フィードバックあり",
      noFeedback: "フィードバックなし",
      reset: "フィルターをリセット"
    },
    kpi: {
      totalQuizRuns: "総クイズ実行数",
      validCompletedRuns: "有効完了",
      excludedLoadTestRuns: "除外した負荷テスト",
      completionRate: "完了率",
      feedbackRate: "回答率",
      averageRating: "平均評価",
      malformedRows: "不正な行",
      duplicateEventCounts: "重複イベント"
    },
    charts: {
      exportPng: (title: string) => `${title} を PNG で出力`,
      noData: "現在のフィルターに該当するグラフデータがありません",
      pngExportFailed: "PNG 出力に失敗しました",
      typeDistribution: {
        title: "タイプ分布",
        description: "有効完了したクイズのタイプコードとタイプ名の比率"
      },
      axisAnalysis: {
        title: "軸分析",
        description: "濃厚度、スープの厚み、インパクト、麺の食感を16タイプで高い順に表示",
        overall: "全体"
      },
      completionFunnel: {
        title: "完了ファネル",
        description: "開始、回答記録、結果生成、フィードバック、有効完了までの流れ"
      },
      questionDirection: {
        title: "質問方向分布",
        description: "質問ごとの左寄り、右寄り、中立、選択、未選択の比率",
        question: "質問",
        share: "割合"
      },
      questionnaireInfluence: {
        title: "質問票の影響モデル",
        description: "ramen-style-finder の採点で各質問グループが結果に与える重み",
        weight: "重み",
        notes: {
          directType: "主軸は typeCode に直接影響します",
          flavorMatch: "味の傾向は推薦の類似度に影響します",
          proteinMatch: "素材の許容度は推薦の類似度に影響します",
          noodleTexture: "麺の食感は軸と推薦に影響します",
          toppingMatch: "トッピング嗜好は推薦の類似度に影響します",
          alignment: "結果軸とラーメン原型の一致度です",
          allergenGate: "アレルゲンは除外/警告条件で、好みの加点ではありません"
        }
      },
      feedbackRating: {
        title: "フィードバック評価分布",
        description: "評価ヒストグラムと平均",
        average: "平均評価"
      },
      flavorTags: {
        title: "味タグ分析",
        description: "クイズ結果に含まれる上位の味タグ"
      },
      allergens: {
        title: "アレルゲン警告分析",
        description: "有効完了したクイズでのアレルゲン警告の頻度"
      },
      preferenceHighlights: {
        title: "味とトッピングの嗜好",
        description: "味、素材、トッピング、アレルゲンを単項目の割合で表示します"
      },
      versionAnalysis: {
        title: "バージョン分析",
        description: "アプリバージョンごとの完了率、回答率、平均評価"
      },
      directionLabels: {
        left: "左寄り",
        right: "右寄り",
        neutral: "中立",
        selected: "選択",
        not_selected: "未選択",
        unknown: "不明"
      },
      versionSeries: {
        completionRate: "完了率",
        feedbackRate: "回答率",
        averageRating: "平均評価"
      }
    },
    stageLabels: {
      CORE_AXES: "主軸",
      FLAVOR_PROFILE: "味の傾向",
      PROTEIN_PREFERENCES: "素材の許容度",
      NOODLE_TOPPING: "麺とトッピング",
      ALLERGENS: "アレルゲンと除外",
      UNKNOWN: "不明な段階"
    },
    influenceComponents: {
      coreAxes: "主軸",
      flavorProfile: "味の傾向",
      proteinPreference: "素材の許容度",
      noodle: "麺の好み",
      topping: "トッピングの好み",
      archetypeAlignment: "タイプ一致度",
      allergenGate: "アレルゲン除外"
    },
    preferenceCategories: {
      flavor: "味",
      protein: "素材",
      topping: "トッピング",
      allergen: "アレルゲン"
    },
    funnelStages: {
      quiz_started: "開始",
      answer_snapshot: "回答記録",
      quiz_result: "結果生成",
      feedback: "フィードバック",
      valid_completed: "有効完了",
      structurally_completed: "構造上完了"
    },
    axes: {
      richnessAxis: "濃厚さ",
      brothBodyAxis: "スープの厚み",
      impactAxis: "インパクト",
      noodleBodyAxis: "麺の食感"
    },
    validation: {
      title: "検証パネル",
      description: "JSON 形式エラー、重複イベント、不完全なクイズ、データ構造の整合性チェック",
      issues: "件の問題",
      noIssues: "現在のフィルターに検証問題はありません"
    },
    tables: {
      title: "データテーブル",
      description: "クイズ実行、回答、フィードバック、検証問題を検索できます",
      search: "テーブルを検索",
      runs: "クイズ実行",
      answers: "回答",
      feedback: "フィードバック",
      issues: "検証問題",
      noRows: "データなし",
      limit: (shown: string, total: string) =>
        `ブラウザ性能のため、${total} 件中 ${shown} 件のみ表示しています。`,
      headers: {
        runHash: "実行ハッシュ",
        status: "状態",
        type: "タイプ",
        version: "バージョン",
        source: "ソース",
        feedback: "フィードバック",
        rating: "評価",
        events: "イベント数",
        answers: "回答数",
        stage: "段階",
        question: "質問",
        leftLabel: "左ラベル",
        rightLabel: "右ラベル",
        direction: "方向",
        selected: "選択",
        axis: "軸",
        value: "値",
        comment: "コメント",
        length: "長さ",
        timestamp: "時刻",
        severity: "重要度",
        category: "分類",
        row: "行",
        message: "メッセージ"
      }
    },
    values: {
      yes: "はい",
      no: "いいえ",
      hidden: "[非表示]",
      valid: "有効",
      invalid: "無効",
      loadTest: "負荷テスト",
      unknown: "不明",
      left: "左寄り",
      right: "右寄り",
      neutral: "中立",
      selected: "選択",
      not_selected: "未選択",
      sourceLabels: {
        production: "本番データ",
        "ramen-style-finder-load-test": "負荷テスト",
        "load-test": "負荷テスト"
      }
    },
    demo: {
      title: "デモプレビュー",
      description:
        "デモモードでは、有効完了クイズ、負荷テスト除外、重複回答記録、不完全なクイズ、JSON 形式エラーを含む合成サンプル CSV を読み込みます。",
      tiles: ["16タイプ分布", "4軸ランキング", "完了ファネル", "検証問題"],
      cards: [
        ["10 万行以上", "バックグラウンド解析とメモ化されたダッシュボード変換"],
        ["プライバシー", "バックエンドなし、ID はハッシュ化、コメントは既定で非表示"],
        ["エクスポート", "絞り込み CSV、サマリー JSON、グラフ PNG"],
        ["検証", "JSON 形式エラー、重複、回答数不一致、不完全なクイズ"]
      ]
    }
  }
} as const;

export type Dictionary = (typeof dictionaries)[Locale];

export const issueCategoryLabels: Record<Locale, Record<IssueCategory, string>> = {
  zh: {
    malformed_json: "JSON 格式錯誤",
    missing_quiz_run_id: "缺少測驗紀錄 ID",
    duplicate_event: "重複事件",
    duplicate_answer_snapshot: "重複答案快照",
    duplicate_quiz_result: "重複測驗結果",
    invalid_axis_values: "無效軸向值",
    incomplete_quiz_run: "不完整測驗",
    answer_count_mismatch: "答案數不一致",
    answers_length_mismatch: "答案陣列長度不一致",
    questionnaire_count_mismatch: "問卷題數不一致",
    missing_required_field: "缺少必要欄位",
    csv_parse_error: "CSV 解析錯誤",
    unsupported_event: "不支援事件"
  },
  en: {
    malformed_json: "Malformed JSON",
    missing_quiz_run_id: "Missing quizRunId",
    duplicate_event: "Duplicate event",
    duplicate_answer_snapshot: "Duplicate answer_snapshot",
    duplicate_quiz_result: "Duplicate quiz_result",
    invalid_axis_values: "Invalid axis values",
    incomplete_quiz_run: "Incomplete quiz run",
    answer_count_mismatch: "answerCount mismatch",
    answers_length_mismatch: "answers.length mismatch",
    questionnaire_count_mismatch: "Questionnaire count mismatch",
    missing_required_field: "Missing required field",
    csv_parse_error: "CSV parse error",
    unsupported_event: "Unsupported event"
  },
  ja: {
    malformed_json: "JSON 形式エラー",
    missing_quiz_run_id: "クイズ実行 ID 不足",
    duplicate_event: "重複イベント",
    duplicate_answer_snapshot: "重複した回答記録",
    duplicate_quiz_result: "重複した結果生成",
    invalid_axis_values: "無効な軸値",
    incomplete_quiz_run: "不完全なクイズ",
    answer_count_mismatch: "回答数不一致",
    answers_length_mismatch: "回答配列の長さ不一致",
    questionnaire_count_mismatch: "質問数不一致",
    missing_required_field: "必須項目不足",
    csv_parse_error: "CSV 解析エラー",
    unsupported_event: "未対応イベント"
  }
};

export const severityLabels: Record<Locale, Record<IssueSeverity, string>> = {
  zh: {
    info: "資訊",
    warning: "警告",
    error: "錯誤"
  },
  en: {
    info: "info",
    warning: "warning",
    error: "error"
  },
  ja: {
    info: "情報",
    warning: "警告",
    error: "エラー"
  }
};
