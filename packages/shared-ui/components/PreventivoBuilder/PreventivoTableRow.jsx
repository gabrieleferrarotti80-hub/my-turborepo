// packages/shared-ui/components/PreventivoBuilder/PreventivoTableRow.jsx

import React from 'react';
import { 
    TrashIcon, CalculatorIcon, CurrencyEuroIcon, UserGroupIcon, BeakerIcon,
    ChartPieIcon, SparklesIcon, ChevronDownIcon, ChevronUpIcon, CheckCircleIcon,
    DocumentDuplicateIcon, ClipboardDocumentIcon, TagIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

import { SmartDescrizioneInput } from './SmartDescrizioneInput';
import { SimulatoreAnalisiCostiModal } from './SimulatoreAnalisiCostiModal';

export const PreventivoTableRow = ({
    riga, 
    listinoDb, 
    analyzingRigaId, 
    lastEditedRowId,
    setAnalyzingRigaId, 
    setLastEditedRowId, 
    aggiornaDatiRiga, 
    rimuoviRiga, 
    parseNum,
    
    copiedAnalisi,
    handleCopiaAnalisi,
    handleIncollaAnalisi,

    gestisciSalvataggioAnalisi,
    salvaVoceInBigData,
    magazzinoMateriali, tuttiMateriali,
    magazzinoMezzi, magazzinoAttrezzature,
    tuttiNoleggi, ruoliAziendali, tariffeAziendali,
    tariffeSimulazione, subappaltatori,
    onRequestRDO, vociStoricheBigData,
    
    categorieGanttUsate = [] // 🌟 RICEVE LE CATEGORIE DINAMICHE DAL PADRE
}) => {
    
    let costoStorico = null;
    if (riga.listinoRefId) {
        const itemMaster = listinoDb.find(m => m.id === riga.listinoRefId || (m.isMaster && m.codice === riga.codice));
        if (itemMaster) costoStorico = parseNum(itemMaster.prezzoUnitario || itemMaster.costoStandard || itemMaster.costoUnitario);
    }
    
    const isExpanded = analyzingRigaId === riga.id;
    const isLastEdited = lastEditedRowId === riga.id;

    return (
        <tbody id={`riga-${riga.id}`} className={`border-b-[3px] border-slate-400 transition-colors group ${isLastEdited && !isExpanded ? 'bg-emerald-50/30' : ''}`}>
            <tr className={`divide-x divide-slate-300 ${isExpanded ? 'bg-indigo-50 border-l-4 border-indigo-500' : isLastEdited ? 'border-l-4 border-emerald-400' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}>
                <td className="px-3 py-3 relative min-w-[300px]">
                    
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                        {riga.progressivo && <span className="text-[10px] font-black text-slate-400">#{riga.progressivo}</span>}
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${riga.codice === 'CUSTOM' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{riga.codice}</span>
                        {riga.masterId && <span className="flex items-center gap-1 text-[8px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase border border-indigo-200"><StarIconSolid className="h-2 w-2" /> Master Ufficiale</span>}
                        {riga.isFromBigData && <span className="flex items-center gap-1 text-[8px] font-black text-fuchsia-600 bg-fuchsia-50 px-1.5 py-0.5 rounded uppercase border border-fuchsia-200"><BeakerIcon className="h-2 w-2" /> Storico Appreso</span>}
                        
                        {isLastEdited && (
                            <span className="flex items-center gap-1 text-[8px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded uppercase border border-emerald-300 shadow-sm animate-pulse">
                                <CheckCircleIcon className="h-2 w-2 stroke-2" /> Ultima Lavorata
                            </span>
                        )}
                    </div>
                    
                    <SmartDescrizioneInput riga={riga} listinoDb={listinoDb} onUpdateMultiple={aggiornaDatiRiga} />
                    
                    <div className="mt-3 flex flex-wrap items-center gap-2 lg:gap-3 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100 w-full shadow-sm overflow-hidden">
                        
                        <div className="flex items-center gap-1.5 border-r border-indigo-200 pr-2 lg:pr-3 whitespace-nowrap shrink-0">
                            <CurrencyEuroIcon className="h-4 w-4 text-indigo-400" />
                            <span className="text-[10px] font-black text-slate-500 uppercase">Unit. Bando:</span>
                            <span className="text-xs font-black text-indigo-900">€ {parseNum(riga.prezzoGaraOriginale).toFixed(2)}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 border-r border-indigo-200 pr-2 lg:pr-3 whitespace-nowrap shrink-0">
                            <CalculatorIcon className="h-4 w-4 text-indigo-400" />
                            <span className="text-[10px] font-black text-slate-500 uppercase">Tot. Bando:</span>
                            <span className="text-xs font-black text-indigo-900">€ {(parseNum(riga.prezzoGaraOriginale) * (parseNum(riga.quantita) || 0) * (parseNum(riga.numeroInterventi) || 1)).toLocaleString('it-IT', {minimumFractionDigits: 2})}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 border-r border-indigo-200 pr-2 lg:pr-3 whitespace-nowrap shrink-0">
                            <UserGroupIcon className="h-4 w-4 text-amber-500" />
                            <span className="text-[10px] font-black text-slate-500 uppercase">Manodopera:</span>
                            <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300 shadow-sm">
                                {riga.incidenzaManodopera > 0 ? `${riga.incidenzaManodopera}%` : (riga.prezzoSenzaManodopera > 0 ? `Da P. Puro` : 'N.D.')}
                            </span>
                        </div>

                        {/* 🌟 SELETTORE FASE GANTT IBRIDO (TESTO LIBERO + AUTOSUGGERIMENTI) 🌟 */}
                        <div className="flex items-center gap-1.5 pl-1 whitespace-nowrap shrink-0 ml-auto">
                            <TagIcon className="h-4 w-4 text-emerald-500" />
                            <input 
                                type="text"
                                list={`fasiGanttList-${riga.id}`}
                                placeholder="+ Scrivi o scegli fase..."
                                value={riga.categoriaGantt || ''} 
                                onChange={(e) => aggiornaDatiRiga(riga.id, { categoriaGantt: e.target.value })}
                                className={`text-[10px] font-black px-3 py-1 rounded-lg border shadow-sm outline-none transition-all w-48 ${
                                    riga.categoriaGantt 
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-400 hover:bg-emerald-200' 
                                        : 'bg-white text-slate-600 border-slate-300 hover:border-emerald-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                                }`}
                            />
                            {/* Datalist popolato in modo dinamico con le categorie già usate nel computo */}
                            <datalist id={`fasiGanttList-${riga.id}`}>
                                {categorieGanttUsate.map((cat, idx) => (
                                    <option key={idx} value={cat} />
                                ))}
                            </datalist>
                        </div>
                    </div>
                </td>
                
                <td className="px-2 py-3 bg-slate-50/50 align-top pt-5"><input type="text" value={riga.unitaMisura || ''} onChange={(e) => aggiornaDatiRiga(riga.id, {unitaMisura: e.target.value})} className="w-12 text-center font-bold text-slate-600 bg-white border border-slate-300 rounded px-1 outline-none focus:border-indigo-400 block mx-auto"/></td>
                <td className="px-2 py-3 bg-indigo-50/30 align-top pt-5"><input type="text" value={riga.quantita} onChange={(e) => aggiornaDatiRiga(riga.id, {quantita: e.target.value})} className="w-16 text-center font-black text-indigo-700 bg-white border border-indigo-300 rounded px-1 outline-none block mx-auto"/></td>
                <td className="px-2 py-3 bg-indigo-50/30 align-top pt-5"><input type="text" value={riga.numeroInterventi || 1} onChange={(e) => aggiornaDatiRiga(riga.id, {numeroInterventi: e.target.value})} className="w-12 text-center font-black text-indigo-700 bg-white border border-indigo-300 rounded px-1 outline-none block mx-auto"/></td>
                <td className="px-3 py-3 text-right align-top pt-5"><span className="text-slate-400 text-xs">€</span><input type="text" value={riga.prezzoGaraOriginale} onChange={(e) => aggiornaDatiRiga(riga.id, {prezzoGaraOriginale: e.target.value})} className="w-16 text-right font-bold text-slate-500 bg-transparent border-b border-transparent focus:border-slate-400 outline-none ml-1"/></td>
                <td className="px-3 py-3 text-right font-black text-slate-700 bg-slate-100/50 align-top pt-5">€ {((parseNum(riga.prezzoGaraOriginale) || 0) * (parseNum(riga.quantita) || 0) * (parseNum(riga.numeroInterventi) || 1)).toLocaleString('it-IT', {minimumFractionDigits: 2})}</td>
                
                <td className="px-3 py-3 bg-rose-50/30 text-right align-top pt-4">
                    <div className="flex items-center justify-end gap-1">
                        <div className="relative mr-1">
                            <span className="text-rose-400 text-xs absolute left-2 top-1/2 -translate-y-1/2">€</span>
                            <input 
                                type="text" 
                                value={riga.analisiCosti ? parseNum(riga.costoUnitarioBase).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : riga.costoUnitarioBase} 
                                onChange={(e) => aggiornaDatiRiga(riga.id, {costoUnitarioBase: e.target.value})} 
                                disabled={!!riga.analisiCosti} 
                                className={`w-20 text-right font-bold text-rose-700 border rounded px-1 outline-none pl-4 ${riga.analisiCosti ? 'bg-slate-200 border-slate-300 cursor-not-allowed' : 'bg-white border-rose-300'}`} 
                            />
                        </div>
                        
                        {riga.analisiCosti && (
                            <button
                                onClick={() => handleCopiaAnalisi(riga)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm"
                                title="Copia questa Analisi Costi"
                            >
                                <DocumentDuplicateIcon className="h-4 w-4" />
                            </button>
                        )}

                        {copiedAnalisi && (
                            <button
                                onClick={() => handleIncollaAnalisi(riga.id)}
                                className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors shadow-sm animate-pulse"
                                title={`Incolla e adatta l'Analisi copiata`}
                            >
                                <ClipboardDocumentIcon className="h-4 w-4" />
                            </button>
                        )}

                        <button 
                            onClick={() => {
                                setAnalyzingRigaId(isExpanded ? null : riga.id);
                                setLastEditedRowId(riga.id);
                            }} 
                            className={`p-1.5 rounded-lg border transition-colors shadow-sm flex items-center gap-1 ml-1 ${isExpanded ? 'bg-indigo-600 text-white border-indigo-700' : riga.analisiCosti ? 'bg-indigo-100 text-indigo-700 border-indigo-300 hover:bg-indigo-200' : 'bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50'}`} 
                            title="Apri/Chiudi Analisi Costi"
                        >
                            <ChartPieIcon className="h-4 w-4" />
                            {isExpanded ? <ChevronUpIcon className="h-3 w-3"/> : <ChevronDownIcon className="h-3 w-3"/>}
                        </button>
                    </div>
                    {costoStorico > 0 && !riga.analisiCosti && (
                        <div className="mt-1.5 flex justify-end items-center gap-1 text-[9px] text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors group" onClick={() => aggiornaDatiRiga(riga.id, { costoUnitarioBase: costoStorico })}>
                            <SparklesIcon className="h-3 w-3 text-indigo-400 group-hover:animate-pulse" /> Storico: <strong className="group-hover:underline">€ {costoStorico.toFixed(2)}</strong>
                        </div>
                    )}
                </td>

                <td className="px-3 py-3 text-right font-black text-rose-800 bg-rose-100/50 align-top pt-5">
                    € {((parseNum(riga.costoUnitarioBase) || 0) * (parseNum(riga.quantita) || 0) * (parseNum(riga.numeroInterventi) || 1)).toLocaleString('it-IT', {minimumFractionDigits: 2})}
                </td>
                
                <td className="px-2 py-3 bg-sky-50/30 text-center align-top pt-5"><input type="text" value={riga.scontoProposto} onChange={(e) => aggiornaDatiRiga(riga.id, {scontoProposto: e.target.value})} className="w-12 text-center font-bold text-sky-700 bg-white border border-sky-300 rounded px-1 outline-none"/> %</td>
                <td className="px-2 py-3 bg-amber-50/30 text-center align-top pt-5"><input type="text" value={riga.marginePercentuale} onChange={(e) => aggiornaDatiRiga(riga.id, {marginePercentuale: e.target.value})} className="w-12 text-center font-bold text-amber-700 bg-white border border-amber-300 rounded px-1 outline-none"/> %</td>
                <td className="px-3 py-3 bg-emerald-50/30 text-right align-top pt-5"><span className="text-emerald-500 text-xs">€</span><input type="text" value={riga.prezzoVenditaUnitario} onChange={(e) => aggiornaDatiRiga(riga.id, {prezzoVenditaUnitario: e.target.value})} className="w-20 text-right font-black text-emerald-700 bg-white border border-emerald-300 rounded px-1 outline-none ml-1"/></td>
                <td className="px-3 py-3 text-right font-black text-slate-800 align-top pt-5">€ {((parseNum(riga.quantita) || 0) * (parseNum(riga.numeroInterventi) || 1) * (parseNum(riga.prezzoVenditaUnitario) || 0)).toLocaleString('it-IT', {minimumFractionDigits: 2})}</td>
                <td className="px-2 py-3 text-center align-top pt-4"><button onClick={() => rimuoviRiga(riga.id)} className="text-slate-300 hover:text-red-500"><TrashIcon className="h-5 w-5 mx-auto" /></button></td>
            </tr>

            {isExpanded && (
                <tr>
                    <td colSpan="13" className="p-0 border-t-2 border-slate-300 bg-slate-100 relative z-50">
                        <div className="sticky left-0 flex justify-center w-full" style={{ maxWidth: 'calc(100vw - 2rem)' }}>
                            <div className="w-full max-w-7xl border-x border-b border-indigo-500 shadow-[inset_0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                                <SimulatoreAnalisiCostiModal 
                                    riga={riga} 
                                    onClose={() => setAnalyzingRigaId(null)}
                                    onSaveAnalisi={gestisciSalvataggioAnalisi}
                                    onSaveNewBigData={salvaVoceInBigData} 
                                    magazzinoMateriali={magazzinoMateriali} tuttiMateriali={tuttiMateriali} magazzinoMezzi={magazzinoMezzi} magazzinoAttrezzature={magazzinoAttrezzature} tuttiNoleggi={tuttiNoleggi} 
                                    ruoliAziendali={ruoliAziendali} tariffeAziendali={tariffeAziendali} 
                                    tariffeSimulazione={tariffeSimulazione} 
                                    subappaltatori={subappaltatori}
                                    onRequestRDO={onRequestRDO} 
                                    vociBigData={vociStoricheBigData} 
                                />
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </tbody>
    );
};