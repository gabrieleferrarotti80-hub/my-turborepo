import React, { useState, useMemo } from 'react';
import { 
    WrenchScrewdriverIcon, 
    PlusIcon, 
    CheckBadgeIcon, 
    TrashIcon,
    ArrowLeftIcon,
    ClipboardDocumentListIcon,
    CurrencyEuroIcon,
    ArrowDownTrayIcon // ✅ NUOVA ICONA EXPORT
} from '@heroicons/react/24/solid';
import { AggiungiScadenzaModal } from './AggiungiScadenzaModal';

// --- HELPER ESPORTAZIONE CSV ---
// --- HELPER ESPORTAZIONE CSV OTTIMIZZATO PER EXCEL ITALIANO ---
const downloadCSV = (data, filename) => {
    if (!data || !data.length) return;
    
    const headers = Object.keys(data[0]);
    // ✅ FIX 1: Usiamo il punto e virgola come separatore per Excel in italiano
    const separator = ';';
    const csvRows = [headers.join(separator)];
    
    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header] === null || row[header] === undefined ? '' : String(row[header]);
            // Puliamo eventuali "a capo" dentro le note che potrebbero rompere la struttura di Excel
            const cleanVal = val.replace(/(\r\n|\n|\r)/gm, " ");
            return `"${cleanVal.replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(separator));
    }
    
    // ✅ FIX 2: Aggiungiamo il BOM (\uFEFF) per forzare Excel a leggere accenti e caratteri speciali (UTF-8)
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
};

export const GestioneManutenzioniView = ({ 
    scadenze = [], 
    attrezzature = [], 
    onAddScadenza,
    onCompletaScadenza,
    onDeleteScadenza 
}) => {
    
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [filter, setFilter] = useState('in_scadenza'); 
    const [selectedAsset, setSelectedAsset] = useState(null);

    // --- CALCOLO STATO E GIORNI ---
    const scadenzeConStato = useMemo(() => {
        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0); 

        return scadenze.map(s => {
            const dataScad = new Date(s.dataScadenza);
            dataScad.setHours(0, 0, 0, 0);
            const diffTime = dataScad - oggi;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            let statusColor = 'green';
            let statusText = 'IN REGOLA';

            if (s.stato === 'completata') {
                statusColor = 'slate';
                statusText = 'COMPLETATA';
            } else if (diffDays < 0) {
                statusColor = 'red';
                statusText = 'SCADUTA';
            } else if (diffDays <= (s.avvisoGiorni || 30)) {
                statusColor = 'yellow';
                statusText = `SCADE TRA ${diffDays} GG`;
            }

            const liveEquip = attrezzature.find(a => a.id === s.mezzoId || a.id === s.attrezzaturaId);
            const serialeMostrato = s.targaMezzo || s.seriale || liveEquip?.seriale || liveEquip?.targa || null;
            const nomeMostrato = liveEquip?.nome || s.nomeMezzo || 'Asset Sconosciuto';

            return { ...s, statusColor, statusText, diffDays, serialeMostrato, nomeMostrato, aId: s.mezzoId || s.attrezzaturaId };
        }).sort((a, b) => {
            if (a.stato === 'completata' && b.stato !== 'completata') return 1;
            if (b.stato === 'completata' && a.stato !== 'completata') return -1;
            return a.diffDays - b.diffDays;
        });
    }, [scadenze, attrezzature]);

    // --- RAGGRUPPAMENTO PER ARCHIVIO COMPLETO ---
    const archivioAssets = useMemo(() => {
        const map = new Map();
        scadenzeConStato.forEach(s => {
            const aId = s.aId;
            if (!aId) return;

            if (!map.has(aId)) {
                map.set(aId, { id: aId, nome: s.nomeMostrato, seriale: s.serialeMostrato, scadenze: [], costoTotale: 0 });
            }

            const assetGroup = map.get(aId);
            assetGroup.scadenze.push(s);
            if (s.stato === 'completata' && s.costo) {
                assetGroup.costoTotale += Number(s.costo);
            }
        });

        return Array.from(map.values()).map(group => {
            const attive = group.scadenze.filter(s => s.stato !== 'completata').sort((a, b) => a.diffDays - b.diffDays);
            const completate = group.scadenze.filter(s => s.stato === 'completata').sort((a, b) => new Date(b.dataEsecuzione || b.dataScadenza) - new Date(a.dataEsecuzione || a.dataScadenza));
            return {
                ...group,
                prossimaScadenza: attive[0] || null, 
                tutteScadenze: [...attive, ...completate] 
            };
        }).sort((a, b) => a.nome.localeCompare(b.nome));
    }, [scadenzeConStato]);

    // --- FUNZIONE ESPORTAZIONE OFFICINA ---
    const handleExportManutenzioni = () => {
        const dataToExport = archivioAssets.map(group => {
            return {
                "Veicolo / Asset": group.nome || '',
                "Targa / Seriale": group.seriale || '-',
                "Prossima Scadenza": group.prossimaScadenza ? new Date(group.prossimaScadenza.dataScadenza).toLocaleDateString('it-IT') : 'Nessuna',
                "Tipo Intervento Futuro": group.prossimaScadenza ? group.prossimaScadenza.tipoScadenza : '-',
                "Totale Interventi Fatti": group.tutteScadenze.filter(s => s.stato === 'completata').length,
                "Costo Storico Officina (€)": group.costoTotale.toFixed(2)
            };
        });
        downloadCSV(dataToExport, `Report_Costi_Officina_${new Date().toISOString().split('T')[0]}.csv`);
    };

    // --- FILTRAGGIO VISTE NORMALI ---
    const filteredList = useMemo(() => {
        if (filter === 'in_scadenza') return scadenzeConStato.filter(s => s.stato !== 'completata' && s.statusColor === 'yellow');
        if (filter === 'scadute') return scadenzeConStato.filter(s => s.stato !== 'completata' && s.statusColor === 'red');
        if (filter === 'completate') return scadenzeConStato.filter(s => s.stato === 'completata').sort((a, b) => new Date(b.dataEsecuzione) - new Date(a.dataEsecuzione));
        return [];
    }, [scadenzeConStato, filter]);

    const handleSaveNew = (dati) => {
        onAddScadenza(dati);
        setIsAddOpen(false);
    };

    // --- RENDER 1: DETTAGLIO STORICO ---
    if (selectedAsset) {
        return (
            <div className="space-y-6 animate-fade-in p-2">
                <button onClick={() => setSelectedAsset(null)} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors mb-2">
                    <ArrowLeftIcon className="h-5 w-5" /> Torna all'Archivio
                </button>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl"><ClipboardDocumentListIcon className="h-10 w-10"/></div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{selectedAsset.nome}</h2>
                            <p className="text-slate-500 font-mono text-sm mt-1">Targa / Seriale: {selectedAsset.seriale || 'Non specificato'}</p>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl shadow-md border border-slate-700 text-white flex flex-col justify-center">
                        <p className="text-slate-300 text-sm font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                            <CurrencyEuroIcon className="h-5 w-5 text-emerald-400" /> Costo Storico Manutenzioni
                        </p>
                        <h3 className="text-3xl font-mono font-bold text-emerald-400">€ {selectedAsset.costoTotale.toFixed(2)}</h3>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200 mt-6">
                    <div className="bg-slate-50 p-4 border-b border-slate-200"><h3 className="font-bold text-slate-700">Libretto Interventi e Scadenze</h3></div>
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Stato / Data</th>
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Tipo Controllo</th>
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Note Intervento</th>
                                <th className="px-6 py-4 text-right text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Costo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {selectedAsset.tutteScadenze.length === 0 ? (
                                <tr><td colSpan="4" className="p-8 text-center text-slate-500 italic">Nessun intervento registrato.</td></tr>
                            ) : (
                                selectedAsset.tutteScadenze.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border 
                                                    ${s.stato === 'completata' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                                    {s.stato === 'completata' ? 'ESEGUITA' : 'PROGRAMMATA'}
                                                </span>
                                                <span className="text-sm font-bold text-slate-700">
                                                    {s.stato === 'completata' && s.dataEsecuzione ? new Date(s.dataEsecuzione).toLocaleDateString('it-IT') : new Date(s.dataScadenza).toLocaleDateString('it-IT')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-indigo-700 capitalize">{s.tipoScadenza}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{s.noteEsecuzione || s.note || '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            {s.costo ? <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded border border-slate-200">€ {Number(s.costo).toFixed(2)}</span> : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // --- RENDER 2: VISTA PRINCIPALE ---
    return (
        <div className="space-y-6 animate-fade-in p-2">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <WrenchScrewdriverIcon className="h-6 w-6 text-indigo-600"/> Tagliandi & Manutenzioni
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">Controlla le revisioni dei mezzi e programma i controlli DPI.</p>
                </div>
                
                {/* BOTTONI PRINCIPALI: ESPORTA (Solo se si è in Archivio) E PROGRAMMA */}
                <div className="flex gap-3">
                    {filter === 'archivio' && (
                        <button 
                            onClick={handleExportManutenzioni} 
                            className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-100 shadow-sm transition-all"
                            title="Scarica i costi totali in formato Excel/CSV"
                        >
                            <ArrowDownTrayIcon className="h-4 w-4"/> Esporta CSV
                        </button>
                    )}
                    <button 
                        onClick={() => setIsAddOpen(true)} 
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl shadow-md flex items-center gap-2 font-bold hover:bg-indigo-700 hover:shadow-lg transition-all"
                    >
                        <PlusIcon className="h-5 w-5"/> Programma Scadenza
                    </button>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200">
                <button onClick={() => setFilter('in_scadenza')} className={`px-5 py-2 rounded-t-lg text-sm font-bold whitespace-nowrap transition-colors ${filter === 'in_scadenza' ? 'bg-yellow-50 text-yellow-700 border-b-2 border-yellow-500' : 'text-slate-500 hover:text-yellow-600 hover:bg-yellow-50'}`}>In Scadenza ⏳</button>
                <button onClick={() => setFilter('scadute')} className={`px-5 py-2 rounded-t-lg text-sm font-bold whitespace-nowrap transition-colors ${filter === 'scadute' ? 'bg-red-50 text-red-700 border-b-2 border-red-600' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'}`}>Scadute ⚠️</button>
                <button onClick={() => setFilter('archivio')} className={`px-5 py-2 rounded-t-lg text-sm font-bold whitespace-nowrap transition-colors ${filter === 'archivio' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}>Archivio Parco Mezzi 📋</button>
                <button onClick={() => setFilter('completate')} className={`px-5 py-2 rounded-t-lg text-sm font-bold whitespace-nowrap transition-colors ${filter === 'completate' ? 'bg-slate-100 text-slate-800 border-b-2 border-slate-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>Storico Interventi Fatti 🗄️</button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Stato / Prossima Scad.</th>
                            <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Asset / Veicolo</th>
                            <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Targa / Seriale</th>
                            <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Data Scadenza</th>
                            <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Tipo Controllo</th>
                            <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Note / Costo</th>
                            <th className="px-6 py-4 text-right text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filter === 'archivio' && archivioAssets.map(group => {
                            const sc = group.prossimaScadenza;
                            return (
                                <tr key={group.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        {sc ? (
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm
                                                ${sc.statusColor === 'red' ? 'bg-red-50 text-red-700 border-red-200' : 
                                                  sc.statusColor === 'yellow' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${sc.statusColor === 'red' ? 'bg-red-500 animate-pulse' : sc.statusColor === 'yellow' ? 'bg-yellow-500' : 'bg-emerald-500'}`}></div>
                                                {sc.statusText}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-xs font-bold">NESSUNA SCADENZA ATTIVA</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-800 text-[15px]">{group.nome}</td>
                                    <td className="px-6 py-4">
                                        {group.seriale ? <span className="font-mono text-xs font-bold text-slate-700 bg-white border border-slate-300 px-3 py-1.5 rounded-md shadow-sm">{group.seriale}</span> : <span className="text-slate-400 text-xs italic pl-2">-</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-sm font-bold ${sc?.statusColor === 'red' ? 'text-red-600' : 'text-slate-700'}`}>
                                            {sc ? new Date(sc.dataScadenza).toLocaleDateString('it-IT') : '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {sc ? <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 capitalize">{sc.tipoScadenza}</span> : <span className="text-slate-400">-</span>}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-mono font-bold text-slate-600">
                                        Totale Costi: € {group.costoTotale.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => setSelectedAsset(group)}
                                            className="text-xs font-bold bg-white text-indigo-600 border border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 px-4 py-2 rounded-lg shadow-sm transition-all"
                                        >
                                            Vedi Libretto
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}

                        {filter !== 'archivio' && filteredList.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm
                                        ${s.statusColor === 'red' ? 'bg-red-50 text-red-700 border-red-200' : 
                                          s.statusColor === 'yellow' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                                          s.statusColor === 'slate' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${s.statusColor === 'red' ? 'bg-red-500 animate-pulse' : s.statusColor === 'yellow' ? 'bg-yellow-500' : s.statusColor === 'slate' ? 'bg-slate-400' : 'bg-emerald-500'}`}></div>
                                        {s.statusText}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-800 text-[15px]">{s.nomeMostrato}</td>
                                <td className="px-6 py-4">
                                    {s.serialeMostrato ? <span className="font-mono text-xs font-bold text-slate-700 bg-white border border-slate-300 px-3 py-1.5 rounded-md shadow-sm">{s.serialeMostrato}</span> : <span className="text-slate-400 text-xs italic pl-2">-</span>}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-sm font-bold ${s.statusColor === 'red' ? 'text-red-600' : 'text-slate-700'}`}>
                                        {new Date(s.dataScadenza).toLocaleDateString('it-IT')}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 capitalize">{s.tipoScadenza}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-slate-600 truncate max-w-[12rem]" title={s.note}>{s.note || '-'}</div>
                                    {s.stato === 'completata' && s.costo > 0 && <div className="text-xs font-mono font-bold text-slate-700 mt-1">Costo: € {Number(s.costo).toFixed(2)}</div>}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {s.stato !== 'completata' ? (
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => {
                                                    const costoInput = prompt("Costo dell'intervento in €? (Usa punto o virgola per decimali, es: 15.50)", "0");
                                                    if (costoInput !== null) {
                                                        const costoFloat = parseFloat(costoInput.replace(',', '.'));
                                                        onCompletaScadenza(s.id, { data: new Date(), costo: isNaN(costoFloat) ? 0 : costoFloat, note: 'Intervento completato' });
                                                    }
                                                }}
                                                className="flex items-center gap-1.5 text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-300 text-xs font-bold uppercase px-3 py-1.5 rounded-lg shadow-sm transition-all"
                                            >
                                                <CheckBadgeIcon className="h-4 w-4" /> Risolvi
                                            </button>
                                            <button 
                                                onClick={() => { if(window.confirm('Vuoi davvero eliminare questa scadenza annullandola?')) onDeleteScadenza(s.id); }}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Elimina"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    ) : <span className="text-slate-400 italic text-sm font-medium">Archiviata</span>}
                                </td>
                            </tr>
                        ))}

                        {((filter === 'archivio' && archivioAssets.length === 0) || (filter !== 'archivio' && filteredList.length === 0)) && (
                            <tr><td colSpan="7" className="p-12 text-center text-slate-500 font-medium italic">Nessuna voce presente in questa vista.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <AggiungiScadenzaModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} attrezzature={attrezzature} onSave={handleSaveNew} />
        </div>
    );
};