// packages/shared-ui/components/StatoDocumenti.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useDocumentiManager, useFirebaseData } from 'shared-core';
import { FileUploadZone } from '../components/FileUploadZone';
import { DocumentCheckIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as SolidCheckCircle, XCircleIcon as SolidXCircle } from '@heroicons/react/24/solid';

export const StatoDocumenti = ({ 
    isOpen, 
    onClose, 
    onSave, 
    documentiRichiesti = [], // Ora è un array di stringhe! Es: ["DGUE", "DURC"]
    companyId 
}) => {
    
    const { db, storage, user } = useFirebaseData(); 
    const docManager = useDocumentiManager(db, storage, user, companyId);
    
    const [companyDocs, setCompanyDocs] = useState([]);
    const [manualUploads, setManualUploads] = useState({}); 
    const [isLoading, setIsLoading] = useState(false);

    // 1. Carica i documenti aziendali all'apertura del modal
    useEffect(() => {
        if (isOpen && companyId) {
            const fetchDocs = async () => {
                setIsLoading(true);
                const docs = await docManager.getCompanyDocuments();
                setCompanyDocs(docs || []);
                setIsLoading(false);
            };
            fetchDocs();
        }
    }, [isOpen, companyId]);

    // 2. Logica "Proattiva": abbina i nomi spuntati con i file nel DB aziendale
    const documentiStato = useMemo(() => {
        const oggi = new Date();
        
        return (documentiRichiesti || []).map((docName, index) => {
            // Cerchiamo un match per Titolo, Nome o Tipo
            const foundDoc = companyDocs.find(
                doc => doc.titolo === docName || doc.nomeFile === docName || doc.tipo === docName
            );
            
            let status = 'missing';
            if (foundDoc) {
                if (foundDoc.dataScadenza) {
                    const scadenza = new Date(foundDoc.dataScadenza);
                    status = scadenza > oggi ? 'found' : 'expired';
                } else {
                    // Se non ha scadenza, è valido per sempre (es. statuto)
                    status = 'found'; 
                }
            }
            
            return {
                id: `doc_${index}_${docName.replace(/\s+/g, '')}`, // ✅ KEY UNICA RISOLTA PER REACT
                name: docName,
                status,          
                foundDoc: status === 'found' ? foundDoc : null
            };
        });
    }, [documentiRichiesti, companyDocs]);

    // 3. Handler per i caricamenti manuali (Dropzone)
    const handleManualUpload = (docId, files) => {
        if (files && files.length > 0) {
            setManualUploads(prev => ({
                ...prev,
                [docId]: files[0] 
            }));
        }
    };

    // 4. Salva e passa i dati alla Fase 2
    const handleSaveClick = () => {
        const automatici = documentiStato
            .filter(d => d.status === 'found' && d.foundDoc)
            .map(d => d.foundDoc); 
            
        onSave({ 
            automatici: automatici, 
            manualiFiles: manualUploads 
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                
                {/* --- HEADER --- */}
                <div className="bg-indigo-600 p-6 text-white shrink-0">
                    <h2 className="text-2xl font-black flex items-center gap-2">
                        <DocumentCheckIcon className="h-8 w-8 text-indigo-200" /> Verifica Documenti di Gara
                    </h2>
                    <p className="text-indigo-100 mt-1 font-medium text-sm">
                        Il sistema cerca automaticamente nel tuo archivio aziendale i documenti richiesti per questa gara. Carica manualmente quelli mancanti o specifici.
                    </p>
                </div>

                {/* --- CORPO SCROLLABILE --- */}
                <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-3"></div>
                            <p className="text-slate-500 font-bold">Ricerca nell'archivio aziendale in corso...</p>
                        </div>
                    ) : documentiStato.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-slate-500 font-bold text-lg">Nessun documento richiesto.</p>
                            <p className="text-sm text-slate-400 mt-1">Puoi aggiungerli tornando alla Fase 1 (Analisi Preliminare).</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {documentiStato.map(doc => {
                                const isFound = doc.status === 'found';
                                const isMissing = doc.status === 'missing';
                                const isExpired = doc.status === 'expired';
                                const fileCaricato = manualUploads[doc.id];
                                
                                return (
                                    <div key={doc.id} className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${isFound ? 'border-green-200' : isExpired ? 'border-red-200' : 'border-slate-200'}`}>
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            
                                            {/* Info Documento */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    {isFound ? (
                                                        <SolidCheckCircle className="h-6 w-6 text-green-500 shrink-0" />
                                                    ) : (
                                                        <SolidXCircle className="h-6 w-6 text-amber-500 shrink-0" />
                                                    )}
                                                    <span className="text-lg font-bold text-slate-800">{doc.name}</span>
                                                </div>
                                                
                                                <div className="ml-9 mt-1">
                                                    {isFound && (
                                                        <p className="text-sm text-green-700 font-medium">
                                                            <span className="font-bold">✓ Trovato in archivio:</span> {doc.foundDoc.nomeFile || doc.foundDoc.titolo} 
                                                            {doc.foundDoc.dataScadenza && ` (Scadenza: ${new Date(doc.dataScadenza).toLocaleDateString('it-IT')})`}
                                                        </p>
                                                    )}
                                                    {isExpired && (
                                                        <p className="text-sm text-red-600 font-medium">
                                                            <span className="font-bold">⚠ Trovato ma SCADUTO:</span> {doc.foundDoc.nomeFile || doc.foundDoc.titolo}
                                                        </p>
                                                    )}
                                                    {isMissing && (
                                                        <p className="text-sm text-amber-600 font-medium">
                                                            Non trovato nell'archivio aziendale. Richiesto caricamento manuale.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Zona Upload (se non trovato o scaduto) */}
                                            {!isFound && (
                                                <div className="w-full md:w-1/3 shrink-0">
                                                    {fileCaricato ? (
                                                        <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-xl text-xs font-bold flex items-center justify-between">
                                                            <span className="truncate pr-2">📎 {fileCaricato.name}</span>
                                                            <button onClick={() => setManualUploads(prev => { const newU = {...prev}; delete newU[doc.id]; return newU; })} className="text-indigo-400 hover:text-red-500 transition-colors">✕</button>
                                                        </div>
                                                    ) : (
                                                        <FileUploadZone 
                                                            label={`Allega file...`}
                                                            onFilesSelected={(files) => handleManualUpload(doc.id, files)}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* --- FOOTER PULSANTI --- */}
                <div className="bg-white border-t border-slate-200 p-5 flex justify-end gap-3 shrink-0">
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        Annulla
                    </button>
                    <button 
                        type="button"
                        onClick={handleSaveClick}
                        className="px-8 py-2.5 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
                    >
                        Conferma Documentazione
                    </button>
                </div>
            </div>
        </div>
    );
};