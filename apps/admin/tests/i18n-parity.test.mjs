import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALES,
  resolveLocale,
} from "../src/i18n/config.ts";

const [uz, ru] = await Promise.all([
  readFile(new URL("../src/messages/uz.json", import.meta.url), "utf8").then(
    JSON.parse,
  ),
  readFile(new URL("../src/messages/ru.json", import.meta.url), "utf8").then(
    JSON.parse,
  ),
]);

function flattenMessages(messages, prefix = "", result = {}) {
  for (const [key, value] of Object.entries(messages)) {
    const messageKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      result[messageKey] = value;
    } else {
      flattenMessages(value, messageKey, result);
    }
  }
  return result;
}

function placeholders(message) {
  return [
    ...new Set(
      [...message.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)(?=[,}])/g)].map(
        ([, key]) => key,
      ),
    ),
  ].sort();
}

test("Uzbek and Russian admin catalogs have matching keys and placeholders", () => {
  const uzMessages = flattenMessages(uz);
  const ruMessages = flattenMessages(ru);
  const keys = Object.keys(uzMessages).sort();

  assert.deepEqual(Object.keys(ruMessages).sort(), keys);
  for (const key of keys) {
    assert.deepEqual(
      placeholders(ruMessages[key]),
      placeholders(uzMessages[key]),
      `Placeholder mismatch for ${key}`,
    );
  }
});

test("admin localization defaults to Uzbek and resolves locales from its cookie value", () => {
  assert.equal(DEFAULT_LOCALE, "uz");
  assert.deepEqual(LOCALES, ["uz", "ru"]);
  assert.equal(LOCALE_COOKIE, "NEXT_LOCALE");
  assert.equal(resolveLocale(undefined), "uz");
  assert.equal(resolveLocale("ru"), "ru");
  assert.equal(resolveLocale("en"), "uz");
});
