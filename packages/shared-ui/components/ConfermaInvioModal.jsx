// packages/shared-ui/components/ConfermaInvioModal.jsx
import React from 'react';

export const ConfermaInvioModal = ({
    isOpen,
    onConfirmYes,
    onConfirmNo
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60"
            onClick={onConfirmNo} // Chiude se clicca fuori (equivalente a No)
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 mx-4 text-center"
                onClick={e => e.stopPropagation()}
            >
                {/* Icona Info */}
                 <div className="flex justify-center mb-4">
                    <svg className="h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                 </div>

                {/* Messaggio */}
                <p className="text-gray-700 mb-6">
                    Considero la gara Inviata tramite la piattaforma esterna?
                </p>

                {/* Pulsanti Azione */}
                <div className="flex justify-center gap-4">
                    <button
                        type="button"
                        onClick={onConfirmNo}
                        className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                    >
                        No
                    </button>
                    <button
                        type="button"
                        onClick={onConfirmYes}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Sì
                    </button>
                </div>
            </div>
        </div>
    );
};