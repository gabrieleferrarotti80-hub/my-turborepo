// In src/components/DettagliScadenzaModal.jsx

import React from 'react';
import { XMarkIcon, PencilIcon, EyeIcon } from '@heroicons/react/24/solid';

export const DettagliScadenzaModal = ({ scadenza, onClose, onEdit }) => {
    if (!scadenza) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="h-6 w-6" />
                </button>
                
                <h2 className="text-2xl font-bold text-gray-800 mb-4 break-words">{scadenza.title}</h2>
                
                <div className="space-y-4 text-gray-700">
                    <p><strong>Data di Scadenza:</strong> {scadenza.start?.toLocaleDateString('it-IT')}</p>
                </div>

                <div className="flex justify-end gap-4 pt-6 mt-6 border-t">
                    <button 
                        onClick={() => window.open(scadenza.fileURL, '_blank')} 
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                    >
                        <EyeIcon className="h-5 w-5" /> Visualizza Documento
                    </button>
                    <button 
                        onClick={() => onEdit(scadenza)} 
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
                    >
                        <PencilIcon className="h-5 w-5" /> Modifica
                    </button>
                </div>
            </div>
        </div>
    );
};

