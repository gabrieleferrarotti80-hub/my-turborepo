// packages/shared-ui/components/PreventivoBuilder/PreventivoHeader.jsx

import React from 'react';
import { 
    PlusIcon, TrashIcon, CalculatorIcon, 
    CloudArrowUpIcon, DocumentArrowUpIcon,
    BuildingOfficeIcon, ExclamationTriangleIcon, BanknotesIcon,
    BeakerIcon, Cog6ToothIcon, XMarkIcon,
    ArrowsPointingOutIcon, ArrowsPointingInIcon, BookmarkIcon, MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

export const PreventivoHeader = ({
    listinoDbLength,
    lastEditedRowId,
    scrollToRow,
    isFullscreen,
    setIsFullscreen,
    righeLength,
    searchTerm,
    setSearchTerm,
    handleSalvaBozza,
    svuotaTabella,
    openImporter,
    aggiungiRigaManuale,
    parametriGlobali,
    handleGlobalParamsChange,
    setShowTariffeModal,
    
    // 🌟 AGGIUNGIAMO LE PROPS DEL FILTRO 🌟
    filtroCategoria,
    setFiltroCategoria
}) => {
    return (
        <>
            <div className="bg-slate-900 p-6 flex flex-col xl:flex-row justify-between items-center gap-6 shrink-0">
                <div className="flex flex-col gap-2 w-full xl:w-auto">
                    <h2 className="text-xl font-black text-white flex items-center gap-3 flex-wrap">
                        <CalculatorIcon className="h-6 w-6 text-indigo-400" /> Simulatore - Analisi Costi
                        <span className="text-xs font-bold bg-slate-800 text-slate-300 px-3 py-1 rounded-lg border border-slate-700 ml-2">DB Master: {listinoDbLength} Voci</span>
                        
                        {lastEditedRowId && (
                            <button 
                                onClick={() => scrollToRow(lastEditedRowId)}
                                className="ml-2 px-2.5 py-1.5 bg-emerald-900/50 hover:bg-emerald-800 text-emerald-300 hover:text-white rounded-lg transition-colors border border-emerald-700 shadow-sm flex items-center gap-1.5 text-xs font-bold"
                                title="Scorri all'ultima voce modificata"
                            >
                                <BookmarkIcon className="h-4 w-4" /> Torna al Segno
                            </button>
                        )}

                        <button 
                            onClick={() => setIsFullscreen(!isFullscreen)} 
                            className="ml-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700 shadow-sm"
                            title={isFullscreen ? "Riduci a finestra (Esc)" : "Modalità Focus (Schermo Intero)"}
                        >
                            {isFullscreen ? <ArrowsPointingInIcon className="h-5 w-5"/> : <ArrowsPointingOutIcon className="h-5 w-5"/>}
                        </button>
                    </h2>
                    <p className="text-slate-400 text-sm flex items-center gap-2">Il sistema apprende e ricorda le tue analisi. <BeakerIcon className="h-4 w-4 text-fuchsia-400"/></p>
                </div>

                {/* 🌟 BARRA DI RICERCA E FILTRO ATTIVO 🌟 */}
                <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto shrink-0 items-center justify-end">
                    
                    {filtroCategoria && (
                        <div className="flex items-center gap-2 bg-fuchsia-500/20 text-fuchsia-300 px-4 py-2 rounded-xl border border-fuchsia-500/40 text-sm shadow-inner w-full md:w-auto justify-between">
                            <span className="font-medium">Voci per: <strong className="text-white uppercase tracking-wider">{filtroCategoria}</strong></span>
                            <button onClick={() => setFiltroCategoria(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors ml-2" title="Rimuovi Filtro">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                    )}

                    {righeLength > 0 && (
                        <div className="relative w-full md:w-72 xl:w-80 shrink-0">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Cerca per codice o desc..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-400 rounded-xl py-2 pl-10 pr-4 outline-none focus:border-indigo-500 focus:bg-slate-950 transition-all text-sm shadow-inner"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                                    <XMarkIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="flex flex-wrap gap-3 items-center w-full xl:w-auto justify-end">
                    <button onClick={handleSalvaBozza} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md border border-slate-600">
                        <CloudArrowUpIcon className="h-5 w-5 text-indigo-300" /> Salva Bozza
                    </button>
                    {righeLength > 0 && (
                        <button onClick={svuotaTabella} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-md bg-rose-100 text-rose-600 hover:bg-rose-200 border border-rose-200">
                            <TrashIcon className="h-5 w-5" /> Svuota
                        </button>
                    )}
                    <button onClick={openImporter} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-colors shadow-md bg-emerald-500 hover:bg-emerald-400 text-white">
                        <DocumentArrowUpIcon className="h-5 w-5" /> Importa Excel
                    </button>
                    <button onClick={aggiungiRigaManuale} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-md">
                        <PlusIcon className="h-5 w-5" /> Voce
                    </button>
                </div>
            </div>

            {/* BARRA GRIGIA DEI PARAMETRI GLOBALI */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-wrap gap-6 items-center shadow-inner shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg"><BuildingOfficeIcon className="h-5 w-5 text-indigo-600" /></div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Spese Generali</label>
                        <div className="flex items-center gap-1">
                            <input type="text" value={parametriGlobali.sg} onChange={(e) => handleGlobalParamsChange('sg', e.target.value)} className="w-16 bg-white border border-slate-300 rounded p-1 text-sm font-bold text-center outline-none focus:border-indigo-500" />
                            <span className="text-sm font-bold text-slate-500">%</span>
                        </div>
                    </div>
                </div>
                <div className="w-px h-8 bg-slate-300 hidden md:block"></div>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg"><ExclamationTriangleIcon className="h-5 w-5 text-amber-600" /></div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Imprevisti</label>
                        <div className="flex items-center gap-1">
                            <input type="text" value={parametriGlobali.imprevisti} onChange={(e) => handleGlobalParamsChange('imprevisti', e.target.value)} className="w-16 bg-white border border-slate-300 rounded p-1 text-sm font-bold text-center outline-none focus:border-amber-500" />
                            <span className="text-sm font-bold text-slate-500">%</span>
                        </div>
                    </div>
                </div>
                <div className="w-px h-8 bg-slate-300 hidden md:block"></div>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg"><BanknotesIcon className="h-5 w-5 text-emerald-600" /></div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Utile Globale</label>
                        <div className="flex items-center gap-1">
                            <input type="text" value={parametriGlobali.utile} onChange={(e) => handleGlobalParamsChange('utile', e.target.value)} className="w-16 bg-white border border-slate-300 rounded p-1 text-sm font-bold text-center outline-none focus:border-emerald-500" />
                            <span className="text-sm font-bold text-slate-500">%</span>
                        </div>
                    </div>
                </div>
                <div className="md:ml-auto">
                    <button onClick={() => setShowTariffeModal(true)} className="flex items-center gap-2 bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-colors">
                        <Cog6ToothIcon className="h-5 w-5" /> Costi Manodopera Cantiere
                    </button>
                </div>
            </div>
        </>
    );
};