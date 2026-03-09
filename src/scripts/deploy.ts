/**
 * DPO2U — Deploy script for Starknet Sepolia
 *
 * Prerequisites:
 *   1. Compile contract: cd contracts && scarb build
 *   2. Set env vars: ACCOUNT_ADDRESS, PRIVATE_KEY
 *   3. Run: npx ts-node src/scripts/deploy.ts
 *
 * The script declares + deploys ComplianceRegistry
 * and prints the contract address for use in the demo.
 */

import * as fs from 'fs';
import * as path from 'path';
import { RpcProvider, Account, CallData } from 'starknet';

const RPC_URL = process.env.STARKNET_RPC_URL ?? 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/demo';

async function main() {
  const accountAddress = process.env.ACCOUNT_ADDRESS;
  const privateKey     = process.env.PRIVATE_KEY;

  if (!accountAddress || !privateKey) {
    console.error('❌ Set ACCOUNT_ADDRESS and PRIVATE_KEY env vars');
    console.error('   export ACCOUNT_ADDRESS=0x...');
    console.error('   export PRIVATE_KEY=0x...');
    process.exit(1);
  }

  console.log('\n🚀 DPO2U Compliance Registry — Deploy to Starknet Sepolia\n');

  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const account  = new Account({ provider, address: accountAddress, signer: privateKey } as any);

  // ── Load compiled contract ────────────────────────────────────────────────

  const contractPath = path.join(
    __dirname, '../../contracts/target/dev',
    'dpo2u_compliance_ComplianceRegistry.contract_class.json'
  );

  if (!fs.existsSync(contractPath)) {
    console.error('❌ Contract not compiled. Run: cd contracts && scarb build');
    process.exit(1);
  }

  const contractClass = JSON.parse(fs.readFileSync(contractPath, 'utf-8'));
  console.log('✅ Contract class loaded');

  // ── Declare ───────────────────────────────────────────────────────────────

  console.log('📝 Declaring contract class...');
  const { class_hash, transaction_hash: declareTx } = await account.declare({
    contract: contractClass,
  } as any);

  console.log(`   Class hash: ${class_hash}`);
  console.log(`   Declare tx: ${declareTx}`);

  await provider.waitForTransaction(declareTx);
  console.log('✅ Contract declared\n');

  // ── Deploy ────────────────────────────────────────────────────────────────

  console.log('🏗️  Deploying contract...');
  const constructorCalldata = CallData.compile({ admin: accountAddress });

  const { contract_address, transaction_hash: deployTx } = await account.deploy({
    classHash:           class_hash,
    constructorCalldata,
  } as any);

  console.log(`   Contract address: ${contract_address}`);
  console.log(`   Deploy tx:        ${deployTx}`);

  await provider.waitForTransaction(deployTx);

  console.log('\n✅ Deployment complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  CONTRACT_ADDRESS=${contract_address}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n  Explorer: https://sepolia.starkscan.co/contract/${contract_address}\n`);
  console.log('  Next steps:');
  console.log(`  export CONTRACT_ADDRESS=${contract_address}`);
  console.log('  npx ts-node src/scripts/demo.ts\n');
}

main().catch((e) => {
  console.error('Deploy failed:', e.message);
  process.exit(1);
});
