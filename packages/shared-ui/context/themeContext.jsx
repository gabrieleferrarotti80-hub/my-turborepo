import React, { createContext, useContext } from 'react';

// Il tema di default è 'indigo'
export const DEFAULT_THEME = 'indigo'; 

// ✅ DEFINIZIONE CENTRALE E COMPLETA: Tutte le classi di colore necessarie sono definite qui.
export const COLOR_CLASSES = {
    indigo: {
        bg: 'bg-indigo-600',
        hoverBg: 'hover:bg-indigo-700',
        ring: 'focus:ring-indigo-500',
        text: 'text-indigo-600',
        border: 'border-indigo-600',
        bgButton: 'bg-indigo-500',
    },
    blue: {
        bg: 'bg-blue-600',
        hoverBg: 'hover:bg-blue-700',
        ring: 'focus:ring-blue-500',
        text: 'text-blue-600',
        border: 'border-blue-600',
        bgButton: 'bg-blue-500',
    },
    green: {
        bg: 'bg-green-600',
        hoverBg: 'hover:bg-green-700',
        ring: 'focus:ring-green-500',
        text: 'text-green-600',
        border: 'border-green-600',
        bgButton: 'bg-green-500',
    },
    rose: {
        bg: 'bg-rose-600',
        hoverBg: 'hover:bg-rose-700',
        ring: 'focus:ring-rose-500',
        text: 'text-rose-600',
        border: 'border-rose-600',
        bgButton: 'bg-rose-500',
    },
    slate: {
        bg: 'bg-slate-600',
        hoverBg: 'hover:bg-slate-700',
        ring: 'focus:ring-slate-500',
        text: 'text-slate-600',
        border: 'border-slate-600',
        bgButton: 'bg-slate-500',
    },
};

// Crea il contesto
export const ThemeContext = createContext(null);

// Hook consumatore con controllo di errore
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme deve essere usato all\'interno di un ThemeProvider');
    }
    // Rimuoviamo il fallback qui per rendere gli errori più evidenti durante lo sviluppo
    return context;
};