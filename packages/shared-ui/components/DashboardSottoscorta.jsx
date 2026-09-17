import React, { useMemo } from 'react';
import { 
    ExclamationTriangleIcon, 
    ShoppingCartIcon, 
    ArrowDownTrayIcon,
    BuildingStorefrontIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/outline';

export const DashboardSottoscorta = ({ materiali = [], onBack }) => {
    
    // --- LOGICA: Filtro e Raggruppamento per Fornitore ---
    const reportSottoscorta = useMemo(() => {
        const daOrdinare = materiali.filter(m => {
            const qta = Number(m.quantita || 0);
            const soglia = Number(m.sogliaMinima || 0);
            return soglia > 0 && qta <= soglia;
        });

        // Raggruppiamo per fornitore per facilitare gli ordini
        const groups = {};
        daOrdinare.forEach(m => {
            const f = m.fornitore || 'Fornitore non specificato';
            if (!groups[f]) groups[f] = [];
            groups[f].push(m);
        });

        return {
            totaleArticoli: daOrdinare.length,
            perFornitore: Object.entries(groups).sort()
        };
    }, [materiali]);

    // --- EXPORT CSV LISTA SPESA ---
    const exportListaSpesa = () => {
        const headers = ["Fornitore", "Articolo", "Giacenza", "Soglia Minima", "Mancanti", "U.M.", "Costo Unitario", "Stima Spesa"];
        const rows = [];

        reportSottoscorta.perFornitore.forEach(([fornitore, articoli]) => {
            articoli.forEach(a => {
                const mancanti = Math.max(0, Number(a.sogliaMinima) - Number(a.quantita));
                const stima = mancanti * (Number(a.costoUnitario) || 0);
                rows.push([
                    fornitore,
                    a.nome,
                    a.quantita,
                    a.sogliaMinima,
                    mancanti,
                    a.unitaMisura,
                    a.costoUnitario,
                    stima.toFixed(2)
                ]);
            });
        });

        const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Lista_Spesa_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeftIcon className="h-6 w-6 text-slate-500" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <ShoppingCartIcon className="h-7 w-7 text-amber-500"/>
                            Pianificazione Acquisti
                        </h2>
                        <p className="text-slate-500 text-sm font-medium">Materiali sotto la soglia di sicurezza.</p>
                    </div>
                </div>
                
                <button 
                    onClick={exportListaSpesa}
                    disabled={reportSottoscorta.totaleArticoli === 0}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all"
                >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    Scarica Lista Spesa
                </button>
            </div>

            {reportSottoscorta.totaleArticoli === 0 ? (
                <div className="bg-emerald-50 border border-emerald-200 p-10 rounded-2xl text-center">
                    <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingCartIcon className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-bold text-emerald-800">Magazzino in Regola!</h3>
                    <p className="text-emerald-600">Tutti i materiali sono sopra la soglia minima di scorta.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {reportSottoscorta.perFornitore.map(([fornitore, articoli]) => (
                        <div key={fornitore} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center gap-2">
                                <BuildingStorefrontIcon className="h-5 w-5 text-slate-400" />
                                <h3 className="font-black text-slate-700 uppercase tracking-wide text-sm">{fornitore}</h3>
                                <span className="ml-auto bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-bold">
                                    {articoli.length} articoli da riordinare
                                </span>
                            </div>
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-white">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Materiale</th>
                                        <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-400 uppercase">Giacenza</th>
                                        <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-400 uppercase">Soglia</th>
                                        <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase">Mancanti</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {articoli.map(a => (
                                        <tr key={a.id} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800">{a.nome}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{a.codice || 'NO-SKU'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded">{a.quantita} {a.unitaMisura}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-slate-500 font-medium">
                                                {a.sogliaMinima} {a.unitaMisura}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-amber-700 font-black">
                                                    +{Math.max(0, Number(a.sogliaMinima) - Number(a.quantita))} {a.unitaMisura}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};