// File: apps/app-esterna/src/components/DipendenteMask.jsx

import React, { useState, useMemo, useEffect } from 'react';
import {
    useFirebaseData,
    useAgendaManager,
    useAssegnazioniManager,
    useNoteOperativeManager
} from 'shared-core';
import {
    AgendaContent,
    AddNotaOperativaForm,
    DettagliEventoModal
} from 'shared-ui';
import { MaskLayout } from './MaskLayout.jsx';
import { AssegnazioniMagazzino } from './AssegnazioniMagazzino.jsx';
import { 
    ArchiveBoxIcon, 
    CalendarIcon, 
    PencilSquareIcon,
    HomeIcon,
    ShieldExclamationIcon,
    ChevronLeftIcon,
    ChevronDownIcon,
    BuildingOfficeIcon
} from '@heroicons/react/24/solid';

export const DipendenteMask = ({ user, userData, data, onLogout }) => {
    
    const { db, userRole, loadingData } = useFirebaseData();

    // Estraiamo i dati passati dal padre
    const { 
        users = [], 
        eventi = [], 
        assegnazioniMagazzino = [],
        notifiche = [],
        cantieriAssegnati = [], // 🌟 I cantieri a cui è assegnato
        cantieri = [] // La lista globale dei cantieri (nel caso serva per lookup)
    } = data || {};

    const [view, setView] = useState('main');
    const [statusMessage, setStatusMessage] = useState('');
    const [isNotaModalOpen, setNotaModalOpen] = useState(false);
    
    // --- 🌟 LOGICA SELETTORE CANTIERE ---
    const [selectedCantiere, setSelectedCantiere] = useState('');
    
    // Imposta il primo cantiere assegnato come default se disponibile
    useEffect(() => {
        if (cantieriAssegnati && cantieriAssegnati.length > 0 && !selectedCantiere) {
            setSelectedCantiere(cantieriAssegnati[0].id); 
        }
    }, [cantieriAssegnati, selectedCantiere]);

    const handleCantiereChange = (e) => {
        setSelectedCantiere(e.target.value);
    };

    // --- LOGICA FILTRO EVENTI SICURO ---
    const eventiFiltrati = useMemo(() => {
        if (!eventi || !user) return [];
        
        const idsMieiCantieri = new Set(cantieriAssegnati.map(c => c.id));
        
        return eventi.filter(ev => {
            const isPartecipante = ev.partecipanti?.some(p => p.userId === user.uid);
            const isMioCantiere = ev.cantiereId && idsMieiCantieri.has(ev.cantiereId);
            const isCreatore = ev.userId === user.uid;
            
            return isPartecipante || isMioCantiere || isCreatore;
        });
    }, [eventi, cantieriAssegnati, user]);

    // Passiamo 'eventiFiltrati' al manager dell'agenda
    const agendaLogica = useAgendaManager({ 
        eventi: eventiFiltrati, 
        user, 
        users, 
        userRole, 
        loadingData, 
        db, 
        userAziendaId: userData?.companyID 
    });

    // --- LOGICA ATTREZZATURE ---
    const { confermaPresaInCarico, richiediRestituzione, segnalaGuasto } = useAssegnazioniManager(db, user);
    const { addNotaOperativa, isSaving: isSavingNota } = useNoteOperativeManager();

    const mieAssegnazioni = useMemo(() => {
        if (!assegnazioniMagazzino || !user) return [];
        return assegnazioniMagazzino
            .filter(item => item.assegnatoA === user.uid)
            .map(a => ({
                ...a,
                statoWorkflow: (a.statoWorkflow || a.stato || 'attiva').toLowerCase().trim()
            }));
    }, [assegnazioniMagazzino, user]);

    const handleBackToMain = () => setView('main');

    const handleAction = async (action, ...args) => {
        const result = await action(...args);
        setStatusMessage(result.message || (result.success ? "Fatto!" : "Errore"));
    };

    const handleSaveNota = async (note, files) => {
        const res = await addNotaOperativa(note, files);
        if (res.success) setNotaModalOpen(false);
        setStatusMessage(res.message);
    };

    const mobileBigBtn = "w-full flex items-center justify-between p-6 rounded-3xl bg-white shadow-sm border border-gray-100 active:scale-95 transition-transform";

    return (
        <>
            <MaskLayout user={user} userData={userData} data={data} onLogout={onLogout} title="Area Personale" subtitle={user?.email}>
                
               <div className="pb-24 pt-2 px-2 min-h-full flex flex-col">

                    {view === 'main' && (
                        <div className="space-y-6 animate-fade-in">
                            
                            {/* 🌟 CANTIERE SELECTOR GIGANTE (Come Preposto/Tecnico) 🌟 */}
                            <div className="bg-indigo-900 rounded-[2rem] p-5 shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <BuildingOfficeIcon className="h-24 w-24 text-white" />
                                </div>
                                <label className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1 block px-1">Cantiere Assegnato</label>
                                {cantieriAssegnati?.length > 0 ? (
                                    <div className="relative">
                                        <select 
                                            value={selectedCantiere} 
                                            onChange={handleCantiereChange} 
                                            className="w-full appearance-none bg-transparent border-none text-white font-extrabold text-2xl p-1 focus:ring-0 focus:outline-none"
                                        >
                                            {cantieriAssegnati.map(c => <option key={c.id} value={c.id} className="text-gray-900 text-base">{c.nomeCantiere}</option>)}
                                        </select>
                                        <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-indigo-300 pointer-events-none" />
                                    </div>
                                ) : (
                                    <div className="text-indigo-200 font-medium px-1 mt-2">Nessun cantiere assegnato.</div>
                                )}
                            </div>

                            {/* AVVISO DOTAZIONI */}
                            {mieAssegnazioni.some(a => a.statoWorkflow === 'da confermare') && (
                                <div onClick={() => setView('dotazioni')} className="bg-amber-50 border-l-4 border-amber-500 rounded-r-2xl p-4 flex gap-4 items-center cursor-pointer shadow-sm animate-pulse">
                                    <ShieldExclamationIcon className="h-8 w-8 text-amber-500" />
                                    <div>
                                        <p className="font-bold text-amber-900 text-sm">Hai attrezzatura da confermare</p>
                                        <p className="text-xs text-amber-700 font-medium">Tocca per firmare la presa in carico</p>
                                    </div>
                                </div>
                            )}

                            {/* PULSANTI RAPIDI */}
                            <div className="grid grid-cols-1 gap-4">
                                <button onClick={() => setView('dotazioni')} className={mobileBigBtn}>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-amber-100 p-4 rounded-2xl"><ArchiveBoxIcon className="h-8 w-8 text-amber-600"/></div>
                                        <div className="text-left">
                                            <span className="block font-bold text-gray-900 text-lg">Le mie Dotazioni</span>
                                            <span className="block text-xs text-gray-500 font-medium">Vedi attrezzi e DPI in carico</span>
                                        </div>
                                    </div>
                                </button>

                                <button onClick={() => setNotaModalOpen(true)} className={mobileBigBtn}>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-100 p-4 rounded-2xl"><PencilSquareIcon className="h-8 w-8 text-blue-600"/></div>
                                        <div className="text-left">
                                            <span className="block font-bold text-gray-900 text-lg">Invia Nota Libera</span>
                                            <span className="block text-xs text-gray-500 font-medium">Scrivi un messaggio all'ufficio</span>
                                        </div>
                                    </div>
                                </button>
                            </div>

                            {/* PROSSIMI APPUNTAMENTI */}
                            <div className="mt-4 px-2">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4" /> I tuoi impegni
                                </h3>
                                {eventiFiltrati.length > 0 ? (
                                    <div className="space-y-3">
                                        {eventiFiltrati.slice(0, 3).map(ev => (
                                            <div key={ev.id} onClick={() => setView('agenda')} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer">
                                                <div className={`w-1.5 h-8 rounded-full ${ev.cantiereId ? 'bg-indigo-500' : 'bg-orange-500'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-gray-900 truncate">{ev.title || ev.titolo}</p>
                                                    <p className="text-xs font-medium text-gray-400">
                                                        {ev.start?.toDate ? ev.start.toDate().toLocaleDateString('it-IT') : new Date(ev.start).toLocaleDateString('it-IT')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                        <p className="text-sm text-gray-400 font-medium">Nessun impegno programmato</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* VISTE SECONDARIE */}
                    {view === 'dotazioni' && (
                        <div className="animate-fade-in">
                            <div className="flex items-center gap-4 mb-6 px-2">
                                <button onClick={handleBackToMain} className="p-2 bg-white rounded-full border border-gray-100 shadow-sm"><ChevronLeftIcon className="h-6 w-6" /></button>
                                <h2 className="text-xl font-black text-gray-900">Magazzino Personale</h2>
                            </div>
                            <AssegnazioniMagazzino 
                                assegnazioni={mieAssegnazioni} 
                                onConferma={(id) => handleAction(confermaPresaInCarico, id)}
                                onRestituzione={(a) => { const n = prompt("Nota:"); if(n!==null) handleAction(richiediRestituzione, a, n)}}
                                onSegnalaGuasto={(a) => { const n = prompt("Descrivi guasto:"); if(n) handleAction(segnalaGuasto, a, n)}}
                                loading={loadingData} 
                            />
                        </div>
                    )}

                    {view === 'agenda' && (
                       <div className="animate-fade-in flex flex-col flex-1 min-h-[75vh] w-full">
                            <div className="flex items-center gap-4 mb-4 px-2">
                                <button onClick={handleBackToMain} className="p-2 bg-white rounded-full border border-gray-100 shadow-sm"><ChevronLeftIcon className="h-6 w-6" /></button>
                                <h2 className="text-xl font-black text-gray-900">Il mio Calendario</h2>
                            </div>
                            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex-1">
                                <AgendaContent {...agendaLogica} />
                            </div>
                        </div>
                    )}

                </div>

                {/* BOTTOM NAVIGATION BAR */}
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-40 pb-safe">
                    <div className="flex justify-around items-center h-16">
                        <button onClick={() => setView('main')} className={`flex flex-col items-center justify-center w-full h-full ${view === 'main' ? 'text-indigo-600' : 'text-gray-400'}`}>
                            <HomeIcon className="h-6 w-6" />
                            <span className="text-[10px] font-black mt-1 uppercase">Home</span>
                        </button>
                        <button onClick={() => setView('agenda')} className={`flex flex-col items-center justify-center w-full h-full ${view === 'agenda' ? 'text-indigo-600' : 'text-gray-400'}`}>
                            <CalendarIcon className="h-6 w-6" />
                            <span className="text-[10px] font-black mt-1 uppercase">Agenda</span>
                        </button>
                        <button onClick={() => setView('dotazioni')} className={`flex flex-col items-center justify-center w-full h-full relative ${view === 'dotazioni' ? 'text-indigo-600' : 'text-gray-400'}`}>
                            <ArchiveBoxIcon className="h-6 w-6" />
                            {mieAssegnazioni.some(a => a.statoWorkflow === 'da confermare') && <span className="absolute top-2 right-6 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
                            <span className="text-[10px] font-black mt-1 uppercase">Dotazioni</span>
                        </button>
                    </div>
                </div>

            </MaskLayout>

            {/* MODALI ESTERNE */}
            {isNotaModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <AddNotaOperativaForm onSubmit={handleSaveNota} onCancel={() => setNotaModalOpen(false)} isSaving={isSavingNota} />
                </div>
            )}

            {agendaLogica.selectedEvent && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <DettagliEventoModal 
                        event={agendaLogica.selectedEvent} 
                        onClose={agendaLogica.onCloseModal} 
                        users={users} 
                        currentUser={user} 
                        isLoading={agendaLogica.isLoading} 
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