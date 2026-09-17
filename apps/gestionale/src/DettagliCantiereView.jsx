import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
    ArrowPathIcon, 
    ArrowLeftIcon, 
    ClipboardDocumentListIcon, 
    BanknotesIcon 
} from '@heroicons/react/24/solid';
import { useTheme } from 'shared-ui';
import { useFirebaseData, useCantieriManager } from 'shared-core';

// Componenti
import { AggiungiSubcantiereForm } from './AggiungiSubcantiereForm.jsx';
import { CantiereContabilita } from './components/cantieri/CantiereContabilita.jsx'; // ✅ IMPORTATO

export const DettagliCantiereView = ({ cantiereId, onBack }) => {
    
    // 1. Dati Globali e Manager
    const { db, data } = useFirebaseData();
    const { updateStatoSubcantiere, isLoading: isUpdating } = useCantieriManager(db);
    const { primaryColor, colorClasses } = useTheme();

    // 2. Recupera il cantiere
    const cantiere = useMemo(() => 
        (data?.cantieri || []).find(c => c.id === cantiereId), 
        [data?.cantieri, cantiereId]
    );

    // 3. Stato Locale
    const [activeTab, setActiveTab] = useState('fasi'); // 'fasi' | 'contabilita'
    const [subcantieri, setSubcantieri] = useState([]);
    const [loadingSubcantieri, setLoadingSubcantieri] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);

    // 4. Listener Subcantieri
    useEffect(() => {
        if (!cantiereId || !db) return;

        setLoadingSubcantieri(true);
        const subcantieriRef = collection(db, 'cantieri', cantiereId, 'subcantieri');

        const unsubscribe = onSnapshot(subcantieriRef, (snapshot) => {
            const subcantieriData = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));
            setSubcantieri(subcantieriData);
            setLoadingSubcantieri(false);
        }, (error) => {
            console.error("Errore caricamento subcantieri:", error);
            setLoadingSubcantieri(false);
        });

        return () => unsubscribe();
    }, [cantiereId, db]);

    const handleStatoChange = async (subcantiereId, nuovoStato) => {
        await updateStatoSubcantiere(cantiereId, subcantiereId, nuovoStato);
    };

    if (!cantiere) {
        return <div className="p-8 text-center text-gray-500">Cantiere non trovato o in caricamento...</div>;
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col gap-4">
                <button onClick={onBack} className="self-start flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                    <ArrowLeftIcon className="h-5 w-5" />
                    <span>Torna alla lista</span>
                </button>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-gray-200">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900">{cantiere.nomeCantiere}</h1>
                        <p className="text-gray-500 mt-1">{cantiere.indirizzo || 'Indirizzo non specificato'}</p>
                    </div>
                    
                    {/* TAB SWITCHER */}
                    <div className="flex bg-gray-100 p-1 rounded-lg shadow-inner">
                        <button 
                            onClick={() => setActiveTab('fasi')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                activeTab === 'fasi' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <ClipboardDocumentListIcon className="h-5 w-5" /> Fasi Operative
                        </button>
                        <button 
                            onClick={() => setActiveTab('contabilita')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                activeTab === 'contabilita' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <BanknotesIcon className="h-5 w-5" /> Contabilità / SAL
                        </button>
                    </div>
                </div>
            </div>

            {/* --- TAB 1: FASI OPERATIVE (SUBCANTIERI) --- */}
            {activeTab === 'fasi' && (
                <>
                    {/* Bottone Aggiungi (Visibile solo qui) */}
                    <div className="flex justify-end">
                        <button 
                            onClick={() => setShowAddForm(true)} 
                            className={`px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-all font-medium`}
                        >
                            + Aggiungi Fase Lavoro
                        </button>
                    </div>

                    {showAddForm && ( 
                        <div className="bg-gray-50 p-4 rounded-xl border border-indigo-100 mb-6">
                            <AggiungiSubcantiereForm onClose={() => setShowAddForm(false)} cantiereId={cantiereId} />
                        </div>
                    )}
                    
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-800">Fasi di Lavoro</h2>
                        </div>
                        
                        {loadingSubcantieri ? (
                            <div className="text-center text-gray-500 py-8">Caricamento fasi...</div>
                        ) : subcantieri.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                                {subcantieri.map((sub) => (
                                    <div key={sub.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            <h3 className="text-md font-semibold text-gray-900">{sub.nomeSubcantiere}</h3>
                                            <p className="text-sm text-gray-600 mt-1">{sub.descrizione || 'Nessuna descrizione'}</p>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                                sub.stato === 'completato' ? 'bg-green-100 text-green-800' : 
                                                sub.stato === 'in corso' ? 'bg-blue-100 text-blue-800' : 
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {sub.stato}
                                            </span>
                                            
                                            <button
                                                onClick={() => handleStatoChange(sub.id, sub.stato === 'in corso' ? 'completato' : 'in corso')}
                                                disabled={isUpdating}
                                                className="p-2 text-gray-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-indigo-50"
                                                title="Cambia stato"
                                            >
                                                <ArrowPathIcon className={`h-5 w-5 ${isUpdating ? 'animate-spin' : ''}`} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-400 py-12 flex flex-col items-center">
                                <p>Nessuna fase di lavoro definita.</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* --- TAB 2: CONTABILITÀ (SAL) --- */}
            {activeTab === 'contabilita' && (
                // ✅ INTEGRAZIONE NUOVO COMPONENTE
                <CantiereContabilita cantiere={cantiere} />
            )}

        </div>
    );
};