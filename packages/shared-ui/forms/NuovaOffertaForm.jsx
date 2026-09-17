import React, { useState } from 'react';
import { BriefcaseIcon, BuildingLibraryIcon } from '@heroicons/react/24/solid';

/**
 * Form per creare una nuova offerta commerciale o censire una nuova Gara d'Appalto.
 * @param {Array} clients - La lista di clienti da mostrare nel dropdown. 
 * @param {Function} onSubmit - Funzione chiamata al submit del form.
 * @param {boolean} isSaving - Se true, disabilita il form e mostra un messaggio di caricamento.
 */
export const NuovaOffertaForm = ({ clients = [], onSubmit, isSaving = false }) => {
    const [isGara, setIsGara] = useState(false);
    const [nomeOfferta, setNomeOfferta] = useState('');
    const [clienteId, setClienteId] = useState('');
    
    // Nuovi campi per Gara d'Appalto
    const [enteAppaltante, setEnteAppaltante] = useState('');
    const [importoBaseGara, setImportoBaseGara] = useState('');
    const [dataScadenzaBando, setDataScadenzaBando] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!nomeOfferta) {
            alert("Inserisci l'oggetto o il nome del preventivo.");
            return;
        }

        if (isGara) {
            if (!enteAppaltante) {
                alert("Specifica l'Ente o la Stazione Appaltante.");
                return;
            }
            // Salvataggio Gara
            onSubmit({ 
                nomeOfferta, 
                isGara: true,
                enteAppaltante,
                importoBaseGara: importoBaseGara ? Number(importoBaseGara) : 0,
                dataScadenzaBando,
                // Salviamo clienteId vuoto o come 'ente_pubblico' se il backend lo richiede
                clienteId: 'gara_appalto' 
            });
        } else {
            if (!clienteId) {
                alert("Seleziona un cliente dall'anagrafica.");
                return;
            }
            // Salvataggio Preventivo Standard
            onSubmit({ 
                nomeOfferta, 
                clienteId, 
                isGara: false 
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
            
            {/* 🌟 SWITCH: Preventivo vs Gara */}
            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button 
                    type="button" 
                    onClick={() => setIsGara(false)} 
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${!isGara ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <BriefcaseIcon className="h-4 w-4"/> Preventivo Diretto
                </button>
                <button 
                    type="button" 
                    onClick={() => setIsGara(true)} 
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${isGara ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <BuildingLibraryIcon className="h-4 w-4"/> Gara d'Appalto
                </button>
            </div>

            {/* OGGETTO COMUNE */}
            <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {isGara ? 'Oggetto della Gara' : 'Nome Preventivo / Offerta'} *
                </label>
                <input
                    type="text"
                    placeholder={isGara ? "Es. Manutenzione Straordinaria Scuola..." : "Es. Ristrutturazione Villa Rossi"}
                    value={nomeOfferta}
                    onChange={(e) => setNomeOfferta(e.target.value)}
                    disabled={isSaving}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-800"
                    required
                />
            </div>

            {/* CAMPI CONDIZIONALI */}
            {!isGara ? (
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cliente *</label>
                    <select
                        value={clienteId}
                        onChange={(e) => setClienteId(e.target.value)}
                        disabled={isSaving}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-800"
                        required={!isGara}
                    >
                        <option value="">-- Seleziona dall'anagrafica --</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>
                                {client.ragioneSociale || `${client.nome} ${client.cognome}`}
                            </option>
                        ))}
                    </select>
                </div>
            ) : (
                <div className="space-y-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 animate-fade-in-down">
                    <div>
                        <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Ente / Stazione Appaltante *</label>
                        <input
                            type="text"
                            placeholder="Es. Comune di Milano, ANAS, ecc..."
                            value={enteAppaltante}
                            onChange={(e) => setEnteAppaltante(e.target.value)}
                            disabled={isSaving}
                            className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-indigo-900"
                            required={isGara}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-indigo-800 uppercase mb-1">Importo Base Gara (€)</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="Es. 150000"
                                value={importoBaseGara}
                                onChange={(e) => setImportoBaseGara(e.target.value)}
                                disabled={isSaving}
                                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-indigo-800 uppercase mb-1">Scadenza Bando</label>
                            <input
                                type="date"
                                value={dataScadenzaBando}
                                onChange={(e) => setDataScadenzaBando(e.target.value)}
                                disabled={isSaving}
                                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                            />
                        </div>
                    </div>
                </div>
            )}

            <button 
                type="submit" 
                disabled={isSaving} 
                className="w-full py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-4"
            >
                {isSaving ? 'Creazione in corso...' : (isGara ? 'Inizia Studio Gara' : 'Crea Preventivo')}
            </button>
        </form>
    );
};