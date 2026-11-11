import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStackFrame } from '../src/index.js';

test('parses a named frame with file, line, and column', () => {
  const frame = parseStackFrame('    at foo (/app/src/index.js:10:5)');
  assert.deepEqual(frame, {
    functionName: 'foo',
    file: '/app/src/index.js',
    line: 10,
    column: 5,
  });
});

test('parses an anonymous frame with a bare location', () => {
  const frame = parseStackFrame('    at /app/src/index.js:10:5');
  assert.deepEqual(frame, {
    functionName: '',
    file: '/app/src/index.js',
    line: 10,
    column: 5,
  });
});

test('parses a native frame with a function name', () => {
  const frame = parseStackFrame('    at Array.map (native)');
  assert.deepEqual(frame, {
    functionName: 'Array.map',
    file: '',
    line: null,
    column: null,
  });
});

test('parses a bare native frame', () => {
  const frame = parseStackFrame('    at native');
  assert.deepEqual(frame, {
    functionName: '',
    file: '',
    line: null,
    column: null,
  });
});

test('preserves async prefix in function name', () => {
  const frame = parseStackFrame('    at async load (/app/src/loader.js:42:7)');
  assert.deepEqual(frame, {
    functionName: 'async load',
    file: '/app/src/loader.js',
    line: 42,
    column: 7,
  });
});

test('parses a file URL as the file field', () => {
  const frame = parseStackFrame('    at Object.<anonymous> (file:///home/user/app.js:3:1)');
  assert.deepEqual(frame, {
    functionName: 'Object.<anonymous>',
    file: 'file:///home/user/app.js',
    line: 3,
    column: 1,
  });
});

test('parses a Windows drive path', () => {
  const frame = parseStackFrame('    at foo (C:\\Users\\me\\app.js:12:34)');
  assert.deepEqual(frame, {
    functionName: 'foo',
    file: 'C:\\Users\\me\\app.js',
    line: 12,
    column: 34,
  });
});

test('handles a frame with no leading "at " prefix', () => {
  const frame = parseStackFrame('foo (/app/src/index.js:1:2)');
  assert.deepEqual(frame, {
    functionName: 'foo',
    file: '/app/src/index.js',
    line: 1,
    column: 2,
  });
});

test('handles an empty string as a file with no location', () => {
  const frame = parseStackFrame('');
  assert.deepEqual(frame, {
    functionName: '',
    file: '',
    line: null,
    column: null,
  });
});

test('throws TypeError for non-string input', () => {
  assert.throws(() => parseStackFrame(42), TypeError);
  assert.throws(() => parseStackFrame(null), TypeError);
  assert.throws(() => parseStackFrame(undefined), TypeError);
});

test('treats an unknown parenthesised payload as a file', () => {
  const frame = parseStackFrame('    at foo (some weird thing)');
  assert.deepEqual(frame, {
    functionName: 'foo',
    file: 'some weird thing',
    line: null,
    column: null,
  });
});
