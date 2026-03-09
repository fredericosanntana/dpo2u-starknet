import { ec, RpcProvider, Account } from 'starknet';

const { pedersen } = ec.starkCurve;
const CURVE_P = BigInt('0x800000000000011000000000000000000000000000000000000000000000001');

export enum ComplianceFramework { LGPD = 0, GDPR = 1, LGPD_GDPR = 2 }
export enum AttestationStatus  { Active = 0, Revoked = 1, Expired = 2 }

export interface ComplianceEvidenceInput {
  cnpjHash:    string;
  dpoDid:      string;
  auditDate:   number;
  frameworkId: number;
  score:       number;
}

function strToFelt(s: string): bigint {
  const buf = Buffer.from(s.slice(0, 31), 'utf8');
  return BigInt('0x' + buf.toString('hex')) % CURVE_P;
}

export function buildEvidenceCommitment(ev: ComplianceEvidenceInput): string {
  let h = pedersen(strToFelt(ev.cnpjHash).toString(), strToFelt(ev.dpoDid).toString());
  h = pedersen(h, ev.auditDate.toString());
  h = pedersen(h, ev.frameworkId.toString());
  h = pedersen(h, ev.score.toString());
  return h;
}

export function verifyCommitment(ev: ComplianceEvidenceInput, expected: string): boolean {
  return buildEvidenceCommitment(ev) === expected;
}

export class DPO2UClient {
  readonly contractAddress: string;

  constructor(cfg: { contractAddress: string }) {
    this.contractAddress = cfg.contractAddress;
  }

  computeCommitment(ev: ComplianceEvidenceInput): string { return buildEvidenceCommitment(ev); }
  verify(ev: ComplianceEvidenceInput, c: string): boolean { return verifyCommitment(ev, c); }
  explorerUrl(tx: string): string { return `https://sepolia.starkscan.co/tx/${tx}`; }
  contractUrl(): string { return `https://sepolia.starkscan.co/contract/${this.contractAddress}`; }
}
