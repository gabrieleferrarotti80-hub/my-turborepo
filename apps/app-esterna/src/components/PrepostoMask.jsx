// File: apps/app-esterna/src/components/PrepostoMask.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    useFirebaseData,
    useAgendaManager,
    useReportsManager,
    useAssegnazioniManager,
    useNoteOperativeManager,
    useSicurezzaManager,
    useDatiRiepilogoCantiere
} from 'shared-core';
import { 
    AgendaContent, 
    AddNotaOperativaForm, 
    AggiungiEventoForm,
    DettagliEventoModal,
    SignatureModal 
} from 'shared-ui';
import { MaskLayout } from './MaskLayout.jsx';
import { AssegnazioniMagazzino } from './AssegnazioniMagazzino.jsx';
import { DocumentModal } from './DocumentModal.jsx';
import { SopralluogoFormScreen } from './SopralluogoFormScreen.jsx';
import { 
    CameraIcon, VideoCameraIcon, FolderIcon,
    ClipboardDocumentListIcon, ChevronDownIcon, CalendarIcon, 
    ShieldExclamationIcon, HomeIcon, ArchiveBoxIcon, PencilSquareIcon,
    ChevronLeftIcon, PlusIcon
} from '@heroicons/react/24/solid';
import { doc, updateDoc, collection, addDoc, serverTimestamp, onSnapshot, query, where } from 'firebase/firestore'; 

import { RiepilogoGiornalieroModal } from './RiepilogoGiornalieroModal.jsx';

const openFilePicker = (acceptType) => {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file'; 
        input.accept = acceptType; 
        input.capture = 'environment'; 
        input.style.display = 'none';
        
        document.body.appendChild(input);

        input.onchange = (e) => {
            document.body.removeChild(input); 
            if (e.target.files[0]) resolve(e.target.files[0]);
            else reject(new Error("Acquisizione annullata."));
        };
        input.oncancel = () => {
            document.body.removeChild(input); 
            reject(new Error("Acquisizione annullata."));
        };
        input.click();
    });
};

const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error("GPS non supportato."));
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            (err) => reject(new Error(`Errore GPS: ${err.message}`))
        );
    });
};

export const PrepostoMask = ({ user, userData, data, onLogout, cantieri }) => {
    
    const { db, storage, userAziendaId, userRole, loadingData } = useFirebaseData();

    const { 
        eventi = [], documenti = [], users = [], 
        assegnazioniMagazzino = [], reports = [],
        cantieriAssegnati = [] 
    } = data || {}; 

    const [view, setView] = useState('main');
    const [selectedCantiere, setSelectedCantiere] = useState('');
    const [selectedCantiereName, setSelectedCantiereName] = useState('');
    const [isDocumentModalOpen, setDocumentModalOpen] = useState(false);
    const [isNotaModalOpen, setNotaModalOpen] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    
    const [compilingSopralluogo, setCompilingSopralluogo] = useState({ visible: false, templateId: null, offertaId: null, reportId: null });
    const [isSavingReportData, setIsSavingReportData] = useState(false);
    const [dpiToSign, setDpiToSign] = useState(null); 

    const [isRiepilogoOpen, setIsRiepilogoOpen] = useState(false);
    const [tempReportData, setTempReportData] = useState(null);
    const [fasiCantiere, setFasiCantiere] = useState([]); // 🌟 STATO PER LE FASI RECUPERATE

    // --- LOGICA FILTRO EVENTI SICURO ---
    const eventiFiltrati = useMemo(() => {
        if (!eventi || !user) return [];
        const idsMieiCantieri = new Set(cantieriAssegnati.map(c => c.id));
        
        return eventi.filter(ev => {
            const isPartecipante = ev.partecipanti?.some(p => p.userId === user.uid);
            const isMioCantiere = ev.cantiereId && idsMieiCantieri.has(ev.cantiereId);
            const isCreatore = ev.userId === user.uid;
            const isAssegnato = ev.assegnatoA === user.uid;
            return isPartecipante || isMioCantiere || isCreatore || isAssegnato;
        });
    }, [eventi, cantieriAssegnati, user]);

    // 🌟 CERCA L'ORARIO DI INIZIO LAVORI DI OGGI (Per il calcolo ore)
    const inizioLavoriOggi = useMemo(() => {
        if (!reports || !selectedCantiere || !user?.uid) return null;
        
        const oggiStart = new Date();
        oggiStart.setHours(0, 0, 0, 0);

        const reportOggi = reports.filter(r => {
            if (r.cantiereId !== selectedCantiere || r.userId !== user.uid) return false;
            if (r.tipoReport !== "Inizio Lavori" && r.titolo !== "Inizio Lavori") return false;
            
            const rDate = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt || r.data);
            return rDate && rDate >= oggiStart;
        });

        if (reportOggi.length > 0) {
            reportOggi.sort((a, b) => {
                const dA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || a.data);
                const dB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || b.data);
                return dA - dB; 
            });
            const firstReport = reportOggi[0];
            return firstReport.createdAt?.toDate ? firstReport.createdAt.toDate() : new Date(firstReport.createdAt || firstReport.data);
        }
        return null;
    }, [reports, selectedCantiere, user]);


    // 🌟 RADAR CERCA-FASI (Bypassa hook vecchi e va dritto alle "offerte")
    useEffect(() => {
        if (!db || !selectedCantiere || !cantieri) return;
        const cantiere = cantieri.find(c => c.id === selectedCantiere);
        if (!cantiere) { setFasiCantiere([]); return; }

        if (cantiere.fasi && cantiere.fasi.length > 0) {
            setFasiCantiere(cantiere.fasi);
            return;
        }

        let unsub1 = () => {};
        let unsub2 = () => {};

        const offertaId = cantiere.offertaId || cantiere.preventivoId || cantiere.preventivo_id;
        
        if (offertaId) {
            unsub1 = onSnapshot(doc(db, 'offerte', offertaId), (docSnap) => {
                if (docSnap.exists() && docSnap.data().fasi) {
                    setFasiCantiere(docSnap.data().fasi);
                } else {
                    eseguiFallback();
                }
            });
        } else {
            eseguiFallback();
        }

        function eseguiFallback() {
            const qOfferte = query(collection(db, 'offerte'), where('cantiereId', '==', selectedCantiere));
            unsub2 = onSnapshot(qOfferte, (snap) => {
                if (!snap.empty && snap.docs[0].data().fasi) {
                    setFasiCantiere(snap.docs[0].data().fasi);
                } else {
                    setFasiCantiere([]);
                }
            });
        }

        return () => { unsub1(); unsub2(); };
    }, [db, selectedCantiere, cantieri]);


    // --- MANAGERS ---
    const { addReport, isSaving: isSavingReport } = useReportsManager(db, storage, user, userAziendaId);
    const { datiCantiere, isLoadingRiepilogo } = useDatiRiepilogoCantiere(db, selectedCantiere, userAziendaId);

    const agendaLogica = useAgendaManager({ 
        eventi: eventiFiltrati, documenti, user, users, userRole, loadingData, db, userAziendaId 
    });
    
    const { confermaPresaInCarico, richiediRestituzione, segnalaGuasto } = useAssegnazioniManager(db, user);
    const { addNotaOperativa, isSaving: isSavingNota } = useNoteOperativeManager();
    const { confermaRicezioneDPI } = useSicurezzaManager(db, storage, user, userAziendaId);

    const isSaving = isSavingReport || isSavingNota || agendaLogica.isLoading;

    const mieiReportsDaCompilare = useMemo(() => {
        if (!reports || !user?.uid) return [];
        return reports.filter(r => r.assegnatoA === user.uid && (r.stato === 'da_compilare' || r.stato === 'in_bozza'));
    }, [reports, user]);

    const mieAssegnazioni = useMemo(() => {
        if (!assegnazioniMagazzino || !user) return [];
        return assegnazioniMagazzino
            .filter(item => item.assegnatoA === user.uid)
            .map(a => {
                let statoReale = (a.statoWorkflow || a.stato || 'attiva').toLowerCase().trim();
                if (a.dataConferma || a.stato === 'in uso' || a.stato === 'in_uso') {
                    if (statoReale === 'da confermare' || statoReale === 'attiva') statoReale = 'in uso';
                }
                return { ...a, statoWorkflow: statoReale };
            });
    }, [assegnazioniMagazzino, user]);

    const upcomingEvents = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        const futureLimit = new Date(today);
        futureLimit.setDate(futureLimit.getDate() + 30); 

        return eventiFiltrati
            .map(ev => {
                const startDate = ev.start?.toDate ? ev.start.toDate() : (ev.start ? new Date(ev.start) : new Date(ev.data));
                return { ...ev, start: startDate, title: ev.title || ev.titolo || 'Impegno in Agenda' };
            })
            .filter(ev => ev.start >= today && ev.start <= futureLimit)
            .sort((a, b) => a.start - b.start);
    }, [eventiFiltrati]);

    useEffect(() => {
        if (cantieri && cantieri.length > 0 && !selectedCantiere) {
            setSelectedCantiere(cantieri[0].id);
            setSelectedCantiereName(cantieri[0].nomeCantiere);
        }
    }, [cantieri, selectedCantiere]);

    const handleAction = async (action, ...args) => {
        const result = await action(...args);
        setStatusMessage(result.message || (result.success ? "Completato!" : "Errore."));
    };

    const handleConferma = (itemOrId) => {
        if (typeof itemOrId === 'object') {
            if (itemOrId.categoria?.toLowerCase() === 'dpi' || itemOrId.isDPI) { setDpiToSign(itemOrId); return; }
            handleAction(confermaPresaInCarico, itemOrId.id);
        } else { handleAction(confermaPresaInCarico, itemOrId); }
    };
    
    const handleRestituzione = (item) => {
        const note = prompt("Note restituzione (opzionale):");
        if (note !== null) handleAction(richiediRestituzione, item, note);
    };

    const handleSegnalaGuasto = (item) => {
        const note = prompt("Descrivi guasto:");
        if (note) handleAction(segnalaGuasto, item, note);
    };

    const handleSaveFirma = async (blob) => {
        if (!dpiToSign) return;
        const res = await confermaRicezioneDPI(dpiToSign.id, blob);
        setStatusMessage(res.message);
        if (res.success) setDpiToSign(null);
    };

    const handleCantiereChange = (e) => {
        const id = e.target.value;
        setSelectedCantiere(id);
        const c = cantieri.find(ct => ct.id === id);
        if (c) setSelectedCantiereName(c.nomeCantiere);
    };

    const handleSaveNota = async (note, files) => {
        const res = await addNotaOperativa(note, files);
        setStatusMessage(res.message);
        if (res.success) setNotaModalOpen(false);
    };

    const handleWorkPhaseReport = async (reportType, acceptType, isTerminato = false) => {
        if (isSaving || !selectedCantiere) { 
            if(!selectedCantiere) setStatusMessage("Seleziona un cantiere."); 
            return; 
        }
        try {
            const file = await openFilePicker(acceptType);
            
            setStatusMessage("Ottengo Posizione GPS..."); 
            const loc = await getCurrentLocation();
            
            // 🌟 MAGIA: Calcolo delle ore in caso di "Fine Lavori"
            if (reportType === "Fine Lavori") {
                let oreCalcolate = 0;
                
                if (inizioLavoriOggi) {
                    const diffMs = new Date() - inizioLavoriOggi;
                    // Arrotondiamo ai 15 minuti (0.25)
                    oreCalcolate = Math.max(0, Math.ceil((diffMs / (1000 * 60 * 60)) * 4) / 4);
                } else {
                    // Fallback se ha dimenticato di fare Inizio Lavori
                    oreCalcolate = 8; 
                }

                setTempReportData({ reportType, file, loc, isTerminato, oreMax: oreCalcolate });
                setIsRiepilogoOpen(true);
                setStatusMessage(""); 
            } else {
                const note = prompt(`Nota per "${reportType}":`); 
                setStatusMessage("Salvataggio in corso...");
                
                const res = await addReport(selectedCantiere, reportType, note, file, loc, isTerminato);
                setStatusMessage(res.message);
            }
        } catch (err) { 
            setStatusMessage(err.message); 
        }
    };

    const handleInviaRiepilogo = async (datiRiepilogoJson) => {
        setIsRiepilogoOpen(false);
        setStatusMessage("Salvataggio Rapportino in corso...");

        try {
            const noteFormattate = `Rapportino di Fine Giornata compilato (Ore: ${datiRiepilogoJson.oreTotaliAssegnate}h). \nNote: ${datiRiepilogoJson.noteGenerali || 'Nessuna'}`;
            
            const res = await addReport(
                selectedCantiere, 
                tempReportData.reportType, 
                noteFormattate, 
                tempReportData.file, 
                tempReportData.loc, 
                tempReportData.isTerminato,
                datiRiepilogoJson 
            );
            setStatusMessage(res.message);
        } catch (error) {
            setStatusMessage("Errore salvataggio: " + error.message);
        }
    };

    const handleCompileForm = useCallback((tmplId, offId) => {
        if (agendaLogica.onCloseModal) agendaLogica.onCloseModal();
        setCompilingSopralluogo({ visible: true, templateId: tmplId, offertaId: offId, reportId: null });
        setView('compila_sopralluogo');
    }, [agendaLogica]);

    const handleBackToMain = () => {
        setView('main');
        setCompilingSopralluogo({ visible: false, templateId: null, offertaId: null, reportId: null });
    };

    const handleSaveReportCompilato = async (formData) => {
        setIsSavingReportData(true);
        try {
            if (compilingSopralluogo.reportId) {
                await updateDoc(doc(db, 'reports', compilingSopralluogo.reportId), { ...formData, datiCompilati: formData, stato: 'compilato', dataCompilazione: serverTimestamp() });
            } else {
                await addDoc(collection(db, 'reports'), { companyID: userAziendaId, offertaId: compilingSopralluogo.offertaId || '', templateId: compilingSopralluogo.templateId, assegnatoA: user.uid, nomeTecnico: userData?.nome + ' ' + userData?.cognome, stato: 'compilato', datiCompilati: formData, createdAt: serverTimestamp() });
            }
            setStatusMessage("Report inviato con successo!");
            handleBackToMain();
        } catch (error) { setStatusMessage("Errore durante l'invio."); }
        setIsSavingReportData(false);
    };

    const mobileBigBtn = "w-full flex items-center justify-between p-5 rounded-2xl bg-white shadow-sm border border-gray-200 active:scale-95 transition-transform hover:bg-gray-50";

    return (
        <>
            <MaskLayout user={user} userData={userData} data={data} onLogout={onLogout} title="Preposto" subtitle={user?.email}>
                
               <div className="pb-24 pt-2 px-2 sm:px-0 space-y-5 min-h-full flex flex-col">
                    
                    {view === 'main' && (
                        <div className="animate-fade-in space-y-5">
                            {/* CANTIERE SELECTOR */}
                            <div className="bg-indigo-900 rounded-2xl p-4 shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <ClipboardDocumentListIcon className="h-20 w-20 text-white" />
                                </div>
                                <label className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1 block">Cantiere Attivo</label>
                                {cantieri?.length > 0 ? (
                                    <div className="relative">
                                        <select 
                                            value={selectedCantiere} 
                                            onChange={handleCantiereChange} 
                                            className="w-full appearance-none bg-transparent border-none text-white font-extrabold text-xl p-0 focus:ring-0 focus:outline-none"
                                        >
                                            {cantieri.map(c => <option key={c.id} value={c.id} className="text-gray-900 text-base">{c.nomeCantiere}</option>)}
                                        </select>
                                        <ChevronDownIcon className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 text-indigo-300 pointer-events-none" />
                                    </div>
                                ) : (
                                    <div className="text-indigo-200 font-medium">Nessun cantiere.</div>
                                )}
                            </div>

                            {/* AVVISI IMPORTANTI */}
                            {mieAssegnazioni.some(a => a.statoWorkflow === 'da confermare') && (
                                <div onClick={() => setView('assegnazioni')} className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-4 flex gap-4 items-center cursor-pointer shadow-sm animate-pulse">
                                    <ShieldExclamationIcon className="h-8 w-8 text-red-500" />
                                    <div>
                                        <p className="font-bold text-red-900 text-sm">Hai Dotazioni in sospeso!</p>
                                        <p className="text-xs text-red-700">Tocca qui per confermare il ritiro.</p>
                                    </div>
                                </div>
                            )}

                            {mieiReportsDaCompilare.map(rep => (
                                <div key={rep.id} onClick={() => { setCompilingSopralluogo({ visible: true, templateId: rep.templateId || rep.formTemplateId, offertaId: rep.offertaId, reportId: rep.id }); setView('compila_sopralluogo'); }} className="bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-4 flex gap-4 items-center cursor-pointer shadow-sm">
                                    <ClipboardDocumentListIcon className="h-8 w-8 text-amber-500" />
                                    <div>
                                        <p className="font-bold text-amber-900 text-sm">Report da Compilare</p>
                                        <p className="text-xs text-amber-700 line-clamp-1">{rep.titolo}</p>
                                    </div>
                                </div>
                            ))}

                            {/* PULSANTIERA PRINCIPALE (Foto Lavori) */}
                            <div className="space-y-3 mt-4">
                                <button onClick={() => handleWorkPhaseReport("Inizio Lavori", "image/*")} className={mobileBigBtn}>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-green-100 p-3 rounded-xl"><CameraIcon className="h-7 w-7 text-green-600"/></div>
                                        <div className="text-left">
                                            <span className="block font-black text-gray-900 text-lg">Inizio Lavori</span>
                                            <span className="block text-xs text-gray-500 font-medium">Scatta foto inizio turno</span>
                                        </div>
                                    </div>
                                </button>

                                <button onClick={() => handleWorkPhaseReport("Lavoro in corso", "image/*")} className={mobileBigBtn}>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-100 p-3 rounded-xl"><CameraIcon className="h-7 w-7 text-blue-600"/></div>
                                        <div className="text-left">
                                            <span className="block font-black text-gray-900 text-lg">Foto Lavoro</span>
                                            <span className="block text-xs text-gray-500 font-medium">Documenta l'avanzamento</span>
                                        </div>
                                    </div>
                                </button>

                                <button onClick={() => handleWorkPhaseReport("Fine Lavori", "image/*", true)} className={mobileBigBtn}>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-red-100 p-3 rounded-xl"><CameraIcon className="h-7 w-7 text-red-600"/></div>
                                        <div className="text-left">
                                            <span className="block font-black text-gray-900 text-lg">Fine Lavori</span>
                                            <span className="block text-xs text-gray-500 font-medium">Scatta foto chiusura turno</span>
                                        </div>
                                    </div>
                                </button>

                                {/* PULSANTIERA SECONDARIA */}
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button onClick={() => setView('assegnazioni')} className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm relative">
                                        <ArchiveBoxIcon className="h-8 w-8 text-amber-500" />
                                        {mieAssegnazioni.some(a => a.statoWorkflow === 'da confermare') && <span className="absolute top-3 right-3 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>}
                                        <span className="text-xs font-bold text-gray-700">Dotazioni / DPI</span>
                                    </button>
                                    <button onClick={() => setNotaModalOpen(true)} className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm">
                                        <PencilSquareIcon className="h-8 w-8 text-blue-500" />
                                        <span className="text-xs font-bold text-gray-700">Nota Libera</span>
                                    </button>
                                    <button onClick={() => handleWorkPhaseReport("Video Cantiere", "video/*")} className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm">
                                        <VideoCameraIcon className="h-8 w-8 text-purple-500" />
                                        <span className="text-xs font-bold text-gray-700">Invia Video</span>
                                    </button>
                                    <button onClick={() => setDocumentModalOpen(true)} className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm">
                                        <FolderIcon className="h-8 w-8 text-gray-500" />
                                        <span className="text-xs font-bold text-gray-700">Vedi Documenti</span>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mt-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-black text-gray-900 flex items-center gap-2 tracking-tight">
                                        <CalendarIcon className="h-5 w-5 text-indigo-600" /> I TUOI IMPEGNI
                                    </h3>
                                    <button onClick={() => setView('agenda')} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">VEDI TUTTO</button>
                                </div>
                                {upcomingEvents?.length > 0 ? (
                                    <div className="space-y-3">
                                        {upcomingEvents.slice(0,3).map(evt => (
                                            <div key={evt.id} onClick={() => { agendaLogica.onEventClick(evt); setView('agenda'); }} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3 cursor-pointer">
                                                <div className={`w-1 h-8 rounded-full ${evt.cantiereId ? 'bg-indigo-500' : 'bg-gray-400'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-gray-800 line-clamp-1">{evt.title}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                                        {evt.start?.toLocaleString('it-IT')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center py-4 text-sm text-gray-400 italic">Nessun appuntamento in agenda.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {view === 'assegnazioni' && (
                        <div className="animate-fade-in pb-10">
                            <div className="flex items-center gap-4 mb-4 px-2">
                                <button onClick={() => setView('main')} className="p-2 bg-white text-gray-800 border border-gray-200 rounded-full font-bold hover:bg-gray-50 shadow-sm"><ChevronLeftIcon className="h-5 w-5" /></button>
                                <h2 className="text-xl font-black text-gray-800">Attrezzature e DPI</h2>
                            </div>
                            <AssegnazioniMagazzino loading={loadingData} assegnazioni={mieAssegnazioni} onConferma={handleConferma} onRestituzione={handleRestituzione} onSegnalaGuasto={handleSegnalaGuasto} onFirmaDPI={setDpiToSign} />
                        </div>
                    )}
                    
                    {view === 'agenda' && (
                       <div className="animate-fade-in flex flex-col flex-1 min-h-[75vh] w-full">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <div className="flex items-center gap-2">
                                    <button onClick={handleBackToMain} className="p-2 bg-gray-100 rounded-full"><ChevronLeftIcon className="h-5 w-5" /></button>
                                    <h2 className="text-xl font-black text-gray-800">Agenda Preposto</h2>
                                </div>
                                <button onClick={() => agendaLogica.onOpenAddModal()} className="bg-indigo-600 text-white p-2 rounded-full shadow-lg active:scale-90 transition-transform">
                                    <PlusIcon className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-1">
                                <AgendaContent {...agendaLogica} onCompileForm={handleCompileForm} />
                            </div>
                        </div>
                    )}

                    {view === 'compila_sopralluogo' && (
                        <div className="animate-fade-in">
                            <SopralluogoFormScreen formTemplateId={compilingSopralluogo.templateId} offertaId={compilingSopralluogo.offertaId} user={user} onBack={handleBackToMain} onSubmit={handleSaveReportCompilato} isSaving={isSavingReportData} />
                        </div>
                    )}
                </div>

                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 pb-safe">
                    <div className="flex justify-around items-center h-16">
                        <button onClick={() => setView('main')} className={`flex flex-col items-center justify-center w-full h-full ${view === 'main' ? 'text-indigo-600' : 'text-gray-400'}`}>
                            <HomeIcon className="h-6 w-6" />
                            <span className="text-[10px] font-bold mt-1 uppercase">Home</span>
                        </button>
                        <button onClick={() => setView('agenda')} className={`flex flex-col items-center justify-center w-full h-full ${view === 'agenda' ? 'text-indigo-600' : 'text-gray-400'}`}>
                            <CalendarIcon className="h-6 w-6" />
                            <span className="text-[10px] font-bold mt-1 uppercase">Agenda</span>
                        </button>
                        <button onClick={() => setView('assegnazioni')} className={`flex flex-col items-center justify-center w-full h-full relative ${view === 'assegnazioni' ? 'text-indigo-600' : 'text-gray-400'}`}>
                            <ArchiveBoxIcon className="h-6 w-6" />
                            {mieAssegnazioni.some(a => a.statoWorkflow === 'da confermare') && <span className="absolute top-2 right-6 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
                            <span className="text-[10px] font-bold mt-1 uppercase">Dotazioni</span>
                        </button>
                        <button onClick={() => setNotaModalOpen(true)} className="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-indigo-600">
                            <PencilSquareIcon className="h-6 w-6" />
                            <span className="text-[10px] font-bold mt-1 uppercase">Nota Libera</span>
                        </button>
                    </div>
                </div>

            </MaskLayout>

            {/* MODALI ESTERNE */}
            {isNotaModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
                    <AddNotaOperativaForm onSubmit={handleSaveNota} onCancel={() => setNotaModalOpen(false)} isSaving={isSavingNota} />
                </div>
            )}

            <div className={isDocumentModalOpen ? 'z-[99999] relative' : ''}>
                <DocumentModal isOpen={isDocumentModalOpen} onClose={() => setDocumentModalOpen(false)} documents={documenti} cantiereName={selectedCantiereName}/>
            </div>

            {agendaLogica.isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
                    <AggiungiEventoForm 
                        onClose={agendaLogica.onCloseModal} 
                        onSave={agendaLogica.onSave} 
                        initialData={agendaLogica.editingEvent} 
                        selectedDate={agendaLogica.selectedDate} 
                        users={users} 
                        user={user} 
                        userRole={userRole} 
                        isLoading={agendaLogica.isLoading} 
                    />
                </div>
            )}

            {agendaLogica.selectedEvent && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
                    <DettagliEventoModal 
                        event={agendaLogica.selectedEvent} 
                        onClose={agendaLogica.onCloseModal} 
                        onEdit={agendaLogica.onEditEvent} 
                        onDelete={agendaLogica.onDeleteEvent} 
                        onConferma={agendaLogica.onConfirmEvent} 
                        onRifiuta={agendaLogica.onRejectEvent} 
                        onCompileForm={handleCompileForm} 
                        users={users} 
                        currentUser={user} 
                        documenti={documenti} 
                        isLoading={agendaLogica.isLoading} 
                    />
                </div>
            )}

            {dpiToSign && (
                <SignatureModal isOpen={!!dpiToSign} onClose={() => setDpiToSign(null)} onConfirm={handleSaveFirma} itemName={dpiToSign?.articoloNome || "DPI"} />
            )}

            {/* 🌟 WIZARD DI FINE GIORNATA */}
            {isRiepilogoOpen && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[99999] flex items-center justify-center p-2 sm:p-4 animate-fade-in">
                    <RiepilogoGiornalieroModal 
                        onClose={() => setIsRiepilogoOpen(false)}
                        onSubmit={handleInviaRiepilogo}
                        team={datiCantiere?.squadraDiOggi || []} 
                        lavorazioniAttese={fasiCantiere} // 🌟 PASSIAMO LE FASI APPENA PESCATE!
                        materialiAssegnati={datiCantiere?.giacenzeCantiere || []}
                        oreMax={tempReportData?.oreMax} 
                        oraInizio={inizioLavoriOggi} 
                    />
                </div>
            )}

            {statusMessage && (
                <div className="fixed top-4 left-4 right-4 p-4 text-white font-bold text-center bg-gray-900/90 backdrop-blur-md rounded-2xl shadow-2xl z-[99999] animate-fade-in-down">
                    {statusMessage}
                </div>
            )}
        </>
    );
};