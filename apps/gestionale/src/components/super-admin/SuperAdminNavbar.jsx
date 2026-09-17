import React from 'react';
import { 
    BuildingOfficeIcon, 
    PlusCircleIcon, 
    ShieldCheckIcon, 
    SparklesIcon 
} from '@heroicons/react/24/outline';

export const SuperAdminNavbar = ({ activeView, onNavigate }) => {
    const navItems = [
        { id: 'dashboard', label: 'Aziende e Piani', icon: BuildingOfficeIcon },
        { id: 'crea-azienda', label: 'Nuova Azienda', icon: PlusCircleIcon },
        { id: 'autorizzazioni', label: 'Moduli e Accessi', icon: ShieldCheckIcon },
    ];

    return (
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 z-10 shrink-0 shadow-sm">
            
            {/* Logo / Titolo a sinistra */}
            <div className="flex items-center gap-3">
                <SparklesIcon className="h-8 w-8 text-indigo-600" />
                <div>
                    <h2 className="text-xl font-black text-slate-800 leading-none tracking-tight">God Mode</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">SaaS Control Panel</p>
                </div>
            </div>

            {/* Menu a Tab al centro/destra */}
            <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 ${
                                isActive 
                                ? 'bg-white text-indigo-700 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            {item.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};