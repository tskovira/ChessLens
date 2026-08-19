import test from "node:test";
import assert from "node:assert/strict";
import {calculateThreats,parseFen} from "../src/threat-engine.js";

test("a knight attacking f7 creates level-one pressure",()=>{
  const threat=calculateThreats(parseFen("8/5p2/3N4/8/8/8/8/8 w - - 0 1"))[0];
  assert.equal(threat?.target.square,"f7");
  assert.equal(threat?.level,1);
  assert.equal(threat?.attackers[0]?.type,"knight");
});

test("three attackers create level-three pressure",()=>{
  const threat=calculateThreats(parseFen("3q4/5N2/3R4/6B1/8/8/8/8 w - - 0 1"))
    .find(item=>item.target.square==="d8");
  assert.equal(threat?.attackers.length,3);
  assert.equal(threat?.level,3);
});

test("a legal recapturing piece is a usable defender",()=>{
  const threat=calculateThreats(parseFen("6k1/5p2/3N4/8/8/8/8/K7 w - - 0 1"))
    .find(item=>item.target.square==="f7");
  assert.equal(threat?.defenders.length,1);
  assert.equal(threat?.defenders[0]?.type,"king");
});

test("a pinned piece is not a usable defender",()=>{
  const threat=calculateThreats(parseFen("R4n1k/8/4p3/3P4/8/8/8/K7 w - - 0 1"))
    .find(item=>item.target.square==="e6");
  assert.equal(threat?.defenders.length,0);
});

test("sliding pieces cannot attack through blockers",()=>{
  const threats=calculateThreats(parseFen("3q4/3p4/3R4/8/8/8/8/8 w - - 0 1"));
  assert.equal(threats.some(threat=>threat.target.square==="d8"),false);
  assert.equal(threats.find(threat=>threat.target.square==="d7")?.attackers[0]?.type,"rook");
});
