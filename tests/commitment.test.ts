/**
 * DPO2U — Commitment tests
 * Run: npx ts-node tests/commitment.test.ts
 */

import { buildEvidenceCommitment, verifyCommitment, ComplianceFramework } from '../src/lib/client';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

const BASE_EVIDENCE = {
  cnpjHash:    'sha256:12345678000195',
  dpoDid:      'did:dpo2u:abcdef123456',
  auditDate:   1741478400,
  frameworkId: 1,
  score:       87,
};

console.log('\n🧪 DPO2U Commitment Tests\n');

test('commitment is deterministic', () => {
  const c1 = buildEvidenceCommitment(BASE_EVIDENCE);
  const c2 = buildEvidenceCommitment(BASE_EVIDENCE);
  assert(c1 === c2, `Expected ${c1} === ${c2}`);
});

test('commitment is a hex string starting with 0x', () => {
  const c = buildEvidenceCommitment(BASE_EVIDENCE);
  assert(c.startsWith('0x'), `Commitment should start with 0x, got: ${c}`);
  assert(c.length > 10, `Commitment too short: ${c}`);
});

test('different cnpjHash produces different commitment', () => {
  const c1 = buildEvidenceCommitment(BASE_EVIDENCE);
  const c2 = buildEvidenceCommitment({ ...BASE_EVIDENCE, cnpjHash: 'sha256:99999999000100' });
  assert(c1 !== c2, 'Different cnpjHash should produce different commitment');
});

test('different score produces different commitment', () => {
  const c1 = buildEvidenceCommitment(BASE_EVIDENCE);
  const c2 = buildEvidenceCommitment({ ...BASE_EVIDENCE, score: 42 });
  assert(c1 !== c2, 'Different score should produce different commitment');
});

test('different framework produces different commitment', () => {
  const c1 = buildEvidenceCommitment({ ...BASE_EVIDENCE, frameworkId: 1 });
  const c2 = buildEvidenceCommitment({ ...BASE_EVIDENCE, frameworkId: 2 });
  assert(c1 !== c2, 'Different framework should produce different commitment');
});

test('verifyCommitment returns true for matching evidence', () => {
  const c = buildEvidenceCommitment(BASE_EVIDENCE);
  assert(verifyCommitment(BASE_EVIDENCE, c), 'Should verify correctly');
});

test('verifyCommitment returns false for tampered score', () => {
  const c = buildEvidenceCommitment(BASE_EVIDENCE);
  const tampered = { ...BASE_EVIDENCE, score: 42 };
  assert(!verifyCommitment(tampered, c), 'Tampered evidence should fail verification');
});

test('verifyCommitment returns false for tampered cnpjHash', () => {
  const c = buildEvidenceCommitment(BASE_EVIDENCE);
  const tampered = { ...BASE_EVIDENCE, cnpjHash: 'sha256:attacker' };
  assert(!verifyCommitment(tampered, c), 'Tampered CNPJ should fail verification');
});

test('verifyCommitment returns false for wrong commitment', () => {
  assert(!verifyCommitment(BASE_EVIDENCE, '0xdeadbeef'), 'Wrong commitment should fail');
});

test('LGPD and GDPR attestations produce different commitments', () => {
  const lgpd = buildEvidenceCommitment({ ...BASE_EVIDENCE, frameworkId: 1 });
  const gdpr = buildEvidenceCommitment({ ...BASE_EVIDENCE, frameworkId: 2 });
  const both = buildEvidenceCommitment({ ...BASE_EVIDENCE, frameworkId: 3 });
  assert(lgpd !== gdpr, 'LGPD !== GDPR');
  assert(lgpd !== both, 'LGPD !== BOTH');
  assert(gdpr !== both, 'GDPR !== BOTH');
});

console.log(`\n  Results: ${passed} passed, ${failed} failed`);
console.log(failed === 0 ? '\n  ✅ All tests passed!\n' : '\n  ❌ Some tests failed.\n');

if (failed > 0) process.exit(1);
