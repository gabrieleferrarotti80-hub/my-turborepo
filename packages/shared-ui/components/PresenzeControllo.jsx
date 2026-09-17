// File: packages/shared-ui/components/PresenzeControllo.jsx

import React from 'react';
import { 
    ArrowRightOnRectangleIcon, 
    ArrowLeftOnRectangleIcon, 
    ClockIcon 
} from '@heroicons/react/24/solid';

export const PresenzeControllo = ({ 
    statoCorrente, 
    onCheckIn, 
    onCheckOut, 
    isSaving, 
    onViewPresenzeClick 
}) => {
    
    const isWorking = statoCorrente && statoCorrente.stato === 'lavoro';
    
    // Calcoliamo l'orario di ingresso se sta lavorando
    const orarioIngresso = isWorking && statoCorrente.timestampInizio 
        ? (statoCorrente.timestampInizio.toDate ? statoCorrente.timestampInizio.toDate() : new Date(statoCorrente.timestampInizio)).toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})
        : null;

    return (
        <div className="flex flex-col items-center justify-center w-full">
            
            {isWorking ? (
                <div className="w-full space-y-4 animate-fade-in">
                    <div className="text-center">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-black uppercase tracking-widest border border-green-200 shadow-sm">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                            </span>
                            In turno dalle {orarioIngresso}
                        </span>
                    </div>
                    
                    <button 
                        onClick={onCheckOut} 
                        disabled={isSaving}
                        className="w-full py-5 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-[1.5rem] font-black text-xl shadow-[0_8px_15px_rgba(239,68,68,0.2)] transition-all active:scale-95 flex justify-center items-center gap-3 disabled:opacity-50"
                    >
                        <ArrowRightOnRectangleIcon className="h-7 w-7" /> 
                        {isSaving ? 'Registrazione...' : 'Termina Turno'}
                    </button>
                </div>
            ) : (
                <div className="w-full space-y-4 animate-fade-in">
                    <div className="text-center">
                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gray-100 text-gray-500 text-xs font-black uppercase tracking-widest border border-gray-200">
                            <ClockIcon className="h-4 w-4" /> Fuori Turno
                        </span>
                    </div>
                    
                    <button 
                        onClick={onCheckIn} 
                        disabled={isSaving}
                        className="w-full py-5 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-[1.5rem] font-black text-xl shadow-[0_8px_15px_rgba(34,197,94,0.2)] transition-all active:scale-95 flex justify-center items-center gap-3 disabled:opacity-50"
                    >
                        <ArrowLeftOnRectangleIcon className="h-7 w-7" /> 
                        {isSaving ? 'Registrazione...' : 'Inizia Turno'}
                    </button>
                </div>
            )}

            <button 
                onClick={onViewPresenzeClick} 
                className="mt-5 text-sm font-bold text-indigo-500 hover:text-indigo-700 underline underline-offset-4 decoration-2 decoration-indigo-200 transition-colors"
            >
                Visualizza Storico Timbrature
            </button>
            
        </div>
    );
};