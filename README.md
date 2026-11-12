# simple-stack-frame

Parses a single V8 stack frame line into its file, line number, column number, and function name fields.

```js
import { parseStackFrame } from 'simple-stack-frame';

parseStackFrame('    at foo (/app/src/index.js:10:5)');
// { functionName: 'foo', file: '/app/src/index.js', line: 10, column: 5 }

parseStackFrame('    at /app/src/index.js:10:5');
// { functionName: '', file: '/app/src/index.js', line: 10, column: 5 }

parseStackFrame('    at Array.map (native)');
// { functionName: 'Array.map', file: '', line: null, column: null }
```

## Why this exists

Stack traces arrive as strings, and most code that needs the structured pieces reaches for a regular expression inline. That works until a frame has no function name, or a `native` marker instead of a location, or a Windows path with a drive letter that looks like a line delimiter. This library centralises the shape of a V8 frame so callers can rely on a consistent object.

The trade-off is that it parses exactly one line. Multi-line stack strings must be split by the caller, because the correct split depends on the source (some tools include the error message on the first line, some do not). It also does not normalise paths or strip `async`/`new` prefixes: those are part of the function name as V8 reports them, and source-map consumers usually want the raw file string.

## The awkward edge

A location is only recognised when both line and column are present. V8 always emits both, but a hand-written frame like `at foo (app.js:10)` will fall through to the fallback and be reported as `file: 'app.js:10'` with `line` and `column` as `null`. This is deliberate: accepting a line without a column makes it ambiguous whether a colon in a Windows path is a drive separator or a line delimiter.

## API

### `parseStackFrame(line)`

- `line`: a string, typically one line from `Error.stack`.
- Returns an object with:
  - `functionName` (string) — empty when absent.
  - `file` (string) — empty when absent.
  - `line` (number | null) — 1-based, null when absent.
  - `column` (number | null) — 1-based, null when absent.
- Throws `TypeError` if `line` is not a string.
