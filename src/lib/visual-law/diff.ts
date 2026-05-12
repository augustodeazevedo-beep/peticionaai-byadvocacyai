export type DiffSegment =
  | { type: "equal"; lines: string[] }
  | { type: "added"; lines: string[] }
  | { type: "removed"; lines: string[] };

const MAX_LINES = 5000;

export interface DiffResult {
  segments: DiffSegment[];
  truncated: boolean;
}

/**
 * Diff por linhas via LCS clássico (DP). Suficiente até ~5k linhas.
 */
export function diffLines(a: string, b: string): DiffResult {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const truncated = aLines.length > MAX_LINES || bLines.length > MAX_LINES;
  if (truncated) {
    return {
      truncated: true,
      segments: [
        { type: "removed", lines: aLines.slice(0, 200) },
        { type: "added", lines: bLines.slice(0, 200) },
      ],
    };
  }

  const m = aLines.length;
  const n = bLines.length;
  // DP table
  const dp: Uint32Array[] = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (aLines[i] === bLines[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const segments: DiffSegment[] = [];
  const push = (type: DiffSegment["type"], line: string) => {
    const last = segments[segments.length - 1];
    if (last && last.type === type) last.lines.push(line);
    else segments.push({ type, lines: [line] } as DiffSegment);
  };

  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (aLines[i] === bLines[j]) {
      push("equal", aLines[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push("removed", aLines[i]);
      i++;
    } else {
      push("added", bLines[j]);
      j++;
    }
  }
  while (i < m) push("removed", aLines[i++]);
  while (j < n) push("added", bLines[j++]);

  return { segments, truncated: false };
}