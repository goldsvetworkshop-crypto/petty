export function canonicalize(data: any): string {
  if (data === null || typeof data !== "object") {
    return JSON.stringify(data);
  }

  if (Array.isArray(data)) {
    return `[${data.map((item) => canonicalize(item)).join(",")}]`;
  }

  const sortedKeys = Object.keys(data).sort();
  const members = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalize(data[key])}`
  );

  return `{${members.join(",")}}`;
}