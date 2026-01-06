'use strict';

const { Contract } = require('fabric-contract-api');

class MedicalRecordContract extends Contract {

    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        const records = [
            {
                patientId: 'P001',
                department: 'General',
                symptoms: 'Fever',
                diagnosis: 'Flu',
                treatment: 'Rest',
                doctorName: 'Dr. House',
                notes: 'Patient needs rest',
                timestamp: Date.now()
            }
        ];

        for (const record of records) {
            record.docType = 'record';
            await ctx.stub.putState(record.patientId, Buffer.from(JSON.stringify(record)));
            console.info(`Added <--> ${record.patientId}`);
        }
        console.info('============= END : Initialize Ledger ===========');
    }

    async createRecord(ctx, recordId, patientId, patientName, department, symptoms, diagnosis, treatment, doctorName, notes, timestamp) {
        console.info('============= START : Create Record ===========');

        const record = {
            docType: 'record',
            patientId,
            patientName,
            department,
            symptoms,
            diagnosis,
            treatment,
            doctorName,
            notes,
            timestamp
        };

        await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(record)));
        console.info('============= END : Create Record ===========');
        return JSON.stringify(record);
    }

    async queryRecord(ctx, recordId) {
        const recordAsBytes = await ctx.stub.getState(recordId);
        if (!recordAsBytes || recordAsBytes.length === 0) {
            throw new Error(`${recordId} does not exist`);
        }
        console.log(recordAsBytes.toString());
        return recordAsBytes.toString();
    }
}

module.exports = MedicalRecordContract;
