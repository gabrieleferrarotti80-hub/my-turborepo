// packages/shared-ui/components/PreventivoBuilder/SimulatoreFabbisogniView.jsx

import React, { useMemo } from 'react';
import { 
    UserGroupIcon, WrenchScrewdriverIcon, KeyIcon, ArchiveBoxIcon, 
    BuildingOfficeIcon, TrashIcon, PresentationChartBarIcon, BanknotesIcon, MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const parseNum = (val) => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (val === null || val === undefined || val === '') return 0;
    let str = val.toString();
    if (str.includes('.') && str.includes(',')) { str = str.replace(/\./g, '').replace(',', '.'); } 
    else if (str.includes(',') && !str.includes('.')) { str = str.replace(',', '.'); }
    const parsed = parseFloat(str); return isNaN(parsed) ? 0 : parsed;
};

// 🌟 AGGIUNTA PROPS onCategoryClick 🌟
export const SimulatoreFabbisogniView = ({ righe = [], onCategoryClick }) => {
    
    const fabbisogni = useMemo(() => {
        const aggregato = { manodopera: {}, attrezzature: {}, noli: {}, subappalti: {}, materiali: {}, smaltimenti: {} };

        righe.forEach(riga => {
            if (!riga.analisiCosti) return;
            const moltiplicatoreInterventi = parseNum(riga.numeroInterventi) || 1;

            const aggiungiVoci = (categoria, arrayVoci, isManodopera = false) => {
                (arrayVoci || []).forEach(voce => {
                    const rawDesc = voce.descrizione || 'Voce senza nome';
                    const descKey = rawDesc.trim().toUpperCase();
                    const costoUnitario = parseNum(voce.costoUnitario);
                    let quantitaRealeNecessaria = parseNum(voce.quantita) * moltiplicatoreInterventi;
                    
                    if (isManodopera) {
                        const numPersone = voce.numeroPersone !== undefined && voce.numeroPersone !== '' ? parseNum(voce.numeroPersone) : 1;
                        quantitaRealeNecessaria = quantitaRealeNecessaria * numPersone;
                    }
                    const costoTotale = quantitaRealeNecessaria * costoUnitario;
                    if (!aggregato[categoria][descKey]) {
                        aggregato[categoria][descKey] = { descrizioneOriginale: rawDesc, quantitaTotale: 0, costoTotale: 0, unitaMisura: isManodopera ? 'ore' : (voce.unitaMisura || '') };
                    }
                    aggregato[categoria][descKey].quantitaTotale += quantitaRealeNecessaria;
                    aggregato[categoria][descKey].costoTotale += costoTotale;
                });
            };

            aggiungiVoci('manodopera', riga.analisiCosti.manodopera, true);
            aggiungiVoci('attrezzature', riga.analisiCosti.attrezzature);
            aggiungiVoci('attrezzature', riga.analisiCosti.mezzi); 
            aggiungiVoci('noli', riga.analisiCosti.noli);
            aggiungiVoci('subappalti', riga.analisiCosti.subappalti);
            aggiungiVoci('materiali', riga.analisiCosti.materiali);
            aggiungiVoci('smaltimenti', riga.analisiCosti.smaltimenti);
        });

        const formattaEOrdina = (obj) => Object.values(obj).sort((a, b) => b.costoTotale - a.costoTotale);

        return {
            manodopera: formattaEOrdina(aggregato.manodopera), attrezzature: formattaEOrdina(aggregato.attrezzature),
            noli: formattaEOrdina(aggregato.noli), subappalti: formattaEOrdina(aggregato.subappalti),
            materiali: formattaEOrdina(aggregato.materiali), smaltimenti: formattaEOrdina(aggregato.smaltimenti),
        };
    }, [righe]);

    const totaliPerCategoria = useMemo(() => {
        return {
            manodopera: fabbisogni.manodopera.reduce((acc, c) => acc + c.costoTotale, 0),
            materiali: fabbisogni.materiali.reduce((acc, c) => acc + c.costoTotale, 0),
            attrezzature: fabbisogni.attrezzature.reduce((acc, c) => acc + c.costoTotale, 0),
            noli: fabbisogni.noli.reduce((acc, c) => acc + c.costoTotale, 0),
            subappalti: fabbisogni.subappalti.reduce((acc, c) => acc + c.costoTotale, 0),
            smaltimenti: fabbisogni.smaltimenti.reduce((acc, c) => acc + c.costoTotale, 0),
        };
    }, [fabbisogni]);

    const costoVivoGlobale = Object.values(totaliPerCategoria).reduce((a, b) => a + b, 0);

    // 🌟 AGGIUNTA CHIAVE DI CATEGORIA AL COMPONENTE CARD 🌟
    const CategoriaCard = ({ titolo, icona: Icon, colorTheme, data, catKey }) => {
        if (!data || data.length === 0) return null;
        const totaleCategoria = data.reduce((acc, curr) => acc + curr.costoTotale, 0);

        return (
            <div className={`bg-white rounded-3xl border border-${colorTheme}-200 shadow-sm overflow-hidden animate-fade-in-up`}>
                <div className={`bg-${colorTheme}-50 p-5 border-b border-${colorTheme}-100 flex justify-between items-center`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 bg-white rounded-xl shadow-sm text-${colorTheme}-600`}>
                            <Icon className="h-6 w-6 stroke-2" />
                        </div>
                        <h3 className={`text-xl font-black text-${colorTheme}-900`}>{titolo}</h3>
                    </div>
                    
                    {/* 🌟 BOTTONE E TOTALI 🌟 */}
                    <div className="flex items-center gap-4">
                        <div className="text-right border-r border-[rgba(0,0,0,0.1)] pr-4">
                            <p className={`text-[10px] font-black text-${colorTheme}-600 uppercase tracking-widest`}>Costo Previsto</p>
                            <p className={`text-2xl font-black text-${colorTheme}-700`}>€ {totaleCategoria.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                        <button 
                            onClick={() => onCategoryClick(catKey)}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-${colorTheme}-200 text-${colorTheme}-600 hover:bg-${colorTheme}-600 hover:text-white transition-colors shadow-sm cursor-pointer group`}
                            title="Visualizza nel Computo Estimo"
                        >
                            <MagnifyingGlassIcon className="h-5 w-5 mb-0.5" />
                            <span className="text-[8px] font-black uppercase">Vedi Voci</span>
                        </button>
                    </div>
                </div>
                <div className="p-0">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase">Voce Richiesta</th>
                                <th className="px-5 py-3 text-center text-[10px] font-black text-slate-500 uppercase">Q.tà Totale</th>
                                <th className="px-5 py-3 text-right text-[10px] font-black text-slate-500 uppercase">Importo Totale</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3.5"><p className="text-sm font-bold text-slate-800">{item.descrizioneOriginale}</p></td>
                                    <td className="px-5 py-3.5 text-center">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-sm">
                                            {item.quantitaTotale.toLocaleString('it-IT', {maximumFractionDigits: 2})} <span className="text-[10px] text-slate-400">{item.unitaMisura}</span>
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-right font-black text-slate-700">€ {item.costoTotale.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // Il resto del rendering resta identico, passiamo solo la prop catKey ai componenti:
    const hasData = Object.values(fabbisogni).some(arr => arr.length > 0);

    if (!hasData) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm mt-6">
                <PresentationChartBarIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-black text-slate-700">Nessun fabbisogno calcolato</h3>
                <p className="text-slate-500 mt-2">Apri le righe del computo ed elabora le "Analisi Costi" per generare la lista della spesa.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 mt-6">
            <div className="bg-slate-900 p-6 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-center text-white gap-4">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-3"><PresentationChartBarIcon className="h-8 w-8 text-sky-400" /> Lista Fabbisogni di Cantiere</h2>
                    <p className="text-slate-400 mt-1 text-sm font-medium">Sintesi delle risorse necessarie estratte dal computo</p>
                </div>
                <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/10 text-right">
                    <p className="text-[10px] font-black text-sky-300 uppercase tracking-widest">Budget Totale Costi Vivi</p>
                    <p className="text-3xl font-black text-white">€ {costoVivoGlobale.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <BanknotesIcon className="h-5 w-5 text-slate-400" />
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Riepilogo Incidenze per Categoria</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                        { label: 'Manodopera', val: totaliPerCategoria.manodopera, color: 'orange' },
                        { label: 'Materiali', val: totaliPerCategoria.materiali, color: 'sky' },
                        { label: 'Mezzi/Attr.', val: totaliPerCategoria.attrezzature, color: 'emerald' },
                        { label: 'Noli', val: totaliPerCategoria.noli, color: 'fuchsia' },
                        { label: 'Subappalti', val: totaliPerCategoria.subappalti, color: 'indigo' },
                        { label: 'Smaltimenti', val: totaliPerCategoria.smaltimenti, color: 'stone' },
                    ].map((cat, i) => (
                        <div key={i} className={`p-4 rounded-2xl bg-${cat.color}-50 border border-${cat.color}-100 transition-all hover:shadow-md`}>
                            <p className={`text-[10px] font-black text-${cat.color}-600 uppercase mb-1`}>{cat.label}</p>
                            <p className={`text-lg font-black text-${cat.color}-900`}>€ {cat.val.toLocaleString('it-IT', {maximumFractionDigits: 0})}</p>
                            <div className="mt-2 w-full h-1.5 bg-white rounded-full overflow-hidden">
                                <div className={`h-full bg-${cat.color}-500`} style={{ width: `${costoVivoGlobale > 0 ? (cat.val / costoVivoGlobale) * 100 : 0}%` }} />
                            </div>
                            <p className={`text-[9px] font-bold text-${cat.color}-400 mt-1`}>{costoVivoGlobale > 0 ? ((cat.val / costoVivoGlobale) * 100).toFixed(1) : 0}% del totale</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <CategoriaCard titolo="Manodopera Prevista" icona={UserGroupIcon} colorTheme="orange" data={fabbisogni.manodopera} catKey="manodopera" />
                <CategoriaCard titolo="Materiali da Acquistare" icona={ArchiveBoxIcon} colorTheme="sky" data={fabbisogni.materiali} catKey="materiali" />
                <CategoriaCard titolo="Mezzi e Attrezzature Aziendali" icona={WrenchScrewdriverIcon} colorTheme="emerald" data={fabbisogni.attrezzature} catKey="attrezzature" />
                <CategoriaCard titolo="Noli Esterni" icona={KeyIcon} colorTheme="fuchsia" data={fabbisogni.noli} catKey="noli" />
                <CategoriaCard titolo="Subappalti e Lavorazioni" icona={BuildingOfficeIcon} colorTheme="indigo" data={fabbisogni.subappalti} catKey="subappalti" />
                <CategoriaCard titolo="Oneri di Discarica" icona={TrashIcon} colorTheme="stone" data={fabbisogni.smaltimenti} catKey="smaltimenti" />
            </div>
        </div>
    );
};