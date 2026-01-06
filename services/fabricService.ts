import { MedicalRecordData } from "../types";

// This service mocks the interaction with a Hyperledger Fabric REST API Middleware
// In a real production environment, this would call an endpoint like POST /api/fabric/invoke

export const saveToHyperledgerFabric = async (data: MedicalRecordData): Promise<string> => {
    console.log("Connecting to Hyperledger Fabric Peer (Org1)...");

    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate Chaincode Invocation
    const recordId = `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    console.log(`[Fabric Chaincode] Invoking 'createRecord' for ID: ${recordId}`);
    console.log(`[Fabric Chaincode] Payload Encrypted: ${JSON.stringify(data).substring(0, 50)}...`);

    // In a real app, we would return the Transaction ID from the Orderer
    // Here we return the generated Record ID to be stored on Sui
    return recordId;
};
