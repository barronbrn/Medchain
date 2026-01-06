module medchain::record_tracking {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use std::string::{String};

    /// Struct to represent a Medical Record "Proof" on Sui
    /// We do not store the actual data here (privacy), only the reference to Fabric.
    struct MedicalRecordProof has key, store {
        id: UID,
        record_id: String,     // ID from Hyperledger Fabric
        data_hash: String,     // SHA-256 Hash of the data (Integrity Check)
        timestamp: u64,
        recorder: address,     // Address of the doctor/hospital
    }

    /// Event emitted when a new record is added
    struct RecordAdded has copy, drop {
        record_id: String,
        recorder: address,
        timestamp: u64
    }

    /// Function to create a new record proof
    public entry fun create_record(
        record_id: String,
        data_hash: String,
        timestamp: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);

        let proof = MedicalRecordProof {
            id: object::new(ctx),
            record_id: record_id,
            data_hash: data_hash,
            timestamp: timestamp,
            recorder: sender,
        };

        // Emit event for indexers
        event::emit(RecordAdded {
            record_id: proof.record_id,
            recorder: sender,
            timestamp: timestamp
        });

        // Transfer the proof object to the sender (or could be shared object)
        transfer::public_transfer(proof, sender);
    }
}
