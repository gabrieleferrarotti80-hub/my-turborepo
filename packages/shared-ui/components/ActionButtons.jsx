import React from 'react';
// ✅ CORREZIONE: Importa l'hook del tema centralizzato da 'shared-ui'.
import { useTheme } from '../context/themeContext.jsx'; 
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/solid';

export const ActionButtons = ({ onBack, onSave, isSaving, loading, saveLabel = 'Salva', backLabel = 'Torna indietro', showSave = true }) => {
    // ❌ RIMOSSO: La dipendenza dal ThemeCustomizer locale è stata eliminata.
    const { primaryColor, colorClasses } = useTheme();

    return (
        <div className="flex justify-end gap-4 mt-6">
            <button
                type="button"
                onClick={onBack}
                className="flex items-center justify-center py-3 px-6 rounded-xl font-semibold transition-colors duration-200 text-gray-700 bg-gray-200 hover:bg-gray-300 shadow-sm"
            >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                {backLabel}
            </button>
            {showSave && (
                <button
                    type="submit"
                    onClick={onSave}
                    disabled={isSaving || loading}
                    className={`flex items-center justify-center py-3 px-6 rounded-xl text-white font-semibold transition-colors duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed
                    ${isSaving || loading ? 'bg-gray-400' : `${colorClasses[primaryColor].bg} ${colorClasses[primaryColor].hoverBg}`}`}
                >
                    {isSaving || loading ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                        <>
                            <CheckIcon className="h-5 w-5 mr-2" />
                            <span>{saveLabel}</span>
                        </>
                    )}
                </button>
            )}
        </div>
    );
};

