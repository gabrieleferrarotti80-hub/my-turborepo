import React, { useState, useMemo } from 'react';
import { useFirebaseData } from 'shared-core';
import { 
    CalendarDaysIcon, 
    BuildingOfficeIcon,
    DocumentTextIcon,
    RocketLaunchIcon,
    ShieldExclamationIcon,
    MapPinIcon,
    EnvelopeOpenIcon,
    ExclamationTriangleIcon,
    CheckBadgeIcon,
    ClockIcon,
    ClipboardDocumentCheckIcon,
    ClipboardDocumentListIcon,
    TruckIcon,
    BanknotesIcon,
    UsersIcon,
    UserIcon,
    AcademicCapIcon,
    MegaphoneIcon,
    WrenchScrewdriverIcon
} from '@heroicons/react/24/solid';

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

const ActionItem = ({ count, label, colorClass, linkLabel, onNavigate, subLabel, icon }) => (
    <div className={`flex flex-col justify-between p-4 rounded-xl border ${colorClass} hover:shadow-md transition-shadow relative overflow-hidden`}>
        <div className="absolute right-[-10px] top-[-10px] opacity-20">
            {icon}
        </div>
        <div className="flex justify-between items-start mb-2 relative z-10">
            <div>
                <div className="text-3xl font-black">{count}</div>
                <div className="text-sm font-bold uppercase tracking-wider mt-1 opacity-90">{label}</div>
                {subLabel && <div className="text-xs font-semibold mt-1 opacity-75">{subLabel}</div>}
            </div>
        </div>
        {onNavigate && count > 0 && (
            <button 
                onClick={onNavigate} 
                className="mt-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-colors w-full text-center relative z-10"
            >
                {linkLabel}
            </button>
        )}
    </div>
);

const formatCurrency = (amount) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);

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

export const DashboardTecnico = ({ onNavigate }) => {
    const { data, user, setCantiereSelezionatoId } = useFirebaseData(); 
    const currentUserId = user?.uid || user?.id;

    // 🌟 STATO PER IL TOGGLE DELLA FORZA LAVORO (Oggi vs Settimana)
    const [workforceTab, setWorkforceTab] = useState('oggi');

    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const todayTimestamp = today.getTime();

        const in7Days = new Date(today);
        in7Days.setDate(in7Days.getDate() + 7);
        in7Days.setHours(23,59,59,999);

        const usersMap = new Map((data.users || []).map(u => [u.id, `${u.nome || ''} ${u.cognome || ''}`.trim() || u.email]));
        
        // Mappe per i mezzi (Attrezzature o Mezzi)
        const mezziMap = new Map();
        (data.attrezzature || []).forEach(a => mezziMap.set(a.id, a.nome || a.modello || a.targa || 'Mezzo'));
        (data.scadenze_mezzi || []).forEach(m => mezziMap.set(m.id, m.veicolo || m.targa || 'Mezzo'));

        const myCantieri = (data.cantieri || []).filter(c => c.tecnicoAssegnatoId === currentUserId);
        const myCantieriIds = myCantieri.map(c => c.id);

        const activeCantieri = myCantieri.filter(c => !['completato', 'chiuso', 'da_fatturare'].includes((c.stato || '').toLowerCase().trim()));
        const cantieriDaChiudere = myCantieri.filter(c => ['completato', 'da_fatturare'].includes((c.stato || '').toLowerCase().trim()));

        const allarmiGenerali = [];

        // --- 1. ALLARMI SICUREZZA POS E BUDGET ---
        activeCantieri.forEach(cantiere => {
            const hasPos = (data.sicurezza_pos || []).some(pos => pos.cantiereId === cantiere.id);
            if (!hasPos) {
                allarmiGenerali.push({
                    id: `pos_${cantiere.id}`,
                    cantiereId: cantiere.id,
                    nomeCantiere: cantiere.nomeCantiere || cantiere.nome || 'Senza Nome',
                    categoria: 'SICUREZZA',
                    titolo: 'POS Cantiere Mancante',
                    descrizione: 'Nessun Piano Operativo di Sicurezza (POS) caricato in archivio.',
                    azione: 'Carica POS',
                    tipo: 'sicurezza',
                    navTo: 'sicurezza'
                });
            }

            const budgetPrevisto = Number(cantiere.budgetCosti || 0);
            if (budgetPrevisto > 0) {
                const spesaReale = (data.fatture_acquisto || [])
                    .filter(f => f.cantiereId === cantiere.id && (f.stato || '').toLowerCase().trim() !== 'annullata')
                    .reduce((acc, f) => acc + Number(f.importoTotale || f.totaleDocumento || f.totale || f.importo || 0), 0);

                if (spesaReale > budgetPrevisto) {
                    allarmiGenerali.push({
                        id: `bud_${cantiere.id}`,
                        cantiereId: cantiere.id,
                        nomeCantiere: cantiere.nomeCantiere || cantiere.nome || 'Senza Nome',
                        categoria: 'CONTROLLO COSTI',
                        titolo: 'Sforamento Budget Materiali',
                        descrizione: `I costi registrati superano il budget. Extra: ${formatCurrency(spesaReale - budgetPrevisto)}.`,
                        azione: 'Analizza Costi',
                        tipo: 'budget',
                        navTo: 'gestione-operativa' 
                    });
                }
            }
        });

        // --- 2. SQUADRE ALL'OPERA E GANTT (OGGI E PROSSIMI 7 GIORNI) ---
        const operativiOggi = [];
        const operativiSettimana = [];
        const presenzeNeiCantieri = {};
        const fasiInScadenza = []; // 🌟 NUOVO: Fasi di lavoro in chiusura
        
        const operativiOggiIds = new Set(); 
        const operativiSettimanaIds = new Set(); 

        (data.programmazione || []).forEach(task => {
            if (myCantieriIds.includes(task.cantiereId)) {
                const taskStart = parseDateRobust(task.dataInizio || task.start);
                const taskEnd = parseDateRobust(task.dataFine || task.end) || taskStart;
                const cantiereRef = myCantieri.find(c => c.id === task.cantiereId);
                
                if (taskStart && taskEnd) {
                    const tS = new Date(taskStart); tS.setHours(0,0,0,0);
                    const tE = new Date(taskEnd); tE.setHours(23,59,59,999);

                    // A) Controllo Fasi in Scadenza (se la data fine è tra oggi e i prossimi 7 giorni)
                    if (tE >= today && tE <= in7Days) {
                        fasiInScadenza.push({
                            id: task.id,
                            cantiereId: task.cantiereId,
                            nomeCantiere: cantiereRef?.nomeCantiere || 'Sconosciuto',
                            titolo: task.titolo || task.descrizione || 'Fase di Lavoro',
                            dataFine: tE
                        });
                    }

                    // B) Controllo Forza Lavoro e Mezzi
                    const isOggi = tS <= today && tE >= today;
                    const isSettimana = tS <= in7Days && tE >= today;

                    if (isOggi || isSettimana) {
                        const personaleIds = task.risorseAssegnate?.personale || [];
                        const mezziIds = task.risorseAssegnate?.mezzi || task.risorseAssegnate?.veicoli || task.risorseAssegnate?.attrezzature || [];
                        
                        if (isOggi) personaleIds.forEach(id => operativiOggiIds.add(id));
                        if (isSettimana) personaleIds.forEach(id => operativiSettimanaIds.add(id)); 

                        const personaleAssegnato = personaleIds.map(id => usersMap.get(id) || 'Sconosciuto');
                        const mezziAssegnati = mezziIds.map(id => mezziMap.get(id) || 'Mezzo Sconosciuto'); // 🌟 NUOVO: Furgoni
                        
                        if (personaleAssegnato.length > 0 || mezziAssegnati.length > 0) {
                            const obj = {
                                id: task.id,
                                cantiereId: task.cantiereId,
                                nomeCantiere: cantiereRef?.nomeCantiere || 'Sconosciuto',
                                descrizione: task.titolo || task.descrizione || 'Lavori operativi',
                                personale: personaleAssegnato,
                                mezzi: mezziAssegnati,
                                dataInizio: tS,
                                dataFine: tE
                            };

                            if (isOggi) {
                                operativiOggi.push(obj);
                                presenzeNeiCantieri[task.cantiereId] = (presenzeNeiCantieri[task.cantiereId] || 0) + personaleAssegnato.length;
                            }
                            if (isSettimana) {
                                operativiSettimana.push(obj);
                            }
                        }
                    }
                }
            }
        });

        operativiSettimana.sort((a, b) => a.dataInizio.getTime() - b.dataInizio.getTime());
        fasiInScadenza.sort((a, b) => a.dataFine.getTime() - b.dataFine.getTime());

        // --- 3. CONTROLLO FORMAZIONE/DPI ---
        const corsiMonitorati = [
            { id: 'sicurezza_lavoratori', label: 'Sicurezza 81/08' },
            { id: 'primo_soccorso_antincendio', label: '1° Soccorso/Antin.' },
            { id: 'manutentore_verde', label: 'Manut. Verde' },
            { id: 'attrezzature_art_73', label: 'Art. 73' }
        ];

        operativiSettimanaIds.forEach(userId => {
            const utente = (data.users || []).find(u => u.id === userId);
            if (!utente) return;

            const nomeCompleto = `${utente.nome} ${utente.cognome}`;
            const scadenze = utente.documentiPersonali?.scadenze || {};

            const docIdentity = scadenze.permessoSoggiorno || scadenze.cartaIdentita;
            if (docIdentity && parseDateRobust(docIdentity)?.getTime() < todayTimestamp) {
                 allarmiGenerali.push({
                    id: `id_scad_${userId}`,
                    cantiereId: null,
                    nomeCantiere: 'Personale in Cantiere',
                    categoria: 'FORMAZIONE & HR',
                    titolo: `Documento Identità Scaduto`,
                    descrizione: `L'operatore ${nomeCompleto} ha il documento scaduto ed è programmato nei tuoi cantieri a breve!`,
                    azione: 'Verifica Matrice',
                    tipo: 'formazione',
                    navTo: 'sicurezza'
                 });
            }

            corsiMonitorati.forEach(corso => {
                 const dataScadenza = scadenze[corso.id];
                 if (dataScadenza && parseDateRobust(dataScadenza)?.getTime() < todayTimestamp) {
                     allarmiGenerali.push({
                        id: `corso_${corso.id}_${userId}`,
                        cantiereId: null,
                        nomeCantiere: 'Personale in Cantiere',
                        categoria: 'FORMAZIONE & HR',
                        titolo: `Corso ${corso.label} Scaduto`,
                        descrizione: `L'operatore ${nomeCompleto} andrà in cantiere nei prossimi giorni con corso scaduto!`,
                        azione: 'Verifica Matrice',
                        tipo: 'formazione',
                        navTo: 'sicurezza'
                     });
                 }
            });
        });

        const dpiAssegnati = (data.attrezzature || []).filter(a => 
            a.categoria === 'DPI' && 
            (operativiSettimanaIds.has(a.assegnatoA) || operativiSettimanaIds.has(a.userId))
        );

        dpiAssegnati.forEach(dpi => {
            if (dpi.dataScadenza && parseDateRobust(dpi.dataScadenza)?.getTime() < todayTimestamp) {
                const utente = (data.users || []).find(u => u.id === (dpi.assegnatoA || dpi.userId));
                const nomeCompleto = utente ? `${utente.nome} ${utente.cognome}` : 'Operatore';

                allarmiGenerali.push({
                    id: `dpi_${dpi.id}`,
                    cantiereId: null,
                    nomeCantiere: 'Personale in Cantiere',
                    categoria: 'SICUREZZA DPI',
                    titolo: `DPI in Uso Scaduto`,
                    descrizione: `${nomeCompleto} andrà in cantiere nei prossimi giorni con DPI scaduto (${dpi.nome}).`,
                    azione: 'Verifica DPI',
                    tipo: 'dpi',
                    navTo: 'sicurezza'
                });
            }
        });


        // --- 4. RDO E RAPPORTINI E ORDINI ---
        let rdoInAttesa = 0, rdoDaValutare = 0;
        const myRdoList = [];
        (data.preventivi_fornitori || data.richieste_offerta || []).forEach(rdo => {
            if (myCantieriIds.includes(rdo.cantiereId)) {
                const statoRdo = (rdo.stato || '').toLowerCase().trim();
                if (['in_attesa', 'inviata', 'bozza'].includes(statoRdo)) rdoInAttesa++;
                else if (['risposto', 'ricevuta', 'da_valutare'].includes(statoRdo)) {
                    rdoDaValutare++;
                    myRdoList.push(rdo);
                }
            }
        });

        const ultimiRapportini = (data.reports || [])
            .filter(r => myCantieriIds.includes(r.cantiereId))
            .sort((a, b) => (parseDateRobust(b.data || b.createdAt)?.getTime() || 0) - (parseDateRobust(a.data || a.createdAt)?.getTime() || 0))
            .slice(0, 5)
            .map(r => ({ ...r, nomeCantiere: myCantieri.find(c => c.id === r.cantiereId)?.nomeCantiere || 'Sconosciuto', dataParsed: parseDateRobust(r.data || r.createdAt) }));

        const ordiniInArrivo = (data.ordini_acquisto || [])
            .filter(o => myCantieriIds.includes(o.cantiereId) && ['in_attesa', 'in_attesa_di_consegna', 'parziale', 'spedito', 'confermato'].includes((o.stato || '').toLowerCase().trim()))
            .sort((a, b) => (parseDateRobust(b.dataCreazione || b.dataPrevistaConsegna)?.getTime() || 0) - (parseDateRobust(a.dataCreazione || a.dataPrevistaConsegna)?.getTime() || 0))
            .slice(0, 5)
            .map(o => ({ ...o, nomeCantiere: myCantieri.find(c => c.id === o.cantiereId)?.nomeCantiere || 'Sconosciuto' }));

        const myEventsToday = (data.eventi || [])
            .filter(e => {
                const isAssigned = (e.partecipanti || []).some(p => p.userId === currentUserId) || e.assegnatoA === currentUserId;
                const start = parseDateRobust(e.start);
                return isAssigned && start && start.setHours(0,0,0,0) === today.getTime();
            })
            .sort((a, b) => new Date(a.start) - new Date(b.start));

        // --- 5. BACHECA AZIENDALE ---
        // Cerchiamo le notifiche globali, o le circolari
        const messaggiBacheca = (data.notifiche || data.note_operative || data.noteOperative || [])
            .filter(n => n.globale === true || n.isBroadcast === true || n.tipo === 'bacheca' || n.tipo === 'circolare')
            .sort((a, b) => (parseDateRobust(b.createdAt || b.data)?.getTime() || 0) - (parseDateRobust(a.createdAt || a.data)?.getTime() || 0))
            .slice(0, 4);

        return {
            activeCantieri,
            cantieriDaChiudere,
            allarmiGenerali,
            rdoInAttesa,
            rdoDaValutare,
            myRdoList,
            myEventsToday,
            ultimiRapportini,
            ordiniInArrivo,
            operativiOggi,
            operativiSettimana,
            presenzeNeiCantieri,
            fasiInScadenza,
            messaggiBacheca
        };

    }, [data, currentUserId]);


    const vaiAlCantiere = (cantiereId, targetTab = 'info') => {
        if (setCantiereSelezionatoId) {
            setCantiereSelezionatoId(cantiereId);
        }
        localStorage.setItem('selectedCantiereId', cantiereId);
        localStorage.setItem('cantiereActiveTab', targetTab);
        onNavigate('gestione-operativa');
    };

    const gestisciAllarmeSmart = (allarme) => {
        if (allarme.tipo === 'budget') {
            vaiAlCantiere(allarme.cantiereId, 'analisi_commessa');
        } 
        else if (allarme.tipo === 'sicurezza') {
            localStorage.setItem('sicurezzaPreselectCantiereId', allarme.cantiereId);
            localStorage.setItem('sicurezzaActiveTab', 'pos');
            onNavigate('sicurezza'); 
        }
        else if (allarme.tipo === 'formazione') {
            localStorage.setItem('sicurezzaActiveTab', 'formazione');
            onNavigate('sicurezza'); 
        }
        else if (allarme.tipo === 'dpi') {
            localStorage.setItem('sicurezzaActiveTab', 'dpi');
            onNavigate('sicurezza'); 
        }
    };


    const activeForzaLavoro = workforceTab === 'oggi' ? stats.operativiOggi : stats.operativiSettimana;

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-full animate-fade-in">
            {/* Intestazione */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                    Dashboard Direzione Lavori
                </h1>
                <p className="text-lg text-slate-500 mt-1 font-medium">
                    Bentornato, {user?.nome || 'Tecnico'}. Supervisione diretta delle tue commesse.
                </p>
            </div>

            {/* --- ALLARMI E AZIONI PRINCIPALI (TOP ROW) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <ActionItem count={stats.activeCantieri.length} label="Cantieri Attivi" subLabel="Commesse sotto la tua gestione" colorClass={stats.activeCantieri.length > 0 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-slate-200 text-slate-500"} linkLabel="Vedi Archivio" onNavigate={() => onNavigate('gestione-operativa')} icon={<BuildingOfficeIcon className="h-24 w-24" />} />
                <ActionItem count={stats.operativiOggi.length} label="Squadre in Campo" subLabel="Nei tuoi cantieri oggi" colorClass={stats.operativiOggi.length > 0 ? "bg-green-600 text-white shadow-lg shadow-green-200" : "bg-green-500 text-white opacity-80"} linkLabel="Vedi Programmazione" onNavigate={() => onNavigate('programmazione')} icon={<UsersIcon className="h-24 w-24" />} />
                <ActionItem count={stats.allarmiGenerali.length} label="Anomalie Rilevate" subLabel="Cantieri che richiedono attenzione" colorClass={stats.allarmiGenerali.length > 0 ? "bg-red-600 text-white shadow-lg shadow-red-200 animate-pulse" : "bg-slate-200 text-slate-500"} linkLabel="Vedi Dettagli" onNavigate={null} icon={<ExclamationTriangleIcon className="h-24 w-24" />} />
                <ActionItem count={stats.cantieriDaChiudere.length} label="Da Chiudere / SAL" subLabel="Lavori terminati o in collaudo" colorClass={stats.cantieriDaChiudere.length > 0 ? "bg-amber-500 text-white shadow-lg shadow-amber-200" : "bg-slate-200 text-slate-500"} linkLabel="Vedi Contabilità Cantiere" onNavigate={() => onNavigate('gestione-operativa')} icon={<ClipboardDocumentCheckIcon className="h-24 w-24" />} />
            </div>

            {/* --- GRIGLIA PRINCIPALE --- */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* COLONNA SINISTRA E CENTRALE */}
                <div className="xl:col-span-2 space-y-6">
                    
                    {/* WIDGET FORZA LAVORO E MEZZI */}
                    <DashboardWidget 
                        title={`Forza Lavoro & Mezzi ${workforceTab === 'oggi' ? '(Oggi)' : '(7 Giorni)'}`} 
                        icon={<UsersIcon className="h-6 w-6 text-green-600" />}
                        headerRight={
                            <div className="flex bg-slate-200/50 p-1 rounded-lg">
                                <button 
                                    onClick={() => setWorkforceTab('oggi')} 
                                    className={`px-3 py-1 text-[10px] font-black uppercase rounded-md transition-colors ${workforceTab === 'oggi' ? 'bg-white shadow-sm text-green-700' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Oggi
                                </button>
                                <button 
                                    onClick={() => setWorkforceTab('settimana')} 
                                    className={`px-3 py-1 text-[10px] font-black uppercase rounded-md transition-colors ${workforceTab === 'settimana' ? 'bg-white shadow-sm text-green-700' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    7 Giorni
                                </button>
                            </div>
                        }
                    >
                        {activeForzaLavoro.length === 0 ? (
                            <div className="text-center py-6">
                                <UserIcon className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                                <p className="text-slate-500 font-medium">Nessuna squadra programmata per {workforceTab === 'oggi' ? 'oggi' : 'i prossimi 7 giorni'} sui tuoi cantieri.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {activeForzaLavoro.map((op, idx) => (
                                    <div key={`${op.id}_${idx}`} className="bg-white border border-green-200 p-4 rounded-xl shadow-sm relative overflow-hidden">
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-green-500"></div>
                                        <div className="pl-3 flex flex-col md:flex-row md:items-start justify-between gap-4">
                                            <div>
                                                {/* Se siamo nella vista 7 giorni mostriamo il badge data */}
                                                {workforceTab === 'settimana' && (
                                                    <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded border border-slate-200 mb-2">
                                                        📅 {op.dataInizio.toLocaleDateString('it-IT')} 
                                                        {op.dataInizio.getTime() !== op.dataFine.getTime() ? ` - ${op.dataFine.toLocaleDateString('it-IT')}` : ''}
                                                    </span>
                                                )}
                                                
                                                <h4 className="text-sm font-black text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors leading-tight" onClick={() => vaiAlCantiere(op.cantiereId)}>
                                                    {op.nomeCantiere}
                                                </h4>
                                                <p className="text-xs font-bold text-slate-500 mt-1">{op.descrizione}</p>
                                                
                                                {/* Personale */}
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {op.personale.map((nome, i) => (
                                                        <span key={i} className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-black uppercase rounded border border-green-100 flex items-center gap-1">
                                                            <UserIcon className="h-3 w-3"/> {nome}
                                                        </span>
                                                    ))}
                                                </div>
                                                
                                                {/* Mezzi / Furgoni */}
                                                {op.mezzi && op.mezzi.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {op.mezzi.map((mezzo, i) => (
                                                            <span key={`mezzo_${i}`} className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase rounded border border-amber-100 flex items-center gap-1">
                                                                <TruckIcon className="h-3 w-3"/> {mezzo}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <button onClick={() => vaiAlCantiere(op.cantiereId, 'info')} className="shrink-0 text-[10px] bg-slate-100 text-slate-600 font-bold uppercase px-3 py-2 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors">
                                                Apri Fascicolo
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </DashboardWidget>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* WIDGET FASI IN SCADENZA GANTT */}
                        <DashboardWidget title="Fasi in Scadenza (7 Giorni)" icon={<ClockIcon className="h-6 w-6 text-orange-500" />}>
                            {stats.fasiInScadenza.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">Nessuna fase di lavoro in chiusura imminente.</p>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {stats.fasiInScadenza.map((fase, idx) => {
                                        const isScaduta = fase.dataFine < new Date();
                                        return (
                                            <li key={`${fase.id}_${idx}`} className="py-3 group">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="font-bold text-slate-800 text-sm leading-tight cursor-pointer hover:text-indigo-600" onClick={() => vaiAlCantiere(fase.cantiereId, 'info')}>{fase.nomeCantiere}</div>
                                                    <div className={`text-[10px] px-2 py-0.5 rounded font-black uppercase whitespace-nowrap ${isScaduta ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-800'}`}>
                                                        {fase.dataFine.toLocaleDateString('it-IT')}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium">{fase.titolo}</div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </DashboardWidget>

                        <DashboardWidget title="Stato Avanzamento Cantieri" icon={<BuildingOfficeIcon className="h-6 w-6 text-indigo-600" />}>
                            {stats.activeCantieri.length === 0 ? (
                                <p className="text-slate-500 text-center py-4">Nessun cantiere in gestione.</p>
                            ) : (
                                <div className="space-y-3">
                                    {stats.activeCantieri.map(cantiere => {
                                        const isScaduto = cantiere.dataFinePresunta && new Date(cantiere.dataFinePresunta) < new Date();
                                        return (
                                            <div key={cantiere.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl hover:shadow-md transition-shadow flex flex-col gap-2">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="text-sm font-black text-slate-900 cursor-pointer hover:text-indigo-600 truncate" onClick={() => vaiAlCantiere(cantiere.id)}>
                                                        {cantiere.nomeCantiere || cantiere.nome}
                                                    </h4>
                                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${isScaduto ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                        {isScaduto ? 'IN RITARDO' : 'IN CORSO'}
                                                    </span>
                                                </div>
                                                <button onClick={() => vaiAlCantiere(cantiere.id)} className="text-[10px] font-bold text-indigo-600 uppercase hover:underline text-left">
                                                    Vedi Dettagli
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </DashboardWidget>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DashboardWidget title="Ultimi Rapportini Ricevuti" icon={<ClipboardDocumentListIcon className="h-6 w-6 text-indigo-500" />}>
                            {stats.ultimiRapportini.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">Nessun rapportino ricevuto di recente.</p>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {stats.ultimiRapportini.map(rep => (
                                        <li key={rep.id} className="py-3 flex justify-between items-center group">
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm truncate max-w-[200px] cursor-pointer hover:text-indigo-600" onClick={() => vaiAlCantiere(rep.cantiereId, 'reports')}>{rep.nomeCantiere}</div>
                                                <div className="text-xs text-slate-500 font-medium">Da: {rep.nomeUtente || 'Squadra'}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-black text-indigo-600">{rep.dataParsed ? rep.dataParsed.toLocaleDateString('it-IT') : 'N/D'}</div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </DashboardWidget>

                        <DashboardWidget title="Materiale in Arrivo (ODA)" icon={<TruckIcon className="h-6 w-6 text-emerald-500" />}>
                            {stats.ordiniInArrivo.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">Nessuna consegna in sospeso.</p>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {stats.ordiniInArrivo.map(ordine => (
                                        <li key={ordine.id} className="py-3 group">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="font-bold text-slate-800 text-sm truncate max-w-[150px]">{ordine.fornitoreNome}</div>
                                                <div className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black uppercase">{ordine.stato.replace(/_/g, ' ')}</div>
                                            </div>
                                            <div className="text-xs text-slate-500 font-medium cursor-pointer hover:text-indigo-600" onClick={() => vaiAlCantiere(ordine.cantiereId)}>Per: {ordine.nomeCantiere}</div>
                                            <div className="text-[10px] font-bold text-indigo-600 mt-1 cursor-pointer hover:underline" onClick={() => onNavigate('ordini-acquisto')}>
                                                Vedi Ordine: {ordine.numeroOrdine || 'N/D'}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </DashboardWidget>
                    </div>

                </div>

                {/* COLONNA DESTRA: BACHECA E ALLARMI */}
                <div className="xl:col-span-1 space-y-6">
                    
                    {/* 🌟 NUOVO WIDGET: BACHECA AZIENDALE */}
                    <DashboardWidget title="Bacheca Aziendale" icon={<MegaphoneIcon className="h-6 w-6 text-blue-500" />}>
                        {stats.messaggiBacheca.length === 0 ? (
                            <div className="text-center py-4">
                                <MegaphoneIcon className="h-8 w-8 mx-auto text-slate-200 mb-2" />
                                <p className="text-sm text-slate-500">Nessun nuovo avviso dalla direzione.</p>
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
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </DashboardWidget>

                    <DashboardWidget title="Anomalie Rilevate" icon={<ExclamationTriangleIcon className="h-6 w-6 text-red-500" />}>
                        {stats.allarmiGenerali.length === 0 ? (
                            <div className="text-center py-4">
                                <ShieldExclamationIcon className="h-8 w-8 mx-auto text-emerald-200 mb-2" />
                                <p className="text-sm text-emerald-600 font-bold">Cantieri Perfetti! Nessuna anomalia.</p>
                            </div>
                        ) : (
                            <ul className="space-y-4">
                                {stats.allarmiGenerali.map(allarme => {
                                    let bgClass = 'bg-red-50/50 border-red-200';
                                    let tagClass = 'bg-red-200 text-red-800';
                                    let btnClass = 'bg-red-600 text-white hover:bg-red-700';

                                    if (allarme.tipo === 'budget') {
                                        bgClass = 'bg-orange-50/50 border-orange-200';
                                        tagClass = 'bg-orange-200 text-orange-800';
                                        btnClass = 'bg-orange-500 text-white hover:bg-orange-600';
                                    } else if (allarme.tipo === 'formazione') {
                                        bgClass = 'bg-purple-50/50 border-purple-200';
                                        tagClass = 'bg-purple-200 text-purple-800';
                                        btnClass = 'bg-purple-600 text-white hover:bg-purple-700';
                                    }

                                    return (
                                        <li key={allarme.id} className={`flex flex-col p-4 border rounded-2xl relative overflow-hidden ${bgClass}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-full ${tagClass}`}>
                                                    {allarme.categoria}
                                                </span>
                                            </div>
                                            
                                            <div className="font-black text-slate-900 text-sm mb-1 leading-tight">
                                                {allarme.nomeCantiere}
                                            </div>
                                            
                                            <div className="text-xs text-slate-700 font-medium mb-3">
                                                <span className="font-bold">{allarme.titolo}:</span> {allarme.descrizione}
                                            </div>
                                            
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

                    <DashboardWidget title="Preventivi (RDO) in Attesa" icon={<EnvelopeOpenIcon className="h-6 w-6 text-emerald-600" />}>
                        {stats.myRdoList.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">Nessun preventivo materiale in attesa di tua valutazione.</p>
                        ) : (
                            <ul className="divide-y divide-slate-100 space-y-2">
                                {stats.myRdoList.map(rdo => (
                                    <li key={rdo.id} className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl hover:shadow-sm transition-shadow">
                                        <div className="font-bold text-emerald-900 text-sm leading-tight mb-1">{rdo.titolo}</div>
                                        <div className="text-[10px] text-emerald-700 font-black uppercase tracking-wider cursor-pointer hover:underline" onClick={() => vaiAlCantiere(rdo.cantiereId)}>CANTIERE: {rdo.cantiereNome}</div>
                                        <button 
                                            onClick={() => {
                                                localStorage.setItem('rdoFilter', 'da_valutare');
                                                onNavigate('richieste-offerta');
                                            }}
                                            className="mt-3 text-[10px] font-black uppercase bg-emerald-600 text-white px-3 py-1.5 rounded w-full hover:bg-emerald-700 transition-colors"
                                        >
                                            Valuta e Aggiudica
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </DashboardWidget>
                </div>

            </div>
        </div>
    );
};