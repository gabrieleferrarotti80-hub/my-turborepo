// File: apps/app-esterna/src/components/PrepostoMask.jsx

import React, { useState, useEffect, useMemo,useCallback} from 'react';
import {
    useFirebaseData,
    useAgendaManager,
    useReportsManager,
    useAssegnazioniManager,
    useNoteOperativeManager,
} from 'shared-core';
import { AgendaContent, AddNotaOperativaForm, AggiungiEventoForm, DettagliEventoModal } from 'shared-ui';
import { ActionButtons } from './ActionButtons.jsx';
import { MaskLayout } from './MaskLayout.jsx';
import { AssegnazioniMagazzino } from './AssegnazioniMagazzino.jsx';
import { DocumentModal } from './DocumentModal.jsx';
import { SopralluogoFormScreen } from './SopralluogoFormScreen.jsx';
import { CameraIcon, VideoCameraIcon, FolderIcon } from '@heroicons/react/24/solid';


// ... (Funzioni openFilePicker e getCurrentLocation invariate) ...
const openFilePicker = (acceptType) => {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = acceptType;
        input.capture = 'environment';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                resolve(file);
            } else {
                reject(new Error("Acquisizione file annullata dall'utente."));
            }
        };
        input.oncancel = () => {
             reject(new Error("Acquisizione file annullata dall'utente."));
        };
        input.click();
    });
};
const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            return reject(new Error("La geolocalizzazione non è supportata da questo browser."));
        }
        navigator.geolocation.getCurrentPosition(
            (position) => resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            }),
            (err) => reject(new Error(`Errore GPS: ${err.message}`))
        );
    });
};


// --- ❗ MODIFICA CHIAVE ---
// Aggiungi 'userData' alla lista delle props
export const PrepostoMask = ({ user, userData, onLogout, cantieri }) => {
// --- FINE MODIFICA ---
    
  	// --- 1. HOOKS E DATI DAL CONTESTO ---
  	const { db, storage, userAziendaId, userRole, loadingData, data } = useFirebaseData();
  	const { 
  	   	eventi, 
  	   	documenti, 
  	   	users, 
  	   	userAssegnazioni 
  	} = data || {}; 

  	const { addReport, isSaving: isSavingReport } = useReportsManager(db, storage, user, userAziendaId);
  	const { ...agendaLogica } = useAgendaManager({ eventi, documenti, user, users, userRole, loadingData, db, userAziendaId });
  	const { confermaPresaInCarico, richiediRestituzione, segnalaGuasto } = useAssegnazioniManager(db, user);
  	const { addNotaOperativa, isSaving: isSavingNota } = useNoteOperativeManager();

  	// --- 2. STATI LOCALI PER LA UI (Invariati) ---
  	const [view, setView] = useState('main');
  	const [selectedCantiere, setSelectedCantiere] = useState('');
  	const [selectedCantiereName, setSelectedCantiereName] = useState('');
  	const [isDocumentModalOpen, setDocumentModalOpen] = useState(false);
  	const [isNotaModalOpen, setNotaModalOpen] = useState(false);
  	const [statusMessage, setStatusMessage] = useState('');
  	const isSaving = isSavingReport || isSavingNota || agendaLogica.isLoading;
  	const [compilingSopralluogo, setCompilingSopralluogo] = useState({ 
  	   	visible: false, 
  	   	templateId: null, 
  	   	offertaId: null
  	});

  	// --- 3. LOGICA DERIVATA (Invariata) ---
  	const nuoveAssegnazioniDaConfermare = useMemo(() => {
  	   	return !loadingData && Array.isArray(userAssegnazioni) && userAssegnazioni.some(a => a.statoWorkflow === 'da confermare');
  	}, [userAssegnazioni, loadingData]);

  	const upcomingEvents = useMemo(() => {
  	   	if (!eventi || !user) return [];
  	   	const today = new Date();
  	   	const nextSevenDays = new Date();
  	   	nextSevenDays.setDate(today.getDate() + 7);
  	   	return eventi
  	   	   	.filter(event => {
  	   	   	   	const eventDate = event.start;
  	   	   	   	if (!eventDate) return false;
  	   	   	   	const isPartecipante = event.partecipanti?.some(p => p.userId === (user.uid || user.id));
  	 	   	   	return isPartecipante && eventDate >= today && eventDate <= nextSevenDays;
  	   	   	})
  	   	   	.sort((a, b) => a.start - b.start);
  	}, [eventi, user]);

  	const buttonClasses = `
  	   	flex flex-col items-center justify-center p-6 rounded-2xl shadow-sm border-2 border-gray-800
  	   	text-gray-700 font-semibold text-center transition-all duration-300
  	   	hover:bg-gray-100 hover:shadow-md active:scale-[0.98]
  	   	disabled:opacity-50 disabled:cursor-not-allowed
  	`;

  	// --- 4. EFFETTI (Invariati) ---
  	useEffect(() => {
  	   	if (cantieri && cantieri.length > 0) {
  	 	   	setSelectedCantiere(cantieri[0].id);
  	 	   	setSelectedCantiereName(cantieri[0].nomeCantiere);
  	   	} else {
  	 	   	setSelectedCantiere('');
  	 	   	setSelectedCantiereName('');
  	   	}
  	}, [cantieri]);

  	// --- 5. HANDLERS (Invariati) ---
  	const handleAction = async (action, ...args) => {
  	   	const result = await action(...args);
  	   	setStatusMessage(result.message || (result.success ? "Operazione completata!" : "Si è verificato un errore."));
  	};
  	const handleConferma = (assegnazioneId) => handleAction(confermaPresaInCarico, assegnazioneId);
  	const handleRestituzione = (assegnazione) => {
  	   	const note = prompt("Aggiungi una nota per la restituzione (opzionale):");
  	   	if (note !== null) handleAction(richiediRestituzione, assegnazione, note);
  	};
  	const handleSegnalaGuasto = (assegnazione) => {
  	   	const note = prompt("Descrivi il guasto (obbligatorio):");
  	   	if (note) handleAction(segnalaGuasto, assegnazione, note);
  	};
  	const handleCantiereChange = (e) => {
  	   	const cantiereId = e.target.value;
  	   	setSelectedCantiere(cantiereId);
  	   	const cantiere = cantieri.find(c => c.id === cantiereId);
  	   	if (cantiere) setSelectedCantiereName(cantiere.nomeCantiere);
  	};
  	const handleSaveNota = async (note, files) => {
  	   	const result = await addNotaOperativa(note, files);
  	   	setStatusMessage(result.message);
  	   	if (result.success) {
  	 	   	setNotaModalOpen(false);
  	   	}
  	   	return result;
  	};
  	const handleSaveEvento = async (eventoData) => {
  	   	const isEditing = !!agendaLogica.editingEvent;
  	   	const action = isEditing ? agendaLogica.onUpdateEvent : agendaLogica.onAddEvent;
  	   	const args = isEditing ? [agendaLogica.editingEvent.id, eventoData] : [eventoData];
  	   	const result = await action(...args);
  	   	setStatusMessage(result.message);
  	   	if (result.success) {
  	 	   	agendaLogica.onCloseModal();
  	   	}
  	};
  	const handleDeleteEvento = async (eventId) => {
  	   	const result = await agendaLogica.onDeleteEvent(eventId);
  	   	setStatusMessage(result.message);
  	   	if (result.success) {
  	 	   	agendaLogica.onCloseModal();
  	   	}
  	};
  	const handleConfirmarEvento = async (eventId) => {
  	   	const result = await agendaLogica.onConfirmEvent(eventId); 
  	   	setStatusMessage(result.message);
  	   	if (result.success) {
  	 	   	agendaLogica.onCloseModal();
  	   	}
  	};
  	const handleRechazarEvento = async (eventId) => {
  	   	const result = await agendaLogica.onRejectEvent(eventId);
  	   	setStatusMessage(result.message);
  	   	if (result.success) {
  	 	   	agendaLogica.onCloseModal();
  	   	}
  	};
  	const handleWorkPhaseReport = async (reportType, acceptType, isLavoroTerminato = false) => {
  	   	if (isSaving) return;
  	   	if (!selectedCantiere) {
  	 	   	setStatusMessage("Seleziona prima un cantiere.");
  	 	   	return;
  	   	}
  	   	try {
  	 	   	setStatusMessage("Acquisizione coordinate GPS...");
  	 	   	const location = await getCurrentLocation();
  	 	   	setStatusMessage("Apri fotocamera o seleziona file...");
  	 	   	const file = await openFilePicker(acceptType);
  	 	   	const note = prompt(`Aggiungi una nota per il report "${reportType}" (opzionale):`);
  	 	   	setStatusMessage(`Salvataggio del report "${reportType}"...`);
  	 	   	const result = await addReport(selectedCantiere, reportType, note, file, location, isLavoroTerminato);
  	 	   	setStatusMessage(result.message);
  	   	} catch (error) {
  	 	   	console.error("Errore durante la creazione del report:", error);
  	 	   	setStatusMessage(error.message);
  	   	}
  	};
  	const handleCompileForm = useCallback((formTemplateId, offertaId) => {
        if (agendaLogica && typeof agendaLogica.onCloseModal === 'function') {
  	 	 	agendaLogica.onCloseModal(); 
        }
  	 	setCompilingSopralluogo({ visible: true, templateId: formTemplateId, offertaId: offertaId });
  	 	setView('compila_sopralluogo'); 
    }, [agendaLogica, setCompilingSopralluogo, setView]);
  	const handleBackToMain = () => {
  	 	 	setView('main');
  	 	 	setCompilingSopralluogo({ visible: false, templateId: null, offertaId: null });
  	};
  	const handleInizioLavoro = () => handleWorkPhaseReport("Inizio Lavoro", "image/*");
  	const handleLavoroInCorso = () => handleWorkPhaseReport("Lavoro in Corso", "image/*");
  	const handleRegistraVideo = () => handleWorkPhaseReport("Registra Video", "video/*");
  	const handleFineLavoro = () => {
  	 	const isTerminato = window.confirm("Il lavoro è da considerarsi terminato e chiuso?\n\nClicca OK per confermare la chiusura, Annulla altrimenti.");
  	 	handleWorkPhaseReport("Fine Lavoro", "image/*", isTerminato);
  	};

  	// --- 6. RENDER ---
  	return (
  	   	<MaskLayout 
            user={user} 
            userData={userData} // 👈 Ora userData viene passato a MaskLayout
            onLogout={onLogout} 
            title="Dashboard Preposto" 
            subtitle={user?.email}
        >
  	 	   	
            {/* VISTA: Main Dashboard */}
            {view === 'main' && (
  	 	 	   	<>
  	 	 	   	   	{/* Selettore Cantiere */}
  	 	 	   	   	{cantieri && cantieri.length > 0 ? (
  	 	 	   	   	   	<select
  	 	 	   	   	   	   	value={selectedCantiere}
  	 	 	   	   	   	   	onChange={handleCantiereChange}
  	 	 	   	   	   	   	className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
  	 	 	   	   	   	>
  	 	 	   	   	   	   	{cantieri.map((cantiere) => (
  	 	 	   	   	   	   	   	<option key={cantiere.id} value={cantiere.id}>{cantiere.nomeCantiere}</option>
  	 	 	   	   	   	   	))}
  	 	 	   	   	   	</select>
  	 	 	   	   	) : (
  	 	 	   	   	   	<div className="text-center p-3 mt-1 border border-dashed border-gray-300 rounded-md bg-gray-50 text-gray-600">
  	 	 	   	   	   	   	Nessun cantiere assegnato al momento.
  	 	 	   	   	   	</div>
  	 	 	   	   	)}

                    {/* Notifica Nuove Assegnazioni */}
  	 	 	   	   	{nuoveAssegnazioniDaConfermare && (
  	 	 	   	   	   	<div className="my-4 p-4 border-l-4 border-yellow-500 bg-yellow-100 text-yellow-800 rounded-lg shadow-md animate-pulse cursor-pointer" onClick={() => setView('assegnazioni')}>
  	 	 	   	   	   	   	<h4 className="font-bold">Attenzione!</h4>
  	 	 	   	   	   	   	<p>Hai nuove attrezzature da confermare nella sezione Assegnazioni.</p>
  	 	 	   	   	   	</div>
  	 	 	   	   	)}

                    {/* Pulsanti Azione Principali */}
  	 	 	   	   	<ActionButtons
  	 	 	   	   	   	isSaving={isSaving}
  	 	 	   	   	   	onOpenCantiereActions={() => setView('cantiereActions')}
  	 	 	   	   	   	onOpenAgenda={() => setView('agenda')}
  	 	 	   	   	   	onOpenAssegnazioni={() => setView('assegnazioni')}
  	 	 	   	   	   	onOpenNotaOperativa={() => setNotaModalOpen(true)}
  	 	 	   	   _ />

                    {/* Appuntamenti */}
  	 	 	   	   	<div className="bg-white p-6 rounded-lg shadow-md mt-8">
  	 	 	   	   	   	<h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Appuntamenti prossimi 7 giorni</h3>
  	 	 	   	   	   	{upcomingEvents.length > 0 ? (
  	 	 	   	   	   	   	<ul className="space-y-4">
  	 	 	   	   	   	   	   	{upcomingEvents.map(event => (
  	 	 	   	   	   	   	   	   	<li key={event.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
  	 	 	   	   	   	   	   	   	   	<p className="font-semibold">{event.title}</p>
  	 	 	   	   	   	   	   	   	   	<p className="text-sm text-gray-600">{event.start.toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' })}</p>
  	 	 	   	   	   	   	   	   	</li>
  	 	 	   	   	   	   	   	))}
  	 	 	   	   	   	   	</ul>
  	 	 	   	   	   	) : (
  	 	 	   	   	   	   	<p className="text-gray-500 italic">Nessun appuntamento imminente.</p>
  	 	 	   	   	   	)}
  	 	 	   	   	</div>
  	 	 	   	</>
  	 	   	)}
  	 	   	
            {/* VISTA: Compilazione Sopralluogo */}
  	 	   	{view === 'compila_sopralluogo' && compilingSopralluogo.visible && (
  	 	 	   	<SopralluogoFormScreen
  	 	 	   	   	formTemplateId={compilingSopralluogo.templateId}
  	 	 	   	   	offertaId={compilingSopralluogo.offertaId}
  	 	 	   	   	onBack={handleBackToMain}
  	 	 	   	   	onSaveSuccess={(message) => {
  	 	 	   	   	   	setStatusMessage(message);
  	 	 	   	   	   	handleBackToMain();
  	 	 	   	   	}}
  	 	 	   	/>
  	 	   	)}

  	 	   	{/* VISTA: Schermata Azioni Cantiere */}
  	 	   {view === 'cantiereActions' && (
                <div className="animate-fade-in">
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                        <button onClick={() => setView('main')} className={`${buttonClasses} bg-gray-600 text-white hover:bg-gray-700`}>
                            <span className="text-sm font-semibold">&larr; Torna Indietro</span>
                        </button>
                        <button onClick={handleInizioLavoro} disabled={isSaving || !selectedCantiere} className={buttonClasses}>
                            <CameraIcon className="h-12 w-12 text-blue-500 mb-2" />
                            <span className="text-sm font-semibold">Inizio Lavoro</span>
                        </button>
                        <button onClick={handleLavoroInCorso} disabled={isSaving || !selectedCantiere} className={buttonClasses}>
                            <CameraIcon className="h-12 w-12 text-green-500 mb-2" />
                            <span className="text-sm font-semibold">Lavoro</span>
                        </button>
                        <button onClick={handleFineLavoro} disabled={isSaving || !selectedCantiere} className={buttonClasses}>
                            <CameraIcon className="h-12 w-12 text-red-500 mb-2" />
                            <span className="text-sm font-semibold">Fine Lavoro</span>
                        </button>
                        <button onClick={handleRegistraVideo} disabled={isSaving || !selectedCantiere} className={buttonClasses}>
                            <VideoCameraIcon className="h-12 w-12 text-indigo-500 mb-2" />
                            <span className="text-sm font-semibold">Registra Video</span>
                        </button>
                        <button onClick={() => setDocumentModalOpen(true)} disabled={isSaving || !selectedCantiere} className={buttonClasses}>
                            <FolderIcon className="h-12 w-12 text-gray-500 mb-2" />
                            <span className="text-sm font-semibold">Documenti</span>
                        </button>
                    </div>
                </div>
            )}

            {/* VISTA: Agenda */}
  	 	   	{view === 'agenda' && (
                <div>
                    <button onClick={() => setView('main')} className="mb-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">&larr; Torna alla dashboard</button>
      	 	 	   	<AgendaContent 
                        {...agendaLogica} 
                        onCompileForm={handleCompileForm}
                    />
                </div>
            )}

            {/* VISTA: Assegnazioni */}
  	 	   	{view === 'assegnazioni' && (
  	 	 	   	<div>
  	 	 	   	   	<button onClick={() => setView('main')} className="mb-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">&larr; Torna alla dashboard</button>
  	 	 	   	   	<AssegnazioniMagazzino
  	 	 	   	   	   	loading={loadingData}
  	 	 	   	   	   	assegnazioni={userAssegnazioni}
  	 	 	   	   	   	onConferma={handleConferma}
  	 	 	   	   	   	onRestituzione={handleRestituzione}
  	 	 	   	   	   	onSegnalaGuasto={handleSegnalaGuasto}
  	 	 	   	   	/>
  	 	 	   	</div>
  	 	   	)}

  	 	   	{/* Modal Nota Operativa */}
  	 	   	{isNotaModalOpen && (
  	 	 	   	<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  	 	 	   	   	<AddNotaOperativaForm
  	 	 	   	   	   	onSubmit={handleSaveNota}
  	 	 	   	   	   	onCancel={() => setNotaModalOpen(false)}
  	 	 	   	   	   	isSaving={isSavingNota}
  	 	 	   	   	/>
  	 	 	   	</div>
  	 	   	)}

  	 	   	{/* Modal Aggiungi/Modifica Evento */}
  	 	   	{agendaLogica.isAddModalOpen && (
  	 	 	   	<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  	 	 	   	   	<AggiungiEventoForm
            onClose={agendaLogica.onCloseModal} 
            onSave={agendaLogica.onSave}
            initialData={agendaLogica.editingEvent}
            selectedDate={agendaLogica.selectedDate}
            users={users}
            user={user}
            userRole={userRole}
            isLoading={agendaLogica.isLoading}
            error={agendaLogica.error}
        />
    </div>
  	 	   	)}

  	 	   	{/* Modal Dettagli Evento */}
  	 	   	{agendaLogica.selectedEvent && !agendaLogica.isAddModalOpen && (
  	 	 	   	<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  	 	 	   	   	<DettagliEventoModal
  	 	 	   	   	   	event={agendaLogica.selectedEvent}
  	 	 	   	 	   	onClose={agendaLogica.onCloseModal}
  	 	 	   	   	   	onEdit={agendaLogica.onEditEvent}
  	 	 	   	   	   	onDelete={handleDeleteEvento}
  	 	 	   	   	   	onConfirm={handleConfirmarEvento}
  	 	 	   	   	   	onReject={handleRechazarEvento}
                        	onCompileForm={handleCompileForm}
  	 	 	   	   	   	users={users}
  	 	 	   	   	   	currentUser={user}
  	 	 	   	   	   	documenti={documenti}
  	 	 	   	 	   	isLoading={agendaLogica.isLoading}
  	 	 	   	   	/>
  	 	 	   	</div>
  	 	   	)}
  	 	   	
   	{statusMessage && (
  	 	   	   	<div className="fixed bottom-4 right-4 p-4 text-sm font-medium text-white bg-gray-800 rounded-lg shadow-lg" onAnimationEnd={() => setStatusMessage('')}>
  	 	 	   	   	   	{statusMessage}
  	 	 	   	   	</div>
  	 	   	)}
  	 	   	<DocumentModal isOpen={isDocumentModalOpen} onClose={() => setDocumentModalOpen(false)} documents={documenti} cantiereName={selectedCantiereName}/>
  	   	</MaskLayout>
  	);
};