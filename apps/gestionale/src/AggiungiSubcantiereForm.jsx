import React, { useState, useEffect } from 'react';
import { PlusIcon, StarIcon } from '@heroicons/react/24/solid';
import { useFirebaseData } from 'shared-core';
import { useTheme } from 'shared-ui';
import { useCantieriManager } from 'shared-core';
import { ActionButtons } from 'shared-ui';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const AggiungiSubcantiereForm = ({ onBack }) => {
    // 1. Recupera TUTTE le dipendenze necessarie dal context
    const { db, userAziendaId, userRole, cantieri, companies, loadingData } = useFirebaseData();
    
    // 2. "Inietta" le dipendenze nell'hook condiviso
    const { addSubcantiere, isLoading, error } = useCantieriManager(db, userAziendaId, companies);
    
    const { primaryColor, colorClasses } = useTheme();

    const canWriteData = userRole !== 'proprietario' || !!userAziendaId;
    
    // 🌟 STATO AGGIORNATO: Aggiunto masterId (La nostra Stele di Rosetta)
    const [subcantiereData, setSubcantiereData] = useState({ 
        cantiereId: '', 
        descrizione: '', 
        stato: 'attivo',
        masterId: '' // Nuovo campo!
    });
    
    const [indirizzoSelezionato, setIndirizzoSelezionato] = useState('');
    const [message, setMessage] = useState('');

    // 🌟 NUOVO STATO PER LE VOCI MASTER
    const [vociMaster, setVociMaster] = useState([]);
    const [isLoadingMaster, setIsLoadingMaster] = useState(false);

    // 🌟 EFFETTO: Recupera le Voci Master dal database (SaaS ready)
    useEffect(() => {
        const fetchMasterList = async () => {
            if (!db) return;
            setIsLoadingMaster(true);
            try {
                const queryIds = ['GLOBAL_MASTER'];
                if (userAziendaId) queryIds.push(userAziendaId);

                // Cerchiamo tutti i listini che appartengono a noi o al Global, e filtriamo per isMaster === true
                const q = query(
                    collection(db, 'listini_aziendali'), 
                    where('companyID', 'in', queryIds),
                    where('isMaster', '==', true)
                );
                
                const snapshot = await getDocs(q);
                const dataFetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Ordiniamo per descrizione
                dataFetched.sort((a, b) => (a.descrizione || '').localeCompare(b.descrizione || ''));
                setVociMaster(dataFetched);
            } catch (error) {
                console.error("Errore recupero Voci Master:", error);
            } finally {
                setIsLoadingMaster(false);
            }
        };

        fetchMasterList();
    }, [db, userAziendaId]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        // 🌟 AUTOMAZIONE: Se seleziona la Voce Master, precompiliamo il nome della fase
        if (name === 'masterId') {
            const masterSelezionato = vociMaster.find(m => m.id === value);
            if (masterSelezionato && !subcantiereData.descrizione) {
                setSubcantiereData(prevState => ({ 
                    ...prevState, 
                    masterId: value,
                    descrizione: masterSelezionato.descrizione // Pre-compila il testo
                }));
                return;
            }
        }

        setSubcantiereData(prevState => ({ ...prevState, [name]: value }));

        if (name === 'cantiereId') {
            const cantiereSelezionato = cantieri.find(c => c.id === value);
            setIndirizzoSelezionato(cantiereSelezionato ? cantiereSelezionato.indirizzo : '');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        // Il payload ora include automaticamente masterId grazie allo stato
        const result = await addSubcantiere(subcantiereData);
        setMessage(result.message);
        
        if (result.success) {
            setTimeout(() => onBack(), 2000);
        }
    };

    if (loadingData) {
        return <div>Caricamento dati...</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <ActionButtons onBack={onBack} onSave={handleSubmit} isSaving={isLoading} canSave={canWriteData} />
            
            {message && (
                <div className={`p-4 mb-4 text-center rounded-lg font-bold ${message.includes('successo') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-8 bg-white rounded-2xl shadow-xl space-y-6 max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-4">
                    <PlusIcon className="h-6 w-6" /> Aggiungi Fase di Lavoro (Sub-cantiere)
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cantiere Principale</label>
                        <select name="cantiereId" value={subcantiereData.cantiereId} onChange={handleInputChange} required className={`w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 ${colorClasses[primaryColor].ring}`} disabled={!canWriteData}>
                            <option value="">Seleziona un cantiere</option>
                            {cantieri.map(c => <option key={c.id} value={c.id}>{c.nomeCantiere}</option>)}
                        </select>
                        {indirizzoSelezionato && <p className="text-xs text-gray-500 font-bold mt-1 ml-1">{indirizzoSelezionato}</p>}
                    </div>

                    {/* 🌟 NUOVO CAMPO: SELETTORE VOCE MASTER */}
                    <div className="md:col-span-2 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <label className="block text-sm font-black text-indigo-900 mb-1 flex items-center gap-2">
                            <StarIcon className="h-5 w-5 text-amber-500"/>
                            Lavorazione Associata (Voce Master)
                        </label>
                        <p className="text-xs text-indigo-600 mb-2">Seleziona la Voce Master per permettere al sistema di calcolare le statistiche dei costi e delle rese a fine cantiere.</p>
                        
                        <select name="masterId" value={subcantiereData.masterId} onChange={handleInputChange} required className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" disabled={!canWriteData || isLoadingMaster}>
                            <option value="">-- Seleziona una Voce Master --</option>
                            {vociMaster.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.codice} - {m.descrizione}
                                </option>
                            ))}
                        </select>
                        {isLoadingMaster && <span className="text-xs text-indigo-400 mt-1 block">Caricamento voci...</span>}
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome/Descrizione della Fase in Cantiere</label>
                        <input type="text" name="descrizione" value={subcantiereData.descrizione} onChange={handleInputChange} required className={`w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 ${colorClasses[primaryColor].ring}`} disabled={!canWriteData} placeholder="Es. Sfalcio Erba lato Nord" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stato Iniziale</label>
                        <select name="stato" value={subcantiereData.stato} onChange={handleInputChange} required className={`w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 ${colorClasses[primaryColor].ring}`} disabled={!canWriteData}>
                            <option value="attivo">Attivo</option>
                            <option value="in attesa">In attesa</option>
                            <option value="completato">Completato</option>
                        </select>
                    </div>
                </div>
            </form>
        </div>
    );
};