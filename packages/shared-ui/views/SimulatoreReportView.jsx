// packages/shared-ui/views/SimulatoreReportView.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
    PrinterIcon, BanknotesIcon, ChartPieIcon, BriefcaseIcon, 
    ArchiveBoxIcon, UserGroupIcon, WrenchScrewdriverIcon, KeyIcon, BuildingOfficeIcon, TrashIcon,
    ArrowLeftIcon, CheckCircleIcon
} from '@heroicons/react/24/outline';

const parseNum = (val) => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (val === null || val === undefined || val === '') return 0;
    let str = val.toString();
    if (str.includes('.') && str.includes(',')) { str = str.replace(/\./g, '').replace(',', '.'); } 
    else if (str.includes(',') && !str.includes('.')) { str = str.replace(',', '.'); }
    const parsed = parseFloat(str); return isNaN(parsed) ? 0 : parsed;
};

// --- SOTTO-COMPONENTI ---
const FinanzaStrategicaBlock = ({ totaleBaseAsta, risultatoEconomico, onApplyGlobalDiscount, isPrint = false }) => {
    const [scontoInput, setScontoInput] = useState('');
    
    useEffect(() => {
        const scontoMedio = totaleBaseAsta > 0 
            ? ((totaleBaseAsta - risultatoEconomico.totali.totaleVendita) / totaleBaseAsta) * 100 
            : 0;
        setScontoInput(scontoMedio.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2}));
    }, [risultatoEconomico.totali.totaleVendita, totaleBaseAsta]);

    const applySconto = (val) => {
        let num = parseNum(val);
        if (num < 0) num = Math.abs(num); 
        setScontoInput(num.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2}));
        onApplyGlobalDiscount(num);
    };

    const margineSuVendita = risultatoEconomico.totali.totaleVendita > 0 ? (risultatoEconomico.totali.utileNetto / risultatoEconomico.totali.totaleVendita) * 100 : 0;

    return (
        <div className={`grid grid-cols-1 ${isPrint ? 'grid-cols-3 gap-6 mb-8' : 'md:grid-cols-3 gap-6'}`}>
            <div className={`flex flex-col justify-center ${isPrint ? 'p-6 border border-slate-300 rounded-2xl bg-white' : 'bg-slate-50 p-6 rounded-2xl border border-slate-200'}`}>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Valore Gara (Base d'Asta)</p>
                <p className={`text-3xl font-black ${isPrint ? 'text-black' : 'text-slate-700'}`}>€ {totaleBaseAsta.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
            </div>
            <div className={`flex flex-col justify-center ${isPrint ? 'p-6 border border-sky-300 rounded-2xl bg-white' : 'bg-sky-50 p-6 rounded-2xl border border-sky-300 shadow-inner'}`}>
                <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-1">Sconto Proposto %</p>
                <div className="flex items-center gap-1 mt-1">
                    {isPrint ? <span className="text-3xl font-black text-sky-900">{scontoInput} %</span> : (
                        <><input type="text" value={scontoInput} onChange={(e) => setScontoInput(e.target.value)} onBlur={(e) => applySconto(e.target.value)} className="w-full bg-transparent text-3xl font-black text-sky-700 outline-none" /><span className="text-2xl font-black text-sky-600">%</span></>
                    )}
                </div>
            </div>
            <div className={`flex flex-col justify-center p-6 rounded-2xl border ${isPrint ? 'border-slate-300' : (risultatoEconomico.totali.utileNetto > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200')}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isPrint ? 'text-emerald-800' : (risultatoEconomico.totali.utileNetto > 0 ? 'text-emerald-600' : 'text-red-600')}`}>Utile Netto Stimato</p>
                <p className="text-3xl font-black print:text-black">€ {risultatoEconomico.totali.utileNetto.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                <p className={`text-[10px] font-bold mt-1 text-slate-500`}>{margineSuVendita.toFixed(1)}% sull'offerta</p>
            </div>
        </div>
    );
};

const CategoriaReportTable = ({ titolo, icona: Icon, colorTheme, data, isPrint = false }) => {
    if (!data || data.length === 0) return null;
    const totale = data.reduce((acc, curr) => acc + curr.costoTotale, 0);
    return (
        <div className={`mt-6 break-inside-avoid rounded-2xl overflow-hidden ${isPrint ? 'border border-slate-300' : `border border-${colorTheme}-200 shadow-sm`}`}>
            <div className={`p-4 border-b flex justify-between items-center ${isPrint ? 'bg-slate-50 border-slate-300' : `bg-${colorTheme}-50 border-${colorTheme}-100`}`}>
                <h4 className="text-lg font-black flex items-center gap-2"><Icon className="h-5 w-5" /> {titolo}</h4>
                <p className="text-lg font-black">€ {totale.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
            </div>
            <table className="w-full text-left text-sm">
                <thead className="bg-white border-b border-slate-200">
                    <tr>
                        <th className="px-5 py-3 font-black text-xs uppercase tracking-wider text-slate-500">Voce</th>
                        <th className="px-5 py-3 text-center font-black text-xs uppercase tracking-wider text-slate-500">Q.tà</th>
                        <th className="px-5 py-3 text-right font-black text-xs uppercase tracking-wider text-slate-500">Costo</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {data.map((item, idx) => (
                        <tr key={idx}>
                            <td className="px-5 py-3 font-semibold text-slate-800">{item.descrizioneOriginale}</td>
                            <td className="px-5 py-3 text-center"><span className="font-bold text-xs">{item.quantitaTotale.toLocaleString('it-IT', {maximumFractionDigits: 2})} {item.unitaMisura}</span></td>
                            <td className="px-5 py-3 text-right font-black text-slate-700">€ {item.costoTotale.toLocaleString('it-IT', {minimumFractionDigits: 2})}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export const SimulatoreReportView = ({ datiSetup, risultatoEconomico, risultatoOperativo, applicaScontoGlobale, onBack, onArchivia, isSaving }) => {
    
    const [noteFinali, setNoteFinali] = useState(risultatoOperativo?.riepilogo?.noteTitolare || "");
    const [teamSize, setTeamSize] = useState(2);
    const [workHours, setWorkHours] = useState(8);

    useEffect(() => {
        if (risultatoOperativo?.riepilogo?.noteTitolare) {
            setNoteFinali(risultatoOperativo.riepilogo.noteTitolare);
        }
    }, [risultatoOperativo]);

    const fabbisogniAggregati = useMemo(() => {
        if (!risultatoEconomico?.righe) return null;
        const aggregato = { manodopera: {}, attrezzature: {}, noli: {}, subappalti: {}, materiali: {}, smaltimenti: {} };
        
        risultatoEconomico.righe.forEach(riga => {
            if (!riga.analisiCosti) return;
            const mI = parseNum(riga.numeroInterventi) || 1;
            
            const add = (cat, array, isMdo = false) => {
                (array || []).forEach(v => {
                    const desc = v.descrizione || 'Voce senza nome';
                    const key = desc.trim().toUpperCase();
                    let q = parseNum(v.quantita) * mI;
                    if (isMdo) q *= (parseNum(v.numeroPersone) || 1);
                    if (!aggregato[cat][key]) aggregato[cat][key] = { descrizioneOriginale: desc, quantitaTotale: 0, costoTotale: 0, unitaMisura: isMdo ? 'ore' : (v.unitaMisura || '') };
                    aggregato[cat][key].quantitaTotale += q;
                    aggregato[cat][key].costoTotale += q * parseNum(v.costoUnitario);
                });
            };

            add('manodopera', riga.analisiCosti.manodopera, true); 
            add('attrezzature', riga.analisiCosti.attrezzature);
            add('attrezzature', riga.analisiCosti.mezzi); // I mezzi aziendali confluiscono in attrezzature
            add('noli', riga.analisiCosti.noli);          // I noleggi restano separati nei noli
            add('subappalti', riga.analisiCosti.subappalti); 
            add('materiali', riga.analisiCosti.materiali);
            add('smaltimenti', riga.analisiCosti.smaltimenti);
        });

        const sort = (obj) => Object.values(obj).sort((a, b) => b.costoTotale - a.costoTotale);
        
        return { 
            manodopera: sort(aggregato.manodopera), 
            attrezzature: sort(aggregato.attrezzature), 
            noli: sort(aggregato.noli), 
            subappalti: sort(aggregato.subappalti), 
            materiali: sort(aggregato.materiali), 
            smaltimenti: sort(aggregato.smaltimenti) 
        };
    }, [risultatoEconomico?.righe]);

    const renderContent = (isPrint) => {
        const macroCosti = { manodopera: 0, materiali: 0, attrezzature: 0, noli: 0, subappalti: 0, smaltimenti: 0 };
        let tBA = 0;
        
        risultatoEconomico.righe.forEach(r => {
            const q = (parseNum(r.quantita) || 0) * (parseNum(r.numeroInterventi) || 1);
            tBA += parseNum(r.prezzoGaraOriginale) * q;
            if (r.analisiCosti) {
                ['materiali', 'attrezzature', 'noli', 'mezzi', 'manodopera', 'subappalti', 'smaltimenti'].forEach(cat => {
                    (r.analisiCosti[cat] || []).forEach(item => {
                        const tot = (parseNum(item.numeroPersone) || 1) * parseNum(item.quantita) * parseNum(item.costoUnitario) * (parseNum(r.numeroInterventi) || 1);
                        if (cat === 'mezzi') macroCosti.attrezzature += tot; 
                        else macroCosti[cat] += tot;
                    });
                });
            }
        });

        const inc = (v) => risultatoEconomico.totali.totaleCosti > 0 ? (v / risultatoEconomico.totali.totaleCosti) * 100 : 0;
        
        // Calcoli per la conversione Manodopera
        const totalOreManodopera = fabbisogniAggregati?.manodopera.reduce((acc, curr) => acc + curr.quantitaTotale, 0) || 0;
        const giornateSquadra = totalOreManodopera > 0 ? totalOreManodopera / ((teamSize || 1) * (workHours || 1)) : 0;

        return (
            <div className={`w-full mx-auto ${isPrint ? 'max-w-none' : 'max-w-5xl mt-6 animate-fade-in-up pb-20'}`}>
                <div className={`bg-white overflow-hidden ${isPrint ? '' : 'rounded-3xl shadow-xl border border-slate-200'}`}>
                    
                    <div className={`${isPrint ? 'pb-6 mb-8 border-b-4 border-slate-900' : 'bg-slate-900 p-12 text-white'}`}>
                        <div className="flex justify-between items-start mb-6">
                            <div><p className={`${isPrint ? 'text-slate-500' : 'text-sky-400'} font-black tracking-widest uppercase text-sm mb-2`}>Report Strategico</p><h1 className={`text-4xl font-black ${isPrint ? 'text-black' : ''}`}>{datiSetup.nomeProgetto}</h1></div>
                            {!isPrint && <button onClick={() => window.print()} className="flex items-center gap-2 bg-white/10 text-white px-5 py-3 rounded-xl font-bold"><PrinterIcon className="h-5 w-5" /> Stampa PDF</button>}
                        </div>
                        <div className="grid grid-cols-2 gap-8 border-t border-slate-300/20 pt-6">
                            <div><p className="text-xs uppercase font-bold text-slate-500">Committente</p><p className={`text-lg font-bold ${isPrint ? 'text-black' : ''}`}>{datiSetup.cliente || 'Non specificato'}</p></div>
                            <div className="print:hidden"><p className="text-xs uppercase font-bold text-slate-500">Data Elaborazione</p><p className="text-lg font-bold">{new Date().toLocaleDateString('it-IT')}</p></div>
                        </div>
                    </div>

                    <div className={isPrint ? '' : 'p-12 space-y-12'}>
                        <section><h3 className="text-xl font-black border-b-2 pb-3 mb-6 flex items-center gap-2">Sintesi Finanziaria</h3><FinanzaStrategicaBlock totaleBaseAsta={tBA} risultatoEconomico={risultatoEconomico} onApplyGlobalDiscount={applicaScontoGlobale} isPrint={isPrint} /></section>
                        
                        <section className="break-inside-avoid border-t border-slate-200 pt-8">
                            <h3 className="text-xl font-black border-b-2 pb-3 mb-6">Breakdown Costi Vivi</h3>
                            <div className={isPrint ? '' : 'bg-white border border-slate-200 rounded-3xl p-6 shadow-sm'}>
                                <p className="text-3xl font-black mb-6 text-slate-800 print:text-black">€ {risultatoEconomico.totali.totaleCosti.toLocaleString('it-IT')}</p>
                                <div className="space-y-4">
                                    {[
                                        {l:'Manodopera', v:macroCosti.manodopera, c:'bg-orange-500'},
                                        {l:'Materiali', v:macroCosti.materiali, c:'bg-sky-500'},
                                        {l:'Mezzi Aziendali', v:macroCosti.attrezzature, c:'bg-emerald-500'},
                                        {l:'Noleggi', v:macroCosti.noli, c:'bg-fuchsia-500'},
                                        {l:'Subappalti', v:macroCosti.subappalti, c:'bg-indigo-500'},
                                        {l:'Smaltimenti', v:macroCosti.smaltimenti, c:'bg-stone-500'}
                                    ].filter(x=>x.v>0).map((cat,i)=>(
                                        <div key={i} className="flex items-center gap-4">
                                            <div className="w-1/4 text-xs font-bold">{cat.l}<br/>€ {cat.v.toLocaleString('it-IT',{maximumFractionDigits:0})}</div>
                                            <div className={`flex-1 h-3 rounded-full overflow-hidden ${isPrint ? 'bg-slate-200' : 'bg-slate-100'}`}><div className={`h-full rounded-full ${isPrint ? 'bg-black' : cat.c}`} style={{width:`${inc(cat.v)}%`}}></div></div>
                                            <div className="w-12 text-right text-xs font-black">{inc(cat.v).toFixed(1)}%</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* BOX: DIMENSIONAMENTO SQUADRE E MANODOPERA */}
                        {totalOreManodopera > 0 && (
                            <section className={`break-inside-avoid ${isPrint ? 'border-t-2 border-slate-300 pt-8 mt-10' : 'border-t border-slate-200 pt-8 mt-8'}`}>
                                <h3 className={`text-xl font-black pb-3 mb-6 flex items-center gap-2 border-b-2 ${isPrint ? 'border-slate-800 text-black' : 'border-slate-100 text-slate-800'}`}>
                                    <UserGroupIcon className={`h-6 w-6 ${isPrint ? 'text-slate-700' : 'text-orange-500'}`}/> Dimensionamento Squadre Tipo
                                </h3>
                                <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 items-center ${isPrint ? 'border border-slate-300 p-6 rounded-2xl' : 'bg-slate-50 rounded-3xl border border-slate-200 p-8'}`}>
                                    
                                    <div>
                                        <p className={`text-[10px] font-black uppercase mb-1 ${isPrint ? 'text-slate-600' : 'text-slate-500'}`}>Ore Manodopera Totali</p>
                                        <p className={`text-3xl font-black ${isPrint ? 'text-black' : 'text-slate-800'}`}>
                                            {totalOreManodopera.toLocaleString('it-IT', {maximumFractionDigits: 0})} <span className="text-sm">ore</span>
                                        </p>
                                    </div>
                                    
                                    <div className={`flex gap-4 items-center p-4 rounded-xl ${isPrint ? 'bg-transparent border border-slate-300' : 'bg-white border border-slate-200 shadow-sm'}`}>
                                        <div className="flex-1 text-center">
                                            <p className={`text-[10px] font-black uppercase mb-2 ${isPrint ? 'text-slate-600' : 'text-slate-500'}`}>Operai / Squadra</p>
                                            {isPrint ? (
                                                <p className="text-2xl font-black text-black">{teamSize}</p>
                                            ) : (
                                                <input type="number" value={teamSize} onChange={e => setTeamSize(parseNum(e.target.value))} className="w-20 p-2 mx-auto bg-slate-50 border border-slate-200 rounded-lg font-black text-center text-lg outline-none focus:ring-2 focus:ring-orange-500 text-slate-700" min="1" />
                                            )}
                                        </div>
                                        <div className="text-2xl font-light text-slate-300">×</div>
                                        <div className="flex-1 text-center">
                                            <p className={`text-[10px] font-black uppercase mb-2 ${isPrint ? 'text-slate-600' : 'text-slate-500'}`}>Ore / Turno</p>
                                            {isPrint ? (
                                                <p className="text-2xl font-black text-black">{workHours}</p>
                                            ) : (
                                                <input type="number" value={workHours} onChange={e => setWorkHours(parseNum(e.target.value))} className="w-20 p-2 mx-auto bg-slate-50 border border-slate-200 rounded-lg font-black text-center text-lg outline-none focus:ring-2 focus:ring-orange-500 text-slate-700" min="1" />
                                            )}
                                        </div>
                                    </div>

                                    <div className={`p-6 rounded-2xl border flex flex-col justify-center text-center ${isPrint ? 'border-orange-500 bg-white' : 'bg-orange-50 border-orange-200'}`}>
                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isPrint ? 'text-orange-800' : 'text-orange-600'}`}>Giornate / Squadra Stimate</p>
                                        <p className={`text-4xl font-black ${isPrint ? 'text-orange-900' : 'text-orange-700'}`}>{Math.ceil(giornateSquadra)} <span className="text-lg">gg</span></p>
                                    </div>

                                </div>
                            </section>
                        )}

                        {fabbisogniAggregati && (
                            <section className="border-t border-slate-200 pt-8 break-before-page">
                                <h3 className="text-xl font-black border-b-2 border-black pb-3 mb-6">Analitico Fabbisogni</h3>
                                <div className={`grid ${isPrint ? 'grid-cols-1 gap-y-8' : 'grid-cols-1 md:grid-cols-2 gap-6'}`}>
                                    <CategoriaReportTable titolo="Manodopera" icona={UserGroupIcon} colorTheme="orange" data={fabbisogniAggregati.manodopera} isPrint={isPrint} />
                                    <CategoriaReportTable titolo="Materiali" icona={ArchiveBoxIcon} colorTheme="sky" data={fabbisogniAggregati.materiali} isPrint={isPrint} />
                                    <CategoriaReportTable titolo="Mezzi Aziendali" icona={WrenchScrewdriverIcon} colorTheme="emerald" data={fabbisogniAggregati.attrezzature} isPrint={isPrint} />
                                    <CategoriaReportTable titolo="Noleggi (Noli Esterni)" icona={KeyIcon} colorTheme="fuchsia" data={fabbisogniAggregati.noli} isPrint={isPrint} />
                                    <CategoriaReportTable titolo="Subappalti" icona={BuildingOfficeIcon} colorTheme="indigo" data={fabbisogniAggregati.subappalti} isPrint={isPrint} />
                                    <CategoriaReportTable titolo="Oneri Smaltimento" icona={TrashIcon} colorTheme="stone" data={fabbisogniAggregati.smaltimenti} isPrint={isPrint} />
                                </div>
                            </section>
                        )}

                        <section className={`break-inside-avoid ${isPrint ? 'border-t-2 border-slate-300 pt-8 mt-10' : 'border-t border-slate-200 pt-8 mt-8'}`}>
                            <h3 className={`text-xl font-black pb-3 mb-6 flex items-center gap-2 border-b-2 ${isPrint ? 'border-slate-800 text-black' : 'border-slate-100 text-slate-800'}`}>
                                <BriefcaseIcon className={`h-6 w-6 ${isPrint ? 'text-slate-700' : 'text-emerald-500'}`}/> Logistica e Conclusioni
                            </h3>
                            <div className={`grid grid-cols-1 ${risultatoOperativo ? 'md:grid-cols-2' : ''} gap-8 ${isPrint ? 'border border-slate-300 p-6 rounded-2xl' : 'bg-slate-50 rounded-3xl border border-slate-200 p-8'}`}>
                                {risultatoOperativo && (
                                    <div>
                                        <p className="text-sm font-black uppercase mb-4">Saturazione Forza Lavoro</p>
                                        <div className="flex justify-between items-end mb-2"><span className="text-xs font-bold text-slate-500">Picco Max Richiesto</span><span className="text-xl font-black">{risultatoOperativo.riepilogo?.piccoOperai || 0} Operai</span></div>
                                        <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden"><div className={`h-full ${isPrint ? 'bg-black' : 'bg-emerald-500'}`} style={{ width: `${Math.min(((risultatoOperativo.riepilogo?.piccoOperai || 0) / (risultatoOperativo.impostazioniGantt?.capacitaConsiderata || 1)) * 100, 100)}%` }} /></div>
                                        <p className="text-[10px] font-bold text-slate-400 mt-3 leading-relaxed">Calcolo basato su capacità aziendale di <strong>{risultatoOperativo.impostazioniGantt?.capacitaConsiderata || 0} addetti</strong>.</p>
                                    </div>
                                )}
                                <div className={risultatoOperativo ? "pl-0 md:pl-8 border-t md:border-t-0 md:border-l pt-6 md:pt-0 border-slate-200" : ""}>
                                    <p className="text-sm font-black uppercase mb-4">Conclusioni e Criticità</p>
                                    <div className={`p-4 rounded-xl ${isPrint ? 'border border-slate-300' : 'bg-white border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500'}`}>
                                        {isPrint ? (
                                            <p className="text-sm font-bold leading-relaxed italic text-slate-800 whitespace-pre-wrap">{noteFinali || 'Nessuna nota strategica.'}</p>
                                        ) : (
                                            <textarea 
                                                value={noteFinali} 
                                                onChange={(e) => setNoteFinali(e.target.value)}
                                                placeholder="Scrivi qui considerazioni, criticità del cantiere o appunti per la direzione lavori..."
                                                className="w-full min-h-[120px] bg-transparent border-none outline-none focus:ring-0 resize-none text-sm font-bold leading-relaxed italic text-slate-700 custom-scrollbar"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* --- PAGINA 2+: COMPUTO ESTIMATIVO DETTAGLIATO (SOLO IN PDF) --- */}
                {isPrint && (
                    <div className="w-full mt-10" style={{ pageBreakBefore: 'always' }}>
                        <div className="mb-6 pb-2 pt-10 border-b-2 border-slate-800"><h3 className="text-2xl font-black uppercase text-black">Computo Metrico Estimativo - Dettaglio Offerta</h3></div>
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="border-b-2 border-slate-800">
                                <tr><th className="py-3 px-2 font-black uppercase text-black">Voce</th><th className="py-3 px-2 text-center font-black uppercase text-black">U.M.</th><th className="py-3 px-2 text-center font-black uppercase text-black">Q.tà</th><th className="py-3 px-2 text-right font-black uppercase text-black">P. Bando</th><th className="py-3 px-2 text-right font-black uppercase text-black bg-slate-100">P. Offerta</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300">
                                {risultatoEconomico.righe.map(r => (
                                    <tr key={r.id} className="break-inside-avoid">
                                        <td className="py-3 px-2 align-top"><div className="font-black text-[9px] text-slate-500">{r.codice}</div><div className="font-bold text-black">{r.descrizione}</div></td>
                                        <td className="py-3 px-2 text-center text-black uppercase align-top">{r.unitaMisura}</td>
                                        <td className="py-3 px-2 text-center font-black text-black align-top">{(parseNum(r.quantita)*(parseNum(r.numeroInterventi)||1)).toLocaleString('it-IT')}</td>
                                        <td className="py-3 px-2 text-right text-slate-700 align-top">€ {parseNum(r.prezzoGaraOriginale).toLocaleString('it-IT',{minimumFractionDigits:2})}</td>
                                        <td className="py-3 px-2 text-right font-black text-black bg-slate-50/50 align-top">€ {parseNum(r.prezzoVenditaUnitario).toLocaleString('it-IT',{minimumFractionDigits:2})}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!isPrint && (
                    <div className="mt-10 flex justify-center gap-4">
                        <button onClick={onBack} className="px-6 py-4 bg-slate-100 rounded-xl font-bold flex items-center gap-2"><ArrowLeftIcon className="h-5 w-5" /> Indietro</button>
                        <button 
                            onClick={() => onArchivia(noteFinali)} 
                            disabled={isSaving} 
                            className="px-10 py-4 bg-emerald-600 text-white rounded-xl font-black shadow-lg flex items-center gap-3"
                        >
                            {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : <><CheckCircleIcon className="h-6 w-6" /> Archivia Definitiva</>}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <div className="print:hidden">{renderContent(false)}</div>
            {typeof window !== 'undefined' && createPortal(
                <div id="print-portal" className="hidden print:block w-full bg-white text-black min-h-screen">
                    <style>{`
                        @media print {
                            @page { size: A4 portrait; margin: 10mm; }
                            body { margin: 0 !important; padding: 0 !important; background-color: white !important; }
                            body > div:not(#print-portal) { display: none !important; }
                            #print-portal { display: block !important; position: relative !important; width: 100% !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; height: auto !important; }
                            table { page-break-inside: auto; width: 100%; border-collapse: collapse; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                            thead { display: table-header-group; }
                            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        }
                    `}</style>
                    {renderContent(true)}
                </div>,
                document.body
            )}
        </>
    );
};