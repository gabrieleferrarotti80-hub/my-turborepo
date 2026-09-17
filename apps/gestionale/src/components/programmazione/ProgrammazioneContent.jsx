import React, { useState, useMemo } from 'react';
import { deleteDoc, doc } from 'firebase/firestore'; 
import { 
    useFirebaseData, 
    useProgrammazioneManager,
    usePublishManager,
    useAssegnazioniCantiereManager, 
    getPermissionsByRole 
} from 'shared-core';
import { 
    ArrowPathIcon, ChartBarIcon, ExclamationTriangleIcon, CheckCircleIcon,
    MagnifyingGlassIcon, CalendarDaysIcon, NoSymbolIcon, CheckIcon, UserIcon, XMarkIcon
} from '@heroicons/react/24/solid';
import { 
    TimelineScheduler, 
    GanttView, 
    PlanningToolbar, 
    PlannerSidebar,
    TaskEditorModal,
    calcolaDataFineReale,
} from 'shared-ui'; 

export const ProgrammazioneContent = () => {

    const [mainTab, setMainTab] = useState('pianificazione'); 

    const [selectedTask, setSelectedTask] = useState(null);
    const [modalita, setModalita] = useState('programmazione'); 
    const [visione, setVisione] = useState('risorsa');
    const [zoom, setZoom] = useState('week');

    const { db, data, loadingData, userRole, companyID, companyFeatures, user } = useFirebaseData();
    const permissions = getPermissionsByRole(userRole);

    const { isLoading: isSimLoading, createTask, updateTask, moveTaskAndDetectConflicts, deleteTask } = useProgrammazioneManager(); 
    const { isPublishing, publishBozza } = usePublishManager(db, companyID); 
    
    // 🌟 FIX: Usiamo l'hook corretto per le assegnazioni in cantiere!
    const { createAssegnazioneCantiere, updateAssegnazioneCantiere, isLoading: isAssegnaLoading } = useAssegnazioniCantiereManager(db, user, companyID, data.users, data.cantieri, data.subcantieri);

    const isSuperAdmin = userRole === 'proprietario' && !companyID;
    const hasFeature = companyFeatures?.programmazione_operativa === true;
    const hasPermission = permissions.canViewProgrammazione === true;
    const hasAccess = isSuperAdmin || (hasFeature && hasPermission);
    const canManage = isSuperAdmin || permissions.canManageProgrammazione === true;

    // --- MAPPE E DATI ---
    const cantieriMap = useMemo(() => {
        return new Map((data.cantieri || []).map(c => [c.id, c.nomeCantiere || c.nome || c.titolo || 'Cantiere Sconosciuto']));
    }, [data.cantieri]);
    
    const risorsePerTimeline = useMemo(() => {
        if (loadingData) return [];
        return (data.users || []).map(u => ({ id: u.id, title: `${u.nome || ''} ${u.cognome || ''}`.trim() || 'Utente Sconosciuto' }));
    }, [data.users, loadingData]);

    const tasksPerTimeline = useMemo(() => {
        if (modalita === 'cronoprogramma') return mapCronoprogrammaToEvents(data.programmazioneLive || [], cantieriMap);
        return mapProgrammazioneToEvents(data.programmazione || [], cantieriMap);
    }, [modalita, data.programmazione, data.programmazioneLive, cantieriMap]);
    
    const capacityPlanning = useMemo(() => {
        if (loadingData) return { settimanale: { capacita: 0, carico: 0, sat: 0 }, mensile: { capacita: 0, carico: 0, sat: 0 }, trimestrale: { capacita: 0, carico: 0, sat: 0 }};

        const today = new Date(); today.setHours(0,0,0,0);
        const in7Days = new Date(today); in7Days.setDate(in7Days.getDate() + 7);
        const in30Days = new Date(today); in30Days.setDate(in30Days.getDate() + 30);
        const in90Days = new Date(today); in90Days.setDate(in90Days.getDate() + 90);

        const numeroOperatori = risorsePerTimeline.length;
        const capacita7Giorni = numeroOperatori * 40; 
        const capacita30Giorni = numeroOperatori * 160;
        const capacita90Giorni = numeroOperatori * 480;

        let carico7Giorni = 0, carico30Giorni = 0, carico90Giorni = 0;
        const tasksDaValutare = data.programmazione || [];

        tasksDaValutare.forEach(task => {
            if (!task.dataInizio) return;
            const start = task.dataInizio.toDate ? task.dataInizio.toDate() : new Date(task.dataInizio);
            const numPersoneAssegnate = task.risorseAssegnate?.personale?.length || 1;
            const oreConsumate = (Number(task.durataOre) || 8) * numPersoneAssegnate;

            if (start >= today) {
                if (start <= in7Days) carico7Giorni += oreConsumate;
                if (start <= in30Days) carico30Giorni += oreConsumate;
                if (start <= in90Days) carico90Giorni += oreConsumate;
            }
        });

        return {
            settimanale: { capacita: capacita7Giorni, carico: carico7Giorni, sat: capacita7Giorni > 0 ? Math.round((carico7Giorni / capacita7Giorni) * 100) : 0 },
            mensile: { capacita: capacita30Giorni, carico: carico30Giorni, sat: capacita30Giorni > 0 ? Math.round((carico30Giorni / capacita30Giorni) * 100) : 0 },
            trimestrale: { capacita: capacita90Giorni, carico: carico90Giorni, sat: capacita90Giorni > 0 ? Math.round((carico90Giorni / capacita90Giorni) * 100) : 0 }
        };
    }, [data.programmazione, risorsePerTimeline, loadingData]);

    const subcantieriDaProgrammare = useMemo(() => {
        const programmedCounts = (data.programmazione || []).reduce((acc, t) => { if(t.faseId) acc[t.faseId] = (acc[t.faseId] || 0) + 1; return acc; }, {});
        return (data.subcantieri || []).filter(s => s.stato !== 'completato' && s.stato !== 'chiuso').map(sub => {
            const rawNome = sub.nomeSubcantiere || sub.nome || sub.titolo || 'Fase senza nome';
            const previsti = Number(sub.interventiPrevisti) || 1;
            const programmati = programmedCounts[sub.id] || 0;
            return {
                ...sub, 
                nomeOriginale: rawNome, 
                nome: previsti > 1 ? `${formatPhaseName(rawNome)} (${programmati}/${previsti})` : formatPhaseName(rawNome), 
                cantiereNome: cantieriMap.get(sub.cantiereGenitoreId || sub.cantiereId) || 'Cantiere Sconosciuto', 
                cantiereGenitoreId: sub.cantiereGenitoreId || sub.cantiereId,
                isProgrammed: programmati >= previsti,
                interventiProgrammati: programmati,
                interventiPrevisti: previsti
            };
        });
    }, [data.subcantieri, data.programmazione, cantieriMap]);

    const cantieriDaProgrammare = useMemo(() => (data.cantieri || []).filter(c => !['chiuso', 'archiviato', 'completato'].includes(c.stato)), [data.cantieri]);

    // --- GESTIONE GANTT E CALENDARIO ---
    const currentGanttResources = useMemo(() => {
        if (loadingData) return [];
        return cantieriDaProgrammare.map(c => {
            const fasi = subcantieriDaProgrammare.filter(s => (s.cantiereGenitoreId || s.cantiereId) === c.id);
            const children = fasi.map(f => ({ id: f.id, title: f.nome }));
            children.unshift({ id: 'generale_' + c.id, title: '📍 Attività Generali' });
            return { id: c.id, title: c.nomeCantiere || c.nome || c.titolo || 'Cantiere Senza Nome', expanded: false, children: children };
        });
    }, [loadingData, cantieriDaProgrammare, subcantieriDaProgrammare]);

    const currentGanttTasks = useMemo(() => {
        const src = modalita === 'cronoprogramma' ? (data.programmazioneLive || []) : (data.programmazione || []);
        const getRowIdForTask = (task) => {
            if (task.faseId && subcantieriDaProgrammare.find(s => s.id === task.faseId)) return task.faseId;
            return 'generale_' + task.cantiereId;
        };
        const eventiOperativi = mapTasksToGanttEvents(src, 'titolo', getRowIdForTask, modalita === 'cronoprogramma');
        const milestonesCantieri = createMasterMilestones(cantieriDaProgrammare);
        return [...eventiOperativi, ...milestonesCantieri];
    }, [modalita, data.programmazione, data.programmazioneLive, cantieriDaProgrammare, subcantieriDaProgrammare]);

    // 🌟 GESTIONE CLICK
    const handleTaskClick = (...args) => {
        let compositeId = null;

        for (const arg of args) {
            if (!arg) continue;
            if (typeof arg === 'string' && arg.trim() !== '') {
                compositeId = arg;
                break;
            }
            if (typeof arg === 'object') {
                compositeId = arg.event?.id || arg.event?.groupId || arg.id || arg.taskId || arg.task?.id || arg.data?.id;
                if (compositeId) break;
                
                if (arg.nativeEvent || arg.target || arg.currentTarget) {
                    const target = arg.currentTarget || arg.target;
                    if (target && target.closest) {
                        const eventEl = target.closest('.fc-event, [data-task-id], [data-id], .rct-item, .gantt_task_line');
                        if (eventEl) {
                            compositeId = eventEl.getAttribute('data-task-id') || eventEl.getAttribute('data-id') || eventEl.getAttribute('task_id');
                            if (!compositeId && eventEl.getAttribute('data-event')) {
                                try {
                                    const parsed = JSON.parse(eventEl.getAttribute('data-event'));
                                    compositeId = parsed.id || parsed.groupId || parsed.taskId;
                                } catch(e) {}
                            }
                        }
                    }
                }
                if (compositeId) break;
            }
        }

        if (!compositeId || String(compositeId).trim() === '') return; 

        const idStr = String(compositeId).trim();
        
        if (idStr.startsWith('cantiere_bg_') || idStr.startsWith('milestone_') || idStr.includes('unassigned')) return;

        let realTaskId = idStr.includes('_') ? idStr.split('_')[0] : idStr;
        
        const task = (data.programmazione || []).find(t => String(t.id) === realTaskId) || 
                     (data.programmazioneLive || []).find(t => String(t.id) === realTaskId);

        if (task) {
            setSelectedTask(task); 
        } else {
            console.warn(`Lavoro ignorato o non trovato. ID cercato: ${realTaskId}`);
        }
    };

    const handlePhaseClickFromSidebar = (subcantiere) => {
        if (subcantiere.interventiProgrammati >= subcantiere.interventiPrevisti) {
            alert(`Tutti gli interventi (${subcantiere.interventiPrevisti}) per questa fase sono già stati programmati.`);
            return;
        }

        const durataOre = subcantiere.durataStimata || 8;
        const titoloIntervento = subcantiere.interventiPrevisti > 1 
            ? `${subcantiere.nomeOriginale} (Ciclo ${subcantiere.interventiProgrammati + 1} di ${subcantiere.interventiPrevisti})` 
            : subcantiere.nomeOriginale;

        const defaultStart = new Date();
        defaultStart.setHours(8, 0, 0, 0);

        setSelectedTask({
            id: 'DRAFT_TASK', 
            isNew: true,
            faseId: subcantiere.id, 
            cantiereId: subcantiere.cantiereGenitoreId || subcantiere.cantiereId,
            titolo: titoloIntervento, 
            dataInizio: defaultStart, 
            dataFine: calcolaDataFineReale(defaultStart, durataOre), 
            durataOre: durataOre,
            risorseAssegnate: { 
                personale: [], 
                automezzi: subcantiere.risorseRichieste?.automezzi || [], 
                attrezzature: subcantiere.risorseRichieste?.attrezzature || [] 
            },
            stato: 'bozza',
        });
    };

    const handleDeletePhaseFromSidebar = async (fase) => {
        if (!confirm(`Sei sicuro di voler eliminare definitivamente la fase "${fase.nomeOriginale}"? \n\nI task già programmati rimarranno, ma la fase non sarà più disponibile per nuove programmazioni.`)) return;
        try { await deleteDoc(doc(db, 'subcantieri', fase.id)); } catch (error) { alert("Si è verificato un errore durante l'eliminazione."); }
    };

    const handleTaskMove = async (info) => {
        const { taskId: compositeTaskId, newStart, newResourceId } = info; 
        const realTaskId = compositeTaskId.split('_')[0];
        const originalTaskData = data.programmazione.find(t => t.id === realTaskId);
        if (!originalTaskData) return; 
        
        const durataOre = originalTaskData.durataOre || 8; 
        const dataFineCalcolata = calcolaDataFineReale(newStart, durataOre);
        
        let updatedResources = { ...originalTaskData.risorseAssegnate };
        const extraUpdates = { durataOre: durataOre };

        if (visione === 'risorsa') {
            const oldResourceId = compositeTaskId.split('_')[1]; 
            const currentPersonale = originalTaskData.risorseAssegnate?.personale || [];
            let updatedPersonale;
            if (newResourceId && newResourceId !== oldResourceId) {
                updatedPersonale = currentPersonale.filter(id => id !== oldResourceId);
                if (!updatedPersonale.includes(newResourceId)) updatedPersonale.push(newResourceId);
            } else { updatedPersonale = [...currentPersonale]; }
            updatedResources.personale = updatedPersonale;
        } else {
            if (newResourceId) {
                if (newResourceId.startsWith('generale_')) {
                    extraUpdates.faseId = null; extraUpdates.cantiereId = newResourceId.replace('generale_', '');
                } else if (cantieriDaProgrammare.some(c => c.id === newResourceId)) {
                    extraUpdates.faseId = null; extraUpdates.cantiereId = newResourceId;
                } else {
                    extraUpdates.faseId = newResourceId;
                    const fase = subcantieriDaProgrammare.find(s => s.id === newResourceId);
                    if (fase) extraUpdates.cantiereId = fase.cantiereGenitoreId || fase.cantiereId;
                }
            }
        }
        await moveTaskAndDetectConflicts(realTaskId, newStart, dataFineCalcolata, updatedResources, extraUpdates, data.programmazione || []);
    };
    
    const handleExternalDrop = async (info) => {
        if (info.faseId) await handleSubcantiereDrop(info.faseId, info);
        else if (info.cantiereId) await handleCantiereDrop(info.cantiereId, info);
    };
    
    const handleSubcantiereDrop = async (subcantiereId, dropInfo) => {
        const { newStart, newResourceId } = dropInfo;
        const subcantiere = subcantieriDaProgrammare.find(s => s.id === subcantiereId);
        if (!subcantiere) return;
        
        if (subcantiere.interventiProgrammati >= subcantiere.interventiPrevisti) {
            alert(`Tutti gli interventi (${subcantiere.interventiPrevisti}) per questa fase sono già stati programmati.`);
            return;
        }

        const durataOre = subcantiere.durataStimata || 8; 
        const personaleIncluso = new Set();
        if (visione === 'risorsa' && newResourceId) personaleIncluso.add(newResourceId);
        
        const titoloIntervento = subcantiere.interventiPrevisti > 1 
            ? `${subcantiere.nomeOriginale} (Ciclo ${subcantiere.interventiProgrammati + 1} di ${subcantiere.interventiPrevisti})` 
            : subcantiere.nomeOriginale;

        await createTask({
            faseId: subcantiere.id, 
            cantiereId: subcantiere.cantiereGenitoreId || subcantiere.cantiereId,
            titolo: titoloIntervento, 
            dataInizio: newStart, 
            dataFine: calcolaDataFineReale(newStart, durataOre), 
            durataOre: durataOre,
            risorseAssegnate: { personale: Array.from(personaleIncluso), automezzi: subcantiere.risorseRichieste?.automezzi || [], attrezzature: subcantiere.risorseRichieste?.attrezzature || [] },
            stato: 'bozza',
        });
    };

    const handleCantiereDrop = async (cantiereId, dropInfo) => {
        const { newStart, newResourceId } = dropInfo;
        const fasiDelCantiere = subcantieriDaProgrammare.filter(s => (s.cantiereGenitoreId || s.cantiereId) === cantiereId && !s.isProgrammed); 
        if (fasiDelCantiere.length === 0) return alert("Nessuna fase operativa da programmare per questo cantiere.");
        
        let dataInizioCorrente = new Date(newStart);
        for (const subcantiere of fasiDelCantiere) {
            if (subcantiere.interventiProgrammati >= subcantiere.interventiPrevisti) continue;

            const durataOre = subcantiere.durataStimata || 8;
            const dataFineCalcolata = calcolaDataFineReale(dataInizioCorrente, durataOre);
            const personaleIncluso = new Set();
            if (visione === 'risorsa' && newResourceId) personaleIncluso.add(newResourceId);
            
            const titoloIntervento = subcantiere.interventiPrevisti > 1 ? `${subcantiere.nomeOriginale} (Ciclo ${subcantiere.interventiProgrammati + 1} di ${subcantiere.interventiPrevisti})` : subcantiere.nomeOriginale;

            await createTask({
                faseId: subcantiere.id, cantiereId: subcantiere.cantiereGenitoreId || subcantiere.cantiereId,
                titolo: titoloIntervento, dataInizio: dataInizioCorrente, dataFine: dataFineCalcolata, durataOre: durataOre,
                risorseAssegnate: { personale: Array.from(personaleIncluso), automezzi: subcantiere.risorseRichieste?.automezzi || [], attrezzature: subcantiere.risorseRichieste?.attrezzature || [] },
                stato: 'bozza',
            });
            dataInizioCorrente = dataFineCalcolata;
        }
    };
    
    const handleSaveTask = async (taskId, updatedFields) => { 
        if (!taskId) return; 
        if (taskId === 'DRAFT_TASK') {
            await createTask(updatedFields); 
        } else {
            await updateTask(taskId, updatedFields); 
        }
        setSelectedTask(null); 
    };

    const handleDeleteTask = async (taskId) => { await deleteTask(taskId); setSelectedTask(null); };
    
    const handlePublish = async () => {
        const tasksValidi = (data.programmazione || []).filter(t => t.stato !== 'assegnato');
        if (confirm(`Pubblicare ${tasksValidi.length} task nel Cronoprogramma?`)) await publishBozza(data.programmazione || []);
    };
    
    // 🌟 FIX: INVIO ASSEGNAZIONE COMPLETO (Anti-Undefined)
    const handleInviaAssegnazione = async (taskOrData) => { 
        if (!taskOrData) return;
        try {
            console.log("📤 Avvio assegnazione per:", taskOrData);
            
            // 1. Estrazione dipendenti dal task
            const personaleIds = taskOrData.risorseAssegnate?.personale || [];
            const prepostoId = personaleIds.length > 0 ? personaleIds[0] : '';
            const operaiIds = personaleIds.length > 1 ? personaleIds.slice(1) : [];

            // 2. Prepariamo i dati esatti richiesti dall'hook del Cantiere
            const datiAssegnazione = {
                cantiereId: taskOrData.cantiereId,
                faseId: taskOrData.faseId,
                dataInizio: taskOrData.dataInizio, 
                dataFine: taskOrData.dataFine,
                durataOre: taskOrData.durataOre || 8,
                tecnicoId: '', // Opzionale
                prepostoId: prepostoId,
                operaiIds: operaiIds,
                automezziIds: taskOrData.risorseAssegnate?.automezzi || [],
            };

            // 3. Creiamo l'assegnazione vera e propria
            const res = await createAssegnazioneCantiere(datiAssegnazione);
            
            if (res.success) {
                // 4. Aggiorniamo lo stato del mattoncino passando TUTTI i dati per evitare crash di Firebase
                if (taskOrData.id && taskOrData.id !== 'DRAFT_TASK') {
                    await updateTask(taskOrData.id, { 
                        ...taskOrData,       // 🌟 FIX: Passiamo titolo, date e tutto il resto
                        stato: 'assegnato'   // Sovrascriviamo solo lo stato
                    });
                }
                setSelectedTask(null);
                alert("✅ Squadra assegnata con successo!");
            } else {
                alert("Errore dal server: " + res.message);
            }
        } catch(e) {
            console.error("Errore critico durante l'invio:", e);
            alert("Errore durante l'assegnazione: " + e.message);
        }
    };
    
    const handleTerminaAssegnazione = async (id) => {
        if (!confirm("Sei sicuro di voler terminare questa assegnazione da oggi?")) return;
        const oggiStr = new Date().toISOString().split('T')[0];
        await updateAssegnazioneCantiere(id, { dataFine: oggiStr });
    };

    const handleProrogaAssegnazione = async (id, nuovaData) => {
        if (nuovaData) { await updateAssegnazioneCantiere(id, { dataFine: nuovaData }); }
    };

    if (loadingData) return <div className="flex justify-center items-center h-48"><ArrowPathIcon className="animate-spin h-8 w-8 text-indigo-500" /><span className="ml-4 text-gray-500">Caricamento...</span></div>;
    if (!hasAccess) return <div className="p-8 text-center"><h2 className="text-xl font-bold text-red-600">Accesso Negato</h2></div>;

    const getSatColor = (sat) => {
        if (sat > 100) return 'bg-red-500';
        if (sat > 85) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <div className="flex flex-col h-full w-full relative bg-white">
            
            {(isSimLoading || isPublishing || isAssegnaLoading) && (
                <div className="absolute inset-0 flex justify-center items-center bg-white/75 backdrop-blur-sm z-[9999]">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center">
                        <ArrowPathIcon className="animate-spin h-10 w-10 text-indigo-600 mb-4" />
                        <span className="text-gray-900 font-bold">Elaborazione in corso...</span>
                    </div>
                </div>
            )}
            
            <div className="flex bg-gray-50 border-b border-gray-200 px-6 gap-2 pt-2">
                <button onClick={() => setMainTab('pianificazione')} className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-colors ${mainTab === 'pianificazione' ? 'bg-white text-indigo-700 border-t border-x border-gray-200 shadow-[0_-2px_4px_rgba(0,0,0,0.02)] relative top-[1px]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>Pianificazione (Gantt)</button>
                <button onClick={() => setMainTab('assegnazioni')} className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-colors ${mainTab === 'assegnazioni' ? 'bg-white text-indigo-700 border-t border-x border-gray-200 shadow-[0_-2px_4px_rgba(0,0,0,0.02)] relative top-[1px]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>Elenco Assegnazioni Personale</button>
            </div>

            {mainTab === 'pianificazione' && (
                <div className="flex flex-col flex-1 overflow-hidden animate-fade-in">
                    <PlanningToolbar modalitaCorrente={modalita} visioneCorrente={visione} zoomCorrente={zoom} canManage={canManage} onModalitaToggle={setModalita} onVisioneToggle={setVisione} onZoomToggle={setZoom} onPublish={handlePublish} isPublishing={isPublishing} labelModalita1="Programmazione" labelModalita2="Cronoprogramma" />
                    
                    {canManage && modalita === 'programmazione' && (
                        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-6 shadow-inner">
                            <div className="flex items-center gap-2 text-gray-700 font-bold min-w-max"><ChartBarIcon className="h-6 w-6 text-indigo-600" /><span>Saturazione Aziendale (Capacity)</span></div>
                            <div className="flex gap-6 flex-1 w-full max-w-4xl">
                                <div className="flex-1"><div className="flex justify-between text-xs mb-1 font-medium"><span className="text-gray-600 uppercase">Prossimi 7 gg</span><span className={capacityPlanning.settimanale.sat > 100 ? 'text-red-600 font-bold' : 'text-gray-600'}>{capacityPlanning.settimanale.carico}h / {capacityPlanning.settimanale.capacita}h ({capacityPlanning.settimanale.sat}%)</span></div><div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden flex"><div className={`h-2 rounded-full ${getSatColor(capacityPlanning.settimanale.sat)}`} style={{ width: `${Math.min(capacityPlanning.settimanale.sat, 100)}%` }}></div></div></div>
                                <div className="flex-1"><div className="flex justify-between text-xs mb-1 font-medium"><span className="text-gray-600 uppercase">Prossimi 30 gg</span><span className={capacityPlanning.mensile.sat > 100 ? 'text-red-600 font-bold' : 'text-gray-600'}>{capacityPlanning.mensile.carico}h / {capacityPlanning.mensile.capacita}h ({capacityPlanning.mensile.sat}%)</span></div><div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden flex"><div className={`h-2 rounded-full ${getSatColor(capacityPlanning.mensile.sat)}`} style={{ width: `${Math.min(capacityPlanning.mensile.sat, 100)}%` }}></div></div></div>
                                <div className="flex-1"><div className="flex justify-between text-xs mb-1 font-medium"><span className="text-gray-600 uppercase">Prossimi 90 gg</span><span className={capacityPlanning.trimestrale.sat > 100 ? 'text-red-600 font-bold' : 'text-gray-600'}>{capacityPlanning.trimestrale.carico}h / {capacityPlanning.trimestrale.capacita}h ({capacityPlanning.trimestrale.sat}%)</span></div><div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden flex"><div className={`h-2 rounded-full ${getSatColor(capacityPlanning.trimestrale.sat)}`} style={{ width: `${Math.min(capacityPlanning.trimestrale.sat, 100)}%` }}></div></div></div>
                            </div>
                            <div className="min-w-max ml-2">
                                {(capacityPlanning.settimanale.sat > 100 || capacityPlanning.mensile.sat > 100 || capacityPlanning.trimestrale.sat > 100) ? (
                                    <div className="flex items-center gap-1 text-red-600 text-sm font-bold bg-red-50 px-3 py-1 rounded border border-red-200"><ExclamationTriangleIcon className="h-5 w-5" /> Sovraccarico</div>
                                ) : (
                                    <div className="flex items-center gap-1 text-green-600 text-sm font-bold bg-green-50 px-3 py-1 rounded border border-green-200"><CheckCircleIcon className="h-5 w-5" /> Capacità Ottimale</div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-1 overflow-hidden flex-col">
                        <div className="flex flex-1 overflow-hidden">
                            {modalita === 'programmazione' && canManage && (
                                <PlannerSidebar cantieri={cantieriDaProgrammare} subcantieri={subcantieriDaProgrammare} isLoading={loadingData} onPhaseClick={handlePhaseClickFromSidebar} onDeletePhase={handleDeletePhaseFromSidebar} />
                            )}
                            <div className="flex-1 overflow-auto p-4">
                                {visione === 'risorsa' ? (
                                    <TimelineScheduler tasks={tasksPerTimeline} resources={risorsePerTimeline} view={zoom} isReadOnly={modalita === 'cronoprogramma' || !canManage} onTaskMove={handleTaskMove} onTaskCreate={handleExternalDrop} onTaskClick={handleTaskClick} onEventClick={handleTaskClick} eventClick={handleTaskClick} onClick={handleTaskClick} onSelect={handleTaskClick}/>
                                ) : (
                                    <GanttView tasks={currentGanttTasks} resources={currentGanttResources} view={zoom} isReadOnly={modalita === 'cronoprogramma' || !canManage} onTaskClick={handleTaskClick} onTaskMove={handleTaskMove} onTaskCreate={handleExternalDrop} onEventClick={handleTaskClick} eventClick={handleTaskClick} onClick={handleTaskClick} onSelect={handleTaskClick}/>
                                )}
                            </div>
                        </div>
                    </div>

                    <TaskEditorModal isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} onSave={handleSaveTask} onDelete={handleDeleteTask} onInviaAssegnazione={handleInviaAssegnazione} taskToEdit={selectedTask} allUsers={data.users || []} allEquipment={data.attrezzature || []} />
                </div>
            )}

            {mainTab === 'assegnazioni' && (
                <ElencoAssegnazioniView assegnazioni={data.assegnazioniCantieri || []} users={data.users || []} cantieriMap={cantieriMap} subcantieri={data.subcantieri || []} onTermina={handleTerminaAssegnazione} onProroga={handleProrogaAssegnazione} canManage={canManage} />
            )}
        </div>
    );
};

// =========================================================
// COMPONENTE: VISTA ELENCO ASSEGNAZIONI (Tabella)
// =========================================================
const ElencoAssegnazioniView = ({ assegnazioni, users, cantieriMap, subcantieri, onTermina, onProroga, canManage }) => {
    
    const [filtroCantiere, setFiltroCantiere] = useState('');
    const [filtroUtente, setFiltroUtente] = useState('');
    const [filtroStato, setFiltroStato] = useState('attive'); 

    const [prorogaConfig, setProrogaConfig] = useState({ isOpen: false, id: null, currentData: '', isLoading: false });

    const getLocalYYYYMMDD = (dateVal) => {
        if (!dateVal) return '';
        const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const openProrogaModal = (id, dataAttuale) => {
        const localDateStr = getLocalYYYYMMDD(dataAttuale);
        setProrogaConfig({ isOpen: true, id, currentData: localDateStr, isLoading: false });
    };

    const confirmProroga = async () => {
        if (!prorogaConfig.currentData || !prorogaConfig.id) return;
        
        setProrogaConfig(prev => ({ ...prev, isLoading: true }));
        try {
            await onProroga(prorogaConfig.id, prorogaConfig.currentData);
        } catch (error) {
            console.error("Errore durante la proroga:", error);
            alert("Si è verificato un errore durante l'aggiornamento della data.");
        } finally {
            setProrogaConfig({ isOpen: false, id: null, currentData: '', isLoading: false });
        }
    };

    const formatDate = (dateStrOrTimestamp) => {
        if (!dateStrOrTimestamp) return '-';
        const d = dateStrOrTimestamp.toDate ? dateStrOrTimestamp.toDate() : new Date(dateStrOrTimestamp);
        return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('it-IT');
    };

    const dipendentiList = useMemo(() => {
        return users.filter(u => ['preposto', 'dipendente', 'operaio', 'tecnico'].includes(u.ruolo?.toLowerCase())).sort((a,b) => a.cognome?.localeCompare(b.cognome));
    }, [users]);

    const tableData = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);

        return assegnazioni.map(ass => {
            const allUserIds = new Set([
                ass.tecnicoId, 
                ass.prepostoId, 
                ...(ass.operaiIds || []), 
                ...(ass.ulterioriDipendentiIds || []),
                ...(ass.teamMemberIds || [])
            ].filter(Boolean));

            const userNames = Array.from(allUserIds).map(id => {
                const u = users.find(user => user.id === id);
                return u ? `${u.nome} ${u.cognome}` : 'Utente rimosso';
            });

            const nomeCantiere = cantieriMap.get(ass.cantiereId) || 'Cantiere Sconosciuto';
            const fase = subcantieri.find(s => s.id === ass.faseId)?.nomeSubcantiere || '-';

            let isAttiva = true;
            if (ass.stato === 'terminata' || ass.stato === 'chiusa') {
                isAttiva = false;
            } else if (ass.dataFine) {
                const endD = ass.dataFine.toDate ? ass.dataFine.toDate() : new Date(ass.dataFine);
                if (endD < today) isAttiva = false;
            }

            return { ...ass, allUserIds: Array.from(allUserIds), userNames, nomeCantiere, fase, isAttiva };
        })
        .filter(ass => {
            if (filtroStato === 'attive' && !ass.isAttiva) return false;
            if (filtroCantiere && ass.cantiereId !== filtroCantiere) return false;
            if (filtroUtente && !ass.allUserIds.includes(filtroUtente)) return false;
            return true;
        })
        .sort((a, b) => {
            const daA = a.dataInizio?.toDate ? a.dataInizio.toDate() : new Date(a.dataInizio || 0);
            const daB = b.dataInizio?.toDate ? b.dataInizio.toDate() : new Date(b.dataInizio || 0);
            return daB - daA;
        });
    }, [assegnazioni, users, cantieriMap, subcantieri, filtroStato, filtroCantiere, filtroUtente]);

    return (
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden animate-fade-in p-6 relative">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Filtra per Cantiere</label>
                    <select value={filtroCantiere} onChange={e => setFiltroCantiere(e.target.value)} className="w-full p-2 border border-gray-300 rounded-xl bg-gray-50 text-sm font-bold text-gray-800">
                        <option value="">Tutti i Cantieri</option>
                        {Array.from(cantieriMap.entries()).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Filtra per Dipendente</label>
                    <select value={filtroUtente} onChange={e => setFiltroUtente(e.target.value)} className="w-full p-2 border border-gray-300 rounded-xl bg-gray-50 text-sm font-bold text-gray-800">
                        <option value="">Tutti i Dipendenti</option>
                        {dipendentiList.map(u => <option key={u.id} value={u.id}>{u.cognome} {u.nome}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mostra Stato</label>
                    <select value={filtroStato} onChange={e => setFiltroStato(e.target.value)} className="w-full p-2 border border-gray-300 rounded-xl bg-gray-50 text-sm font-bold text-gray-800">
                        <option value="attive">Solo Attive</option>
                        <option value="tutte">Tutto lo Storico</option>
                    </select>
                </div>
                <button onClick={() => { setFiltroCantiere(''); setFiltroUtente(''); setFiltroStato('attive'); }} className="p-2 px-4 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl h-[38px] transition-colors">
                    Resetta Filtri
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Cantiere / Fase</th>
                                <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Personale Assegnato</th>
                                <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Periodo</th>
                                <th className="px-6 py-3 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Stato</th>
                                {canManage && <th className="px-6 py-3 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Azioni</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {tableData.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 italic">
                                        Nessuna assegnazione trovata con i filtri correnti.
                                    </td>
                                </tr>
                            ) : (
                                tableData.map(ass => (
                                    <tr key={ass.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-gray-900">{ass.nomeCantiere}</div>
                                            {ass.fase !== '-' && <div className="text-xs text-gray-500 mt-1">Fase: {ass.fase}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {ass.userNames.map((name, i) => (
                                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                                                        <UserIcon className="h-3 w-3" /> {name}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">Dal: <strong>{formatDate(ass.dataInizio)}</strong></div>
                                            <div className="text-sm font-medium text-gray-900">Al: <strong>{formatDate(ass.dataFine)}</strong></div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {ass.isAttiva ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">Attiva</span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">Chiusa / Scaduta</span>
                                            )}
                                        </td>
                                        {canManage && (
                                            <td className="px-6 py-4 text-center">
                                                {ass.isAttiva && (
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => openProrogaModal(ass.id, ass.dataFine)} className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-lg transition-colors border border-blue-200 flex items-center gap-1"><CalendarDaysIcon className="h-4 w-4" /> Proroga</button>
                                                        <button onClick={() => onTermina(ass.id)} className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 font-bold text-xs rounded-lg transition-colors border border-red-200">Termina Ora</button>
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODALE PROROGA ASSEGNAZIONE */}
            {prorogaConfig.isOpen && (
                <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-slide-up">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2"><CalendarDaysIcon className="h-6 w-6 text-blue-600" /> Proroga Assegnazione</h3>
                            {!prorogaConfig.isLoading && (<button onClick={() => setProrogaConfig({ isOpen: false, id: null, currentData: '', isLoading: false })} className="p-1 bg-gray-100 rounded-full text-gray-500 hover:text-gray-800"><XMarkIcon className="h-5 w-5" /></button>)}
                        </div>
                        <p className="text-xs text-gray-500 mb-4">La data attuale apparirà compilata qui sotto. Seleziona la nuova data di fine desiderata.</p>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nuova Data Fine</label>
                            <input type="date" value={prorogaConfig.currentData} disabled={prorogaConfig.isLoading} onChange={e => setProrogaConfig(prev => ({ ...prev, currentData: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50" />
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button onClick={() => setProrogaConfig({ isOpen: false, id: null, currentData: '', isLoading: false })} disabled={prorogaConfig.isLoading} className="flex-1 p-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-700 transition-colors disabled:opacity-50">Annulla</button>
                            <button onClick={confirmProroga} disabled={prorogaConfig.isLoading} className="flex-1 p-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-white transition-colors shadow-md disabled:bg-blue-400">{prorogaConfig.isLoading ? 'Salvataggio...' : 'Conferma'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- HELPER FUNCTIONS ---
const formatPhaseName = (rawName) => {
    if (!rawName) return 'Fase senza nome';
    let cleaned = rawName;
    cleaned = cleaned.replace(/^(\d+°)\s+\d+°\s+/i, '$1 ');
    cleaned = cleaned.replace(/\s+\d+°\s+anno\s+-\s+Anno\s+(\d+)/i, ' - Anno $1');
    return cleaned;
};

const mapProgrammazioneToEvents = (programmazione, cantieriMap) => {
    if (!programmazione) return [];
    const eventi = [];
    const tasksValidi = programmazione.filter(task => task.dataInizio && task.dataFine);
    for (const task of tasksValidi) {
        let backgroundColor = task.stato === 'assegnato' ? '#10b981' : task.stato === 'conflitto_risorsa' ? '#ef4444' : '#3b82f6'; 
        let borderColor = task.stato === 'assegnato' ? '#059669' : task.stato === 'conflitto_risorsa' ? '#dc2626' : '#2563eb';
        const richTitle = `${cantieriMap.get(task.cantiereId) || 'Cantiere'} - ${task.titolo || 'Lavoro'}`;
        
        if (!task.risorseAssegnate?.personale || task.risorseAssegnate.personale.length === 0) {
             eventi.push({ id: `${task.id}_unassigned`, groupId: task.id, title: richTitle, start: task.dataInizio, end: task.dataFine, resourceId: 'unassigned', backgroundColor, borderColor, editable: task.stato !== 'assegnato' });
        } else {
            for (const userId of task.risorseAssegnate.personale) {
                eventi.push({ id: `${task.id}_${userId}`, groupId: task.id, title: richTitle, start: task.dataInizio, end: task.dataFine, resourceId: userId, backgroundColor, borderColor, editable: task.stato !== 'assegnato' });
            }
        }
    }
    return eventi; 
};

const mapCronoprogrammaToEvents = (programmazioneLive, cantieriMap) => {
    if (!programmazioneLive) return [];
    const eventi = [];
    const tasksValidi = programmazioneLive.filter(task => task.dataInizio && task.dataFine);
    for (const task of tasksValidi) {
        let backgroundColor = task.diffStato === 'nuovo' ? '#3b82f6' : task.diffStato === 'modificato' ? '#f59e0b' : (task.stato === 'assegnato' || task.diffStato === 'assegnato') ? '#10b981' : '#6b7280'; 
        let borderColor = task.diffStato === 'nuovo' ? '#2563eb' : task.diffStato === 'modificato' ? '#d97706' : (task.stato === 'assegnato' || task.diffStato === 'assegnato') ? '#059669' : '#4b5563';
        const richTitle = `${cantieriMap.get(task.cantiereId) || 'Cantiere'} - ${task.titolo || 'Lavoro'}`;
        for (const userId of (task.risorseAssegnate?.personale || [])) {
            eventi.push({ id: `${task.id}_${userId}`, groupId: task.id, title: richTitle, start: task.dataInizio, end: task.dataFine, resourceId: userId, backgroundColor, borderColor, editable: false });
        }
    }
    return eventi; 
};

const mapTasksToGanttEvents = (tasks, titleField, resourceFieldOrFn, useDiffStato = false) => {
    if (!tasks) return [];
    return tasks.filter(task => task.dataInizio && task.dataFine).map(task => {
        let bg = '#3b82f6', bd = '#2563eb';
        if (useDiffStato) {
            bg = task.diffStato === 'nuovo' ? '#3b82f6' : task.diffStato === 'modificato' ? '#f59e0b' : (task.stato === 'assegnato' || task.diffStato === 'assegnato') ? '#10b981' : '#6b7280';
            bd = task.diffStato === 'nuovo' ? '#2563eb' : task.diffStato === 'modificato' ? '#d97706' : (task.stato === 'assegnato' || task.diffStato === 'assegnato') ? '#059669' : '#4b5563';
        } else {
            bg = task.stato === 'assegnato' ? '#10b981' : task.stato === 'conflitto_risorsa' ? '#ef4444' : '#3b82f6';
            bd = task.stato === 'assegnato' ? '#059669' : task.stato === 'conflitto_risorsa' ? '#dc2626' : '#2563eb';
        }
        const resId = typeof resourceFieldOrFn === 'function' ? resourceFieldOrFn(task) : task[resourceFieldOrFn];
        return {
            id: task.id, groupId: task.id, title: task[titleField] || 'Task', start: task.dataInizio, end: task.dataFine, resourceId: resId,
            backgroundColor: bg, borderColor: bd, editable: false, 
        };
    });
};

const createMasterMilestones = (cantieri) => {
    return cantieri.filter(c => c.stato !== 'chiuso' && c.stato !== 'archiviato').map(c => {
        const startRaw = c.dataPresuntaInizio || c.dataInizioLavori || c.dataInizio;
        let endRaw = c.dataFinePresunta || c.dataTeoricaFine; 
        if (!startRaw) return null;
        let startD = startRaw.toDate ? startRaw.toDate() : new Date(startRaw);
        if (isNaN(startD.getTime())) return null;
        startD.setHours(0, 0, 0, 0);
        if (!endRaw && c.durataGiorniPrevisti && c.durataGiorniPrevisti > 0) {
            endRaw = new Date(startD);
            endRaw.setDate(endRaw.getDate() + c.durataGiorniPrevisti);
        }
        let endD = new Date(startD);
        let title = '🚩 INIZIO APPALTO';
        if (endRaw) {
            endD = endRaw.toDate ? endRaw.toDate() : new Date(endRaw);
            endD.setHours(23, 59, 59, 999);
            title = `🏗️ APPALTO COMPLESSIVO (${c.durataGiorniPrevisti || '?'} gg)`;
        } else { endD.setHours(12, 0, 0, 0); }
        return {
            id: `cantiere_bg_${c.id}`, title: title, start: startD, end: endD, resourceId: c.id,
            backgroundColor: '#fcd34d', borderColor: '#b45309', textColor: '#000000',
            editable: false, display: 'auto', classNames: ['milestone-appalto', 'shadow-sm', 'font-bold']
        };
    }).filter(Boolean);
};