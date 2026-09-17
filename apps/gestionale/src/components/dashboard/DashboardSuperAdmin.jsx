import React, { useMemo } from 'react';
import { useFirebaseData } from 'shared-core';
import { 
    BuildingOfficeIcon, 
    UsersIcon, 
    GlobeAltIcon, 
    SparklesIcon, 
    KeyIcon, 
    TableCellsIcon,
    CpuChipIcon,
    CommandLineIcon,
    SignalIcon,
    ServerStackIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/solid';

const parseDateRobust = (val) => {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    if (typeof val.toDate === 'function') return val.toDate();
    if (val.seconds) return new Date(val.seconds * 1000);
    if (typeof val === 'string') {
        const parsed = new Date(val);
        if (!isNaN(parsed.getTime())) return parsed;
    }
    return null;
};

const getCompanyName = (c) => {
    if (!c) return 'Azienda Sconosciuta';
    return c.ragioneSociale || c.nomeAzienda || c.nome || c.companyName || 'Azienda Senza Nome';
};

const StatItem = ({ label, value, icon, colorClass, subLabel }) => (
    <div className={`flex flex-col justify-center p-5 rounded-2xl border ${colorClass} shadow-sm relative overflow-hidden transition-transform hover:scale-[1.02]`}>
        <div className="absolute right-[-15px] top-[-15px] opacity-10">
            {React.cloneElement(icon, { className: 'h-32 w-32' })}
        </div>
        <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 bg-white/80 rounded-xl shadow-sm backdrop-blur-sm">
                {icon}
            </div>
            <div>
                <div className="text-3xl font-black tracking-tight">{value}</div>
                <div className="text-xs font-bold uppercase tracking-wider opacity-90 mt-1">{label}</div>
                {subLabel && <div className="text-[10px] font-semibold opacity-75 mt-0.5">{subLabel}</div>}
            </div>
        </div>
    </div>
);

export const DashboardSuperAdmin = ({ onNavigate }) => {
    const { data, user } = useFirebaseData(); 

    const stats = useMemo(() => {
        const companies = data.companies || [];
        const users = data.users || [];
        const cantieri = data.cantieri || [];
        const offerte = data.offerte || [];
        const presenze = data.presenze || [];

        const activeCompanies = companies.filter(c => c.attivo !== false);
        const inactiveCompanies = companies.length - activeCompanies.length;

        const totalUtenti = users.length;
        const adminCount = users.filter(u => u.ruolo === 'titolare-azienda' || u.ruolo === 'amministrazione').length;
        const operativiCount = users.filter(u => u.ruolo === 'tecnico' || u.ruolo === 'operaio').length;

        // 🌟 LOGICA LIVE: Chi sta lavorando OGGI?
        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);

        const realmenteOnline = presenze.filter(p => {
            const dataInizio = parseDateRobust(p.timestampInizio);
            // Consideriamo online chi ha iniziato oggi, non ha finito e lo stato è 'lavoro'
            return dataInizio && dataInizio >= oggi && !p.timestampFine && p.stato === 'lavoro';
        }).length;

        const recentCompanies = [...companies]
            .sort((a, b) => (parseDateRobust(b.createdAt)?.getTime() || 0) - (parseDateRobust(a.createdAt)?.getTime() || 0))
            .slice(0, 5) 
            .map(c => ({
                ...c,
                displayName: getCompanyName(c),
                initial: getCompanyName(c).charAt(0).toUpperCase()
            }));

        const totalFatture = (data.fatture || []).length + (data.fatture_acquisto || []).length;
        const totalRapportini = (data.reports || []).length;
        const totalDocumenti = (data.documenti || []).length + (data.sicurezza_pos || []).length;

        const companyMap = companies.reduce((acc, c) => {
            acc[c.id] = getCompanyName(c);
            return acc;
        }, {});

        const userMap = users.reduce((acc, u) => {
            acc[u.id] = `${u.nome || ''} ${u.cognome || ''}`.trim() || u.email || 'Utente N/D';
            return acc;
        }, {});

        const systemLogs = [...(data.segnalazioniErrori || [])]
            .sort((a, b) => (parseDateRobust(b.createdAt || b.timestamp || b.data)?.getTime() || 0) - (parseDateRobust(a.createdAt || a.timestamp || a.data)?.getTime() || 0))
            .slice(0, 15)
            .map(log => {
                const compId = log.aziendaId || log.companyId || log.companyID || log.tenantId || log.aziendaID;
                const resolvedCompany = companyMap[compId] || log.nomeAzienda || (compId ? 'Azienda non in DB' : 'App Globale');

                const userId = log.utenteId || log.userId || log.utente || log.uid;
                const resolvedUser = userMap[userId] || log.nomeUtente || (userId?.length > 15 ? 'App User' : userId) || 'Sconosciuto';

                let errTitle = log.titolo || log.tipoErrore || log.type || log.azione || 'Anomalia di Sistema';
                let errMsg = log.messaggio || log.errore || log.error || log.details || '';

                if (typeof errMsg === 'object') {
                    try { errMsg = JSON.stringify(errMsg); } catch (e) { errMsg = "Dettaglio errore non testuale"; }
                }

                const isFeedback = log.fonte === 'user_feedback' || log.fonte === 'app_mobile';
                const isFromApp = log.fonte === 'app_mobile';
                
                let badgeText = 'ERROR';
                if (isFeedback) {
                    badgeText = log.tipoErrore === 'suggerimento' ? 'IDEA' : log.tipoErrore === 'assistenza' ? 'SOS' : 'BUG';
                }
                if (isFromApp) { badgeText = `📱 ${badgeText}`; }

                return {
                    ...log,
                    resolvedCompany,
                    resolvedUser,
                    errTitle,
                    errMsg,
                    isFeedback,
                    badgeText,
                    dateObj: parseDateRobust(log.createdAt || log.timestamp || log.data)
                };
            });

        // CALCOLI INFRASTRUTTURA
        const totalRecords = Object.values(data || {}).reduce((acc, curr) => acc + (Array.isArray(curr) ? curr.length : 0), 0);
        const firestoreLoadPercent = Math.min(Math.round((totalRecords / 10000) * 100), 100);

        const estimatedStorageMB = totalDocumenti * 2.5; 
        const storageDisplay = estimatedStorageMB > 1024 
            ? `${(estimatedStorageMB / 1024).toFixed(2)} GB` 
            : `${estimatedStorageMB.toFixed(1)} MB`;
        const storagePercent = Math.min(Math.round((estimatedStorageMB / 5120) * 100), 100);

        // Percentuale basata su quanti tecnici stanno lavorando ora rispetto al totale tecnici registrati
        const activeTrafficPercent = operativiCount > 0 ? Math.round((realmenteOnline / operativiCount) * 100) : 0;

        return { 
            totalAziende: companies.length,
            activeCompanies: activeCompanies.length,
            inactiveCompanies,
            totalUtenti,
            adminCount,
            operativiCount,
            realmenteOnline, // 🌟 Valore aggiunto
            totalCantieri: cantieri.length,
            totalOfferte: offerte.length,
            recentCompanies,
            totalFatture,
            totalRapportini,
            totalDocumenti,
            systemLogs,
            totalRecords,
            firestoreLoadPercent,
            storageDisplay,
            storagePercent,
            activeTrafficPercent
        };
    }, [data]);

    return (
        <div className="p-4 md:p-8 bg-slate-900 min-h-screen animate-fade-in text-slate-200">
            
            {/* INTESTAZIONE */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-indigo-500/20 rounded-md">
                            <CpuChipIcon className="h-5 w-5 text-indigo-400" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400">System God Mode</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Control Room Piattaforma</h1>
                    <p className="text-slate-400 mt-1 font-medium">Infrastruttura Cloud e Tenant Management.</p>
                </div>
                <div className="flex items-center gap-3 text-sm font-bold bg-slate-800/50 border border-slate-700 px-5 py-3 rounded-xl backdrop-blur-md">
                    <SignalIcon className="h-5 w-5 text-emerald-400 animate-pulse" />
                    <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest">Stato Rete</div>
                        <div className="text-emerald-400">Cluster Operativi</div>
                    </div>
                </div>
            </div>

            {/* KPI GLOBALI */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatItem label="Tenant" value={stats.totalAziende} subLabel={`${stats.activeCompanies} Attive`} icon={<BuildingOfficeIcon className="text-indigo-400" />} colorClass="bg-slate-800 border-slate-700 text-slate-200" />
                <StatItem label="Utenti Globali" value={stats.totalUtenti} subLabel={`${stats.adminCount} Admin`} icon={<UsersIcon className="text-blue-400" />} colorClass="bg-slate-800 border-slate-700 text-slate-200" />
                <StatItem label="Cantieri Cloud" value={stats.totalCantieri} subLabel="Commesse attive" icon={<GlobeAltIcon className="text-emerald-400" />} colorClass="bg-slate-800 border-slate-700 text-slate-200" />
                <StatItem label="Nodi Firestore" value={stats.totalRecords.toLocaleString('it-IT')} subLabel="Record scaricati" icon={<TableCellsIcon className="text-amber-400" />} colorClass="bg-slate-800 border-slate-700 text-slate-200" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    {/* TABELLA NUOVI TENANT */}
                    <div className="bg-slate-800 shadow-xl border border-slate-700 rounded-2xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/80">
                            <div className="flex items-center gap-3">
                                <SparklesIcon className="h-6 w-6 text-indigo-400" />
                                <h3 className="text-lg font-bold text-white">Nuovi Tenant Registrati</h3>
                            </div>
                            <button onClick={() => onNavigate('admin-aziende')} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-lg hover:bg-indigo-500/10">Vedi Elenco &rarr;</button>
                        </div>
                        <div className="p-0 overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-slate-900/50 border-b border-slate-700 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                                    <tr><th className="px-6 py-4">Ragione Sociale</th><th className="px-6 py-4">Iscrizione</th><th className="px-6 py-4 text-center">Stato</th><th className="px-6 py-4 text-right">Azione</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {stats.recentCompanies.map(azienda => (
                                        <tr key={azienda.id} className="hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-200 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-black text-xs">{azienda.initial}</div>
                                                {azienda.displayName}
                                            </td>
                                            <td className="px-6 py-4 text-slate-400">{parseDateRobust(azienda.createdAt)?.toLocaleDateString('it-IT') || 'N/D'}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase border ${azienda.attivo !== false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                    {azienda.attivo !== false ? 'OK' : 'SOSPESA'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => { localStorage.setItem('adminPreselectedCompanyId', azienda.id); onNavigate('gestione-permessi'); }} className="text-xs font-bold text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/30 px-3 py-2 rounded-lg transition-colors">
                                                    <KeyIcon className="h-3 w-3 inline mr-1" /> Permessi
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* TERMINALE LOG ERRORI */}
                    <div className="bg-[#0D1117] shadow-2xl border border-slate-700 rounded-2xl overflow-hidden flex flex-col font-mono relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 opacity-50"></div>
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0D1117]">
                            <div className="flex items-center gap-3">
                                <CommandLineIcon className="h-5 w-5 text-slate-400" />
                                <h3 className="text-sm font-bold text-slate-300 tracking-wider uppercase">System Logs & Rilevamenti</h3>
                            </div>
                        </div>
                        <div className="p-5 overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                            {stats.systemLogs.length === 0 ? (
                                <div className="text-green-400 text-sm"><span className="text-slate-500 mr-2">root@server:~#</span> Nessuna anomalia rilevata.</div>
                            ) : (
                                <ul className="space-y-4">
                                    {stats.systemLogs.map((log, i) => (
                                        <li key={i} className={`text-xs text-slate-300 border-l-2 pl-3 py-0.5 group hover:bg-slate-800/30 rounded-r-lg transition-colors ${log.isFeedback ? 'border-amber-500/50' : 'border-red-500/50'}`}>
                                            <div className="flex flex-wrap gap-2 items-center mb-1.5">
                                                <span className="text-slate-500 font-medium">[{log.dateObj ? log.dateObj.toLocaleString('it-IT') : '...'}]</span>
                                                <span className={`${log.isFeedback ? 'text-amber-400' : 'text-red-400'} font-bold text-[10px]`}>{log.badgeText}</span>
                                                <span className="px-1.5 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded text-[9px] font-bold uppercase">{log.resolvedCompany}</span>
                                                <span className="text-slate-400 text-[10px] font-medium flex items-center gap-1"><UsersIcon className="h-3 w-3" /> {log.resolvedUser}</span>
                                            </div>
                                            <div className="text-slate-100 font-bold mb-0.5">{log.errTitle}</div>
                                            {log.errMsg && <div className={`mt-1 pl-2 border-l text-[10px] break-words opacity-80 ${log.isFeedback ? 'text-amber-200/70 border-amber-700/50 font-sans' : 'text-slate-400 border-slate-700 font-mono'}`}>{log.errMsg}</div>}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                {/* COLONNA DESTRA INFRASTRUTTURA */}
                <div className="xl:col-span-1 space-y-6">
                    <div className="bg-slate-800 shadow-xl border border-slate-700 rounded-2xl overflow-hidden p-5">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-6"><ServerStackIcon className="h-5 w-5 text-slate-400" /> Storage & Database</h3>
                        <div className="space-y-6">
                            {/* FIRESTORE */}
                            <div>
                                <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-slate-400">Database (Firestore)</span><span className="text-xs font-bold text-emerald-400">{stats.totalRecords} Nodi</span></div>
                                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                                    <div className={`h-2 rounded-full transition-all duration-1000 ${stats.firestoreLoadPercent > 80 ? 'bg-red-500' : stats.firestoreLoadPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{width: `${Math.max(stats.firestoreLoadPercent, 5)}%`}}></div>
                                </div>
                            </div>
                            {/* STORAGE */}
                            <div>
                                <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-slate-400">Storage (File Cloud)</span><span className="text-xs font-bold text-blue-400">{stats.storageDisplay}</span></div>
                                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-1000" style={{width: `${Math.max(stats.storagePercent, 5)}%`}}></div>
                                </div>
                            </div>
                            {/* TRAFFICO LIVE */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-slate-400">Traffico Live</span>
                                    <span className={`text-xs font-bold ${stats.realmenteOnline > 0 ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`}>
                                        {stats.realmenteOnline} Operai al lavoro
                                    </span>
                                </div>
                                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700 flex">
                                    <div className="bg-emerald-500 h-2 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000" style={{width: `${stats.activeTrafficPercent}%`}}></div>
                                    <div className="bg-slate-700 h-2 flex-1"></div>
                                </div>
                                <div className="text-[9px] text-slate-500 mt-1 text-right">Percentuale tecnici attivi su {stats.operativiCount} totali</div>
                            </div>
                        </div>
                    </div>

                    {/* AZIONI GLOBALI */}
                    <div className="bg-slate-800 shadow-xl border border-slate-700 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-slate-700 bg-slate-800/80"><h3 className="text-lg font-bold text-white flex items-center gap-2"><KeyIcon className="h-5 w-5 text-amber-400" /> Configurazione Cloud</h3></div>
                        <div className="p-5 space-y-3">
                           
                            <button onClick={() => onNavigate('catalogo-risorse')} className="flex items-center w-full p-4 bg-slate-900/50 border border-slate-700 rounded-xl hover:bg-amber-500/10 hover:border-amber-500/50 transition-all text-left group">
                                <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-amber-400 transition-colors"><TableCellsIcon className="h-5 w-5"/></div>
                                <div className="ml-4 flex-1"><div className="text-sm font-bold text-slate-200 group-hover:text-amber-300">Master Catalog</div><div className="text-xs text-slate-500 mt-0.5">Prezzari e Risorse globali</div></div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};