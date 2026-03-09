// DPO2U Compliance Registry — Starknet
// Privacy Track: Bitcoin & Privacy Hackathon 2026
//
// Concept: Organizations prove LGPD/GDPR compliance on-chain
// WITHOUT revealing underlying personal data (selective disclosure).
// A Pedersen hash commitment represents a compliance state —
// the underlying data never touches the chain.
//
// Regulatory mapping:
//   LGPD Art. 37  → audit trail (on-chain attestation log)
//   LGPD Art. 46  → security measures (hash commitment = privacy by design)
//   GDPR Art. 25  → data protection by design and by default

use starknet::ContractAddress;
use starknet::get_caller_address;
use starknet::get_block_timestamp;

// ─── Enums ───────────────────────────────────────────────────────────────────

#[derive(Drop, Serde, starknet::Store, PartialEq, Copy)]
enum ComplianceFramework {
    LGPD,      // Lei Geral de Proteção de Dados (Brazil)
    GDPR,      // General Data Protection Regulation (EU)
    LGPD_GDPR, // Dual compliance
}

#[derive(Drop, Serde, starknet::Store, PartialEq, Copy)]
enum AttestationStatus {
    Active,
    Revoked,
    Expired,
}

// ─── Structs ─────────────────────────────────────────────────────────────────

#[derive(Drop, Serde, starknet::Store)]
struct ComplianceAttestation {
    // The organization being attested
    organization: ContractAddress,
    // Pedersen hash of compliance evidence (NEVER raw data on-chain)
    // Hash inputs: [org_cnpj_hash, dpo_did_hash, audit_date, framework_id, score]
    evidence_commitment: felt252,
    // Which framework this attestation covers
    framework: ComplianceFramework,
    // UNIX timestamp of attestation
    issued_at: u64,
    // UNIX timestamp of expiry (typically issued_at + 31536000 = 1 year)
    expires_at: u64,
    // Who issued this attestation (DPO, auditor, or self-attestation)
    issuer: ContractAddress,
    // Current status
    status: AttestationStatus,
    // IPFS CID of the full encrypted audit report (off-chain)
    // On-chain we store only the CID pointer — not the content
    audit_report_cid: felt252,
}

#[derive(Drop, Serde, starknet::Store)]
struct DataProcessingRecord {
    // Organization recording this processing activity
    organization: ContractAddress,
    // Hash of: [purpose, legal_basis, data_categories, retention_period]
    // Maps to LGPD Art. 37 / GDPR Art. 30 Record of Processing Activities
    record_commitment: felt252,
    // Timestamp
    recorded_at: u64,
    // IPFS CID of full RoPA record (encrypted, off-chain)
    ropa_cid: felt252,
}

// ─── Interface ────────────────────────────────────────────────────────────────

#[starknet::interface]
trait IComplianceRegistry<TContractState> {
    // Attest compliance for an organization
    fn attest_compliance(
        ref self: TContractState,
        organization: ContractAddress,
        evidence_commitment: felt252,
        framework: ComplianceFramework,
        validity_days: u64,
        audit_report_cid: felt252,
    ) -> u256;

    // Revoke an attestation (issuer or organization only)
    fn revoke_attestation(ref self: TContractState, attestation_id: u256);

    // Record a data processing activity (LGPD Art. 37 / GDPR Art. 30)
    fn record_processing_activity(
        ref self: TContractState,
        record_commitment: felt252,
        ropa_cid: felt252,
    ) -> u256;

    // Verify if an organization is currently compliant
    fn verify_compliance(
        self: @TContractState,
        organization: ContractAddress,
        framework: ComplianceFramework,
    ) -> bool;

    // Get attestation details
    fn get_attestation(
        self: @TContractState,
        attestation_id: u256,
    ) -> ComplianceAttestation;

    // Get latest attestation ID for an organization
    fn get_latest_attestation_id(
        self: @TContractState,
        organization: ContractAddress,
        framework: ComplianceFramework,
    ) -> u256;

    // Get total number of attestations
    fn get_attestation_count(self: @TContractState) -> u256;

    // Check if an address is an authorized issuer
    fn is_authorized_issuer(self: @TContractState, issuer: ContractAddress) -> bool;

    // Add authorized issuer (admin only)
    fn add_authorized_issuer(ref self: TContractState, issuer: ContractAddress);

    // Get admin address
    fn get_admin(self: @TContractState) -> ContractAddress;
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[starknet::contract]
mod ComplianceRegistry {
    use super::{
        ComplianceAttestation, DataProcessingRecord,
        ComplianceFramework, AttestationStatus, IComplianceRegistry
    };
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use starknet::get_block_timestamp;

    // ─── Storage ─────────────────────────────────────────────────────────────

    #[storage]
    struct Storage {
        // Admin address (DPO2U protocol)
        admin: ContractAddress,

        // Total attestation counter
        attestation_count: u256,

        // attestation_id => ComplianceAttestation
        attestations: starknet::storage::Map<u256, ComplianceAttestation>,

        // organization => framework => latest_attestation_id
        latest_attestation: starknet::storage::Map<
            (ContractAddress, felt252),
            u256
        >,

        // Total processing record counter
        record_count: u256,

        // record_id => DataProcessingRecord
        processing_records: starknet::storage::Map<u256, DataProcessingRecord>,

        // Authorized issuers (DPOs, auditors)
        authorized_issuers: starknet::storage::Map<ContractAddress, bool>,
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        AttestationCreated: AttestationCreated,
        AttestationRevoked: AttestationRevoked,
        ProcessingRecorded: ProcessingRecorded,
        IssuerAuthorized: IssuerAuthorized,
    }

    #[derive(Drop, starknet::Event)]
    struct AttestationCreated {
        #[key]
        attestation_id: u256,
        #[key]
        organization: ContractAddress,
        framework: felt252,
        issued_at: u64,
        expires_at: u64,
        issuer: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct AttestationRevoked {
        #[key]
        attestation_id: u256,
        revoked_by: ContractAddress,
        revoked_at: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct ProcessingRecorded {
        #[key]
        record_id: u256,
        #[key]
        organization: ContractAddress,
        recorded_at: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct IssuerAuthorized {
        #[key]
        issuer: ContractAddress,
        authorized_by: ContractAddress,
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress) {
        self.admin.write(admin);
        self.attestation_count.write(0);
        self.record_count.write(0);
        // Admin is always an authorized issuer
        self.authorized_issuers.write(admin, true);
    }

    // ─── Implementation ───────────────────────────────────────────────────────

    #[abi(embed_v0)]
    impl ComplianceRegistryImpl of IComplianceRegistry<ContractState> {

        fn attest_compliance(
            ref self: ContractState,
            organization: ContractAddress,
            evidence_commitment: felt252,
            framework: ComplianceFramework,
            validity_days: u64,
            audit_report_cid: felt252,
        ) -> u256 {
            let caller = get_caller_address();

            // Only authorized issuers can attest
            assert(
                self.authorized_issuers.read(caller),
                'DPO2U: unauthorized issuer'
            );

            let now = get_block_timestamp();
            let expires_at = now + (validity_days * 86400_u64);

            let new_id = self.attestation_count.read() + 1;

            let attestation = ComplianceAttestation {
                organization,
                evidence_commitment,
                framework,
                issued_at: now,
                expires_at,
                issuer: caller,
                status: AttestationStatus::Active,
                audit_report_cid,
            };

            self.attestations.write(new_id, attestation);
            self.attestation_count.write(new_id);

            // Map framework to felt for storage key
            let framework_key = self._framework_to_felt(framework);
            self.latest_attestation.write((organization, framework_key), new_id);

            self.emit(AttestationCreated {
                attestation_id: new_id,
                organization,
                framework: framework_key,
                issued_at: now,
                expires_at,
                issuer: caller,
            });

            new_id
        }

        fn revoke_attestation(ref self: ContractState, attestation_id: u256) {
            let caller = get_caller_address();
            let mut attestation = self.attestations.read(attestation_id);

            // Only issuer or organization can revoke
            assert(
                caller == attestation.issuer || caller == attestation.organization,
                'DPO2U: unauthorized revocation'
            );
            assert(
                attestation.status == AttestationStatus::Active,
                'DPO2U: not active'
            );

            attestation.status = AttestationStatus::Revoked;
            self.attestations.write(attestation_id, attestation);

            self.emit(AttestationRevoked {
                attestation_id,
                revoked_by: caller,
                revoked_at: get_block_timestamp(),
            });
        }

        fn record_processing_activity(
            ref self: ContractState,
            record_commitment: felt252,
            ropa_cid: felt252,
        ) -> u256 {
            let caller = get_caller_address();
            let now = get_block_timestamp();

            let new_id = self.record_count.read() + 1;

            let record = DataProcessingRecord {
                organization: caller,
                record_commitment,
                recorded_at: now,
                ropa_cid,
            };

            self.processing_records.write(new_id, record);
            self.record_count.write(new_id);

            self.emit(ProcessingRecorded {
                record_id: new_id,
                organization: caller,
                recorded_at: now,
            });

            new_id
        }

        fn verify_compliance(
            self: @ContractState,
            organization: ContractAddress,
            framework: ComplianceFramework,
        ) -> bool {
            let framework_key = self._framework_to_felt(framework);
            let latest_id = self.latest_attestation.read((organization, framework_key));

            if latest_id == 0 {
                return false;
            }

            let attestation = self.attestations.read(latest_id);
            let now = get_block_timestamp();

            attestation.status == AttestationStatus::Active
                && attestation.expires_at > now
        }

        fn get_attestation(
            self: @ContractState,
            attestation_id: u256,
        ) -> ComplianceAttestation {
            self.attestations.read(attestation_id)
        }

        fn get_latest_attestation_id(
            self: @ContractState,
            organization: ContractAddress,
            framework: ComplianceFramework,
        ) -> u256 {
            let framework_key = self._framework_to_felt(framework);
            self.latest_attestation.read((organization, framework_key))
        }

        fn get_attestation_count(self: @ContractState) -> u256 {
            self.attestation_count.read()
        }

        fn is_authorized_issuer(self: @ContractState, issuer: ContractAddress) -> bool {
            self.authorized_issuers.read(issuer)
        }

        fn add_authorized_issuer(ref self: ContractState, issuer: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'DPO2U: admin only');

            self.authorized_issuers.write(issuer, true);

            self.emit(IssuerAuthorized {
                issuer,
                authorized_by: caller,
            });
        }

        fn get_admin(self: @ContractState) -> ContractAddress {
            self.admin.read()
        }
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _framework_to_felt(self: @ContractState, framework: ComplianceFramework) -> felt252 {
            match framework {
                ComplianceFramework::LGPD => 1,
                ComplianceFramework::GDPR => 2,
                ComplianceFramework::LGPD_GDPR => 3,
            }
        }
    }
}
