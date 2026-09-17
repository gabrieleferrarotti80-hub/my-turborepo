import React from 'react';

export const AnalisiEconomicaWidget = ({ cantiere, analisiReale }) => {
    const appalto = Number(cantiere.valoreAppalto || analisiReale?.kpi?.budgetRicavi || 0);
    const budget = Number(cantiere.budgetCosti || analisiReale?.kpi?.budgetCosti || 0);
    
    const costiTotaliReali = Number(analisiReale?.kpi?.totaleCostiPieni || analisiReale?.kpi?.totaleCostiDiretti || 0); 
    const costoManodopera = Number(analisiReale?.kpi?.costiManodopera || 0);
    const costoMateriali = Number(analisiReale?.kpi?.costiMateriali || 0);
    
    const costoMezziPropri = Number(analisiReale?.kpi?.costiAttrezzatura || 0);
    const costoNoleggiEsterni = Number(analisiReale?.kpi?.costiNoleggi || 0);
    const costoSubappalti = Number(analisiReale?.kpi?.costiSubappalti || 0); 

    const ricaviDaSAL = Number(analisiReale?.kpi?.ricaviDaSAL || 0);
    const avanzamento = Number(analisiReale?.kpi?.percentualeAvanzamento || cantiere.percentualeAvanzamento || 0);

    const valoreMaturato = ricaviDaSAL > 0 ? ricaviDaSAL : (appalto * (avanzamento / 100));
    const margineAttuale = valoreMaturato - costiTotaliReali;

    return (
        <div className="space-y-6 p-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase font-bold">Valore Appalto</p>
                    <p className="text-xl font-bold text-gray-800 mt-1">€ {appalto.toLocaleString('it-IT')}</p>
                </div>
                <div className="bg-indigo-50 p-5 rounded-xl shadow-sm border border-indigo-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-indigo-200 text-indigo-800 text-[10px] font-bold px-2 py-1 rounded-bl-lg">{ricaviDaSAL > 0 ? 'CERTIFICATO SAL' : 'TEORICO'}</div>
                    <p className="text-xs text-indigo-600 uppercase font-bold">Ricavi Maturati</p>
                    <p className="text-xl font-bold text-indigo-700 mt-1">€ {valoreMaturato.toLocaleString('it-IT')}</p>
                    <div className="w-full bg-indigo-200 rounded-full h-1.5 mt-2"><div className="bg-indigo-600 h-1.5 rounded-full transition-all" style={{ width: `${avanzamento}%` }}></div></div>
                    <p className="text-[10px] text-indigo-500 mt-1 text-right">{avanzamento}% di completamento</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase font-bold">Costi Sostenuti</p>
                    <p className={`text-xl font-bold mt-1 ${costiTotaliReali > budget ? 'text-red-600' : 'text-orange-500'}`}>€ {costiTotaliReali.toLocaleString('it-IT')}</p>
                    <p className="text-[10px] text-gray-400 mt-1">Budget previsto: € {budget.toLocaleString('it-IT')}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase font-bold">Margine Attuale</p>
                    <p className={`text-xl font-bold mt-1 ${margineAttuale < 0 ? 'text-red-600' : 'text-green-600'}`}>€ {margineAttuale.toLocaleString('it-IT')}</p>
                </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-medium">Manodopera</p>
                    <p className="text-lg font-bold text-gray-700">€ {costoManodopera.toLocaleString('it-IT')}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-medium">Materiali / Magazz.</p>
                    <p className="text-lg font-bold text-gray-700">€ {costoMateriali.toLocaleString('it-IT')}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-medium">Mezzi Propri</p>
                    <p className="text-lg font-bold text-gray-700">€ {costoMezziPropri.toLocaleString('it-IT')}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 text-center shadow-sm">
                    <p className="text-xs text-orange-700 uppercase font-bold tracking-wide">Noleggi</p>
                    <p className="text-lg font-extrabold text-orange-900">€ {costoNoleggiEsterni.toLocaleString('it-IT')}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center shadow-sm">
                    <p className="text-xs text-blue-700 uppercase font-bold tracking-wide">Subappalti</p>
                    <p className="text-lg font-extrabold text-blue-900">€ {costoSubappalti.toLocaleString('it-IT')}</p>
                </div>
            </div>
        </div>
    );
};