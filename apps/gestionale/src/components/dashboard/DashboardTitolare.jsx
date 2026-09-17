import React, { useMemo, useState } from 'react';
import { useFirebaseData } from 'shared-core';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 
import { 
    CurrencyDollarIcon, 
    BanknotesIcon, 
    BuildingOfficeIcon, 
    DocumentTextIcon, 
    ChartPieIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ShoppingBagIcon,
    ClipboardDocumentCheckIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    ShieldExclamationIcon,
    BriefcaseIcon,
    ScaleIcon,
    InboxArrowDownIcon,
    MegaphoneIcon,
    PlusIcon, 
    XMarkIcon,
    SparklesIcon,
    UsersIcon,
    ChartBarIcon
} from '@heroicons/react/24/solid';

// 🌟 IMPORTIAMO LA LIBRERIA PER I GRAFICI
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
    AreaChart, Area, ComposedChart, Line
} from 'recharts';

// --- Componenti Helper ---

const DashboardWidget = ({ title, icon, children, className = '', headerRight }) => (
    <div className={`bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden flex flex-col ${className}`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
                {icon}
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            </div>
            {headerRight && <div>{headerRight}</div>}
        </div>
        <div className="p-5 space-y-4 flex-1 overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-slate-300"> 
            {children}
        </div>
    </div>
);

// Variante per i grafici (DEVE avere un'altezza fissa per far funzionare Recharts)
const ChartWidget = ({ title, icon, children, className = '' }) => (
    <div className={`bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden flex flex-col ${className}`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
                {icon}
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            </div>
        </div>
        {/* 🌟 FIX: Abbiamo imposto h-[350px] per dare lo spazio fisico al grafico */}
        <div className="p-5 h-[350px] w-full"> 
            {children}
        </div>
    </div>
);

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

const QuickLink = ({ title, icon, onNavigate, subtitle }) => (
    <button 
        onClick={onNavigate} 
        className="flex items-center w-full p-4 bg-white border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 hover:shadow-md transition-all text-left group"
    >
        <div className="p-3 bg-slate-100 text-slate-500 rounded-xl group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
            {icon}
        </div>
        <div className="ml-4">
            <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-900">{title}</div>
            {subtitle && <div className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</div>}
        </div>
    </button>
);

// Funzione custom per il tooltip dei grafici
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-200 shadow-xl rounded-xl">
                <p className="font-bold text-slate-800 mb-2 border-b pb-1">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm font-semibold" style={{ color: entry.color }}>
                        <span>{entry.name}:</span>
                        <span>{new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(entry.value)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const formatCurrency = (amount) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
const formatK = (tickItem) => {
    if (tickItem >= 1000) return `€${(tickItem / 1000).toFixed(0)}k`;
    return `€${tickItem}`;
};

const parseDateRobust = (val) => {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    if (typeof val.toDate === 'function') return val.toDate();
    if (val.seconds) return new Date(val.seconds * 1000);
    if (typeof val === 'string') {
        if (val.includes('/')) {
            const parts = val.split('/');
            if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        const parsed = new Date(val);
        if (!isNaN(parsed.getTime())) return parsed;
    }
    return null;
};

// Genera etichetta mese (es. "Gen 2024")
const getMonthLabel = (date) => {
    return date.toLocaleString('it-IT', { month: 'short', year: 'numeric' });
};

// Crea array degli ultimi 6 mesi o prossimi 6 mesi
const getMonthRange = (startDate, months, isFuture = false) => {
    const result = [];
    const date = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    
    // Se andiamo indietro, spostiamo la data di partenza
    if (!isFuture) {
        date.setMonth(date.getMonth() - (months - 1));
    }

    for (let i = 0; i < months; i++) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        result.push({
            key: key,
            label: getMonthLabel(date),
            year: date.getFullYear(),
            month: date.getMonth(),
            Entrate: 0,
            Uscite: 0,
            Margine: 0
        });
        date.setMonth(date.getMonth() + 1);
    }
    return result;
};


// --- Componente Principale ---

export const DashboardTitolare = ({ onNavigate }) => {
    const { data, user, db, userAziendaId } = useFirebaseData();

    const [isBachecaModalOpen, setIsBachecaModalOpen] = useState(false);
    const [nuovoAvviso, setNuovoAvviso] = useState({ titolo: '', messaggio: '' });
    const [isPublishing, setIsPublishing] = useState(false);

    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const todayTimestamp = today.getTime();
        const currentYear = today.getFullYear();
        
        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        // --- STRUTTURE PER I GRAFICI ---
        const storico6Mesi = getMonthRange(today, 6, false); // Passato (per fatturato)
        const proiezioni6Mesi = getMonthRange(today, 6, true); // Futuro (per cashflow da scadenze)

        // --- 1. KPI FINANZIARI GLOBALI E DATI GRAFICI ---
        let fatturatoAttivo = 0;
        let incassatoAttivo = 0;
        let fatturatoPassivo = 0;
        let pagatoPassivo = 0;

        let creditiScaduti = 0;
        let debitiScaduti = 0;

        (data.fatture || []).forEach(f => {
            const importo = Number(f.totaleDocumento || 0);
            const stato = (f.stato || '').toLowerCase().trim();
            const dataScadenza = parseDateRobust(f.dataScadenza);
            const dataEmissione = parseDateRobust(f.dataEmissione || f.data || f.createdAt);

            if (stato !== 'annullata') {
                // Calcola KPI per l'anno in corso
                if (dataEmissione && dataEmissione.getFullYear() === currentYear) {
                    fatturatoAttivo += importo;
                    if (stato === 'pagata') incassatoAttivo += importo;
                }
                
                // Crediti scaduti (qualsiasi anno)
                if (stato !== 'pagata' && dataScadenza && dataScadenza.getTime() < todayTimestamp) {
                    creditiScaduti += importo;
                }

                // 📊 Popola Storico Fatturato (Data Emissione)
                if (dataEmissione) {
                    const key = `${dataEmissione.getFullYear()}-${String(dataEmissione.getMonth() + 1).padStart(2, '0')}`;
                    const targetMonth = storico6Mesi.find(m => m.key === key);
                    if (targetMonth) {
                        targetMonth.Entrate += importo;
                        targetMonth.Margine = targetMonth.Entrate - targetMonth.Uscite;
                    }
                }

                // 📊 Popola Proiezione Cashflow (Data Scadenza) - SOLO DA INCASSARE
                if (stato !== 'pagata' && dataScadenza) {
                    const key = `${dataScadenza.getFullYear()}-${String(dataScadenza.getMonth() + 1).padStart(2, '0')}`;
                    const targetMonth = proiezioni6Mesi.find(m => m.key === key);
                    if (targetMonth) {
                        targetMonth.Entrate += importo;
                        targetMonth.Margine = targetMonth.Entrate - targetMonth.Uscite;
                    }
                }
            }
        });

        (data.fatture_acquisto || []).forEach(f => {
            const importo = Number(f.importoTotale || f.totaleDocumento || f.totale || f.importo || 0);
            const stato = (f.stato || '').toLowerCase().trim();
            const dataScadenza = parseDateRobust(f.dataScadenza);
            const dataEmissione = parseDateRobust(f.dataEmissione || f.data || f.createdAt);

            if (stato !== 'annullata') {
                // Calcola KPI per l'anno in corso
                if (dataEmissione && dataEmissione.getFullYear() === currentYear) {
                    fatturatoPassivo += importo;
                    if (stato === 'pagata') pagatoPassivo += importo;
                }
                
                // Debiti scaduti (qualsiasi anno)
                if (stato !== 'pagata' && dataScadenza && dataScadenza.getTime() < todayTimestamp) {
                    debitiScaduti += importo;
                }

                // 📊 Popola Storico Costi (Data Emissione)
                if (dataEmissione) {
                    const key = `${dataEmissione.getFullYear()}-${String(dataEmissione.getMonth() + 1).padStart(2, '0')}`;
                    const targetMonth = storico6Mesi.find(m => m.key === key);
                    if (targetMonth) {
                        targetMonth.Uscite += importo;
                        targetMonth.Margine = targetMonth.Entrate - targetMonth.Uscite;
                    }
                }

                // 📊 Popola Proiezione Cashflow (Data Scadenza) - SOLO DA PAGARE
                if (stato !== 'pagata' && dataScadenza) {
                    const key = `${dataScadenza.getFullYear()}-${String(dataScadenza.getMonth() + 1).padStart(2, '0')}`;
                    const targetMonth = proiezioni6Mesi.find(m => m.key === key);
                    if (targetMonth) {
                        targetMonth.Uscite += importo;
                        targetMonth.Margine = targetMonth.Entrate - targetMonth.Uscite;
                    }
                }
            }
        });

        // --- 2. OPERATIVITÀ E CANTIERI ---
        const maxDateProgrammazione = {};
        const operativiOggiIds = new Set();
        const cantieriOperativiOggiIds = new Set();

        (data.programmazione || []).forEach(task => {
            if (!task.cantiereId) return;
            const taskStart = parseDateRobust(task.dataInizio || task.start);
            const taskEnd = parseDateRobust(task.dataFine || task.end || task.scadenza);
            
            if (taskEnd) {
                if (!maxDateProgrammazione[task.cantiereId] || taskEnd > maxDateProgrammazione[task.cantiereId]) {
                    maxDateProgrammazione[task.cantiereId] = taskEnd;
                }
            }

            if (taskStart && taskEnd) {
                const tS = new Date(taskStart); tS.setHours(0,0,0,0);
                const tE = new Date(taskEnd); tE.setHours(23,59,59,999);
                if (tS <= today && tE >= today) {
                    cantieriOperativiOggiIds.add(task.cantiereId);
                    (task.risorseAssegnate?.personale || []).forEach(id => operativiOggiIds.add(id));
                }
            }
        });

        const listaCantieriAttivi = (data.cantieri || []).filter(c => {
            const stato = (c.stato || '').toLowerCase().trim();
            return !['completato', 'chiuso', 'fatturato', 'annullato', 'sospeso'].includes(stato);
        });
        
        const cantieriDaFatturare = listaCantieriAttivi.filter(c => (c.stato || '').toLowerCase() === 'da_fatturare').length;
        const cantieriAttivi = listaCantieriAttivi.length;
        
        const cantieriInScadenza = listaCantieriAttivi.filter(c => {
            const rawDate = c.dataFinePresunta || c.dataTeoricaFine || c.dataFine || c.dataFinePrevista || c.dataConsegna || c.dataFineLavori || c.scadenza || c.fineLavori || c.datiGenerali?.dataFine || c.datiGenerali?.dataFinePrevista;
            let dataScadenza = parseDateRobust(rawDate);
            if (!dataScadenza && maxDateProgrammazione[c.id]) dataScadenza = maxDateProgrammazione[c.id];
            if (!dataScadenza) return false;
            return dataScadenza <= thirtyDaysFromNow;
        }).length;

        // --- 3. ALLARMI DIREZIONALI ---
        const allarmiDirezionali = [];

        if (creditiScaduti > 0) {
            allarmiDirezionali.push({
                id: 'crediti_scaduti',
                titolo: 'Crediti Clienti Scaduti',
                descrizione: `Hai ${formatCurrency(creditiScaduti)} di fatture emesse non incassate oltre i termini.`,
                azione: 'Sollecita Incassi',
                tipo: 'credito',
                navTo: 'fatturazione'
            });
        }

        if (debitiScaduti > 0) {
            allarmiDirezionali.push({
                id: 'debiti_scaduti',
                titolo: 'Fatture Fornitori Scadute',
                descrizione: `Risultano da pagare ${formatCurrency(debitiScaduti)} di fatture fornitore scadute.`,
                azione: 'Vai allo Scadenzario',
                tipo: 'debito',
                navTo: 'acquisti'
            });
        }

        listaCantieriAttivi.forEach(cantiere => {
            const appalto = Number(cantiere.valoreAppalto || cantiere.budgetRicavi || 0);
            const budgetCosti = Number(cantiere.budgetCosti || 0);
            
            if (appalto === 0 && budgetCosti === 0) return;

            const spesaReale = (data.fatture_acquisto || [])
                .filter(f => f.cantiereId === cantiere.id && (f.stato || '').toLowerCase().trim() !== 'annullata')
                .reduce((acc, f) => acc + Number(f.importoTotale || f.totaleDocumento || f.totale || f.importo || 0), 0);

            if (budgetCosti > 0 && spesaReale > budgetCosti) {
                allarmiDirezionali.push({
                    id: `margin_loss_${cantiere.id}`,
                    titolo: `Sforamento Costi: ${cantiere.nomeCantiere || cantiere.nome}`,
                    descrizione: `I costi reali (${formatCurrency(spesaReale)}) hanno superato il budget previsto (${formatCurrency(budgetCosti)}). Margine a rischio!`,
                    azione: 'Analizza Commessa',
                    tipo: 'margine',
                    cantiereId: cantiere.id,
                    navTo: 'gestione-operativa'
                });
            }
        });

        const offerteAccettate = (data.offerte || []).filter(o => o.stato === 'accettata');
        if (offerteAccettate.length > 0) {
            allarmiDirezionali.push({
                id: 'offerte_accettate',
                titolo: 'Nuovi Lavori Aggiudicati',
                descrizione: `Ci sono ${offerteAccettate.length} preventivi firmati dai clienti in attesa di essere convertiti in Cantieri.`,
                azione: 'Converti in Cantiere',
                tipo: 'commerciale',
                navTo: 'gestione-operativa' 
            });
        }

        // --- 4. COMMERCIALI E ACQUISTI ---
        const offerteInviate = (data.offerte || []).filter(o => {
            const s = (o.stato || '').toLowerCase();
            return s === 'inviata' || s === 'in_attesa';
        }).length;
        
        const ordiniAperti = (data.ordini_acquisto || []).filter(o => {
            const s = (o.stato || '').toLowerCase();
            return s.includes('attesa') || s === 'consegnato' || s === 'parziale';
        }).length;

        // --- 5. LOGICA AVANZAMENTO LAVORI E BACHECA ---
        const cantieriRecenti = [...listaCantieriAttivi]
            .sort((a, b) => (parseDateRobust(b.createdAt)?.getTime() || 0) - (parseDateRobust(a.createdAt)?.getTime() || 0))
            .slice(0, 4);

        const messaggiBacheca = (data.notifiche || data.note_operative || data.noteOperative || [])
            .filter(n => n.globale === true || n.isBroadcast === true || n.tipo === 'bacheca' || n.tipo === 'circolare')
            .sort((a, b) => (parseDateRobust(b.createdAt || b.data)?.getTime() || 0) - (parseDateRobust(a.createdAt || a.data)?.getTime() || 0))
            .slice(0, 4);

        return {
            fatturatoAttivo,
            incassatoAttivo,
            daIncassare: fatturatoAttivo - incassatoAttivo,
            creditiScaduti,
            fatturatoPassivo,
            pagatoPassivo,
            daPagare: fatturatoPassivo - pagatoPassivo,
            debitiScaduti,
            cantieriAttivi,
            cantieriInScadenza,
            cantieriDaFatturare,
            offerteInviate,
            ordiniAperti,
            allarmiDirezionali,
            cantieriRecenti,
            messaggiBacheca,
            operaiOggi: operativiOggiIds.size,
            cantieriOperativiOggi: cantieriOperativiOggiIds.size,
            datiStorico: storico6Mesi,
            datiProiezioni: proiezioni6Mesi
        };
    }, [data]);


    const vaiAlCantiere = (cantiereId, targetTab = 'analisi_commessa') => {
        localStorage.setItem('selectedCantiereId', cantiereId);
        localStorage.setItem('cantiereActiveTab', targetTab);
        onNavigate('gestione-operativa');
    };

    const gestisciAllarmeSmart = (allarme) => {
        if (allarme.tipo === 'margine') {
            vaiAlCantiere(allarme.cantiereId, 'analisi_commessa');
        } else if (allarme.tipo === 'credito') {
            onNavigate('fatturazione');
        } else if (allarme.tipo === 'debito') {
            onNavigate('acquisti');
        } else {
            onNavigate(allarme.navTo);
        }
    };

    const handlePubblicaAvviso = async () => {
        if (!nuovoAvviso.titolo.trim() || !nuovoAvviso.messaggio.trim()) {
            alert("Compila tutti i campi prima di pubblicare.");
            return;
        }
        setIsPublishing(true);
        try {
            await addDoc(collection(db, 'notifiche'), {
                titolo: nuovoAvviso.titolo,
                messaggio: nuovoAvviso.messaggio,
                tipo: 'bacheca',
                globale: true,
                companyID: user?.companyID || userAziendaId,
                autore: user?.nome ? `${user.nome} ${user.cognome}` : 'Direzione',
                createdAt: serverTimestamp(),
                data: new Date().toISOString()
            });
            setIsBachecaModalOpen(false);
            setNuovoAvviso({ titolo: '', messaggio: '' });
        } catch (error) {
            console.error("Errore pubblicazione avviso:", error);
            alert("Si è verificato un errore durante la pubblicazione.");
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen animate-fade-in relative">
            
            {/* INTESTAZIONE E POLSO OPERATIVO */}
            <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Buongiorno, {user?.nome || 'Titolare'}!
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">
                        Controllo direzionale, flussi di cassa e stato aziendale in tempo reale.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Polso Operativo */}
                    <div className="flex items-center gap-3 bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-sm">
                        <UsersIcon className="h-6 w-6 text-blue-500" />
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Polso Odierno</p>
                            <p className="text-sm font-bold text-slate-700">
                                <span className="text-blue-600 font-black">{stats.operaiOggi}</span> uomini su <span className="text-indigo-600 font-black">{stats.cantieriOperativiOggi}</span> cantieri
                            </p>
                        </div>
                    </div>
                    {/* Bilancio Cassa */}
                    <div className="flex items-center gap-3 bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-sm">
                        <ScaleIcon className="h-6 w-6 text-indigo-600" />
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Bilancio Cassa ({new Date().getFullYear()})</p>
                            <p className={`text-sm font-bold ${stats.incassatoAttivo - stats.pagatoPassivo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatCurrency(stats.incassatoAttivo - stats.pagatoPassivo)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- 1. KPI FINANZIARI GLOBALI --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                <StatItem 
                    label={`Fatturato Attivo ${new Date().getFullYear()}`} 
                    value={formatCurrency(stats.fatturatoAttivo)} 
                    subLabel={`Incassato: ${formatCurrency(stats.incassatoAttivo)}`}
                    icon={<ArrowTrendingUpIcon className="text-emerald-600" />}
                    colorClass="bg-gradient-to-br from-emerald-50 to-white border-emerald-200 text-emerald-950"
                />
                <StatItem 
                    label="Da Incassare (Crediti Totali)" 
                    value={formatCurrency(stats.daIncassare)} 
                    subLabel={stats.creditiScaduti > 0 ? `Di cui SCADUTI: ${formatCurrency(stats.creditiScaduti)}` : 'Nessun credito scaduto'}
                    icon={<CurrencyDollarIcon className="text-blue-600" />}
                    colorClass="bg-gradient-to-br from-blue-50 to-white border-blue-200 text-blue-950"
                />
                <StatItem 
                    label={`Costi Operativi ${new Date().getFullYear()}`} 
                    value={formatCurrency(stats.fatturatoPassivo)} 
                    subLabel={`Pagato: ${formatCurrency(stats.pagatoPassivo)}`}
                    icon={<ArrowTrendingDownIcon className="text-orange-600" />}
                    colorClass="bg-gradient-to-br from-orange-50 to-white border-orange-200 text-orange-950"
                />
                <StatItem 
                    label="Da Pagare (Debiti Totali)" 
                    value={formatCurrency(stats.daPagare)} 
                    subLabel={stats.debitiScaduti > 0 ? `Di cui SCADUTI: ${formatCurrency(stats.debitiScaduti)}` : 'Nessun debito scaduto'}
                    icon={<BanknotesIcon className="text-rose-600" />}
                    colorClass="bg-gradient-to-br from-rose-50 to-white border-rose-200 text-rose-950"
                />
            </div>

            {/* --- GRIGLIA CENTRALE --- */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* COLONNA SINISTRA E CENTRO: Allarmi Direzionali e Grafici */}
                <div className="xl:col-span-2 space-y-6">
                    
                    {/* WIDGET: ALLARMI DIREZIONALI (CEO) */}
                    <DashboardWidget title="Avvisi Direzionali" icon={<ExclamationTriangleIcon className="h-6 w-6 text-red-500" />}>
                        {stats.allarmiDirezionali.length === 0 ? (
                            <div className="text-center py-8">
                                <ShieldExclamationIcon className="h-12 w-12 mx-auto text-emerald-200 mb-3" />
                                <p className="text-lg font-bold text-emerald-700">Azienda in perfetta salute.</p>
                                <p className="text-sm text-emerald-600">Nessun credito scaduto o cantiere fuori controllo.</p>
                            </div>
                        ) : (
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {stats.allarmiDirezionali.map(allarme => {
                                    let bgClass = 'bg-slate-50 border-slate-200';
                                    let tagClass = 'bg-slate-200 text-slate-800';
                                    let btnClass = 'bg-slate-600 text-white hover:bg-slate-700';

                                    if (allarme.tipo === 'margine') {
                                        bgClass = 'bg-orange-50/50 border-orange-200';
                                        tagClass = 'bg-orange-200 text-orange-800';
                                        btnClass = 'bg-orange-500 text-white hover:bg-orange-600';
                                    } else if (allarme.tipo === 'credito') {
                                        bgClass = 'bg-red-50/50 border-red-200';
                                        tagClass = 'bg-red-200 text-red-800';
                                        btnClass = 'bg-red-600 text-white hover:bg-red-700';
                                    } else if (allarme.tipo === 'debito') {
                                        bgClass = 'bg-rose-50/50 border-rose-200';
                                        tagClass = 'bg-rose-200 text-rose-800';
                                        btnClass = 'bg-rose-600 text-white hover:bg-rose-700';
                                    } else if (allarme.tipo === 'commerciale') {
                                        bgClass = 'bg-emerald-50/50 border-emerald-200';
                                        tagClass = 'bg-emerald-200 text-emerald-800';
                                        btnClass = 'bg-emerald-600 text-white hover:bg-emerald-700';
                                    }

                                    return (
                                        <li key={allarme.id} className={`flex flex-col p-4 border rounded-2xl relative overflow-hidden transition-all hover:shadow-md ${bgClass}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-full ${tagClass}`}>
                                                    {allarme.categoria || allarme.tipo}
                                                </span>
                                            </div>
                                            <div className="font-black text-slate-900 text-sm mb-1 leading-tight">{allarme.titolo}</div>
                                            <div className="text-xs text-slate-700 font-medium mb-4 flex-1">{allarme.descrizione}</div>
                                            <button 
                                                onClick={() => gestisciAllarmeSmart(allarme)}
                                                className={`text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all shadow-sm w-full flex justify-center items-center gap-2 ${btnClass}`}
                                            >
                                                {allarme.azione}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </DashboardWidget>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* WIDGET: STATO OPERATIVO E FATTURAZIONE */}
                        <DashboardWidget title="Avanzamento Produzione" icon={<BuildingOfficeIcon className="h-6 w-6 text-indigo-600" />}>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-center cursor-pointer hover:bg-indigo-100 transition-colors" onClick={() => onNavigate('gestione-operativa')}>
                                    <div className="text-3xl font-black text-indigo-900">{stats.cantieriAttivi}</div>
                                    <div className="text-[10px] font-bold text-indigo-700 uppercase mt-1">Cantieri Aperti</div>
                                </div>
                                <div className={`p-4 rounded-xl border text-center transition-colors cursor-pointer ${stats.cantieriInScadenza > 0 ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' : 'bg-slate-50 border-slate-200'}`} onClick={() => onNavigate('gestione-operativa')}>
                                    <div className={`text-3xl font-black ${stats.cantieriInScadenza > 0 ? 'text-orange-700' : 'text-slate-700'}`}>{stats.cantieriInScadenza}</div>
                                    <div className={`text-[10px] font-bold uppercase mt-1 flex justify-center items-center gap-1 ${stats.cantieriInScadenza > 0 ? 'text-orange-800' : 'text-slate-500'}`}>
                                        {stats.cantieriInScadenza > 0 && <ClockIcon className="h-3 w-3" />} Lavori in Scadenza
                                    </div>
                                </div>
                            </div>
                            
                            {stats.cantieriDaFatturare > 0 && (
                                <div onClick={() => onNavigate('fatturazione')} className="bg-emerald-100 border border-emerald-300 rounded-xl p-3 flex justify-between items-center cursor-pointer hover:bg-emerald-200 transition-colors shadow-sm">
                                    <div>
                                        <p className="font-bold text-emerald-900 text-sm">Lavori Terminati!</p>
                                        <p className="text-xs text-emerald-800 font-medium">Ci sono {stats.cantieriDaFatturare} cantieri pronti per la fatturazione.</p>
                                    </div>
                                    <div className="bg-emerald-600 text-white rounded-full h-8 w-8 flex justify-center items-center font-black shadow-sm">
                                        {stats.cantieriDaFatturare}
                                    </div>
                                </div>
                            )}
                        </DashboardWidget>

                        {/* WIDGET: ULTIMI CANTIERI AVVIATI */}
                        <DashboardWidget title="Ultimi Lavori Acquisiti" icon={<SparklesIcon className="h-6 w-6 text-amber-500" />}>
                            {stats.cantieriRecenti.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">Nessun cantiere recente registrato.</p>
                            ) : (
                                <ul className="divide-y divide-slate-100 space-y-2">
                                    {stats.cantieriRecenti.map(c => {
                                        const budget = Number(c.valoreAppalto || c.budgetRicavi || 0);
                                        return (
                                            <li key={c.id} className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer group" onClick={() => vaiAlCantiere(c.id, 'info')}>
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="font-bold text-amber-900 text-sm truncate max-w-[70%] group-hover:text-indigo-600">{c.nomeCantiere}</div>
                                                    {budget > 0 && <div className="text-xs font-black text-amber-700">{formatCurrency(budget)}</div>}
                                                </div>
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600">{c.cliente || c.nomeCliente || 'Cliente'}</div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </DashboardWidget>
                    </div>

                    {/* 📊 WIDGET GRAFICO 1: STORICO FATTURATO vs COSTI */}
                    <ChartWidget title="Andamento Storico (Ultimi 6 Mesi)" icon={<ChartBarIcon className="h-6 w-6 text-indigo-600" />}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={stats.datiStorico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                                <YAxis tickFormatter={formatK} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="Entrate" name="Fatturato" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                <Bar dataKey="Uscite" name="Costi/Spese" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                <Line type="monotone" dataKey="Margine" name="Margine Lordo" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </ChartWidget>

                    {/* 📊 WIDGET GRAFICO 2: PROIEZIONE CASHFLOW SCADENZE */}
                    <ChartWidget title="Proiezione Scadenze (Prossimi 6 Mesi)" icon={<ArrowTrendingUpIcon className="h-6 w-6 text-emerald-600" />}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.datiProiezioni} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorEntrate" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorUscite" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                                <YAxis tickFormatter={formatK} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Area type="monotone" dataKey="Entrate" name="Incassi Previsti" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorEntrate)" />
                                <Area type="monotone" dataKey="Uscite" name="Pagamenti Previsti" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#colorUscite)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartWidget>

                </div>

                {/* COLONNA DESTRA: Strumenti, Pipeline e Bacheca */}
                <div className="xl:col-span-1 space-y-6">
                    
                    {/* WIDGET: BACHECA AZIENDALE CON TASTO NUOVO */}
                    <DashboardWidget 
                        title="Bacheca Aziendale" 
                        icon={<MegaphoneIcon className="h-6 w-6 text-blue-500" />}
                        headerRight={
                            <button 
                                onClick={() => setIsBachecaModalOpen(true)}
                                className="flex items-center gap-1 text-[10px] font-black uppercase bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition-colors shadow-sm"
                            >
                                <PlusIcon className="h-3 w-3" /> Nuovo
                            </button>
                        }
                    >
                        {stats.messaggiBacheca.length === 0 ? (
                            <div className="text-center py-4">
                                <MegaphoneIcon className="h-8 w-8 mx-auto text-slate-200 mb-2" />
                                <p className="text-sm text-slate-500">Nessun avviso in bacheca.</p>
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {stats.messaggiBacheca.map((msg, idx) => {
                                    const dataMsg = parseDateRobust(msg.createdAt || msg.data);
                                    return (
                                        <li key={msg.id || idx} className="p-3 bg-blue-50 border border-blue-200 rounded-xl relative">
                                            <div className="text-[10px] font-black text-blue-500 mb-1 uppercase tracking-wider">
                                                {dataMsg ? dataMsg.toLocaleDateString('it-IT') : 'Avviso'}
                                            </div>
                                            <div className="font-bold text-slate-900 text-sm leading-tight mb-1">{msg.titolo || msg.oggetto || 'Comunicazione'}</div>
                                            <div className="text-xs text-slate-700">{msg.messaggio || msg.testo}</div>
                                            <div className="text-[10px] text-slate-400 mt-2 text-right">Da: {msg.autore || 'Direzione'}</div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </DashboardWidget>

                    {/* WIDGET: PIPELINE COMMERCIALE */}
                    <DashboardWidget title="Pipeline Commerciale" icon={<BriefcaseIcon className="h-6 w-6 text-emerald-600" />}>
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => onNavigate('offerte')}>
                                <div>
                                    <p className="font-bold text-slate-800">Preventivi in Attesa</p>
                                    <p className="text-xs text-slate-500">Offerte inviate ai clienti</p>
                                </div>
                                <div className="text-2xl font-black text-slate-700">{stats.offerteInviate}</div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => onNavigate('ordini-acquisto')}>
                                <div>
                                    <p className="font-bold text-slate-800">Ordini Fornitori (ODA)</p>
                                    <p className="text-xs text-slate-500">Materiali in approvvigionamento</p>
                                </div>
                                <div className="text-2xl font-black text-slate-700">{stats.ordiniAperti}</div>
                            </div>
                        </div>
                    </DashboardWidget>

                    {/* WIDGET: ANALISI E CONTROLLO */}
                    <DashboardWidget title="Scorciatoie Analisi" icon={<ChartPieIcon className="h-6 w-6 text-purple-600" />}>
                        <div className="space-y-3">
                            <QuickLink 
                                title="Analisi Commesse (Margini)" 
                                subtitle="Verifica la redditività dei cantieri"
                                icon={<ChartPieIcon className="h-6 w-6"/>} 
                                onNavigate={() => onNavigate('analisi-commessa')}
                            />
                            <QuickLink 
                                title="Comparatore Prezzi (RDO)" 
                                subtitle="Analizza i preventivi dei fornitori"
                                icon={<ClipboardDocumentCheckIcon className="h-6 w-6"/>} 
                                onNavigate={() => onNavigate('comparatore-prezzi')}
                            />
                            <QuickLink 
                                title="Sottoscorta Magazzino" 
                                subtitle="Controlla l'inventario aziendale"
                                icon={<InboxArrowDownIcon className="h-6 w-6"/>} 
                                onNavigate={() => onNavigate('dashboard-sottoscorta')}
                            />
                        </div>
                    </DashboardWidget>

                </div>

            </div>

            {/* 🌟 MODALE INSERIMENTO NUOVO AVVISO */}
            {isBachecaModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                            <h3 className="font-bold flex items-center gap-2">
                                <MegaphoneIcon className="h-5 w-5" /> Pubblica in Bacheca
                            </h3>
                            <button onClick={() => setIsBachecaModalOpen(false)} className="hover:text-blue-200 transition-colors">
                                <XMarkIcon className="h-6 w-6"/>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titolo Comunicazione</label>
                                <input 
                                    type="text" 
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Es. Chiusura Uffici, Avviso Importante..."
                                    value={nuovoAvviso.titolo}
                                    onChange={e => setNuovoAvviso({...nuovoAvviso, titolo: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Testo del Messaggio</label>
                                <textarea 
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                    rows={5}
                                    placeholder="Scrivi qui il testo che sarà visibile a tutti i dipendenti e tecnici..."
                                    value={nuovoAvviso.messaggio}
                                    onChange={e => setNuovoAvviso({...nuovoAvviso, messaggio: e.target.value})}
                                />
                            </div>
                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button 
                                    onClick={() => setIsBachecaModalOpen(false)}
                                    className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Annulla
                                </button>
                                <button 
                                    onClick={handlePubblicaAvviso}
                                    disabled={isPublishing}
                                    className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isPublishing ? 'Pubblicazione...' : 'Pubblica Ora'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};