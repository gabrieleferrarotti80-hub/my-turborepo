// File: src/components/ActionButtons.jsx

import React from 'react';
// ✅ 1. Modifichiamo le icone importate
import { CalendarDaysIcon, ArchiveBoxIcon, DocumentPlusIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/solid';

export const ActionButtons = ({ 
    isSaving, 
    // ✅ 2. Aggiungiamo la nuova prop e rimuoviamo quelle vecchie
    onOpenCantiereActions,
    onOpenAgenda,
    onOpenAssegnazioni,
    onOpenNotaOperativa
}) => {
    
    const buttonClasses = `
        flex flex-col items-center justify-center p-6 rounded-2xl shadow-sm border-2 border-gray-800
        text-gray-700 font-semibold text-center transition-all duration-300
        hover:bg-gray-100 hover:shadow-md active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed
    `;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8">
            
            {/* ✅ 3. NUOVO PULSANTE CONTENITORE */}
            <button onClick={onOpenCantiereActions} disabled={isSaving} className={buttonClasses}>
                <WrenchScrewdriverIcon className="h-12 w-12 text-blue-500 mb-2" />
                <span className="text-sm font-semibold">Azioni Cantiere</span>
            </button>
            
            {/* Pulsanti non legati al cantiere (invariati) */}
            <button onClick={onOpenAgenda} disabled={isSaving} className={buttonClasses}>
                <CalendarDaysIcon className="h-12 w-12 text-orange-500 mb-2" />
                <span className="text-sm font-semibold">Agenda</span>
            </button>
            <button onClick={onOpenAssegnazioni} disabled={isSaving} className={buttonClasses}>
                <ArchiveBoxIcon className="h-12 w-12 text-teal-500 mb-2" />
                <span className="text-sm font-semibold">Assegnazioni</span>
            </button>
            <button onClick={onOpenNotaOperativa} disabled={isSaving} className={buttonClasses}>
                <DocumentPlusIcon className="h-12 w-12 text-purple-500 mb-2" />
                <span className="text-sm font-semibold">Nota Operativa</span>
            </button>

            {/* ❌ 4. I pulsanti relativi al cantiere sono stati rimossi da qui */}

        </div>
    );
};