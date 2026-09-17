// packages/shared-ui/components/DettagliEventoModal.jsx

import React, { useMemo } from 'react';
import { 
    XMarkIcon, PencilIcon, CheckIcon, NoSymbolIcon, DocumentTextIcon,
    ClockIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/solid';

export const DettagliEventoModal = ({
    event, currentUser, users = [], onClose, onEdit,
    onConferma, onRifiuta, onDelete, onCompileForm, isLoading,
}) => {
    const userMap = useMemo(() => new Map(users.map(u => [u.id, `${u.nome} ${u.cognome}`])), [users]); 

    if (!event) return null;

    const currentUserId = currentUser?.uid || currentUser?.id || '';
    
    // --- 🕵️‍♂️ IDENTIFICAZIONE UNIVERSALE DEGLI ATTORI ---
    const creatoreId = event.createdBy || event.partecipanti?.find(p => p.ruolo === 'organizzatore')?.userId;
    const isCreator = currentUserId === creatoreId;
    const isParticipant = event.partecipanti?.some(p => p.userId === currentUserId && p.ruolo !== 'organizzatore');
    const isAssegnato = event.assegnatoA === currentUserId || event.userId === currentUserId;
    const isAssignee = (isParticipant || isAssegnato) && !isCreator; 

    // --- 🎾 STATI DEL PING PONG ---
    const statoAttuale = event.stato || 'da_confermare';
    const isStatoDaConfermare = statoAttuale === 'da_confermare';
    const isStatoModificaProposta = statoAttuale === 'modifica_proposta';
    const isStatoRifiutato = statoAttuale === 'rifiutato';

    const toccaAllAssegnatario = isAssignee && isStatoDaConfermare;
    const toccaAlCreatore = isCreator && isStatoModificaProposta;

    const showBottoniAzione = toccaAllAssegnatario || toccaAlCreatore;
    const puoModificare = (isCreator || isAssignee) && !isStatoRifiutato;
    const puoEliminare = isCreator; 
    const canCompileForm = typeof onCompileForm === 'function' && !!event.formTemplateId; 

    // --- Handlers ---
    const handleEditClick = () => { if (typeof onEdit === 'function') onEdit(event); };
    const handleConfermaClick = () => { onConferma(event.id, event); };
    const handleRifiutaClick = () => { onRifiuta(event.id, event); };
    const handleDeleteClick = () => {
        if (typeof onDelete === 'function') {
             if (window.confirm("Sei sicuro di voler eliminare questo evento dal database?")) onDelete(event.id);
        }
    };
    const handleCompileClick = () => { onCompileForm(event.formTemplateId, event.offertaId); };

    const renderDate = (dateVal) => {
        if (!dateVal) return '';
        const dateObj = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
        return dateObj.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
    };

    // 🌟 FIX DESCRIZIONE BILINGUE
    const displayDescription = event.description || event.descrizione || event.note || event.dettagli;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
                    <XMarkIcon className="h-6 w-6" />
                </button>

                <h2 className="text-2xl font-bold text-gray-800 mb-4">{event.title || event.titolo}</h2>

                {/* --- 📢 BANNER DI AVVISO --- */}
                {toccaAlCreatore && (
                    <div className="mb-4 p-3 rounded-md bg-yellow-50 border border-yellow-300 text-yellow-800 flex items-center gap-2">
                        <ExclamationTriangleIcon className="h-5 w-5" />
                        <span className="font-semibold">Azione Richiesta:</span> L'assegnatario ha proposto una modifica di orario.
                    </div>
                )}
                {isAssignee && isStatoModificaProposta && (
                    <div className="mb-4 p-3 rounded-md bg-blue-50 border border-blue-300 text-blue-800 flex items-center gap-2">
                        <ClockIcon className="h-5 w-5" />
                        <span className="font-semibold">In attesa di approvazione da parte dell'organizzatore.</span>
                    </div>
                )}
                {toccaAllAssegnatario && (
                     <div className="mb-4 p-3 rounded-md bg-indigo-50 border border-indigo-300 text-indigo-800 flex items-center gap-2 shadow-sm">
                        <ExclamationTriangleIcon className="h-5 w-5 text-indigo-600" />
                        <span className="font-semibold">Azione Richiesta:</span> Conferma o proponi una modifica all'appuntamento.
                    </div>
                )}
                {isCreator && isStatoDaConfermare && (
                    <div className="mb-4 p-3 rounded-md bg-blue-50 border border-blue-300 text-blue-800 flex items-center gap-2">
                        <ClockIcon className="h-5 w-5" />
                        <span className="font-semibold">In attesa di conferma.</span>
                    </div>
                )}

                <div className="space-y-4 text-gray-700 mt-2">
                    <p><strong>Data:</strong> <span className="bg-gray-100 px-2 py-1 rounded">{renderDate(event.start || event.data)}</span></p>
                    {event.end && <p><strong>Fine:</strong> <span className="bg-gray-100 px-2 py-1 rounded">{renderDate(event.end)}</span></p>}
                    
                    {/* 🌟 FIX RIEPILOGO: Mostriamo il testo formattato mantenendo gli a capo (whitespace-pre-wrap) */}
                    {displayDescription && (
                        <div className="mt-4">
                            <strong>Dettagli / Riepilogo:</strong>
                            <div className="mt-1 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm whitespace-pre-wrap font-medium text-slate-700">
                                {displayDescription}
                            </div>
                        </div>
                    )}
                    
                    <p><strong>Stato:</strong> 
                        <span className={`font-semibold capitalize px-3 py-1 rounded-full text-xs ml-2 ${
                            statoAttuale === 'confermato' ? 'bg-green-100 text-green-800' :
                            statoAttuale === 'rifiutato' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                        }`}>
                            {statoAttuale.replace(/_/g, ' ')}
                        </span>
                    </p>
                    
                    {creatoreId && (
                        <p><strong>Creato da:</strong> {userMap.get(creatoreId) || 'Sistema/Utente'}</p>
                    )}
                </div>

                <div className="flex flex-wrap justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
                    {showBottoniAzione && (
                        <>
                            <button onClick={handleRifiutaClick} disabled={isLoading} className="px-5 py-2.5 bg-red-600 text-white font-semibold rounded-lg shadow-sm hover:bg-red-700 hover:shadow transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95">
                                <NoSymbolIcon className="h-5 w-5" /> Rifiuta
                            </button>
                            
                            <button onClick={handleConfermaClick} disabled={isLoading} className="px-5 py-2.5 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 hover:shadow transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95">
                                <CheckIcon className="h-5 w-5" /> {toccaAlCreatore ? 'Accetta Modifica' : 'Conferma Appuntamento'}
                            </button>
                        </>
                    )}

                    {puoModificare && (
                        <button onClick={handleEditClick} disabled={isLoading} className="px-5 py-2.5 bg-gray-600 text-white font-semibold rounded-lg shadow-sm hover:bg-gray-700 hover:shadow transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95">
                            <PencilIcon className="h-5 w-5" /> {toccaAlCreatore ? 'Contro-proponi' : 'Modifica Orario'}
                        </button>
                    )}
                    
                    {puoEliminare && (
                         <button onClick={handleDeleteClick} disabled={isLoading} className="px-5 py-2.5 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95">
                            Elimina
                        </button>
                    )}
                    
                    {canCompileForm && (
                        <button onClick={handleCompileClick} disabled={isLoading} className="px-5 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 hover:shadow-lg transition-all flex items-center gap-2 w-full justify-center disabled:opacity-50 mt-2 active:scale-[0.98]">
                            <DocumentTextIcon className="h-6 w-6" /> Compila Form Sopralluogo
                        </button>
                    )}
                </div>
                {isLoading && <p className="text-sm text-indigo-600 text-center font-bold mt-4 animate-pulse">Sincronizzazione in corso...</p>}
            </div>
        </div>
    );
};