import React, { useState } from 'react';
import { CalendarDaysIcon, UserPlusIcon } from '@heroicons/react/24/outline';

// --- IMPORT DEI COMPONENTI REALI ---
import { ProgrammazioneContent } from '../components/programmazione/ProgrammazioneContent';
import { AssegnaCantiereForm } from '../AssegnaCantiereForm'; 
import { useFirebaseData } from 'shared-core'; 

const ProgrammazioneManagerView = () => {
    const [activeTab, setActiveTab] = useState('generale');

    // ✅ RECUPERIAMO ANCHE 'user' DAL DATABASE
    const { data, userAziendaId, db, user } = useFirebaseData();

    return (
        <div className="flex flex-col h-full bg-gray-50 animate-fade-in">
            
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Programmazione Lavori</h1>
                    <p className="text-sm text-gray-500">Pianifica i turni generali o assegna risorse specifiche.</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white px-6 border-b border-gray-200">
                <nav className="flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('generale')}
                        className={`
                            flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'generale' 
                                ? 'border-indigo-600 text-indigo-600' 
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        <CalendarDaysIcon className="h-5 w-5" />
                        Planner Generale (Gantt)
                    </button>

                    <button
                        onClick={() => setActiveTab('singola')}
                        className={`
                            flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'singola' 
                                ? 'border-indigo-600 text-indigo-600' 
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        <UserPlusIcon className="h-5 w-5" />
                        Assegnazione Singola
                    </button>
                </nav>
            </div>

            {/* Contenuto Tab */}
            <div className="flex-1 overflow-hidden p-6">
                {activeTab === 'generale' ? (
                    <div className="h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        
                        <ProgrammazioneContent />

                    </div>
                ) : (
                    <div className="h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-y-auto p-6">
                        
                        {/* ✅ ORA PASSIAMO TUTTO IL PACCHETTO "data" E I NOMI CORRETTI PER I PULSANTI! */}
                        <AssegnaCantiereForm 
                            onBack={() => setActiveTab('generale')} 
                            onSaveSuccess={() => setActiveTab('generale')} 
                            data={data}
                            db={db}
                            user={user}
                            userAziendaId={userAziendaId}
                        />
                        
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProgrammazioneManagerView;