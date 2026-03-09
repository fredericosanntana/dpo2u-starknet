/**
 * DPO2U Compliance Registry — Demo
 * Privacy Track | Bitcoin & Privacy Hackathon 2026
 * Run: npx ts-node src/scripts/demo.ts
 */

import {
  DPO2UClient,
  ComplianceFramework,
  buildEvidenceCommitment,
  verifyCommitment,
} from '../lib/client';

const RPC     = process.env.STARKNET_RPC_URL ?? 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/demo';
const CONTRACT = process.env.CONTRACT_ADDRESS ?? '0x05235b085e3845b0a6f206edbc712f6d51917169b0e864177cb2321183b5fc4a';

const EVIDENCE = {
  cnpjHash:    'sha256:12345678000195',
  dpoDid:      'did:dpo2u:abcdef123456',
  auditDate:   Math.floor(Date.now() / 1000),
  frameworkId: 1,
  score:       87,
};

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  DPO2U Compliance Registry — Starknet Demo');
  console.log('  Privacy Track | Bitcoin & Privacy Hackathon 2026');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── Step 1: Build commitment off-chain ──────────────────────────────────
  console.log('📊 Step 1: Building evidence commitment (OFF-CHAIN)\n');
  console.log('  Raw evidence — NEVER goes on-chain:');
  console.log(`    CNPJ hash:    ${EVIDENCE.cnpjHash}`);
  console.log(`    DPO DID:      ${EVIDENCE.dpoDid}`);
  console.log(`    Audit date:   ${new Date(EVIDENCE.auditDate * 1000).toISOString()}`);
  console.log(`    Framework:    LGPD (Brazil Lei 13.709/2018)`);
  console.log(`    Score:        ${EVIDENCE.score}/100`);

  const commitment = buildEvidenceCommitment(EVIDENCE);
  console.log('\n  ✅ Pedersen commitment (goes ON-CHAIN):');
  console.log(`    ${commitment}`);
  console.log('\n  → Privacy: only the hash touches the blockchain.');
  console.log('  → LGPD Art. 46 + GDPR Art. 25 (privacy by design).\n');

  // ── Step 2: Verify commitment ───────────────────────────────────────────
  console.log('🔍 Step 2: Verifying commitment against evidence\n');
  const isValid = verifyCommitment(EVIDENCE, commitment);
  console.log(`  Commitment valid: ${isValid ? '✅ YES' : '❌ NO'}`);

  const tampered = { ...EVIDENCE, score: 42 };
  const tamperedOk = verifyCommitment(tampered, commitment);
  console.log(`  Tampered evidence (score=42): ${tamperedOk ? '❌ VALID (bug!)' : '✅ REJECTED'}`);
  console.log('\n  → Any auditor with raw evidence can recompute and verify.');
  console.log('  → Tampered data produces different hash → fraud detected.\n');

  // ── Step 3: Show calldata for on-chain attestation ──────────────────────
  console.log('⛓️  Step 3: Attestation calldata (what gets submitted on-chain)\n');
  const calldata = {
    contract:           CONTRACT,
    entrypoint:         'attest_compliance',
    organization:       '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
    evidence_commitment: commitment,
    framework:          'LGPD (variant 0)',
    validity_days:      365,
    audit_report_cid:   'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
  };
  console.log(JSON.stringify(calldata, null, 4));

  // ── Step 4: Architecture summary ───────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Privacy Architecture');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('  OFF-CHAIN (encrypted on IPFS):');
  console.log('    • Raw compliance data (CNPJ, DPO identity, audit details)');
  console.log('    • Full audit report');
  console.log('    • Record of Processing Activities (LGPD Art. 37)\n');
  console.log('  ON-CHAIN (Starknet — public but privacy-preserving):');
  console.log('    • Pedersen commitment hash of evidence');
  console.log('    • Framework (LGPD/GDPR), validity period, issuer');
  console.log('    • IPFS CID pointer to encrypted report');
  console.log('    • Revocation status\n');
  console.log('  REGULATORY MAPPING:');
  console.log('    LGPD Art. 37  → immutable on-chain audit trail');
  console.log('    LGPD Art. 46  → commitment = cryptographic security measure');
  console.log('    GDPR Art. 25  → privacy by design and by default');
  console.log('    GDPR Art. 30  → processing activity records (off-chain)\n');
  console.log('  STARKNET ADVANTAGE:');
  console.log('    • Pedersen hash native to Cairo/Starknet VM');
  console.log('    • STARKs prove state integrity without revealing state');
  console.log('    • Low fees = frequent attestation updates viable');
  console.log('    • Composable: any DeFi protocol can call verify_compliance()\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  DPO2U — Compliance as a Protocol on Starknet');
  console.log('  github.com/fredericosanntana/dpo2u-starknet');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error);
