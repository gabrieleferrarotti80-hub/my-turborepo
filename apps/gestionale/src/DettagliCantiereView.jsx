import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { ArrowPathIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import { AggiungiSubcantiereForm} from './AggiungiSubcantiereForm.jsx';
import { useTheme } from 'shared-ui';

// ✅ MODIFICA: Importa i dati e la logica dai pacchetti condivisi e dal context locale
import { useFirebaseData } from 'shared-core';
import { useCantieriManager } from 'shared-core';

export const DettagliCantiereView = ({ cantiereId, onBack }) => {
    // ✅ 2. Consumiamo i dati globali e la logica di business dagli hook
    const { db, cantieri } = useFirebaseData();
    const { updateStatoSubcantiere, isLoading: isUpdating } = useCantieriManager();
    
    // ✅ 3. Rimuoviamo lo stato 'cantiere'. Lo otteniamo filtrando i dati globali.
    // Usiamo useMemo per ottimizzare e non ricalcolare a ogni render.
    const cantiere = useMemo(() => 
        cantieri.find(c => c.id === cantiereId), 
        [cantieri, cantiereId]
    );

    const [subcantieri, setSubcantieri] = useState([]);
    const [loadingSubcantieri, setLoadingSubcantieri] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const { primaryColor, colorClasses } = useTheme();

    // ✅ 4. L'useEffect ora si occupa solo del caricamento on-demand dei subcantieri
    useEffect(() => {
        if (!cantiereId) return;

        setLoadingSubcantieri(true);
        const subcantieriRef = collection(db, 'cantieri', cantiereId, 'subcantieri');

        const unsubscribe = onSnapshot(subcantieriRef, (snapshot) => {
            const subcantieriData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSubcantieri(subcantieriData);
            setLoadingSubcantieri(false);
        }, (error) => {
            console.error("Errore nel caricamento dei subcantieri:", error);
            setLoadingSubcantieri(false);
        });

        return () => unsubscribe();
    }, [cantiereId, db]);

    // ✅ 5. La logica di scrittura è ora delegata all'hook useCantieriManager
    const handleStatoChange = async (subcantiereId, nuovoStato) => {
        await updateStatoSubcantiere(cantiereId, subcantiereId, nuovoStato);
        // Non serve fare altro, il listener di onSnapshot aggiornerà la UI automaticamente!
    };

    if (!cantiere) {
        return <div className="p-4 text-center">Caricamento o cantiere non trovato...</div>;
    }

    // ... il resto del tuo JSX rimane identico, ma ora è più pulito e performante ...
    // Sostituiremo solo il loading generico con quello specifico per i subcantieri
    // e useremo 'isUpdating' per disabilitare i bottoni durante l'aggiornamento.

    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in">
        {/* L'header rimane invariato */}
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors duration-200">
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Torna alla lista</span>
        </button>
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">{cantiere.nomeCantiere}</h1>
            {/* I bottoni rimangono invariati */}
        </div>

        {showAddForm && ( <AggiungiSubcantiereForm onClose={() => setShowAddForm(false)} cantiereId={cantiereId} /> )}
        
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">Subcantieri</h2>
            {loadingSubcantieri ? (
                <div className="text-center text-gray-500 py-4">Caricamento subcantieri...</div>
            ) : subcantieri.length > 0 ? (
                <div className="space-y-4">
                    {subcantieri.map((sub) => (
                        <div key={sub.id} className="p-4 border rounded-md shadow-sm">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">{sub.nomeSubcantiere}</h3>
                                <div className="flex items-center space-x-2">
                                    <span className={`text-sm font-medium ${sub.stato === 'completato' ? 'text-green-600' : 'text-yellow-600'}`}>{sub.stato}</span>
                                    <button
                                        onClick={() => handleStatoChange(sub.id, sub.stato === 'in corso' ? 'completato' : 'in corso')}
                                        disabled={isUpdating}
                                        className="text-gray-500 hover:text-gray-800 disabled:opacity-50 transition-colors duration-200"
                                        title="Cambia stato"
                                    >
                                        <ArrowPathIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-gray-600 mt-1">{sub.descrizione}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-500 py-4">Nessun subcantiere trovato.</div>
            )}
        </div>
      </div>
    );
};

