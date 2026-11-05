import {test} from 'node:test';import assert from 'node:assert/strict';import {totals,money} from '../src/rules.js';
test('fractional quantities and discount',()=>assert.equal(totals([{qty:2.5,price:7.5}],1,10,'sale',1),17.75));
test('cash sale must be settled',()=>assert.throws(()=>totals([{qty:1,price:20}],0,10,'sale',null),/client/));
test('overpayment rejected',()=>assert.throws(()=>totals([{qty:1,price:20}],0,21,'sale',1),/paiement/));
test('negative total rejected',()=>assert.throws(()=>totals([{qty:1,price:20}],21,0,'quote',1),/remise/));
test('money rounds',()=>assert.equal(money(10.125),10.13));
