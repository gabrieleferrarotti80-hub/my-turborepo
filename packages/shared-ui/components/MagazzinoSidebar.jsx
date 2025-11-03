import React from 'react';
import { useTheme } from '../context/themeContext.jsx'; // Assicurati che il percorso sia corretto
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faWrench,
    faBoxOpen,
    faClipboardList,
} from '@fortawesome/free-solid-svg-icons';

const viewIcons = {
    attrezzature: faWrench,
    materiali: faBoxOpen,
    assegnazioni: faClipboardList,
};

// 1. Aggiungi 'userRole' alle props
export const MagazzinoSidebar = ({ activeSubView, onNavigate, onBack, companyFeatures, userRole }) => {
    const theme = useTheme(); 

    if (!theme || !theme.colorClasses || !theme.primaryColor) {
        return null;
    }

    const activeClass = `${theme.colorClasses[theme.primaryColor].bg} text-white`;
    const inactiveClass = `text-gray-200 hover:bg-gray-700`;

    const getDisplayName = (view) => {
        switch (view) {
            case 'attrezzature':
                return 'Attrezzature';
            case 'materiali':
                return 'Materiali';
            case 'assegnazioni':
                return 'Assegnazioni';
            default:
                return view.charAt(0).toUpperCase() + view.slice(1);
        }
    };

    // 2. Unisci la logica in un unico blocco pulito
    const isOwner = userRole === 'proprietario';
    const hasAssegnazioniFeature = companyFeatures?.magazzino_assegnazioni === true;

    const views = ['attrezzature', 'materiali']; 
    
    // Mostra "Assegnazioni" se l'utente è proprietario OPPURE se l'azienda ha il permesso
    if (isOwner || hasAssegnazioniFeature) {
        views.push('assegnazioni'); 
    }

    return (
        <aside className="w-72 bg-gray-800 p-4 shadow-lg rounded-r-2xl h-screen flex flex-col justify-between">
            <div>
                <div className="mb-8 text-center">
                    <h1 className="text-xl font-bold text-white">Gestione Magazzino</h1> 
                    <p className="text-sm text-gray-400">Inventario e Logistica</p> 
                </div>
                
                <button
                    onClick={onBack}
                    className="flex items-center w-full p-3 my-1 rounded-md text-gray-200 hover:bg-gray-700 transition-colors duration-200"
                >
                    <FontAwesomeIcon icon={faArrowLeft} className="mr-3" />
                    <span>Torna al Menu Principale</span>
                </button>
                
                <nav className="mt-8">
                    {views.map((view) => (
                        <button
                            key={view}
                            onClick={() => onNavigate(view)}
                            className={`flex items-center w-full p-3 my-1 rounded-md transition-colors duration-200 ${activeSubView === view ? activeClass : inactiveClass}`}
                        >
                            <FontAwesomeIcon icon={viewIcons[view]} className="mr-3" />
                            <span>{getDisplayName(view)}</span>
                        </button>
                    ))}
                </nav>
            </div>
        </aside>
    );
};