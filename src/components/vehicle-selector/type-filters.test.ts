import { test } from "node:test";
import assert from "node:assert/strict";
import {
  matchesTypeFilters,
  extractDistinctValues,
  hasActiveTypeFilters,
  EMPTY_TYPE_FILTERS,
  type TypeFilters,
} from "./type-filters.ts";
import type { VehicleType } from "@/lib/olyslager/types";

function makeType(overrides: Partial<VehicleType> = {}): VehicleType {
  return {
    id: 1,
    appOrder: 1,
    typeName: "Test Type",
    code: null,
    yearStart: 2000,
    yearEnd: null,
    fuel: "Petrol",
    driveType: "FWD",
    cylinderCC: 2000,
    engineBuild: null,
    powerHP: 150,
    powerKW: 110,
    powerRPM: null,
    valveCount: null,
    cylinderCount: 4,
    modelImageUrlSmall: null,
    modelImageUrlMedium: null,
    modelImageUrlLarge: null,
    makeImageUrlSmall: null,
    makeImageUrlMedium: null,
    makeImageUrlLarge: null,
    ...overrides,
  };
}

test("matchesTypeFilters: EMPTY_TYPE_FILTERS matches everything", () => {
  assert.equal(matchesTypeFilters(makeType(), EMPTY_TYPE_FILTERS), true);
});

test("matchesTypeFilters: fuel filter excludes a non-matching type", () => {
  const filters: TypeFilters = { ...EMPTY_TYPE_FILTERS, fuel: "Diesel" };
  assert.equal(matchesTypeFilters(makeType({ fuel: "Petrol" }), filters), false);
  assert.equal(matchesTypeFilters(makeType({ fuel: "Diesel" }), filters), true);
});

test("matchesTypeFilters: driveType filter excludes a non-matching type", () => {
  const filters: TypeFilters = { ...EMPTY_TYPE_FILTERS, driveType: "AWD" };
  assert.equal(matchesTypeFilters(makeType({ driveType: "FWD" }), filters), false);
  assert.equal(matchesTypeFilters(makeType({ driveType: "AWD" }), filters), true);
});

test("matchesTypeFilters: power range excludes types outside the range", () => {
  const filters: TypeFilters = { ...EMPTY_TYPE_FILTERS, powerMin: 100, powerMax: 200 };
  assert.equal(matchesTypeFilters(makeType({ powerHP: 90 }), filters), false);
  assert.equal(matchesTypeFilters(makeType({ powerHP: 250 }), filters), false);
  assert.equal(matchesTypeFilters(makeType({ powerHP: 150 }), filters), true);
});

test("matchesTypeFilters: an open-ended power range only checks the given bound", () => {
  const minOnly: TypeFilters = { ...EMPTY_TYPE_FILTERS, powerMin: 100 };
  assert.equal(matchesTypeFilters(makeType({ powerHP: 500 }), minOnly), true);
  assert.equal(matchesTypeFilters(makeType({ powerHP: 50 }), minOnly), false);
});

test("matchesTypeFilters: a power range excludes types with no powerHP", () => {
  const filters: TypeFilters = { ...EMPTY_TYPE_FILTERS, powerMin: 100 };
  assert.equal(matchesTypeFilters(makeType({ powerHP: null }), filters), false);
});

test("hasActiveTypeFilters: false for EMPTY_TYPE_FILTERS, true once any field is set", () => {
  assert.equal(hasActiveTypeFilters(EMPTY_TYPE_FILTERS), false);
  assert.equal(hasActiveTypeFilters({ ...EMPTY_TYPE_FILTERS, fuel: "Diesel" }), true);
});

test("extractDistinctValues: dedupes, sorts, and skips null values", () => {
  const types = [
    makeType({ fuel: "Diesel" }),
    makeType({ fuel: "Petrol" }),
    makeType({ fuel: "Diesel" }),
    makeType({ fuel: null }),
  ];
  assert.deepEqual(extractDistinctValues(types, "fuel"), ["Diesel", "Petrol"]);
});
