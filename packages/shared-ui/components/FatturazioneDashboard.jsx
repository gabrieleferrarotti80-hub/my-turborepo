import React, { useMemo, useState, useEffect } from 'react';
import { 
    DocumentTextIcon, CheckCircleIcon, ExclamationCircleIcon, 
    ClockIcon, PencilIcon, TrashIcon, PlusIcon,
    ArrowTrendingUpIcon, XMarkIcon, BellAlertIcon, BanknotesIcon,
    FunnelIcon, BuildingOfficeIcon, UserIcon
} from '@heroicons/react/24/outline';

const formatCurrency = (amount) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);

// 🌟 SUPER-PARSER PER NUMERI (Accetta sia punti che virgole)
const parseAmount = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const num = parseFloat(String(val).replace(',', '.').replace(/[^\d.-]/g, ''));
    return isNaN(num) ? 0 : num;
};

// 🌟 MATCHER INFALLIBILE (Cerca sia per ID che per Nome esatto)
const matchesCantiere = (fattura, cantiereId, nomeCantiere) => {
    if (fattura.cantiereId === cantiereId) return true;
    if (fattura.riferimentoLavori && nomeCantiere && fattura.riferimentoLavori.trim().toLowerCase() === nomeCantiere.trim().toLowerCase()) return true;
    return false;
};

export const FatturazioneDashboard = ({ 
    fatture = [], cantieriDaFatturare = [], clienti = [], 
    onEditFattura, onDeleteFattura, onCreateFattura, isLoading 
}) => {
    const [filtroStato, setFiltroStato] = useState('Tutte'); 
    const [filtroCliente, setFiltroCliente] = useState('');
    const [filtroCantiere, setFiltroCantiere] = useState('');

    const getNomeCliente = (f) => {
        if (f.clienteId) {
            const match = clienti.find(c => c.id === f.clienteId);
            if (match) return match.ragioneSociale || match.nome || match.nomeCliente || 'Senza Nome';
        }
        return f.ragioneSocialeCliente || f.nomeCliente || f.cliente || 'Cliente Sconosciuto';
    };

    const clientiUnici = useMemo(() => {
        const map = new Map();
        fatture.forEach(f => {
            const nome = getNomeCliente(f);
            const id = f.clienteId || nome; 
            if (nome && nome !== 'Senza Nome') map.set(id, nome);
        });
        return Array.from(map.entries()).map(([id, nome]) => ({ id, nome })).sort((a,b) => a.nome.localeCompare(b.nome));
    }, [fatture, clienti]);

    const cantieriUnici = useMemo(() => {
        const map = new Map();
        fatture.forEach(f => {
            const nome = f.riferimentoLavori || `Cantiere #${(f.cantiereId||'').substring(0,5)}`;
            const id = f.cantiereId || nome;
            if (f.cantiereId || f.riferimentoLavori) map.set(id, nome);
        });
        return Array.from(map.entries()).map(([id, nome]) => ({ id, nome })).sort((a,b) => a.nome.localeCompare(b.nome));
    }, [fatture]);

    const stats = useMemo(() => {
        let totaleFatturato = 0, totaleIncassato = 0, totalePendente = 0, totaleScaduto = 0;
        const today = new Date(); today.setHours(0,0,0,0);

        const fattureConStatoReale = fatture.map(f => {
            const importo = parseAmount(f.totaleDocumento);
            const scadenza = f.scadenzaPagamento ? new Date(f.scadenzaPagamento) : null;
            let statoEffettivo = f.stato;

            if (f.stato !== 'Pagata' && f.stato !== 'Annullata' && scadenza && scadenza < today) {
                statoEffettivo = 'Scaduta';
                totaleScaduto += importo;
            }

            totaleFatturato += importo;
            if (f.stato === 'Pagata') totaleIncassato += importo;
            else if (f.stato !== 'Annullata') totalePendente += importo;

            return { ...f, statoFiltro: statoEffettivo, nomeClienteEstratto: getNomeCliente(f) };
        });

        return { totaleFatturato, totaleIncassato, totalePendente, totaleScaduto, fattureProcessate: fattureConStatoReale };
    }, [fatture, clienti]);

    const fattureVisualizzate = useMemo(() => {
        let filtered = stats.fattureProcessate;
        if (filtroStato !== 'Tutte') {
            if (filtroStato === 'Pendente') filtered = filtered.filter(f => f.statoFiltro !== 'Pagata' && f.statoFiltro !== 'Annullata');
            else filtered = filtered.filter(f => f.statoFiltro === filtroStato);
        }
        if (filtroCliente) {
            filtered = filtered.filter(f => f.clienteId === filtroCliente || f.nomeClienteEstratto === filtroCliente);
        }
        if (filtroCantiere) {
            filtered = filtered.filter(f => f.cantiereId === filtroCantiere || f.riferimentoLavori === filtroCantiere);
        }
        return filtered;
    }, [filtroStato, filtroCliente, filtroCantiere, stats.fattureProcessate]);

    const totaliFiltrati = useMemo(() => {
        return fattureVisualizzate.reduce((acc, f) => {
            return { imponibile: acc.imponibile + parseAmount(f.imponibile), totaleDocumento: acc.totaleDocumento + parseAmount(f.totaleDocumento) };
        }, { imponibile: 0, totaleDocumento: 0 });
    }, [fattureVisualizzate]);

    // 🌟 PENDENZE BLINDATE (Usa il nuovo Matcher e il Parse sicuro)
    const pendenzeDaFatturare = useMemo(() => {
        return cantieriDaFatturare.map(cantiere => {
            const appalto = parseAmount(cantiere.valoreAppalto);
            const fatturato = fatture
                .filter(f => matchesCantiere(f, cantiere.id, cantiere.nomeCantiere) && (f.stato || '').toLowerCase() !== 'annullata')
                .reduce((acc, f) => acc + parseAmount(f.imponibile), 0);
            
            const rimanente = Math.max(0, appalto - fatturato);
            return { ...cantiere, appalto, totaleFatturato: fatturato, rimanente };
        }).filter(c => c.rimanente > 0.5);
    }, [cantieriDaFatturare, fatture]);

    const generaProssimoNumeroFattura = () => {
        const annoCorrente = new Date().getFullYear();
        const fattureAnno = fatture.filter(f => f.dataEmissione && f.numeroFattura && new Date(f.dataEmissione).getFullYear() === annoCorrente);
        if (fattureAnno.length === 0) return "1"; 
        let maxNum = 0;
        fattureAnno.forEach(f => {
            const match = String(f.numeroFattura).match(/\d+/);
            if (match) { const num = parseInt(match[0], 10); if (num > maxNum) maxNum = num; }
        });
        return String(maxNum + 1);
    };

    const generaDraftFattura = (cantiereInfo) => {
        const rim = parseAmount(cantiereInfo.rimanente || cantiereInfo.valoreAppalto);
        return {
            numeroFattura: generaProssimoNumeroFattura(),
            cantiereId: cantiereInfo.id, clienteId: cantiereInfo.clienteId || '',
            ragioneSocialeCliente: cantiereInfo.nomeCliente || cantiereInfo.cliente || '',
            riferimentoLavori: cantiereInfo.nomeCantiere || '',
            imponibile: rim, aliquotaIva: 22, importoIva: rim * 0.22,
            totaleDocumento: rim * 1.22, totaleNettoDaPagare: rim * 1.22,
            metodoPagamento: 'Bonifico Bancario', stato: 'Bozza', dataEmissione: new Date().toISOString().split('T')[0],
            note: 'Fattura a saldo per completamento lavori.',
            righe: [{ descrizione: `Saldo lavori eseguiti - Cantiere: ${cantiereInfo.nomeCantiere || ''}`, quantita: 1, prezzoUnitario: rim, totaleRiga: rim }]
        };
    };

    useEffect(() => {
        const pendingStr = localStorage.getItem('pendingChiusuraCantiere');
        if (pendingStr && !isLoading) {
            try {
                const pendingData = JSON.parse(pendingStr);
                localStorage.removeItem('pendingChiusuraCantiere');
                setTimeout(() => onCreateFattura(generaDraftFattura(pendingData)), 300);
            } catch (e) { console.error(e); }
        }
    }, [isLoading, onCreateFattura]);

    const isFiltriAttivi = filtroStato !== 'Tutte' || filtroCliente !== '' || filtroCantiere !== '';

    if (isLoading) return <div className="p-8 text-center text-gray-500 animate-pulse">Caricamento cruscotto...</div>;
    const cardClass = (tipo) => `relative p-5 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden ${filtroStato === tipo ? 'ring-2 ring-offset-2 scale-[1.02] shadow-md' : 'hover:shadow-sm hover:border-gray-300'}`;

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Fatturazione Vendita</h1>
                    <p className="text-gray-500 mt-1">Gestione ciclo attivo, incassi e fatturazione cantieri terminati.</p>
                </div>
                <button onClick={() => onCreateFattura()} className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all">
                    <PlusIcon className="h-5 w-5"/> Nuova Fattura Libera
                </button>
            </div>

            {pendenzeDaFatturare.length > 0 && (
                <div className="mb-8 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 text-orange-200 opacity-50 pointer-events-none"><BanknotesIcon className="h-48 w-48"/></div>
                    <h2 className="text-xl font-black text-orange-900 flex items-center gap-2 mb-6 relative z-10"><BellAlertIcon className="h-6 w-6 animate-bounce text-orange-500" />Hai {pendenzeDaFatturare.length} {pendenzeDaFatturare.length === 1 ? 'Pendenza di Fatturazione' : 'Pendenze di Fatturazione'} da Sistemare!</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                        {pendenzeDaFatturare.map(cantiere => (
                            <div key={cantiere.id} className="bg-white p-5 rounded-2xl border border-orange-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div>
                                    <div className="flex justify-between items-start mb-2"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[60%]">{cantiere.nomeCliente || cantiere.cliente}</p><span className="bg-red-100 text-red-800 text-[10px] font-black px-2 py-0.5 rounded-full">DA FATTURARE</span></div>
                                    <p className="font-black text-gray-900 text-lg leading-tight mb-3">{cantiere.nomeCantiere}</p>
                                    <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100 space-y-2 mb-4">
                                        <div className="flex justify-between items-center text-xs"><span className="text-gray-500 font-bold uppercase tracking-wider">Valore Appalto:</span><span className="font-black text-gray-700">{formatCurrency(cantiere.appalto)}</span></div>
                                        <div className="flex justify-between items-center text-xs"><span className="text-gray-500 font-bold uppercase tracking-wider">Già Fatturato:</span><span className="font-black text-indigo-600">{formatCurrency(cantiere.totaleFatturato)}</span></div>
                                        <div className="w-full h-px bg-orange-200"></div>
                                        <div className="flex justify-between items-center"><span className="text-[11px] text-red-600 font-bold uppercase tracking-wider">Rimanente:</span><span className="font-black text-red-600 text-base">{formatCurrency(cantiere.rimanente)}</span></div>
                                    </div>
                                </div>
                                <button onClick={() => onCreateFattura(generaDraftFattura(cantiere))} className="mt-2 w-full py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition-colors flex justify-center items-center gap-2 shadow-sm">
                                    <BanknotesIcon className="h-5 w-5"/> Emetti Fattura a Saldo
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div onClick={() => setFiltroStato('Tutte')} className={`${cardClass('Tutte')} ${filtroStato === 'Tutte' ? 'bg-blue-50 border-blue-200 ring-blue-500' : 'bg-white border-gray-100'}`}><div className="flex items-center gap-4"><div className={`p-3 rounded-xl ${filtroStato === 'Tutte' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}><DocumentTextIcon className="h-6 w-6"/></div><div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Totale Emesso</p><p className="text-xl font-black text-gray-900">{formatCurrency(stats.totaleFatturato)}</p></div></div></div>
                <div onClick={() => setFiltroStato('Pagata')} className={`${cardClass('Pagata')} ${filtroStato === 'Pagata' ? 'bg-green-50 border-green-200 ring-green-500' : 'bg-white border-gray-100'}`}><div className="flex items-center gap-4"><div className={`p-3 rounded-xl ${filtroStato === 'Pagata' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600'}`}><CheckCircleIcon className="h-6 w-6"/></div><div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Incassato</p><p className="text-xl font-black text-green-700">{formatCurrency(stats.totaleIncassato)}</p></div></div></div>
                <div onClick={() => setFiltroStato('Pendente')} className={`${cardClass('Pendente')} ${filtroStato === 'Pendente' ? 'bg-orange-50 border-orange-200 ring-orange-500' : 'bg-white border-gray-100'}`}><div className="flex items-center gap-4"><div className={`p-3 rounded-xl ${filtroStato === 'Pendente' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-600'}`}><ClockIcon className="h-6 w-6"/></div><div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">In Attesa</p><p className="text-xl font-black text-orange-700">{formatCurrency(stats.totalePendente)}</p></div></div></div>
                <div onClick={() => setFiltroStato('Scaduta')} className={`${cardClass('Scaduta')} ${filtroStato === 'Scaduta' ? 'bg-red-50 border-red-200 ring-red-500' : 'bg-white border-gray-100'}`}><div className="flex items-center gap-4"><div className={`p-3 rounded-xl ${filtroStato === 'Scaduta' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}><ExclamationCircleIcon className="h-6 w-6"/></div><div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Scaduto</p><p className="text-xl font-black text-red-700">{formatCurrency(stats.totaleScaduto)}</p></div></div></div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-indigo-50/50 p-6 border-b border-gray-200">
                    <div className="flex flex-col xl:flex-row justify-between gap-6 items-end">
                        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-800 uppercase tracking-wider mb-2"><UserIcon className="h-3.5 w-3.5" /> Filtra per Cliente</label>
                                <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} className="w-full rounded-xl border-indigo-200 bg-white shadow-sm focus:ring-indigo-500 font-medium text-sm text-gray-800">
                                    <option value="">-- Tutti i Clienti --</option>
                                    {clientiUnici.map((cliente, idx) => <option key={idx} value={cliente.id}>{cliente.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-800 uppercase tracking-wider mb-2"><BuildingOfficeIcon className="h-3.5 w-3.5" /> Filtra per Cantiere</label>
                                <select value={filtroCantiere} onChange={(e) => setFiltroCantiere(e.target.value)} className="w-full rounded-xl border-indigo-200 bg-white shadow-sm focus:ring-indigo-500 font-medium text-sm text-gray-800">
                                    <option value="">-- Tutti i Cantieri --</option>
                                    {cantieriUnici.map((cantiere, idx) => <option key={idx} value={cantiere.id}>{cantiere.nome}</option>)}
                                </select>
                            </div>
                        </div>

                        {isFiltriAttivi && (
                            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-indigo-100 shadow-sm shrink-0">
                                <div><p className="text-[10px] uppercase font-bold text-gray-400">Imponibile Filtrato</p><p className="text-lg font-black text-gray-700">{formatCurrency(totaliFiltrati.imponibile)}</p></div>
                                <div className="h-10 w-px bg-gray-200"></div>
                                <div><p className="text-[10px] uppercase font-bold text-indigo-400">Totale Filtrato (Ivato)</p><p className="text-xl font-black text-indigo-700">{formatCurrency(totaliFiltrati.totaleDocumento)}</p></div>
                                <button onClick={() => { setFiltroStato('Tutte'); setFiltroCliente(''); setFiltroCantiere(''); }} className="ml-2 p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"><XMarkIcon className="h-5 w-5" /></button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-white">
                    <FunnelIcon className="h-5 w-5 text-indigo-500"/>
                    <h3 className="font-bold text-gray-800">
                        {filtroStato === 'Tutte' ? 'Risultati di Ricerca' : `Risultati (Stato: ${filtroStato})`}
                        <span className="ml-2 text-sm font-normal text-gray-500">({fattureVisualizzate.length} documenti trovati)</span>
                    </h3>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                        <thead className="bg-gray-50/50 text-xs font-bold text-gray-500 uppercase tracking-wider"><tr><th className="px-6 py-4">Data / Numero</th><th className="px-6 py-4">Cliente</th><th className="px-6 py-4 text-right">Imponibile</th><th className="px-6 py-4 text-right">Totale</th><th className="px-6 py-4 text-center">Stato</th><th className="px-6 py-4"></th></tr></thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {fattureVisualizzate.length === 0 ? <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-400 italic">Nessun documento trovato.</td></tr> : fattureVisualizzate.map((fatt) => (
                                <tr key={fatt.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4"><div className="font-bold text-gray-900">{fatt.numeroFattura || 'Bozza'}</div><div className="text-xs text-gray-500">{new Date(fatt.dataEmissione).toLocaleDateString('it-IT')}</div></td>
                                    <td className="px-6 py-4"><div className="font-semibold text-indigo-700">{fatt.nomeClienteEstratto}</div><div className="text-[10px] text-gray-400 truncate max-w-[200px]">{fatt.riferimentoLavori || 'Nessun riferimento'}</div></td>
                                    <td className="px-6 py-4 text-right font-medium text-gray-600">{formatCurrency(parseAmount(fatt.imponibile))}</td>
                                    <td className="px-6 py-4 text-right"><div className="font-extrabold text-gray-900">{formatCurrency(parseAmount(fatt.totaleDocumento))}</div></td>
                                    <td className="px-6 py-4 text-center"><span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${fatt.stato === 'Pagata' ? 'bg-green-100 text-green-700' : fatt.statoFiltro === 'Scaduta' ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-yellow-100 text-yellow-800'}`}>{fatt.stato}</span></td>
                                    <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => onEditFattura(fatt)} className="p-2 bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 rounded-lg shadow-sm"><PencilIcon className="h-4 w-4"/></button><button onClick={() => onDeleteFattura(fatt.id)} className="p-2 bg-white border border-gray-200 text-gray-500 hover:text-red-600 rounded-lg shadow-sm"><TrashIcon className="h-4 w-4"/></button></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};