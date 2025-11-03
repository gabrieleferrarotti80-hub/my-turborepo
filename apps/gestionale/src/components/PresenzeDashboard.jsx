// File: apps/gestionale/src/components/PresenzeDashboard.jsx

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, ArrowDownTrayIcon, ArrowPathIcon, CheckIcon } from '@heroicons/react/24/solid';
import * as XLSX from 'xlsx';

// --- (Funzioni di utilità invariate) ---
const getDaysInMonth = (year, month) => {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return days;
};

const toLocalDayString = (ts) => {
    const date = ts?.toDate ? ts.toDate() : ts;
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const calcolaOreLavoro = (inizio, fine) => {
    if (!inizio || !fine) return 0;
    const inizioDate = inizio?.toDate ? inizio.toDate() : inizio;
    const fineDate = fine?.toDate ? fine.toDate() : fine;
    const inizioMs = inizioDate.getTime();
    const fineMs = fineDate.getTime();
    return (fineMs - inizioMs) / (1000 * 60 * 60);
};

// --- Componente Principale ---

export const PresenzeDashboard = ({ 
    users, 
    presenze, 
    segnalazioniErrori,
    companyID, 
    onBack, 
    adminUser,
    saveGridChanges,
    isSaving 
}) => {
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [righe, setRighe] = useState([]);
    const [isDirty, setIsDirty] = useState(false); 
    const scrollContainerRef = useRef(null); 

    // --- 'useMemo' AGGIORNATO PER REAL-TIME ---
    const { giorniDelMese, righeIniziali } = useMemo(() => {
        
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        
        const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
        const prevYear = prevMonthDate.getFullYear();
        const prevMonth = prevMonthDate.getMonth();

        const dipendenti = users.filter(
            u => u.companyID === companyID && 
                 u.ruolo !== 'titolare-azienda' && 
                 u.ruolo !== 'proprietario'
        ).sort((a, b) => a.cognome.localeCompare(b.cognome));

        const giorniMesePrecedente = getDaysInMonth(prevYear, prevMonth);
        const giorniMeseCorrente = getDaysInMonth(currentYear, currentMonth);
        const giorni = [...giorniMesePrecedente, ...giorniMeseCorrente]; 

        const segnalazioniMap = new Map();
        for (const s of segnalazioniErrori) {
            if (s.companyID !== companyID || !s.userId) continue;
            const sDate = s.dataRiferimento;
            if (!sDate) continue;

            const pYear = sDate.getFullYear();
            const pMonth = sDate.getMonth();

            const isInCurrentMonth = (pYear === currentYear && pMonth === currentMonth);
            const isInPrevMonth = (pYear === prevYear && pMonth === prevMonth);

            if (!isInCurrentMonth && !isInPrevMonth) continue;

            const userId = s.userId;
            const giornoString = toLocalDayString(sDate);
            if (!segnalazioniMap.has(userId)) {
                segnalazioniMap.set(userId, new Map());
            }
            segnalazioniMap.get(userId).set(giornoString, s.nota || "Errore segnalato");
        }

        const presenzeMap = new Map();
        for (const p of presenze) {
            if (p.companyID !== companyID || !p.userId) continue;
            const userId = p.userId;
            
            if (!presenzeMap.has(userId)) {
                presenzeMap.set(userId, new Map());
            }
            const userMap = presenzeMap.get(userId);
            
            const pDateTs = p.timestampInizio || (p.stato !== 'lavoro' ? p.dataRiferimento : null);
            if (!pDateTs) continue;
            
            const pDate = pDateTs.toDate ? pDateTs.toDate() : pDateTs;
            const pYear = pDate.getFullYear();
            const pMonth = pDate.getMonth();

            const isInCurrentMonth = (pYear === currentYear && pMonth === currentMonth);
            const isInPrevMonth = (pYear === prevYear && pMonth === prevMonth);

            if (p.stato === 'lavoro') {
                if (!p.timestampInizio) continue; // Ci serve almeno l'inizio

                if (p.timestampFine) {
                    // --- 1A. Logica per Lavoro CONCLUSO ---
                    if (!isInCurrentMonth && !isInPrevMonth) continue;
                    
                    const giornoString = toLocalDayString(pDate);
                    const ore = calcolaOreLavoro(p.timestampInizio, p.timestampFine);
                    const oreEsistenti = userMap.get(giornoString)?.ore || 0;
                    const newOre = oreEsistenti + ore;
                    userMap.set(giornoString, { type: 'lavoro', ore: newOre, docId: p.id });

                } else {
                    // --- 1B. Logica per Lavoro IN CORSO ---
                    if (!isInCurrentMonth && !isInPrevMonth) continue;

                    const giornoString = toLocalDayString(pDate);
                    const cellaEsistente = userMap.get(giornoString);

                    if (!cellaEsistente || cellaEsistente.type !== 'lavoro') {
                        userMap.set(giornoString, { 
                            type: 'lavoro_in_corso', 
                            ore: 0, // Placeholder '0'
                            docId: p.id, 
                            isInProgress: true 
                        });
                    }
                }
            
            // --- BLOCCO MALATTIA/INFORTUNIO (con logica real-time) ---
            } else if (p.stato === 'malattia' || p.stato === 'infortunio') {
                if (!p.timestampInizio) continue;
                
                const startTs = p.timestampInizio;
                const endTs = p.timestampFine || p.dataFinePrevista; 

                if (!endTs) {
                    // È in corso!
                    const startDate = startTs.toDate ? startTs.toDate() : startTs;
                    const startYear = startDate.getFullYear();
                    const startMonth = startDate.getMonth();
                    
                    const isInCurrent = (startYear === currentYear && startMonth === currentMonth);
                    const isInPrev = (startYear === prevYear && startMonth === prevMonth);

                    if (isInCurrent || isInPrev) {
                        const giornoString = toLocalDayString(startDate);
                        const cellaEsistente = userMap.get(giornoString);
                        if (!cellaEsistente || cellaEsistente.type !== 'lavoro') {
                            userMap.set(giornoString, { type: p.stato, ore: 0, docId: p.id, isInProgress: true });
                        }
                    }
                } else {
                    // Logica storica per eventi conclusi
                    const startDate = startTs.toDate ? startTs.toDate() : startTs;
                    const endDate = endTs.toDate ? endTs.toDate() : endTs;
                    let loopDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

                    while (loopDate <= endDate) {
                        const loopYear = loopDate.getFullYear();
                        const loopMonth = loopDate.getMonth();
                        const isInCurrent = (loopYear === currentYear && loopMonth === currentMonth);
                        const isInPrev = (loopYear === prevYear && loopMonth === prevMonth);

                        if (isInCurrent || isInPrev) {
                            const giornoString = toLocalDayString(loopDate);
                            const cellaEsistente = userMap.get(giornoString);
                            if (!cellaEsistente || cellaEsistente.type !== 'lavoro') {
                                userMap.set(giornoString, { type: p.stato, ore: 0, docId: p.id });
                            }
                        }
                        loopDate.setDate(loopDate.getDate() + 1);
                    }
                }
            
            // --- BLOCCO PIOGGIA (con logica real-time) ---
            } else if (p.stato === 'pioggia') {
                if (!p.timestampInizio) continue; 
                if (!isInCurrentMonth && !isInPrevMonth) continue;
                
                const giornoString = toLocalDayString(pDate);
                const cellaEsistente = userMap.get(giornoString);
                
                if (!cellaEsistente || cellaEsistente.type !== 'lavoro') {
                    userMap.set(giornoString, { 
                        type: 'pioggia', 
                        ore: 0, 
                        docId: p.id, 
                        chiusuraAutomatica: p.chiusuraAutomatica || false,
                        isInProgress: !p.timestampFine
                    });
                }
            }
        }

        // --- 5. Costruisci le righe (con flag real-time) ---
        const righe = dipendenti.map(user => {
            let totaleOreLavoro = 0; 
            let totaleGiorniMalattia = 0;
            let totaleGiorniInfortunio = 0;
            let totaleGiorniPioggia = 0;

            const celleGiorni = giorni.map(giorno => {
                const giornoString = toLocalDayString(giorno);
                const cellData = presenzeMap.get(user.id)?.get(giornoString); 
                const erroreNota = segnalazioniMap.get(user.id)?.get(giornoString);
                
                const cellaBase = {
                    docId: cellData?.docId || null,
                    isModified: false,
                    giornoString: giornoString,
                    erroreNota: erroreNota || null
                };

                if (cellData === undefined) {
                    return { ...cellaBase, display: 'N/D', type: 'nd', ore: 0 };
                }
                
                if (cellData.type === 'lavoro') {
                    totaleOreLavoro += cellData.ore;
                    return { ...cellaBase, display: cellData.ore.toFixed(1), type: 'lavoro', ore: cellData.ore };
                
                } else if (cellData.type === 'lavoro_in_corso') {
                    return { ...cellaBase, display: '0', type: 'lavoro_in_corso', ore: 0, isInProgress: true };

                } else if (cellData.type === 'malattia') {
                    totaleGiorniMalattia += 1;
                    return { ...cellaBase, display: 'M', type: 'malattia', ore: 0, isInProgress: cellData.isInProgress };
                
                } else if (cellData.type === 'infortunio') {
                    totaleGiorniInfortunio += 1;
                    return { ...cellaBase, display: 'I', type: 'infortunio', ore: 0, isInProgress: cellData.isInProgress };
                
                } else if (cellData.type === 'pioggia') {
                    totaleGiorniPioggia += 1;
                    return { ...cellaBase, display: 'P', type: 'pioggia', ore: 0, chiusuraAutomatica: cellData.chiusuraAutomatica, isInProgress: cellData.isInProgress };
                }
                
                return { ...cellaBase, display: 'N/D', type: 'nd', ore: 0 };
            });

            return {
                id: user.id,
                nomeCompleto: `${user.cognome} ${user.nome}`,
                giorni: celleGiorni,
                totaleOre: totaleOreLavoro,
                totaleMalattia: totaleGiorniMalattia,
                totaleInfortunio: totaleGiorniInfortunio,
                totalePioggia: totaleGiorniPioggia
            };
        });

        return { 
            giorniDelMese: giorni,
            righeIniziali: righe 
        };

    }, [currentDate, users, presenze, companyID, segnalazioniErrori]);

    // --- useEffect (con SCROLL e setTimeout) ---
    useEffect(() => {
        setRighe(righeIniziali);
        setIsDirty(false);

        const scrollTimer = setTimeout(() => {
            if (scrollContainerRef.current && giorniDelMese.length > 0) {
                const todayString = toLocalDayString(new Date());
                const todayIndex = giorniDelMese.findIndex(g => toLocalDayString(g) === todayString);

                if (todayIndex !== -1) {
                    const headers = scrollContainerRef.current.querySelectorAll('thead th');
                    const todayHeader = headers[todayIndex + 1]; 

                    if (todayHeader) {
                        todayHeader.scrollIntoView({
                            behavior: 'smooth',
                            inline: 'center', 
                            block: 'nearest'
                        });
                    }
                }
            }
        }, 100); 

        return () => clearTimeout(scrollTimer);

    }, [righeIniziali, giorniDelMese]);

    // --- handleCellChange (AGGIORNATO per 'P') ---
    const handleCellChange = (rigaIndex, giornoIndex, newValue) => {
        let validValue = newValue.toUpperCase().replace(/\s/g, ''); 
        if (validValue !== 'M' && validValue !== 'I' && validValue !== 'P' && validValue !== 'N/D' && validValue !== '') {
            validValue = validValue.replace(/[^0-9.]/g, '');
        }
        if (validValue === '') {
            validValue = 'N/D';
        }
        setRighe(prevRighe => {
            const nuoveRighe = prevRighe.map(r => ({ ...r, giorni: r.giorni.map(g => ({...g})) }));
            const cella = nuoveRighe[rigaIndex].giorni[giornoIndex];
            cella.display = validValue;
            cella.isModified = true;
            let totOre = 0;
            let totM = 0;
            let totI = 0;
            let totP = 0;
            nuoveRighe[rigaIndex].giorni.forEach(g => {
                if (g.display === 'M') totM++;
                else if (g.display === 'I') totI++;
                else if (g.display === 'P') totP++;
                else if (g.type === 'lavoro_in_corso') { /* Non contare '0' nel totale */ }
                else if (!isNaN(parseFloat(g.display))) totOre += parseFloat(g.display);
            });
            nuoveRighe[rigaIndex].totaleOre = totOre;
            nuoveRighe[rigaIndex].totaleMalattia = totM;
            nuoveRighe[rigaIndex].totaleInfortunio = totI;
            nuoveRighe[rigaIndex].totalePioggia = totP;
            return nuoveRighe;
        });
        setIsDirty(true);
    };

    // --- handleSave (invariato) ---
    const handleSave = async () => {
        if (!isDirty || isSaving) return;
        const changesToSave = [];
        righe.forEach(riga => {
            riga.giorni.forEach(cella => {
                if (cella.isModified) {
                    changesToSave.push({
                        userId: riga.id,
                        userNome: riga.nomeCompleto,
                        giornoString: cella.giornoString,
                        newValue: cella.display,
                        originalDocId: cella.docId
                    });
                }
            });
        });
        if (changesToSave.length === 0) {
            setIsDirty(false);
            return;
        }
        const result = await saveGridChanges(changesToSave, adminUser.id, companyID, currentDate);
        if (result.success) {
            setIsDirty(false);
            alert("Modifiche salvate con successo!");
        } else {
            alert("Errore duringo il salvataggio: " + result.message);
        }
    };

    // --- handleExportExcel (AGGIORNATO per 'Tot. Pioggia') ---
    const handleExportExcel = () => {
        const headers = ["Dipendente", ...giorniDelMese.map(g => g.getDate().toString()), "Totale Ore Lavoro", "Tot. Malattia (gg)", "Tot. Infortunio (gg)", "Tot. Pioggia (gg)"];
        const dataRows = righe.map(riga => [
            riga.nomeCompleto,
            ...riga.giorni.map(cella => cella.display),
            riga.totaleOre.toFixed(1),
            riga.totaleMalattia,
            riga.totaleInfortunio,
            riga.totalePioggia
        ]);
        const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
        const colWidths = [{ wch: 30 }, ...giorniDelMese.map(() => ({ wch: 4 })), { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
        ws['!cols'] = colWidths;
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Presenze Mese");
        const meseAnno = currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
        const fileName = `presenze_${meseAnno.replace(' ', '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };
    
    // --- cambiaMese (invariato) ---
    const cambiaMese = (incremento) => {
        if (isDirty && !window.confirm("Hai modifiche non salvate. Sei sicuro di voler cambiare mese?")) {
            return;
        }
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + incremento, 1));
    };

    // Stili
    const stickyRightBase = "sticky bg-gray-50 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider z-10";
    const stickyRightCellBase = "sticky bg-white hover:bg-gray-50 px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right z-10";
    
    // --- JSX RENDER ---
    return (
        <div className="bg-white p-6 rounded-2xl shadow-xl animate-fade-in">
            {/* --- Header (invariato) --- */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                        <ArrowLeftIcon className="h-4 w-4" />
                        Indietro
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">Dashboard Presenze</h1>
                </div>
                
                <div className="flex items-center gap-3 mt-4 md:mt-0">
                    <button 
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                        Esporta
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={!isDirty || isSaving}
                        className={`
                            flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors
                            ${isSaving ? 'bg-gray-400' : ''}
                            ${!isDirty && !isSaving ? 'bg-gray-400 opacity-50 cursor-not-allowed' : ''}
                            ${isDirty && !isSaving ? 'bg-blue-600 hover:bg-blue-700 animate-pulse' : ''}
                        `}
                    >
                        {isSaving ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <CheckIcon className="h-5 w-5" />}
                        {isSaving ? 'Salvataggio...' : 'Salva Modifiche'}
                    </button>
                    <button onClick={() => cambiaMese(-1)} className="p-2 rounded-md hover:bg-gray-100" disabled={isSaving}>
                        <ChevronLeftIcon className="h-6 w-6 text-gray-600" />
                    </button>
                    <span className="text-xl font-semibold text-gray-700 w-48 text-center capitalize">
                        {currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => cambiaMese(1)} className="p-2 rounded-md hover:bg-gray-100" disabled={isSaving}>
                        <ChevronRightIcon className="h-6 w-6 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* --- Tabella (AGGIORNATA per ref e bordi) --- */}
            {righe.length > 0 ? (
                <div ref={scrollContainerRef} className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">
                                    Dipendente
                                </th>
                                {giorniDelMese.map((giorno, index) => (
                                   <th key={toLocalDayString(giorno)} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200">
                                        {giorno.getDate() === 1 && (
                                            <span className="block text-indigo-600 pb-1">
                                                {giorno.toLocaleString('it-IT', { month: 'short' })}
                                            </span>
                                        )}
                                        {giorno.getDate()}
                                    </th>
                                ))}
                                <th className={`${stickyRightBase} right-[300px] border-l border-gray-200`}>Totale Ore</th>
                                <th className={`${stickyRightBase} right-[200px] border-l border-gray-200`}>Tot. Malattia</th>
                                <th className={`${stickyRightBase} right-[100px] border-l border-gray-200`}>Tot. Infortunio</th>
                                <th className={`${stickyRightBase} right-0 border-l border-gray-200`}>Tot. Pioggia</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {righe.map((riga, rigaIndex) => (
                                <tr key={riga.id} className="hover:bg-gray-50">
                                    <td className="sticky left-0 bg-white hover:bg-gray-50 px-6 py-4 whitespace-nowGrap text-sm font-medium text-gray-900 z-10">
                                        {riga.nomeCompleto}
                                    </td>
                                    
                                    {riga.giorni.map((cella, giornoIndex) => (
                                      <td key={cella.giornoString} className="p-0 border-l border-gray-200">
                                            <input 
                                                type="text"
                                                value={cella.display}
                                                onChange={(e) => handleCellChange(rigaIndex, giornoIndex, e.target.value)}
                                                title={cella.erroreNota ? `ERRORE SEGNALATO: ${cella.erroreNota}` : ''}
                                                className={`
                                                    w-12 p-1 m-1 text-center text-sm border
                                                    ${cella.isModified ? 'border-blue-500 bg-blue-50' : 'border-transparent'}
                                                    ${cella.display === 'N/D' ? 'text-gray-300' : ''}
                                                    ${cella.display === 'M' ? 'font-bold text-blue-700' : ''}
                                                    ${cella.display === 'I' ? 'font-bold text-yellow-700' : ''}
                                                    ${cella.display === 'P' ? `font-bold ${cella.chiusuraAutomatica ? 'text-green-600' : 'text-blue-600'}` : ''}
                                                    ${!isNaN(parseFloat(cella.display)) ? 'text-gray-800' : ''}
                                                    ${cella.type === 'lavoro_in_corso' ? 'text-gray-400' : ''}
                                                    ${cella.erroreNota ? 'bg-red-600 text-white font-bold' : ''}
                                                    ${cella.isInProgress ? 'animate-pulse' : ''}
                                                `}
                                                disabled={isSaving}
                                            />
                                        </td>
                                    ))}
                                    
                                    <td className={`${stickyRightCellBase} right-[300px] border-l border-gray-200`}>
                                        {riga.totaleOre.toFixed(1)}
                                    </td>
                                    <td className={`${stickyRightCellBase} right-[200px] border-l border-gray-200`}>
                                        {riga.totaleMalattia}
                                    </td>
                                    <td className={`${stickyRightCellBase} right-[100px] border-l border-gray-200`}>
                                        {riga.totaleInfortunio}
                                    </td>
                                    <td className={`${stickyRightCellBase} right-0 border-l border-gray-200`}>
                                        {riga.totalePioggia}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-center text-gray-500 py-8">Nessun dipendente trovato per questa azienda o nessuna presenza registrata per i mesi selezionati.</p>
            )}
        </div>
    );
};