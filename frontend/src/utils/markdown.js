export function normalizeMathDelimiters(content) {
  return content
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, expression) => `$$\n${expression.trim()}\n$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, expression) => `$${expression.trim()}$`);
}
