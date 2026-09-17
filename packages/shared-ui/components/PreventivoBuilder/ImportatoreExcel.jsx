// packages/shared-ui/components/PreventivoBuilder/ImportatoreExcel.jsx

import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
    XMarkIcon, BoltIcon, TableCellsIcon, SparklesIcon,
    DocumentArrowUpIcon, BeakerIcon 
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

export const ImportatoreExcel = ({ 
    isOpen, 
    onClose, 
    onImportSuccess, 
    listinoDb, 
    storicoBigData,
    parametriGlobali 
}) => {
    const fileInputRef = useRef(null);
    const [excelRows, setExcelRows] = useState([]); 
    const [mapConfig, setMapConfig] = useState({ 
        progressivo: -1, codice: 0, descrizione: 1, unitaMisura: 2, 
        quantita: 3, numeroInterventi: -1, prezzoOriginale: -1, 
        prezzoTotale: -1, prezzoSenzaManodopera: -1, incidenzaManodopera: -1
    });

    const puliziaEstrema = (str) => {
        if (!str) return '';
        return str.toString()
            .replace(/[^a-zA-Z0-9]/g, '')
            .toLowerCase()
            .replace(/[o]/g, '0')
            .replace(/[il]/g, '1');
    };

    const puliziaTesto = (str) => str ? str.toString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 35) : '';
    
    const pulisciPrezzo = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return parseFloat(val.toString().replace(/\./g, '').replace(',', '.')) || 0;
    };

    const trovaMatch = (excelCodRaw, excelDescRaw) => {
        const exCod = puliziaEstrema(excelCodRaw);
        const exDesc = puliziaTesto(excelDescRaw);
        if (!exCod && !exDesc) return { master: null, storico: null };

        const exCore = exCod.length > 8 ? exCod.substring(6) : exCod;
        const exCoreNoSuffix = exCore.length > 3 ? exCore.slice(0, -1) : exCore;

        const valutaMatch = (item) => {
            const dbCod = item.codicePulito; 
            const dbDesc = item.descrizionePulita;
            let score = 0;

            if (exCod && dbCod) {
                const dbCore = dbCod.length > 8 ? dbCod.substring(6) : dbCod;
                const dbCoreNoSuffix = dbCore.length > 3 ? dbCore.slice(0, -1) : dbCore;

                if (dbCod === exCod) score += 100;
                else if (exCore === dbCore) score += 90; 
                else if (exCoreNoSuffix === dbCoreNoSuffix) score += 85; 
                else if (exCod.startsWith(dbCod)) score += 70 + dbCod.length; 
                else if (dbCod.startsWith(exCod)) score += 70 + exCod.length; 
                else if (exCod.length >= 8 && dbCod.length >= 8 && exCod.includes(dbCod)) score += dbCod.length; 
                else if (exCod.length >= 8 && dbCod.length >= 8 && dbCod.includes(exCod)) score += exCod.length;
            }
            if (exDesc && dbDesc) {
                if (dbDesc === exDesc) score += 50;
                else if (exDesc.length > 15 && dbDesc.length > 15 && exDesc.includes(dbDesc)) score += 30;
                else if (exDesc.length > 15 && dbDesc.length > 15 && dbDesc.includes(exDesc)) score += 30;
            }
            return score;
        };

        let bestMaster = null, bestMasterScore = 0;
        listinoDb.forEach(item => {
            const score = valutaMatch(item);
            if (score > bestMasterScore && score >= 20) { bestMasterScore = score; bestMaster = item; }
        });

        let bestStorico = null, bestStoricoScore = 0;
        storicoBigData.forEach(item => {
            const score = valutaMatch(item);
            if (score > bestStoricoScore && score >= 20) { bestStoricoScore = score; bestStorico = item; }
        });

        if (bestMaster) return { master: bestMaster, storico: null };
        if (bestStorico) return { master: null, storico: bestStorico };
        return { master: null, storico: null };
    };

    const handleLeggiExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evento) => {
            const data = new Uint8Array(evento.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const righeGrezze = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
            const righePulite = righeGrezze.filter(r => r.length > 0 && r.some(cell => cell !== undefined && cell !== ''));
            setExcelRows(righePulite);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsArrayBuffer(file);
    };

    const confermaImportazione = () => {
        const nuoveRigheMatchate = [];
        excelRows.forEach((rigaExcel) => {
            const progressivoLetto = mapConfig.progressivo >= 0 ? rigaExcel[mapConfig.progressivo]?.toString().trim() : '';
            let prezzoOriginaleLetto = mapConfig.prezzoOriginale >= 0 ? pulisciPrezzo(rigaExcel[mapConfig.prezzoOriginale]) : 0;
            let prezzoTotaleLetto = mapConfig.prezzoTotale >= 0 ? pulisciPrezzo(rigaExcel[mapConfig.prezzoTotale]) : 0;
            let prezzoSenzaManodoperaLetto = mapConfig.prezzoSenzaManodopera >= 0 ? pulisciPrezzo(rigaExcel[mapConfig.prezzoSenzaManodopera]) : 0;
            let incidenzaManodoperaLetta = mapConfig.incidenzaManodopera >= 0 ? pulisciPrezzo(rigaExcel[mapConfig.incidenzaManodopera]) : 0;
            const codiceLettoRaw = mapConfig.codice >= 0 ? rigaExcel[mapConfig.codice] : '';
            const descrizioneLettaRaw = mapConfig.descrizione >= 0 ? rigaExcel[mapConfig.descrizione] : '';
            const umLetta = mapConfig.unitaMisura >= 0 ? rigaExcel[mapConfig.unitaMisura]?.toString().trim() : '';
            let quantitaLetta = mapConfig.quantita >= 0 ? pulisciPrezzo(rigaExcel[mapConfig.quantita]) : 0;
            let interventiLetti = mapConfig.numeroInterventi >= 0 ? pulisciPrezzo(rigaExcel[mapConfig.numeroInterventi]) : 1;
            if (interventiLetti === 0) interventiLetti = 1;

            if ((codiceLettoRaw || descrizioneLettaRaw) && !isNaN(quantitaLetta) && quantitaLetta > 0) {
                const { master: voceMaster, storico: voceStorico } = trovaMatch(codiceLettoRaw, descrizioneLettaRaw);
                let costoBaseReale = 0, analisiCostiEreditata = null;

                if (voceMaster) {
                    if (!prezzoSenzaManodoperaLetto && voceMaster.prezzoPuro) prezzoSenzaManodoperaLetto = Number(voceMaster.prezzoPuro);
                    if (!incidenzaManodoperaLetta && voceMaster.incidenzaManodopera) incidenzaManodoperaLetta = Number(voceMaster.incidenzaManodopera);
                } else if (voceStorico) {
                    if (!prezzoSenzaManodoperaLetto && voceStorico.prezzoSenzaManodopera) prezzoSenzaManodoperaLetto = Number(voceStorico.prezzoSenzaManodopera);
                    if (!incidenzaManodoperaLetta && voceStorico.incidenzaManodopera) incidenzaManodoperaLetta = Number(voceStorico.incidenzaManodopera);
                    if (voceStorico.analisiCosti) { analisiCostiEreditata = voceStorico.analisiCosti; costoBaseReale = voceStorico.costoUnitarioDerivato || 0; }
                }

                let prezzoBandoReale = 0;
                if (prezzoOriginaleLetto > 0) prezzoBandoReale = prezzoOriginaleLetto;
                else if (prezzoTotaleLetto > 0) prezzoBandoReale = prezzoTotaleLetto / (quantitaLetta * (interventiLetti || 1));
                
                // 🌟 MATEMATICA BLINDATA INIZIALIZZAZIONE 🌟
                const costoTotale = costoBaseReale + (costoBaseReale * parametriGlobali.sg / 100) + (costoBaseReale * parametriGlobali.imprevisti / 100);
                
                let margineIniziale = parametriGlobali.utile;
                let prezzoVenditaIniziale = prezzoBandoReale;

                if (costoTotale > 0) {
                    if (prezzoBandoReale > 0) {
                        margineIniziale = ((prezzoBandoReale - costoTotale) / costoTotale) * 100;
                    } else {
                        // Se il bando è 0€ ma ho un costo recuperato (come nel tuo screen), genero il prezzo!
                        prezzoVenditaIniziale = costoTotale + (costoTotale * (margineIniziale / 100));
                    }
                }

                nuoveRigheMatchate.push({ 
                    id: (voceMaster || voceStorico ? 'match_' : 'nomatch_') + Date.now() + Math.random(), 
                    progressivo: progressivoLetto, prezzoGaraOriginale: prezzoBandoReale, prezzoSenzaManodopera: prezzoSenzaManodoperaLetto,
                    incidenzaManodopera: incidenzaManodoperaLetta, listinoRefId: voceMaster?.id || null, 
                    codice: voceMaster?.codice || codiceLettoRaw?.toString().trim() || '', descrizione: voceMaster?.descrizione || descrizioneLettaRaw?.toString() || 'Voce importata', 
                    unitaMisura: umLetta || voceMaster?.unitaMisura || 'cad', quantita: quantitaLetta, numeroInterventi: interventiLetti, 
                    costoUnitarioBase: costoBaseReale, scontoProposto: 0, 
                    marginePercentuale: margineIniziale, prezzoVenditaUnitario: prezzoVenditaIniziale, 
                    isMaster: voceMaster?.isMaster || false, masterId: voceMaster?.masterId || null, isFromBigData: !!voceStorico, analisiCosti: analisiCostiEreditata 
                });
            }
        });
        onImportSuccess(nuoveRigheMatchate);
        setExcelRows([]);
        onClose();
    };

    const headerCols = useMemo(() => {
        if (!excelRows.length) return [];
        return Array.from({ length: Math.max(...excelRows.slice(0, 10).map(r => r.length)) }, (_, i) => i);
    }, [excelRows]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            {excelRows.length === 0 ? (
                <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center animate-fade-in-down max-w-md w-full">
                    <DocumentArrowUpIcon className="h-16 w-16 text-indigo-500 mb-4" />
                    <h3 className="text-2xl font-black text-slate-800 mb-2">Importa Computo Excel</h3>
                    <p className="text-slate-500 mb-6 text-sm">Carica il file del bando per avviare il riconoscimento automatico e il matching euristico con i Master.</p>
                    <input type="file" accept=".xlsx, .xls, .csv" ref={fileInputRef} onChange={handleLeggiExcel} style={{ display: 'none' }} />
                    <div className="flex gap-3 w-full">
                        <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Annulla</button>
                        <button onClick={() => fileInputRef.current.click()} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-500 transition-colors flex justify-center items-center gap-2">
                            <DocumentArrowUpIcon className="h-5 w-5" /> Sfoglia
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white w-full max-w-7xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-down">
                    <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><SparklesIcon className="h-6 w-6 text-emerald-600" /> Riconoscimento Voci Bando</h3>
                            <p className="text-xs font-bold text-slate-500 mt-1">Confronto in corso con {listinoDb.length} voci DB e {storicoBigData.length} storici.</p>
                        </div>
                        <button onClick={() => { setExcelRows([]); onClose(); }} className="text-slate-400 hover:text-red-500"><XMarkIcon className="h-6 w-6" /></button>
                    </div>
                    <div className="overflow-x-auto p-0 flex-1 bg-slate-100">
                        <table className="min-w-full border-collapse">
                            <thead className="sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th colSpan={headerCols.length} className="p-3 border-b-2 border-slate-300 bg-slate-800 text-white text-sm font-black tracking-widest uppercase text-center border-r-4 border-r-slate-400">
                                        <TableCellsIcon className="h-5 w-5 inline-block mr-2" /> Dati Bando (Excel Originale)
                                    </th>
                                    <th className="p-3 border-b-2 border-indigo-400 bg-indigo-600 text-white text-sm font-black tracking-widest uppercase text-center w-[300px] shadow-inner">
                                        <SparklesIcon className="h-5 w-5 inline-block mr-2" /> Match Database
                                    </th>
                                </tr>
                                <tr className="bg-white">
                                    {headerCols.map((colIndex, idx) => (
                                        <th key={colIndex} className={`p-3 border-b border-slate-200 min-w-[150px] ${idx === headerCols.length - 1 ? 'border-r-4 border-r-slate-400' : 'border-r border-slate-200'}`}>
                                            <select
                                                className="w-full p-2 rounded-lg border border-slate-300 font-bold text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                                                value={Object.keys(mapConfig).find(key => mapConfig[key] === colIndex) || -1}
                                                onChange={(e) => {
                                                    const field = e.target.value;
                                                    const newMap = { ...mapConfig };
                                                    if (field !== '-1') {
                                                        Object.keys(newMap).forEach(k => { if (newMap[k] === colIndex) newMap[k] = -1; });
                                                        newMap[field] = colIndex;
                                                    } else {
                                                        const prevField = Object.keys(newMap).find(k => newMap[k] === colIndex);
                                                        if (prevField) newMap[prevField] = -1;
                                                    }
                                                    setMapConfig(newMap);
                                                }}
                                            >
                                                <option value="-1" className="text-slate-400">-- Ignora --</option>
                                                <option value="progressivo">📌 Progressivo</option>
                                                <option value="codice">🔑 Codice Articolo</option>
                                                <option value="descrizione">📝 Descrizione Bando</option>
                                                <option value="unitaMisura">📏 Unità di Misura</option>
                                                <option value="quantita">🔢 Quantità</option>
                                                <option value="numeroInterventi">🔄 N° Interventi</option>
                                                <option value="prezzoOriginale">🏛️ P. Unitario Bando</option>
                                                <option value="prezzoTotale">💰 P. Totale Bando</option>
                                                <option value="prezzoSenzaManodopera">🛠️ Prezzo Senza Manodopera</option>
                                                <option value="incidenzaManodopera">👷 Rapporto R.U. (Incidenza %)</option>
                                            </select>
                                        </th>
                                    ))}
                                    <th className="p-3 border-b border-indigo-200 bg-indigo-50 text-center">
                                        <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200">Risultato Ricerca</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {excelRows.slice(0, 5).map((riga, i) => {
                                    const codiceLettoRaw = mapConfig.codice >= 0 ? riga[mapConfig.codice] : '';
                                    const descrizioneLettaRaw = mapConfig.descrizione >= 0 ? riga[mapConfig.descrizione] : '';
                                    const { master: voceMaster, storico: voceStorico } = trovaMatch(codiceLettoRaw, descrizioneLettaRaw);

                                    return (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            {headerCols.map((colIndex, idx) => (
                                                <td key={colIndex} className={`p-3 border-b border-slate-100 text-sm text-slate-700 truncate max-w-[200px] ${idx === headerCols.length - 1 ? 'border-r-4 border-r-slate-400 bg-slate-50/50' : 'border-r border-slate-100'}`}>
                                                    {riga[colIndex] || <span className="text-slate-300">-</span>}
                                                </td>
                                            ))}
                                            <td className="p-3 border-b border-indigo-100 bg-indigo-50/30">
                                                {(voceMaster || voceStorico) ? (
                                                    <div className="flex flex-col gap-1.5 animate-fade-in">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black bg-indigo-200 text-indigo-900 px-1.5 py-0.5 rounded shadow-sm border border-indigo-300 uppercase" title={(voceMaster || voceStorico).codicePulito}>
                                                                DB: {(voceMaster || voceStorico).codice || (voceMaster || voceStorico).codiceOriginale}
                                                            </span>
                                                        </div>
                                                        <div className="bg-white border border-indigo-200 p-1.5 rounded-md shadow-sm">
                                                            {voceMaster ? (
                                                                <p className="text-[9px] font-bold text-indigo-500 uppercase flex items-center gap-1 mb-0.5"><StarIconSolid className="h-3 w-3 text-amber-500"/> Master Trovato</p>
                                                            ) : (
                                                                <p className="text-[9px] font-bold text-fuchsia-600 uppercase flex items-center gap-1 mb-0.5"><BeakerIcon className="h-3 w-3 text-fuchsia-500"/> Recupero da Storico</p>
                                                            )}
                                                            <p className="text-xs font-black text-slate-800 line-clamp-1">{(voceMaster || voceStorico).descrizione || (voceMaster || voceStorico).descrizioneOriginale}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center h-full">
                                                        {(codiceLettoRaw || descrizioneLettaRaw) ? <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded w-full text-center">Nessun Match</span> : <span className="text-[10px] font-medium text-slate-400 italic">In attesa...</span>}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-6 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
                        <button onClick={confermaImportazione} className="px-8 py-2.5 font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2"><BoltIcon className="h-5 w-5" /> Importa Gara e Avvia Analisi</button>
                    </div>
                </div>
            )}
        </div>
    );
};