// packages/shared-ui/components/ControlloDocumentaleModal.jsx
import React from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

const labelStyle = "text-lg font-semibold text-gray-900";
const subLabelStyle = "text-sm text-gray-500";
const itemStyle = "flex items-center justify-between p-3 border-b";

export const ControlloDocumentaleModal = ({
    isOpen,
    onClose,
    documentiStatus = [] // Array con { id, label, status ('found', 'missing', 'expired') }
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-900">Controllo Documentale</h2>
                    <p className={subLabelStyle}>Riepilogo dei documenti richiesti e del loro stato.</p>
                </div>

                {/* Corpo (scrollabile) */}
                <div className="p-4 overflow-y-auto">
                    {documentiStatus.length === 0 ? (
                        <p className="text-gray-600">Nessun documento richiesto specificato.</p>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {documentiStatus.map(doc => {
                                const isFound = doc.status === 'found';
                                const isMissing = doc.status === 'missing';
                                const isExpired = doc.status === 'expired'; // Aggiungi gestione scaduti se necessario

                                return (
                                    <li key={doc.id} className="py-3">
                                        <div className="flex items-center space-x-3">
                                            {isFound ? (
                                                <CheckCircleIcon className="h-6 w-6 text-green-500 shrink-0" />
                                            ) : (
                                                <XCircleIcon className="h-6 w-6 text-red-500 shrink-0" />
                                            )}
                                            <div className="flex-1">
                                                <p className="text-md font-medium text-gray-800">{doc.label}</p>
                                                {isMissing && <p className={`${subLabelStyle} text-red-600`}>Mancante</p>}
                                                {isExpired && <p className={`${subLabelStyle} text-orange-600`}>Scaduto</p>}
                                                {isFound && <p className={`${subLabelStyle} text-green-600`}>Presente</p>}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Footer Pulsanti */}
                <div className="flex justify-end gap-4 mt-auto border-t p-4 bg-gray-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    );
};