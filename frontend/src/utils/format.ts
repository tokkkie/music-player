// format.ts - フォーマット用ユーティリティ関数

/**
 * タイトルから先頭の数字を取り除く（例: "01曲名" → "曲名"）
 */
export function cleanTitle(title: string): string {
  return title.replace(/^\d+[\s\-_.]*/, '')
}
