// packages/shared-ui/views/SimulatoreGanttView.jsx

import React, { useState, useEffect } from 'react';
import { 
    ArrowLeftIcon, PlusIcon, FolderOpenIcon, 
    ArrowRightIcon, ClockIcon, UserGroupIcon, TrashIcon, CheckCircleIcon,
    InboxArrowDownIcon, ViewColumnsIcon, CalendarDaysIcon, ChartBarIcon,
    ExclamationTriangleIcon, DocumentCheckIcon, SparklesIcon,
    CalendarIcon, EyeIcon, XMarkIcon, TruckIcon, WrenchScrewdriverIcon, TagIcon
} from '@heroicons/react/24/outline';

const formatLocalInputDate = (dateObj) => {
    if (!dateObj) return '';
    const d = new Date(dateObj);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const parseLocalInputDate = (dateStr) => {
    if (!dateStr) return null;
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
        const [y, m, d] = dateStr.split('T')[0].split('-');
        return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    }
    const d = new Date(dateStr);
    d.setHours(0,0,0,0);
    return d;
};

export const SimulatoreGanttView = ({ offerta, datiSalvati, onBack, onSaveDraft, onConfirm }) => {
    
    const [step, setStep] = useState(1); 
    const righeComputo = offerta?.datiAnalisi?.computoMetrico || [];
    
    const [capacitaAziendale, setCapacitaAziendale] = useState(datiSalvati?.impostazioniGantt?.capacitaConsiderata || 10); 
    const [simulaCaricoEsterno, setSimulaCaricoEsterno] = useState(datiSalvati?.impostazioniGantt?.simulazioneCarico || false); 
    const [pacchetti, setPacchetti] = useState(datiSalvati?.pacchettiOperativi || []); 

    const [showPreview, setShowPreview] = useState(false);
    const [lavorazioniDaAssegnare, setLavorazioniDaAssegnare] = useState([]);
    const [nuovoPacchettoNome, setNuovoPacchettoNome] = useState('');
    const [isFornituraNuovo, setIsFornituraNuovo] = useState(false);
    const [taskSelezionati, setTaskSelezionati] = useState([]);
    const [pacchettoAttivoId, setPacchettoAttivoId] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (righeComputo.length > 0 && !isInitialized) {
            
            const taskIniziali = righeComputo.map((riga, index) => {
                let oreReali = 0;
                if (riga.analisiCosti?.manodopera) {
                    riga.analisiCosti.manodopera.forEach(m => {
                        const p = m.numeroPersone !== undefined && m.numeroPersone !== '' ? parseFloat(m.numeroPersone) || 1 : 1;
                        oreReali += (p * (parseFloat(m.quantita) || 0));
                    });
                }
                return {
                    id: riga.id || `task_${index}`,
                    codice: riga.codice || `VOCE-${index+1}`,
                    descrizione: riga.descrizione || 'Lavorazione senza nome',
                    oreStimate: Math.round(oreReali), 
                    ripetizioniDaComputo: parseInt(riga.numeroInterventi) || 1,
                    categoriaGanttOriginale: riga.categoriaGantt || null 
                };
            });

            if (datiSalvati?.pacchettiOperativi?.length > 0) {
                const assignedTaskIds = new Set();
                datiSalvati.pacchettiOperativi.forEach(p => p.task.forEach(t => assignedTaskIds.add(t.id)));
                setLavorazioniDaAssegnare(taskIniziali.filter(t => !assignedTaskIds.has(t.id)));
            } 
            else {
                let taskNonAssegnati = [];
                let pacchettiAutoCreati = [];
                const raggruppamento = {};
                
                taskIniziali.forEach(task => {
                    if (task.categoriaGanttOriginale) {
                        if (!raggruppamento[task.categoriaGanttOriginale]) raggruppamento[task.categoriaGanttOriginale] = [];
                        raggruppamento[task.categoriaGanttOriginale].push(task);
                    } else {
                        taskNonAssegnati.push(task);
                    }
                });

                Object.entries(raggruppamento).forEach(([nomeCategoria, tasksDellaCategoria], index) => {
                    const oreTotali = tasksDellaCategoria.reduce((tot, t) => tot + t.oreStimate, 0);
                    const ripetizioniCalcolate = Math.max(...tasksDellaCategoria.map(t => t.ripetizioniDaComputo));
                    const isFornitura = oreTotali === 0;

                    pacchettiAutoCreati.push({
                        id: `pack_auto_${index}_${Date.now()}`,
                        nome: nomeCategoria,
                        task: tasksDellaCategoria, 
                        isFornitura: isFornitura,
                        squadraTipo: isFornitura ? 0 : 2, 
                        ripetizioni: ripetizioniCalcolate,
                        frequenza: 'manuale',
                        giornoPreferito: 'qualsiasi', 
                        dateInizio: Array(ripetizioniCalcolate).fill(null), 
                        giornateStimate: isFornitura ? 1 : Math.max(1, Math.ceil(oreTotali / (2 * 8))),
                        color: isFornitura ? '#fbbf24' : `hsl(${Math.random() * 360}, 70%, 85%)`
                    });
                });

                setPacchetti(pacchettiAutoCreati);
                setLavorazioniDaAssegnare(taskNonAssegnati);
                if (pacchettiAutoCreati.length > 0) {
                    setPacchettoAttivoId(pacchettiAutoCreati[0].id);
                }
            }
            setIsInitialized(true);
        }
    }, [righeComputo, datiSalvati, isInitialized]);

    // 🌟 LA MAGIA DEL BASTONE: Questo bottone spazza via il passato e legge dal Computo 🌟
    const rigeneraDaCategorie = () => {
        if (!window.confirm("🪄 Vuoi ri-raggruppare automaticamente le voci in base alle etichette inserite nel Computo?\n\nAttenzione: questo cancellerà i macrogruppi attuali creati manualmente nel Gantt.")) return;
        
        let taskNonAssegnati = [];
        let pacchettiAutoCreati = [];
        const raggruppamento = {};

        const taskIniziali = righeComputo.map((riga, index) => {
            let oreReali = 0;
            if (riga.analisiCosti?.manodopera) {
                riga.analisiCosti.manodopera.forEach(m => {
                    const p = m.numeroPersone !== undefined && m.numeroPersone !== '' ? parseFloat(m.numeroPersone) || 1 : 1;
                    oreReali += (p * (parseFloat(m.quantita) || 0));
                });
            }
            return {
                id: riga.id || `task_${index}`,
                codice: riga.codice || `VOCE-${index+1}`,
                descrizione: riga.descrizione || 'Lavorazione senza nome',
                oreStimate: Math.round(oreReali), 
                ripetizioniDaComputo: parseInt(riga.numeroInterventi) || 1,
                categoriaGanttOriginale: riga.categoriaGantt || null
            };
        });

        taskIniziali.forEach(task => {
            if (task.categoriaGanttOriginale) {
                if (!raggruppamento[task.categoriaGanttOriginale]) raggruppamento[task.categoriaGanttOriginale] = [];
                raggruppamento[task.categoriaGanttOriginale].push(task);
            } else {
                taskNonAssegnati.push(task);
            }
        });

        Object.entries(raggruppamento).forEach(([nomeCategoria, tasksDellaCategoria], index) => {
            const oreTotali = tasksDellaCategoria.reduce((tot, t) => tot + t.oreStimate, 0);
            const ripetizioniCalcolate = tasksDellaCategoria.length > 0 ? Math.max(...tasksDellaCategoria.map(t => t.ripetizioniDaComputo)) : 1;
            const isFornitura = oreTotali === 0;

            pacchettiAutoCreati.push({
                id: `pack_auto_${index}_${Date.now()}`,
                nome: nomeCategoria,
                task: tasksDellaCategoria, 
                isFornitura: isFornitura,
                squadraTipo: isFornitura ? 0 : 2, 
                ripetizioni: ripetizioniCalcolate,
                frequenza: 'manuale',
                giornoPreferito: 'qualsiasi', 
                dateInizio: Array(ripetizioniCalcolate).fill(null), 
                giornateStimate: isFornitura ? 1 : Math.max(1, Math.ceil(oreTotali / (2 * 8))),
                color: isFornitura ? '#fbbf24' : `hsl(${Math.random() * 360}, 70%, 85%)`
            });
        });

        setPacchetti(pacchettiAutoCreati);
        setLavorazioniDaAssegnare(taskNonAssegnati);
        setTaskSelezionati([]);
        if (pacchettiAutoCreati.length > 0) setPacchettoAttivoId(pacchettiAutoCreati[0].id);
        else setPacchettoAttivoId(null);
    };

    const toggleSelezione = (taskId) => setTaskSelezionati(prev => prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]);
    const selezionaTutto = () => setTaskSelezionati(taskSelezionati.length === lavorazioniDaAssegnare.length ? [] : lavorazioniDaAssegnare.map(t => t.id));
    const calcolaOreSingoloIntervento = (taskArray) => taskArray.reduce((tot, task) => tot + task.oreStimate, 0);

    const handleCreaPacchetto = () => {
        if (!nuovoPacchettoNome || nuovoPacchettoNome.trim() === '') return;
        const tasksToMove = lavorazioniDaAssegnare.filter(t => taskSelezionati.includes(t.id));
        const oreTotali = calcolaOreSingoloIntervento(tasksToMove);
        const ripetizioniCalcolate = tasksToMove.length > 0 ? Math.max(...tasksToMove.map(t => t.ripetizioniDaComputo)) : 1;
        const nuovoId = `pack_${Date.now()}`;
        
        const isFornitura = isFornituraNuovo || (tasksToMove.length > 0 && oreTotali === 0);

        setPacchetti(prev => [...prev, {
            id: nuovoId,
            nome: nuovoPacchettoNome.trim(),
            task: tasksToMove, 
            isFornitura: isFornitura,
            squadraTipo: isFornitura ? 0 : 2, 
            ripetizioni: ripetizioniCalcolate,
            frequenza: 'manuale',
            giornoPreferito: 'qualsiasi', 
            dateInizio: Array(ripetizioniCalcolate).fill(null), 
            giornateStimate: isFornitura ? 1 : (tasksToMove.length > 0 ? Math.max(1, Math.ceil(oreTotali / (2 * 8))) : 1),
            color: isFornitura ? '#fbbf24' : `hsl(${Math.random() * 360}, 70%, 85%)`
        }]);
        setLavorazioniDaAssegnare(prev => prev.filter(t => !taskSelezionati.includes(t.id)));
        setNuovoPacchettoNome('');
        setIsFornituraNuovo(false);
        setTaskSelezionati([]);
        setPacchettoAttivoId(nuovoId);
    };

    const assegnaSelezionatiAPacchettoEsistente = (pacchettoId) => {
        const tasksToMove = lavorazioniDaAssegnare.filter(t => taskSelezionati.includes(t.id));
        setLavorazioniDaAssegnare(prev => prev.filter(t => !taskSelezionati.includes(t.id)));
        setPacchetti(prevPacchetti => prevPacchetti.map(p => {
            if (p.id === pacchettoId) {
                const updatedTasks = [...p.task, ...tasksToMove];
                const nuoveOre = calcolaOreSingoloIntervento(updatedTasks);
                return { 
                    ...p, 
                    task: updatedTasks, 
                    giornateStimate: p.isFornitura ? 1 : Math.max(1, Math.ceil(nuoveOre / (p.squadraTipo * 8))) 
                };
            }
            return p;
        }));
        setTaskSelezionati([]); 
    };

    const rimuoviTaskDaPacchetto = (taskId, pacchettoId) => {
        const pacchettoCorrente = pacchetti.find(p => p.id === pacchettoId);
        if (!pacchettoCorrente) return;
        
        const taskToRestore = pacchettoCorrente.task.find(t => t.id === taskId);
        if (!taskToRestore) return;

        setLavorazioniDaAssegnare(prev => [...prev, taskToRestore]);

        setPacchetti(prevPacchetti => prevPacchetti.map(p => {
            if (p.id === pacchettoId) {
                const updatedTasks = p.task.filter(t => t.id !== taskId);
                const nuoveOre = calcolaOreSingoloIntervento(updatedTasks);
                return { 
                    ...p, 
                    task: updatedTasks, 
                    giornateStimate: p.isFornitura ? 1 : (updatedTasks.length > 0 ? Math.max(1, Math.ceil(nuoveOre / (p.squadraTipo * 8))) : 1) 
                };
            }
            return p;
        }));
    };

    const aggiornaProgrammazione = (pacchettoId, updates) => {
        setPacchetti(prev => prev.map(p => {
            if (p.id === pacchettoId) {
                const updatedP = { ...p, ...updates };

                if (updates.isFornitura !== undefined) {
                    if (updates.isFornitura) {
                        updatedP.squadraTipo = 0;
                        updatedP.giornateStimate = 1;
                    } else {
                        updatedP.squadraTipo = 2; 
                        const ore = calcolaOreSingoloIntervento(updatedP.task);
                        updatedP.giornateStimate = Math.max(1, Math.ceil(ore / (updatedP.squadraTipo * 8)));
                    }
                }

                if (updates.squadraTipo !== undefined && !updatedP.isFornitura) {
                    const ore = calcolaOreSingoloIntervento(updatedP.task);
                    updatedP.squadraTipo = parseInt(updates.squadraTipo, 10) || 1; 
                    updatedP.giornateStimate = Math.max(1, Math.ceil(ore / (updatedP.squadraTipo * 8)));
                }
                
                if (updates.ripetizioni !== undefined) {
                    const n = Math.max(1, parseInt(updates.ripetizioni, 10) || 1);
                    updatedP.ripetizioni = n;
                    updatedP.dateInizio = Array(n).fill(null).map((_, i) => p.dateInizio[i] || null);
                }

                if (updates.primoIntervento !== undefined) {
                    const nuoveDate = [...(updatedP.dateInizio || [])];
                    nuoveDate[0] = updates.primoIntervento ? parseLocalInputDate(updates.primoIntervento) : null;
                    updatedP.dateInizio = nuoveDate;
                }

                if (updatedP.frequenza !== 'manuale' && updatedP.dateInizio?.[0]) {
                    const n = updatedP.ripetizioni;
                    const autoDate = [new Date(updatedP.dateInizio[0])];
                    
                    for (let i = 1; i < n; i++) {
                        const precedente = new Date(autoDate[i - 1]);
                        const successiva = new Date(precedente);
                        
                        switch (updatedP.frequenza) {
                            case '1_settimana': successiva.setDate(precedente.getDate() + 7); break;
                            case '15_gg': successiva.setDate(precedente.getDate() + 15); break;
                            case '3_settimane': successiva.setDate(precedente.getDate() + 21); break;
                            case '1_mese': successiva.setMonth(precedente.getMonth() + 1); break;
                            case '2_mesi': successiva.setMonth(precedente.getMonth() + 2); break;
                            case '3_mesi': successiva.setMonth(precedente.getMonth() + 3); break;
                            default: break;
                        }

                        if (updatedP.giornoPreferito && updatedP.giornoPreferito !== 'qualsiasi') {
                            const targetDay = parseInt(updatedP.giornoPreferito, 10); 
                            const currentDay = successiva.getDay();
                            let diff = targetDay - currentDay;
                            if (diff > 3) diff -= 7;
                            else if (diff < -3) diff += 7;
                            successiva.setDate(successiva.getDate() + diff);
                        }
                        autoDate.push(successiva);
                    }
                    updatedP.dateInizio = autoDate;
                }
                return updatedP;
            }
            return p;
        }));
    };

    const impostaDataInizioRipetizione = (pacchettoId, indiceRipetizione, dateString) => {
        setPacchetti(prev => prev.map(p => {
            if (p.id === pacchettoId) {
                const nuoveDate = [...(p.dateInizio || [])];
                nuoveDate[indiceRipetizione] = dateString ? parseLocalInputDate(dateString) : null;
                return { ...p, dateInizio: nuoveDate };
            }
            return p;
        }));
    };

    const dataPartenzaProgetto = offerta?.datiAnalisi?.dataInizioPresunta ? parseLocalInputDate(offerta.datiAnalisi.dataInizioPresunta) : new Date();
    dataPartenzaProgetto.setHours(0,0,0,0);
    
    const timelineDays = Array.from({ length: 90 }).map((_, i) => {
        const d = new Date(dataPartenzaProgetto);
        d.setDate(d.getDate() + i);
        return d;
    });

    const mesiAnteprima = Array.from({ length: 12 }).map((_, i) => {
        const d = new Date(dataPartenzaProgetto.getFullYear(), dataPartenzaProgetto.getMonth() + i, 1);
        return {
            month: d.getMonth(),
            year: d.getFullYear(),
            label: d.toLocaleDateString('it-IT', { month: 'short' }),
            yearLabel: d.getFullYear()
        };
    });

    const getRisorseGiorno = (giornoCorrente) => {
        let risorseImpiegate = simulaCaricoEsterno ? 5 : 0;
        const targetTime = giornoCorrente.getTime();

        pacchetti.forEach(p => {
            if (p.isFornitura) return; 

            (p.dateInizio || []).forEach(dataInizio => {
                if (dataInizio) {
                    const startD = new Date(dataInizio);
                    startD.setHours(0,0,0,0); 
                    
                    const endD = new Date(startD);
                    endD.setDate(endD.getDate() + (p.giornateStimate - 1));
                    endD.setHours(0,0,0,0); 

                    if (targetTime >= startD.getTime() && targetTime <= endD.getTime()) {
                        risorseImpiegate += parseInt(p.squadraTipo, 10) || 0;
                    }
                }
            });
        });
        return risorseImpiegate;
    };

    const handleSalvaBozza = () => {
        let giorniCritici = 0;
        let piccoMassimo = 0;

        timelineDays.forEach(date => {
            const risorse = getRisorseGiorno(date);
            if (risorse > piccoMassimo) piccoMassimo = risorse;
            if (risorse > capacitaAziendale) giorniCritici++;
        });

        const datiGanttStrutturati = {
            pacchettiOperativi: pacchetti,
            impostazioniGantt: { capacitaConsiderata: capacitaAziendale, simulazioneCarico: simulaCaricoEsterno },
            riepilogo: { piccoOperai: piccoMassimo, giorniSovrapposizione: giorniCritici, noteTitolare: '' },
            isDraft: true
        };

        if (onSaveDraft) onSaveDraft(datiGanttStrutturati);
        else alert("💾 Bozza salvata in memoria!");
    };

    const handleConferma = () => {
        let giorniCritici = 0;
        let piccoMassimo = 0;

        timelineDays.forEach(date => {
            const risorse = getRisorseGiorno(date);
            if (risorse > piccoMassimo) piccoMassimo = risorse;
            if (risorse > capacitaAziendale) giorniCritici++;
        });

        const numeroPacchetti = pacchetti.length;
        let notaTitolare = `PREVISIONE GARA: Organizzati ${numeroPacchetti} macrogruppi di lavoro/fornitura. `;
        
        if (giorniCritici > 0) {
            notaTitolare += `⚠️ ATTENZIONE: Rilevati ${giorniCritici} giorni con probabile sovraccarico. Il picco massimo stimato richiederà ${piccoMassimo} operai in contemporanea (Capacità attuale stimata: ${capacitaAziendale}). Valutare scorrimento date o ricorso al subappalto in caso di aggiudicazione.`;
        } else {
            notaTitolare += `✅ NESSUNA CRITICITÀ: Le tempistiche impostate sono compatibili con la capacità aziendale (${piccoMassimo} operai di picco massimo su ${capacitaAziendale} disponibili).`;
        }

        const datiProgrammazionePreventiva = {
            pacchettiOperativi: pacchetti,
            impostazioniGantt: { capacitaConsiderata: capacitaAziendale, simulazioneCarico: simulaCaricoEsterno },
            riepilogo: { piccoOperai: piccoMassimo, giorniSovrapposizione: giorniCritici, noteTitolare: notaTitolare },
            isDraft: false
        };

        if (onConfirm) onConfirm(datiProgrammazionePreventiva);
    };

    const canProceedToGantt = pacchetti.length > 0;
    const vociRimaste = lavorazioniDaAssegnare.length;

    return (
        <div className="flex flex-col h-full bg-slate-100 min-h-screen font-sans relative">
            
            <header className="bg-white border-b border-slate-200 shrink-0 sticky top-0 z-10 shadow-sm px-6 py-4">
                <div className="max-w-screen-2xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={() => step === 2 ? setStep(1) : onBack()} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                            <ArrowLeftIcon className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                {step === 1 ? <ViewColumnsIcon className="h-6 w-6 text-indigo-600" /> : <CalendarDaysIcon className="h-6 w-6 text-emerald-600" />} 
                                {step === 1 ? '1. Creazione Macrogruppi' : '2. Gantt Operativo'}
                            </h1>
                            <p className="text-xs font-medium text-slate-500">Simulazione Cantiere: {offerta?.nomeOfferta || 'Bozza'}</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-3 items-center">
                        {step === 2 && (
                            <div onClick={() => setSimulaCaricoEsterno(!simulaCaricoEsterno)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl shadow-sm cursor-pointer border transition-colors ${simulaCaricoEsterno ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                                <input type="checkbox" checked={simulaCaricoEsterno} readOnly className={`h-3 w-3 rounded ${simulaCaricoEsterno ? 'text-amber-600' : 'text-slate-400'}`} />
                                <span className={`text-[10px] font-black uppercase ${simulaCaricoEsterno ? 'text-amber-700' : 'text-slate-500'}`}>Simula +5 Op. Altrove</span>
                            </div>
                        )}

                        <button onClick={() => setShowPreview(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
                            <EyeIcon className="h-5 w-5 text-indigo-500" /> Vista Annuale
                        </button>

                        <button onClick={handleSalvaBozza} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all shadow-sm">
                            <DocumentCheckIcon className="h-5 w-5" /> Salva Bozza
                        </button>

                        {step === 1 ? (
                            <button 
                                onClick={() => {
                                    if (vociRimaste > 0) {
                                        if(!window.confirm(`Hai ancora ${vociRimaste} lavorazioni non assegnate.\nSe prosegui, verranno semplicemente escluse dalla programmazione temporale.\n\nVuoi proseguire comunque?`)) return;
                                    }
                                    setStep(2);
                                }} 
                                disabled={!canProceedToGantt} 
                                title={!canProceedToGantt ? 'Crea almeno un macrogruppo per poter proseguire' : ''}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all shadow-md active:scale-95 ${canProceedToGantt ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                            >
                                Prosegui al Gantt <ArrowRightIcon className="h-5 w-5" />
                            </button>
                        ) : (
                            <div className="flex gap-4 items-center">
                                <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
                                    <span className="text-[10px] font-black uppercase text-slate-500">Capacità Aziendale:</span>
                                    <input type="number" value={capacitaAziendale} onChange={(e)=>setCapacitaAziendale(parseInt(e.target.value)||0)} className="w-12 text-sm font-bold text-center border rounded outline-none focus:ring-1 focus:ring-indigo-500" />
                                </div>
                                <button onClick={handleConferma} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-black text-sm transition-all shadow-md active:scale-95">
                                    <CheckCircleIcon className="h-5 w-5" /> Applica e Procedi
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 p-6 overflow-hidden max-w-screen-2xl mx-auto w-full h-[calc(100vh-80px)] flex gap-4">
                
                {step === 1 && (
                    <>
                        <div className="w-[30%] flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col gap-3 shrink-0">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2"><FolderOpenIcon className="h-5 w-5 text-indigo-500" /> Da Assegnare</h2>
                                    <span className="bg-indigo-100 text-indigo-800 font-bold px-2.5 py-0.5 rounded-full text-xs">{lavorazioniDaAssegnare.length}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    {lavorazioniDaAssegnare.length > 0 && (
                                        <button onClick={selezionaTutto} className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 underline decoration-slate-300">
                                            {taskSelezionati.length === lavorazioniDaAssegnare.length ? 'Deseleziona Tutto' : 'Seleziona Tutto'}
                                        </button>
                                    )}
                                    
                                    {/* 🌟 BOTTONE RAGGRUPPA DA COMPUTO 🌟 */}
                                    <button onClick={rigeneraDaCategorie} className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200 transition-colors flex items-center gap-1 ml-auto">
                                        <SparklesIcon className="h-3 w-3" /> Allinea con Computo
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50">
                                {lavorazioniDaAssegnare.map(task => (
                                    <div key={task.id} onClick={() => toggleSelezione(task.id)} className={`p-3 rounded-xl border shadow-sm transition-all cursor-pointer flex gap-3 ${taskSelezionati.includes(task.id) ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                                        <input type="checkbox" checked={taskSelezionati.includes(task.id)} readOnly className="h-4 w-4 rounded text-indigo-600 mt-1" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex gap-2 items-center">
                                                    <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{task.codice}</span>
                                                    {task.categoriaGanttOriginale && <span className="text-[8px] font-black uppercase text-emerald-600 border border-emerald-200 px-1 rounded flex items-center gap-0.5"><TagIcon className="h-2 w-2"/> {task.categoriaGanttOriginale}</span>}
                                                </div>
                                                {task.oreStimate === 0 ? (
                                                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"><TruckIcon className="h-3 w-3 inline" /> Fornitura</span>
                                                ) : (
                                                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100"><ClockIcon className="h-3 w-3 inline" /> {task.oreStimate}h</span>
                                                )}
                                            </div>
                                            <p className="text-xs font-semibold text-slate-700">{task.descrizione}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="w-[30%] flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b bg-slate-50 shrink-0">
                                <input type="text" value={nuovoPacchettoNome} onChange={(e) => setNuovoPacchettoNome(e.target.value)} onKeyDown={(e) => {if(e.key==='Enter') handleCreaPacchetto();}} placeholder="Nome nuovo macrogruppo..." className="w-full mb-2 p-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                
                                <label className="flex items-center gap-2 mt-2 mb-3 cursor-pointer select-none">
                                    <input type="checkbox" checked={isFornituraNuovo} onChange={e => setIsFornituraNuovo(e.target.checked)} className="h-4 w-4 rounded text-amber-500 focus:ring-amber-500" />
                                    <span className="text-xs font-bold text-slate-600">Solo Fornitura (No Manodopera)</span>
                                </label>

                                <button onClick={handleCreaPacchetto} disabled={!nuovoPacchettoNome.trim()} className={`w-full py-2.5 rounded-xl font-bold text-sm flex justify-center gap-2 transition-all disabled:opacity-50 ${taskSelezionati.length > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white'}`}>
                                    <PlusIcon className="h-4 w-4" /> {taskSelezionati.length > 0 ? `Crea Macrogruppo (${taskSelezionati.length})` : 'Crea Vuoto'}
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/30">
                                {pacchetti.map(p => (
                                    <div key={p.id} onClick={() => setPacchettoAttivoId(p.id)} className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 ${p.id === pacchettoAttivoId ? 'bg-white border-indigo-500 ring-2 ring-indigo-500 shadow-md' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'}`}>
                                        <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white" style={{ backgroundColor: p.color }}>
                                            {p.isFornitura ? <TruckIcon className="h-5 w-5" /> : <WrenchScrewdriverIcon className="h-5 w-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-black truncate">{p.nome}</h3>
                                            {p.isFornitura ? (
                                                <p className="text-[10px] font-bold text-amber-600 mt-0.5 uppercase tracking-widest">Consegna Materiale</p>
                                            ) : (
                                                <p className="text-[10px] font-bold text-slate-500 mt-0.5">{p.ripetizioni} Interventi • {calcolaOreSingoloIntervento(p.task)}h cad.</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
                            {!pacchettoAttivoId ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50"><ViewColumnsIcon className="h-16 w-16 mb-4 text-slate-300" /><p className="text-lg font-bold">Seleziona un Macrogruppo</p></div>
                            ) : (() => {
                                const pAct = pacchetti.find(p => p.id === pacchettoAttivoId);
                                return (
                                <div className="flex flex-col h-full">
                                    <div className="p-4 border-b flex justify-between items-center" style={{ backgroundColor: pAct.color }}>
                                        <h2 className={`text-lg font-black ${pAct.isFornitura ? 'text-amber-900' : 'text-white'}`}>{pAct.nome}</h2>
                                        <button onClick={() => { setPacchetti(prev => prev.filter(p => p.id !== pAct.id)); setLavorazioniDaAssegnare(prev => [...prev, ...pAct.task]); setPacchettoAttivoId(null); }} className={`hover:text-red-600 bg-white/60 px-3 py-1.5 rounded-lg text-xs font-bold ${pAct.isFornitura ? 'text-amber-900' : 'text-slate-800'}`}><TrashIcon className="h-4 w-4 inline" /> Elimina</button>
                                    </div>
                                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                                        <div className="grid grid-cols-3 gap-4 mb-4">
                                            
                                            {/* TIPO MACROGRUPPO */}
                                            <div className="bg-white p-3 rounded-xl border shadow-sm flex flex-col justify-center">
                                                <span className="text-[10px] uppercase font-black text-slate-400 mb-1">Tipo Gruppo</span>
                                                <button onClick={() => aggiornaProgrammazione(pAct.id, {isFornitura: !pAct.isFornitura})} className={`text-xs font-bold py-1.5 rounded-lg border transition-colors ${pAct.isFornitura ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                                                    {pAct.isFornitura ? '📦 Solo Fornitura' : '👷 Con Posa/MDO'}
                                                </button>
                                            </div>

                                            {pAct.isFornitura ? (
                                                <div className="col-span-2 bg-amber-50 border border-amber-200 p-3 rounded-xl shadow-sm flex items-center gap-3">
                                                    <TruckIcon className="h-8 w-8 text-amber-500 shrink-0" />
                                                    <p className="text-xs font-bold text-amber-800">Questo macrogruppo è di sola consegna materiale. Non richiederà operai e non genererà carico di lavoro nel Gantt.</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="bg-white p-3 rounded-xl border shadow-sm flex flex-col">
                                                        <span className="text-[10px] uppercase font-black text-slate-400 mb-1">Squadra (Addetti)</span>
                                                        <input type="number" min="1" value={pAct.squadraTipo} onChange={(e) => aggiornaProgrammazione(pAct.id, {squadraTipo: e.target.value})} className="w-16 px-2 py-1 text-sm font-bold border rounded-lg text-center focus:ring-1 focus:ring-indigo-500 outline-none" />
                                                    </div>
                                                    <div className="bg-indigo-600 p-3 rounded-xl shadow-sm flex flex-col justify-center text-white text-center">
                                                        <span className="text-[10px] uppercase font-black text-indigo-200 mb-1">Giorni Lavoro</span>
                                                        <span className="text-xl font-black">{pAct.giornateStimate} gg</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {taskSelezionati.length > 0 && (
                                        <div className="p-3 bg-indigo-50 border-b border-indigo-100 shrink-0">
                                            <button onClick={() => assegnaSelezionatiAPacchettoEsistente(pAct.id)} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold text-sm py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm transition-all active:scale-95">
                                                <InboxArrowDownIcon className="h-5 w-5" /> Sposta qui {taskSelezionati.length} {taskSelezionati.length === 1 ? 'voce' : 'voci'}
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex-1 overflow-y-auto p-4 bg-white space-y-2">
                                        {pAct.task.map(task => (
                                            <div key={task.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50">
                                                <div className="min-w-0 pr-4">
                                                    <div className="flex gap-2 items-center mb-0.5">
                                                        <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-bold">{task.codice}</span>
                                                        {task.categoriaGanttOriginale && <span className="text-[8px] font-black uppercase text-emerald-600 border border-emerald-200 px-1 rounded flex items-center gap-0.5"><TagIcon className="h-2 w-2"/> {task.categoriaGanttOriginale}</span>}
                                                    </div>
                                                    <p className="text-xs font-semibold text-slate-700 mt-1 truncate">{task.descrizione}</p>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="text-[10px] text-emerald-600 font-bold">{task.oreStimate}h</span>
                                                    <button onClick={() => rimuoviTaskDaPacchetto(task.id, pAct.id)} className="p-2 text-red-400 hover:text-red-600 shrink-0"><TrashIcon className="h-5 w-5" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                );
                            })()}
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <div className="w-[380px] flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden shrink-0">
                            <div className="bg-slate-50 p-4 border-b border-slate-200 shrink-0"><h2 className="text-sm font-black text-slate-700 uppercase flex items-center gap-2"><CalendarIcon className="h-5 w-5 text-indigo-500" /> Pianificazione Veloce</h2></div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                                {pacchetti.map(p => (
                                    <div key={p.id} className={`p-4 rounded-2xl border-2 bg-white shadow-sm space-y-3 transition-colors ${p.isFornitura ? 'border-amber-200' : 'border-slate-100 hover:border-indigo-200'}`}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }}></div>
                                            <h3 className="text-sm font-black text-slate-800 truncate">{p.nome}</h3>
                                            {p.isFornitura && <TruckIcon className="h-4 w-4 text-amber-500 shrink-0 ml-auto" />}
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">{p.isFornitura ? 'Data Arrivo' : '1° Intervento'}</label>
                                                <input type="date" value={formatLocalInputDate(p.dateInizio?.[0])} onChange={(e) => aggiornaProgrammazione(p.id, { primoIntervento: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            {!p.isFornitura && (
                                            <>
                                                <div>
                                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Frequenza</label>
                                                    <select value={p.frequenza} onChange={(e) => aggiornaProgrammazione(p.id, { frequenza: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700">
                                                        <option value="manuale">✍️ Manuale</option>
                                                        <option value="1_settimana">📅 1 Settimana</option>
                                                        <option value="15_gg">📅 15 Giorni</option>
                                                        <option value="3_settimane">📅 3 Settimane</option>
                                                        <option value="1_mese">🗓️ 1 Mese</option>
                                                        <option value="2_mesi">🗓️ 2 Mesi</option>
                                                        <option value="3_mesi">🗓️ 3 Mesi</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">N° Interventi</label>
                                                    <input type="number" min="1" value={p.ripetizioni} onChange={(e) => aggiornaProgrammazione(p.id, { ripetizioni: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-black text-indigo-700 text-center" />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1 text-truncate">Giorno Preferito</label>
                                                    <select value={p.giornoPreferito} onChange={(e) => aggiornaProgrammazione(p.id, { giornoPreferito: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700">
                                                        <option value="qualsiasi">🔄 Qualsiasi</option>
                                                        <option value="1">Lunedì</option>
                                                        <option value="2">Martedì</option>
                                                        <option value="3">Mercoledì</option>
                                                        <option value="4">Giovedì</option>
                                                        <option value="5">Venerdì</option>
                                                        <option value="6">Sabato</option>
                                                    </select>
                                                </div>
                                            </>
                                            )}
                                        </div>

                                        {!p.isFornitura && p.frequenza === 'manuale' && (
                                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 border-t pt-2">
                                                {Array.from({ length: p.ripetizioni }).map((_, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <span className="text-[9px] font-bold text-slate-400 w-4">{idx + 1}.</span>
                                                        <input type="date" value={formatLocalInputDate(p.dateInizio?.[idx])} onChange={(e) => impostaDataInizioRipetizione(p.id, idx, e.target.value)} className="flex-1 text-[10px] p-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 outline-none" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {!p.isFornitura && p.frequenza !== 'manuale' && p.dateInizio?.[0] && (
                                            <div className="px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-100 flex items-center gap-2">
                                                <SparklesIcon className="h-4 w-4 text-indigo-500 shrink-0" />
                                                <p className="text-[9px] font-bold text-indigo-700 leading-tight">Calcolo automatico in base alla frequenza.</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
                            <div className="flex bg-slate-800 text-white border-b border-slate-700 shrink-0 overflow-x-auto custom-scrollbar">
                                <div className="w-40 shrink-0 p-2 border-r border-slate-700 flex items-center justify-center font-bold text-[10px] uppercase text-slate-400">Lavorazioni / Forniture</div>
                                {timelineDays.map((date, i) => (
                                    <div key={i} className="w-12 shrink-0 border-r border-slate-700 p-1 flex flex-col items-center justify-center"><span className="text-[9px] text-slate-400 font-bold uppercase">{date.toLocaleDateString('it-IT', { weekday: 'short' })}</span><span className="text-xs font-black">{date.getDate()}</span></div>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar relative bg-slate-50/50">
                                {pacchetti.map(p => (
                                    <div key={p.id} className="flex border-b border-slate-200 hover:bg-slate-50 group min-h-[44px]">
                                        <div className="w-40 shrink-0 p-2 border-r border-slate-200 flex items-center gap-2 bg-white z-10 sticky left-0">
                                            {p.isFornitura ? <TruckIcon className="h-4 w-4 text-amber-500 shrink-0" /> : <WrenchScrewdriverIcon className="h-4 w-4 text-slate-400 shrink-0" />}
                                            <span className="text-[10px] font-black text-slate-700 leading-tight truncate">{p.nome}</span>
                                        </div>
                                        <div className="flex relative">
                                            {timelineDays.map((date, i) => {
                                                const timeTarget = date.getTime();
                                                const isPartenza = (p.dateInizio || []).find(d => {
                                                    if(!d) return false;
                                                    const cleanD = new Date(d);
                                                    cleanD.setHours(0,0,0,0);
                                                    return cleanD.getTime() === timeTarget;
                                                });
                                                return (
                                                    <div key={i} className={`w-12 shrink-0 border-r border-slate-100 flex items-center ${date.getDay() === 0 || date.getDay() === 6 ? 'bg-slate-100' : ''}`}>
                                                        {isPartenza && (
                                                            <div className="h-6 rounded-md shadow-sm z-10 flex items-center px-2 absolute min-w-max border border-black/10" style={{ backgroundColor: p.color, width: `calc(${p.giornateStimate} * 3rem)` }}>
                                                                {p.isFornitura ? <TruckIcon className="h-3 w-3 mr-1 text-amber-900" /> : null}
                                                                <span className={`text-[9px] font-black truncate ${p.isFornitura ? 'text-amber-900' : 'text-slate-800'}`}>{p.nome}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="shrink-0 bg-white border-t-2 border-slate-300 flex overflow-x-auto custom-scrollbar">
                                <div className="w-40 shrink-0 p-2 border-r border-slate-200 flex items-center justify-center bg-slate-50 sticky left-0 z-20"><span className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1"><ChartBarIcon className="h-4 w-4"/> Risorse (Operai)</span></div>
                                <div className="flex">
                                    {timelineDays.map((date, i) => {
                                        const risorse = getRisorseGiorno(date);
                                        const isOver = risorse > capacitaAziendale;
                                        return (
                                            <div key={i} className={`w-12 shrink-0 border-r border-slate-100 p-1 flex flex-col items-center justify-end h-16 ${date.getDay() === 0 || date.getDay() === 6 ? 'bg-slate-50' : ''}`}>
                                                <div className="w-full flex items-end justify-center h-8 mb-1">
                                                    {risorse > 0 && <div className={`w-6 rounded-t-sm transition-all ${isOver ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'}`} style={{ height: `${Math.min((risorse / capacitaAziendale) * 100, 100)}%` }}></div>}
                                                </div>
                                                <span className={`text-xs font-black ${isOver ? 'text-red-600' : (risorse > 0 ? 'text-emerald-700' : 'text-slate-300')}`}>{risorse}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* MODALE ANTEPRIMA ANNUALE */}
            {showPreview && (
                <div className="absolute inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-down">
                        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                    <CalendarDaysIcon className="h-6 w-6 text-indigo-600" /> Pianificazione Annuale (12 Mesi)
                                </h2>
                                <p className="text-xs text-slate-500 font-bold mt-1">
                                    I numeri nei blocchetti indicano il giorno del mese in cui è previsto l'intervento o la consegna.
                                </p>
                            </div>
                            <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-colors">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        
                        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 p-6">
                            <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
                                
                                <div className="flex bg-slate-800 text-white border-b border-slate-700 shrink-0">
                                    <div className="w-56 shrink-0 p-3 border-r border-slate-700 flex items-center justify-center font-bold text-xs uppercase text-slate-400">Macrogruppo</div>
                                    {mesiAnteprima.map((m, i) => (
                                        <div key={i} className="flex-1 border-r border-slate-700 p-2 flex flex-col items-center justify-center min-w-[60px]">
                                            <span className="text-xs font-black uppercase tracking-wider">{m.label}</span>
                                            <span className="text-[10px] text-slate-400 font-bold">{m.yearLabel}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex-1 overflow-y-auto">
                                    {pacchetti.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-400"><p className="font-bold">Nessun macrogruppo programmato</p></div>
                                    ) : (
                                        pacchetti.map(p => (
                                            <div key={p.id} className="flex border-b border-slate-200 hover:bg-slate-50 min-h-[56px] transition-colors">
                                                <div className="w-56 shrink-0 p-3 border-r border-slate-200 flex items-center gap-2 bg-white z-10 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                    {p.isFornitura ? <TruckIcon className="h-4 w-4 text-amber-500 shrink-0" /> : null}
                                                    <span className="text-xs font-black text-slate-700 leading-snug line-clamp-2">{p.nome}</span>
                                                </div>
                                                <div className="flex flex-1">
                                                    {mesiAnteprima.map((m, i) => {
                                                        const interventiMese = (p.dateInizio || []).filter(d => {
                                                            if (!d) return false;
                                                            const dateObj = new Date(d);
                                                            return dateObj.getMonth() === m.month && dateObj.getFullYear() === m.year;
                                                        });
                                                        
                                                        return (
                                                            <div key={i} className={`flex-1 border-r border-slate-100 p-1.5 flex flex-wrap content-center justify-start gap-1.5 min-w-[60px] ${interventiMese.length > 0 ? 'bg-indigo-50/10' : ''}`}>
                                                                {interventiMese.map((d, idx) => (
                                                                    <div 
                                                                        key={idx} 
                                                                        className="text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm border border-black/10 flex items-center justify-center cursor-help hover:scale-110 transition-transform"
                                                                        style={{ backgroundColor: p.color, color: p.isFornitura ? '#78350f' : '#1e293b' }}
                                                                        title={`${new Date(d).toLocaleDateString('it-IT')} - ${p.nome}`}
                                                                    >
                                                                        {new Date(d).getDate()}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="shrink-0 bg-white border-t-2 border-slate-300 flex">
                                    <div className="w-56 shrink-0 p-3 border-r border-slate-200 flex items-center justify-center bg-slate-50 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                        <span className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1"><ChartBarIcon className="h-4 w-4"/> Budget Ore Mensile</span>
                                    </div>
                                    <div className="flex flex-1">
                                        {mesiAnteprima.map((m, i) => {
                                            let oreMese = 0;
                                            pacchetti.forEach(p => {
                                                if (p.isFornitura) return; 
                                                const numInterventi = (p.dateInizio || []).filter(d => {
                                                    if (!d) return false;
                                                    const dateObj = new Date(d);
                                                    return dateObj.getMonth() === m.month && dateObj.getFullYear() === m.year;
                                                }).length;
                                                if (numInterventi > 0) oreMese += (calcolaOreSingoloIntervento(p.task) * numInterventi);
                                            });

                                            return (
                                                <div key={i} className="flex-1 border-r border-slate-100 p-2 flex flex-col items-center justify-center min-w-[60px] bg-slate-50">
                                                    {oreMese > 0 ? (
                                                        <span className="text-sm font-black text-indigo-600">{oreMese}h</span>
                                                    ) : (
                                                        <span className="text-xs font-bold text-slate-300">-</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};