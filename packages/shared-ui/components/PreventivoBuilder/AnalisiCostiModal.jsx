import React, { useState } from 'react';
import { 
    XMarkIcon, CheckCircleIcon, ChartPieIcon, ArchiveBoxIcon, 
    KeyIcon, TruckIcon, UserGroupIcon, BuildingOfficeIcon, WrenchScrewdriverIcon, UserIcon, PlusIcon,
    WrenchIcon, InformationCircleIcon, MagnifyingGlassIcon, CheckBadgeIcon, EnvelopeIcon
} from '@heroicons/react/24/outline';
import { LockClosedIcon } from '@heroicons/react/24/solid';

import { StoricoPrezziModal } from './StoricoPrezziModal';

export const AnalisiCostiModal = ({ 
    riga, onClose, onSaveAnalisi, 
    magazzinoMateriali, tuttiMateriali, 
    magazzinoMezzi, magazzinoAttrezzature,
    tuttiNoleggi, ruoliAziendali, tariffeAziendali, subappaltatori,
    onRequestRDO,
    isPro, // 🌟 RICEVIAMO ISPRO
    onRequirePro // 🌟 RICEVIAMO IL TRIGGER DEL POPUP
}) => {
    const defaultCosti = { materiali: [], attrezzature: [], noli: [], mezzi: [], manodopera: [], subappalti: [], altro: [] };
    const [dettaglioCosti, setDettaglioCosti] = useState({ ...defaultCosti, ...(riga.analisiCosti || {}) });
    const [targetStorico, setTargetStorico] = useState(null); 

    const handleAddCosto = (cat) => setDettaglioCosti(prev => ({ ...prev, [cat]: [...(prev[cat]||[]), { id: Date.now(), isNewItem: true, descrizione: '', numeroPersone: 1, quantita: 1, costoUnitario: 0, unitaMisura: '' }] }));
    const handleCostoChange = (cat, id, field, value) => setDettaglioCosti(prev => ({ ...prev, [cat]: prev[cat].map(r => r.id === id ? { ...r, [field]: value } : r) }));
    const handleRemoveCosto = (cat, id) => setDettaglioCosti(prev => ({ ...prev, [cat]: prev[cat].filter(r => r.id !== id) }));

    const handleSelectFromStorico = (itemSelezionato) => {
        if (!targetStorico) return;
        const { cat, id } = targetStorico;
        handleCostoChange(cat, id, 'descrizione', itemSelezionato.descrizione);
        handleCostoChange(cat, id, 'costoUnitario', itemSelezionato.prezzo);
        handleCostoChange(cat, id, 'fornitoreId', itemSelezionato.fornitoreId);
        handleCostoChange(cat, id, 'fornitoreNome', itemSelezionato.aziendaNome);
        handleCostoChange(cat, id, 'preventivoRefId', itemSelezionato.preventivoId || itemSelezionato.rdoId);
        handleCostoChange(cat, id, 'isNewItem', true); 
        setTargetStorico(null); 
    };

    const handleRichiestaRDO = (categoria, voce) => {
        if (!onRequestRDO) return;
        onRequestRDO({ categoria: categoria === 'materiali' ? 'Materiale' : categoria === 'noli' ? 'Nolo' : 'Subappalto', descrizioneAttesa: voce.descrizione || '', quantita: voce.quantita || 1, unitaMisura: riga.unitaMisura || 'pz', riferimentoGara: riga.codice });
    };

    const formatMezzoName = (a) => `${a.nome || a.descrizione || a.modello || 'Senza Nome'}${a.targa ? ` (${a.targa})` : ''}`.trim();
    const calcTotaleArray = (arr) => (arr||[]).reduce((acc, curr) => acc + ((Number(curr.numeroPersone)||1) * (Number(curr.quantita)||0) * (Number(curr.costoUnitario)||0)), 0);
    
    const costiInterni = {
        materiali: calcTotaleArray(dettaglioCosti.materiali), attrezzature: calcTotaleArray(dettaglioCosti.attrezzature), noli: calcTotaleArray(dettaglioCosti.noli),
        mezzi: calcTotaleArray(dettaglioCosti.mezzi), manodopera: calcTotaleArray(dettaglioCosti.manodopera), subappalti: calcTotaleArray(dettaglioCosti.subappalti), altro: calcTotaleArray(dettaglioCosti.altro)
    };
    
    const costoVivoTotale = Object.values(costiInterni).reduce((a,b)=>a+b, 0);
    const qtaReale = Number(riga.quantita) || 1;
    const costoUnitarioDerivato = costoVivoTotale / qtaReale;

    const handleSave = () => {
        const isVuota = Object.values(dettaglioCosti).every(arr => !arr || arr.length === 0);
        onSaveAnalisi(riga.id, isVuota ? null : { ...dettaglioCosti, totaleCostoVivo: costoVivoTotale }, costoVivoTotale);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            {targetStorico && isPro && (
                <StoricoPrezziModal onClose={() => setTargetStorico(null)} onSelect={handleSelectFromStorico} tipoRicerca={targetStorico.cat} tuttiMateriali={tuttiMateriali} tuttiNoleggi={tuttiNoleggi} />
            )}

            <div className="bg-slate-50 w-full max-w-6xl max-h-[95vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-slate-300 relative z-10">
                <div className="bg-white p-6 flex justify-between items-center shrink-0 border-b border-slate-200 z-10 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-sm"><ChartPieIcon className="h-7 w-7 stroke-2"/></div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800">Analisi Costi (Giustificativi)</h3>
                            <p className="text-sm font-bold text-slate-500 mt-1 line-clamp-1">{riga.codice} - {riga.descrizione}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors"><XMarkIcon className="h-6 w-6 stroke-2"/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
                    <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex items-start gap-3">
                        <InformationCircleIcon className="h-6 w-6 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm text-indigo-800 font-bold">Inserisci i costi per completare l'intero intervento previsto.</p>
                            <p className="text-xs text-indigo-600 mt-1">Quantità in esame: <strong className="text-indigo-900">{riga.quantita} {riga.unitaMisura}</strong>. Il sistema dividerà il totale inserito per ricavare il tuo <strong className="underline">Costo Unitario</strong>.</p>
                        </div>
                    </div>

                    {/* MATERIALI */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                            <h4 className="font-bold text-slate-800 flex items-center gap-2"><ArchiveBoxIcon className="h-5 w-5 text-sky-500"/> Materiali</h4>
                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-black tracking-wider">Totale: € {costiInterni.materiali.toFixed(2)}</span>
                        </div>
                        <table className="w-full text-left mb-2">
                            <thead className="text-[10px] font-bold text-slate-400 uppercase">
                                <tr><th className="py-2 w-[50%]">Descrizione / Provenienza</th><th className="py-2 text-center">Q.tà</th><th className="py-2 text-right">Costo Unit.</th><th className="py-2 text-right pr-2">Importo</th><th></th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {(dettaglioCosti.materiali||[]).map(v => (
                                    <tr key={v.id} className="group">
                                        <td className="py-2 pr-2">
                                            {v.isNewItem ? (
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex gap-2">
                                                        <input type="text" placeholder="Nome materiale..." value={v.descrizione} onChange={e => handleCostoChange('materiali', v.id, 'descrizione', e.target.value)} className="w-full bg-white border border-slate-200 rounded p-2 text-xs font-bold focus:border-sky-500 outline-none" />
                                                        
                                                        {/* 🌟 BOTTONI AUTOMAZIONE CON LUCCHETTO 🌟 */}
                                                        <button onClick={() => isPro ? setTargetStorico({cat: 'materiali', id: v.id}) : onRequirePro()} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 whitespace-nowrap transition-colors ${isPro ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100' : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'}`} title={isPro ? "Cerca nei Preventivi e RDO passate" : "Funzione PRO: Storico Aziendale"}>
                                                            <MagnifyingGlassIcon className="h-4 w-4"/> Storico {!isPro && <LockClosedIcon className="h-3 w-3 inline text-slate-400"/>}
                                                        </button>

                                                        <button onClick={() => isPro ? handleRichiestaRDO('materiali', v) : onRequirePro()} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 whitespace-nowrap transition-colors ${isPro ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'}`} title={isPro ? "Invia Nuova RDO" : "Funzione PRO: Crea RDO"}>
                                                            <EnvelopeIcon className="h-4 w-4"/> RDO {!isPro && <LockClosedIcon className="h-3 w-3 inline text-slate-400"/>}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <select value={v.descrizione} onChange={e => {
                                                    const val = e.target.value;
                                                    if(val === 'NEW') { handleCostoChange('materiali', v.id, 'isNewItem', true); handleCostoChange('materiali', v.id, 'descrizione', ''); return; }
                                                    const matMagazzino = magazzinoMateriali.find(m => m.nome === val);
                                                    if (matMagazzino) { handleCostoChange('materiali', v.id, 'descrizione', matMagazzino.nome); handleCostoChange('materiali', v.id, 'costoUnitario', matMagazzino.costoStandard||0); }
                                                    else { handleCostoChange('materiali', v.id, 'descrizione', val); }
                                                }} className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-medium outline-none">
                                                    <option value="">Seleziona Base...</option>
                                                    <optgroup label="📦 Magazzino Interno">{magazzinoMateriali.map((m) => <option key={`mag-${m.id}`} value={m.nome}>{m.nome}</option>)}</optgroup>
                                                    {/* 🌟 MOSTRA LISTINI SOLO SE PRO 🌟 */}
                                                    {isPro && tuttiMateriali.length > 0 && <optgroup label="🚚 Listini Fornitori">{tuttiMateriali.map((m, i) => <option key={`forn-${i}`} value={m.descrizione}>{m.descrizione}</option>)}</optgroup>}
                                                    <option value="NEW" className="font-bold text-sky-600">➕ Inserimento Libero / Prezzo Manuale</option>
                                                </select>
                                            )}
                                        </td>
                                        <td className="py-2 px-1 text-center align-top pt-3"><input type="number" value={v.quantita} onChange={(e) => handleCostoChange('materiali', v.id, 'quantita', e.target.value)} className="w-16 p-1.5 text-xs font-bold text-center border border-slate-200 rounded focus:border-sky-500 outline-none" /></td>
                                        <td className="py-2 px-1 text-right flex items-center justify-end gap-1 align-top pt-3"><span className="text-xs text-slate-400">€</span><input type="number" value={v.costoUnitario} onChange={(e) => handleCostoChange('materiali', v.id, 'costoUnitario', e.target.value)} className="w-20 p-1.5 text-xs font-bold text-right border border-slate-200 rounded focus:border-sky-500 outline-none" /></td>
                                        <td className="py-2 pl-2 pr-2 text-sm font-black text-slate-700 text-right align-top pt-4">€ {(v.quantita * v.costoUnitario).toFixed(2)}</td>
                                        <td className="py-2 text-right align-top pt-4"><button onClick={() => handleRemoveCosto('materiali', v.id)} className="text-slate-300 hover:text-red-500"><XMarkIcon className="h-5 w-5"/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button onClick={() => handleAddCosto('materiali')} className="mt-2 text-sky-600 text-xs font-bold flex items-center gap-1 hover:text-sky-800 bg-sky-50 px-3 py-1.5 rounded-lg transition-colors"><PlusIcon className="h-4 w-4"/> Aggiungi Materiale</button>
                    </div>

                    {/* MANODOPERA (Uguale per tutti) */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                            <h4 className="font-bold text-slate-800 flex items-center gap-2"><UserGroupIcon className="h-5 w-5 text-orange-500"/> Manodopera Interna</h4>
                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-black tracking-wider">Totale: € {costiInterni.manodopera.toFixed(2)}</span>
                        </div>
                        <table className="w-full text-left mb-2">
                            <thead className="text-[10px] font-bold text-slate-400 uppercase">
                                <tr><th className="py-2 w-[40%]">Ruolo / Qualifica</th><th className="py-2 text-center" title="N° Persone">N° Op.</th><th className="py-2 text-center">Ore</th><th className="py-2 text-right">Costo Orario</th><th className="py-2 text-right pr-2">Importo</th><th></th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {(dettaglioCosti.manodopera||[]).map(v => (
                                    <tr key={v.id} className="group">
                                        <td className="py-2 pr-2">
                                            <select value={v.descrizione} onChange={e => {
                                                const ruolo = e.target.value;
                                                let nuovoCosto = 0;
                                                if (ruolo !== 'Libero' && ruolo !== '') {
                                                    const tariffa = Object.entries(tariffeAziendali).find(([key]) => key.toLowerCase() === ruolo.toLowerCase());
                                                    if (tariffa) nuovoCosto = tariffa[1];
                                                }
                                                handleCostoChange('manodopera', v.id, 'descrizione', ruolo);
                                                handleCostoChange('manodopera', v.id, 'costoUnitario', nuovoCosto);
                                            }} className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-bold text-slate-700 outline-none">
                                                <option value="">Seleziona Ruolo...</option>
                                                {ruoliAziendali.map(r => <option key={r} value={r}>{r}</option>)}
                                                <option value="Libero" className="text-orange-600 font-bold">Altro (Libero)</option>
                                            </select>
                                        </td>
                                        <td className="py-2 px-1 text-center flex justify-center items-center gap-1 mt-1"><UserIcon className="h-3 w-3 text-slate-400"/><input type="number" value={v.numeroPersone||1} onChange={(e) => handleCostoChange('manodopera', v.id, 'numeroPersone', e.target.value)} className="w-12 p-1.5 text-xs font-bold text-center border border-slate-200 rounded outline-none text-orange-600" /></td>
                                        <td className="py-2 px-1 text-center"><input type="number" value={v.quantita} onChange={(e) => handleCostoChange('manodopera', v.id, 'quantita', e.target.value)} className="w-16 p-1.5 text-xs font-bold text-center border border-slate-200 rounded outline-none" /></td>
                                        <td className="py-2 px-1 text-right flex items-center justify-end gap-1"><span className="text-xs text-slate-400">€</span><input type="number" value={v.costoUnitario} onChange={(e) => handleCostoChange('manodopera', v.id, 'costoUnitario', e.target.value)} className="w-20 p-1.5 text-xs font-bold text-right border border-slate-200 rounded outline-none" /></td>
                                        <td className="py-2 pl-2 pr-2 text-sm font-black text-slate-700 text-right">€ {((v.numeroPersone||1) * v.quantita * v.costoUnitario).toFixed(2)}</td>
                                        <td className="py-2 text-right"><button onClick={() => handleRemoveCosto('manodopera', v.id)} className="text-slate-300 hover:text-red-500"><XMarkIcon className="h-5 w-5"/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button onClick={() => handleAddCosto('manodopera')} className="mt-2 text-orange-600 text-xs font-bold flex items-center gap-1 hover:text-orange-800 bg-orange-50 px-3 py-1.5 rounded-lg transition-colors"><PlusIcon className="h-4 w-4"/> Aggiungi Manodopera</button>
                    </div>

                    {/* NOLI ESTERNI */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                            <h4 className="font-bold text-slate-800 flex items-center gap-2"><KeyIcon className="h-5 w-5 text-indigo-500"/> Noli Esterni e Subappalti</h4>
                        </div>
                        <table className="w-full text-left mb-2">
                            <thead className="text-[10px] font-bold text-slate-400 uppercase">
                                <tr><th className="py-2">Descrizione Voce</th><th className="py-2 text-center w-12">Q.tà</th><th className="py-2 text-right">Costo</th><th></th></tr>
                            </thead>
                            <tbody>
                                {/* Mostriamo sia noli che subappalti insieme per brevità visiva */}
                                {(dettaglioCosti.noli||[]).map(v => (
                                    <tr key={v.id}>
                                        <td className="py-2 pr-2 flex gap-2">
                                            <input type="text" placeholder="Es. Nolo gru / Posa tegole..." value={v.descrizione} onChange={e => handleCostoChange('noli', v.id, 'descrizione', e.target.value)} className="w-full bg-white border border-slate-200 rounded p-2 text-xs font-bold outline-none" />
                                            
                                            <button onClick={() => isPro ? setTargetStorico({cat: 'noli', id: v.id}) : onRequirePro()} className={`px-2 rounded-md text-[10px] font-bold flex items-center gap-1 whitespace-nowrap transition-colors ${isPro ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'}`}>
                                                <MagnifyingGlassIcon className="h-3 w-3"/> {!isPro && <LockClosedIcon className="h-2 w-2 inline" />}
                                            </button>
                                            <button onClick={() => isPro ? handleRichiestaRDO('noli', v) : onRequirePro()} className={`px-2 rounded-md text-[10px] font-bold flex items-center gap-1 whitespace-nowrap transition-colors ${isPro ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'}`}>
                                                <EnvelopeIcon className="h-3 w-3"/> {!isPro && <LockClosedIcon className="h-2 w-2 inline" />}
                                            </button>
                                        </td>
                                        <td className="py-2 px-1"><input type="number" value={v.quantita} onChange={(e) => handleCostoChange('noli', v.id, 'quantita', e.target.value)} className="w-12 p-1.5 text-xs text-center border rounded outline-none" /></td>
                                        <td className="py-2 px-1"><input type="number" value={v.costoUnitario} onChange={(e) => handleCostoChange('noli', v.id, 'costoUnitario', e.target.value)} className="w-16 p-1.5 text-xs text-right border rounded outline-none" /></td>
                                        <td className="py-2 text-right"><button onClick={() => handleRemoveCosto('noli', v.id)} className="text-slate-300 hover:text-red-500"><XMarkIcon className="h-4 w-4"/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button onClick={() => handleAddCosto('noli')} className="text-indigo-600 text-[10px] font-bold mt-2">+ Aggiungi Voce Esterna</button>
                    </div>

                </div>

                <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-between items-center shrink-0 z-10 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
                    <div className="flex gap-6 items-center">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Costo Assoluto</p>
                            <p className="text-2xl font-black text-slate-500">€ {costoVivoTotale.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                        </div>
                        <div className="h-10 w-px bg-slate-300"></div>
                        <div>
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-0.5">Costo Az. Unitario ({riga.unitaMisura})</p>
                            <p className="text-3xl font-black text-rose-600">€ {costoUnitarioDerivato.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-3.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Chiudi</button>
                        <button onClick={handleSave} className="px-8 py-3.5 font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 text-lg">
                            <CheckCircleIcon className="h-6 w-6" /> Applica Costo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};