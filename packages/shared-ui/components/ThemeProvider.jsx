import React, { useState } from 'react';
// ✅ CORREZIONE: Importa il contesto e le costanti necessarie dal file corretto.
import { ThemeContext, COLOR_CLASSES, DEFAULT_THEME } from '../context/themeContext.jsx';

export const ThemeProvider = ({ children }) => {
    const [primaryColor, setPrimaryColor] = useState(DEFAULT_THEME);

    const themeValue = {
        primaryColor,
        setPrimaryColor,
        // ✅ CORREZIONE: Fornisce l'oggetto COLOR_CLASSES reale e completo.
        colorClasses: COLOR_CLASSES,
    };

    return (
        <ThemeContext.Provider value={themeValue}>
            {children}
        </ThemeContext.Provider>
    );
};