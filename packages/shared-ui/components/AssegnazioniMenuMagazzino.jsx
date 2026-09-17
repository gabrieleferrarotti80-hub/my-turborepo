import React from 'react';
import { 
    ClipboardDocumentCheckIcon, 
    ArrowPathIcon, 
    WrenchScrewdriverIcon,
    PlusCircleIcon,
    ArchiveBoxIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/outline';

const PRIMARY_COLOR_TEXT = 'text-indigo-600';

export const AssegnazioniMenuMagazzino = ({ 
    setLocalView, 
    onBack,
    conteggioGuasti = 0, 
    conteggioRiconsegne = 0 
}) => {
    
    // Configurazione delle card del menu
    const menuItems = [
        {
            title: 'Nuova Assegnazione',
            view: 'assegna-attrezzatura',
            icon: PlusCircleIcon,
            desc: 'Assegna attrezzature o DPI ai dipendenti.',
            colorClass: 'bg-blue-500 text-blue-600'
        },
        {
            title: 'Registro Assegnazioni',
            view: 'gestisci-assegnazioni',
            icon: ClipboardDocumentCheckIcon,
            desc: 'Visualizza e gestisci le dotazioni attive.',
            colorClass: 'bg-indigo-500 text-indigo-600'
        },
        {
            title: 'Gestione Resi',
            view: 'riconsegne',
            icon: ArrowPathIcon,
            desc: 'Accetta le restituzioni dagli operatori.',
            colorClass: 'bg-green-500 text-green-600',
            count: conteggioRiconsegne
        },
        {
            title: 'Gestione Guasti',
            view: 'guasti',
            icon: WrenchScrewdriverIcon,
            desc: 'Gestisci segnalazioni di rotture o furti.',
            colorClass: 'bg-orange-500 text-orange-600',
            count: conteggioGuasti
        },
        {
            title: 'Archivio Storico',
            view: 'archivio', // Assicurati di avere questa vista o rimuovila se non serve
            icon: ArchiveBoxIcon,
            desc: 'Consulta lo storico delle assegnazioni passate.',
            colorClass: 'bg-gray-500 text-gray-600'
        }
    ];

    return (
        <div className="animate-fade-in p-6 bg-white rounded-2xl shadow-xl">
            <button onClick={onBack} className={`flex items-center gap-2 ${PRIMARY_COLOR_TEXT} mb-6 hover:underline`}>
                <ArrowLeftIcon className="h-4 w-4" />
                Torna al Magazzino
            </button>

            <h2 className="text-3xl font-bold text-gray-800 mb-2">Menu Assegnazioni</h2>
            <p className="text-gray-500 mb-8">Gestisci le dotazioni, i rientri e le manutenzioni.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuItems.map((item) => (
                    <div 
                        key={item.view}
                        onClick={() => setLocalView(item.view)}
                        className="bg-white p-6 rounded-xl shadow-md border border-gray-100 cursor-pointer hover:shadow-lg hover:border-indigo-100 transition-all group relative overflow-hidden"
                    >
                        {/* Icona Sfondo */}
                        <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
                            <item.icon className={`h-24 w-24 ${item.colorClass.split(' ')[1]}`} />
                        </div>
                        
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-lg bg-opacity-10 ${item.colorClass.split(' ')[0]} bg-opacity-20`}>
                                <item.icon className={`h-8 w-8 ${item.colorClass.split(' ')[1]}`} />
                            </div>
                            {item.count > 0 && (
                                <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-bounce">
                                    {item.count} Richieste
                                </span>
                            )}
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-800 mb-1">{item.title}</h3>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};