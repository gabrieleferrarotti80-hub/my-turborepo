import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useFirebaseData } from 'shared-core'; 
import { 
    ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, 
    ArrowDownTrayIcon, ArrowPathIcon, CheckIcon, CalendarDaysIcon,
    InformationCircleIcon
} from '@heroicons/react/24/solid';
import * as XLSX from 'xlsx';

// --- Funzioni di utilità ---
const getInitials = (nomeCompleto) => {
    if (!nomeCompleto) return '👤';
    const parts = nomeCompleto.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0][0].toUpperCase();
};

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
    if (!(date instanceof Date)) return '';
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

export const PresenzeDashboard = ({ 
    users = [], presenze = [], segnalazioniErrori = [], companyID, 
    onBack, adminUser, saveGridChanges, isSaving 
}) => {
    
    // 🌟 SICUREZZA 100%: Peschiamo i dati direttamente dal context globale se i props sono vuoti
    const { data, companyID: contextCompanyID } = useFirebaseData();
    const effectiveCompanyID = companyID || contextCompanyID; 
    
    const safeUsers = (users && users.length > 0) ? users : (data?.users || []);
    const safePresenze = (presenze && presenze.length > 0) ? presenze : (data?.presenze || []);
    const safeSegnalazioni = (segnalazioniErrori && segnalazioniErrori.length > 0) ? segnalazioniErrori : (data?.segnalazioniErrori || []);
    const richiesteFerie = data?.richieste_ferie || [];

    const [currentDate, setCurrentDate] = useState(new Date());
    const [righe, setRighe] = useState([]);
    const [isDirty, setIsDirty] = useState(false); 
    const scrollContainerRef = useRef(null); 

    const { giorniDelMese, righeIniziali } = useMemo(() => {
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        
        const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
        const prevYear = prevMonthDate.getFullYear();
        const prevMonth = prevMonthDate.getMonth();

        // 🌟 FIX FILTRO RUOLI: Ora mostra ANCHE admin e titolari (utile per i test!)
        const dipendenti = safeUsers.filter(u => {
            const ruolo = (u.ruolo || '').toLowerCase();
            return ruolo !== 'proprietario_app'; // Nascondiamo solo il creatore dell'app
        }).sort((a, b) => (a.cognome || '').localeCompare(b.cognome || ''));

        console.log("🛠️ DEBUG DASHBOARD -> Utenti Trovati:", dipendenti.length, "Presenze totali:", safePresenze.length);

        const giorniMesePrecedente = getDaysInMonth(prevYear, prevMonth);
        const giorniMeseCorrente = getDaysInMonth(currentYear, currentMonth);
        const giorni = [...giorniMesePrecedente, ...giorniMeseCorrente]; 

        const segnalazioniMap = new Map();
        for (const s of safeSegnalazioni) {
            if (!s.userId) continue;
            const sDate = s.dataRiferimento?.toDate ? s.dataRiferimento.toDate() : s.dataRiferimento;
            if (!sDate || !(sDate instanceof Date)) continue;
            
            const pYear = sDate.getFullYear();
            const pMonth = sDate.getMonth();
            if (!(pYear === currentYear && pMonth === currentMonth) && !(pYear === prevYear && pMonth === prevMonth)) continue;

            const giornoString = toLocalDayString(sDate);
            if (!segnalazioniMap.has(s.userId)) segnalazioniMap.set(s.userId, new Map());
            segnalazioniMap.get(s.userId).set(giornoString, s.nota || "Errore segnalato");
        }

        const presenzeMap = new Map();
        for (const p of safePresenze) {
            if (!p.userId) continue;
            const userId = p.userId;
            
            if (!presenzeMap.has(userId)) presenzeMap.set(userId, new Map());
            const userMap = presenzeMap.get(userId);
            
            const pDateTs = p.timestampInizio || (p.stato !== 'lavoro' ? p.dataRiferimento : null);
            if (!pDateTs) continue;
            
            const pDate = pDateTs.toDate ? pDateTs.toDate() : pDateTs;
            const pYear = pDate.getFullYear ? pDate.getFullYear() : new Date(pDate).getFullYear();
            const pMonth = pDate.getMonth ? pDate.getMonth() : new Date(pDate).getMonth();
            const isInCurrent = (pYear === currentYear && pMonth === currentMonth);
            const isInPrev = (pYear === prevYear && pMonth === prevMonth);

            if (p.stato === 'lavoro') {
                if (!p.timestampInizio) continue;
                if (p.timestampFine) {
                    if (!isInCurrent && !isInPrev) continue;
                    const giornoString = toLocalDayString(pDate);
                    const ore = calcolaOreLavoro(p.timestampInizio, p.timestampFine);
                    const oreEsistenti = userMap.get(giornoString)?.ore || 0;
                    userMap.set(giornoString, { type: 'lavoro', ore: oreEsistenti + ore, docId: p.id });
                } else {
                    if (!isInCurrent && !isInPrev) continue;
                    const giornoString = toLocalDayString(pDate);
                    if (!userMap.get(giornoString) || userMap.get(giornoString).type !== 'lavoro') {
                        userMap.set(giornoString, { type: 'lavoro_in_corso', ore: 0, docId: p.id, isInProgress: true });
                    }
                }
            } else if (p.stato === 'malattia' || p.stato === 'infortunio') {
                if (!p.timestampInizio) continue;
                const startTs = p.timestampInizio;
                const endTs = p.timestampFine || p.dataFinePrevista; 
                
                let loopDate = startTs.toDate ? startTs.toDate() : new Date(startTs);
                const endDate = endTs ? (endTs.toDate ? endTs.toDate() : new Date(endTs)) : loopDate;

                while (loopDate <= endDate) {
                    const lYear = loopDate.getFullYear();
                    const lMonth = loopDate.getMonth();
                    if ((lYear === currentYear && lMonth === currentMonth) || (lYear === prevYear && lMonth === prevMonth)) {
                        const giornoString = toLocalDayString(loopDate);
                        if (!userMap.get(giornoString) || userMap.get(giornoString).type !== 'lavoro') {
                            userMap.set(giornoString, { type: p.stato, ore: 0, docId: p.id, isInProgress: !endTs });
                        }
                    }
                    loopDate.setDate(loopDate.getDate() + 1);
                }
            } else if (p.stato === 'pioggia') {
                if (!p.timestampInizio || (!isInCurrent && !isInPrev)) continue;
                const giornoString = toLocalDayString(pDate);
                if (!userMap.get(giornoString) || userMap.get(giornoString).type !== 'lavoro') {
                    userMap.set(giornoString, { type: 'pioggia', ore: 0, docId: p.id, chiusuraAutomatica: p.chiusuraAutomatica, isInProgress: !p.timestampFine });
                }
            }
        }

        const ferieMap = new Map();
        const permessiTotaliMese = new Map();

        (richiesteFerie || []).forEach(req => {
            if (req.stato !== 'approvata' || !req.userId) return;

            const dInizio = new Date(req.dataInizio);
            const rYear = dInizio.getFullYear();
            const rMonth = dInizio.getMonth();

            if (rYear === currentYear && rMonth === currentMonth) {
                if (req.tipo === 'ferie') {
                    if (!ferieMap.has(req.userId)) ferieMap.set(req.userId, new Map());
                    const dFine = req.dataFine ? new Date(req.dataFine) : dInizio;
                    let loopDate = new Date(dInizio);
                    while (loopDate <= dFine) {
                        ferieMap.get(req.userId).set(toLocalDayString(loopDate), true);
                        loopDate.setDate(loopDate.getDate() + 1);
                    }
                } else if (req.tipo === 'permesso') {
                    const ore = parseFloat(req.quantita || req.ore || 0);
                    permessiTotaliMese.set(req.userId, (permessiTotaliMese.get(req.userId) || 0) + ore);
                }
            }
        });

        const righe = dipendenti.map(user => {
            let totaleOreLavoro = 0; 
            let totaleGiorniMalattia = 0;
            let totaleGiorniInfortunio = 0;
            let totaleGiorniPioggia = 0;
            let totaleGiorniFerie = 0;

            const celleGiorni = giorni.map(giorno => {
                const giornoString = toLocalDayString(giorno);
                const isFerie = ferieMap.get(user.id)?.has(giornoString);
                const cellData = presenzeMap.get(user.id)?.get(giornoString); 
                const erroreNota = segnalazioniMap.get(user.id)?.get(giornoString);
                
                const cellaBase = {
                    docId: cellData?.docId || null,
                    isModified: false,
                    giornoString: giornoString,
                    erroreNota: erroreNota || null
                };

                if (isFerie && (!cellData || cellData.type !== 'lavoro')) {
                    if (giorno.getMonth() === currentMonth) totaleGiorniFerie++;
                    return { ...cellaBase, display: 'F', type: 'ferie', ore: 0 };
                }

                if (!cellData) return { ...cellaBase, display: 'N/D', type: 'nd', ore: 0 };
                
                if (cellData.type === 'lavoro') {
                    if (giorno.getMonth() === currentMonth) totaleOreLavoro += cellData.ore;
                    return { ...cellaBase, display: cellData.ore.toFixed(1), type: 'lavoro', ore: cellData.ore };
                } else if (cellData.type === 'lavoro_in_corso') {
                    return { ...cellaBase, display: '0', type: 'lavoro_in_corso', ore: 0, isInProgress: true };
                } else if (cellData.type === 'malattia') {
                    if (giorno.getMonth() === currentMonth) totaleGiorniMalattia++;
                    return { ...cellaBase, display: 'M', type: 'malattia', ore: 0, isInProgress: cellData.isInProgress };
                } else if (cellData.type === 'infortunio') {
                    if (giorno.getMonth() === currentMonth) totaleGiorniInfortunio++;
                    return { ...cellaBase, display: 'I', type: 'infortunio', ore: 0, isInProgress: cellData.isInProgress };
                } else if (cellData.type === 'pioggia') {
                    if (giorno.getMonth() === currentMonth) totaleGiorniPioggia++;
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
                totalePioggia: totaleGiorniPioggia,
                totaleFerie: totaleGiorniFerie,
                totalePermessi: permessiTotaliMese.get(user.id) || 0
            };
        });

        return { giorniDelMese: giorni, righeIniziali: righe };
    }, [currentDate, safeUsers, safePresenze, effectiveCompanyID, safeSegnalazioni, richiesteFerie]);

    useEffect(() => {
        setRighe(righeIniziali || []);
        setIsDirty(false);
        const scrollTimer = setTimeout(() => {
            if (scrollContainerRef.current && giorniDelMese && giorniDelMese.length > 0) {
                const todayString = toLocalDayString(new Date());
                const todayIndex = giorniDelMese.findIndex(g => toLocalDayString(g) === todayString);
                if (todayIndex !== -1) {
                    const headers = scrollContainerRef.current.querySelectorAll('thead th');
                    const todayHeader = headers[todayIndex + 1]; 
                    if (todayHeader) {
                        scrollContainerRef.current.scrollTo({
                            left: todayHeader.offsetLeft - 200,
                            behavior: 'smooth'
                        });
                    }
                }
            }
        }, 300); 
        return () => clearTimeout(scrollTimer);
    }, [righeIniziali, giorniDelMese]);

    const handleCellChange = (rigaIndex, giornoIndex, newValue) => {
        let validValue = newValue.toUpperCase().replace(/\s/g, ''); 
        if (validValue !== 'M' && validValue !== 'I' && validValue !== 'P' && validValue !== 'F' && validValue !== 'N/D' && validValue !== '') {
            validValue = validValue.replace(/[^0-9.]/g, '');
        }
        if (validValue === '') validValue = 'N/D';
        
        setRighe(prevRighe => {
            const nuoveRighe = prevRighe.map(r => ({ ...r, giorni: r.giorni.map(g => ({...g})) }));
            const cella = nuoveRighe[rigaIndex].giorni[giornoIndex];
            cella.display = validValue;
            cella.isModified = true;
            let totOre = 0, totM = 0, totI = 0, totP = 0, totF = 0;
            
            nuoveRighe[rigaIndex].giorni.forEach(g => {
                if (g.display === 'M') totM++;
                else if (g.display === 'I') totI++;
                else if (g.display === 'P') totP++;
                else if (g.display === 'F') totF++;
                else if (!isNaN(parseFloat(g.display))) totOre += parseFloat(g.display);
            });
            nuoveRighe[rigaIndex].totaleOre = totOre;
            nuoveRighe[rigaIndex].totaleMalattia = totM;
            nuoveRighe[rigaIndex].totaleInfortunio = totI;
            nuoveRighe[rigaIndex].totalePioggia = totP;
            nuoveRighe[rigaIndex].totaleFerie = totF;
            return nuoveRighe;
        });
        setIsDirty(true);
    };

    const handleSave = async () => {
        if (!isDirty || isSaving) return;
        const changesToSave = [];
        righe.forEach(riga => {
            riga.giorni.forEach(cella => {
                if (cella.isModified) {
                    changesToSave.push({ userId: riga.id, userNome: riga.nomeCompleto, giornoString: cella.giornoString, newValue: cella.display, originalDocId: cella.docId });
                }
            });
        });
        if (changesToSave.length === 0) return setIsDirty(false);
        
        const result = await saveGridChanges(changesToSave, adminUser?.id, effectiveCompanyID, currentDate);
        if (result.success) {
            setIsDirty(false);
            alert("Modifiche salvate con successo!");
        } else {
            alert("Errore durante il salvataggio: " + result.message);
        }
    };

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();

        const riassuntoHeaders = ["Dipendente", "Ore Lavoro", "Ferie (Giorni)", "Permessi (Ore)", "Malattia (Giorni)", "Infortunio (Giorni)", "Pioggia (Giorni)"];
        const riassuntoRows = righe.map(r => [
            r.nomeCompleto,
            Number((r.totaleOre || 0).toFixed(1)),
            r.totaleFerie || 0,
            r.totalePermessi || 0,
            r.totaleMalattia || 0,
            r.totaleInfortunio || 0,
            r.totalePioggia || 0
        ]);
        const wsRiassunto = XLSX.utils.aoa_to_sheet([riassuntoHeaders, ...riassuntoRows]);
        wsRiassunto['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsRiassunto, "Riassunto Paghe");

        const dettaglioHeaders = ["Dipendente", ...(giorniDelMese || []).map(g => g.getDate().toString())];
        const dettaglioRows = righe.map(r => [
            r.nomeCompleto,
            ...r.giorni.map(cella => cella.display)
        ]);
        const wsDettaglio = XLSX.utils.aoa_to_sheet([dettaglioHeaders, ...dettaglioRows]);
        wsDettaglio['!cols'] = [{ wch: 30 }, ...(giorniDelMese || []).map(() => ({ wch: 4 }))];
        XLSX.utils.book_append_sheet(wb, wsDettaglio, "Dettaglio Giornaliero");

        const meseAnno = currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
        const fileName = `Presenze_${meseAnno.replace(' ', '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };
    
    const cambiaMese = (incremento) => {
        if (isDirty && !window.confirm("Hai modifiche non salvate. Sei sicuro di voler cambiare mese?")) return;
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + incremento, 1));
    };

    const getCellStyles = (cella) => {
        if (cella.erroreNota) return 'bg-red-500 text-white font-extrabold';
        if (cella.isModified) return 'bg-indigo-50 border-2 border-indigo-400 font-bold text-indigo-900 z-10 relative scale-[1.05]';
        
        switch(cella.display) {
            case 'F': return 'bg-sky-100 text-sky-800 font-bold';
            case 'M': return 'bg-red-100 text-red-800 font-bold';
            case 'I': return 'bg-orange-100 text-orange-800 font-bold';
            case 'P': return 'bg-indigo-100 text-indigo-800 font-bold';
            case 'N/D': return 'bg-transparent text-gray-300 font-normal';
            case '0': return 'bg-gray-50 text-gray-400 font-normal italic';
            default: return 'bg-white text-gray-900 font-semibold';
        }
    };

    const tdStickyLeft = "sticky left-0 bg-white px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 border-r-2 border-gray-300 z-20 w-[240px] min-w-[240px] shadow-none";
    const thStickyLeft = "sticky left-0 top-0 bg-gray-100 px-4 py-4 text-left text-xs font-extrabold text-gray-600 uppercase tracking-wider border-r-2 border-gray-300 z-30 w-[240px] min-w-[240px] shadow-none";
    
    const wSummaryCol = "w-[80px] min-w-[80px]";
    const stickyRightBase = `sticky top-0 px-2 py-4 text-center text-[10px] font-extrabold text-gray-600 uppercase tracking-wider border-l border-gray-300 z-30 shadow-none ${wSummaryCol}`;
    const stickyRightCellBase = `sticky px-2 py-3 text-center text-sm font-bold border-l border-gray-200 z-20 shadow-none ${wSummaryCol}`;

    return (
        <div className="bg-transparent h-full flex flex-col animate-fade-in-up">
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2.5 text-gray-500 bg-gray-50 rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-colors shadow-sm">
                        <ArrowLeftIcon className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                            <CalendarDaysIcon className="h-7 w-7 text-indigo-600" />
                            Registro Presenze
                        </h1>
                        <p className="text-sm text-gray-500 font-medium mt-0.5">Riepilogo mensile ore, ferie e malattie.</p>
                    </div>
                </div>
                
                <div className="flex items-center justify-between w-full xl:w-auto gap-4 flex-wrap">
                    <div className="flex items-center bg-gray-100 rounded-full p-1 border border-gray-200">
                        <button onClick={() => cambiaMese(-1)} className="p-2 rounded-full hover:bg-white text-gray-600 transition-all" disabled={isSaving}>
                            <ChevronLeftIcon className="h-5 w-5" />
                        </button>
                        <span className="text-sm font-extrabold text-gray-800 w-36 text-center capitalize tracking-wide">
                            {currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => cambiaMese(1)} className="p-2 rounded-full hover:bg-white text-gray-600 transition-all" disabled={isSaving}>
                            <ChevronRightIcon className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-all">
                            <ArrowDownTrayIcon className="h-5 w-5" /> Export Paghe
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={!isDirty || isSaving}
                            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-all
                                ${isSaving ? 'bg-gray-400' : ''}
                                ${!isDirty && !isSaving ? 'bg-gray-300 opacity-60 cursor-not-allowed' : ''}
                                ${isDirty && !isSaving ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md animate-pulse' : ''}
                            `}
                        >
                            {isSaving ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <CheckIcon className="h-5 w-5" />}
                            {isSaving ? 'Salvataggio...' : 'Salva Modifiche'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex gap-6 mb-3 px-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex-wrap">
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-white border border-gray-300 rounded"></div> Lavoro (Ore)</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-sky-300 rounded"></div> Ferie (F)</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-400 rounded"></div> Malattia (M)</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-orange-400 rounded"></div> Infortunio (I)</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-indigo-400 rounded"></div> Pioggia (P)</span>
                {(segnalazioniErrori || []).length > 0 && <span className="flex items-center gap-1.5 text-red-600"><InformationCircleIcon className="h-4 w-4"/> Errori Timbratura</span>}
            </div>

            {righe.length > 0 ? (
                <div ref={scrollContainerRef} className="flex-1 overflow-x-auto overflow-y-auto border border-gray-300 rounded-2xl bg-white pb-4 custom-scrollbar">
                    <table className="min-w-max border-separate border-spacing-0 w-full text-sm">
                        <thead>
                            <tr>
                                <th className={thStickyLeft}>Dipendente</th>
                                {(giorniDelMese || []).map((giorno) => (
                                   <th key={toLocalDayString(giorno)} className={`sticky top-0 bg-gray-50 p-0 min-w-[48px] w-[48px] border-b border-gray-300 z-10 ${giorno.getDay() === 0 || giorno.getDay() === 6 ? 'bg-gray-100' : ''}`}>
                                        <div className="flex flex-col items-center justify-center h-full py-2">
                                            {giorno.getDate() === 1 && (
                                                <span className="text-[9px] text-indigo-600 font-black uppercase mb-0.5 leading-none tracking-widest">{giorno.toLocaleString('it-IT', { month: 'short' })}</span>
                                            )}
                                            <span className={`font-bold ${giorno.getDay() === 0 ? 'text-red-500' : 'text-gray-700'}`}>{giorno.getDate()}</span>
                                        </div>
                                    </th>
                                ))}
                                <th className={`${stickyRightBase} right-[400px] bg-indigo-100 text-indigo-900 border-l-2 border-gray-300`}>Tot. Ore</th>
                                <th className={`${stickyRightBase} right-[320px] bg-sky-100 text-sky-800`}>Ferie (gg)</th>
                                <th className={`${stickyRightBase} right-[240px] bg-sky-100 text-sky-800`}>Permessi (h)</th>
                                <th className={`${stickyRightBase} right-[160px] bg-gray-100`}>Malattia</th>
                                <th className={`${stickyRightBase} right-[80px] bg-gray-100`}>Infortunio</th>
                                <th className={`${stickyRightBase} right-0 border-r-0 bg-gray-100`}>Pioggia</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {righe.map((riga, rigaIndex) => (
                                <tr key={riga.id} className="group hover:bg-gray-50">
                                    <td className={tdStickyLeft}>
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">{getInitials(riga.nomeCompleto)}</div>
                                            <span className="truncate" title={riga.nomeCompleto}>{riga.nomeCompleto}</span>
                                        </div>
                                    </td>
                                    {riga.giorni.map((cella, giornoIndex) => {
                                        const isWeekend = giorniDelMese[giornoIndex]?.getDay() === 0 || giorniDelMese[giornoIndex]?.getDay() === 6;
                                        return (
                                            <td key={cella.giornoString} className={`p-0 min-w-[48px] w-[48px] border-b border-gray-200 ${isWeekend ? 'bg-gray-50' : 'bg-white'}`}>
                                                <input 
                                                    type="text"
                                                    value={cella.display}
                                                    onChange={(e) => handleCellChange(rigaIndex, giornoIndex, e.target.value)}
                                                    title={cella.erroreNota ? `ERRORE SEGNALATO: ${cella.erroreNota}` : ''}
                                                    className={`w-full h-12 text-center text-sm outline-none transition-all rounded-none border-t border-b border-transparent focus:border-indigo-500 focus:ring-inset focus:ring-2 focus:ring-indigo-200 ${getCellStyles(cella)}`}
                                                    disabled={isSaving}
                                                />
                                            </td>
                                        );
                                    })}
                                    <td className={`${stickyRightCellBase} right-[400px] bg-indigo-50 text-indigo-900 border-b border-gray-200 border-l-2 border-gray-300`}>{(riga.totaleOre || 0).toFixed(1)}</td>
                                    <td className={`${stickyRightCellBase} right-[320px] bg-sky-50 text-sky-900 border-b border-gray-200`}>{riga.totaleFerie || 0}</td>
                                    <td className={`${stickyRightCellBase} right-[240px] bg-sky-50 text-sky-900 border-b border-gray-200`}>{riga.totalePermessi || 0}</td>
                                    <td className={`${stickyRightCellBase} right-[160px] bg-white text-red-700 border-b border-gray-200`}>{riga.totaleMalattia || 0}</td>
                                    <td className={`${stickyRightCellBase} right-[80px] bg-white text-orange-700 border-b border-gray-200`}>{riga.totaleInfortunio || 0}</td>
                                    <td className={`${stickyRightCellBase} right-0 bg-white text-indigo-700 border-b border-gray-200 border-r-0`}>{riga.totalePioggia || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl bg-white">
                    <CalendarDaysIcon className="h-16 w-16 text-gray-300 mb-4" />
                    <p className="text-lg text-gray-500 font-bold">Nessun dipendente o presenza registrata.</p>
                    <p className="text-sm text-gray-400 mt-1">Assicurati di aver aggiunto personale attivo nella sezione "Risorse Umane".</p>
                </div>
            )}
            
           <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { height: 10px; width: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; margin: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; border: 2px solid #f1f5f9; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />
        </div>
    );
};