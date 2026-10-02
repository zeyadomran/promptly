// @vitest-environment node
import { expect, test, vi } from 'vitest';

import { StorageDiagnostics } from '../../src/main/storage/worker-diagnostics';

const at = (value) => ({ epochMs: value, monotonicMs: value });
const timings = { received: at(2), sent: at(3) };

test('interleaved requests emit complete correlated groups only at final flush', () => {
  const buffer = new StorageDiagnostics();
  const observer = vi.fn();

  buffer.post(1, at(1));
  buffer.post(2, at(4));
  buffer.receive(2, { received: at(5), sent: at(6) }, at(7));
  buffer.receive(1, timings, at(8));
  expect(observer).not.toHaveBeenCalled();
  const receipt = buffer.flush(observer);

  expect(receipt.events.map(({ requestId }) => requestId)).toEqual([2, 2, 2, 2, 1, 1, 1, 1]);
  expect(receipt.events.slice(4).map(({ epochMs }) => epochMs)).toEqual([1, 2, 3, 8]);
  expect(observer).toHaveBeenCalledTimes(8);
  expect(buffer.flush(observer).events).toEqual([]);
});

test('incomplete and malformed groups cannot masquerade as complete interval evidence', () => {
  const buffer = new StorageDiagnostics();

  buffer.post(1, at(1));
  buffer.post(2, at(1));
  buffer.receive(2, { received: at(2) }, at(4));
  buffer.post(3, at(1));
  buffer.receive(3, { ...timings, text: 'private source contents' }, at(4));
  expect(buffer.flush(() => {})).toEqual({ events: [], droppedRequests: 2, incompleteRequests: 1 });
});

test('512 scalar event cap retains whole groups and never exports arbitrary worker fields', () => {
  const buffer = new StorageDiagnostics();

  for (let id = 1; id <= 200; id += 1) {
    buffer.post(id, at(1));
    buffer.receive(id, timings, at(4));
  }

  const receipt = buffer.flush(() => {});

  expect(receipt.events).toHaveLength(512);
  expect(receipt.droppedRequests).toBe(72);
  expect(receipt.events.every((event) => Object.keys(event).length === 4)).toBe(true);
});

test('throwing final observers do not interrupt subsequent groups or change captured timestamps', () => {
  const buffer = new StorageDiagnostics();
  const observer = vi.fn(() => {
    throw new Error('owned observer failure');
  });

  buffer.post(1, at(1));
  buffer.receive(1, timings, at(4));
  expect(buffer.flush(observer).events).toHaveLength(4);
  expect(observer).toHaveBeenCalledTimes(4);
});

test.each([
  { received: at(Number.NaN), sent: at(3) },
  { received: at(2), sent: at(Infinity) },
  { received: at(-1), sent: at(3) },
  { received: { ...at(2), contents: 'private' }, sent: at(3) }
])(
  'non-finite, negative or unexpected worker metadata cannot produce interval evidence',
  (value) => {
    const buffer = new StorageDiagnostics();

    buffer.post(1, at(1));
    buffer.receive(1, value, at(4));
    expect(buffer.flush(() => {})).toEqual({
      events: [],
      droppedRequests: 1,
      incompleteRequests: 0
    });
  }
);

test('the ten-second capture deadline rejects new groups and final flush cannot restart capture', () => {
  const clock = vi.spyOn(performance, 'now').mockReturnValue(0);

  try {
    const buffer = new StorageDiagnostics();

    buffer.post(1, at(1));
    clock.mockReturnValue(10_001);
    buffer.post(2, at(1));
    buffer.receive(2, timings, at(4));
    buffer.receive(1, timings, at(4));
    const receipt = buffer.flush(() => {});

    expect(receipt.events).toHaveLength(4);
    expect(receipt.droppedRequests).toBe(1);
    clock.mockReturnValue(0);
    buffer.post(3, at(1));
    buffer.receive(3, timings, at(4));
    expect(buffer.flush(() => {}).events).toEqual([]);
  } finally {
    clock.mockRestore();
  }
});
