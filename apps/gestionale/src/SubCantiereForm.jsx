import React, { useState, useEffect } from 'react';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { PlusIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
// highlight-start
import { useTheme } from 'shared-ui'; // Da pacchetto condiviso
import { useFirebaseData } from 'shared-core';; // Relativo
// highlight-end

const SubCantiereForm = ({ cantiereId, onBack }) => {
    const { db, userRole, userAziendaId } = useFirebaseData();
    const { primaryColor, colorClasses } = useTheme();

    const [subCantiereNome, setSubCantiereNome] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [savedSubCantieri, setSavedSubCantieri] = useState([]);
    
    // Nuovo stato per i dati del cantiere principale
    const [cantiereData, setCantiereData] = useState(null);
    const [loadingCantiere, setLoadingCantiere] = useState(true);

    const canWrite = userRole !== 'proprietario' || userAziendaId;
    const saveButtonText = isSaving ? 'Aggiunta...' : 'Aggiungi Subcantiere';

    // Effetto per recuperare i dati del cantiere principale
    useEffect(() => {
        if (!db || !cantiereId) {
            setLoadingCantiere(false);
            return;
        }

        const fetchCantiereData = async () => {
            try {
                const cantiereDocRef = doc(db, 'cantieri', cantiereId);
                const cantiereSnap = await getDoc(cantiereDocRef);
                if (cantiereSnap.exists()) {
                    setCantiereData(cantiereSnap.data());
                } else {
                    console.error("🚫 Documento cantiere non trovato.");
                    setCantiereData(null);
                }
            } catch (error) {
                console.error("🚫 Errore nel recupero dei dati del cantiere:", error);
                setMessage("Errore nel recupero dei dati del cantiere principale.");
            } finally {
                setLoadingCantiere(false);
            }
        };

        fetchCantiereData();
    }, [db, cantiereId]);

    const handleSave = async (e) => {
        e.preventDefault();

        if (!canWrite) {
            setMessage("I proprietari devono selezionare un'azienda per poter aggiungere dati.");
            return;
        }

        setIsSaving(true);
        setMessage('');

        if (!subCantiereNome.trim()) {
            setMessage("Per favore, inserisci un nome per il subcantiere.");
            setIsSaving(false);
            return;
        }

        try {
            const subcantieriRef = collection(doc(db, 'cantieri', cantiereId), 'subcantieri');

            await addDoc(subcantieriRef, {
                nome: subCantiereNome,
                stato: 'attivo',
                dataCreazione: new Date(),
                cantiereGenitoreId: cantiereId,
                companyID: userAziendaId,
            });
            setMessage('Subcantiere aggiunto con successo!');
            setSavedSubCantieri(prev => [...prev, subCantiereNome]);
            setSubCantiereNome('');
        } catch (error) {
            console.error("Errore nell'aggiunta del subcantiere:", error);
            setMessage(`Errore: ${error.message}`);
        }
        setIsSaving(false);
    };

    if (loadingCantiere) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <ArrowPathIcon className="h-10 w-10 animate-spin text-gray-400" />
                <p className="mt-4 text-gray-600">Caricamento dati del cantiere...</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6 animate-fade-in p-8 bg-white rounded-2xl shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-4">
                <PlusIcon className="h-6 w-6 text-green-500" /> Aggiungi Subcantieri
            </h2>
            <p className="text-gray-600">
                Il cantiere principale è stato salvato. Aggiungi i subcantieri per la gestione delle attività (es. "Primo taglio", "Secondo taglio").
            </p>

            {/* Dettagli del cantiere principale */}
            {cantiereData && (
                <div className="space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                        <span className="block text-sm font-semibold text-gray-700">Cantiere Principale:</span>
                        <span className="text-gray-900 font-medium">{cantiereData.nomeCantiere}</span>
                    </div>
                    <div>
                        <span className="block text-sm font-semibold text-gray-700">Indirizzo:</span>
                        <span className="text-gray-600">{cantiereData.indirizzo || 'Indirizzo non specificato'}</span>
                    </div>
                </div>
            )}
            
            {message && (
                <div className={`p-4 mb-4 text-center rounded-lg ${message.includes('successo') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <div className="flex items-center justify-center gap-2">
                        {message.includes('successo') ? <CheckCircleIcon className="h-5 w-5" /> : <XCircleIcon className="h-5 w-5" />}
                        {message}
                    </div>
                </div>
            )}

            <form onSubmit={handleSave} className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <label htmlFor="subCantiereNome" className="sr-only">Nome Subcantiere</label>
                    <input
                        id="subCantiereNome"
                        type="text"
                        value={subCantiereNome}
                        onChange={(e) => setSubCantiereNome(e.target.value)}
                        placeholder="Es. Primo taglio, Secondo taglio..."
                        required
                        disabled={!canWrite}
                        className={`w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 ${!canWrite ? 'bg-gray-200 cursor-not-allowed' : `focus:ring-2 ${colorClasses[primaryColor].ring}`}`}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isSaving || !canWrite}
                    className={`py-2 px-6 rounded-xl text-white font-semibold transition-colors duration-200 ${!canWrite ? 'bg-gray-400 cursor-not-allowed' : (isSaving ? 'bg-gray-400 cursor-not-allowed' : `${colorClasses[primaryColor].bg} ${colorClasses[primaryColor].hoverBg}`)}`}
                >
                    {saveButtonText}
                </button>
            </form>

            {savedSubCantieri.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-lg font-semibold text-gray-700 mb-2">Subcantieri aggiunti:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                        {savedSubCantieri.map((nome, index) => (
                            <li key={index}>{nome}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex justify-end mt-8">
                <button
                    onClick={onBack}
                    className="py-2 px-6 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-100 transition-colors duration-200"
                >
                    Finito
                </button>
            </div>
        </div>
    );
};

export default SubCantiereForm;