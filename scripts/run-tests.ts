import { extractPostDate } from '../src/parser/text-parser';
import { testCases } from '../src/parser/__tests__/date-parsing.test';

const ref = '2026-09-09T00:00:00+08:00';
let passed = 0;

for (const tc of testCases) {
  const res = extractPostDate(tc.text, ref);
  const okDate = res.resolvedDate === tc.expectedDate;
  const okLabel = res.dateLabel === tc.expectedLabel;
  if (okDate && okLabel) {
    passed++;
    console.log(`✓ PASS: ${tc.name}`);
  } else {
    console.error(`✗ FAIL: ${tc.name}\n  Expected: ${tc.expectedDate} (${tc.expectedLabel})\n  Got: ${res.resolvedDate} (${res.dateLabel})`);
  }
}

console.log(`\nSummary: ${passed}/${testCases.length} tests passed.`);
if (passed !== testCases.length) {
  process.exit(1);
}
