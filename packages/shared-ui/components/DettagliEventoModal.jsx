// packages/shared-ui/components/DettagliEventoModal.jsx

import React, { useMemo } from 'react';
import { 
    XMarkIcon, PencilIcon, CheckIcon, NoSymbolIcon, DocumentTextIcon,
    ClockIcon, 
    ExclamationTriangleIcon
} from '@heroicons/react/24/solid';

export const DettagliEventoModal = ({
    event,
    currentUser,
    users = [], 
    onClose,
    onEdit, // Prop per la modifica
    onConferma, // ✅ Usato per Conferma Iniziale (Preposto) E Accetta Modifica (Admin)
    onRifiuta,  // ✅ Usato per Rifiuto Iniziale (Preposto) E Rifiuta Modifica (Admin)
    onDelete,
    onCompileForm,
    isLoading,
    
    // --- ❌ PROPS OBSOLETE RIMOSSE ---
    // onAccettaModifica, (usiamo onConferma)
    // onRifiutaModifica (usiamo onRifiuta)
}) => {
    // Crea una mappa per cercare i nomi velocemente
    const userMap = useMemo(() => new Map(users.map(u => [u.id, `${u.nome} ${u.cognome}`])), [users]); 

    if (!event) return null;

    // --- ✅ INIZIO LOGICA PING-PONG CORRETTA ---
    const currentUserId = currentUser?.uid || currentUser?.id || '';
    const currentUserPartecipante = event.partecipanti?.find(p => p.userId === currentUserId);
    
    // Ruoli
    const isOrganizer = currentUserPartecipante?.ruolo === 'organizzatore';
    const isInvitato = !!currentUserPartecipante && !isOrganizer;
    
    // Stati
    const statoAttuale = event.stato || 'da_confermare';
    const isStatoDaConfermare = statoAttuale === 'da_confermare';
    const isStatoModificaProposta = statoAttuale === 'modifica_proposta';
    const isStatoRifiutato = statoAttuale === 'rifiutato';

    // 1. Logica Pulsanti per PREPOSTO (Invitato)
    // Mostra i pulsanti [Conferma, Rifiuta] solo se è un Invitato
    // E lo stato è 'da_confermare'.
    const showBottoniPreposto = isInvitato && isStatoDaConfermare;

    // 2. Logica Pulsanti per ADMIN (Organizzatore)
    // Mostra i pulsanti [Accetta Modifica, Rifiuta Modifica] solo se è l'Organizzatore
    // E lo stato è 'modifica_proposta'.
    const showBottoniAdmin = isOrganizer && isStatoModificaProposta;

    // 3. Logica Pulsante "Modifica / Proponi"
    // Chiunque sia un partecipante può cliccare 'Modifica', a meno che l'evento non sia rifiutato.
    // L'handler `onEdit` apre il form. La logica di cosa succede al salvataggio
    // è gestita correttamente da `useAgendaAction.updateEvento`.
    const puoModificare = (isOrganizer || isInvitato) && !isStatoRifiutato;

    // 4. Logica Pulsante "Elimina"
    const puoEliminare = isOrganizer; // Solo l'admin può eliminare

    // 5. Logica Compilazione Form (invariata)
    const canCompileForm = typeof onCompileForm === 'function' && !!event.formTemplateId; 
    // --- ✅ FINE LOGICA PING-PONG ---


    // --- Handlers (Semplificati) ---
    const handleEditClick = () => {
        if (typeof onEdit === 'function') onEdit(event);
    };
    
    // Questi handler ora servono sia per l'azione iniziale (Preposto)
    // sia per la risposta alla proposta (Admin)
    const handleConfermaClick = () => { onConferma(event.id, event); };
    const handleRifiutaClick = () => { onRifiuta(event.id, event); };
    
    const handleDeleteClick = () => {
        if (typeof onDelete === 'function') {
             if (window.confirm("Sei sicuro di voler eliminare questo evento?")) {
                  onDelete(event.id);
             }
        }
    };
    const handleCompileClick = () => { onCompileForm(event.formTemplateId, event.offertaId); };

    // --- ❌ HANDLER OBSOLETI RIMOSSI ---
    // handleAccettaModificaClick
    // handleRifiutaModificaClick


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="h-6 w-6" />
                </button>

                <h2 className="text-2xl font-bold text-gray-800 mb-4">{event.title}</h2>

                {/* --- ✅ MESSAGGI DI STATO "PING-PONG" CORRETTI --- */}

                {/* Messaggio per ADMIN quando è il suo turno */}
                {isStatoModificaProposta && isOrganizer && (
                    <div className="mb-4 p-3 rounded-md bg-yellow-50 border border-yellow-300 text-yellow-800">
                        <div className="flex items-center gap-2">
                            <ExclamationTriangleIcon className="h-5 w-5" />
                            <span className="font-semibold">Azione Richiesta:</span> Il tecnico ha proposto una modifica.
                        </div>
                    </div>
                )}
                
                {/* Messaggio per PREPOSTO quando sta aspettando */}
                {isStatoModificaProposta && isInvitato && (
                    <div className="mb-4 p-3 rounded-md bg-yellow-100 border border-yellow-300 text-yellow-800">
                        <div className="flex items-center gap-2">
                            <ClockIcon className="h-5 w-5" />
                            <span className="font-semibold">In attesa di approvazione dall'amministratore.</span>
                        </div>
                    </div>
                )}
                
                {/* Messaggio per PREPOSTO quando è il suo turno */}
                {isStatoDaConfermare && isInvitato && (
                     <div className="mb-4 p-3 rounded-md bg-blue-50 border border-blue-300 text-blue-800">
                        <div className="flex items-center gap-2">
                            <ExclamationTriangleIcon className="h-5 w-5" />
                            <span className="font-semibold">Azione Richiesta:</span> Confermare o modificare l'appuntamento.
                        </div>
                    </div>
                )}
                
                {/* --- FINE MESSAGGI DI STATO --- */}


                <div className="space-y-4 text-gray-700">
                    {/* Visualizzazione dettagli evento */}
                    <p><strong>Inizio:</strong> {event.start?.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</p>
                    {event.end && <p><strong>Fine:</strong> {event.end?.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</p>}
                    {event.description && <p><strong>Descrizione:</strong> {event.description}</p>}
                    
                    {/* ❌ RIMOSSA SEZIONE "Dati Proposti" */}
                    {/* I dati dell'evento (titolo, inizio, fine) sono GIA' quelli proposti, */}
                    {/* perché `updateEvento` li salva direttamente. */}
                    
                    <p><strong>Stato:</strong> <span className="font-semibold capitalize">{event.stato?.replace('_', ' ')}</span></p>
                    
                    {/* Visualizzazione Nomi Partecipanti */}
                    {event.partecipanti && event.partecipanti.length > 0 && (
                        <div>
                            <strong>Partecipanti:</strong>
                            <ul className="list-disc list-inside ml-4">
                                {event.partecipanti.map(p => (
                                    <li key={p.userId}>
                                        {userMap.get(p.userId) || p.userId}
                                        <span className="text-gray-500 text-sm"> ({p.ruolo})</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-4 pt-6 mt-6 border-t">
                    
                    {/* --- ✅ PULSANTI WORKFLOW "PING-PONG" CORRETTI --- */}

                    {/* Caso 1: È il turno del PREPOSTO (stato 'da_confermare') */}
                    {showBottoniPreposto && (
                        <>
                            <button onClick={handleRifiutaClick} disabled={isLoading} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2 disabled:opacity-50">
                                <NoSymbolIcon className="h-5 w-5" /> Rifiuta
                            </button>
                            <button onClick={handleConfermaClick} disabled={isLoading} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 disabled:opacity-50">
                                <CheckIcon className="h-5 w-5" /> Conferma
                            </button>
                        </>
                    )}

                    {/* Caso 2: È il turno dell'ADMIN (stato 'modifica_proposta') */}
                    {showBottoniAdmin && (
                        <>
                            {/* Chiama lo stesso handler 'onRifiuta' */}
                            <button onClick={handleRifiutaClick} disabled={isLoading} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2 disabled:opacity-50">
                                Rifiuta Modifica
                            </button>
                            {/* Chiama lo stesso handler 'onConferma' */}
                            <button onClick={handleConfermaClick} disabled={isLoading} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 disabled:opacity-50">
                                Accetta Modifica
                            </button>
                        </>
                    )}

                    {/* Pulsante Modifica / Proponi / Contro-proposta */}
                    {puoModificare && (
                        <button onClick={handleEditClick} disabled={isLoading} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50">
                            <PencilIcon className="h-5 w-5" /> 
                            {/* Testo dinamico in base al contesto */}
                            {showBottoniAdmin ? 'Contro-proposta' : (showBottoniPreposto ? 'Proponi Modifica' : 'Modifica')}
                        </button>
                    )}
                    
                    {/* Pulsanti Elimina (solo Organizzatore) */}
                    {puoEliminare && (
                         <button onClick={handleDeleteClick} disabled={isLoading} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 flex items-center gap-2 disabled:opacity-50">
                             Elimina
                         </button>
                    )}
                    
                    {/* Pulsante Compila Modulo (invariato) */}
                    {canCompileForm && (
                        <button 
                            onClick={handleCompileClick} 
                            disabled={isLoading} 
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                        >
                            <DocumentTextIcon className="h-5 w-5" />
                            Compila Modulo
                        </button>
                    )}
                </div>
                {isLoading && <p className="text-sm text-gray-500 text-center mt-2">Operazione in corso...</p>}
            </div>
        </div>
    );
};