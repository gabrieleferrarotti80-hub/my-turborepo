import React, { useState } from 'react';
import { Cog6ToothIcon, XMarkIcon } from '@heroicons/react/24/solid';
// ✅ CORREZIONE: Importa l'hook e le classi di colore dal pacchetto condiviso.
import { useTheme, COLOR_CLASSES } from 'shared-ui';

// ❌ RIMOSSO: Tutta la logica di createContext, useTheme locale e ThemeProvider è stata eliminata.

// Il componente ora è un "Dumb Component" che legge il tema dal contesto globale.
const ThemeCustomizer = () => {
    const [isOpen, setIsOpen] = useState(false);
    // Usa l'hook centralizzato.
    const { primaryColor, setPrimaryColor } = useTheme(); 
    const colors = Object.keys(COLOR_CLASSES);

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className={`p-3 rounded-full text-white shadow-lg transition-transform duration-300 transform hover:scale-110 ${COLOR_CLASSES[primaryColor].bg}`}
                >
                    <Cog6ToothIcon className="h-6 w-6" />
                </button>
            )}

            {isOpen && (
                <div className="w-80 p-6 bg-white rounded-2xl shadow-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-800">Personalizza Tema</h3>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 transition duration-200">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-600 mb-2">Colore Principale</h4>
                        <div className="flex flex-wrap gap-2">
                            {colors.map(color => (
                                <button
                                    key={color}
                                    onClick={() => setPrimaryColor(color)}
                                    className={`w-10 h-10 rounded-full shadow-md transition-all duration-200 transform hover:scale-110 border-2 ${primaryColor === color ? `border-${color}-500 scale-110` : 'border-transparent'} ${COLOR_CLASSES[color].bgButton}`}
                                >
                                    <span className="sr-only">Seleziona {color}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThemeCustomizer;