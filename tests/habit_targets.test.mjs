import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const app = await readFile(new URL('../app-20260606b.js', import.meta.url), 'utf8');
const names = ['pad2', 'parseDateOnly', 'dateToDateOnlyString', 'addDaysToDateString', 'isHabitActiveOnDate', 'habitWindowStats', 'parseHabitTarget', 'renderHabitWindows'];
const functions = names.map(name => {
  const start = app.indexOf(`function ${name}(`);
  return app.slice(start, app.indexOf('\n}\n', start) + 3);
}).join('\n');
const context = vm.createContext({});
vm.runInContext(functions, context);
const { habitWindowStats: stats, parseHabitTarget: parse, renderHabitWindows: render } = context;
const periods = new Map([[1, [{ started_on: '2026-01-01', ended_on: null }]]]);

test('30/90/180 windows include exactly N calendar days ending on the selected date', () => {
  for (const days of [30, 90, 180]) {
    const start = context.addDaysToDateString('2026-09-22', 1 - days);
    const excluded = context.addDaysToDateString(start, -1);
    const data = new Map([[start, 1], [excluded, 0], ['2026-09-22', 0], ['2026-09-23', 1]]);
    const result = stats(1, '2026-09-22', days, data, periods);
    assert.equal(result.active, days);
    assert.equal(result.recorded, 2);
    assert.equal(result.percentage, 50);
    assert.equal(result.missing, days - 2);
  }
});

test('missing and not-applicable days do not become failures; explicit No remains evaluable', () => {
  const result = stats(1, '2026-09-22', 30, new Map([['2026-09-22', 2], ['2026-09-21', 1], ['2026-09-20', 0]]), periods);
  assert.equal(result.percentage, 50);
  assert.equal(result.notApplicable, 1);
  assert.equal(result.missing, 27);
  assert.equal(stats(1, '2026-09-22', 30, new Map(), periods).percentage, null);
  assert.equal(stats(1, '2026-09-22', 30, new Map([['2026-09-22', 0]]), periods).percentage, 0);
});

test('new habits and archive/reactivation exclude inactive dates including archive boundary', () => {
  const periods = new Map([[1, [{ started_on: '2026-09-01', ended_on: '2026-09-03' }, { started_on: '2026-09-21', ended_on: null }]]]);
  const result = stats(1, '2026-09-22', 30, new Map([['2026-09-01', 1], ['2026-09-03', 0], ['2026-09-20', 0], ['2026-09-21', 1]]), periods);
  assert.equal(result.active, 4);
  assert.equal(result.recorded, 2);
  assert.equal(result.missing, 2);
  assert.equal(result.percentage, 100);
});

test('calendar arithmetic handles leap day and daylight-saving boundary', () => {
  assert.equal(context.addDaysToDateString('2024-03-01', -1), '2024-02-29');
  assert.equal(context.addDaysToDateString('2026-03-30', -1), '2026-03-29');
});

test('targets allow unset and both boundaries but reject invalid percentages', () => {
  assert.equal(parse(' '), null);
  for (const target of [0, 40, 100]) assert.equal(parse(String(target)), target);
  for (const value of ['-1', '101', 'NaN', 'abc', '1.5', 'Infinity']) assert.throws(() => parse(value));
});

test('rendered indicators expose coverage, no data, partial history and unrounded goal comparison', () => {
  const empty = render({ id: 1, target_percentage: null }, '2026-01-02', new Map(), periods);
  assert.match(empty, /30d: <strong>—/);
  assert.match(empty, /2\/30 días activos/);
  assert.match(empty, /Objetivo: sin definir/);
  const data = new Map([['2026-09-22', 1], ['2026-09-21', 1], ['2026-09-20', 0]]);
  const output = render({ id: 1, target_percentage: 67 }, '2026-09-22', data, periods);
  assert.match(output, /67%/);
  assert.match(output, /Por debajo del objetivo/);
  assert.match(output, /2 cumplidos de 3 registrados/);
  assert.match(render({ id: 1, target_percentage: 0 }, '2026-09-22', data, periods), /Objetivo: 0%/);
});
