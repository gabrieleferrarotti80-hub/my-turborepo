// packages/shared-ui/components/ScadenzaAlertModal.jsx
import React from 'react';

export const ScadenzaAlertModal = ({
    isOpen,
    onProrogaConfirm, // Funzione chiamata se clicca "Sì, ho la proroga"
    onArchiviaConfirm // Funzione chiamata se clicca "No, archivia"
    // onClose (opzionale, se vuoi un modo per chiuderlo senza scegliere)
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60"
            // onClick={onClose} // Potresti voler impedire la chiusura cliccando fuori
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 mx-4"
                onClick={e => e.stopPropagation()}
            >
                {/* Icona Alert */}
                <div className="flex justify-center mb-4">
                     <svg className="h-12 w-12 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.008v.008H12v-.008z" />
                     </svg>
                </div>

                {/* Titolo e Messaggio */}
                <h2 className="text-xl font-bold text-center text-gray-800 mb-2">Attenzione: Gara Scaduta</h2>
                <p className="text-center text-gray-600 mb-6">
                    La data di scadenza per questa offerta è passata. Sei sicuro di poter proseguire?
                </p>

                {/* Pulsanti Azione */}
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button
                        type="button"
                        onClick={onArchiviaConfirm}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 w-full sm:w-auto"
                    >
                        No, Archivia la Gara
                    </button>
                    <button
                        type="button"
                        onClick={onProrogaConfirm}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 w-full sm:w-auto"
                    >
                        Sì, Ho la Proroga
                    </button>
                     {/* Potresti aggiungere un bottone "Annulla" che chiama onClose */}
                </div>
            </div>
        </div>
    );
};