export type MonitorDiffLine = {
  type: "added" | "removed" | "normal";
  text: string;
};

export function diffMonitorLines(
  prevStr: string,
  currStr: string,
): MonitorDiffLine[] {
  const prevLines = prevStr.split("\n");
  const currLines = currStr.split("\n");
  const result: MonitorDiffLine[] = [];
  let p = 0;
  let c = 0;

  while (p < prevLines.length || c < currLines.length) {
    if (p < prevLines.length && c < currLines.length) {
      if (prevLines[p] === currLines[c]) {
        result.push({ type: "normal", text: prevLines[p] });
        p++;
        c++;
      } else {
        const nextC = currLines.indexOf(prevLines[p], c);
        if (nextC !== -1 && nextC - c < 5) {
          for (let i = c; i < nextC; i++) {
            result.push({ type: "added", text: currLines[i] });
          }
          c = nextC;
        } else {
          result.push({ type: "removed", text: prevLines[p] });
          p++;
        }
      }
    } else if (p < prevLines.length) {
      result.push({ type: "removed", text: prevLines[p] });
      p++;
    } else {
      result.push({ type: "added", text: currLines[c] });
      c++;
    }
  }
  return result;
}
