import React, { useState, useMemo } from 'react';
import { useFirebaseData } from 'shared-core';
import { SmartResourceSelector } from 'shared-ui'; 
import { 
    MagnifyingGlassIcon, BuildingStorefrontIcon, TruckIcon, 
    WrenchScrewdriverIcon, TrophyIcon, ArrowTrendingDownIcon, CurrencyEuroIcon,
    XMarkIcon, PlusCircleIcon
} from '@heroicons/react/24/outline';

export const ComparatorePrezzi = ({ isModal = false, onClose, onSelect }) => {
    const { data, loadingData } = useFirebaseData();
    
    const fornitori = Array.isArray(data?.fornitori) ? data.fornitori : [];
    const noleggiatori = Array.isArray(data?.noleggiatori) ? data.noleggiatori : [];
    const subappaltatori = Array.isArray(data?.subappaltatori) ? data.subappaltatori : [];

    const [ricerca, setRicerca] = useState({ testo: '', metadata: null });
    const [haCercato, setHaCercato] = useState(false);

    // ==========================================
    // MOTORE DI RICERCA INTELLIGENTE V2.0
    // ==========================================
    const risultati = useMemo(() => {
        if (!haCercato || !ricerca.testo) return [];

        let trovati = [];
        
        // Scomponiamo la ricerca in singole parole chiave (Es. "Sementi prato" -> ["sementi", "prato"])
        const queryWords = ricerca.testo.toLowerCase().split(' ').filter(w => w.trim() !== '');

        const analizzaAlbo = (aziende, tipoAzienda, icona) => {
            aziende.forEach(azienda => {
                if (!azienda.listino || !Array.isArray(azienda.listino)) return;

                azienda.listino.forEach(item => {
                    let isMatch = false;
                    const itemTesto = (item.descrizione || item.articolo || item.mezzo || item.lavorazione || '').toLowerCase();

                    // 1. RICERCA PER METADATI (Se l'item a listino ha la famiglia assegnata dal dizionario)
                    if (ricerca.metadata && item.macroCategoria) {
                        if (item.famiglia === ricerca.metadata.famiglia) {
                            isMatch = true;
                        }
                    } 
                    
                    // 2. RICERCA TESTUALE FLESSIBILE (Stile Google)
                    // Se non c'è match di metadati, controlliamo se ALMENO UNA delle parole chiave è presente nel testo
                    if (!isMatch && queryWords.length > 0) {
                        // Usiamo "some" (almeno una parola) invece di "every" (tutte le parole) per essere molto elastici
                        isMatch = queryWords.some(word => itemTesto.includes(word));
                    }

                    // Se è un match, lo aggiungiamo ai risultati!
                    if (isMatch) {
                        trovati.push({
                            id: azienda.id + item.id,
                            fornitoreId: azienda.id,
                            aziendaNome: azienda.ragioneSociale,
                            tipoAzienda: tipoAzienda,
                            icona: icona,
                            descrizione: item.descrizione || item.articolo || item.mezzo || item.lavorazione,
                            prezzo: Number(item.costo || item.prezzo),
                            unitaMisura: item.unitaMisura || item.tipoCosto || 'pz'
                        });
                    }
                });
            });
        };

        analizzaAlbo(fornitori, 'Fornitore Materiali', BuildingStorefrontIcon);
        analizzaAlbo(noleggiatori, 'Noleggiatore', TruckIcon);
        analizzaAlbo(subappaltatori, 'Subappaltatore', WrenchScrewdriverIcon);

        // Ordiniamo in automatico dal prezzo più basso al più alto
        return trovati.sort((a, b) => a.prezzo - b.prezzo);
    }, [haCercato, ricerca, fornitori, noleggiatori, subappaltatori]);

    const handleSearchChange = (testo, metadata) => {
        setRicerca({ testo, metadata });
        setHaCercato(true);
    };

    if (loadingData) return <div className="p-8 text-center text-gray-500 animate-pulse">Caricamento Motore di Ricerca...</div>;

    const content = (
        <div className={`bg-gray-50 animate-fade-in ${isModal ? 'p-0' : 'p-4 md:p-8 min-h-screen'}`}>
            
            {isModal && (
                <div className="bg-indigo-900 px-6 py-4 flex justify-between items-center text-white rounded-t-2xl">
                    <h2 className="font-bold text-lg flex items-center gap-2"><MagnifyingGlassIcon className="h-5 w-5"/> Trova Miglior Prezzo</h2>
                    <button onClick={onClose} className="p-1 hover:bg-indigo-800 rounded-lg transition-colors"><XMarkIcon className="h-6 w-6"/></button>
                </div>
            )}

            <div className={`${isModal ? 'p-6 bg-white border-b border-gray-100' : 'bg-gradient-to-br from-indigo-900 to-blue-800 rounded-3xl p-8 md:p-12 shadow-2xl mb-8'} text-center relative overflow-hidden`}>
                {!isModal && (
                    <>
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 text-white opacity-5"><MagnifyingGlassIcon className="h-64 w-64" /></div>
                        <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight relative z-10">Comparatore <span className="text-blue-400">Prezzi</span></h1>
                        <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto relative z-10">Trova istantaneamente il fornitore più economico per qualsiasi risorsa, materiale o mezzo.</p>
                    </>
                )}

                <div className="max-w-3xl mx-auto relative z-10 text-left">
                    <div className={`bg-white p-2 rounded-2xl shadow-lg flex items-center gap-2 ${isModal ? 'border border-indigo-200' : ''}`}>
                        <div className="p-3 text-indigo-500 hidden sm:block"><MagnifyingGlassIcon className="h-6 w-6" /></div>
                        <div className="flex-1 w-full relative z-50">
                            <SmartResourceSelector 
                                tipoArticolo="" 
                                value={ricerca.testo}
                                onChange={handleSearchChange}
                                placeholder="Es. Cemento, Escavatore, Sementi..."
                            />
                        </div>
                        <button onClick={() => setHaCercato(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-colors">Cerca</button>
                    </div>
                </div>
            </div>

            {haCercato && (
                <div className={`max-w-5xl mx-auto animate-fade-in-up ${isModal ? 'p-6 max-h-[60vh] overflow-y-auto' : ''}`}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className={`font-bold text-gray-800 flex items-center gap-2 ${isModal ? 'text-lg' : 'text-2xl'}`}>
                            Risultati per: <span className="text-indigo-600">"{ricerca.testo}"</span>
                        </h2>
                        <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-bold">{risultati.length} Opzioni</span>
                    </div>

                    {risultati.length === 0 ? (
                        <div className="bg-white rounded-3xl p-8 text-center border border-gray-200 shadow-sm">
                            <CurrencyEuroIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                            <h3 className="text-lg font-bold text-gray-800">Nessun prezzo trovato nei listini</h3>
                            <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
                                Assicurati di aver inserito questa voce con il relativo costo all'interno del <strong>Listino</strong> di uno dei tuoi fornitori.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {risultati.map((res, index) => {
                                const isMigliorPrezzo = index === 0;
                                const Icon = res.icona;

                                return (
                                    <div key={res.id} className={`bg-white rounded-2xl p-4 md:p-6 border transition-all ${isMigliorPrezzo ? 'border-green-400 shadow-lg ring-2 ring-green-50 z-10 relative' : 'border-gray-200 shadow-sm'}`}>
                                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                            <div className="flex items-center gap-4 w-full md:w-auto">
                                                <div className={`p-3 rounded-xl ${isMigliorPrezzo ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                                    {isMigliorPrezzo ? <TrophyIcon className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                                                </div>
                                                <div>
                                                    {isMigliorPrezzo && <span className="inline-flex items-center gap-1 bg-green-500 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest mb-1"><ArrowTrendingDownIcon className="h-3 w-3"/> Miglior Prezzo</span>}
                                                    <h3 className="text-lg font-black text-gray-900">{res.aziendaNome}</h3>
                                                    <p className="text-xs text-gray-500">{res.tipoAzienda} • {res.descrizione}</p>
                                                </div>
                                            </div>

                                            <div className="text-right w-full md:w-auto flex flex-row md:flex-col justify-between md:justify-end items-center md:items-end gap-4 md:gap-1">
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Prezzo per {res.unitaMisura}</p>
                                                    <span className={`text-2xl font-black ${isMigliorPrezzo ? 'text-green-600' : 'text-gray-900'}`}>€ {res.prezzo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                
                                                {isModal && (
                                                    <button onClick={() => onSelect(res)} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 text-sm shadow-sm">
                                                        <PlusCircleIcon className="h-5 w-5"/> Usa
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    if (isModal) {
        return (
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 md:p-8">
                <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-full overflow-hidden">
                    {content}
                </div>
            </div>
        );
    }

    return content;
};