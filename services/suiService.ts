import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { WalletAccount } from '@mysten/wallet-standard';

// This would be the Package ID after deployment
const PACKAGE_ID = "0x...PLACEHOLDER_PACKAGE_ID...";
const MODULE_NAME = "record_tracking";
const FUNCTION_NAME = "create_record";

export const submitRecordToSui = async (
  signAndExecuteTransaction: any,
  recordId: string,
  dataHash: string
) => {
  try {
    const tx = new Transaction();

    // Call the Move function: create_record(record_id, data_hash, timestamp)
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::${FUNCTION_NAME}`,
      arguments: [
        tx.pure.string(recordId),
        tx.pure.string(dataHash),
        tx.pure.u64(Date.now()),
      ],
    });

    const result = await signAndExecuteTransaction({
        transaction: tx,
    }, {
        showEffects: true,
        showObjectChanges: true,
    });

    console.log("Sui Transaction Result:", result);
    return result.digest; // Return the Transaction Hash
  } catch (error) {
    console.error("Failed to submit to Sui:", error);
    // In a simulation/dev environment without a wallet, we might throw or return a mock
    throw error;
  }
};
