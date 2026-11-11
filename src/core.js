/**
 * Parses a single V8 stack frame line into its fields.
 *
 * V8 formats stack frames in a few shapes. The most common is:
 *   at functionName (/path/to/file.js:10:5)
 * Anonymous frames omit the function name:
 *   at /path/to/file.js:10:5
 * Native frames have no location:
 *   at functionName (native)
 *   at native
 *
 * The parser deliberately does not attempt to normalise paths (e.g. file:// URLs)
 * because callers may need the raw string for source-map lookups. It also does not
 * try to strip "async " or "new " prefixes from function names; those are part of
 * the name as V8 reports them.
 */

/**
 * @typedef {Object} ParsedStackFrame
 * @property {string} functionName - The function name, or empty string if absent.
 * @property {string} file - The file path or URL, or empty string if absent.
 * @property {number|null} line - 1-based line number, or null if absent.
 * @property {number|null} column - 1-based column number, or null if absent.
 */

const LOCATION_RE = /^(.*?):(\d+):(\d+)$/;

/**
 * Parses a single stack frame line.
 *
 * @param {string} line - A line from an Error.stack, typically starting with "at ".
 * @returns {ParsedStackFrame}
 * @throws {TypeError} If line is not a string.
 */
export function parseStackFrame(line) {
  if (typeof line !== 'string') {
    throw new TypeError('parseStackFrame expects a string');
  }

  // Trim leading whitespace and the conventional "at " prefix. V8 always emits
  // "at " but some tools strip it; handling both keeps the parser useful.
  let rest = line.trim();
  if (rest.startsWith('at ')) {
    rest = rest.slice(3);
  }

  // Native frames: "functionName (native)" or just "native".
  if (rest === 'native') {
    return { functionName: '', file: '', line: null, column: null };
  }

  // Frame with parentheses: "functionName (location)" or "(location)".
  if (rest.startsWith('(') && rest.endsWith(')')) {
    const inner = rest.slice(1, -1);
    const loc = parseLocation(inner);
    if (loc) {
      return { functionName: '', file: loc.file, line: loc.line, column: loc.column };
    }
    // Unknown parenthesised content; treat the whole thing as a file.
    return { functionName: '', file: inner, line: null, column: null };
  }

  // Frame with a space before a parenthesised location: "functionName (location)".
  const parenIndex = rest.indexOf(' (');
  if (parenIndex !== -1 && rest.endsWith(')')) {
    const functionName = rest.slice(0, parenIndex);
    const inner = rest.slice(parenIndex + 2, -1);
    if (inner === 'native') {
      return { functionName, file: '', line: null, column: null };
    }
    const loc = parseLocation(inner);
    if (loc) {
      return { functionName, file: loc.file, line: loc.line, column: loc.column };
    }
    return { functionName, file: inner, line: null, column: null };
  }

  // Bare location: "/path/to/file.js:10:5" or "file:///path:10:5".
  const loc = parseLocation(rest);
  if (loc) {
    return { functionName: '', file: loc.file, line: loc.line, column: loc.column };
  }

  // Fallback: treat the whole remainder as a file with no location.
  return { functionName: '', file: rest, line: null, column: null };
}

/**
 * Splits a location string into file, line, and column.
 *
 * We require both line and column to be present. V8 always emits both, and
 * accepting a line without a column would make it ambiguous whether a colon in
 * a Windows path (e.g. C:\foo) is a drive separator or a line delimiter.
 *
 * @param {string} text
 * @returns {{file: string, line: number, column: number}|null}
 */
function parseLocation(text) {
  const match = LOCATION_RE.exec(text);
  if (!match) {
    return null;
  }
  const [, file, lineStr, colStr] = match;
  const line = Number(lineStr);
  const column = Number(colStr);
  if (!Number.isSafeInteger(line) || !Number.isSafeInteger(column)) {
    return null;
  }
  return { file, line, column };
}
