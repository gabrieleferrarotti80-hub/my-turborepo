import React, { useMemo, useState } from 'react';
import { useFirebaseData } from 'shared-core';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 
import { 
    BanknotesIcon, CurrencyDollarIcon, DocumentTextIcon, BuildingOfficeIcon,
    ClockIcon, UsersIcon, ShoppingBagIcon, EnvelopeOpenIcon,
    ClipboardDocumentCheckIcon, TruckIcon, WrenchScrewdriverIcon,
    IdentificationIcon, ChartPieIcon, UserMinusIcon, UserIcon,
    MegaphoneIcon, PlusIcon, XMarkIcon, BellAlertIcon
} from '@heroicons/react/24/solid';

const corsiMonitorati = [
    { id: 'sicurezza_lavoratori', label: 'Sicurezza 81/08' },
    { id: 'primo_soccorso_antincendio', label: '1° Soccorso/Antin.' },
    { id: 'manutentore_verde', label: 'Manut. Verde' },
    { id: 'attrezzature_art_73', label: 'Art. 73' },
    { id: 'mmt', label: 'MMT' },
    { id: 'scale_aeree', label: 'Scale Aeree' },
    { id: 'lavori_quota_dpi3', label: 'Quota/DPI 3 Cat.' },
    { id: 'tree_climbing', label: 'Tree Climbing' }
];

const mesiNomi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

// 🌟 SUPER-PARSER E MATCHER RIPORTATI ANCHE QUI
const parseAmount = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const num = parseFloat(String(val).replace(',', '.').replace(/[^\d.-]/g, ''));
    return isNaN(num) ? 0 : num;
};

const matchesCantiere = (fattura, cantiereId, nomeCantiere) => {
    if (fattura.cantiereId === cantiereId) return true;
    if (fattura.riferimentoLavori && nomeCantiere && fattura.riferimentoLavori.trim().toLowerCase() === nomeCantiere.trim().toLowerCase()) return true;
    return false;
};

const DashboardWidget = ({ title, icon, children, className = '', headerRight }) => (
    <div className={`bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden flex flex-col ${className}`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">{icon}<h3 className="text-lg font-bold text-slate-800">{title}</h3></div>
            {headerRight && <div>{headerRight}</div>}
        </div>
        <div className="p-5 space-y-4 flex-1">{children}</div>
    </div>
);

const ActionItem = ({ count, label, colorClass, linkLabel, onNavigate, subLabel }) => (
    <div className={`flex flex-col justify-between p-4 rounded-xl border ${colorClass} hover:shadow-md transition-shadow`}>
        <div className="flex justify-between items-start mb-2">
            <div>
                <div className="text-3xl font-black">{count}</div>
                <div className="text-sm font-bold uppercase tracking-wider mt-1 opacity-90">{label}</div>
                {subLabel && <div className="text-xs font-semibold mt-1 opacity-75">{subLabel}</div>}
            </div>
        </div>
        {onNavigate && count > 0 && <button onClick={onNavigate} className="mt-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-colors w-full text-center">{linkLabel}</button>}
    </div>
);

const QuickLink = ({ title, icon, onNavigate, subtitle }) => (
    <button onClick={onNavigate} className="flex items-center w-full p-4 bg-white border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 hover:shadow-md transition-all text-left group">
        <div className="p-3 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">{icon}</div>
        <div className="ml-4">
            <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-900">{title}</div>
            {subtitle && <div className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</div>}
        </div>
    </button>
);

const ScadenzeList = ({ scadenze, emptyMessage, onNavigate }) => {
    if (scadenze.length === 0) return <div className="text-center py-4"><p className="text-slate-400 font-medium text-sm">{emptyMessage}</p></div>;
    return (
        <div className="overflow-y-auto max-h-[250px] pr-2 scrollbar-thin scrollbar-thumb-slate-300">
            <div className="space-y-3">
                {scadenze.map(avviso => (
                    <div key={avviso.id} className={`flex items-center justify-between p-3 rounded-xl border ${avviso.isScaduto ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'} shadow-sm hover:shadow-md transition-shadow`}>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${avviso.isScaduto ? 'bg-red-200 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{avviso.isScaduto ? 'SCADUTO' : avviso.data.toLocaleDateString('it-IT')}</span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{avviso.tipo}</span>
                            </div>
                            <div className="font-bold text-slate-900 leading-tight">{avviso.soggetto}</div>
                        </div>
                        <button onClick={() => onNavigate(avviso.navTo)} className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors ml-2 ${avviso.isScaduto ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Vedi</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const parseDateRobust = (val) => {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    if (typeof val.toDate === 'function') return val.toDate();
    if (val.seconds) return new Date(val.seconds * 1000);
    if (typeof val === 'string') {
        if (val.includes('/')) { const parts = val.split('/'); if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]); }
        const parsed = new Date(val);
        if (!isNaN(parsed.getTime())) return parsed;
    }
    return null;
};

const formatCurrency = (amount) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);

export const DashboardAmministrazione = ({ onNavigate }) => {
    const { data, user, db, userAziendaId } = useFirebaseData();
    const [isBachecaModalOpen, setIsBachecaModalOpen] = useState(false);
    const [nuovoAvviso, setNuovoAvviso] = useState({ titolo: '', messaggio: '' });
    const [isPublishing, setIsPublishing] = useState(false);

    const stats = useMemo(() => {
        const today = new Date(); today.setHours(0,0,0,0);
        const thirtyDaysFromNow = new Date(today); thirtyDaysFromNow.setDate(today.getDate() + 30);

        // 🌟 PENDENZE BLINDATE
        const pendenzeDaFatturare = (data.cantieri || [])
            .filter(c => c.stato === 'completato' || c.stato === 'da_fatturare' || c.stato === 'chiuso')
            .map(cantiere => {
                const appalto = parseAmount(cantiere.valoreAppalto);
                const fatturato = (data.fatture || [])
                    .filter(f => matchesCantiere(f, cantiere.id, cantiere.nomeCantiere) && (f.stato || '').toLowerCase() !== 'annullata')
                    .reduce((acc, f) => acc + parseAmount(f.imponibile), 0);
                
                const rimanente = Math.max(0, appalto - fatturato);
                return { ...cantiere, appalto, totaleFatturato: fatturato, rimanente };
            }).filter(cantiere => cantiere.rimanente > 0.5);

        let creditiScadutiTot = 0, creditiScadutiCount = 0, entrate30gg = 0;
        (data.fatture || []).forEach(f => {
            if (f.stato !== 'Pagata' && f.stato !== 'Annullata') {
                const scad = parseDateRobust(f.scadenzaPagamento);
                if (scad) {
                    if (scad <= thirtyDaysFromNow) entrate30gg += parseAmount(f.totaleDocumento);
                    if (scad < today) { creditiScadutiCount++; creditiScadutiTot += parseAmount(f.totaleDocumento); }
                }
            }
        });

        let debitiDaPagareTot = 0, debitiDaPagareCount = 0, debitiScadutiTot = 0, debitiScadutiCount = 0, uscite30gg = 0;
        (data.fatture_acquisto || []).forEach(f => {
            const stato = (f.stato || '').toLowerCase().trim();
            if (stato !== 'pagata' && stato !== 'annullata') {
                const importo = parseAmount(f.importoTotale || f.totaleDocumento || f.totale || f.importo);
                debitiDaPagareCount++; debitiDaPagareTot += importo;
                const scad = parseDateRobust(f.scadenzaPagamento || f.dataScadenza);
                if (scad) {
                    if (scad <= thirtyDaysFromNow) uscite30gg += importo;
                    if (scad < today) { debitiScadutiCount++; debitiScadutiTot += importo; }
                }
            }
        });

        const cashflowNetto = entrate30gg - uscite30gg;
        
        // ... (resto del codice per HR, RDO, scadenze passive immutato per non dilungarci) ...
        const getNomeAzienda = (f) => {
            const targetId = f.fornitoreId || f.aziendaId || f.subappaltatoreId || f.noleggiatoreId;
            if (targetId) {
                const match = (data.fornitori || []).find(x => x.id === targetId) || (data.subappaltatori || []).find(x => x.id === targetId) || (data.noleggiatori || []).find(x => x.id === targetId);
                if (match) return match.ragioneSociale || match.nome || match.subappaltatoreNome || match.noleggiatoreNome || match.nomeAzienda;
            }
            return f.fornitoreNome || f.fornitore || f.ragioneSociale || f.subappaltatoreNome || f.noleggiatoreNome || f.nomeAzienda || 'Sconosciuto';
        };

        const prossimeScadenze = (data.fatture_acquisto || [])
            .filter(f => (f.stato || '').toLowerCase().trim() !== 'pagata' && (f.stato || '').toLowerCase().trim() !== 'annullata')
            .map(f => ({ ...f, nomeAziendaEstratto: getNomeAzienda(f), importo: parseAmount(f.importoTotale || f.totaleDocumento || f.totale || f.importo), scadenzaParsata: parseDateRobust(f.scadenzaPagamento || f.dataScadenza) }))
            .filter(f => f.scadenzaParsata !== null).sort((a, b) => a.scadenzaParsata - b.scadenzaParsata).slice(0, 5);

        const scadenzeHR = [], scadenzeSubappalti = [], scadenzeNoliFlotta = [];
        const currentDay = new Date().getDate(); const currentMonthIndex = new Date().getMonth(); const currentYear = new Date().getFullYear();
        let requireLulCheck = currentDay > 10; let prevMonthIndex = currentMonthIndex - 1; let yearForBusta = currentYear;
        if (prevMonthIndex < 0) { prevMonthIndex = 11; yearForBusta--; }
        const nomeMeseTargetLul = mesiNomi[prevMonthIndex];

        (data.users || []).forEach(u => {
            if (u.attivo === false) return; 
            const nome = `${u.nome || ''} ${u.cognome || ''}`.trim() || u.email || 'Utente';
            if (requireLulCheck && u.ruolo !== 'proprietario' && u.ruolo !== 'super-admin') {
                const hasBusta = (u.bustePaga || []).some(b => b.mese === nomeMeseTargetLul && Number(b.anno) === yearForBusta);
                if (!hasBusta) scadenzeHR.push({ id: `busta_${u.id}`, tipo: `Manca LUL ${nomeMeseTargetLul}`, soggetto: nome, data: new Date(), isScaduto: true, navTo: 'personale' });
            }
            const scadContratto = parseDateRobust(u.scadenzaContratto || u.dataScadenzaContratto);
            if (scadContratto && scadContratto <= thirtyDaysFromNow) scadenzeHR.push({ id: `contr_${u.id}`, tipo: 'Contratto', soggetto: nome, data: scadContratto, isScaduto: scadContratto < today, navTo: 'personale' });
            const scadVisita = parseDateRobust(u.scadenzaVisitaMedica || u.documentiPersonali?.scadenze?.visitaMedica);
            if (scadVisita && scadVisita <= thirtyDaysFromNow) scadenzeHR.push({ id: `visita_${u.id}`, tipo: 'Visita Medica', soggetto: nome, data: scadVisita, isScaduto: scadVisita < today, navTo: 'personale' });
        });
        scadenzeHR.sort((a, b) => a.data - b.data);

        const assenzeOggi = [];
        (data.richieste_ferie || []).forEach(req => {
            const stato = (req.stato || '').toLowerCase();
            if (stato === 'approvata' || stato === 'approvato') {
                const dataInizio = parseDateRobust(req.dataInizio || req.start); const dataFine = parseDateRobust(req.dataFine || req.end);
                if (dataInizio && dataFine) {
                    const endOfDay = new Date(dataFine); endOfDay.setHours(23, 59, 59, 999);
                    if (today >= dataInizio && today <= endOfDay) assenzeOggi.push({ nome: req.nomeUtente || req.utenteNome || 'Utente', tipo: req.tipo || 'Assenza' });
                }
            }
        });

        let rdoInAttesa = 0, rdoDaValutare = 0;
        (data.preventivi_fornitori || data.richieste_offerta || []).forEach(rdo => {
            const statoRdo = (rdo.stato || '').toLowerCase().trim();
            if (['in_attesa', 'inviata', 'bozza'].includes(statoRdo)) rdoInAttesa++;
            else if (['risposto', 'ricevuta', 'da_valutare'].includes(statoRdo)) rdoDaValutare++;
        });

        const messaggiBacheca = (data.notifiche || data.note_operative || data.noteOperative || []).filter(n => n.globale === true || n.isBroadcast === true || n.tipo === 'bacheca' || n.tipo === 'circolare').sort((a, b) => (parseDateRobust(b.createdAt || b.data)?.getTime() || 0) - (parseDateRobust(a.createdAt || a.data)?.getTime() || 0)).slice(0, 4);

        return { 
            pendenzeDaFatturare, cantieriDaFatturareCount: pendenzeDaFatturare.length,
            creditiScadutiTot, creditiScadutiCount, debitiDaPagareTot, debitiDaPagareCount,
            debitiScadutiTot, debitiScadutiCount, entrate30gg, uscite30gg, cashflowNetto,
            prossimeScadenze, scadenzeHR, scadenzeSubappalti, scadenzeNoliFlotta, assenzeOggi,
            rdoInAttesa, rdoDaValutare, messaggiBacheca
        };
    }, [data]);

    const handleAutocompilaFattura = (cantiere) => {
        localStorage.setItem('pendingChiusuraCantiere', JSON.stringify({
            id: cantiere.id,
            clienteId: cantiere.clienteId,
            cliente: cantiere.cliente || cantiere.nomeCliente || '',
            nomeCantiere: cantiere.nomeCantiere,
            valoreAppalto: cantiere.appalto, 
            rimanente: cantiere.rimanente
        }));
        onNavigate('fatturazione');
    };

    const handlePubblicaAvviso = async () => {
        if (!nuovoAvviso.titolo.trim() || !nuovoAvviso.messaggio.trim()) return alert("Compila tutti i campi");
        setIsPublishing(true);
        try {
            await addDoc(collection(db, 'notifiche'), { titolo: nuovoAvviso.titolo, messaggio: nuovoAvviso.messaggio, tipo: 'bacheca', globale: true, companyID: user?.companyID || userAziendaId, autore: user?.nome ? `${user.nome} ${user.cognome}` : 'Amministrazione', createdAt: serverTimestamp(), data: new Date().toISOString() });
            setIsBachecaModalOpen(false); setNuovoAvviso({ titolo: '', messaggio: '' });
        } catch (error) { alert("Errore"); } finally { setIsPublishing(false); }
    };

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-full animate-fade-in relative">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Amministrazione e Finanza</h1>
                <p className="text-lg text-slate-500 mt-1 font-medium">Bentornata. Ecco la situazione contabile e burocratica.</p>
            </div>

            {stats.pendenzeDaFatturare.length > 0 && (
                <div className="mb-8 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 text-orange-200 opacity-50 pointer-events-none"><BanknotesIcon className="h-48 w-48"/></div>
                    <h2 className="text-xl font-black text-orange-900 flex items-center gap-2 mb-6 relative z-10"><BellAlertIcon className="h-6 w-6 animate-bounce text-orange-500" />Hai {stats.pendenzeDaFatturare.length} {stats.pendenzeDaFatturare.length === 1 ? 'Pendenza di Fatturazione' : 'Pendenze di Fatturazione'} da Sistemare!</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                        {stats.pendenzeDaFatturare.map(cantiere => (
                            <div key={cantiere.id} className="bg-white p-5 rounded-2xl border border-orange-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleAutocompilaFattura(cantiere)}>
                                <div>
                                    <div className="flex justify-between items-start mb-2"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[60%]">{cantiere.cliente || cantiere.nomeCliente || 'Senza Cliente'}</p><span className="bg-red-100 text-red-800 text-[10px] font-black px-2 py-0.5 rounded-full">DA FATTURARE</span></div>
                                    <p className="font-black text-gray-900 text-lg leading-tight mb-3">{cantiere.nomeCantiere}</p>
                                    <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100 space-y-2 mb-4">
                                        <div className="flex justify-between items-center text-xs"><span className="text-gray-500 font-bold uppercase tracking-wider">Valore Appalto:</span><span className="font-black text-gray-700">{formatCurrency(cantiere.appalto)}</span></div>
                                        <div className="flex justify-between items-center text-xs"><span className="text-gray-500 font-bold uppercase tracking-wider">Già Fatturato:</span><span className="font-black text-indigo-600">{formatCurrency(cantiere.totaleFatturato)}</span></div>
                                        <div className="w-full h-px bg-orange-200"></div>
                                        <div className="flex justify-between items-center"><span className="text-[11px] text-red-600 font-bold uppercase tracking-wider">Rimanente:</span><span className="font-black text-red-600 text-base">{formatCurrency(cantiere.rimanente)}</span></div>
                                    </div>
                                </div>
                                <button className="mt-2 w-full py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition-colors flex justify-center items-center gap-2 shadow-sm">
                                    <BanknotesIcon className="h-5 w-5"/> Vai ed Emetti Fattura
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <ActionItem count={stats.cantieriDaFatturareCount} label="Da Fatturare" subLabel="Cantieri conclusi senza fattura" colorClass={stats.cantieriDaFatturareCount > 0 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-slate-200 text-slate-500"} linkLabel="Emetti Fatture" onNavigate={() => onNavigate('fatturazione')} />
                <ActionItem count={stats.creditiScadutiCount} label="Crediti Scaduti" subLabel={formatCurrency(stats.creditiScadutiTot)} colorClass={stats.creditiScadutiCount > 0 ? "bg-amber-500 text-white shadow-lg shadow-amber-200" : "bg-emerald-500 text-white"} linkLabel="Vedi Fatture Clienti" onNavigate={() => onNavigate('fatturazione')} />
                <ActionItem count={stats.debitiDaPagareCount} label="Fatture in Attesa" subLabel={`Da pagare: ${formatCurrency(stats.debitiDaPagareTot)}`} colorClass="bg-blue-600 text-white shadow-lg shadow-blue-200" linkLabel="Vai allo Scadenzario" onNavigate={() => onNavigate('acquisti')} />
                <ActionItem count={stats.debitiScadutiCount} label="Debiti Scaduti" subLabel={`Urgenti: ${formatCurrency(stats.debitiScadutiTot)}`} colorClass={stats.debitiScadutiCount > 0 ? "bg-red-600 text-white shadow-lg shadow-red-200 animate-pulse" : "bg-slate-200 text-slate-500"} linkLabel="Paga Ora" onNavigate={() => onNavigate('acquisti')} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DashboardWidget title="Scadenze Dipendenti e HR" icon={<IdentificationIcon className="h-6 w-6 text-amber-500" />}><ScadenzeList scadenze={stats.scadenzeHR} emptyMessage="Nessun corso in scadenza." onNavigate={onNavigate} /></DashboardWidget>
                        <DashboardWidget title="Radar Assenze (Oggi)" icon={<UserMinusIcon className="h-6 w-6 text-orange-500" />}>
                            {stats.assenzeOggi.length === 0 ? <div className="text-center py-8"><p className="text-slate-400 font-medium text-sm">Nessuna assenza registrata oggi.</p></div> : (
                                <div className="space-y-3 overflow-y-auto max-h-[250px] pr-2 scrollbar-thin scrollbar-thumb-slate-300">
                                    {stats.assenzeOggi.map((assenza, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-100 rounded-xl shadow-sm"><div className="flex items-center gap-3"><div className="p-2 bg-white rounded-full shadow-sm"><UserIcon className="h-4 w-4 text-orange-500"/></div><div><div className="font-bold text-slate-800 text-sm">{assenza.nome}</div><div className="text-xs text-orange-700 font-bold uppercase tracking-wide">{assenza.tipo}</div></div></div></div>
                                    ))}
                                </div>
                            )}
                        </DashboardWidget>
                    </div>
                    <DashboardWidget title="Prossimi Pagamenti Fornitori" icon={<ClockIcon className="h-6 w-6 text-red-500" />}>
                        {stats.prossimeScadenze.length === 0 ? <div className="text-center py-6"><BanknotesIcon className="h-10 w-10 mx-auto text-slate-300 mb-2" /><p className="text-slate-500 font-medium">Nessuna fattura in attesa.</p></div> : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider"><tr><th className="pb-3">Scadenza</th><th className="pb-3">Fornitore</th><th className="pb-3 text-right">Totale</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {stats.prossimeScadenze.map(fatt => {
                                            const isScaduta = fatt.scadenzaParsata < new Date(new Date().setHours(0,0,0,0));
                                            return (
                                                <tr key={fatt.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="py-3"><span className={`font-bold ${isScaduta ? 'text-red-600' : 'text-slate-900'}`}>{fatt.scadenzaParsata.toLocaleDateString('it-IT')}</span></td>
                                                    <td className="py-3 font-semibold text-indigo-700 truncate max-w-[200px]">{fatt.nomeAziendaEstratto}</td>
                                                    <td className="py-3 text-right font-black text-slate-900">{formatCurrency(fatt.importo)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </DashboardWidget>
                </div>

                <div className="xl:col-span-1 space-y-6">
                    <DashboardWidget title="Previsionale di Cassa (30gg)" icon={<ChartPieIcon className="h-6 w-6 text-indigo-600" />}>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-100"><span className="text-emerald-800 font-bold text-sm">Entrate Previste</span><span className="text-emerald-700 font-black">{formatCurrency(stats.entrate30gg)}</span></div>
                            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100"><span className="text-red-800 font-bold text-sm">Uscite Previste</span><span className="text-red-700 font-black">{formatCurrency(stats.uscite30gg)}</span></div>
                            <div className={`flex justify-between items-center p-3 rounded-xl border-2 ${stats.cashflowNetto >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-orange-50 border-orange-300'}`}><span className="text-slate-800 font-black text-sm">Bilancio Netto</span><span className={`font-black text-lg ${stats.cashflowNetto >= 0 ? 'text-indigo-700' : 'text-orange-600'}`}>{stats.cashflowNetto > 0 ? '+' : ''}{formatCurrency(stats.cashflowNetto)}</span></div>
                        </div>
                    </DashboardWidget>
                    <DashboardWidget title="Stato Approvvigionamenti" icon={<EnvelopeOpenIcon className="h-6 w-6 text-blue-600" />}>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => { localStorage.setItem('rdoFilter', 'in_attesa'); onNavigate('richieste-offerta'); }}><div className="flex items-center gap-3"><div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm"><ClockIcon className="h-5 w-5"/></div><span className="text-sm font-bold text-blue-900">RDO in Attesa</span></div><span className="text-xl font-black text-blue-700">{stats.rdoInAttesa}</span></div>
                            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl cursor-pointer hover:bg-emerald-100 transition-colors" onClick={() => { localStorage.setItem('rdoFilter', 'da_valutare'); onNavigate('richieste-offerta'); }}><div className="flex items-center gap-3"><div className="p-2 bg-white rounded-lg text-emerald-600 shadow-sm"><ClipboardDocumentCheckIcon className="h-5 w-5"/></div><span className="text-sm font-bold text-emerald-900">Da Valutare</span></div><span className="text-xl font-black text-emerald-700">{stats.rdoDaValutare}</span></div>
                        </div>
                    </DashboardWidget>
                </div>
            </div>
        </div>
    );
};