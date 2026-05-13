# ramen-analytics

`ramen-analytics` 是獨立於 `ramen-style-finder` 的本機 CSV analytics dashboard。使用者可以匯入 `ramen-style-finder` 匯出的 quiz event CSV，立即查看 completion、type distribution、answer patterns、feedback quality 與 validation issues。

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style local components
- Recharts
- PapaParse
- Zod

## Local Development

```bash
npm install
npm run dev
```

開啟 `http://localhost:3000`。

驗證：

```bash
npm run typecheck
npm run build
```

## Architecture

主要程式碼放在 `src/`：

- `parser/`: CSV worker、row normalization、ID hashing。
- `validation/`: validation issue factory 與 issue typing。
- `analytics/`: run-level aggregation、valid completion 判定、filtering。
- `chart-transformers/`: dashboard view model 與 Recharts data transforms。
- `hooks/`: `useCsvAnalytics` 管理 worker lifecycle、demo CSV、comments exposure。
- `i18n/`: 中文、英文、日文 UI dictionary 與 validation label 翻譯。
- `analytics/questionnaire-baseline.ts`: ramen-style-finder 問卷基準，包含 39 題題數檢查、題組順序、四軸映射與 scoring 權重說明。
- `types/`: event、run、analytics、table 與 chart 型別。
- `components/dashboard/`: upload、filters、KPI cards、charts、validation panel、data tables。
- `components/ui/`: shadcn/ui-style Button、Card、Input、Select、Tabs、Table、Switch、Progress、Badge。

## Parser Flow

1. 使用者拖放或選擇一個以上 CSV。
2. `useCsvAnalytics` 建立 Web Worker。
3. Worker 用 PapaParse streaming step mode 解析 CSV row。
4. 每列先通過 Zod row guard。
5. `payload` 與 `rawEvent` 以 JSON 解析；malformed JSON 會變成 validation issue。
6. 欄位會從 CSV row、payload、rawEvent、rawEvent.context 依序正規化。
7. raw `quizRunId` / `sessionId` 不回傳 UI，只回傳 salted hash。
8. Worker 建立 analytics dataset 後回傳 browser state。

## Analytics Pipeline

1. 事件以 `quizRunIdHash` group 成 quiz runs。
2. `answer_snapshot.payload.answers` 是 authoritative answer source。
3. `quiz_result` 提供 type、axis、flavor tags、allergen warnings。
4. `feedback` 提供 rating 與 comment metadata。
5. load-test runs 預設標記並從 valid stats 排除。
6. malformed、duplicate、incomplete、answer count mismatch 的 runs 不計入 valid completed。
7. 問卷基準預期 final answer snapshot 有 39 題，題數不一致會標成 validation issue。
8. UI filters 作用在 run summary，再重新計算 KPI、charts、tables。

## Chart System

Recharts chart data 都由 `chart-transformers/dashboard-transformers.ts` 產生：

- Donut: type distribution。
- Radar: richnessAxis、brothBodyAxis、impactAxis、noodleBodyAxis overall average 與 typeCode comparison。
- Funnel: quiz_started、answer_snapshot、quiz_result、feedback、valid_completed。
- Stacked Bar: per-question left / right / neutral / selected / not_selected。
- Bar: feedback rating distribution。
- Treemap: flavor tag analysis。
- Bar: allergen warning analysis。
- Line: appVersion completion rate、feedback rate、average rating。
- Bar: questionnaire influence model, based on ramen-style-finder scoring weights.

每張圖表卡片都有 PNG export button，使用 `html-to-image` 在瀏覽器端輸出。

Load-test 資料預設不納入有效統計；若使用「有效性 = Load-test」篩選，圖表會切換成測試資料檢視，用於確認 exported CSV 結構與測試分布。

## Languages

UI 內建中文、英文、日文切換，語言設定會存到 `localStorage`。資料欄位、CSV export 與 summary JSON 仍保留原始分析 key，避免多語系顯示影響後續資料處理。

## Validation Logic

Validation panel 追蹤：

- malformed JSON rows
- duplicate event fingerprints
- duplicate `answer_snapshot`
- duplicate `quiz_result`
- invalid axis values
- incomplete quiz runs
- `answerCount` mismatch
- `answers.length` mismatch
- missing required fields / missing quizRunId

Validation issues 會附上 file、row、event type、hashed run id 與 message，便於追查匯出檔案品質。

## Privacy Defaults

- 所有 CSV 都在瀏覽器本機處理。
- V1 不需要後端，也不會自動上傳。
- raw `quizRunId` 與 `sessionId` 不出現在 UI。
- feedback comments 預設不回傳到 UI state；開啟時會先提示並重新解析。
- data tables 只顯示 hashed run id。

## Performance

- PapaParse 在 Web Worker 中以 streaming step mode 解析，避免 100k+ rows 阻塞主 UI thread。
- Dashboard transform 以 memoization 依 dataset、filters、comparison typeCodes 重新計算。
- Data tables 預設只 render 前 350 筆符合搜尋的 rows，避免大型 CSV 造成 DOM 過量。
- Run-level summary 在 worker 端完成，UI 不保存 raw payload / rawEvent。

## Demo Mode

點 `Demo mode` 會載入 synthetic sample CSV。資料包含：

- valid completed runs
- load-test run
- incomplete run
- duplicate `answer_snapshot`
- malformed JSON row
- feedback rating / hidden comment

## Deploy on Vercel

1. Push repo 到 GitHub。
2. 到 Vercel 建立新專案並選擇 `AnsonHui6040/ramen-analytics`。
3. Framework preset 選 Next.js。
4. Build command 使用 `npm run build`。
5. Output directory 使用 Vercel 預設。
6. Deploy 後即可使用。此專案沒有後端與環境變數需求。
