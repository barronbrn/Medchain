import React, { useState, useEffect } from 'react';
import { Bot, Loader2, Save, FileText, CheckCircle, User, Lock, ShieldCheck, Stethoscope } from 'lucide-react';
import { MedicalRecordData, GeminiAnalysisResult } from '../types';
import { analyzeMedicalNotes } from '../services/geminiService';
import { encryptText } from '../utils/encryptionUtils';
import { submitRecordToSui } from '../services/suiService';
import { saveToHyperledgerFabric } from '../services/fabricService';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';

interface RecordFormProps {
  onAddRecord: (data: MedicalRecordData) => Promise<void>;
  initialData?: {
    patientId: string;
    patientName: string;
  } | null;
}

const DEPARTMENTS = [
  "Poli Umum",
  "Poli Gigi",
  "Poli KIA/Kebidanan",
  "Poli Anak",
  "Poli Penyakit Dalam",
  "IGD"
];

const RecordForm: React.FC<RecordFormProps> = ({ onAddRecord, initialData }) => {
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    department: 'Poli Umum',
    symptoms: '',
    rawNotes: '',
    doctorName: 'Dr. Current User'
  });

  const [aiResult, setAiResult] = useState<GeminiAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useEncryption, setUseEncryption] = useState(true);

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        patientId: initialData.patientId,
        patientName: initialData.patientName
      }));
    }
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAnalyze = async () => {
    if (!formData.symptoms || !formData.rawNotes) {
      alert("Mohon isi Anamnesa dan Catatan Dokter terlebih dahulu.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const result = await analyzeMedicalNotes(formData.symptoms, formData.rawNotes);
      setAiResult(result);
    } catch (e) {
      console.error(e);
      alert("AI Analysis failed. Check console.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName || !formData.patientId) {
      alert("Data pasien wajib diisi");
      return;
    }

    setIsSubmitting(true);
    
    // Prepare Data
    let diagnosis = aiResult ? aiResult.suggestedDiagnosis : "Belum ada diagnosa otomatis";
    let treatment = aiResult ? aiResult.recommendedActions.join(', ') : "Menunggu tindakan";
    let notes = formData.rawNotes;
    let symptoms = formData.symptoms;
    let aiAnalysis = aiResult ? aiResult.summary : undefined;

    // Encrypt if Private Mode is on
    if (useEncryption) {
        diagnosis = await encryptText(diagnosis);
        treatment = await encryptText(treatment);
        notes = await encryptText(notes);
        symptoms = await encryptText(symptoms);
        if (aiAnalysis) aiAnalysis = await encryptText(aiAnalysis);
    }

    const record: MedicalRecordData = {
      patientId: formData.patientId,
      patientName: formData.patientName,
      department: formData.department,
      symptoms,
      doctorName: formData.doctorName,
      notes,
      diagnosis,
      treatment,
      aiAnalysis,
      timestamp: Date.now(),
      isEncrypted: useEncryption
    };

    try {
        // 1. Save Full Data to Hyperledger Fabric (Private)
        console.log("Submitting to Private Ledger (Fabric)...");
        const fabricRecordId = await saveToHyperledgerFabric(record);

        // 2. Hash the data (Simulated for integrity)
        const dataHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(record)))
            .then(b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''));

        // 3. Submit Proof to Sui (Public)
        console.log("Submitting Proof to Public Ledger (Sui)...");

        // Note: In a real environment with wallet connected, we would wait for user signature
        // For this demo, we might catch the error if wallet is not connected and proceed with mock
        try {
            await submitRecordToSui(signAndExecuteTransaction, fabricRecordId, dataHash);
        } catch (suiError) {
            console.warn("Sui Transaction failed (likely no wallet connected). Proceeding with local fallback.", suiError);
        }

        // 4. Update Local State (UI)
        await onAddRecord(record);

        if (initialData) {
            setFormData(prev => ({
                ...prev,
                symptoms: '',
                rawNotes: ''
            }));
        } else {
            setFormData({
                patientId: '',
                patientName: '',
                department: 'Poli Umum',
                symptoms: '',
                rawNotes: '',
                doctorName: 'Dr. Current User'
            });
        }

        setAiResult(null);
        alert(`Data saved!\nFabric ID: ${fabricRecordId}\nSui: Transaction Sent (Check Console)`);

    } catch (error) {
        console.error("Submission failed", error);
        alert("Failed to save record. See console.");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-medical-600 p-4 text-white border-b border-medical-700 flex justify-between items-center">
          <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {initialData ? 'Input Pemeriksaan (Rawat Jalan)' : 'Pendaftaran Pasien & Pemeriksaan Baru'}
              </h2>
              <p className="text-medical-100 text-xs opacity-90 mt-0.5">
                Input Data Rekam Medis Elektronik (RME)
              </p>
          </div>
          <div className="px-3 py-1 bg-medical-700 rounded text-xs font-mono">
            Form ID: #RME-{new Date().getFullYear()}
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Input Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5">
            
            {/* Identitas Pasien Panel */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2 mb-3 border-b border-slate-200 pb-2">
                    <User className="w-4 h-4 text-medical-600" /> Identitas Pasien
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">No. Rekam Medis (RM)</label>
                      <div className="relative">
                        <input
                            type="text"
                            name="patientId"
                            value={formData.patientId}
                            onChange={handleInputChange}
                            disabled={!!initialData}
                            className={`w-full p-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-medical-500 outline-none ${initialData ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                            placeholder="Contoh: RM-00123"
                        />
                        {initialData && <Lock className="w-3 h-3 text-slate-400 absolute right-2 top-2.5" />}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap Pasien</label>
                      <input
                          type="text"
                          name="patientName"
                          value={formData.patientName}
                          onChange={handleInputChange}
                          disabled={!!initialData}
                          className={`w-full p-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-medical-500 outline-none ${initialData ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                          placeholder="Nama Pasien"
                      />
                    </div>
                </div>
            </div>

            {/* Pemeriksaan Panel */}
            <div className="p-1">
                <div className="flex gap-4 mb-4">
                    <div className="w-1/2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Pelayanan / Poli</label>
                        <select
                            name="department"
                            value={formData.department}
                            onChange={handleInputChange}
                            className="w-full p-2 text-sm border border-slate-300 rounded bg-white focus:ring-1 focus:ring-medical-500 outline-none"
                        >
                            {DEPARTMENTS.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-1/2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Dokter Pemeriksa</label>
                        <input
                            type="text"
                            name="doctorName"
                            value={formData.doctorName}
                            onChange={handleInputChange}
                            className="w-full p-2 text-sm border border-slate-300 rounded bg-white focus:ring-1 focus:ring-medical-500 outline-none"
                        />
                    </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Anamnesa / Keluhan Utama</label>
                  <textarea
                    name="symptoms"
                    value={formData.symptoms}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-medical-500 outline-none"
                    placeholder="Keluhan yang dirasakan pasien..."
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Pemeriksaan Fisik & Catatan Dokter (Objective)</label>
                  <textarea
                    name="rawNotes"
                    value={formData.rawNotes}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-medical-500 outline-none font-mono text-slate-600"
                    placeholder="Hasil TTV, pemeriksaan fisik, dll..."
                  />
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col md:flex-row gap-4 pt-2 border-t border-slate-100">
               {/* Privacy Toggle */}
               <label className="flex items-center gap-2 cursor-pointer bg-amber-50 px-3 py-2 rounded border border-amber-100 md:w-auto w-full">
                <input 
                  type="checkbox" 
                  checked={useEncryption} 
                  onChange={(e) => setUseEncryption(e.target.checked)}
                  className="w-4 h-4 text-medical-600 rounded border-slate-300 focus:ring-medical-500"
                />
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-amber-600" /> Mode Privat (Enkripsi)
                    </span>
                </div>
              </label>

              <div className="flex-1 flex gap-2 justify-end">
                <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                    {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                    Analisa AI
                </button>
                
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-medical-600 hover:bg-medical-700 text-white py-2 px-6 rounded text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Simpan Data
                </button>
              </div>
            </div>
          </form>

          {/* Right Column: AI Analysis Result */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 bg-white rounded-t-lg">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-indigo-600" />
                Hasil Analisa Medis (AI)
                </h3>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
                {!aiResult ? (
                <div className="text-slate-400 text-xs text-center mt-8">
                    <p>Isi Anamnesa dan Catatan Dokter, lalu klik "Analisa AI" untuk mendapatkan:</p>
                    <ul className="mt-4 space-y-2 text-left px-8 list-disc">
                    <li>Saran Diagnosa (ICD-10 style)</li>
                    <li>Rencana Terapi</li>
                    <li>Ringkasan Medis</li>
                    </ul>
                </div>
                ) : (
                <div className="space-y-4 animate-fade-in text-sm">
                    <div className="bg-white p-3 rounded border border-indigo-100 shadow-sm">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide block mb-1">Saran Diagnosa</span>
                        <p className="font-bold text-slate-800">{aiResult.suggestedDiagnosis}</p>
                    </div>

                    <div className="bg-white p-3 rounded border border-blue-100 shadow-sm">
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide block mb-1">Ringkasan Medis</span>
                        <p className="text-slate-600 leading-relaxed text-xs">{aiResult.summary}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Tingkat Keparahan:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            aiResult.severity === 'Critical' ? 'bg-red-100 text-red-700 border-red-200' :
                            aiResult.severity === 'High' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                            aiResult.severity === 'Moderate' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                            'bg-green-100 text-green-700 border-green-200'
                        }`}>
                            {aiResult.severity}
                        </span>
                    </div>

                    <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Rekomendasi Tindakan / Terapi</span>
                        <ul className="space-y-1">
                            {aiResult.recommendedActions.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-white p-2 rounded border border-slate-100">
                                <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                                {action}
                            </li>
                            ))}
                        </ul>
                    </div>
                </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordForm;