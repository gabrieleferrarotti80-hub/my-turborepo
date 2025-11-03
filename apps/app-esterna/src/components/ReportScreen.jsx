import React, { useState, useEffect, useMemo } from 'react';
import FormRenderer from './FormRenderer';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useFirebaseData } from 'shared-core';

export const ReportScreen = ({ onBack }) => { 
    // ✅ 1. Recupera ANCHE 'forms' e 'aziendeForm' dal contesto
    const { db, userAziendaId, cantieri, user, forms, aziendeForm } = useFirebaseData();
    
    const [selectedCantiereId, setSelectedCantiereId] = useState('');
    const [prepostiList, setPrepostiList] = useState([]);
    const [loadingPreposti, setLoadingPreposti] = useState(true);

    // ✅ 2. Aggiunta la logica di filtro per calcolare i template disponibili
    const availableTemplates = useMemo(() => {
        console.log("--- DEBUG TEMPLATE ---");
    console.log("1. Catalogo completo ricevuto (forms):", forms);
    console.log("2. Permessi ricevuti (aziendeForm):", aziendeForm);
        if (!aziendeForm || !forms) return [];
        console.log("RISULTATO: Esco perché uno degli array è vuoto.");
        console.log("--- FINE DEBUG ---");
        const authorizedFormIds = aziendeForm.map(auth => auth.formId);
        console.log("3. ID dei form autorizzati estratti:", authorizedFormIds);

        return forms.filter(form => authorizedFormIds.includes(form.id));
        console.log("4. Risultato finale del filtro:", filteredForms);
    console.log("--- FINE DEBUG ---");
    }, [forms, aziendeForm]);

    useEffect(() => {
        if (cantieri && cantieri.length > 0) {
            setSelectedCantiereId(cantieri[0].id);
        } else {
            setSelectedCantiereId('');
        }
    }, [cantieri]);

    // La logica per recuperare il preposto rimane invariata
    useEffect(() => {
        if (!db || !selectedCantiereId) {
            setLoadingPreposti(false);
            setPrepostiList([]);
            return;
        }

        const fetchPreposto = async () => {
            setLoadingPreposti(true);
            try {
                const assegnazioneRef = collection(db, 'assegnazioneCantieri');
                const q = query(assegnazioneRef, where('cantiereId', '==', selectedCantiereId));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    setPrepostiList([]);
                } else {
                    const prepostoId = querySnapshot.docs[0].data().prepostoId;
                    const prepostoDocRef = doc(db, 'users', prepostoId);
                    const prepostoDoc = await getDoc(prepostoDocRef);
                    if (prepostoDoc.exists()) {
                        setPrepostiList([{ id: prepostoDoc.id, ...prepostoDoc.data() }]);
                    } else {
                        setPrepostiList([]);
                    }
                }
            } catch (error) {
                console.error("Errore nel recupero del preposto:", error);
                setPrepostiList([]);
            } finally {
                setLoadingPreposti(false);
            }
        };

        fetchPreposto();
    }, [db, selectedCantiereId]);
    
    const selectedPreposto = prepostiList[0] || null;

    return (
        <div className="flex flex-col h-full p-4">
            <div className="mb-4">
                <button 
                    onClick={onBack} 
                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full"
                >
                    Torna Indietro
                </button>
            </div>

            <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Selettore Cantiere */}
                <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700">Seleziona Cantiere:</label>
                    <select
                        value={selectedCantiereId}
                        onChange={(e) => setSelectedCantiereId(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                    >
                        {(cantieri || []).map(cantiere => (
                            <option key={cantiere.id} value={cantiere.id}>{cantiere.nome}</option>
                        ))}
                    </select>
                </div>
                {/* Selettore Preposto */}
                <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700">Preposto Assegnato:</label>
                    {loadingPreposti ? (
                        <p className="text-gray-500">Caricamento...</p>
                    ) : (
                        <select
                            value={selectedPreposto ? selectedPreposto.id : ''}
                            onChange={() => {}}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            disabled
                        >
                            {selectedPreposto ? (
                                <option value={selectedPreposto.id}>{selectedPreposto.nome}</option>
                            ) : (
                                <option value="">Nessun preposto assegnato</option>
                            )}
                        </select>
                    )}
                </div>
            </div>

            {selectedCantiereId && selectedPreposto ? (
                <div className="flex-grow overflow-y-auto">
                    <FormRenderer
                        user={user}
                        companyID={userAziendaId}
                        selectedCantiereId={selectedCantiereId}
                        selectedPrepostoId={selectedPreposto.id}
                        // ✅ 3. Passiamo i template filtrati al componente figlio
                        availableTemplates={availableTemplates}
                    />
                </div>
            ) : (
                <p className="text-gray-500 mt-4">Seleziona un cantiere per visualizzare i moduli di rapporto.</p>
            )}
        </div>
    );
};