import React, { useState, useEffect, useRef } from 'react';
import { PlusIcon } from '@heroicons/react/24/solid';
import { Loader } from '@googlemaps/js-api-loader';
import { useFirebaseData } from 'shared-core';
import { useTheme } from 'shared-ui';
import { useCantieriManager } from 'shared-core';
import {ActionButtons} from 'shared-ui';

export const AggiungiCantiereForm = ({ onBack, onSaveSuccess }) => {
    // 1. Recupera TUTTE le dipendenze necessarie dal context
    const { db, clients, userAziendaId, userRole, companies } = useFirebaseData();
    
    // 2. "Inietta" le dipendenze nell'hook condiviso
    const { addCantiere, isLoading } = useCantieriManager(db, userAziendaId, companies);
    
    const { primaryColor, colorClasses } = useTheme();
    
    const addressInputRef = useRef(null);
    const [message, setMessage] = useState('');
    const [cantiereData, setCantiereData] = useState({
        nomeCantiere: '',
        clienteId: '',
        nomeCliente: '',
        tipologiaCantiere: '',
        tipologiaAttivita: '',
        indirizzo: '',
        latitude: null,
        longitude: null,
    });

    const canWriteData = userRole !== 'proprietario' || !!userAziendaId;

    // Inizializza l'autocomplete di Google Maps (logica di UI, rimane qui)
    useEffect(() => {
        if (!addressInputRef.current || !canWriteData) return;

        const loader = new Loader({
            apiKey: "AIzaSyBH_yUQ-nDuyAtoZFapSiWuRUapzstJez0", // NOTA: Considera di spostare la chiave in una variabile d'ambiente
            version: "weekly",
            libraries: ["places"],
        });

        loader.load().then(() => {
            if (!window.google || !window.google.maps || !window.google.maps.places) {
                console.error("Google Maps API non caricata.");
                return;
            }
            const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, { types: ['geocode'], componentRestrictions: { country: 'it' } });
            autocomplete.addListener("place_changed", () => {
                const place = autocomplete.getPlace();
                if (!place.geometry || !place.geometry.location) {
                    setMessage("Indirizzo non valido.");
                    return;
                }
                setCantiereData(prevState => ({
                    ...prevState,
                    indirizzo: place.formatted_address,
                    latitude: place.geometry.location.lat(),
                    longitude: place.geometry.location.lng(),
                }));
            });
        }).catch(e => console.error("Errore caricamento Google Maps:", e));
    }, [canWriteData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCantiereData(prevState => ({ ...prevState, [name]: value }));
    };

    const handleClienteChange = (e) => {
        const clienteId = e.target.value;
        const clienteSelezionato = clients.find(c => c.id === clienteId);
        setCantiereData(prevState => ({
            ...prevState,
            clienteId: clienteId,
            nomeCliente: clienteSelezionato ? clienteSelezionato.nome : '',
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        // ✅ 3. Delega tutta la logica di salvataggio all'hook
        const result = await addCantiere(cantiereData);
        if (result.success) {
            onSaveSuccess(result.message);
        } else {
            setMessage(result.message);
        }
    };

    const tipologieCantiere = ['OS24', 'OG3', 'OG11'];
    const tipologieAttivita = ['Taglio Piante', 'Taglio Erba', 'Urbanizzazione', 'Edilizia'];
    const statiCantiere = ['attivo', 'in pausa', 'completato'];

    return (
        <div className="space-y-6 animate-fade-in">
            <ActionButtons
                onBack={onBack}
                onSave={handleSubmit}
                isSaving={isLoading}
                canSave={canWriteData && cantiereData.latitude !== null}
            />

            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-4">
                <PlusIcon className="h-6 w-6 text-green-500" /> Aggiungi Nuovo Cantiere
            </h2>
            {message && (
                <div className={`p-4 mb-4 text-center rounded-lg ${message.includes('successo') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-8 bg-white rounded-2xl shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nome Cantiere */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Cantiere</label>
                    <input type="text" name="nomeCantiere" value={cantiereData.nomeCantiere} onChange={handleInputChange} required className={`w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 ${colorClasses[primaryColor].ring}`} disabled={!canWriteData} />
                </div>

                {/* Cliente */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                    <select name="clienteId" value={cantiereData.clienteId} onChange={handleClienteChange} required className={`w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 ${colorClasses[primaryColor].ring}`} disabled={!canWriteData}>
                        <option value="">Seleziona un cliente</option>
                        {clients.map(cliente => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
                    </select>
                </div>

                {/* Tipologie */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipologia Cantiere</label>
                    <select name="tipologiaCantiere" value={cantiereData.tipologiaCantiere} onChange={handleInputChange} required className={`w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 ${colorClasses[primaryColor].ring}`} disabled={!canWriteData}>
                        <option value="">Seleziona</option>
                        {tipologieCantiere.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipologia Attività</label>
                    <select name="tipologiaAttivita" value={cantiereData.tipologiaAttivita} onChange={handleInputChange} required className={`w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 ${colorClasses[primaryColor].ring}`} disabled={!canWriteData}>
                        <option value="">Seleziona</option>
                        {tipologieAttivita.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
                    </select>
                </div>
                
                {/* Indirizzo */}
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo Cantiere</label>
                    <input type="text" name="indirizzo" value={cantiereData.indirizzo} onChange={handleInputChange} required ref={addressInputRef} className={`w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 ${colorClasses[primaryColor].ring}`} disabled={!canWriteData} />
                </div>
            </form>
        </div>
    );
};

export default AggiungiCantiereForm;

