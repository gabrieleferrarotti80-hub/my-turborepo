import React, { useState, useEffect, useRef } from 'react';
import { PlusIcon, TrashIcon, ListBulletIcon, BuildingLibraryIcon, BriefcaseIcon, BoltIcon } from '@heroicons/react/24/solid';
import { Loader } from '@googlemaps/js-api-loader';
import { useTheme } from 'shared-ui';
import { useCantieriManager } from 'shared-core';
import { ActionButtons } from 'shared-ui';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Componente per gestire le fasi
import { FasiLavoroManager } from './components/cantieri/FasiLavoroManager'; 

export const AggiungiCantiereForm = ({ 
    onBack, 
    onSaveSuccess, 
    db, 
    clients, 
    userAziendaId, 
    userRole, 
    companies,
    offertaDaConvertire,
    initialFastTrack = false // 🌟 Riceve lo stato iniziale dal tasto premuto
}) => {
    
    const { addCantiere, isLoading } = useCantieriManager(db, userAziendaId, companies);
    const { primaryColor, colorClasses } = useTheme();
    
    const addressInputRef = useRef(null);
    const [message, setMessage] = useState('');
    const [isFastTrack, setIsFastTrack] = useState(initialFastTrack);

    const initialState = {
        nomeCantiere: '',
        clienteId: '',
        nomeCliente: '',
        cliente: '', // Campo duplicato per compatibilità filtri
        tipologiaCantiere: '',
        tipologiaAttivita: '', 
        indirizzo: '',
        latitude: null,
        longitude: null,
        isGara: false,
        stato: 'attivo',
        chiuso: false // 🌟 Fondamentale per apparire in lista
    };
    
    const [cantiereData, setCantiereData] = useState(initialState);
    const [fasi, setFasi] = useState([]); 

    const canWriteData = userRole !== 'proprietario' || !!userAziendaId;

    // Sincronizza lo stato fastTrack se cambia la prop
    useEffect(() => {
        setIsFastTrack(initialFastTrack);
    }, [initialFastTrack]);

    useEffect(() => {
        if (offertaDaConvertire) {
            const cliente = clients.find(c => c.id === offertaDaConvertire.clienteId);
            const nomeC = cliente ? (cliente.ragioneSociale || cliente.nome || cliente.cognome) : '';
            
            setCantiereData({
                ...initialState,
                nomeCantiere: offertaDaConvertire.nomeOfferta || '',
                clienteId: offertaDaConvertire.clienteId || '',
                nomeCliente: nomeC,
                cliente: nomeC,
                tipologiaCantiere: offertaDaConvertire.datiAnalisi?.tipologiaCantiere || '',
                tipologiaAttivita: offertaDaConvertire.datiAnalisi?.tipologiaAttivita || '',
                indirizzo: offertaDaConvertire.datiAnalisi?.sopralluogo?.indirizzo || '',
            });
            setIsFastTrack(false);
        }
    }, [offertaDaConvertire, clients]);

    // Google Maps Autocomplete
    useEffect(() => {
        if (!addressInputRef.current || !canWriteData) return;
        const loader = new Loader({ apiKey: "AIzaSyBH_yUQ-nDuyAtoZFapSiWuRUapzstJez0", version: "weekly", libraries: ["places"] });
        loader.load().then(() => {
            if (!window.google) return;
            const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, { types: ['geocode'], componentRestrictions: { country: 'it' } });
            autocomplete.addListener("place_changed", () => {
                const place = autocomplete.getPlace();
                if (!place.geometry) return;
                setCantiereData(prev => ({
                    ...prev,
                    indirizzo: place.formatted_address,
                    latitude: place.geometry.location.lat(),
                    longitude: place.geometry.location.lng(),
                }));
            });
        });
    }, [canWriteData]);

    const handleClienteChange = (e) => {
        const id = e.target.value;
        const c = clients.find(cl => cl.id === id);
        const nome = c ? (c.ragioneSociale || c.nome || c.cognome || 'Sconosciuto') : '';
        setCantiereData(prev => ({ ...prev, clienteId: id, nomeCliente: nome, cliente: nome }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (fasi.length === 0) { setMessage("Aggiungi almeno una fase."); return; }

        let finalPayload = { 
            ...cantiereData, 
            companyID: userAziendaId, // 🔒 OBBLIGATORIO SaaS
            chiuso: false,            // ✅ OBBLIGATORIO per lista attivi
            createdAt: serverTimestamp() 
        };

        if (isFastTrack) {
            try {
                // Crea offerta fittizia accettata
                const offertaRef = await addDoc(collection(db, 'offerte'), {
                    companyID: userAziendaId,
                    clienteId: finalPayload.clienteId,
                    nomeCliente: finalPayload.nomeCliente,
                    titolo: `[PRONTO INTERVENTO] ${finalPayload.nomeCantiere}`,
                    stato: 'convertita',
                    totaleOfferta: 0,
                    isFastTrack: true,
                    createdAt: serverTimestamp()
                });
                finalPayload.offertaCollegataId = offertaRef.id;
                finalPayload.valoreAppalto = 0;
                finalPayload.stato = 'attivo';
            } catch (err) { setMessage("Errore offerta: " + err.message); return; }
        }

        const result = await addCantiere(finalPayload, fasi);
        if (result.success) onSaveSuccess(result.id);
        else setMessage(result.message);
    };

    return (
        <div className="space-y-6">
            <ActionButtons onBack={onBack} onSave={handleSubmit} isSaving={isLoading} canSave={cantiereData.latitude && fasi.length > 0} />
            
            <form onSubmit={handleSubmit} className="p-6 bg-white rounded-2xl shadow-lg space-y-6">
                {/* Switch FastTrack */}
                {!offertaDaConvertire && (
                    <div className="flex justify-center mb-4">
                        <div className="bg-gray-100 p-1 rounded-xl inline-flex">
                            <button type="button" onClick={() => setIsFastTrack(false)} className={`px-4 py-2 rounded-lg text-sm font-bold ${!isFastTrack ? 'bg-white shadow text-indigo-600' : 'text-gray-50'}`}>Standard</button>
                            <button type="button" onClick={() => setIsFastTrack(true)} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 ${isFastTrack ? 'bg-rose-500 text-white shadow' : 'text-gray-500'}`}><BoltIcon className="h-4 w-4"/> Pronto Intervento</button>
                        </div>
                    </div>
                )}

                {isFastTrack && <div className="p-3 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-100 italic">Modalità Urgenza: Verrà generata un'offerta automatica a 0€.</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Cantiere</label>
                        <input type="text" value={cantiereData.nomeCantiere} onChange={e => setCantiereData({...cantiereData, nomeCantiere: e.target.value})} required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente</label>
                        <select value={cantiereData.clienteId} onChange={handleClienteChange} required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                            <option value="">-- Seleziona Cliente --</option>
                            {clients.map(cl => (
                                <option key={cl.id} value={cl.id}>{cl.ragioneSociale || cl.nome || cl.cognome}</option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Indirizzo (Seleziona dalla lista)</label>
                        <input ref={addressInputRef} type="text" value={cantiereData.indirizzo} onChange={e => setCantiereData({...cantiereData, indirizzo: e.target.value})} required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Cerca indirizzo..." />
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><ListBulletIcon className="h-5 w-5 text-indigo-500"/> Fasi di Lavoro</h3>
                    <FasiLavoroManager tipologia={cantiereData.tipologiaAttivita || 'Taglio Erba'} onAddFasi={f => setFasi([...fasi, ...f.map(x => ({...x, tempId: Math.random()}))])} canWriteData={true} />
                    
                    <div className="mt-4 space-y-2">
                        {fasi.map(f => (
                            <div key={f.tempId} className="flex justify-between items-center p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                <span className="text-sm font-bold text-indigo-900">{f.nomeSubcantiere}</span>
                                <button type="button" onClick={() => setFasi(fasi.filter(x => x.tempId !== f.tempId))} className="text-rose-500"><TrashIcon className="h-5 w-5"/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </form>
            {message && <div className="p-4 bg-red-100 text-red-700 rounded-xl font-bold text-center">{message}</div>}
        </div>
    );
};