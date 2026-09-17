import React, { useState, useMemo } from 'react';
import { 
    ArrowLeftIcon, 
    UserIcon, 
    BuildingOfficeIcon, 
    DocumentCheckIcon, 
    WrenchScrewdriverIcon,
    MagnifyingGlassIcon,
    ExclamationTriangleIcon,
    CheckBadgeIcon
} from '@heroicons/react/24/outline';

export const GestioneArchivioView = ({
    archivioAttrezzature = [],
    assegnazioni = [],
    attrezzature = [],
    utenti = [],
    cantieri = [],
    onBack
}) => {
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // --- 1. UNIFICAZIONE DEI DATI ---
    const unifiedArchive = useMemo(() => {
        return archivioAttrezzature.map(arc => {
            const liveEquip = attrezzature.find(a => a.id === arc.attrezzaturaID);
            return {
                ...arc,
                nome: liveEquip?.nome || arc.nome || 'Asset Sconosciuto',
                seriale: liveEquip?.seriale || arc.seriale || '-',
                categoria: liveEquip?.categoria || 'N/D'
            };
        }).filter(item =>
            String(item.nome).toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(item.seriale).toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
    }, [archivioAttrezzature, attrezzature, searchTerm]);


    // --- 2. GENERATORE DELLA TIMELINE (Guasti e Riparazioni inclusi) ---
    const getTimeline = (attrezzaturaID, eventiCreazione) => {
        let timeline = [];

        // A. Nascita dell'attrezzo
        if (eventiCreazione && Array.isArray(eventiCreazione)) {
            eventiCreazione.forEach(ev => {
                timeline.push({
                    id: `creazione-${ev.timestamp}`,
                    date: ev.timestamp?.toDate ? ev.timestamp.toDate() : new Date(ev.timestamp),
                    type: 'creazione',
                    title: 'Registrazione Asset in Magazzino',
                    description: ev.dettagli || 'Attrezzatura aggiunta a sistema.',
                    icon: DocumentCheckIcon,
                    color: 'bg-emerald-500'
                });
            });
        }

        // B. Analisi di tutti i movimenti
        const relatedAssegnazioni = assegnazioni.filter(ass => ass.articoloId === attrezzaturaID);
        
        relatedAssegnazioni.forEach(ass => {
            
            // ✅ EVENTO: RIPARAZIONE COMPLETATA (Il record fittizio che abbiamo appena creato)
            if (ass.statoWorkflow === 'riparazione_completata' || ass.dataRiparazione) {
                timeline.push({
                    id: `rip-${ass.id}`,
                    date: ass.dataRiparazione?.toDate ? ass.dataRiparazione.toDate() : new Date(ass.dataRiparazione || ass.createdAt),
                    type: 'riparazione',
                    title: '✅ Riparazione Completata',
                    description: ass.noteRiparazione || 'Attrezzatura riparata in officina e tornata operativa.',
                    icon: CheckBadgeIcon,
                    color: 'bg-emerald-500' 
                });
                return; // Fine lettura per questo record speciale
            }

            // ELABORAZIONE ASSEGNAZIONI NORMALI
            const dateAssegnazione = ass.dataAssegnazione?.toDate ? ass.dataAssegnazione.toDate() : new Date(ass.dataAssegnazione || ass.createdAt);
            let assignedToName = 'Sconosciuto';
            let isCantiere = false;

            const user = utenti.find(u => u.id === ass.assegnatoA);
            if (user) {
                assignedToName = `${user.nome} ${user.cognome}`;
            } else {
                const cantiere = cantieri.find(c => c.id === ass.assegnatoA);
                if (cantiere) {
                    assignedToName = cantiere.nomeCantiere;
                    isCantiere = true;
                }
            }

            // 1. Uscita dal magazzino
            timeline.push({
                id: `ass-${ass.id}`,
                date: dateAssegnazione,
                type: 'assegnazione',
                title: `Assegnato a: ${assignedToName}`,
                description: ass.dataConferma ? `Ricezione confermata digitalmente.` : `In attesa di firma / conferma.`,
                icon: isCantiere ? BuildingOfficeIcon : UserIcon,
                color: 'bg-indigo-500'
            });

            // 2. ✅ EVENTO: GUASTO / ROTTURA SEGNALATA
            if (ass.dataGuasto) {
                timeline.push({
                    id: `guasto-${ass.id}`,
                    date: ass.dataGuasto?.toDate ? ass.dataGuasto.toDate() : new Date(ass.dataGuasto),
                    type: 'guasto',
                    title: '🚨 Segnalazione Guasto / Rottura',
                    description: ass.noteGuasto ? `Problema dichiarato: "${ass.noteGuasto}"` : `Segnalata anomalia da ${assignedToName}.`,
                    icon: WrenchScrewdriverIcon, 
                    color: 'bg-red-500' 
                });
            }

            // 3. ✅ EVENTO: DISMISSIONE (Rottura irreparabile)
            if (ass.dataDismissione) {
                timeline.push({
                    id: `dismessa-${ass.id}`,
                    date: ass.dataDismissione?.toDate ? ass.dataDismissione.toDate() : new Date(ass.dataDismissione),
                    type: 'dismissione',
                    title: '💀 Articolo Dismesso',
                    description: ass.noteDismissione || `L'articolo è stato rimosso definitivamente dall'inventario.`,
                    icon: ExclamationTriangleIcon, 
                    color: 'bg-slate-800' 
                });
            }

            // 4. Rientro in Magazzino
            const dataFineEffettiva = ass.dataRestituzione || ass.dataRientro || ass.dataChiusura || ass.dataFine || (ass.statoWorkflow === 'conclusa' ? (ass.updatedAt || ass.createdAt) : null);

            if (dataFineEffettiva && !ass.dataDismissione) { 
                timeline.push({
                    id: `rientro-${ass.id}`,
                    date: dataFineEffettiva?.toDate ? dataFineEffettiva.toDate() : new Date(dataFineEffettiva),
                    type: 'rientro',
                    title: '📦 Rientrato in Magazzino (Reso)',
                    description: `L'asset è stato riconsegnato da ${assignedToName}.`,
                    icon: ArrowLeftIcon, 
                    color: 'bg-orange-500'
                });
            }
        });

        // Ordina cronologicamente dal più recente al più vecchio
        return timeline.sort((a, b) => b.date - a.date);
    };


    // --- RENDER TIMELINE ---
    if (selectedItem) {
        const itemTimeline = getTimeline(selectedItem.attrezzaturaID, selectedItem.eventi);

        return (
            <div className="animate-fade-in">
                <button 
                    onClick={() => setSelectedItem(null)} 
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-6 font-bold transition-colors"
                >
                    <ArrowLeftIcon className="h-5 w-5" /> Torna all'elenco storico
                </button>

                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-white border border-slate-300 rounded-xl shadow-sm">
                        <WrenchScrewdriverIcon className="h-8 w-8 text-indigo-600"/>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{selectedItem.nome}</h2>
                        <p className="text-slate-500 font-mono text-sm mt-1">Seriale / Targa: {selectedItem.seriale}</p>
                    </div>
                </div>

                <h3 className="font-bold text-lg text-slate-700 mb-6 px-2">Cronologia Eventi e Assegnazioni</h3>

                <div className="relative border-l-2 border-slate-200 ml-4 md:ml-8 space-y-8 pb-10">
                    {itemTimeline.map(item => (
                        <div key={item.id} className="relative pl-8 md:pl-10 group">
                            <span className={`absolute -left-[17px] top-1 h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white shadow-sm ${item.color} transition-transform group-hover:scale-110`}>
                                <item.icon className="h-4 w-4 text-white" />
                            </span>
                            
                            <div className={`bg-white p-5 rounded-xl border shadow-sm hover:shadow-md transition-shadow 
                                ${item.type === 'guasto' ? 'border-red-200 bg-red-50/30' : 
                                  item.type === 'riparazione' ? 'border-emerald-200 bg-emerald-50/30' :
                                  item.type === 'dismissione' ? 'border-slate-400 bg-slate-100' : 'border-slate-200'}`}>
                                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2 gap-2">
                                    <h4 className={`font-bold text-base 
                                        ${item.type === 'guasto' ? 'text-red-800' : 
                                          item.type === 'riparazione' ? 'text-emerald-800' :
                                          item.type === 'dismissione' ? 'text-slate-800' : 'text-slate-800'}`}>
                                        {item.title}
                                    </h4>
                                    <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                        {item.date.toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className={`text-sm font-medium 
                                    ${item.type === 'guasto' ? 'text-red-600' : 
                                      item.type === 'riparazione' ? 'text-emerald-700' : 'text-slate-600'}`}>
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    ))}
                    
                    {itemTimeline.length === 0 && (
                        <p className="pl-8 text-slate-400 italic">Nessun evento registrato per questo asset.</p>
                    )}
                </div>
            </div>
        );
    }

    // --- RENDER LISTA PRINCIPALE ---
    return (
        <div className="animate-fade-in space-y-4">
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50 p-4 border-b border-slate-200 mb-2 rounded-t-xl">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Storico Assoluto</h2>
                    <p className="text-sm text-slate-500">Cerca un asset per vederne tutta la vita operativa.</p>
                </div>
                <div className="relative w-full md:w-72">
                    <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="Cerca per nome o seriale..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-100/70">
                        <tr>
                            <th className="px-6 py-3 text-left text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Asset</th>
                            <th className="px-6 py-3 text-left text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Seriale / Targa</th>
                            <th className="px-6 py-3 text-right text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Azione</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {unifiedArchive.length === 0 ? (
                            <tr><td colSpan="3" className="p-10 text-center text-slate-500 italic">Nessun asset presente in archivio.</td></tr>
                        ) : (
                            unifiedArchive.map((item, idx) => (
                                <tr key={idx} className="hover:bg-indigo-50/40 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-800">{item.nome}</td>
                                    <td className="px-6 py-4 font-mono text-sm text-slate-600">{item.seriale}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => setSelectedItem(item)}
                                            className="px-4 py-2 bg-white border border-slate-300 text-indigo-700 font-bold text-xs rounded-lg hover:border-indigo-400 hover:bg-indigo-50 shadow-sm transition-all"
                                        >
                                            Vedi Timeline
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};