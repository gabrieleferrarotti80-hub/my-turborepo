import React, { useState, useEffect } from 'react';
import { 
    ChevronDownIcon, ChevronUpIcon, ArchiveBoxIcon, UserGroupIcon, 
    TruckIcon, KeyIcon, BuildingOfficeIcon, WrenchScrewdriverIcon, 
    MagnifyingGlassIcon, UserIcon, Cog8ToothIcon, TrashIcon, PlusIcon, BoltIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

import { ComparatorePrezzi } from '../../ComparatorePrezzi'; 
import { SmartFaseInput } from './SmartFaseInput'; 

export const FaseCard = ({ 
    fase, isExpanded, setExpanded, idx, wbsNodes, vociMaster, aliasAziendali, onSaveAlias, onUpdateMeta, onUpdateCosti, onDelete,
    magazzinoMateriali, tuttiMateriali, magazzinoMezzi, magazzinoAttrezzature, tuttiNoleggi, ruoliAziendali, tariffeAziendali, subappaltatori,
    globalPercSpeseGenerali, globalPercUtile
}) => {
    const [comparatorTarget, setComparatorTarget] = useState(null);

    // ⚡ IL MOTORE DI RISOLUZIONE DINAMICO (Basato sui tuoi Voci Master!)
    useEffect(() => {
        // selectedWbsBaseId è il nodo generico scelto dall'utente (es. "Mulching")
        if (!fase.selectedWbsBaseId || !vociMaster) return;
        
        const qta = Number(fase.quantitaFase) || 0;
        
        // 1. Troviamo TUTTE le Voci Master (dal database listini) che appartengono a questo nodo WBS
        const masterAssociati = vociMaster.filter(m => m.wbsNodeId === fase.selectedWbsBaseId);
        
        if (masterAssociati.length > 0) {
            // 2. Cerchiamo se c'è una voce Master che calza a pennello per questa quantità
            let masterPerfetto = masterAssociati.find(m => {
                // I tuoi campi si chiamano quantitaMin e quantitaMax (come visto in VoceListinoForm)
                const min = (m.quantitaMin !== '' && m.quantitaMin != null) ? Number(m.quantitaMin) : -Infinity;
                const max = (m.quantitaMax !== '' && m.quantitaMax != null) ? Number(m.quantitaMax) : Infinity;
                return qta >= min && qta <= max;
            });

            // Se non ne trova uno specifico per range, prende il primo disponibile (o se non ci sono regole di quantità)
            if (!masterPerfetto) masterPerfetto = masterAssociati[0];
            
            const newMasterId = masterPerfetto.id;
            
            // Aggiorna silenziosamente il masterId reale E salva i dati leggibili per i Big Data!
            if (fase.masterId !== newMasterId) {
                onUpdateMeta(fase.id, 'masterId', newMasterId);
                onUpdateMeta(fase.id, 'masterCodice', masterPerfetto.codice || 'NO-COD'); 
                onUpdateMeta(fase.id, 'masterDescrizione', masterPerfetto.descrizione || '');
            }
        } else {
             // Se non ci sono voci master agganciate a questo nodo, teniamo l'ID del nodo stesso come fallback
             if (fase.masterId !== fase.selectedWbsBaseId) {
                 onUpdateMeta(fase.id, 'masterId', fase.selectedWbsBaseId);
             }
        }
    }, [fase.quantitaFase, fase.selectedWbsBaseId, vociMaster]);


    // -- Calcoli Costi --
    const interventi = Number(fase.numeroInterventi) || 1;
    const calcolaCostoFase = () => {
        const sum = (arr) => (arr||[]).reduce((acc, curr) => acc + ((Number(curr.numeroPersone)||1)*(Number(curr.quantita)||0)*(Number(curr.costoUnitario)||0)), 0);
        return sum(fase.costi.materiali) + sum(fase.costi.manodopera) + sum(fase.costi.mezzi) + sum(fase.costi.attrezzature) + sum(fase.costi.noli) + sum(fase.costi.subappalti) + sum(fase.costi.altro);
    };
    const costoTotaleFase = calcolaCostoFase() * interventi;
    const speseGenPerc = fase.percSpeseGenerali !== undefined ? fase.percSpeseGenerali : globalPercSpeseGenerali;
    const utilePerc = fase.percUtile !== undefined ? fase.percUtile : globalPercUtile;
    const prezzoSuggerito = (costoTotaleFase + (costoTotaleFase * (speseGenPerc / 100))) * (1 + (utilePerc / 100));

    // Handler per aggiunta risorse...
    const handleAddCosto = (cat) => onUpdateCosti(fase.id, cat, [...(fase.costi[cat]||[]), { id: Date.now(), isNewItem: true, descrizione: '', numeroPersone: 1, quantita: 1, costoUnitario: 0 }]);
    const handleChangeCosto = (cat, id, field, val) => onUpdateCosti(fase.id, cat, (fase.costi[cat]||[]).map(r => r.id === id ? { ...r, [field]: val } : r));
    const handleRemoveCosto = (cat, id) => onUpdateCosti(fase.id, cat, (fase.costi[cat]||[]).filter(r => r.id !== id));
    
    const handleSelectFromComparator = (risorsaScelta) => {
        if (!comparatorTarget) return;
        const { cat, rowId } = comparatorTarget;
        const nuove = (fase.costi[cat]||[]).map(r => {
            if (r.id !== rowId) return r;
            let newData = { ...r, descrizione: risorsaScelta.descrizione, costoUnitario: risorsaScelta.prezzo, isNewItem: true };
            return newData;
        });
        onUpdateCosti(fase.id, cat, nuove);
        setComparatorTarget(null);
    };

    // Identifichiamo la voce Master reale
    const currentMasterVoce = vociMaster?.find(v => v.id === fase.masterId);
    // Verifichiamo se c'è stata una risoluzione dinamica (cioè il masterId non è più il wbsBaseId)
    const isAutoResolved = fase.masterId && fase.selectedWbsBaseId && fase.masterId !== fase.selectedWbsBaseId;

    // Identifichiamo se la voce è in attesa di normalizzazione
    const isTemp = fase.masterId?.startsWith('TEMP-');

    return (
        <div className={`bg-white rounded-2xl border transition-all ${isExpanded ? 'border-indigo-400 shadow-lg relative z-20' : 'border-slate-200 hover:border-indigo-300'}`}>
            {comparatorTarget && <ComparatorePrezzi isModal={true} onClose={() => setComparatorTarget(null)} onSelect={handleSelectFromComparator} />}

            <div className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4 cursor-pointer" onClick={setExpanded}>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-black shrink-0 ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{idx + 1}</span>
                    
                    <div className="flex-1 flex flex-col md:flex-row items-start md:items-center gap-2 w-full">
                        <SmartFaseInput fase={fase} onUpdateMeta={onUpdateMeta} wbsNodes={wbsNodes} aliasAziendali={aliasAziendali} onSaveAlias={onSaveAlias} />
                        
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 shrink-0 shadow-inner" onClick={(e) => e.stopPropagation()}>
                            <input 
                                type="number" placeholder="Q.tà" value={fase.quantitaFase || 1} 
                                onChange={(e) => onUpdateMeta(fase.id, 'quantitaFase', e.target.value)} 
                                className="w-16 text-center text-base font-black text-indigo-700 bg-white border border-indigo-200 rounded p-1 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                            />
                            <input 
                                type="text" placeholder="U.M." value={fase.umFase || ''} 
                                onChange={(e) => onUpdateMeta(fase.id, 'umFase', e.target.value)} 
                                className="w-12 text-center text-xs font-bold text-slate-500 uppercase bg-transparent p-1 outline-none" 
                            />
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-auto flex flex-col items-start md:items-end flex-1 pl-11 md:pl-0">
                    {fase.masterId ? (
                        isTemp ? (
                            // 🟠 BADGE PURGATORIO
                            <div className="flex items-center gap-1 text-[10px] text-amber-600 font-black uppercase mt-1 bg-amber-50 px-2 py-0.5 rounded w-max border border-amber-200 shadow-sm">
                                ⚠️ Da Normalizzare ({fase.masterId})
                                <button onClick={(e) => { e.stopPropagation(); onUpdateMeta(fase.id, 'masterId', null); }} className="ml-2 text-amber-800 hover:text-red-600">✕</button>
                            </div>
                        ) : (
                            // 🟢 BADGE MASTER UFFICIALE
                            <div className={`flex flex-col items-end gap-1 mt-1`}>
                                <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-black uppercase bg-emerald-50 px-2 py-1 rounded w-max border border-emerald-200 shadow-sm" title={currentMasterVoce ? currentMasterVoce.descrizione : ''}>
                                    <StarIconSolid className="h-3 w-3"/> 
                                    Master: {currentMasterVoce ? currentMasterVoce.codice : (wbsNodes.find(n => n.id === fase.masterId)?.nome || 'OK')}
                                    <button onClick={(e) => { e.stopPropagation(); onUpdateMeta(fase.id, 'masterId', null); onUpdateMeta(fase.id, 'selectedWbsBaseId', null); }} className="ml-2 text-emerald-800 hover:text-red-600">✕</button>
                                </div>
                                {isAutoResolved && (
                                    <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded animate-fade-in">
                                        <BoltIcon className="h-3 w-3" /> Auto-risolto per Q.tà ({fase.quantitaFase})
                                    </span>
                                )}
                            </div>
                        )
                    ) : (
                        // ⚪ NESSUN INPUT
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-black uppercase mt-1 bg-slate-50 px-2 py-0.5 rounded w-max border border-slate-200 shadow-sm">
                            In attesa di input...
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-6 ml-auto shrink-0">
                    <div className="hidden md:block text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Costo Az. {interventi > 1 ? `(x${interventi})` : ''}</p>
                        <p className="text-sm font-black text-rose-600">€ {costoTotaleFase.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-indigo-400 uppercase">Tot. Offerta</p>
                        <input type="number" onClick={(e) => e.stopPropagation()} value={fase.prezzoVendita} onChange={(e) => onUpdateMeta(fase.id, 'prezzoVendita', e.target.value)} className="w-24 text-right border-b-2 border-transparent focus:border-indigo-500 bg-slate-50 font-black text-indigo-700 rounded-t p-1 outline-none" />
                    </div>
                    {isExpanded ? <ChevronUpIcon className="h-6 w-6 text-indigo-600"/> : <ChevronDownIcon className="h-6 w-6 text-slate-400"/>}
                </div>
            </div>

            {isExpanded && (
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        
                        {/* 1. MATERIALI */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-sm flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2 mb-3"><ArchiveBoxIcon className="h-4 w-4 text-sky-500"/> Materiali Previsti</h4>
                            <table className="w-full text-left mb-2">
                                <thead><tr><th className="pb-2 text-[9px] text-slate-400 uppercase w-[55%]">Articolo</th><th className="pb-2 text-[9px] text-slate-400 uppercase text-center">Q.tà</th><th className="pb-2 text-[9px] text-slate-400 uppercase text-right pr-2">Importo</th><th></th></tr></thead>
                                <tbody>
                                    {(fase.costi.materiali||[]).map(r => (
                                        <tr key={r.id} className="border-t border-slate-50">
                                            <td className="py-2 pr-2">
                                                {!r.isNewItem ? (
                                                    <select value={r.descrizione} onChange={e => {
                                                        const val = e.target.value;
                                                        if (val === 'NEW') return handleChangeCosto('materiali', r.id, 'isNewItem', true);
                                                        const mMag = magazzinoMateriali.find(m => m.nome === val);
                                                        const mFor = tuttiMateriali.find(m => m.descrizione === val);
                                                        const nuoveRighe = (fase.costi.materiali||[]).map(x => x.id === r.id ? { ...x, descrizione: val, costoUnitario: mMag ? (mMag.costoStandard||0) : mFor ? (mFor.prezzo||0) : 0 } : x);
                                                        onUpdateCosti(fase.id, 'materiali', nuoveRighe);
                                                    }} className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-1.5">
                                                        <option value="">Seleziona...</option>
                                                        {magazzinoMateriali?.length > 0 && <optgroup label="Dal Magazzino">{magazzinoMateriali.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}</optgroup>}
                                                        {tuttiMateriali?.length > 0 && <optgroup label="Da Albo Fornitori">{tuttiMateriali.map((m,i) => <option key={i} value={m.descrizione}>{m.descrizione} (€{m.prezzo})</option>)}</optgroup>}
                                                        <option value="NEW" className="font-bold text-sky-600">➕ Cerca / Libero</option>
                                                    </select>
                                                ) : (
                                                    <div className="flex gap-1 bg-sky-50 p-1 rounded"><input type="text" placeholder="Nome materiale..." value={r.descrizione} onChange={e => handleChangeCosto('materiali', r.id, 'descrizione', e.target.value)} className="flex-1 border border-slate-200 rounded p-1 text-xs" /><button onClick={() => setComparatorTarget({ cat: 'materiali', rowId: r.id })} className="bg-indigo-600 text-white text-[10px] px-2 rounded"><MagnifyingGlassIcon className="h-3 w-3"/></button><button onClick={() => handleChangeCosto('materiali', r.id, 'isNewItem', false)} className="text-[10px] text-slate-400 px-1">Albo</button></div>
                                                )}
                                            </td>
                                            <td className="py-2 text-center"><input type="number" value={r.quantita} onChange={e => handleChangeCosto('materiali', r.id, 'quantita', e.target.value)} className="w-12 text-center text-xs p-1 border border-slate-200 rounded bg-transparent" /></td>
                                            <td className="py-2 text-right pr-2 text-xs font-bold text-slate-800">€{((r.quantita||0)*(r.costoUnitario||0)).toFixed(2)}</td>
                                            <td className="py-2 text-right"><button onClick={() => handleRemoveCosto('materiali', r.id)} className="text-slate-300 hover:text-red-500"><TrashIcon className="h-4 w-4"/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button onClick={() => handleAddCosto('materiali')} className="text-sky-600 text-xs font-bold flex items-center gap-1 mt-1"><PlusIcon className="h-3 w-3"/> Agg. Materiale</button>
                        </div>

                        {/* 2. MANODOPERA */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-sm flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2 mb-3"><UserGroupIcon className="h-4 w-4 text-orange-500"/> Manodopera Stimata</h4>
                            <table className="w-full text-left mb-2">
                                <thead><tr><th className="pb-2 text-[9px] text-slate-400 uppercase">Qualifica</th><th className="pb-2 text-[9px] text-slate-400 uppercase text-center">N.Op</th><th className="pb-2 text-[9px] text-slate-400 uppercase text-center">Ore</th><th className="pb-2 text-[9px] text-slate-400 uppercase text-right pr-2">Importo</th><th></th></tr></thead>
                                <tbody>
                                    {(fase.costi.manodopera||[]).map(r => (
                                        <tr key={r.id} className="border-t border-slate-50">
                                            <td className="py-2 pr-2">
                                                <select value={r.descrizione} onChange={e => {
                                                    const val = e.target.value;
                                                    let costo = 0;
                                                    if (val !== 'Libero' && val !== '') { const tar = Object.entries(tariffeAziendali).find(([k]) => k.toLowerCase() === val.toLowerCase()); if(tar) costo = tar[1]; }
                                                    const nuoveRighe = (fase.costi.manodopera||[]).map(x => x.id === r.id ? { ...x, descrizione: val, costoUnitario: costo } : x);
                                                    onUpdateCosti(fase.id, 'manodopera', nuoveRighe);
                                                }} className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-1.5">
                                                    <option value="">Ruolo...</option>
                                                    {ruoliAziendali?.map(ruolo => <option key={ruolo} value={ruolo}>{ruolo}</option>)}
                                                    <option value="Libero" className="font-bold text-orange-600">Altro (Libero)</option>
                                                </select>
                                                {r.descrizione === 'Libero' && <input type="text" placeholder="Specifica..." value={r.ruoloLibero||''} onChange={e => handleChangeCosto('manodopera', r.id, 'ruoloLibero', e.target.value)} className="w-full mt-1 border border-slate-200 rounded p-1 text-[10px]" />}
                                            </td>
                                            <td className="py-2 text-center"><div className="flex justify-center gap-0.5"><UserIcon className="h-3 w-3 text-slate-400"/><input type="number" min="1" value={r.numeroPersone||1} onChange={e => handleChangeCosto('manodopera', r.id, 'numeroPersone', e.target.value)} className="w-8 text-center text-xs p-1 border border-slate-200 rounded text-orange-600 font-bold" /></div></td>
                                            <td className="py-2 text-center"><input type="number" value={r.quantita} onChange={e => handleChangeCosto('manodopera', r.id, 'quantita', e.target.value)} className="w-10 text-center text-xs p-1 border border-slate-200 rounded bg-transparent" /></td>
                                            <td className="py-2 text-right pr-2 text-xs font-bold text-slate-800">€{((r.numeroPersone||1)*(r.quantita||0)*(r.costoUnitario||0)).toFixed(2)}</td>
                                            <td className="py-2 text-right"><button onClick={() => handleRemoveCosto('manodopera', r.id)} className="text-slate-300 hover:text-red-500"><TrashIcon className="h-4 w-4"/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button onClick={() => handleAddCosto('manodopera')} className="text-orange-600 text-xs font-bold flex items-center gap-1 mt-1"><PlusIcon className="h-3 w-3"/> Agg. Personale</button>
                        </div>

                        {/* 3. MEZZI AZIENDALI */}
                        {(fase.costi.mezzi?.length > 0) && (
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2">
                                <h4 className="font-bold text-sm flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2 mb-3"><TruckIcon className="h-4 w-4 text-emerald-500"/> Mezzi Aziendali</h4>
                                <table className="w-full text-left mb-2">
                                    <thead><tr><th className="pb-2 text-[9px] text-slate-400 uppercase w-[40%]">Mezzo</th><th className="pb-2 text-[9px] text-slate-400 uppercase text-center">Ore/GG</th><th className="pb-2 text-[9px] text-slate-400 uppercase text-right">Costo U.</th><th className="pb-2 text-[9px] text-slate-400 uppercase text-right pr-2">Totale</th><th></th></tr></thead>
                                    <tbody>
                                        {(fase.costi.mezzi||[]).map(r => (
                                            <tr key={r.id} className="border-t border-slate-50">
                                                <td className="py-2 pr-2">
                                                    <select value={r.descrizione} onChange={e => {
                                                        const val = e.target.value;
                                                        const mezzo = magazzinoMezzi.find(m => m.nome === val);
                                                        let costo = 0;
                                                        if (mezzo) {
                                                            costo = Number(mezzo.costoOrario) || Number(mezzo.dettagli?.costoOrario) || 
                                                                    Number(mezzo.costoGiornaliero) || Number(mezzo.dettagli?.costoGiornaliero) || 0;
                                                        }
                                                        const nuoveRighe = (fase.costi.mezzi||[]).map(x => x.id === r.id ? { ...x, descrizione: val, costoUnitario: costo } : x);
                                                        onUpdateCosti(fase.id, 'mezzi', nuoveRighe);
                                                    }} className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-1.5 focus:ring-1 focus:ring-emerald-500">
                                                        <option value="">Seleziona mezzo...</option>
                                                        {magazzinoMezzi?.map(m => {
                                                            const cH = Number(m.costoOrario) || Number(m.dettagli?.costoOrario);
                                                            const cG = Number(m.costoGiornaliero) || Number(m.dettagli?.costoGiornaliero);
                                                            const label = cH ? `(€${cH}/h)` : cG ? `(€${cG}/gg)` : '';
                                                            return <option key={m.id} value={m.nome}>{m.nome} {label}</option>
                                                        })}
                                                        <option value="Altro" className="font-bold text-emerald-600">Altro (Libero)</option>
                                                    </select>
                                                    {r.descrizione === 'Altro' && <input type="text" placeholder="Specifica mezzo..." value={r.mezzoLibero||''} onChange={e => handleChangeCosto('mezzi', r.id, 'mezzoLibero', e.target.value)} className="w-full mt-1 border border-slate-200 rounded p-1 text-[10px]" />}
                                                </td>
                                                <td className="py-2 text-center"><input type="number" value={r.quantita} onChange={e => handleChangeCosto('mezzi', r.id, 'quantita', e.target.value)} className="w-12 text-center text-xs p-1 border border-slate-200 rounded bg-transparent" /></td>
                                                <td className="py-2 text-right flex justify-end items-center gap-1"><span className="text-[10px] text-slate-400">€</span><input type="number" value={r.costoUnitario} onChange={e => handleChangeCosto('mezzi', r.id, 'costoUnitario', e.target.value)} className="w-16 text-right bg-transparent border-b border-slate-200 focus:border-emerald-300 p-1 text-xs" /></td>
                                                <td className="py-2 text-right pr-2 text-xs font-bold text-slate-800">€{((r.quantita||0)*(r.costoUnitario||0)).toFixed(2)}</td>
                                                <td className="py-2 text-right"><button onClick={() => handleRemoveCosto('mezzi', r.id)} className="text-slate-300 hover:text-red-500"><TrashIcon className="h-4 w-4"/></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 4. ATTREZZATURE */}
                        {(fase.costi.attrezzature?.length > 0) && (
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2">
                                <h4 className="font-bold text-sm flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2 mb-3"><Cog8ToothIcon className="h-4 w-4 text-teal-500"/> Attrezzature e Strumenti</h4>
                                <table className="w-full text-left mb-2">
                                    <thead><tr><th className="pb-2 text-[9px] text-slate-400 uppercase w-[40%]">Attrezzatura</th><th className="pb-2 text-[9px] text-slate-400 uppercase text-center">Ore/GG</th><th className="pb-2 text-[9px] text-slate-400 uppercase text-right">Costo U.</th><th className="pb-2 text-[9px] text-slate-400 uppercase text-right pr-2">Totale</th><th></th></tr></thead>
                                    <tbody>
                                        {(fase.costi.attrezzature||[]).map(r => (
                                            <tr key={r.id} className="border-t border-slate-50">
                                                <td className="py-2 pr-2">
                                                    <select value={r.descrizione} onChange={e => {
                                                        const val = e.target.value;
                                                        const attr = magazzinoAttrezzature.find(m => m.nome === val);
                                                        let costo = 0;
                                                        if (attr) {
                                                            costo = Number(attr.costoOrario) || Number(attr.dettagli?.costoOrario) || 
                                                                    Number(attr.costoGiornaliero) || Number(attr.dettagli?.costoGiornaliero) || 
                                                                    Number(attr.costoStandard) || 0;
                                                        }
                                                        const nuoveRighe = (fase.costi.attrezzature||[]).map(x => x.id === r.id ? { ...x, descrizione: val, costoUnitario: costo } : x);
                                                        onUpdateCosti(fase.id, 'attrezzature', nuoveRighe);
                                                    }} className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-1.5 focus:ring-1 focus:ring-teal-500">
                                                        <option value="">Seleziona attrezzatura...</option>
                                                        {magazzinoAttrezzature?.map(m => {
                                                            const cH = Number(m.costoOrario) || Number(m.dettagli?.costoOrario);
                                                            const cG = Number(m.costoGiornaliero) || Number(m.dettagli?.costoGiornaliero);
                                                            const label = cH ? `(€${cH}/h)` : cG ? `(€${cG}/gg)` : '';
                                                            return <option key={m.id} value={m.nome}>{m.nome} {label}</option>
                                                        })}
                                                        <option value="Altro" className="font-bold text-teal-600">Altro (Libero)</option>
                                                    </select>
                                                    {r.descrizione === 'Altro' && <input type="text" placeholder="Specifica..." value={r.mezzoLibero||''} onChange={e => handleChangeCosto('attrezzature', r.id, 'mezzoLibero', e.target.value)} className="w-full mt-1 border border-slate-200 rounded p-1 text-[10px]" />}
                                                </td>
                                                <td className="py-2 text-center"><input type="number" value={r.quantita} onChange={e => handleChangeCosto('attrezzature', r.id, 'quantita', e.target.value)} className="w-12 text-center text-xs p-1 border border-slate-200 rounded bg-transparent" /></td>
                                                <td className="py-2 text-right flex justify-end items-center gap-1"><span className="text-[10px] text-slate-400">€</span><input type="number" value={r.costoUnitario} onChange={e => handleChangeCosto('attrezzature', r.id, 'costoUnitario', e.target.value)} className="w-16 text-right bg-transparent border-b border-slate-200 focus:border-teal-300 p-1 text-xs" /></td>
                                                <td className="py-2 text-right pr-2 text-xs font-bold text-slate-800">€{((r.quantita||0)*(r.costoUnitario||0)).toFixed(2)}</td>
                                                <td className="py-2 text-right"><button onClick={() => handleRemoveCosto('attrezzature', r.id)} className="text-slate-300 hover:text-red-500"><TrashIcon className="h-4 w-4"/></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 5. NOLI */}
                        {(fase.costi.noli?.length > 0) && (
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2">
                                <h4 className="font-bold text-sm flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2 mb-3"><KeyIcon className="h-4 w-4 text-indigo-500"/> Noli (a Caldo / a Freddo)</h4>
                                <table className="w-full text-left mb-2">
                                    <thead><tr><th className="pb-2 text-[9px] text-slate-400 uppercase w-[40%]">Macchinario</th><th className="pb-2 text-[9px] text-slate-400 uppercase text-center">GG/Ore</th><th className="pb-2 text-[9px] text-slate-400 uppercase text-right">Costo U.</th><th className="pb-2 text-[9px] text-slate-400 uppercase text-right pr-2">Totale</th><th></th></tr></thead>
                                    <tbody>
                                        {(fase.costi.noli||[]).map(r => (
                                            <tr key={r.id} className="border-t border-slate-50">
                                                <td className="py-2 pr-2">
                                                    {!r.isNewItem ? (
                                                        <select value={r.descrizione} onChange={e => {
                                                            const val = e.target.value;
                                                            if (val === 'NEW') return handleChangeCosto('noli', r.id, 'isNewItem', true);
                                                            const noloFor = tuttiNoleggi.find(m => m.descrizione === val);
                                                            const nuoveRighe = (fase.costi.noli||[]).map(x => x.id === r.id ? { ...x, descrizione: val, costoUnitario: noloFor?.prezzo||0 } : x);
                                                            onUpdateCosti(fase.id, 'noli', nuoveRighe);
                                                        }} className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-1.5">
                                                            <option value="">Seleziona...</option>
                                                            {tuttiNoleggi?.map((m,i) => <option key={i} value={m.descrizione}>{m.descrizione} (€{m.prezzo})</option>)}
                                                            <option value="NEW" className="font-bold text-indigo-600">➕ Cerca / Libero</option>
                                                        </select>
                                                    ) : (
                                                        <div className="flex gap-1 bg-indigo-50 p-1 rounded"><input type="text" placeholder="Es. Piattaforma..." value={r.descrizione} onChange={e => handleChangeCosto('noli', r.id, 'descrizione', e.target.value)} className="flex-1 border border-slate-200 rounded p-1 text-[10px]" /><button onClick={() => setComparatorTarget({ cat: 'noli', rowId: r.id })} className="bg-indigo-600 text-white text-[10px] px-1.5 rounded"><MagnifyingGlassIcon className="h-3 w-3"/></button><button onClick={() => handleChangeCosto('noli', r.id, 'isNewItem', false)} className="text-[10px] text-slate-400 px-1">Listini</button></div>
                                                    )}
                                                </td>
                                                <td className="py-2 text-center"><input type="number" value={r.quantita} onChange={e => handleChangeCosto('noli', r.id, 'quantita', e.target.value)} className="w-12 text-center text-xs p-1 border border-slate-200 rounded bg-transparent" /></td>
                                                <td className="py-2 text-right flex justify-end items-center gap-1"><span className="text-[10px] text-slate-400">€</span><input type="number" value={r.costoUnitario} onChange={e => handleChangeCosto('noli', r.id, 'costoUnitario', e.target.value)} className="w-16 text-right bg-transparent border-b border-slate-200 focus:border-indigo-300 p-1 text-xs" /></td>
                                                <td className="py-2 text-right pr-2 text-xs font-bold text-slate-800">€{((r.quantita||0)*(r.costoUnitario||0)).toFixed(2)}</td>
                                                <td className="py-2 text-right"><button onClick={() => handleRemoveCosto('noli', r.id)} className="text-slate-300 hover:text-red-500"><TrashIcon className="h-4 w-4"/></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 6. SUBAPPALTI E SPESE EXTRA */}
                        {(fase.costi.subappalti?.length > 0) && (
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2">
                                <h4 className="font-bold text-sm flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2 mb-3"><BuildingOfficeIcon className="h-4 w-4 text-rose-500"/> Subappalti</h4>
                                <table className="w-full text-left mb-2">
                                    <thead><tr><th className="pb-2 text-[9px] text-slate-400 uppercase w-[30%]">Azienda</th><th className="pb-2 text-[9px] text-slate-400 uppercase w-[30%]">Lavorazione</th><th className="pb-2 text-[9px] text-slate-400 uppercase text-center w-[15%]">Prev.</th><th className="pb-2 text-[9px] text-slate-400 uppercase text-right pr-2">Importo</th><th></th></tr></thead>
                                    <tbody>
                                        {(fase.costi.subappalti||[]).map(r => (
                                            <tr key={r.id} className="border-t border-slate-50">
                                                <td className="py-2 pr-2">
                                                    {!r.isNewItem ? (
                                                        <select value={r.descrizione} onChange={e => {
                                                            if(e.target.value === 'NEW') return handleChangeCosto('subappalti', r.id, 'isNewItem', true);
                                                            handleChangeCosto('subappalti', r.id, 'descrizione', e.target.value);
                                                        }} className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-1.5"><option value="">Azienda...</option>{subappaltatori?.map(s => <option key={s.id} value={s.ragioneSociale}>{s.ragioneSociale}</option>)}<option value="NEW">➕ Cerca Prezzo</option></select>
                                                    ) : (
                                                        <div className="flex gap-1 bg-rose-50 p-1 rounded"><input type="text" placeholder="Ditta..." value={r.descrizione} onChange={e => handleChangeCosto('subappalti', r.id, 'descrizione', e.target.value)} className="flex-1 bg-white border border-slate-200 rounded p-1 text-[10px] font-bold" /><button onClick={() => setComparatorTarget({ cat: 'subappalti', rowId: r.id })} className="bg-indigo-600 text-white text-[10px] px-1.5 rounded"><MagnifyingGlassIcon className="h-3 w-3"/></button>{subappaltatori?.length > 0 && <button onClick={() => handleChangeCosto('subappalti', r.id, 'isNewItem', false)} className="text-[10px] text-slate-400 px-1">Albo</button>}</div>
                                                    )}
                                                </td>
                                                <td className="py-2 pr-2"><input type="text" placeholder="Es. Posa Ponteggi" value={r.lavorazione||''} onChange={e => handleChangeCosto('subappalti', r.id, 'lavorazione', e.target.value)} className="w-full bg-transparent border-b border-slate-200 p-1 text-xs" /></td>
                                                <td className="py-2 text-center"><input type="checkbox" checked={r.preventivoUfficiale||false} onChange={e => handleChangeCosto('subappalti', r.id, 'preventivoUfficiale', e.target.checked)} className="rounded text-rose-500" /></td>
                                                <td className="py-2 text-right pr-2 flex items-center justify-end gap-1"><span className="text-[10px] text-slate-400">€</span><input type="number" value={r.costoUnitario} onChange={e => { handleChangeCosto('subappalti', r.id, 'costoUnitario', e.target.value); handleChangeCosto('subappalti', r.id, 'quantita', 1); }} className="w-20 text-right bg-transparent border-b border-slate-200 p-1 text-xs font-bold" /></td>
                                                <td className="py-2 text-right"><button onClick={() => handleRemoveCosto('subappalti', r.id)} className="text-slate-300 hover:text-red-500"><TrashIcon className="h-4 w-4"/></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {(fase.costi.altro?.length > 0) && (
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2">
                                <h4 className="font-bold text-sm flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2 mb-3"><WrenchScrewdriverIcon className="h-4 w-4 text-purple-500"/> Spese Extra</h4>
                                <table className="w-full text-left mb-2">
                                    <thead><tr><th className="pb-2 text-[9px] text-slate-400 uppercase w-[50%]">Descrizione</th><th className="pb-2 text-[9px] text-slate-400 uppercase text-center">Q.tà</th><th className="pb-2 text-[9px] text-slate-400 uppercase text-right pr-2">Costo Unit.</th><th className="pb-2 text-[9px] text-slate-400 uppercase text-right pr-2">Tot.</th><th></th></tr></thead>
                                    <tbody>
                                        {(fase.costi.altro||[]).map(r => (
                                            <tr key={r.id} className="border-t border-slate-50">
                                                <td className="py-2 pr-2"><input type="text" placeholder="Es. Oneri smaltimento, vitto..." value={r.descrizione} onChange={e => handleChangeCosto('altro', r.id, 'descrizione', e.target.value)} className="w-full bg-transparent border-b border-slate-200 p-1 text-xs" /></td>
                                                <td className="py-2 text-center"><input type="number" value={r.quantita} onChange={e => handleChangeCosto('altro', r.id, 'quantita', e.target.value)} className="w-12 text-center text-xs p-1 border border-slate-200 rounded bg-transparent" /></td>
                                                <td className="py-2 text-right pr-2 flex items-center justify-end gap-1"><span className="text-[10px] text-slate-400">€</span><input type="number" value={r.costoUnitario} onChange={e => handleChangeCosto('altro', r.id, 'costoUnitario', e.target.value)} className="w-20 text-right bg-transparent border-b border-slate-200 p-1 text-xs font-bold" /></td>
                                                <td className="py-2 text-right pr-2 text-xs font-bold text-slate-800">€{((r.quantita||0)*(r.costoUnitario||0)).toFixed(2)}</td>
                                                <td className="py-2 text-right"><button onClick={() => handleRemoveCosto('altro', r.id)} className="text-slate-300 hover:text-red-500"><TrashIcon className="h-4 w-4"/></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* BOTTONI SECONDARI */}
                        <div className="xl:col-span-2 pt-4 border-t border-slate-200 flex flex-wrap gap-2 items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase mr-2 flex items-center">Aggiungi risorse:</span>
                            <button onClick={() => handleAddCosto('mezzi')} className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-emerald-100 border border-emerald-200"><TruckIcon className="h-3 w-3"/> Mezzi</button>
                            <button onClick={() => handleAddCosto('attrezzature')} className="bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-teal-100 border border-teal-200"><Cog8ToothIcon className="h-3 w-3"/> Attrezzature</button>
                            <button onClick={() => handleAddCosto('noli')} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-indigo-100 border border-indigo-200"><KeyIcon className="h-3 w-3"/> Noli</button>
                            <button onClick={() => handleAddCosto('subappalti')} className="bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-rose-100 border border-rose-200"><BuildingOfficeIcon className="h-3 w-3"/> Subappalti</button>
                            <button onClick={() => handleAddCosto('altro')} className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-purple-100 border border-purple-200"><WrenchScrewdriverIcon className="h-3 w-3"/> Extra</button>
                        </div>
                    </div>
                    
                    {/* BARRA INFERIORE DEL BLOCCO FASE */}
                    <div className="mt-6 bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                        <button onClick={onDelete} className="text-slate-400 text-xs font-bold flex items-center gap-1 hover:text-red-600 px-3 py-2 hover:bg-red-50 rounded-lg transition-colors">
                            <TrashIcon className="h-4 w-4"/> Elimina Fase
                        </button>
                        <div className="flex items-center gap-4 flex-wrap justify-end w-full md:w-auto">
                            
                            <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100 shadow-inner">
                                <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest">N. Interventi (Cicli):</label>
                                <input 
                                    type="number" min="1"
                                    value={fase.numeroInterventi || 1}
                                    onChange={(e) => onUpdateMeta(fase.id, 'numeroInterventi', e.target.value)}
                                    className="w-16 text-center bg-white rounded border border-amber-200 font-black text-amber-800 text-sm p-1 outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            <div className="text-right ml-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Costo Diretto {interventi > 1 ? `(x${interventi})` : ''}</p>
                                <p className="text-sm font-black text-rose-600">€ {costoTotaleFase.toFixed(2)}</p>
                            </div>

                            <div className="flex items-center gap-3 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 shadow-inner overflow-x-auto">
                                <div className="flex items-center gap-2">
                                    <div className="text-right">
                                        <label className="block text-[9px] font-bold text-slate-500 uppercase">Spese Gen.</label>
                                        <div className="flex items-center justify-end">
                                            <input type="number" value={speseGenPerc} onChange={e => onUpdateMeta(fase.id, 'percSpeseGenerali', Number(e.target.value))} className="w-12 text-center bg-white rounded border border-slate-300 font-bold text-slate-700 text-xs p-1 outline-none focus:ring-1 focus:ring-slate-500" />
                                            <span className="text-[10px] font-bold text-slate-500 ml-1">%</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-6 w-px bg-slate-300"></div>
                                <div className="flex items-center gap-2">
                                    <div className="text-right">
                                        <label className="block text-[9px] font-bold text-slate-500 uppercase">Utile</label>
                                        <div className="flex items-center justify-end">
                                            <input type="number" value={utilePerc} onChange={e => onUpdateMeta(fase.id, 'percUtile', Number(e.target.value))} className="w-12 text-center bg-white rounded border border-slate-300 font-bold text-slate-700 text-xs p-1 outline-none focus:ring-1 focus:ring-slate-500" />
                                            <span className="text-[10px] font-bold text-slate-500 ml-1">%</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-6 w-px bg-slate-300"></div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-emerald-600 uppercase">Prezzo Suggerito</p>
                                    <div className="flex items-center gap-1">
                                        <p className="text-sm font-black text-emerald-700">€ {prezzoSuggerito.toFixed(2)}</p>
                                        <button onClick={(e) => { e.stopPropagation(); onUpdateMeta(fase.id, 'prezzoVendita', prezzoSuggerito.toFixed(2)); }} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-2 py-1 rounded shadow-sm text-[10px] font-bold transition-colors uppercase tracking-wider" title="Applica al Preventivo">
                                            Applica
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="h-8 w-px bg-slate-200 hidden xl:block"></div>
                            
                            <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 w-full xl:w-auto mt-2 xl:mt-0">
                                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex-1 xl:flex-none">Offerta (Totale):</label>
                                <div className="flex items-center gap-1">
                                    <span className="text-lg text-indigo-400">€</span>
                                    <input 
                                        type="number" 
                                        value={fase.prezzoVendita}
                                        onChange={(e) => onUpdateMeta(fase.id, 'prezzoVendita', e.target.value)}
                                        className="w-28 text-right bg-white rounded-md border border-indigo-200 font-black text-indigo-800 text-lg p-1 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};