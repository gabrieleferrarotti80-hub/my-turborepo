// packages/shared-ui/views/OffertaWorkspaceView.jsx

import React from 'react';
import { AnalisiPreliminareForm } from '../forms/AnalisiPreliminareForm';
import { ElaborazioneForm } from '../forms/ElaborazioneForm';
import { RevisioneInvioForm } from '../forms/RevisioneInvioForm';

export const OffertaWorkspaceView = (props) => {

    // Log iniziale (opzionale)
    // console.log("%c[OffertaWorkspaceView] <- Props ricevute:", "color: purple; font-weight: bold;", props);

    // Destrutturazione props
    const {
        offerta,
        faseAttivaId,
        formSubmissions,
        isSaving,
        clienteSelezionato,
        personnel,
        availableForms = [],
        onAddReferente,
        onCreaAppuntamento,
        companyId,
        currentUser,
        sopralluogoFormTemplate, 
        onLogProroga,
        onArchivia,
        onSetInviata,
        onPrepareEmailDraft
    } = props;


    const renderActiveForm = () => {
        switch (faseAttivaId) {
            case 'analisi':
                // Log per debug (opzionale)
                // console.log("[OffertaWorkspaceView] Rendering: AnalisiPreliminareForm");
                return (
                    <AnalisiPreliminareForm
                        datiIniziali={offerta} 
                        clienteSelezionato={clienteSelezionato}
                        personnel={personnel}
                        onSubmit={formSubmissions.handleAnalisiSubmit}
                        onAddReferente={onAddReferente}
                        isSaving={isSaving}
                        availableForms={availableForms}
                        onCreaAppuntamento={onCreaAppuntamento} 
                    />
                ); // Non serve break dopo return

            case 'elaborazione':
                // Log per debug (opzionale)
                // console.log("[OffertaWorkspaceView] Rendering: ElaborazioneForm");

                // --- ✅ SPOSTA LA LOGICA QUI DENTRO ---
                // Logghiamo il valore della variabile *prima* di usarla nell'oggetto (opzionale)
                // console.log("%c[OffertaWorkspaceView] Valore VARIABILE sopralluogoFormTemplate PRIMA dell'oggetto:", "color: red; font-weight: bold;", sopralluogoFormTemplate);
                
                const propsPerElaborazione = {
                    offerta: offerta,
                    onSubmit: formSubmissions.handleElaborazioneSubmit, 
                    onApproveOffer: formSubmissions.handleApproveOffer,
                    personnel: personnel,
                    isSaving: isSaving,
                    companyId: companyId,
                    currentUser: currentUser,
                    sopralluogoFormTemplate: sopralluogoFormTemplate 
                };
                
                // Log esistente che mostra l'oggetto creato (opzionale)
                // console.log("%c[OffertaWorkspaceView] -> Invio OGGETTO props a ElaborazioneForm:", "color: purple; font-weight: bold;", propsPerElaborazione);
                // --- FINE SPOSTAMENTO ---

                return <ElaborazioneForm {...propsPerElaborazione} />; // Non serve break dopo return

            case 'invio': 
                // Log per debug (opzionale)
                // console.log("[OffertaWorkspaceView] Rendering: RevisioneInvioForm");
                return ( 
                    <RevisioneInvioForm 
                        offerta={offerta}
                        user={currentUser} 
                        onLogProroga={onLogProroga} 
                        onArchivia={onArchivia} 
                        onSetInviata={onSetInviata} 
                        onPrepareEmailDraft={onPrepareEmailDraft}
                        isSaving={isSaving} 
                    /> 
                ); // Non serve break dopo return

            default:
                 // Log per debug (opzionale)
                // console.log(`[OffertaWorkspaceView] Rendering: Default (faseAttivaId: ${faseAttivaId})`);
                return <p>Fase non riconosciuta ({faseAttivaId}).</p>;
        }
    };
    
    return (
        <div className="flex flex-col h-full bg-white">
            <header className="p-4 border-b border-gray-200 shrink-0">
                <h1 className="text-2xl font-bold">{offerta.nomeOfferta}</h1>
                <p className="text-sm text-gray-600">
                    Cliente: {clienteSelezionato ? (clienteSelezionato.ragioneSociale || `${clienteSelezionato.nome} ${clienteSelezionato.cognome}`) : '...'} | Stato: {offerta.stato}
                </p>
            </header>
            
            <main className="flex-1 p-4 overflow-y-auto">
                {renderActiveForm()}
            </main>
        </div>
    );
};