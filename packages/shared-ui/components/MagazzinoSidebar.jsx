import React from 'react';
import { 
    ArchiveBoxIcon, WrenchScrewdriverIcon, ClipboardDocumentListIcon, 
    ArrowLeftIcon, CubeIcon, ClockIcon 
} from '@heroicons/react/24/outline';

export const MagazzinoSidebar = ({ activeSubView, onNavigate, onBack }) => {
    
    const menuItems = [
        { id: 'attrezzature', label: 'Parco Attrezzature', icon: WrenchScrewdriverIcon },
        { id: 'materiali', label: 'Magazzino Materiali', icon: CubeIcon },
        { id: 'assegnazioni', label: 'Registro Assegnazioni', icon: ClipboardDocumentListIcon },
        // ✅ NUOVA VOCE
        { id: 'manutenzioni', label: 'Scadenze & Manutenzioni', icon: ClockIcon },
    ];

    return (
        <div className="flex flex-col h-full text-gray-300">
            <div className="p-6 border-b border-gray-700">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ArchiveBoxIcon className="h-6 w-6 text-indigo-400"/> Magazzino
                </h2>
                <button onClick={onBack} className="mt-4 flex items-center text-sm text-gray-400 hover:text-white transition-colors">
                    <ArrowLeftIcon className="h-4 w-4 mr-2"/> Torna alla Home
                </button>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                            activeSubView === item.id 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'hover:bg-gray-700 hover:text-white'
                        }`}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};