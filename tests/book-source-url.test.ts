import { test } from "node:test";
import assert from "node:assert/strict";
import { bookSourceUrl } from "../client/src/lib/format.ts";

test("link da fonte: Google Books", () => {
  assert.equal(bookSourceUrl({ source: "google", sourceId: "zyTCAlFPjgYC" }), "https://books.google.com/books?id=zyTCAlFPjgYC");
});

test("link da fonte: Open Library", () => {
  assert.equal(bookSourceUrl({ source: "openlibrary", sourceId: "OL45804W" }), "https://openlibrary.org/works/OL45804W");
});

test("link da fonte: manual não tem link", () => {
  assert.equal(bookSourceUrl({ source: "manual", sourceId: "abc" }), null);
  assert.equal(bookSourceUrl({ source: "manual" }), null);
});

test("link da fonte: sem sourceId não tem link", () => {
  assert.equal(bookSourceUrl({ source: "google" }), null);
  assert.equal(bookSourceUrl({ source: "google", sourceId: null }), null);
  assert.equal(bookSourceUrl({ source: "openlibrary", sourceId: "" }), null);
});

test("link da fonte: id com caractere especial é codificado", () => {
  assert.equal(bookSourceUrl({ source: "google", sourceId: "a&b c/d" }), "https://books.google.com/books?id=a%26b%20c%2Fd");
  assert.equal(bookSourceUrl({ source: "openlibrary", sourceId: "OL1W?x=1" }), "https://openlibrary.org/works/OL1W%3Fx%3D1");
});
