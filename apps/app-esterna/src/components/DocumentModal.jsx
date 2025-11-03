import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

/**
 * Componente modale per visualizzare i documenti relativi a un cantiere.
 * @param {Object} props
 * @param {boolean} props.isOpen - Controlla la visibilità del modale.
 * @param {function} props.onClose - Funzione per chiudere il modale.
 * @param {Array} props.documents - Array di oggetti documento da visualizzare.
 * @param {string} props.cantiereName - Il nome del cantiere per il titolo.
 */
export const DocumentModal = ({ isOpen, onClose, documents, cantiereName }) => {
    // Se il modale non è aperto, non renderizzare nulla
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header del modale */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-xl font-semibold text-gray-800">
                        Documenti Cantiere: {cantiereName}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                {/* Corpo del modale con la lista dei documenti */}
                <div className="p-4 overflow-y-auto flex-grow">
                    {documents.length > 0 ? (
                        <div className="space-y-4">
                            {documents.map((doc) => (
                                <div key={doc.id} className="bg-gray-100 p-4 rounded-lg shadow-sm border border-gray-200">
                                    <h4 className="font-bold text-gray-700">{doc.nomeDocumento}</h4>
                                    {doc.descrizione && (
                                        <p className="text-sm text-gray-600 mt-1">{doc.descrizione}</p>
                                    )}
                                    <a
                                        href={doc.urlDocumento}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-block mt-3 px-4 py-2 text-sm font-medium text-white bg-indigo-500 rounded-lg shadow-md hover:bg-indigo-600 transition-colors"
                                    >
                                        Apri Documento
                                    </a>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">Nessun documento trovato per questo cantiere.</p>
                    )}
                </div>

                {/* Footer con il pulsante per tornare all'applicazione */}
                <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        Torna all'applicazione
                    </button>
                </div>
            </div>
        </div>
    );
};

