// packages/shared-ui/components/PreventivoBuilder/SimulatoreAnalisiCostiModal.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useFirebaseData } from 'shared-core';
import { collection, getDocs } from 'firebase/firestore';
import { 
    XMarkIcon, CheckCircleIcon, ChartPieIcon, ArchiveBoxIcon, 
    KeyIcon, UserGroupIcon, BuildingOfficeIcon, WrenchScrewdriverIcon, UserIcon, PlusIcon,
    InformationCircleIcon, MagnifyingGlassIcon, BanknotesIcon, SparklesIcon, TrashIcon
} from '@heroicons/react/24/outline';
import { StoricoPrezziModal } from './StoricoPrezziModal';

const parseNum = (val) => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (val === null || val === undefined || val === '') return 0;
    let str = val.toString();
    if (str.includes('.') && str.includes(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',') && !str.includes('.')) {
        str = str.replace(',', '.');
    }
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
};

const SmartCostoInput = ({ value, onChange, onSelect, placeholder, iconColorClass, focusClass, category, vociBigData, datiLocali = [] }) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (value.length >= 2) {
            const term = value.toLowerCase();

            const localMatches = datiLocali
                .filter(m => (m.nome || m.modello || m.descrizione || '').toLowerCase().includes(term))
                .map(m => ({
                    descrizione: m.nome || m.modello || m.descrizione,
                    costoRegistrato: m.costoStandard || m.costoOrario || m.costoUnitario || m.prezzo || m.prezzoUnitario || 0,
                    source: '📦 DB Azienda / Listini'
                }));

            const bdMatches = vociBigData
                .filter(v => v.categoria === category && (v.descrizione || '').toLowerCase().includes(term))
                .map(v => ({
                    descrizione: v.descrizione,
                    costoRegistrato: v.costoRegistrato,
                    source: `☁️ Storico (${v.contestoAzienda || 'Globale'})`
                }));

            const combined = [...localMatches, ...bdMatches];
            const uniqueMatches = Array.from(new Map(combined.map(item => [item.descrizione.toLowerCase(), item])).values()).slice(0, 6);

            setSuggestions(uniqueMatches);
            setShowSuggestions(uniqueMatches.length > 0);
            setActiveIndex(-1); 
        } else {
            setShowSuggestions(false);
        }
    }, [value, category, vociBigData, datiLocali]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setShowSuggestions(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleKeyDown = (e) => {
        if (!showSuggestions) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && suggestions[activeIndex]) {
                onSelect(suggestions[activeIndex].descrizione, suggestions[activeIndex].costoRegistrato);
                setShowSuggestions(false);
            }
        }
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <input 
                type="text" 
                placeholder={placeholder} 
                value={value} 
                onChange={(e) => { onChange(e.target.value); setShowSuggestions(true); }} 
                onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
                onKeyDown={handleKeyDown}
                className={`w-full bg-white border border-slate-200 rounded p-2 text-xs font-bold outline-none transition-colors ${focusClass}`}
                autoComplete="off"
            />
            {showSuggestions && (
                <div className="absolute z-[999] top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-fade-in-down">
                    <ul className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                        {suggestions.map((s, idx) => (
                            <li 
                                key={idx} 
                                onMouseEnter={() => setActiveIndex(idx)}
                                onClick={() => { onSelect(s.descrizione, s.costoRegistrato); setShowSuggestions(false); }} 
                                className={`p-2 cursor-pointer transition-colors flex justify-between items-center ${activeIndex === idx ? 'bg-indigo-50 border-l-2 border-indigo-500' : 'hover:bg-slate-50 border-l-2 border-transparent'}`}
                            >
                                <div className="overflow-hidden pr-2">
                                    <p className="text-xs font-bold text-slate-700 truncate" title={s.descrizione}>{s.descrizione}</p>
                                    <p className="text-[9px] font-bold text-slate-400 truncate">{s.source}</p>
                                </div>
                                <span className={`text-xs font-black shrink-0 ${iconColorClass}`}>
                                    € {parseNum(s.costoRegistrato).toFixed(2)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export const SimulatoreAnalisiCostiModal = ({ 
    riga, onClose, onSaveAnalisi, onSaveNewBigData,
    magazzinoMateriali, tuttiMateriali, 
    magazzinoMezzi, magazzinoAttrezzature,
    tuttiNoleggi, ruoliAziendali, tariffeAziendali, subappaltatori,
    onRequestRDO, tariffeSimulazione,
    vociBigData = []
}) => {
    
    const defaultCosti = { materiali: [], attrezzature: [], noli: [], mezzi: [], manodopera: [], subappalti: [], smaltimenti: [], altro: [] };
    const [dettaglioCosti, setDettaglioCosti] = useState({ ...defaultCosti, ...(riga.analisiCosti || {}) });
    const [targetStorico, setTargetStorico] = useState(null); 
    
    const [scontoSimulato, setScontoSimulato] = useState(riga.scontoProposto ? parseNum(riga.scontoProposto) : '');
    const [speseGeneraliPerc, setSpeseGeneraliPerc] = useState(15); 
    const [utilePerc, setUtilePerc] = useState(10); 

    // 🌟 FIX: Sincronizza il modale se l'analisi cambia dall'esterno (Auto-Scaling o Incolla) 🌟
    useEffect(() => {
        setDettaglioCosti({ ...defaultCosti, ...(riga.analisiCosti || {}) });
    }, [riga.analisiCosti]);

    useEffect(() => {
        if (!tariffeSimulazione || Object.keys(tariffeSimulazione).length === 0) return;
        
        setDettaglioCosti(prev => {
            let hasChanges = false;
            const nuovaMdo = (prev.manodopera || []).map(m => {
                if (m.descrizione && m.descrizione !== 'Libero' && m.descrizione !== 'NEW' && m.descrizione !== '') {
                    const found = Object.entries(tariffeSimulazione).find(([k]) => k.toLowerCase() === m.descrizione.toLowerCase());
                    if (found && parseNum(found[1]) !== parseNum(m.costoUnitario)) {
                        hasChanges = true;
                        return { ...m, costoUnitario: parseNum(found[1]) };
                    }
                }
                return m;
            });
            if (hasChanges) return { ...prev, manodopera: nuovaMdo };
            return prev;
        });
    }, [tariffeSimulazione]);

    const handleAddCosto = (cat) => setDettaglioCosti(prev => ({ ...prev, [cat]: [...(prev[cat]||[]), { id: Date.now(), isNewItem: true, descrizione: '', numeroPersone: 1, quantita: 1, costoUnitario: 0, unitaMisura: '' }] }));
    const handleCostoChange = (cat, id, field, value) => setDettaglioCosti(prev => ({ ...prev, [cat]: prev[cat].map(r => r.id === id ? { ...r, [field]: value } : r) }));
    const handleRemoveCosto = (cat, id) => setDettaglioCosti(prev => ({ ...prev, [cat]: prev[cat].filter(r => r.id !== id) }));

    const handleSelectFromStorico = (itemSelezionato) => {
        if (!targetStorico) return;
        const { cat, id } = targetStorico;
        handleCostoChange(cat, id, 'descrizione', itemSelezionato.descrizione);
        handleCostoChange(cat, id, 'costoUnitario', itemSelezionato.prezzo);
        handleCostoChange(cat, id, 'isNewItem', true); 
        setTargetStorico(null); 
    };

    const calcTotaleArray = (arr) => (arr||[]).reduce((acc, curr) => {
        const p = curr.numeroPersone !== undefined && curr.numeroPersone !== '' ? parseNum(curr.numeroPersone) : 1;
        return acc + (p * parseNum(curr.quantita) * parseNum(curr.costoUnitario));
    }, 0);
    
    const costiInterni = {
        materiali: calcTotaleArray(dettaglioCosti.materiali), 
        attrezzature: calcTotaleArray(dettaglioCosti.attrezzature), 
        noli: calcTotaleArray(dettaglioCosti.noli),
        mezzi: calcTotaleArray(dettaglioCosti.mezzi), 
        manodopera: calcTotaleArray(dettaglioCosti.manodopera), 
        subappalti: calcTotaleArray(dettaglioCosti.subappalti), 
        smaltimenti: calcTotaleArray(dettaglioCosti.smaltimenti),
        altro: calcTotaleArray(dettaglioCosti.altro)
    };
    
    const costoVivoTotale = Object.values(costiInterni).reduce((a,b)=>a+b, 0);
    const qtaReale = parseNum(riga.quantita) || 1;
    const costoUnitarioDerivato = costoVivoTotale / qtaReale;

   const handleSave = () => {
        const categorieValide = ['materiali', 'attrezzature', 'noli', 'mezzi', 'manodopera', 'subappalti', 'smaltimenti', 'altro'];
        const isVuota = categorieValide.every(cat => !dettaglioCosti[cat] || dettaglioCosti[cat].length === 0);
        
        if (onSaveNewBigData) {
            categorieValide.forEach(categoria => {
                const items = dettaglioCosti[categoria];
                if (Array.isArray(items)) {
                    items.forEach(item => {
                        if (item.isNewItem && item.descrizione && item.descrizione.trim() !== '') {
                            const giaEsistente = vociBigData.some(v => v.categoria === categoria && v.descrizione.toLowerCase() === item.descrizione.toLowerCase());
                            if(!giaEsistente) {
                                onSaveNewBigData(categoria, item);
                            }
                        }
                    });
                }
            });
        }

        const datiDaSalvare = {};
        categorieValide.forEach(cat => datiDaSalvare[cat] = dettaglioCosti[cat] || []);

        onSaveAnalisi(riga.id, isVuota ? null : { ...datiDaSalvare, totaleCostoVivo: costoVivoTotale }, costoVivoTotale);
        onClose();
    };
    
    const handleBigDataClick = (cat, id) => {
        setTargetStorico({cat, id});
    };

    const pBando = parseNum(riga.prezzoGaraOriginale);
    const qtaTotale = parseNum(riga.quantita) * (parseNum(riga.numeroInterventi) || 1);
    const totBando = pBando * qtaTotale;
    const scontoVal = parseNum(scontoSimulato);
    const sgVal = parseNum(speseGeneraliPerc);
    const utVal = parseNum(utilePerc);
    const pBandoScontato = pBando * (1 - scontoVal / 100);
    const totBandoScontato = pBandoScontato * qtaTotale;
    const valSpeseGenerali = totBandoScontato * (sgVal / 100);
    const valUtile = totBandoScontato * (utVal / 100);
    const targetCostoVivo = totBandoScontato - valSpeseGenerali - valUtile;
    const pSenzaMano = parseNum(riga.prezzoSenzaManodopera);
    const incidenzaMdo = parseNum(riga.incidenzaManodopera);
    let quotaMdoBase = 0;
    if (incidenzaMdo > 0) quotaMdoBase = pBando * (incidenzaMdo / 100);
    else if (pSenzaMano > 0 && pBando > pSenzaMano) quotaMdoBase = pBando - pSenzaMano;
    const quotaMdoScontata = quotaMdoBase * (1 - scontoVal / 100);
    const valManodoperaTarget = quotaMdoScontata * qtaTotale;
    const budgetAcquistiNoli = targetCostoVivo - valManodoperaTarget;

    return (
        <div className="w-full flex flex-col relative z-10 bg-slate-100 animate-fade-in-down">
            {targetStorico && (
                <StoricoPrezziModal onClose={() => setTargetStorico(null)} onSelect={handleSelectFromStorico} tipoRicerca={targetStorico.cat} tuttiMateriali={tuttiMateriali} tuttiNoleggi={tuttiNoleggi} />
            )}

            <div className="bg-white p-6 flex justify-between items-start shrink-0 border-b border-slate-200 z-50 shadow-sm relative">
                <div className="flex items-start gap-4 flex-1 min-w-0 pr-6">
                    <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-sm shrink-0"><ChartPieIcon className="h-7 w-7 stroke-2"/></div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-black text-slate-800">Dettaglio Analisi Costi</h3>
                        <p className="text-sm font-bold text-slate-500 truncate cursor-help mt-1" title={`${riga.codice} - ${riga.descrizione}`}>
                            <span className="font-black text-indigo-700">{riga.codice}</span> - {riga.descrizione}
                        </p>
                    </div>
                </div> 
                <button onClick={onClose} className="px-4 py-2 bg-slate-100 font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-800 rounded-xl transition-colors shrink-0 flex items-center gap-2 ml-4">
                    Chiudi <XMarkIcon className="h-4 w-4 stroke-2"/>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[60vh] p-6 lg:p-8 space-y-6 bg-slate-50/80 relative z-0 scrollbar-thin scrollbar-thumb-slate-300">
                
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 flex flex-col gap-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none"></div>
                    <div className="flex flex-wrap gap-4 items-center relative z-10 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="pr-6 border-r border-slate-700">
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Totale a Bando Base</p>
                            <p className="text-xl font-black text-slate-200">€ {totBando.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                        </div>
                        <div className="flex items-center gap-3 px-2">
                            <span className="text-[10px] font-black text-sky-400 uppercase tracking-wider">Ribasso Gara:</span>
                            <div className="flex items-center gap-1 bg-slate-950 border border-sky-500/50 rounded-lg p-1 px-2">
                                <input type="text" value={scontoSimulato} onChange={(e) => setScontoSimulato(e.target.value)} placeholder="0" className="w-12 bg-transparent text-white font-black text-center outline-none" />
                                <span className="text-sm font-black text-sky-400">%</span>
                            </div>
                        </div>
                        <div className="pl-6 border-l border-slate-700 ml-auto text-right">
                            <p className="text-[10px] text-sky-300 uppercase font-bold">Ricavo Appalto (Scontato)</p>
                            <p className="text-2xl font-black text-sky-400">€ {totBandoScontato.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1"><BuildingOfficeIcon className="h-4 w-4"/> Spese Generali</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <input type="text" value={speseGeneraliPerc} onChange={(e) => setSpeseGeneraliPerc(e.target.value)} className="w-12 bg-slate-950 border border-slate-600 rounded text-slate-300 font-bold text-center outline-none p-1 text-xs" />
                                    <span className="text-xs text-slate-500">%</span>
                                </div>
                            </div>
                            <div className="text-right"><span className="text-sm font-black text-rose-300">- € {valSpeseGenerali.toLocaleString('it-IT', {minimumFractionDigits: 2})}</span></div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1"><BanknotesIcon className="h-4 w-4"/> Utile Impresa</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <input type="text" value={utilePerc} onChange={(e) => setUtilePerc(e.target.value)} className="w-12 bg-slate-950 border border-slate-600 rounded text-slate-300 font-bold text-center outline-none p-1 text-xs" />
                                    <span className="text-xs text-slate-500">%</span>
                                </div>
                            </div>
                            <div className="text-right"><span className="text-sm font-black text-rose-300">- € {valUtile.toLocaleString('it-IT', {minimumFractionDigits: 2})}</span></div>
                        </div>
                        <div className="bg-indigo-900/50 p-4 rounded-xl border border-indigo-500 flex flex-col justify-center items-end">
                            <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-widest">Budget Operativo Massimo</p>
                            <p className="text-2xl font-black text-indigo-400 drop-shadow-sm">€ {targetCostoVivo.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-between items-center border-t border-slate-700/50 pt-5 relative z-10 gap-4">
                        <div className="flex items-center gap-4 bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700">
                            <UserGroupIcon className="h-6 w-6 text-amber-500" />
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold">Quota Manodopera</p>
                                <p className="text-lg font-black text-amber-500">€ {valManodoperaTarget.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                            </div>
                        </div>
                        <div className="text-slate-500 font-black text-xl">-</div>
                        <div className="flex items-center gap-4 bg-emerald-900/30 px-5 py-3 rounded-xl border border-emerald-700/50 flex-1 justify-end">
                            <div className="text-right">
                                <p className="text-xs text-emerald-400 uppercase font-black tracking-widest">Budget Libero (Acquisti, Noli, Sub.)</p>
                                <p className="text-3xl font-black text-emerald-400 drop-shadow-md">€ {budgetAcquistiNoli.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex items-start gap-3">
                    <InformationCircleIcon className="h-6 w-6 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-indigo-800 font-bold">Inserisci i costi vivi per completare l'intervento previsto.</p>
                        <p className="text-xs text-indigo-600 mt-1">
                            Quantità in esame: <strong className="text-indigo-900">{riga.quantita} {riga.unitaMisura}</strong>. Affinché la gara sia profittevole, 
                            il tuo "Costo Assoluto" a fine pagina non deve superare il <strong className="text-indigo-900">Budget Operativo Massimo</strong>.
                        </p>
                    </div>
                </div>

                {/* 1. MATERIALI */}
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
                                    <td className="py-2 pr-2 align-middle">
                                        {v.isNewItem ? (
                                            <div className="flex items-center gap-2 w-full">
                                                <div className="flex-1 min-w-0">
                                                    <SmartCostoInput 
                                                        value={v.descrizione} 
                                                        onChange={(val) => handleCostoChange('materiali', v.id, 'descrizione', val)}
                                                        onSelect={(desc, costo) => { handleCostoChange('materiali', v.id, 'descrizione', desc); handleCostoChange('materiali', v.id, 'costoUnitario', costo); }}
                                                        placeholder="Nome materiale..."
                                                        iconColorClass="text-sky-600"
                                                        focusClass="focus:border-sky-500"
                                                        category="materiali"
                                                        vociBigData={vociBigData}
                                                        datiLocali={[...(magazzinoMateriali || []), ...(tuttiMateriali || [])]}
                                                    />
                                                </div>
                                                <button onClick={() => handleBigDataClick('materiali', v.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 whitespace-nowrap transition-colors bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 shrink-0`} title="Cerca nei Big Data"><MagnifyingGlassIcon className="h-4 w-4"/> DB</button>
                                            </div>
                                        ) : (
                                            <select value={v.descrizione} onChange={e => {
                                                const val = e.target.value;
                                                if(val === 'NEW') { handleCostoChange('materiali', v.id, 'isNewItem', true); handleCostoChange('materiali', v.id, 'descrizione', ''); return; }
                                                const matMagazzino = magazzinoMateriali.find(m => m.nome === val);
                                                if (matMagazzino) { handleCostoChange('materiali', v.id, 'descrizione', matMagazzino.nome); handleCostoChange('materiali', v.id, 'costoUnitario', matMagazzino.costoStandard||0); }
                                                else { handleCostoChange('materiali', v.id, 'descrizione', val); }
                                            }} className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-bold text-slate-700 outline-none truncate">
                                                <option value="">Seleziona Base...</option>
                                                {magazzinoMateriali.length > 0 && <optgroup label="📦 Magazzino Interno">{magazzinoMateriali.map((m) => <option key={`mag-${m.id}`} value={m.nome}>{m.nome}</option>)}</optgroup>}
                                                <option value="NEW" className="font-bold text-sky-600">➕ Inserimento Libero / Cerca in Big Data</option>
                                            </select>
                                        )}
                                    </td>
                                    <td className="py-2 px-1 text-center align-middle"><input type="text" value={v.quantita} onChange={(e) => handleCostoChange('materiali', v.id, 'quantita', e.target.value)} className="w-16 p-1.5 text-xs font-bold text-center border border-slate-200 rounded focus:border-sky-500 outline-none mx-auto block" /></td>
                                    <td className="py-2 px-1 align-middle text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <span className="text-xs text-slate-400">€</span>
                                            <input type="text" value={v.costoUnitario} onChange={(e) => handleCostoChange('materiali', v.id, 'costoUnitario', e.target.value)} className="w-20 p-1.5 text-xs font-bold text-right border border-slate-200 rounded focus:border-sky-500 outline-none" />
                                        </div>
                                    </td>
                                    <td className="py-2 pl-2 pr-2 text-sm font-black text-slate-700 text-right align-middle">€ {(parseNum(v.quantita) * parseNum(v.costoUnitario)).toFixed(2)}</td>
                                    <td className="py-2 text-right align-middle"><button onClick={() => handleRemoveCosto('materiali', v.id)} className="text-slate-300 hover:text-red-500"><XMarkIcon className="h-5 w-5"/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={() => handleAddCosto('materiali')} className="mt-2 text-sky-600 text-xs font-bold flex items-center gap-1 hover:text-sky-800 bg-sky-50 px-3 py-1.5 rounded-lg transition-colors"><PlusIcon className="h-4 w-4"/> Aggiungi Materiale</button>
                </div>

                {/* 2. ATTREZZATURE E MACCHINARI */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2"><WrenchScrewdriverIcon className="h-5 w-5 text-emerald-500"/> Mezzi e Attrezzature Aziendali</h4>
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-black tracking-wider">Totale: € {costiInterni.attrezzature.toFixed(2)}</span>
                    </div>
                    <table className="w-full text-left mb-2">
                        <thead className="text-[10px] font-bold text-slate-400 uppercase">
                            <tr>
                                <th className="py-2 w-[50%]">Descrizione Macchinario</th>
                                <th className="py-2 text-center" title="Quantità di Ore o Giorni">Ore / GG</th>
                                <th className="py-2 text-right">Costo Unit.</th>
                                <th className="py-2 text-right pr-2">Importo</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(dettaglioCosti.attrezzature||[]).map(v => (
                                <tr key={v.id} className="group">
                                    <td className="py-2 pr-2 align-middle">
                                        {v.isNewItem ? (
                                            <div className="flex items-center gap-2 w-full">
                                                <div className="flex-1 min-w-0">
                                                    <SmartCostoInput 
                                                        value={v.descrizione} 
                                                        onChange={(val) => handleCostoChange('attrezzature', v.id, 'descrizione', val)}
                                                        onSelect={(desc, costo) => { handleCostoChange('attrezzature', v.id, 'descrizione', desc); handleCostoChange('attrezzature', v.id, 'costoUnitario', costo); }}
                                                        placeholder="Es. Escavatore 18q, Gru edile..."
                                                        iconColorClass="text-emerald-600"
                                                        focusClass="focus:border-emerald-500"
                                                        category="attrezzature"
                                                        vociBigData={vociBigData}
                                                        datiLocali={[...(magazzinoMezzi || []), ...(magazzinoAttrezzature || [])]}
                                                    />
                                                </div>
                                                <button onClick={() => handleBigDataClick('attrezzature', v.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 whitespace-nowrap transition-colors bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 shrink-0`} title="Cerca nei Big Data / Media Aziende"><MagnifyingGlassIcon className="h-4 w-4"/> DB</button>
                                            </div>
                                        ) : (
                                            <select value={v.descrizione} onChange={e => {
                                                const val = e.target.value;
                                                if(val === 'NEW') { handleCostoChange('attrezzature', v.id, 'isNewItem', true); handleCostoChange('attrezzature', v.id, 'descrizione', ''); return; }
                                                const att = [...magazzinoMezzi, ...magazzinoAttrezzature].find(m => (m.nome || m.modello) === val);
                                                if (att) { handleCostoChange('attrezzature', v.id, 'descrizione', (att.nome || att.modello)); handleCostoChange('attrezzature', v.id, 'costoUnitario', att.costoOrario || att.costoStandard || 0); } 
                                                else { handleCostoChange('attrezzature', v.id, 'descrizione', val); }
                                            }} className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-bold text-slate-700 outline-none truncate">
                                                <option value="">Seleziona Attrezzatura...</option>
                                                {(magazzinoMezzi.length > 0 || magazzinoAttrezzature.length > 0) && <optgroup label="🏭 Magazzino / Flotta Interna">{[...magazzinoMezzi, ...magazzinoAttrezzature].map((m, idx) => <option key={`att-${idx}`} value={m.nome || m.modello}>{m.nome || m.modello}</option>)}</optgroup>}
                                                <option value="NEW" className="font-bold text-emerald-600">➕ Inserimento Libero / Cerca in Big Data</option>
                                            </select>
                                        )}
                                    </td>
                                    <td className="py-2 px-1 text-center align-middle"><input type="text" value={v.quantita} onChange={(e) => handleCostoChange('attrezzature', v.id, 'quantita', e.target.value)} className="w-16 p-1.5 text-xs font-bold text-center border border-slate-200 rounded focus:border-emerald-500 outline-none mx-auto block" /></td>
                                    <td className="py-2 px-1 align-middle text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <span className="text-xs text-slate-400">€</span>
                                            <input type="text" value={v.costoUnitario} onChange={(e) => handleCostoChange('attrezzature', v.id, 'costoUnitario', e.target.value)} className="w-20 p-1.5 text-xs font-bold text-right border border-slate-200 rounded focus:border-emerald-500 outline-none" />
                                        </div>
                                    </td>
                                    <td className="py-2 pl-2 pr-2 text-sm font-black text-slate-700 text-right align-middle">€ {(parseNum(v.quantita) * parseNum(v.costoUnitario)).toFixed(2)}</td>
                                    <td className="py-2 text-right align-middle"><button onClick={() => handleRemoveCosto('attrezzature', v.id)} className="text-slate-300 hover:text-red-500"><XMarkIcon className="h-5 w-5"/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={() => handleAddCosto('attrezzature')} className="mt-2 text-emerald-600 text-xs font-bold flex items-center gap-1 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"><PlusIcon className="h-4 w-4"/> Aggiungi Mezzo Aziendale</button>
                </div>

                {/* 3. MANODOPERA */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2"><UserGroupIcon className="h-5 w-5 text-orange-500"/> Manodopera</h4>
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-black tracking-wider">Totale: € {costiInterni.manodopera.toFixed(2)}</span>
                    </div>
                    <table className="w-full text-left mb-2">
                        <thead className="text-[10px] font-bold text-slate-400 uppercase">
                            <tr><th className="py-2 w-[40%]">Ruolo / Qualifica</th><th className="py-2 text-center" title="N° Persone">N° Op.</th><th className="py-2 text-center">Ore</th><th className="py-2 text-right">Costo Orario</th><th className="py-2 text-right pr-2">Importo</th><th></th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(dettaglioCosti.manodopera||[]).map(v => (
                                <tr key={v.id} className="group">
                                    <td className="py-2 pr-2 align-middle">
                                        <select value={v.descrizione} onChange={e => {
                                            const ruolo = e.target.value;
                                            let nuovoCosto = 0;
                                            if (ruolo !== 'Libero' && ruolo !== '') {
                                                const tariffa = Object.entries(tariffeSimulazione || tariffeAziendali).find(([key]) => key.toLowerCase() === ruolo.toLowerCase());
                                                if (tariffa) nuovoCosto = tariffa[1];
                                            }
                                            handleCostoChange('manodopera', v.id, 'descrizione', ruolo);
                                            handleCostoChange('manodopera', v.id, 'costoUnitario', nuovoCosto);
                                        }} className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-bold text-slate-700 outline-none truncate">
                                            <option value="">Seleziona Ruolo...</option>
                                            {Object.keys(tariffeSimulazione || tariffeAziendali).map(r => <option key={r} value={r}>{r}</option>)}
                                            <option value="Libero" className="text-orange-600 font-bold">Altro (Libero)</option>
                                        </select>
                                    </td>
                                    <td className="py-2 px-1 align-middle">
                                        <div className="flex justify-center items-center gap-1 mt-1">
                                            <UserIcon className="h-3 w-3 text-slate-400"/>
                                            <input type="text" value={v.numeroPersone !== undefined ? v.numeroPersone : 1} onChange={(e) => handleCostoChange('manodopera', v.id, 'numeroPersone', e.target.value)} className="w-12 p-1.5 text-xs font-bold text-center border border-slate-200 rounded outline-none text-orange-600" />
                                        </div>
                                    </td>
                                    <td className="py-2 px-1 text-center align-middle">
                                        <input type="text" value={v.quantita} onChange={(e) => handleCostoChange('manodopera', v.id, 'quantita', e.target.value)} className="w-16 p-1.5 text-xs font-bold text-center border border-slate-200 rounded outline-none mx-auto block" />
                                    </td>
                                    <td className="py-2 px-1 align-middle text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <span className="text-xs text-slate-400">€</span>
                                            <input type="text" value={v.costoUnitario} onChange={(e) => handleCostoChange('manodopera', v.id, 'costoUnitario', e.target.value)} className="w-20 p-1.5 text-xs font-bold text-right border border-slate-200 rounded outline-none" />
                                        </div>
                                    </td>
                                    <td className="py-2 pl-2 pr-2 text-sm font-black text-slate-700 text-right align-middle">
                                        € {((v.numeroPersone !== undefined && v.numeroPersone !== '' ? parseNum(v.numeroPersone) : 1) * parseNum(v.quantita) * parseNum(v.costoUnitario)).toFixed(2)}
                                    </td>
                                    <td className="py-2 text-right align-middle"><button onClick={() => handleRemoveCosto('manodopera', v.id)} className="text-slate-300 hover:text-red-500"><XMarkIcon className="h-5 w-5"/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={() => handleAddCosto('manodopera')} className="mt-2 text-orange-600 text-xs font-bold flex items-center gap-1 hover:text-orange-800 bg-orange-50 px-3 py-1.5 rounded-lg transition-colors"><PlusIcon className="h-4 w-4"/> Aggiungi Manodopera</button>
                </div>

                {/* 4. NOLI ESTERNI */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2"><KeyIcon className="h-5 w-5 text-fuchsia-500"/> Noli Esterni (A Freddo / A Caldo)</h4>
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-black tracking-wider">Totale: € {costiInterni.noli.toFixed(2)}</span>
                    </div>
                    <table className="w-full text-left mb-2">
                        <thead className="text-[10px] font-bold text-slate-400 uppercase">
                            <tr><th className="py-2 w-[50%]">Descrizione Noleggio</th><th className="py-2 text-center w-16">GG/Ore</th><th className="py-2 text-right w-24">Costo Unit.</th><th className="py-2 text-right pr-2">Importo</th><th></th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(dettaglioCosti.noli||[]).map(v => (
                                <tr key={v.id} className="group">
                                    <td className="py-2 pr-2 align-middle">
                                        <div className="flex items-center gap-2 w-full">
                                            <div className="flex-1 min-w-0">
                                                <SmartCostoInput 
                                                    value={v.descrizione} 
                                                    onChange={(val) => handleCostoChange('noli', v.id, 'descrizione', val)}
                                                    onSelect={(desc, costo) => { handleCostoChange('noli', v.id, 'descrizione', desc); handleCostoChange('noli', v.id, 'costoUnitario', costo); }}
                                                    placeholder="Es. Nolo Gru..."
                                                    iconColorClass="text-fuchsia-600"
                                                    focusClass="focus:border-fuchsia-500"
                                                    category="noli"
                                                    vociBigData={vociBigData}
                                                    datiLocali={tuttiNoleggi || []}
                                                />
                                            </div>
                                            <button onClick={() => handleBigDataClick('noli', v.id)} className={`px-2 rounded-md text-[10px] font-bold flex items-center gap-1 whitespace-nowrap transition-colors bg-indigo-50 text-indigo-600 hover:bg-indigo-100 shrink-0`} title="Cerca in Big Data Globale"><MagnifyingGlassIcon className="h-3 w-3"/> DB</button>
                                        </div>
                                    </td>
                                    <td className="py-2 px-1 text-center align-middle"><input type="text" value={v.quantita} onChange={(e) => handleCostoChange('noli', v.id, 'quantita', e.target.value)} className="w-16 p-1.5 text-xs text-center border border-slate-200 rounded outline-none focus:border-fuchsia-500 mx-auto block" /></td>
                                    <td className="py-2 px-1 align-middle text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <span className="text-xs text-slate-400">€</span>
                                            <input type="text" value={v.costoUnitario} onChange={(e) => handleCostoChange('noli', v.id, 'costoUnitario', e.target.value)} className="w-20 p-1.5 text-xs text-right border border-slate-200 rounded outline-none focus:border-fuchsia-500" />
                                        </div>
                                    </td>
                                    <td className="py-2 pl-2 pr-2 text-sm font-black text-slate-700 text-right align-middle">€ {(parseNum(v.quantita) * parseNum(v.costoUnitario)).toFixed(2)}</td>
                                    <td className="py-2 text-right align-middle"><button onClick={() => handleRemoveCosto('noli', v.id)} className="text-slate-300 hover:text-red-500"><XMarkIcon className="h-4 w-4"/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={() => handleAddCosto('noli')} className="text-fuchsia-600 text-[10px] font-bold mt-2 hover:text-fuchsia-800 bg-fuchsia-50 px-3 py-1.5 rounded-lg transition-colors flex items-center w-max gap-1"><PlusIcon className="h-3 w-3" /> Aggiungi Nolo Esterno</button>
                </div>

                {/* 5. SUBAPPALTI */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2"><BuildingOfficeIcon className="h-5 w-5 text-indigo-500"/> Subappalti (Lavorazioni Esterne)</h4>
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-black tracking-wider">Totale: € {costiInterni.subappalti.toFixed(2)}</span>
                    </div>
                    <table className="w-full text-left mb-2">
                        <thead className="text-[10px] font-bold text-slate-400 uppercase">
                            <tr><th className="py-2 w-[50%]">Descrizione Lavorazione Subappaltata</th><th className="py-2 text-center w-16">Q.tà</th><th className="py-2 text-right w-24">Costo Unit.</th><th className="py-2 text-right pr-2">Importo</th><th></th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(dettaglioCosti.subappalti||[]).map(v => (
                                <tr key={v.id} className="group">
                                    <td className="py-2 pr-2 align-middle">
                                        <div className="flex items-center gap-2 w-full">
                                            <div className="flex-1 min-w-0">
                                                <SmartCostoInput 
                                                    value={v.descrizione} 
                                                    onChange={(val) => handleCostoChange('subappalti', v.id, 'descrizione', val)}
                                                    onSelect={(desc, costo) => { handleCostoChange('subappalti', v.id, 'descrizione', desc); handleCostoChange('subappalti', v.id, 'costoUnitario', costo); }}
                                                    placeholder="Es. Posa tegole, Asfaltatura..."
                                                    iconColorClass="text-indigo-600"
                                                    focusClass="focus:border-indigo-500"
                                                    category="subappalti"
                                                    vociBigData={vociBigData}
                                                    datiLocali={[]}
                                                />
                                            </div>
                                            <button onClick={() => handleBigDataClick('subappalti', v.id)} className={`px-2 rounded-md text-[10px] font-bold flex items-center gap-1 whitespace-nowrap transition-colors bg-indigo-50 text-indigo-600 hover:bg-indigo-100 shrink-0`} title="Cerca in Big Data Globale"><MagnifyingGlassIcon className="h-3 w-3"/> DB</button>
                                        </div>
                                    </td>
                                    <td className="py-2 px-1 text-center align-middle"><input type="text" value={v.quantita} onChange={(e) => handleCostoChange('subappalti', v.id, 'quantita', e.target.value)} className="w-16 p-1.5 text-xs text-center border border-slate-200 rounded outline-none focus:border-indigo-500 mx-auto block" /></td>
                                    <td className="py-2 px-1 align-middle text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <span className="text-xs text-slate-400">€</span>
                                            <input type="text" value={v.costoUnitario} onChange={(e) => handleCostoChange('subappalti', v.id, 'costoUnitario', e.target.value)} className="w-20 p-1.5 text-xs text-right border border-slate-200 rounded outline-none focus:border-indigo-500" />
                                        </div>
                                    </td>
                                    <td className="py-2 pl-2 pr-2 text-sm font-black text-slate-700 text-right align-middle">€ {(parseNum(v.quantita) * parseNum(v.costoUnitario)).toFixed(2)}</td>
                                    <td className="py-2 text-right align-middle"><button onClick={() => handleRemoveCosto('subappalti', v.id)} className="text-slate-300 hover:text-red-500"><XMarkIcon className="h-4 w-4"/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={() => handleAddCosto('subappalti')} className="text-indigo-600 text-[10px] font-bold mt-2 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors flex items-center w-max gap-1"><PlusIcon className="h-3 w-3" /> Aggiungi Lavorazione Subappaltata</button>
                </div>

                {/* 6. SMALTIMENTI */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2"><TrashIcon className="h-5 w-5 text-stone-500"/> Smaltimenti e Oneri di Discarica</h4>
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-black tracking-wider">Totale: € {costiInterni.smaltimenti.toFixed(2)}</span>
                    </div>
                    <table className="w-full text-left mb-2">
                        <thead className="text-[10px] font-bold text-slate-400 uppercase">
                            <tr><th className="py-2 w-[50%]">Descrizione Rifiuto / Trasporto</th><th className="py-2 text-center w-16">Q.tà</th><th className="py-2 text-right w-24">Costo Unit.</th><th className="py-2 text-right pr-2">Importo</th><th></th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(dettaglioCosti.smaltimenti||[]).map(v => (
                                <tr key={v.id} className="group">
                                    <td className="py-2 pr-2 align-middle">
                                        <div className="flex items-center gap-2 w-full">
                                            <div className="flex-1 min-w-0">
                                                <SmartCostoInput 
                                                    value={v.descrizione} 
                                                    onChange={(val) => handleCostoChange('smaltimenti', v.id, 'descrizione', val)}
                                                    onSelect={(desc, costo) => { handleCostoChange('smaltimenti', v.id, 'descrizione', desc); handleCostoChange('smaltimenti', v.id, 'costoUnitario', costo); }}
                                                    placeholder="Es. Oneri discarica macerie..."
                                                    iconColorClass="text-stone-600"
                                                    focusClass="focus:border-stone-500"
                                                    category="smaltimenti"
                                                    vociBigData={vociBigData}
                                                    datiLocali={[]}
                                                />
                                            </div>
                                            <button onClick={() => handleBigDataClick('smaltimenti', v.id)} className={`px-2 rounded-md text-[10px] font-bold flex items-center gap-1 whitespace-nowrap transition-colors bg-indigo-50 text-indigo-600 hover:bg-indigo-100 shrink-0`} title="Cerca in Big Data Globale"><MagnifyingGlassIcon className="h-3 w-3"/> DB</button>
                                        </div>
                                    </td>
                                    <td className="py-2 px-1 text-center align-middle"><input type="text" value={v.quantita} onChange={(e) => handleCostoChange('smaltimenti', v.id, 'quantita', e.target.value)} className="w-16 p-1.5 text-xs text-center border border-slate-200 rounded outline-none focus:border-stone-500 mx-auto block" /></td>
                                    <td className="py-2 px-1 align-middle text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <span className="text-xs text-slate-400">€</span>
                                            <input type="text" value={v.costoUnitario} onChange={(e) => handleCostoChange('smaltimenti', v.id, 'costoUnitario', e.target.value)} className="w-20 p-1.5 text-xs text-right border border-slate-200 rounded outline-none focus:border-stone-500" />
                                        </div>
                                    </td>
                                    <td className="py-2 pl-2 pr-2 text-sm font-black text-slate-700 text-right align-middle">€ {(parseNum(v.quantita) * parseNum(v.costoUnitario)).toFixed(2)}</td>
                                    <td className="py-2 text-right align-middle"><button onClick={() => handleRemoveCosto('smaltimenti', v.id)} className="text-slate-300 hover:text-red-500"><XMarkIcon className="h-4 w-4"/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={() => handleAddCosto('smaltimenti')} className="text-stone-600 text-[10px] font-bold mt-2 hover:text-stone-800 bg-stone-50 px-3 py-1.5 rounded-lg transition-colors flex items-center w-max gap-1"><PlusIcon className="h-3 w-3" /> Aggiungi Smaltimento / Trasporto</button>
                </div>

            </div>

            {/* FOOTER DEL PANNELLO */}
            <div className="bg-white p-6 border-t border-slate-200 flex justify-between items-center shrink-0 z-50 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] relative">
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
                <button onClick={handleSave} className="px-8 py-3.5 font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 text-lg">
                    <CheckCircleIcon className="h-6 w-6" /> Applica e Chiudi Pannello
                </button>
            </div>
        </div>
    );
};