import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useFirebaseData } from 'shared-core';
import { 
    ChartBarIcon, GlobeEuropeAfricaIcon, PresentationChartLineIcon, 
    TrophyIcon, ExclamationTriangleIcon, ArrowPathIcon, CheckBadgeIcon, FolderIcon
} from '@heroicons/react/24/solid';

export const BigDataAnalytics = () => {
    const { db, userRole, companyID } = useFirebaseData();
    const [isLoading, setIsLoading] = useState(true);
    const [rawReports, setRawReports] = useState([]);
    
    // 🌟 I NOSTRI DUE DIZIONARI DI TRADUZIONE
    const [masterDict, setMasterDict] = useState({}); 
    const [wbsDict, setWbsDict] = useState({});

    // Sicurezza: Solo il super admin può vedere questo
    const isSuperAdmin = userRole === 'proprietario' && !companyID;

    useEffect(() => {
        const fetchAllData = async () => {
            if (!isSuperAdmin || !db) return;
            
            setIsLoading(true);
            try {
                // 1. Peschiamo TUTTI i report da Firebase
                const snapReports = await getDocs(collection(db, 'reports'));
                const reportsData = [];
                snapReports.forEach(doc => reportsData.push({ id: doc.id, ...doc.data() }));
                setRawReports(reportsData);

                // 2. DIZIONARIO A: Voci Master (listini_aziendali)
                const qMaster = query(collection(db, 'listini_aziendali'), where('isMaster', '==', true));
                const snapMaster = await getDocs(qMaster);
                const dictM = {};
                snapMaster.forEach(doc => { dictM[doc.id] = doc.data(); });
                setMasterDict(dictM);

                // 3. DIZIONARIO B: Nodi WBS (Per recuperare i report dei vecchi test!)
                const snapWbs = await getDocs(collection(db, 'wbs_nodes'));
                const dictW = {};
                snapWbs.forEach(doc => { dictW[doc.id] = doc.data(); });
                setWbsDict(dictW);

            } catch (error) {
                console.error("Errore nel recupero dei Big Data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllData();
    }, [db, isSuperAdmin]);

    // 🧠 MOTORE DI TRADUZIONE E AGGREGAZIONE
    const analyticsData = useMemo(() => {
        if (!rawReports.length) return [];

        const masterDataMap = {};

        rawReports.forEach(report => {
            const companyId = report.companyID || 'Azienda Sconosciuta';
            const lavorazioni = report.datiRiepilogo?.lavorazioni || [];

            lavorazioni.forEach(lav => {
                const hasMasterId = !!lav.masterId;
                const key = hasMasterId ? lav.masterId : `CUSTOM_${lav.descrizione?.trim().toLowerCase()}`;
                
                // Inizializza il record se non esiste
                if (!masterDataMap[key]) {
                    
                    let codiceDisplay = 'CUSTOM';
                    let descDisplay = lav.descrizione || 'Senza Descrizione';
                    let dataType = 'custom'; // 'custom' | 'master' | 'wbs_legacy'

                    if (hasMasterId) {
                        const masterNode = masterDict[lav.masterId];
                        const wbsNode = wbsDict[lav.masterId];

                        if (masterNode) {
                            // 🌟 TROVATO NEL LISTINO MASTER UFFICIALE
                            dataType = 'master';
                            codiceDisplay = masterNode.codice || 'COD-MANCANTE';
                            descDisplay = masterNode.descrizione || lav.descrizione;
                        } else if (wbsNode) {
                            // 🌟 TROVATO NELL'ALBERO WBS (Report creati durante i nostri test!)
                            dataType = 'wbs_legacy';
                            codiceDisplay = 'NODO WBS';
                            descDisplay = wbsNode.nome || lav.descrizione;
                        } else {
                            // 🌟 ORFANO / NON TROVATO
                            codiceDisplay = lav.masterCodice || `ID: ${lav.masterId.substring(0,8)}...`;
                            descDisplay = lav.masterDescrizione || lav.descrizione;
                        }
                    }

                    masterDataMap[key] = {
                        masterId: key,
                        codiceDisplay,
                        descrizioneDisplay: descDisplay,
                        dataType,
                        um: lav.um || lav.unitaMisura || 'nd',
                        totaleOre: 0,
                        totaleQta: 0,
                        aziendeCoinvolte: new Set(),
                        statisticheAziende: {} 
                    };
                }

                const ore = Number(lav.oreDedicate) || 0;
                const qta = Number(lav.quantitaProdotta) || 0;

                masterDataMap[key].totaleOre += ore;
                masterDataMap[key].totaleQta += qta;
                masterDataMap[key].aziendeCoinvolte.add(companyId);

                if (!masterDataMap[key].statisticheAziende[companyId]) {
                    masterDataMap[key].statisticheAziende[companyId] = { ore: 0, qta: 0 };
                }
                masterDataMap[key].statisticheAziende[companyId].ore += ore;
                masterDataMap[key].statisticheAziende[companyId].qta += qta;
            });
        });

        // 🧮 Calcolo Rese Medie
        const finalStats = Object.values(masterDataMap).map(item => {
            const resaMediaGlobale = item.totaleOre > 0 ? (item.totaleQta / item.totaleOre) : 0;
            
            let resaMax = 0;
            let resaMin = Infinity;

            Object.values(item.statisticheAziende).forEach(statsAz => {
                if (statsAz.ore > 0) {
                    const resaAz = statsAz.qta / statsAz.ore;
                    if (resaAz > resaMax) resaMax = resaAz;
                    if (resaAz < resaMin) resaMin = resaAz;
                }
            });

            if (resaMin === Infinity) resaMin = 0;

            return {
                ...item,
                numeroAziende: item.aziendeCoinvolte.size,
                resaMediaGlobale,
                resaMax,
                resaMin
            };
        });

        return finalStats.sort((a, b) => b.totaleOre - a.totaleOre);

    }, [rawReports, masterDict, wbsDict]);


    if (!isSuperAdmin) {
        return (
            <div className="p-10 flex flex-col items-center justify-center text-slate-500">
                <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold">Accesso Negato</h2>
                <p>Questa dashboard è riservata al Super-Amministratore del sistema SaaS.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-indigo-600">
                <ArrowPathIcon className="h-12 w-12 animate-spin mb-4" />
                <p className="font-bold">Analisi e Traduzione dei Big Data in corso...</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 animate-fade-in bg-slate-50 min-h-screen">
            
            {/* HEADER */}
            <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                <div className="p-3 bg-indigo-600 rounded-xl shadow-lg">
                    <GlobeEuropeAfricaIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Global Big Data Analytics</h1>
                    <p className="text-sm font-medium text-slate-500">Aggregazione dati SaaS inter-aziendale basata sulle Voci Master</p>
                </div>
            </div>

            {/* KPI GENERALI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><PresentationChartLineIcon className="h-8 w-8"/></div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Totale Report Analizzati</p>
                        <p className="text-2xl font-black text-slate-800">{rawReports.length}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><ChartBarIcon className="h-8 w-8"/></div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Lavorazioni Codificate</p>
                        <p className="text-2xl font-black text-slate-800">{analyticsData.length}</p>
                    </div>
                </div>
            </div>

            {/* TABELLA DATI AGGREGATI */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <ChartBarIcon className="h-5 w-5 text-indigo-600" /> Rese di Produzione Nazionali
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-white">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Identificativo Globale</th>
                                <th className="px-6 py-4 text-center text-xs font-black text-slate-500 uppercase tracking-wider">Aziende<br/>Coinvolte</th>
                                <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-wider">Totale<br/>Ore Reg.</th>
                                <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-wider">Totale<br/>Produzione</th>
                                <th className="px-6 py-4 text-right text-xs font-black text-indigo-600 uppercase tracking-wider bg-indigo-50/50">Resa Media<br/>(Qtà / Ora)</th>
                                <th className="px-6 py-4 text-right text-xs font-black text-emerald-600 uppercase tracking-wider">Top Perf.<br/>(Resa Max)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {analyticsData.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 italic">
                                        Nessun dato strutturato trovato. Le aziende devono iniziare a compilare i report di fine giornata.
                                    </td>
                                </tr>
                            ) : (
                                analyticsData.map((item) => (
                                    <tr key={item.masterId} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                {/* Etichetta Colorata in base al tipo di dato */}
                                                {item.dataType === 'master' && (
                                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded border border-indigo-200 flex items-center gap-1 uppercase">
                                                        <CheckBadgeIcon className="h-3 w-3" /> Master
                                                    </span>
                                                )}
                                                {item.dataType === 'wbs_legacy' && (
                                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-black rounded border border-purple-200 flex items-center gap-1 uppercase">
                                                        <FolderIcon className="h-3 w-3" /> Nodo WBS
                                                    </span>
                                                )}
                                                {item.dataType === 'custom' && (
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded border border-amber-200 uppercase">
                                                        Custom
                                                    </span>
                                                )}
                                                
                                                <span className={`text-sm font-black ${item.dataType === 'custom' ? 'text-amber-700' : 'text-indigo-900'}`}>
                                                    {item.codiceDisplay}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 font-medium max-w-md line-clamp-2" title={item.descrizioneDisplay}>
                                                {item.descrizioneDisplay}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                {item.numeroAziende}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium text-slate-700">
                                            {item.totaleOre.toFixed(1)} h
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">
                                            {item.totaleQta.toLocaleString('it-IT')} <span className="text-xs font-normal text-slate-500">{item.um}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right bg-indigo-50/30">
                                            <div className="text-lg font-black text-indigo-700">
                                                {item.resaMediaGlobale.toFixed(2)}
                                            </div>
                                            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                                                {item.um} / ora
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-1 text-sm font-black text-emerald-600">
                                                    <TrophyIcon className="h-4 w-4" />
                                                    {item.resaMax.toFixed(2)}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-medium mt-1">
                                                    (Minima: {item.resaMin.toFixed(2)})
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};