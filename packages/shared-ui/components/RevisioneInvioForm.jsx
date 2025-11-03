// packages/shared-ui/forms/RevisioneInvioForm.jsx
import React from 'react';
import { useRevisioneLogic } from 'shared-core'; // Importa l'hook creato prima

// Importa i modal creati
import { ControlloDocumentaleModal } from '../components/ControlloDocumentaleModal';
import { ScadenzaAlertModal } from '../components/ScadenzaAlertModal';
import { ConfermaInvioModal } from '../components/ConfermaInvioModal';

// Stili (puoi personalizzarli)
const buttonStyle = "px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50";
const checkboxLabelStyle = "ml-2 text-sm font-medium text-gray-700";
const fieldGroupStyle = "mb-6 border border-gray-200 p-4 rounded-lg shadow-sm";

export const RevisioneInvioForm = ({
    offerta,
    user,
    onLogProroga,
    onArchivia,
    onSetInviata,
    // Aggiungi isSaving se necessario per disabilitare i bottoni
    isSaving 
}) => {
    // Usa l'hook per ottenere stati e handlers
    const {
        isControlloDocOpen,
        isScadenzaAlertOpen,
        isConfermaInvioOpen,
        isInvioPiattaformaChecked,
        documentiStatus,
        isScaduta,
        handleControlloDocClick,
        handleCloseControlloDoc,
        handleProrogaConfirm,
        handleArchiviaConfirm,
        handleInvioPiattaformaChange,
        handleConfermaInvioYes,
        handleConfermaInvioNo,
    } = useRevisioneLogic(offerta, user, onLogProroga, onArchivia, onSetInviata);

    // Determina se l'offerta è già stata inviata
    const isGiaInviata = offerta?.stato === 'inviata';

    return (
        <>
            <div className="p-4 sm:p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">Revisione e Invio Offerta</h2>

                {/* Bottone Controllo Documentale */}
                <div className={fieldGroupStyle}>
                     <h3 className="text-lg font-semibold text-gray-800 mb-3">Verifica Preliminare</h3>
                     <button
                        type="button"
                        onClick={handleControlloDocClick}
                        className={buttonStyle}
                        disabled={isSaving || isGiaInviata} // Disabilita se già inviata
                     >
                         Controllo Documentale e Scadenza
                     </button>
                     {/* Mostra un messaggio se la gara è scaduta ma c'è proroga */}
                     {isScaduta && offerta?.logProroghe?.length > 0 && (
                        <p className="mt-2 text-sm text-orange-600">
                           Attenzione: la gara risulta scaduta, ma è stata registrata una proroga.
                        </p>
                     )}
                     {/* Mostra un messaggio se l'offerta è già stata inviata */}
                     {isGiaInviata && (
                         <p className="mt-2 text-sm text-green-600 font-medium">
                            Offerta già inviata il {offerta.dataInvio?.toLocaleDateString ? offerta.dataInvio.toLocaleDateString() : 'N/D'}.
                         </p>
                     )}
                </div>

                 {/* Checkbox Invio da Piattaforma */}
                 <div className={fieldGroupStyle}>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Modalità Invio</h3>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="invioPiattaforma"
                            checked={isInvioPiattaformaChecked}
                            onChange={handleInvioPiattaformaChange}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            disabled={isSaving || isGiaInviata} // Disabilita se già inviata
                        />
                        <label htmlFor="invioPiattaforma" className={checkboxLabelStyle}>
                            Gara inviata tramite piattaforma esterna
                        </label>
                    </div>
                     {isInvioPiattaformaChecked && !isGiaInviata && (
                         <p className="mt-2 text-sm text-blue-600">
                            Marcando questa opzione, l'offerta verrà considerata come 'Inviata'.
                         </p>
                     )}
                </div>
                
                 {/* Qui potresti aggiungere altri campi/sezioni, es:
                 - Upload Preventivo Finale
                 - Note per l'invio
                 - Bottone "Invia Tramite Email" (se implementato)
                 */}

            </div>

            {/* Renderizza i Modal */}
            <ControlloDocumentaleModal
                isOpen={isControlloDocOpen}
                onClose={handleCloseControlloDoc}
                documentiStatus={documentiStatus}
            />
            <ScadenzaAlertModal
                isOpen={isScadenzaAlertOpen}
                onProrogaConfirm={handleProrogaConfirm}
                onArchiviaConfirm={handleArchiviaConfirm}
                // Potresti passare onClose={ () => setIsScadenzaAlertOpen(false) } per un bottone annulla
            />
            <ConfermaInvioModal
                isOpen={isConfermaInvioOpen}
                onConfirmYes={handleConfermaInvioYes}
                onConfirmNo={handleConfermaInvioNo}
            />
        </>
    );
};