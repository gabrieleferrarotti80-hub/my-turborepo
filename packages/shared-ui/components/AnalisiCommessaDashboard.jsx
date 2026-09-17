import React, { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { 
    ArrowLeftIcon, CurrencyDollarIcon, ChartPieIcon, UserGroupIcon, 
    PresentationChartLineIcon, PrinterIcon, XMarkIcon, DocumentTextIcon, 
    BanknotesIcon, ExclamationTriangleIcon, DocumentCheckIcon, 
    ShieldCheckIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, ScaleIcon, 
    ClockIcon, BoltIcon, DocumentPlusIcon
} from '@heroicons/react/24/solid';

const formatCurrency = (amount) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount || 0);

const KPICard = ({ title, value, subtext, icon, colorClass, onClick, isActive }) => (
    <div onClick={onClick} className={`bg-white p-6 rounded-xl shadow-sm border transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:border-indigo-300' : ''} ${isActive ? 'ring-2 ring-offset-2 ring-indigo-500 border-indigo-500' : 'border-gray-100'}`}>
        <div className="flex items-center">
            <div className={`p-4 rounded-full ${colorClass} bg-opacity-10 mr-4`}>{icon}</div>
            <div>
                <p className="text-sm font-medium text-gray-500 uppercase">{title}</p>
                <p className={`text-2xl font-bold ${colorClass.replace('bg-', 'text-')}`}>{value}</p>
                {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
            </div>
        </div>
        {onClick && <div className="mt-2 text-xs text-right text-indigo-400 font-medium">Filtra movimenti →</div>}
    </div>
);

export const AnalisiCommessaDashboard = ({
    cantieri = [], analisi, listaCantieriAnalizzati = [], filtroCantiereId, setFiltroCantiereId,
    dateRange, setDateRange, onNavigateBack, capacityPlanning
}) => {
    
    const isAzienda = filtroCantiereId === 'azienda';
    const [activeFilter, setActiveFilter] = useState(null);
    const printRef = useRef();
    const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: `Report_Direzionale` });

    const cf = analisi.cashFlow || { in: {}, out: {}, net: {} };
    const prod = analisi.produttivita || { resaOraria: 0, cpi: 0 };
    const tempi = analisi.tempistiche || {};
    
    const getSatColor = (sat) => {
        if (sat > 100) return 'bg-red-500';
        if (sat > 85) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const movimentiFiltrati = activeFilter && analisi.items ? analisi.items.filter(item => item.category === activeFilter) : (analisi.items || []);

    const getFilterLabel = (filter) => {
        switch(filter) {
            case 'materiali': return 'Materiali e Magazzino';
            case 'subappalti': return 'SAL Passivi (Subappalti)';
            case 'manodopera': return 'Ore Manodopera';
            case 'attrezzature': return 'Costi Attrezzature';
            case 'ricavi': return 'Fatture Emesse e SAL';
            default: return 'Tutti i Movimenti';
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 bg-gray-50 min-h-full">
            
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 pb-4 border-b border-gray-200 print:hidden">
                <div className="flex items-center gap-4 w-full xl:w-auto">
                    <button onClick={onNavigateBack} className="text-gray-500 hover:text-gray-700 transition-colors">
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-2">
                            <PresentationChartLineIcon className="h-8 w-8 text-indigo-600"/>
                            Controllo Direzionale
                        </h1>
                        <p className="text-gray-500 text-sm">Flussi, produttività e varianti d'opera.</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    {/* ✅ BOTTONE PARAMETRI RIMOSSO DA QUI */}
                    <button onClick={handlePrint} className="p-2 bg-indigo-600 text-white rounded-lg shadow-md flex items-center gap-2 text-sm font-medium">
                        <PrinterIcon className="h-5 w-5" /> <span>Stampa</span>
                    </button>
                    <select value={filtroCantiereId} onChange={(e) => setFiltroCantiereId(e.target.value)} className="p-2.5 border border-gray-300 rounded-lg text-sm font-medium bg-white shadow-sm">
                        <option value="azienda">🏢 Tutta l'Azienda</option>
                        <optgroup label="Cantieri Attivi">
                            {cantieri.map(c => <option key={c.id} value={c.id}>{c.nomeCantiere}</option>)}
                        </optgroup>
                    </select>
                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-300 shadow-sm">
                        <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))} className="bg-transparent border-none text-sm focus:ring-0 p-1.5 text-gray-700 w-[130px] font-medium" />
                        <span className="text-gray-400 font-bold">→</span>
                        <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))} className="bg-transparent border-none text-sm focus:ring-0 p-1.5 text-gray-700 w-[130px] font-medium" />
                    </div>
                </div>
            </div>

            <div ref={printRef} className="space-y-8 print:p-8">

                {!isAzienda && analisi.valoreVarianti > 0 && (
                    <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <DocumentPlusIcon className="h-8 w-8 text-indigo-600" />
                            <div>
                                <h4 className="text-indigo-900 font-bold">Varianti in Corso d'Opera Approvate</h4>
                                <p className="text-sm text-indigo-700">Il budget iniziale è stato aggiornato per includere extra-lavori approvati dal cliente.</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-indigo-500 uppercase font-bold tracking-wide">Budget Ricavi Aggiornato</p>
                            <p className="text-2xl font-extrabold text-indigo-700">{formatCurrency(analisi.budgetRicavi)}</p>
                            <p className="text-xs text-indigo-600 mt-1">Base: {formatCurrency(analisi.budgetRicaviIniziale)} + Varianti: {formatCurrency(analisi.valoreVarianti)}</p>
                        </div>
                    </div>
                )}

                <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Produttività e Scadenze (EVM)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-3">
                    <KPICard title="Resa Oraria Operai" value={`${formatCurrency(prod.resaOraria)} / h`} subtext="Valore del SAL prodotto per 1h di lavoro" icon={<BoltIcon className="h-6 w-6 text-yellow-600" />} colorClass="bg-yellow-600" />
                    <KPICard title="Efficienza Costi (CPI)" value={prod.cpi.toFixed(2)} subtext={prod.cpi > 1 ? "✅ Stiamo guadagnando per ogni euro speso" : "⚠️ Perdita strutturale sui costi"} icon={<ScaleIcon className="h-6 w-6 text-indigo-600" />} colorClass={prod.cpi >= 1 ? "bg-indigo-600" : "bg-red-600"} />
                    {!isAzienda ? (
                        <div className={`p-6 rounded-xl shadow-sm border ${tempi.inRitardo ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
                            <div className="flex items-center mb-2">
                                <ClockIcon className={`h-6 w-6 mr-3 ${tempi.inRitardo ? 'text-red-600' : 'text-blue-600'}`} />
                                <h3 className={`text-sm font-medium uppercase ${tempi.inRitardo ? 'text-red-700' : 'text-gray-500'}`}>Scadenza Cantiere</h3>
                            </div>
                            <p className={`text-2xl font-bold ${tempi.inRitardo ? 'text-red-800' : 'text-gray-800'}`}>{tempi.giorniMancanti} gg <span className="text-sm font-normal">rimasti</span></p>
                            <div className="mt-3">
                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                    <span>SAL: {analisi.percentualeAvanzamento}%</span>
                                    <span>Tempo: {tempi.percTempoTrascorso}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className={`h-2 rounded-full ${tempi.inRitardo ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(tempi.percTempoTrascorso, 100)}%` }}></div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <KPICard title="Cantieri in Ritardo" value={tempi.cantieriInRitardo || 0} subtext="Appalti con tempo consumato oltre i SAL" icon={<ClockIcon className="h-6 w-6 text-red-600" />} colorClass={tempi.cantieriInRitardo > 0 ? "bg-red-600" : "bg-green-600"} />
                    )}
                </div>

                {isAzienda && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mt-6 print:break-inside-avoid">
                        <div className="flex items-center gap-2 mb-6">
                            <ScaleIcon className="h-6 w-6 text-indigo-600" />
                            <h3 className="text-xl font-bold text-gray-800">Scadenziario (Prossimi 90 gg)</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Flusso (Iva Inclusa)</th>
                                        <th className="px-4 py-3 text-right font-bold text-red-600 uppercase bg-red-50/50">Scadute!</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase">Entro 30 gg</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase">Entro 60 gg</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase">Entro 90 gg</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-4 py-4 whitespace-nowrap flex items-center gap-2 text-green-700 font-medium"><ArrowDownTrayIcon className="h-4 w-4"/> Entrate (Clienti)</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right font-bold text-green-600 bg-red-50/30">{formatCurrency(cf.in.scadute)}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-gray-700">{formatCurrency(cf.in.d30)}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-gray-700">{formatCurrency(cf.in.d60)}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-gray-700">{formatCurrency(cf.in.d90)}</td>
                                    </tr>
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-4 py-4 whitespace-nowrap flex items-center gap-2 text-red-700 font-medium"><ArrowUpTrayIcon className="h-4 w-4"/> Uscite (Fornitori)</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right font-bold text-red-600 bg-red-50/30">{formatCurrency(cf.out.scadute)}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-gray-700">{formatCurrency(cf.out.d30)}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-gray-700">{formatCurrency(cf.out.d60)}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-gray-700">{formatCurrency(cf.out.d90)}</td>
                                    </tr>
                                    <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                                        <td className="px-4 py-4 whitespace-nowrap text-gray-800 uppercase">Delta Liquidità</td>
                                        <td className={`px-4 py-4 whitespace-nowrap text-right ${cf.net.scadute >= 0 ? 'text-green-700' : 'text-red-700'}`}>{cf.net.scadute >= 0 ? '+' : ''}{formatCurrency(cf.net.scadute)}</td>
                                        <td className={`px-4 py-4 whitespace-nowrap text-right ${cf.net.d30 >= 0 ? 'text-green-600' : 'text-red-600'}`}>{cf.net.d30 >= 0 ? '+' : ''}{formatCurrency(cf.net.d30)}</td>
                                        <td className={`px-4 py-4 whitespace-nowrap text-right ${cf.net.d60 >= 0 ? 'text-green-600' : 'text-red-600'}`}>{cf.net.d60 >= 0 ? '+' : ''}{formatCurrency(cf.net.d60)}</td>
                                        <td className={`px-4 py-4 whitespace-nowrap text-right ${cf.net.d90 >= 0 ? 'text-green-600' : 'text-red-600'}`}>{cf.net.d90 >= 0 ? '+' : ''}{formatCurrency(cf.net.d90)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mt-8">Riepilogo Liquidità (Oggi)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 print:grid-cols-3">
                    <KPICard title="Fatturato" value={formatCurrency(analisi.fatturatoVendite)} icon={<DocumentTextIcon className="h-6 w-6 text-blue-600" />} colorClass="bg-blue-600" onClick={() => setActiveFilter('ricavi')} isActive={activeFilter === 'ricavi'} />
                    <KPICard title="Incassato" value={formatCurrency(analisi.incassatoVendite)} icon={<BanknotesIcon className="h-6 w-6 text-green-600" />} colorClass="bg-green-600" />
                    <KPICard title="Crediti Clienti" value={formatCurrency(analisi.creditiVersoClienti)} icon={<ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />} colorClass="bg-orange-600" />
                    <KPICard title="Da Fatturare" value={formatCurrency(analisi.lavoriDaFatturare)} icon={<DocumentCheckIcon className="h-6 w-6 text-purple-600" />} colorClass="bg-purple-600" />
                    <KPICard title="Debiti Fornitori" value={formatCurrency(analisi.debitiVersoFornitori)} icon={<CurrencyDollarIcon className="h-6 w-6 text-pink-600" />} colorClass="bg-pink-600" onClick={() => setActiveFilter('materiali')} isActive={activeFilter === 'materiali'} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:grid-cols-1 mt-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <ChartPieIcon className="h-5 w-5 text-indigo-600" />
                            Composizione dei Costi
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div onClick={() => setActiveFilter('materiali')} className={`cursor-pointer p-3 bg-gray-50 rounded-lg border transition-colors ${activeFilter === 'materiali' ? 'border-orange-500 ring-1 ring-orange-500' : 'border-gray-200 hover:border-orange-300'}`}>
                                <span className="flex items-center gap-2 text-gray-500 mb-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Fornitori</span>
                                <strong className="text-base text-gray-800">{formatCurrency(analisi.costiMateriali)}</strong>
                            </div>
                            <div onClick={() => setActiveFilter('subappalti')} className={`cursor-pointer p-3 bg-gray-50 rounded-lg border transition-colors ${activeFilter === 'subappalti' ? 'border-teal-500 ring-1 ring-teal-500' : 'border-gray-200 hover:border-teal-300'}`}>
                                <span className="flex items-center gap-2 text-gray-500 mb-1"><div className="w-2 h-2 rounded-full bg-teal-500"></div> Subappalti</span>
                                <strong className="text-base text-gray-800">{formatCurrency(analisi.costiSubappalti)}</strong>
                            </div>
                            <div onClick={() => setActiveFilter('manodopera')} className={`cursor-pointer p-3 bg-gray-50 rounded-lg border transition-colors ${activeFilter === 'manodopera' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 hover:border-blue-300'}`}>
                                <span className="flex items-center gap-2 text-gray-500 mb-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Manodopera</span>
                                <strong className="text-base text-gray-800">{formatCurrency(analisi.costiManodopera)}</strong>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <span className="flex items-center gap-2 text-gray-500 mb-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Noleggi</span>
                                <strong className="text-base text-gray-800">{formatCurrency(analisi.costiNoleggi)}</strong>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <span className="flex items-center gap-2 text-gray-500 mb-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Mezzi</span>
                                <strong className="text-base text-gray-800">{formatCurrency(analisi.costiAttrezzatura)}</strong>
                            </div>
                        </div>

                        <div className="w-full bg-gray-100 rounded-full h-3 mt-6 flex overflow-hidden">
                            <div className="bg-orange-500 h-3" style={{ width: `${analisi.totaleCostiDiretti > 0 ? (analisi.costiMateriali/analisi.totaleCostiDiretti)*100 : 0}%` }}></div>
                            <div className="bg-teal-500 h-3" style={{ width: `${analisi.totaleCostiDiretti > 0 ? (analisi.costiSubappalti/analisi.totaleCostiDiretti)*100 : 0}%` }}></div>
                            <div className="bg-blue-500 h-3" style={{ width: `${analisi.totaleCostiDiretti > 0 ? (analisi.costiManodopera/analisi.totaleCostiDiretti)*100 : 0}%` }}></div>
                            <div className="bg-yellow-500 h-3" style={{ width: `${analisi.totaleCostiDiretti > 0 ? (analisi.costiNoleggi/analisi.totaleCostiDiretti)*100 : 0}%` }}></div>
                            <div className="bg-purple-500 h-3" style={{ width: `${analisi.totaleCostiDiretti > 0 ? (analisi.costiAttrezzatura/analisi.totaleCostiDiretti)*100 : 0}%` }}></div>
                        </div>
                    </div>

                    <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col h-[300px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800 text-sm">
                                {activeFilter ? getFilterLabel(activeFilter) : 'Tutti i Movimenti'}
                            </h3>
                            {activeFilter && (
                                <button onClick={() => setActiveFilter(null)} className="text-xs text-indigo-600 flex items-center hover:underline bg-indigo-50 px-2 py-1 rounded">
                                    <XMarkIcon className="h-3 w-3 mr-1"/> Reset
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                            {movimentiFiltrati.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-10">Nessun movimento trovato in questo periodo.</p>
                            ) : (
                                [...movimentiFiltrati].sort((a,b) => new Date(b.data) - new Date(a.data)).map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100 text-xs hover:bg-white hover:shadow-sm transition-all">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <p className="font-medium text-gray-800 truncate" title={item.descrizione}>{item.descrizione}</p>
                                            <p className="text-[10px] text-gray-500">
                                                {new Date(item.data).toLocaleDateString()} • {item.tipo}
                                                {isAzienda && item.cantiereNome && <span className="text-indigo-600 font-medium"> • 🏢 {item.cantiereNome}</span>}
                                            </p>
                                        </div>
                                        <div className={`font-bold whitespace-nowrap ${item.category === 'ricavi' ? 'text-green-600' : 'text-red-600'}`}>
                                            {item.category === 'ricavi' ? '+' : '-'}{formatCurrency(item.importo)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};