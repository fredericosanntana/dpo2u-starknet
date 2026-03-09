# DPO2U Compliance Registry on Starknet

> **Privacy Track — Bitcoin & Privacy Hackathon 2026**  
> Prove regulatory compliance without revealing personal data on-chain.

[![Starknet](https://img.shields.io/badge/Starknet-Sepolia-blue)](https://sepolia.starkscan.co/contract/0x05235b085e3845b0a6f206edbc712f6d51917169b0e864177cb2321183b5fc4a)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

> **Deployed on Starknet Sepolia:** [`0x05235b085e3845b0a6f206edbc712f6d51917169b0e864177cb2321183b5fc4a`](https://sepolia.starkscan.co/contract/0x05235b085e3845b0a6f206edbc712f6d51917169b0e864177cb2321183b5fc4a)

---

## The Problem

Organizations subject to **LGPD** (Brazil) and **GDPR** (EU) must demonstrate compliance to clients, regulators, and partners — but doing so publicly risks exposing sensitive operational data (DPO identities, internal audit scores, processing activity details).

**Today's solutions are broken:**
- Paper certificates: not verifiable on-chain
- Public registries: expose sensitive organizational data
- Centralized databases: single point of failure

---

## The Solution

DPO2U Compliance Registry uses **Pedersen hash commitments** (native to Starknet's Cairo VM) to prove compliance **without revealing the underlying data**.

```
Organization                    On-chain (Starknet)           Off-chain (IPFS)
─────────────                   ───────────────────           ────────────────
CNPJ hash          ──┐
DPO DID            ──┤  Pedersen  ──→  commitment hash   →   IPFS CID
Audit date         ──┤  hash chain      + metadata            (encrypted
Framework          ──┤                  + validity period      audit report)
Score 87/100       ──┘                  + issuer address
```

**What goes on-chain:** The commitment hash, attestation metadata, IPFS CID pointer.  
**What stays off-chain:** All personal data, DPO identity, raw compliance details.

---

## Regulatory Mapping

| Requirement | Implementation |
|---|---|
| LGPD Art. 37 — Audit trail | Immutable on-chain attestation log |
| LGPD Art. 46 — Security measures | Pedersen commitment = cryptographic data minimization |
| GDPR Art. 25 — Privacy by design | Zero personal data on-chain by architecture |
| GDPR Art. 30 — Processing records | Off-chain encrypted RoPA with IPFS CID pointer |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        DPO2U Protocol                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STARKNET (on-chain)           IPFS (off-chain)             │
│  ┌──────────────────┐          ┌─────────────────────┐      │
│  │ ComplianceRegistry│         │ Encrypted audit      │      │
│  │ ─────────────── │          │ reports (AES-256)    │      │
│  │ • evidence_hash  │◄─CID───►│                      │      │
│  │ • framework      │          │ • Full DPO identity  │      │
│  │ • validity       │          │ • CNPJ details       │      │
│  │ • issuer         │          │ • Audit methodology  │      │
│  │ • status         │          │ • Score breakdown    │      │
│  └──────────────────┘          └─────────────────────┘      │
│                                                             │
│  CAIRO PRIMITIVES                                           │
│  • Pedersen hash (native to Starknet VM)                    │
│  • STARK proofs (state integrity)                           │
│  • Low gas = frequent attestations viable                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Node.js ≥ 18
- [Scarb](https://docs.swmansion.com/scarb/) (Cairo package manager)
- Starknet wallet (Argent X or Braavos) with Sepolia ETH

### Install

```bash
git clone https://github.com/fredericosanntana/dpo2u-starknet
cd dpo2u-starknet
npm install
```

### Run the demo

```bash
npx ts-node src/scripts/demo.ts
```

Output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DPO2U Compliance Registry — Starknet Demo
  Privacy Track | Bitcoin & Privacy Hackathon 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Step 1: Building evidence commitment (OFF-CHAIN)
  ✅ Pedersen commitment: 0x2c6918debd254856...

🔍 Step 2: Verifying commitment
  Commitment valid: ✅ YES
  Tampered evidence: ✅ REJECTED

⛓️  Step 3: Calldata ready for Starknet Sepolia
```

### Deploy contract

```bash
cd contracts
scarb build
starkli declare target/dev/dpo2u_compliance_ComplianceRegistry.contract_class.json
starkli deploy <class_hash> <admin_address>
```

### Use the SDK

```typescript
import { buildEvidenceCommitment, verifyCommitment, DPO2UClient } from './src/lib/client';

// Build commitment off-chain (never send raw data on-chain)
const commitment = buildEvidenceCommitment({
  cnpjHash:    'sha256:of:your:cnpj',  // Hash it first!
  dpoDid:      'did:dpo2u:yourDPO',
  auditDate:   Math.floor(Date.now() / 1000),
  frameworkId: 1,  // 1=LGPD, 2=GDPR, 3=BOTH
  score:       87,
});

// Only commitment goes on-chain
console.log(commitment); // 0x2c6918debd254856...

// Any auditor can verify later
const valid = verifyCommitment(rawEvidence, commitment);
```

---

## Contract Functions

| Function | Access | Description |
|---|---|---|
| `attest_compliance` | Authorized issuers | Create compliance attestation |
| `revoke_attestation` | Issuer or organization | Revoke an attestation |
| `verify_compliance` | Public | Check if org is currently compliant |
| `record_processing_activity` | Any org | Record RoPA entry (LGPD Art. 37) |
| `get_attestation` | Public | Fetch attestation by ID |
| `add_authorized_issuer` | Admin only | Authorize DPOs/auditors |

---

## Why Starknet?

1. **Pedersen hash is native** — Cairo's Pedersen hash is exactly the primitive we need for commitments. No library import, no gas overhead.

2. **STARK proofs** — Every state transition is provable. Regulators can verify the entire attestation history without accessing raw data.

3. **Low fees** — LGPD requires annual attestation updates at minimum. Starknet's fee model makes frequent on-chain updates economically viable for SMEs.

4. **Composability** — Any DeFi protocol, DAO, or smart contract can call `verify_compliance()` to gate access based on regulatory status.

---

## Use Cases

- **DeFi protocols** require LGPD/GDPR compliance before onboarding Brazilian institutional clients
- **DAOs** verify member organizations' compliance status for governance participation
- **Insurance protocols** price premiums based on on-chain compliance scores
- **Government procurement** verifies supplier compliance automatically

---

## Team

**Fred Santana** — [DPO2U](https://dpo2u.com.br)
- LLM in Law, Technology & Innovation
- Postgrad in Compliance & Data Protection
- Midnight Network developer (PR merged to official ecosystem registry)
- Intersect MBO member

---

## Links

- [Demo video](#) (https://youtu.be/pFxA9D8wXtA)
- [Deployed contract on Sepolia](https://sepolia.voyager.online/contract/0x05235b085e3845b0a6f206edbc712f6d51917169b0e864177cb2321183b5fc4a)
- [DPO2U Documentation](https://docs.dpo2u.com)
- [Twitter/X](https://x.com/fredericosanntana)

---

*DPO2U — Compliance as a Protocol*  
*Making regulatory compliance composable, verifiable, and privacy-preserving.*
