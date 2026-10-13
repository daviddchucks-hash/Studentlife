"use strict";

export function generateFormulaCsvTemplate() {
  const headers = ["name", "subject", "level", "topic", "formula", "formulaLatex", "description", "variables", "units", "conditions", "examples", "tags", "verified"];
  const exampleRow = [
    '"Quadratic Formula"',
    '"Mathematics"',
    '"O-Level"',
    '"Algebra"',
    '"x = (-b ± √(b² - 4ac)) / (2a)"',
    '"x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"',
    '"Solves ax² + bx + c = 0"',
    '"a=coef x², b=coef x, c=constant"',
    '"Dimensionless"',
    '"a ≠ 0"',
    '"x²-5x+6=0 → x=3 or x=2"',
    '"quadratic, algebra"',
    '"true"'
  ];
  return `${headers.join(",")}\n${exampleRow.join(",")}`;
}

export function parseFormulaCsv(csvText) {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV file must contain a header row and at least one data row.");

  // Simple CSV parser supporting quotes
  const parseLine = (text) => {
    const result = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === "," && !inQuotes) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.replace(/^"|"$/g, "").trim());
  const items = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]).map((v) => v.replace(/^"|"$/g, "").trim());
    if (values.length < headers.length) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      let val = values[idx];
      if (h === "verified") {
        obj[h] = val.toLowerCase() === "true" || val === "1";
      } else {
        obj[h] = val;
      }
    });
    items.push(obj);
  }

  return items;
}
