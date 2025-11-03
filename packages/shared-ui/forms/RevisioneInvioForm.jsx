// packages/shared-ui/forms/RevisioneInvioForm.jsx
import React, { useState } from 'react'; // Aggiunto useState per i campi email
import { useRevisioneLogic } from 'shared-core'; // Importa l'hook creato prima

// Importa i modal creati
import { ControlloDocumentaleModal } from '../components/ControlloDocumentaleModal';
import { ScadenzaAlertModal } from '../components/ScadenzaAlertModal';
import { ConfermaInvioModal } from '../components/ConfermaInvioModal';
// Importa FileUploadZone
import { FileUploadZone } from '../components/FileUploadZone'; 
import { PaperClipIcon } from '@heroicons/react/24/outline'; // Icona per file

// Stili (puoi personalizzarli)
const buttonStyle = "px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50";
const secondaryButtonStyle = "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50";
const checkboxLabelStyle = "ml-2 text-sm font-medium text-gray-700";
const fieldGroupStyle = "mb-6 border border-gray-200 p-4 rounded-lg shadow-sm";
const inputStyle = "w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500";
const labelStyle = "block text-sm font-semibold text-gray-800 mb-1";


export const RevisioneInvioForm = ({
    offerta,
    user,
    onLogProroga,
    onArchivia,
    onSetInviata,
    // Aggiungi nuove callback necessarie per l'invio email
    onPrepareEmailDraft, // Funzione che gestirà la preparazione della bozza
    isSaving 
}) => {
    
    // --- Hook esistente ---
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

    // --- Nuovi Stati per Invio Email ---
    const [isInvioMailChecked, setIsInvioMailChecked] = useState(false);
    const [additionalFiles, setAdditionalFiles] = useState([]); // File aggiuntivi
    const [emailTo, setEmailTo] = useState(offerta?.datiAnalisi?.referente?.email || ''); // Precompila destinatario
    const [emailSubject, setEmailSubject] = useState(`Partecipazione a Gara: ${offerta?.nomeOfferta || ''}`); // Precompila oggetto
    // Potresti aggiungere stato per il body dell'email se vuoi renderlo modificabile

    const isGiaInviata = offerta?.stato === 'inviata';

    // --- Handler per Checkbox Invio Mail ---
    const handleInvioMailChange = (e) => {
        setIsInvioMailChecked(e.target.checked);
        // Resetta i file aggiuntivi se deselezionato?
        if (!e.target.checked) {
            setAdditionalFiles([]);
        }
    };

    // --- Handler per Bottone Prepara Bozza ---
    const handlePrepareDraftClick = () => {
        const emailData = { to: emailTo, subject: emailSubject };
        
        // Filtra solo i documenti trovati da passare alla callback
        const foundDocuments = documentiStatus.filter(doc => doc.status === 'found' && doc.fileDetails);
        
        if (onPrepareEmailDraft) {
            // Passa l'offertaId, i dati email, i file aggiuntivi E i documenti trovati
            onPrepareEmailDraft(offerta.id, emailData, additionalFiles, foundDocuments); 
        } else {
             console.warn("onPrepareEmailDraft non è stato fornito a RevisioneInvioForm");
        }
    };


    return (
        <>
            <div className="p-4 sm:p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">Revisione e Invio Offerta</h2>

                {/* --- Controllo Documentale --- */}
                <div className={fieldGroupStyle}>
                     <h3 className="text-lg font-semibold text-gray-800 mb-3">Verifica Preliminare</h3>
                     <button
                        type="button"
                        onClick={handleControlloDocClick}
                        className={buttonStyle}
                        disabled={isSaving || isGiaInviata} 
                     >
                         Controllo Documentale e Scadenza
                     </button>
                     {isScaduta && offerta?.logProroghe?.length > 0 && (
                        <p className="mt-2 text-sm text-orange-600">
                           Attenzione: la gara risulta scaduta, ma è stata registrata una proroga.
                        </p>
                     )}
                     {isGiaInviata && (
                         <p className="mt-2 text-sm text-green-600 font-medium">
                            Offerta già inviata il {offerta.dataInvio?.toLocaleDateString ? offerta.dataInvio.toLocaleDateString() : 'N/D'}.
                         </p>
                     )}
                </div>

                 {/* --- Modalità Invio --- */}
                 <div className={fieldGroupStyle}>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Modalità Invio</h3>
                    
                    {/* Invio da Piattaforma */}
                    <div className="flex items-center mb-4"> 
                        <input
                            type="checkbox"
                            id="invioPiattaforma"
                            checked={isInvioPiattaformaChecked}
                            onChange={handleInvioPiattaformaChange}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            disabled={isSaving || isGiaInviata || isInvioMailChecked} 
                        />
                        <label htmlFor="invioPiattaforma" className={checkboxLabelStyle}>
                            Gara inviata tramite piattaforma esterna
                        </label>
                    </div>

                    {/* Invio Tramite Mail */}
                    <div className="flex items-center">
                         <input
                            type="checkbox"
                            id="invioMail"
                            checked={isInvioMailChecked}
                            onChange={handleInvioMailChange}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            disabled={isSaving || isGiaInviata || isInvioPiattaformaChecked} 
                        />
                        <label htmlFor="invioMail" className={checkboxLabelStyle}>
                            Prepara invio tramite Email
                        </label>
                    </div>

                    {/* --- Sezione Condizionale per Invio Mail --- */}
                    {isInvioMailChecked && !isGiaInviata && (
                        <div className="mt-4 pl-6 border-l-2 border-indigo-200 space-y-4 animate-fade-in">
                             {/* Documenti Richiesti */}
                             <div>
                                <p className={`${labelStyle} text-blue-700`}>Documenti richiesti (verranno allegati):</p>
                                {documentiStatus.length > 0 ? (
                                    <ul className="list-disc list-inside text-sm text-gray-600">
                                        {documentiStatus.map(doc => (
                                            <li key={doc.id} className={doc.status === 'found' ? 'text-green-700' : 'text-red-700'}>
                                                {doc.label} ({doc.status === 'found' ? 'Trovato' : 'Mancante/Non verificato'})
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500">Nessun documento richiesto marcato.</p>
                                )}
                             </div>

                             {/* Allegati Aggiuntivi */}
                             <div>
                                 <label className={`${labelStyle} text-blue-700`}>Allega documenti aggiuntivi:</label>
                                 <FileUploadZone
                                    onFilesSelected={setAdditionalFiles}
                                    isUploading={isSaving}
                                    label="Trascina qui altri file o clicca per selezionare"
                                 />
                                  {additionalFiles.length > 0 && (
                                    <ul className="mt-2 text-sm text-gray-600">
                                        {additionalFiles.map(f => <li key={f.name} className="flex items-center gap-1"><PaperClipIcon className="h-4 w-4 text-gray-400" /> {f.name}</li>)}
                                    </ul>
                                )}
                             </div>

                             {/* Dettagli Email */}
                             <div>
                                 <label htmlFor="emailTo" className={`${labelStyle} text-blue-700`}>Destinatario Email:</label>
                                 <input
                                    type="email"
                                    id="emailTo"
                                    value={emailTo}
                                    onChange={(e) => setEmailTo(e.target.value)}
                                    className={inputStyle}
                                    placeholder="Indirizzo email del referente"
                                    disabled={isSaving}
                                 />
                             </div>
                              <div>
                                 <label htmlFor="emailSubject" className={`${labelStyle} text-blue-700`}>Oggetto Email:</label>
                                 <input
                                    type="text"
                                    id="emailSubject"
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    className={inputStyle}
                                    disabled={isSaving}
                                 />
                             </div>

                             {/* Bottone Prepara Bozza */}
                             <button
                                type="button"
                                onClick={handlePrepareDraftClick}
                                className={secondaryButtonStyle}
                                disabled={isSaving || !emailTo || !emailSubject} 
                             >
                                 {isSaving ? 'Preparazione...' : 'Prepara Bozza Email e Nota Agenda'}
                             </button>
                        </div>
                    )}
                    {/* --- Fine Sezione Condizionale --- */}

                 </div>
                 
                 {/* Altri campi/sezioni */}

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
            />
            <ConfermaInvioModal
                isOpen={isConfermaInvioOpen}
                onConfirmYes={handleConfermaInvioYes}
                onConfirmNo={handleConfermaInvioNo}
            />
        </>
    );
};