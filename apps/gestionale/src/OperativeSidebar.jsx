import React from 'react';
import { AziendaSelector } from './AziendaSelector.jsx';
import { useTheme } from 'shared-ui';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

export const OperativeSidebar = ({ activeView, onNavigate, onBack, views = [] }) => {
    const theme = useTheme();

    if (!theme || !theme.colorClasses || !theme.primaryColor) {
        return null;
    }

    const activeClass = `${theme.colorClasses[theme.primaryColor].bg} text-white`;
    const inactiveClass = `text-gray-200 hover:bg-gray-700`;

    return (
        <aside className="w-72 bg-gray-800 p-4 shadow-lg rounded-r-2xl h-screen flex flex-col justify-between">
            <div>
                <AziendaSelector />
                <div className="mb-8 text-center">
                    <h1 className="text-xl font-bold text-white">Gestione Operativa</h1>
                    <p className="text-sm text-gray-400">Navigazione</p>
                </div>
                <button
                    onClick={onBack}
                    className="flex items-center w-full p-3 my-1 rounded-md text-gray-200 hover:bg-gray-700 transition-colors duration-200"
                >
                    <FontAwesomeIcon icon={faArrowLeft} className="mr-3" />
                    <span>Torna alla Dashboard</span>
                </button>
                <nav className="mt-8">
                    {views.map((view) => (
                        <button
                            key={view.id}
                            onClick={() => onNavigate(view.id)}
                            className={`flex items-center w-full p-3 my-1 rounded-md transition-colors duration-200 ${activeView === view.id ? activeClass : inactiveClass}`}
                        >
                            {/* Gestisce sia icone da HeroIcons (componenti) che da FontAwesome (oggetti) */}
                            {typeof view.icon === 'function' ? 
                                <view.icon className="mr-3 h-5 w-5" aria-hidden="true" /> : 
                                <FontAwesomeIcon icon={view.icon} className="mr-3" />
                            }
                            <span>{view.label}</span>
                        </button>
                    ))}
                </nav>
            </div>
        </aside>
    );
};