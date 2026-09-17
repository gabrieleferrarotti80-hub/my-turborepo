// File: apps/app-esterna/src/components/TecnicoMask.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    useFirebaseData, useAgendaManager, useReportsManager,
    useAssegnazioniManager, useNoteOperativeManager,
    useReportTecnicoManager, useOfferteManager
} from 'shared-core';
import {
    AgendaContent, AddNotaOperativaForm, AggiungiEventoForm,
    DettagliEventoModal, GestioneAssegnazioniMagazzinoView
} from 'shared-ui';
import { MaskLayout } from './MaskLayout.jsx';
import { DocumentModal } from './DocumentModal.jsx';
import { SopralluogoFormScreen } from './SopralluogoFormScreen.jsx';
import { ReportScreen } from './ReportScreen.jsx';
import { ReportTecnicoScreen } from './ReportTecnicoScreen.jsx';
import { 
    CameraIcon, VideoCameraIcon, FolderIcon,
    ArchiveBoxIcon, CalendarIcon, ClipboardDocumentListIcon, 
    ChevronDownIcon, ShieldExclamationIcon, HomeIcon, 
    PencilSquareIcon, PlusCircleIcon, DocumentTextIcon,
    ChevronLeftIcon, PlusIcon, UserPlusIcon
} from '@heroicons/react/24/solid';

import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 

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
        if (!navigator.geolocation) return reject(new Error("No GPS"));
        navigator.geolocation.getCurrentPosition(
            pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            err => reject(new Error(`Errore GPS: ${err.message}`))
        );
    });
};

export const TecnicoMask = ({ user, userData, data, onLogout }) => {
    
    console.log("🍋🍋🍋 TEST FINALE: TecnicoMask con Report Isolati 🍋🍋🍋");

    const { db, storage, userRole, loadingData } = useFirebaseData();
    
    const { 
        cantieri = [], documenti = [], users = [], eventi = [], 
        assegnazioniMagazzino = [], forms = [], aziendeForm = [],
        notifiche = []
    } = data || {};

    const [view, setView] = useState('main');
    const [selectedCantiere, setSelectedCantiere] = useState('');
    const [selectedCantiereName, setSelectedCantiereName] = useState('');
    const [isDocumentModalOpen, setDocumentModalOpen] = useState(false);
    const [isNotaModalOpen, setNotaModalOpen] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [compilingSopralluogo, setCompilingSopralluogo] = useState({ visible: false, templateId: null, offertaId: null, cantiereId: null });

    const [isAssegnaModalOpen, setIsAssegnaModalOpen] = useState(false);
    const [assegnaCantiereId, setAssegnaCantiereId] = useState('');
    const [assegnaUtenteId, setAssegnaUtenteId] = useState('');

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

    const agendaLogica = useAgendaManager({ 
        eventi, documenti, user, users, userRole, 
        loadingData, db, userAziendaId: userData?.companyID, storage
    });

    const { confermaPresaInCarico, richiediRestituzione, segnalaGuasto } = useAssegnazioniManager(db, user);
    const { addNotaOperativa, isSaving: isSavingNota } = useNoteOperativeManager(db, storage, user, userData?.companyID);
    const { salvaSopralluogoReport, isSaving: isSavingSopralluogo } = useOfferteManager(db, storage, user, userData?.companyID);

   // ✅ MANAGER COMPLETAMENTE RIATTIVATI
    const { addReport, isSaving: isSavingReportRapido } = useReportsManager(db, storage, user, userData?.companyID);
    const { saveReportTecnico, isSaving: isSavingReportTecnico } = useReportTecnicoManager(db, user, userData?.companyID);

    const isSaving = isSavingReportRapido || isSavingNota || agendaLogica.isLoading || isSavingReportTecnico || isSavingSopralluogo;

    const handleAction = async (action, ...args) => {
        const result = await action(...args);
        setStatusMessage(result.message || (result.success ? "Completato!" : "Errore."));
        return result; 
    };

    const handleConferma = (id) => handleAction(confermaPresaInCarico, id);
    const handleRestituzione = (ass) => { const nota = prompt("Note restituzione (opzionale):"); if (nota !== null) handleAction(richiediRestituzione, ass, nota); };
    const handleSegnalaGuasto = (ass) => { const nota = prompt("Descrivi il guasto:"); if (nota) handleAction(segnalaGuasto, ass, nota); };

    useEffect(() => {
        if (cantieri && cantieri.length > 0 && !selectedCantiere) {
            setSelectedCantiere(cantieri[0].id); 
            setSelectedCantiereName(cantieri[0].nomeCantiere);
        }
    }, [cantieri, selectedCantiere]);

    useEffect(() => {
        if (statusMessage) {
            const timer = setTimeout(() => setStatusMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [statusMessage]);

    const handleBackToMain = () => { 
        setView('main'); 
        setCompilingSopralluogo({ visible: false, templateId: null, offertaId: null, cantiereId: null }); 
    };

    const handleCantiereChange = (e) => {
        const id = e.target.value; 
        setSelectedCantiere(id);
        const c = cantieri.find(x => x.id === id); 
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
            
            const note = prompt(`Nota per "${reportType}":`); 
            setStatusMessage("Salvataggio in corso...");
            
            const res = await addReport(selectedCantiere, reportType, note, file, loc, isTerminato);
            setStatusMessage(res.message);
        } catch (err) { 
            setStatusMessage(err.message); 
        }
    };
    
    const handleCompileForm = useCallback((tId, oId, cId) => {
        if (agendaLogica?.onCloseModal) agendaLogica.onCloseModal();
        setCompilingSopralluogo({ visible: true, templateId: tId, offertaId: oId || null, cantiereId: cId || null });
        setView('compila_sopralluogo'); 
    }, [agendaLogica]); 

    const handleFormSubmit = async (formData) => {
        const { offertaId, cantiereId, templateId } = compilingSopralluogo;
        let res = offertaId ? await salvaSopralluogoReport(offertaId, formData) 
                 : cantiereId ? await saveReportTecnico(formData, cantiereId, templateId)
                 : { success: false, message: "Errore dati." };

        if (res.success) { setStatusMessage("Salvato con successo!"); handleBackToMain(); } 
        else setStatusMessage(res.message);
    };

    const handleAssegnaUtente = async () => {
        if (!assegnaCantiereId || !assegnaUtenteId) {
            alert("Seleziona sia il cantiere che il personale.");
            return;
        }
        setStatusMessage("Assegnazione in corso...");
        try {
            await addDoc(collection(db, 'assegnazioniCantieri'), {
                cantiereId: assegnaCantiereId,
                teamMemberIds: [assegnaUtenteId], 
                assegnatoDa: user.uid,
                companyID: userData?.companyID,
                dataAssegnazione: serverTimestamp(),
                stato: 'attiva'
            });
            setStatusMessage("Personale assegnato con successo!");
            setIsAssegnaModalOpen(false);
        } catch (error) {
            console.error("Errore assegnazione:", error);
            setStatusMessage("Errore durante l'assegnazione.");
        }
    };

    const mobileBigBtn = "w-full flex items-center justify-between p-5 rounded-2xl bg-white shadow-sm border border-gray-200 active:scale-95 transition-transform";

    return (
        <>
            <MaskLayout user={user} userData={userData} data={data} onLogout={onLogout} title="Area Tecnici" subtitle={user.email}>
                
                <div className="pb-24 pt-2 px-2 sm:px-0 min-h-full flex flex-col">

                    {view === 'main' && (
                        <div className="space-y-5 animate-fade-in">
                            <div className="bg-indigo-900 rounded-2xl p-4 shadow-lg relative overflow-hidden">
                                <label className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1 block">Cantiere Operativo</label>
                                <div className="relative">
                                    <select 
                                        value={selectedCantiere} 
                                        onChange={handleCantiereChange} 
                                        className="w-full appearance-none bg-transparent border-none text-white font-extrabold text-xl p-0 focus:ring-0 focus:outline-none"
                                    >
                                        {cantieri.map(c => <option key={c.id} value={c.id} className="text-gray-900">{c.nomeCantiere}</option>)}
                                        {cantieri.length === 0 && <option>Nessun cantiere assegnato</option>}
                                    </select>
                                    <ChevronDownIcon className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 text-indigo-300 pointer-events-none" />
                                </div>
                            </div>

                            {mieAssegnazioni.some(a => a.statoWorkflow === 'da confermare') && (
                                <div onClick={() => setView('assegnazioni')} className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-4 flex gap-4 items-center cursor-pointer shadow-sm animate-pulse">
                                    <ShieldExclamationIcon className="h-8 w-8 text-red-500" />
                                    <div>
                                        <p className="font-bold text-red-900 text-sm">Dotazioni da confermare!</p>
                                        <p className="text-xs text-red-700">Tocca qui per firmare il ritiro.</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3 mt-4">
                                <button onClick={() => setView('newReport')} className={`${mobileBigBtn} border-l-4 border-l-green-500 shadow-md`}>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-green-100 p-3 rounded-xl"><PlusCircleIcon className="h-7 w-7 text-green-600"/></div>
                                        <div className="text-left">
                                            <span className="block font-black text-gray-900 text-lg">Nuovo Report Tecnico</span>
                                            <span className="block text-xs text-gray-500 font-medium">Sopralluoghi e moduli digitali</span>
                                        </div>
                                    </div>
                                </button>

                                <button onClick={() => handleWorkPhaseReport("Foto Lavoro", "image/*")} className={mobileBigBtn}>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-100 p-3 rounded-xl"><CameraIcon className="h-7 w-7 text-blue-600"/></div>
                                        <div className="text-left">
                                            <span className="block font-black text-gray-900 text-lg">Foto Cantiere Rapida</span>
                                            <span className="block text-xs text-gray-500 font-medium">Documenta al volo l'avanzamento</span>
                                        </div>
                                    </div>
                                </button>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button onClick={() => setNotaModalOpen(true)} className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col items-center justify-center gap-2 active:scale-95 shadow-sm">
                                        <PencilSquareIcon className="h-7 w-7 text-amber-500" />
                                        <span className="text-xs font-bold text-gray-700 font-black">Nota Libera</span>
                                    </button>
                                    <button onClick={() => setDocumentModalOpen(true)} className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col items-center justify-center gap-2 active:scale-95 shadow-sm">
                                        <FolderIcon className="h-7 w-7 text-gray-400" />
                                        <span className="text-xs font-bold text-gray-700 font-black">Documenti</span>
                                    </button>
                                    <button onClick={() => { setAssegnaCantiereId(selectedCantiere); setAssegnaUtenteId(''); setIsAssegnaModalOpen(true); }} className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col items-center justify-center gap-2 active:scale-95 shadow-sm col-span-2">
                                        <UserPlusIcon className="h-7 w-7 text-teal-500" />
                                        <span className="text-xs font-bold text-gray-700 font-black">Assegna Personale al Cantiere</span>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mt-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-black text-gray-900 flex items-center gap-2 tracking-tight">
                                        <CalendarIcon className="h-5 w-5 text-indigo-600" /> PROSSIMI APPUNTAMENTI
                                    </h3>
                                    <button onClick={() => setView('agenda')} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">VEDI TUTTO</button>
                                </div>
                                {eventi.length > 0 ? (
                                    <div className="space-y-3">
                                        {eventi.slice(0, 3).map(ev => (
                                            <div key={ev.id} onClick={() => { agendaLogica.onEventClick(ev); setView('agenda'); }} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                                                <div className={`w-1 h-8 rounded-full ${ev.extendedProps?.isGara ? 'bg-red-500' : 'bg-indigo-500'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-gray-800 truncate">{ev.title || ev.titolo}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">
                                                        {ev.start?.toDate ? ev.start.toDate().toLocaleString('it-IT') : new Date(ev.start).toLocaleString('it-IT')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center py-4 text-sm text-gray-400 italic">Nessun impegno in programma.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {view === 'agenda' && (
                        <div className="animate-fade-in flex flex-col flex-1 min-h-[75vh] w-full">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <div className="flex items-center gap-2">
                                    <button onClick={handleBackToMain} className="p-2 bg-gray-100 rounded-full"><ChevronLeftIcon className="h-5 w-5" /></button>
                                    <h2 className="text-xl font-black text-gray-800">Agenda Tecnica</h2>
                                </div>
                                <button onClick={() => agendaLogica.onOpenAddModal()} className="bg-indigo-600 text-white p-2 rounded-full shadow-lg active:scale-90 transition-transform">
                                    <PlusIcon className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
                                {/* 🌟 INIEZIONE SICURA DEL DB ALL'AGENDA */}
                                <AgendaContent {...agendaLogica} onCompileForm={handleCompileForm} db={db} />
                            </div>
                        </div>
                    )}

                    {view === 'reports' && (
                        <div className="animate-fade-in flex flex-col flex-1 min-h-[75vh] w-full">
                             <div className="flex items-center gap-2 mb-4 px-2">
                                <button onClick={handleBackToMain} className="p-2 bg-gray-100 rounded-full"><ChevronLeftIcon className="h-5 w-5" /></button>
                                <h2 className="text-xl font-black text-gray-800">Archivio Report</h2>
                            </div>
                            <ReportScreen onBack={handleBackToMain} />
                        </div>
                    )}

                    {view === 'newReport' && (
                        <div className="animate-fade-in flex flex-col flex-1 min-h-[75vh] w-full">
                             <div className="flex items-center gap-2 mb-4 px-2">
                                <button onClick={handleBackToMain} className="p-2 bg-gray-100 rounded-full"><ChevronLeftIcon className="h-5 w-5" /></button>
                                <h2 className="text-xl font-black text-gray-800">Nuovo Report Tecnico</h2>
                            </div>
                            <ReportTecnicoScreen onBack={handleBackToMain} cantieri={cantieri} userAziendaId={userData?.companyID} forms={forms} aziendeForm={aziendeForm} onCompile={handleCompileForm} />
                        </div>
                    )}

                    {view === 'assegnazioni' && (
                        <div className="animate-fade-in flex flex-col flex-1 min-h-[75vh] w-full">
                            <div className="flex items-center gap-4 mb-4 px-2">
                                <button onClick={handleBackToMain} className="p-2 bg-gray-100 rounded-full"><ChevronLeftIcon className="h-5 w-5" /></button>
                                <h2 className="text-xl font-black text-gray-800">Le mie dotazioni</h2>
                            </div>
                            <GestioneAssegnazioniMagazzinoView 
                                assegnazioni={mieAssegnazioni} 
                                onSegnalaGuasto={handleSegnalaGuasto} 
                                onConferma={handleConferma} 
                                onRestituzione={handleRestituzione} 
                                loading={loadingData} 
                            />
                        </div>
                    )}

                    {view === 'compila_sopralluogo' && compilingSopralluogo.visible && ( 
                        <SopralluogoFormScreen 
                            formTemplateId={compilingSopralluogo.templateId} 
                            offertaId={compilingSopralluogo.offertaId} 
                            cantiereId={compilingSopralluogo.cantiereId} 
                            user={user} 
                            userAziendaId={userData?.companyID} 
                            onBack={handleBackToMain} 
                            onSubmit={handleFormSubmit} 
                            isSaving={isSaving} 
                        /> 
                    )}
                </div>

                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-1px_10px_rgba(0,0,0,0.1)] z-40 pb-safe">
                    <div className="flex justify-around items-center h-16">
                        <button onClick={() => setView('main')} className={`flex flex-col items-center justify-center w-full h-full ${view === 'main' ? 'text-indigo-600' : 'text-gray-400'}`}>
                            <HomeIcon className="h-6 w-6" />
                            <span className="text-[10px] font-black mt-1 uppercase">Home</span>
                        </button>
                        <button onClick={() => setView('agenda')} className={`flex flex-col items-center justify-center w-full h-full ${view === 'agenda' ? 'text-indigo-600' : 'text-gray-400'}`}>
                            <CalendarIcon className="h-6 w-6" />
                            <span className="text-[10px] font-black mt-1 uppercase">Agenda</span>
                        </button>
                        <button onClick={() => setView('reports')} className={`flex flex-col items-center justify-center w-full h-full ${view === 'reports' ? 'text-indigo-600' : 'text-gray-400'}`}>
                            <DocumentTextIcon className="h-6 w-6" />
                            <span className="text-[10px] font-black mt-1 uppercase">Archivio</span>
                        </button>
                        <button onClick={() => setView('assegnazioni')} className={`flex flex-col items-center justify-center w-full h-full relative ${view === 'assegnazioni' ? 'text-indigo-600' : 'text-gray-400'}`}>
                            <ArchiveBoxIcon className="h-6 w-6" />
                            {mieAssegnazioni.some(a => a.statoWorkflow === 'da confermare') && <span className="absolute top-2 right-6 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
                            <span className="text-[10px] font-black mt-1 uppercase">Attrezzi</span>
                        </button>
                    </div>
                </div>

            </MaskLayout>

            {isNotaModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
                    <AddNotaOperativaForm onSubmit={handleSaveNota} onCancel={() => setNotaModalOpen(false)} isSaving={isSavingNota} />
                </div>
            )}

          {isDocumentModalOpen && (
    <div className="z-[10000] relative">
        <DocumentModal isOpen={true} onClose={() => setDocumentModalOpen(false)} documents={documenti} cantiereName={selectedCantiereName}/>
    </div>
)}

            {isAssegnaModalOpen && (
                <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-slide-up">
                        <h3 className="text-xl font-black mb-1 text-gray-900">Assegna Personale</h3>
                        <p className="text-xs text-gray-500 mb-5">Collega un preposto o un dipendente a questo cantiere.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Cantiere</label>
                                <select 
                                    value={assegnaCantiereId} 
                                    onChange={e => setAssegnaCantiereId(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold rounded-xl p-3 mt-1 focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">-- Seleziona Cantiere --</option>
                                    {cantieri.map(c => <option key={c.id} value={c.id}>{c.nomeCantiere}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Personale da Assegnare</label>
                                <select 
                                    value={assegnaUtenteId} 
                                    onChange={e => setAssegnaUtenteId(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold rounded-xl p-3 mt-1 focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">-- Seleziona Utente --</option>
                                    {users
                                        .filter(u => ['preposto', 'dipendente', 'operaio'].includes(u.ruolo?.toLowerCase()))
                                        .map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.nome} {u.cognome} ({u.ruolo?.toUpperCase()})
                                            </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="mt-6 flex gap-3">
                            <button onClick={() => setIsAssegnaModalOpen(false)} className="flex-1 p-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-700 transition-colors">Annulla</button>
                            <button onClick={handleAssegnaUtente} className="flex-1 p-3 bg-teal-600 hover:bg-teal-700 rounded-xl font-bold text-white transition-colors shadow-md">Assegna</button>
                        </div>
                    </div>
                </div>
            )}

            {agendaLogica.isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
                    <AggiungiEventoForm 
                        onClose={agendaLogica.onCloseModal} 
                        onSave={agendaLogica.onSave} 
                        initialData={agendaLogica.editingEvent} 
                        selectedDate={agendaLogica.selectedDate} 
                        users={users} 
                        user={user} 
                        userRole={userRole} 
                        isLoading={agendaLogica.isLoading} 
                        db={db}
                    />
                </div>
            )}
            
            {agendaLogica.selectedEvent && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
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
                        isLoading={agendaLogica.isLoading} 
                        db={db}
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