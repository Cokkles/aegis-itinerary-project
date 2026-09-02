import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../apps-script/calendar-action-v2.gs', import.meta.url), 'utf8');
const cache = new Map();
const context = vm.createContext({
  CONFIG: { TIMEZONE: 'America/New_York' },
  Utilities: {
    getUuid: () => 'test-token',
    parseDate: value => new Date(`${value}T04:00:00.000Z`),
    sleep: () => { throw new Error('Gemini retry path must not run'); }
  },
  CacheService: { getScriptCache: () => ({ put: (key, value) => cache.set(key, value), get: key => cache.get(key), remove: key => cache.delete(key) }) },
  Logger: { log: () => {} },
  callGemini: () => { throw new Error('Structured Calendar preparation invoked Gemini'); },
  console
});
vm.runInContext(source, context);

const timed = context.handleAegisCalendarPrepareV1_({ event: {
  title: 'Exact appointment',
  start: '2026-09-02T14:00:00-04:00',
  end: '2026-09-02T15:00:00-04:00',
  all_day: false,
  location: 'Durham',
  description: 'Structured input'
} }, { user: { email: 'USER@EXAMPLE.COM' } });

assert.equal(timed.status, 'success');
assert.equal(timed.operation, 'CREATE');
assert.equal(timed.parser_source, 'STRUCTURED');
assert.equal(timed.model_used, null);
assert.equal(timed.confirmation_required, true);
assert.equal(timed.mutation_performed, false);
assert.equal(timed.proposal.event.title, 'Exact appointment');
assert.equal(timed.proposal.event.start, '2026-09-02T18:00:00.000Z');
assert.equal(timed.proposal.event.end, '2026-09-02T19:00:00.000Z');
assert.equal(JSON.parse(cache.get('AEGIS_CAL_V2_test-token')).user_email, 'user@example.com');

const allDay = context.handleAegisCalendarPrepareV1_({ event: {
  title: 'Exact all-day event',
  start: '2026-09-03',
  all_day: true
} }, { user: { email: 'user@example.com' } });
assert.equal(allDay.proposal.event.all_day, true);
assert.equal(allDay.proposal.event.start, '2026-09-03T04:00:00.000Z');

assert.throws(() => context.handleAegisCalendarPrepareV1_({ event: {
  title: 'Invalid range',
  start: '2026-09-02T15:00:00-04:00',
  end: '2026-09-02T14:00:00-04:00',
  all_day: false
} }, { user: { email: 'user@example.com' } }), /invalid time range/i);

console.log('PASS calendar_prepare_v1 bypasses Gemini and issues a bounded confirmation preview');
