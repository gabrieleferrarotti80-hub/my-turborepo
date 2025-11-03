import React, { createContext, useContext, useState, useEffect } from 'react';
import { Cog6ToothIcon, XMarkIcon } from '@heroicons/react/24/solid';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const colorClasses = {
    indigo: {
        bg: 'bg-indigo-600',
        hoverBg: 'hover:bg-indigo-700',
        ring: 'focus:ring-indigo-500',
        text: 'text-indigo-600',
        bgButton: 'bg-indigo-500',
    },
    blue: {
        bg: 'bg-blue-600',
        hoverBg: 'hover:bg-blue-700',
        ring: 'focus:ring-blue-500',
        text: 'text-blue-600',
        bgButton: 'bg-blue-500',
    },
    green: {
        bg: 'bg-green-600',
        hoverBg: 'hover:bg-green-700',
        ring: 'focus:ring-green-500',
        text: 'text-green-600',
        bgButton: 'bg-green-500',
    },
    rose: {
        bg: 'bg-rose-600',
        hoverBg: 'hover:bg-rose-700',
        ring: 'focus:ring-rose-500',
        text: 'text-rose-600',
        bgButton: 'bg-rose-500',
    },
    slate: {
        bg: 'bg-slate-600',
        hoverBg: 'hover:bg-slate-700',
        ring: 'focus:ring-slate-500',
        text: 'text-slate-600',
        bgButton: 'bg-slate-500',
    },
};

// Nuovo componente ThemeProvider per fornire il contesto
export const ThemeProvider = ({ children }) => {
    const [primaryColor, setPrimaryColor] = useState('indigo'); // Colore principale di default

    const contextValue = {
        primaryColor,
        setPrimaryColor,
        colorClasses,
    };

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
};

// Nuovo componente ThemeCustomizer per l'interfaccia utente
const ThemeCustomizer = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { primaryColor, setPrimaryColor } = useTheme();
    const colors = Object.keys(colorClasses);

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className={`p-3 rounded-full text-white shadow-lg transition-transform duration-300 transform hover:scale-110 ${colorClasses[primaryColor].bg}`}
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
                                    className={`w-10 h-10 rounded-full shadow-md transition-all duration-200 transform hover:scale-110 border-2 ${primaryColor === color ? `border-${color}-500 scale-110` : 'border-transparent'} ${colorClasses[color].bgButton}`}
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
