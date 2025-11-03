import React, { useState, useEffect, useMemo } from 'react';
import { useDocumentiManager, useFirebaseData } from 'shared-core';
import { FileUploadZone } from '../components/FileUploadZone';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

const labelStyle = "text-lg font-semibold text-gray-900";
const subLabelStyle = "text-sm text-gray-500";
const itemStyle = "flex items-center justify-between p-3 border-b";

export const StatoDocumenti = ({ 
    isOpen, 
    onClose, 
    onSave, 
    documentiRichiesti = [], // da offerta.datiAnalisi
    companyId 
}) => {
    
    const { db, storage, user } = useFirebaseData(); // Necessario per il manager
    // Inizializza il manager con il companyId corretto
    const docManager = useDocumentiManager(db, storage, user, companyId);
    
    const [companyDocs, setCompanyDocs] = useState([]);
    const [manualUploads, setManualUploads] = useState({}); // es. { durc: File, soa: File }
    const [isLoading, setIsLoading] = useState(false);

    // 1. Carica i documenti aziendali all'apertura del modal
    useEffect(() => {
        if (isOpen && companyId) {
            const fetchDocs = async () => {
                setIsLoading(true);
                const docs = await docManager.getCompanyDocuments();
                setCompanyDocs(docs);
                setIsLoading(false);
            };
            fetchDocs();
        }
    }, [isOpen, companyId]); // Ricarica se companyId o isOpen cambiano

    // 2. Logica "Proattiva": abbina i documenti richiesti con quelli trovati
    const documentiStato = useMemo(() => {
        const oggi = new Date();
        
        return documentiRichiesti.map(docRichiesto => {
            // Trova un match. Assumiamo che docRichiesto.id sia 'durc', 'soa'
            // e che i documenti aziendali abbiano un campo 'tipo' uguale.
            const foundDoc = companyDocs.find(
                doc => doc.tipo === docRichiesto.id
            );
            
            let status = 'missing';
            if (foundDoc) {
                if (foundDoc.scadenza && foundDoc.scadenza > oggi) {
                    status = 'found';
                } else {
                    status = 'expired';
                }
            }
            
            return {
                ...docRichiesto, // id, label
                status,          // 'missing', 'expired', 'found'
                foundDoc: status === 'found' ? foundDoc : null
            };
        });
    }, [documentiRichiesti, companyDocs]);

    // 3. Handler per i caricamenti manuali
    const handleManualUpload = (docId, files) => {
        if (files.length > 0) {
            setManualUploads(prev => ({
                ...prev,
                [docId]: files[0] // Salva il File, non l'array
            }));
        }
    };

    // 4. Handler per il salvataggio
    const handleSaveClick = () => {
        // Raccogli i documenti trovati
        const automatici = documentiStato
            .filter(d => d.status === 'found')
            .map(d => d.foundDoc); // Array di oggetti Doc
            
        // I file manuali sono già in 'manualUploads'
        onSave({ 
            automatici: automatici, 
            manualiFiles: manualUploads // Oggetto { docId: File }
        });
    };

    if (!isOpen) return null;

    // --- JSX del Modal ---
    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-900">Stato Documenti di Gara</h2>
                    <p className={subLabelStyle}>Il sistema verifica i documenti aziendali. Carica manualmente quelli mancanti.</p>
                </div>

                {/* Corpo (scrollabile) */}
                <div className="p-4 overflow-y-auto">
                    {isLoading ? (
                        <p>Caricamento documenti aziendali...</p>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {documentiStato.map(doc => {
                                const isFound = doc.status === 'found';
                                const isMissing = doc.status === 'missing';
                                const isExpired = doc.status === 'expired';
                                const fileCaricato = manualUploads[doc.id];
                                
                                return (
                                    <li key={doc.id} className="py-4">
                                        <div className={itemStyle}>
                                            {/* Info Documento */}
                                            <div className="flex-1">
                                                {isFound ? (
                                                    <CheckCircleIcon className="h-6 w-6 text-green-500 inline-block mr-2" />
                                                ) : (
                                                    <XCircleIcon className="h-6 w-6 text-red-500 inline-block mr-2" />
                                                )}
                                                <span className={labelStyle}>{doc.label}</span>
                                                {isFound && (
                                                    <p className={`${subLabelStyle} ml-8`}>
                                                        Trovato: {doc.foundDoc.nome} (Scade il: {doc.foundDoc.scadenza.toLocaleDateString()})
                                                    </p>
                                                )}
                                                {isExpired && <p className={`${subLabelStyle} ml-8 text-red-600`}>Trovato, ma scaduto.</p>}
                                                {isMissing && <p className={`${subLabelStyle} ml-8 text-red-600`}>Non trovato nei documenti aziendali.</p>}
                                            </div>
                                            
                                            {/* Zona Upload (se non trovato) */}
                                            {!isFound && (
                                                <div className="w-1/2 ml-4">
                                                    {fileCaricato ? (
                                                        <div className="p-3 bg-green-100 text-green-800 rounded-md text-sm">
                                                            Pronto per il caricamento: {fileCaricato.name}
                                                        </div>
                                                    ) : (
                                                        <FileUploadZone 
                                                            label={`Carica ${doc.label} (Manuale)`}
                                                            onFilesSelected={(files) => handleManualUpload(doc.id, files)}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Footer Pulsanti */}
                <div className="flex justify-end gap-4 mt-auto border-t p-4 bg-gray-50">
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    >
                        Annulla
                    </button>
                    <button 
                        type="button"
                        onClick={handleSaveClick}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Salva Stato Documenti
                    </button>
                </div>
            </div>
        </div>
    );
};