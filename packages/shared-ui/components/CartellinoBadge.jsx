// File: packages/shared-ui/components/CartellinoBadge.jsx

import React from 'react';
import { ClockIcon, ArrowRightOnRectangleIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/solid';

export const CartellinoBadge = ({ 
    statoPresenza, // 'in_servizio' o 'fuori_servizio'
    onTimbraEntrata, 
    onTimbraUscita, 
    isSaving 
}) => {

    const isInServizio = statoPresenza === 'in_servizio';

    return (
        <div className="p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <ClockIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-300">Stato</span>
                </div>
                {isInServizio ? (
                    <span className="px-2 py-0.5 text-xs font-semibold text-green-900 bg-green-300 rounded-full animate-pulse">
                        In Servizio
                    </span>
                ) : (
                    <span className="px-2 py-0.5 text-xs font-semibold text-gray-800 bg-gray-300 rounded-full">
                        Fuori Servizio
                    </span>
                )}
            </div>

            {isInServizio ? (
                // Pulsante TIMBRA USCITA
                <button
                    onClick={onTimbraUscita}
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-500"
                >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    Timbra Uscita
                </button>
            ) : (
                // Pulsante TIMBRA ENTRATA
                <button
                    onClick={onTimbraEntrata}
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-500"
                >
                    <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                    Timbra Entrata
                </button>
            )}
        </div>
    );
};