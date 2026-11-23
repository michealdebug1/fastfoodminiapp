import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const uz = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../src/messages/uz.json", import.meta.url)),
    "utf8",
  ),
);
const ru = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../src/messages/ru.json", import.meta.url)),
    "utf8",
  ),
);

function flatten(value, prefix = "") {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === "string"
      ? [[path, child]]
      : flatten(child, path);
  });
}

function placeholders(message) {
  return [...message.matchAll(/\{([A-Za-z0-9_]+)(?:[,}])/g)]
    .map((match) => match[1])
    .sort();
}

test("customer Uzbek and Russian catalogs have matching keys and placeholders", () => {
  const uzEntries = new Map(flatten(uz));
  const ruEntries = new Map(flatten(ru));
  assert.deepEqual([...ruEntries.keys()].sort(), [...uzEntries.keys()].sort());

  for (const [key, uzText] of uzEntries) {
    assert.deepEqual(
      placeholders(ruEntries.get(key)),
      placeholders(uzText),
      `Placeholder mismatch for ${key}`,
    );
  }
});
