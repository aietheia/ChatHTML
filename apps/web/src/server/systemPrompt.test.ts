import assert from "node:assert/strict";
import test from "node:test";
import { SYSTEM_PROMPT, buildUiComplexityPrompt } from "./systemPrompt.js";

test("discourages back navigation actions in chat artifacts", () => {
  assert.match(SYSTEM_PROMPT, /conversation history is already the navigation/i);
  assert.match(SYSTEM_PROMPT, /返回选择方向/);
  assert.match(SYSTEM_PROMPT, /返回低因列表/);
  assert.match(SYSTEM_PROMPT, /continue forward/i);
});

test("pushes generated artifacts through visual layout quality checks", () => {
  assert.match(SYSTEM_PROMPT, /Honor requested quantity/i);
  assert.match(SYSTEM_PROMPT, /IDs must be unique/i);
  assert.match(SYSTEM_PROMPT, /styled empty placeholder/i);
  assert.match(SYSTEM_PROMPT, /horizontal overflow/i);
  assert.match(SYSTEM_PROMPT, /no accidental duplicate primary subjects/i);
});

test("instructs formula output to use MathJax delimiters", () => {
  assert.match(SYSTEM_PROMPT, /MathJax/i);
  assert.match(SYSTEM_PROMPT, /\\\(/);
  assert.match(SYSTEM_PROMPT, /\\\[/);
  assert.match(SYSTEM_PROMPT, /TeX/i);
});

test("builds one level-specific UI complexity instruction per turn", () => {
  const cases = [
    { value: 10, label: "Minimal" },
    { value: 30, label: "Simple" },
    { value: 50, label: "Balanced" },
    { value: 75, label: "Rich" },
    { value: 90, label: "Elaborate" }
  ];
  const prompts = cases.map(({ value, label }) => {
    const prompt = buildUiComplexityPrompt(value);

    assert.match(prompt, new RegExp(`UI complexity: ${label}`));
    assert.match(prompt, /latest setting overrides/i);
    assert.doesNotMatch(prompt, /\d/);
    return prompt;
  });

  assert.equal(new Set(prompts).size, cases.length);
});
