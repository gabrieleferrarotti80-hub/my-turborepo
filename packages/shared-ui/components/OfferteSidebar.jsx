// packages/shared-ui/components/OfferteSidebar.jsx

import React from 'react';
import { useTheme } from '../context/themeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'; // Importa l'icona

/**
 * @param {Function} onBackToMainDashboard - Callback per tornare alla dashboard del gestionale.
 */
export const OfferteSidebar = ({
    fasi = [],
    faseAttivaId,
    onSelectFase,
    AziendaSelectorComponent,
    onBackToMainDashboard // <-- Nuova prop
}) => {
    const theme = useTheme();
    if (!theme) return <aside className="w-72 bg-gray-800 p-4 h-screen" />;
    const activeClass = `${theme.colorClasses[theme.primaryColor].bg} text-white`;
    const inactiveClass = `text-gray-200 hover:bg-gray-700`;

    return (
        <aside className="w-72 bg-gray-800 p-4 shadow-lg h-screen flex flex-col">
            <div>
                {AziendaSelectorComponent && <AziendaSelectorComponent />}
                <div className="mb-8 pt-4 text-center">
                    <h1 className="text-xl font-bold text-white">Gestione Offerte</h1>
                    <p className="text-sm text-gray-400">Navigazione Modulo</p>
                </div>

                {/* --- ✅ PULSANTE PER TORNARE AL GESTIONALE --- */}
                <button
                    onClick={onBackToMainDashboard}
                    className="flex items-center w-full p-3 my-1 rounded-md text-gray-200 hover:bg-gray-700 transition-colors duration-200 text-left"
                >
                    <FontAwesomeIcon icon={faArrowLeft} className="mr-3 fa-fw" />
                    <span>Dashboard Gestionale</span>
                </button>

                {/* La navigazione interna ora è separata */}
                <nav className="mt-8 border-t border-gray-700 pt-4">
                    {fasi.map((fase) => (
                        <button
                            key={fase.id}
                            onClick={() => onSelectFase(fase.id)}
                            className={`flex items-center w-full p-3 my-1 rounded-md transition-colors duration-200 text-left ${faseAttivaId === fase.id ? activeClass : inactiveClass}`}
                        >
                            {fase.icon && <FontAwesomeIcon icon={fase.icon} className="mr-3 fa-fw" />}
                            <span>{fase.label}</span>
                        </button>
                    ))}
                </nav>
            </div>
        </aside>
    );
};