import React from 'react';
import { ArrowLeftIcon, PlusCircleIcon, WrenchScrewdriverIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
// 🛑 RIMOSSO: import { useTheme } from 'shared-ui';

const PRIMARY_COLOR_TEXT = 'text-indigo-600';

// ✅ CORREZIONE: Usa l'export nominato
export const AssegnazioniMenuMagazzino = ({ setLocalView, onBack }) => {
    // 🛑 RIMOSSO: const { primaryColor, colorClasses } = useTheme();

    const menuItems = [
        {
            label: 'Assegna Attrezzatura',
            view: 'assegna-attrezzatura',
            icon: PlusCircleIcon,
            description: 'Crea una nuova assegnazione per un dipendente.'
        },
        {
            label: 'Gestisci Assegnazioni',
            view: 'gestisci-assegnazioni',
            icon: WrenchScrewdriverIcon,
            description: 'Visualizza e gestisci le assegnazioni attive.'
        },
        {
            label: 'Archivio Assegnazioni',
            view: 'archivio',
            icon: ArchiveBoxIcon,
            description: 'Consulta lo storico delle assegnazioni passate.'
        }
    ];

    return (
        <div className="animate-fade-in p-6 bg-white rounded-2xl shadow-xl">
            {/* ✅ CLASSE STATICA per il testo e l'hover underline */}
            <button onClick={onBack} className={`flex items-center gap-2 ${PRIMARY_COLOR_TEXT} mb-6 hover:underline`}>
                <ArrowLeftIcon className="h-4 w-4" />
                Torna al Magazzino
            </button>

            <h2 className="text-3xl font-bold text-gray-800 mb-2">Menu Assegnazioni</h2>
            <p className="text-gray-500 mb-8">Seleziona l'operazione che desideri eseguire.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuItems.map((item) => (
                    <button
                        key={item.view}
                        onClick={() => setLocalView(item.view)}
                        className="p-6 bg-gray-50 rounded-lg text-left hover:shadow-lg hover:bg-white transition-all duration-300"
                    >
                        {/* ✅ CLASSE STATICA per l'icona */}
                        <item.icon className={`h-8 w-8 mb-3 ${PRIMARY_COLOR_TEXT}`} />
                        <h3 className="font-bold text-lg text-gray-800">{item.label}</h3>
                        <p className="text-sm text-gray-600">{item.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};
