// Percorso: packages/shared-ui/components/DettagliAssegnazioneView.jsx (REFACTORING FINALE)

import React, { useState } from 'react';
import { ArrowLeftIcon, CheckCircleIcon, ExclamationTriangleIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/solid';
// ✅ RIMOSSI GLI HOOK MANAGER: import { useAssegnazioniManager, useGuastiManager } from 'shared-core'; 

// ✅ AGGIUNTO: Riceve le funzioni di business e il callback come props
export const DettagliAssegnazioneView = ({ 
    assegnazione, 
    onBack, 
    confermaPresaInCarico, // Funzione Manager
    segnalaGuasto,        // Funzione Manager
    richiediRestituzione, // Funzione Manager (richiesta dal button)
    onActionSuccess       // Callback dal contenitore (AssegnazioniView)
}) => {
    
    // ❌ RIMOSSA: Inizializzazione degli hook manager.
    // const { confermaPresaInCarico } = useAssegnazioniManager();
    // const { segnalaGuasto } = useGuastiManager();

    const [isSaving, setIsSaving] = useState(false); // Stato locale per il loading

    if (!assegnazione) {
        return <div className="text-center p-8">Assegnazione non trovata.</div>;
    }

    // Classi statiche per sostituire la logica dinamica di useTheme
    const themeStatic = {
        bgPrimary: "bg-indigo-600 hover:bg-indigo-700",
        textPrimary: "text-indigo-600",
    };

    const handleConferma = async () => {
        setIsSaving(true);
        const result = await confermaPresaInCarico(assegnazione.id);
        setIsSaving(false);
        
        if (result.success) {
            onActionSuccess(result.message, 'gestisci-assegnazioni'); // Chiama il callback con successo
        } else {
            console.error(`Errore: ${result.message}`);
            // Qui si dovrebbe usare un toast o un alert UI per mostrare l'errore
        }
    };

    const handleRichiestaRestituzione = async () => {
        // ⚠️ Nota: Qui si dovrebbe usare un MODALE per l'input 'Note'
        const note = "Richiesta da dipendente tramite dettaglio assegnazione.";
        setIsSaving(true);
        const result = await richiediRestituzione(assegnazione, note);
        setIsSaving(false);

        if (result.success) {
            onActionSuccess(result.message, 'gestisci-assegnazioni'); 
        } else {
            console.error(`Errore: ${result.message}`);
        }
    };


    const handleSegnalazione = async (tipo) => {
        // Qui si dovrebbe usare un MODALE per l'input 'Note'
        const note = `Nota generata per ${tipo}. Si prega di implementare un MODALE UI per l'input 'Note'.`; 
        console.log(`Richiesta di segnalazione '${tipo}'.`);

        setIsSaving(true);
        // ✅ Chiama la funzione manager come prop
        const result = await segnalaGuasto(assegnazione, `${tipo} segnalato`, note);
        setIsSaving(false);
        
        if (result.success) {
            onActionSuccess(result.message, 'gestisci-assegnazioni');
        } else {
            console.error(`Errore: ${result.message}`);
        }
    };

    const renderActionButtons = () => {
        const baseClass = `w-full py-2 px-4 text-white font-semibold rounded-lg shadow-md flex items-center justify-center gap-2 transition-colors disabled:bg-gray-400`;
        
        if (isSaving) {
            return <p className="text-center text-indigo-600 font-semibold">Esecuzione Azione...</p>;
        }

        switch (assegnazione.statoWorkflow) {
            case 'da confermare':
                return (
                    <button 
                        onClick={handleConferma} 
                        disabled={isSaving}
                        className={`${baseClass} ${themeStatic.bgPrimary}`}
                    >
                        <CheckCircleIcon className="h-5 w-5" />
                        Conferma Presa in Carico
                    </button>
                );
            case 'attiva':
                return (
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button 
                            onClick={() => handleSegnalazione('guasto')} 
                            disabled={isSaving}
                            className={`${baseClass} bg-yellow-500 hover:bg-yellow-600`}
                        >
                            <ExclamationTriangleIcon className="h-5 w-5" />
                            Segnala Guasto
                        </button>
                        <button 
                            onClick={() => handleSegnalazione('furto')} 
                            disabled={isSaving}
                            className={`${baseClass} bg-red-500 hover:bg-red-600`}
                        >
                            <ExclamationTriangleIcon className="h-5 w-5" />
                            Segnala Furto
                        </button>
                        <button 
                            onClick={handleRichiestaRestituzione}
                            disabled={isSaving}
                            className={`${baseClass} bg-blue-500 hover:bg-blue-600`}
                        >
                            <ArrowUturnLeftIcon className="h-5 w-5" />
                            Richiedi Restituzione
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="animate-fade-in p-6 bg-white rounded-2xl shadow-xl max-w-4xl mx-auto">
            {/* ... (JSX per il ritorno e le informazioni) ... */}
            <button 
                onClick={onBack} 
                className={`flex items-center gap-2 ${themeStatic.textPrimary} mb-6 hover:underline`}
            >
                <ArrowLeftIcon className="h-4 w-4" />
                Torna alla lista
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Colonna Sinistra - Info Principali */}
                <div className="md:col-span-2 space-y-6">
                    {/* ... (Info di assegnazione) ... */}
                    <div className="pt-4">
                        <h3 className="font-semibold text-gray-700 mb-3">Azioni</h3>
                        {renderActionButtons() || <p className="text-sm text-gray-500">Nessuna azione richiesta per questa assegnazione.</p>}
                    </div>
                </div>

                {/* Colonna Destra - Storico */}
                <div className="space-y-4">
                    {/* ... (Storico Eventi) ... */}
                </div>
            </div>
        </div>
    );
};
// export default DettagliAssegnazioneView; // Rimosso l'export default per coerenza con gli altri export