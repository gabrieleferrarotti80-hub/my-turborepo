import React, { useState, useMemo } from 'react'; 
import { 
    EyeIcon, 
    QueueListIcon, 
    WrenchScrewdriverIcon, 
    TruckIcon, 
    ShieldCheckIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline'; 

export const GestioneAssegnazioniMagazzinoView = ({ assegnazioni = [], attrezzature = [], setLocalView }) => { 
    
    const [activeTab, setActiveTab] = useState('Tutte'); 

    // --- INCROCIO DATI ---
    const enrichedAssegnazioni = useMemo(() => {
        return assegnazioni.map(ass => {
            const liveItem = attrezzature.find(item => 
                (ass.articoloId && item.id === ass.articoloId) || 
                (ass.attrezzaturaId && item.id === ass.attrezzaturaId) ||
                (ass.articoloNome && item.nome === ass.articoloNome) ||
                (ass.articoloSeriale && item.seriale === ass.articoloSeriale)
            );

            const cat = liveItem?.categoria || ass.categoria || 'Attrezzatura Generica';
            const marca = liveItem?.dettagli?.marca || liveItem?.marca || ass.marca || '';
            const modello = liveItem?.dettagli?.modello || liveItem?.modello || ass.modello || '';
            const seriale = liveItem?.seriale || liveItem?.targa || liveItem?.dettagli?.seriale || ass.articoloSeriale || ass.targa || '';
            const nome = liveItem?.nome || ass.articoloNome || ass.attrezzaturaNome || 'Asset Sconosciuto';

            return {
                ...ass,
                categoria: cat,
                marca: marca,
                modello: modello,
                serialeMostrato: seriale,
                nomeMostrato: nome
            };
        });
    }, [assegnazioni, attrezzature]);

    // --- FILTRAGGIO BLINDATO ---
    const filteredAssegnazioni = useMemo(() => {
        if (activeTab === 'Tutte') return enrichedAssegnazioni;
        
        return enrichedAssegnazioni.filter(a => {
            const c = a.categoria?.toLowerCase() || '';
            const isDpi = c.includes('dpi');
            const isVeicolo = c.includes('mezzo') || c.includes('veicolo') || c.includes('auto');
            
            if (activeTab === 'DPI') return isDpi;
            if (activeTab === 'Automezzo') return isVeicolo;
            
            // Qualsiasi altra cosa finisce in Attrezzature per non sparire mai
            return !isDpi && !isVeicolo;
        });
    }, [enrichedAssegnazioni, activeTab]);

    // --- COUNTERS ---
    const countDpi = enrichedAssegnazioni.filter(a => a.categoria?.toLowerCase().includes('dpi')).length;
    const countAutomezzi = enrichedAssegnazioni.filter(a => a.categoria?.toLowerCase().includes('mezzo') || a.categoria?.toLowerCase().includes('veicolo') || a.categoria?.toLowerCase().includes('auto')).length;
    const countAttrezzature = enrichedAssegnazioni.length - countDpi - countAutomezzi;

    const formatDate = (dateValue) => {
        if (!dateValue) return '-';
        if (dateValue.seconds) return new Date(dateValue.seconds * 1000).toLocaleDateString('it-IT');
        return new Date(dateValue).toLocaleDateString('it-IT');
    };

    const getNomeAssegnatario = (a) => a.assegnatoA_Nome || a.utenteNome || a.dipendente || 'Sconosciuto';

    const TabButton = ({ label, tabName, icon: Icon, count }) => {
        const isActive = activeTab === tabName;
        return (
            <button 
                onClick={() => setActiveTab(tabName)} 
                className={`flex items-center gap-2 py-2.5 px-5 rounded-t-lg font-bold text-sm transition-all border-b-2 ${
                    isActive 
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-600' 
                    : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
                }`}
            >
                {Icon && <Icon className="h-5 w-5" />}
                {label}
                <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-200 text-slate-600'}`}>
                    {count}
                </span>
            </button>
        );
    };

    return ( 
        <div className="animate-fade-in space-y-4"> 
            
            <div className="flex gap-2 overflow-x-auto border-b border-slate-200 px-2 pt-2 bg-slate-50/50 rounded-t-2xl">
                <TabButton label="Tutte le Assegnazioni" tabName="Tutte" icon={QueueListIcon} count={enrichedAssegnazioni.length} />
                <TabButton label="Attrezzature" tabName="Attrezzatura Generica" icon={WrenchScrewdriverIcon} count={countAttrezzature} />
                <TabButton label="Automezzi" tabName="Automezzo" icon={TruckIcon} count={countAutomezzi} />
                <TabButton label="DPI" tabName="DPI" icon={ShieldCheckIcon} count={countDpi} />
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Asset e Categoria</th>
                            <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Marca / Modello</th>
                            <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Targa / Seriale</th>
                            <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Assegnato A</th>
                            <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Data Assegn.</th>
                            <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Stato Attuale</th>
                            <th className="px-6 py-4 text-right text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Azione</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {filteredAssegnazioni.length > 0 ? (
                            filteredAssegnazioni.sort((a,b) => new Date(b.dataAssegnazione) - new Date(a.dataAssegnazione)).map(assegnazione => (
                                <tr key={assegnazione.id} className="hover:bg-slate-50 transition-colors group">
                                    
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 text-[14px] line-clamp-1" title={assegnazione.nomeMostrato}>
                                                {assegnazione.nomeMostrato}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 flex items-center gap-1">
                                                {assegnazione.categoria} 
                                                {assegnazione.isVirtual && <ExclamationTriangleIcon className="h-3 w-3 text-amber-500" title="Dato ricostruito dal sistema" />}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800 text-[13px]">{assegnazione.marca || '-'}</span>
                                            <span className="text-xs text-slate-500">{assegnazione.modello || ''}</span>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        {assegnazione.serialeMostrato ? (
                                            <span className="font-mono text-xs font-bold text-slate-700 bg-white border border-slate-300 px-2 py-1 rounded shadow-sm tracking-tight">
                                                {assegnazione.serialeMostrato}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-xs italic">-</span>
                                        )}
                                    </td>

                                    <td className="px-6 py-4">
                                        <span className="font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 text-xs">
                                            {getNomeAssegnatario(assegnazione)}
                                        </span>
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-600">
                                        {formatDate(assegnazione.dataAssegnazione)}
                                    </td>

                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1.5 inline-flex text-[11px] leading-4 font-bold rounded-full uppercase tracking-wider shadow-sm border ${
                                            (assegnazione.statoWorkflow || 'attiva') === 'in uso' || (assegnazione.statoWorkflow || 'attiva') === 'attiva' 
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            (assegnazione.statoWorkflow || '').includes('conferma') 
                                                ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            'bg-red-50 text-red-700 border-red-200'
                                        }`}>
                                            {(assegnazione.statoWorkflow || 'attiva').replace(/-/g, ' ')}
                                        </span>
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setLocalView('dettagli-assegnazione', assegnazione)}
                                            className="text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-300 hover:border-indigo-300 px-3 py-1.5 rounded-lg shadow-sm transition-all text-xs font-bold inline-flex items-center gap-1.5"
                                        >
                                            <EyeIcon className="h-4 w-4" /> Dettagli
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="py-16 px-4 text-center">
                                    <div className="flex flex-col items-center justify-center">
                                        <QueueListIcon className="h-10 w-10 text-slate-300 mb-3" />
                                        <p className="text-slate-500 font-medium italic">Nessuna assegnazione trovata per questa categoria.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div> 
        </div> 
    ); 
};