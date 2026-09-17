// packages/shared-ui/components/PreventivoBuilder/PreventivoFooter.jsx

import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

export const PreventivoFooter = ({
    righeLength,
    totaleGara,
    totaleCostiVivi,
    totaleSG,
    totaleImp,
    utileNetto,
    margineMedio,
    totaleVendita,
    handleCompletaProcedi
}) => {
    
    // Se non ci sono righe, non mostriamo il footer
    if (righeLength === 0) return null;

    return (
        <div className="bg-slate-50 p-6 flex flex-wrap gap-6 border-t-[3px] border-slate-300 items-end shrink-0 z-50 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
            {totaleGara > 0 && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-1 min-w-[150px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Base d'Asta</p>
                    <p className="text-xl font-bold text-slate-600 line-through">
                        € {totaleGara.toLocaleString('it-IT', {minimumFractionDigits: 2})}
                    </p>
                </div>
            )}
            
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-300 shadow-sm flex-1 min-w-[150px]">
                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Costo Diretto (Vivo)</p>
                <p className="text-xl font-bold text-rose-700">
                    € {totaleCostiVivi.toLocaleString('it-IT', {minimumFractionDigits: 2})}
                </p>
            </div>
            
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-300 shadow-sm flex-1 min-w-[150px]">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">SG & Imprevisti</p>
                <p className="text-xl font-bold text-indigo-700">
                    € {(totaleSG + totaleImp).toLocaleString('it-IT', {minimumFractionDigits: 2})}
                </p>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-300 shadow-sm flex-1 min-w-[150px]">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Utile Previsto (Netto)</p>
                <div className="flex items-end gap-2">
                    <p className="text-xl font-black text-amber-700">
                        € {utileNetto.toLocaleString('it-IT', {minimumFractionDigits: 2})}
                    </p>
                    <span className="text-sm font-bold text-amber-500 mb-0.5">
                        (+{margineMedio.toFixed(1)}%)
                    </span>
                </div>
            </div>
            
            <div className="text-right flex flex-col justify-end h-full flex-[2] min-w-[250px]">
                <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Totale Offerta Scaturita</p>
                <p className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-4">
                    € {totaleVendita.toLocaleString('it-IT', {minimumFractionDigits: 2})}
                </p>
                <div className="flex gap-3 w-full justify-end">
                    <button 
                        onClick={handleCompletaProcedi} 
                        className="w-full max-w-[300px] flex justify-center items-center gap-2 bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95"
                    >
                        <CheckCircleIcon className="h-5 w-5" /> Completa e Procedi
                    </button>
                </div>
            </div>
        </div>
    );
};