import test from "node:test";
import assert from "node:assert/strict";
import { calculateThreats, parseFen } from "../src/threat-engine.js";

test("a knight attacking f7 creates level-one pressure", () => {
  const threats = calculateThreats(
    parseFen("8/5p2/3N4/8/8/8/8/8 w - - 0 1"),
  );
  assert.equal(threats.length, 1);
  assert.equal(threats[0]?.target.square, "f7");
  assert.equal(threats[0]?.level, 1);
  assert.equal(threats[0]?.attackers[0]?.type, "knight");
});

test("three attackers create level-three pressure", () => {
  const threats = calculateThreats(
    parseFen("3q4/5N2/3R4/6B1/8/8/8/8 w - - 0 1"),
  );
  const queen = threats.find(threat => threat.target.square === "d8");
  assert.equal(queen?.attackers.length, 3);
  assert.equal(queen?.level, 3);
});

test("sliding pieces cannot attack through blockers", () => {
  const threats = calculateThreats(
    parseFen("3q4/3p4/3R4/8/8/8/8/8 w - - 0 1"),
  );
  assert.equal(threats.some(threat => threat.target.square === "d8"), false);
  assert.equal(threats.find(threat => threat.target.square === "d7")?.attackers[0]?.type, "rook");
});
