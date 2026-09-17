import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useFirebaseData } from 'shared-core';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { 
    PlusIcon, TrashIcon, CalculatorIcon, 
    MagnifyingGlassIcon, XMarkIcon, CheckCircleIcon, BoltIcon,
    TableCellsIcon, SparklesIcon, LockClosedIcon, 
    ArrowDownTrayIcon, ChartPieIcon, DocumentArrowUpIcon,
    CloudArrowUpIcon, RocketLaunchIcon 
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

import { SmartDescrizioneInput } from './SmartDescrizioneInput';
import { AnalisiCostiModal } from './AnalisiCostiModal';

export const PreventivoBuilderPro = ({ offertaId, righeIniziali = [], onSave, onRequestRDO }) => {
    
    const { db, userAziendaId, data } = useFirebaseData();

    // --- CONFIGURAZIONE E SETTINGS ---
    const companySettings = useMemo(() => (data?.companies || []).find(c => c.id === userAziendaId) || {}, [data?.companies, userAziendaId]);
    const isSuperAdmin = !userAziendaId; 
    const isPro = companySettings?.companyFeatures?.isPro === true || isSuperAdmin;

    const [showUpsell, setShowUpsell] = useState(false);
    
    // --- DATI PER ANALISI COSTI ---
    const magazzinoMateriali = useMemo(() => data?.magazzino || [], [data?.magazzino]);
    const tutteLeAttrezzature = data?.attrezzature || [];
    const magazzinoMezzi = useMemo(() => tutteLeAttrezzature.filter(a => {
        const cat = (a.categoria || '').toLowerCase();
        return cat === 'automezzo' || cat === 'macchina operatrice' || cat.includes('mezzo') || cat.includes('veicolo');
    }), [tutteLeAttrezzature]);

    const magazzinoAttrezzature = useMemo(() => tutteLeAttrezzature.filter(a => {
        const cat = (a.categoria || '').toLowerCase();
        return cat !== 'automezzo' && cat !== 'macchina operatrice' && !cat.includes('mezzo') && !cat.includes('veicolo');
    }), [tutteLeAttrezzature]);

    const subappaltatori = useMemo(() => data?.subappaltatori || [], [data?.subappaltatori]);
    const fornitori = useMemo(() => data?.fornitori || [], [data?.fornitori]);
    const noleggiatori = useMemo(() => data?.noleggiatori || [], [data?.noleggiatori]);

    const { ruoliAziendali, tariffeAziendali } = useMemo(() => {
        let tariffe = { ...(companySettings?.tariffeManodopera || companySettings?.tariffeAziendali || companySettings?.costiOrari || {}) };
        const users = data?.users || [];
        const raggruppamentoCosti = {}; 
        users.forEach(u => {
            const ruolo = u.ruolo || u.qualifica;
            const costo = Number(u.costoOrario) || Number(u.costoAziendale) || 0;
            if (ruolo && costo > 0) {
                if (!raggruppamentoCosti[ruolo]) raggruppamentoCosti[ruolo] = [];
                raggruppamentoCosti[ruolo].push(costo);
            }
        });
        Object.keys(raggruppamentoCosti).forEach(ruolo => {
            const esisteGia = Object.keys(tariffe).find(k => k.toLowerCase() === ruolo.toLowerCase());
            if (!esisteGia) {
                const somma = raggruppamentoCosti[ruolo].reduce((a, b) => a + b, 0);
                tariffe[ruolo] = somma / raggruppamentoCosti[ruolo].length; 
            }
        });
        const ruoli = [...new Set([...Object.keys(tariffe), ...users.map(u => u.ruolo || u.qualifica).filter(Boolean)])];
        return { ruoliAziendali: ruoli, tariffeAziendali: tariffe };
    }, [companySettings, data?.users]);

    const tuttiMateriali = useMemo(() => fornitori.flatMap(f => (f.listino || []).map(m => ({ ...m, fornitoreId: f.id, fornitoreNome: f.ragioneSociale }))), [fornitori]);
    const tuttiNoleggi = useMemo(() => noleggiatori.flatMap(n => (n.listino || []).map(m => ({ ...m, noleggiatoreId: n.id, noleggiatoreNome: n.ragioneSociale }))), [noleggiatori]);

    // --- STATI COMPONENTE ---
    const [righe, setRighe] = useState(righeIniziali);
    const [listinoDb, setListinoDb] = useState([]);
    const [isLoadingListino, setIsLoadingListino] = useState(false);

    const fileInputRef = useRef(null);
    const [showMapper, setShowMapper] = useState(false);
    const [excelRows, setExcelRows] = useState([]); 
    const [analyzingRigaId, setAnalyzingRigaId] = useState(null);
    
    const [mapConfig, setMapConfig] = useState({ 
        progressivo: -1, codice: 0, descrizione: 1, unitaMisura: 2, 
        quantita: 3, numeroInterventi: -1, prezzoOriginale: -1, 
        prezzoTotale: -1, prezzoSenzaManodopera: -1, incidenzaManodopera: -1, listino: -1 
    });

    // 🌟 UTILITY PULIZIA ESTREMA 🌟
    const puliziaEstrema = (str) => {
        if (!str) return '';
        return str.toString()
            .replace(/[^a-zA-Z0-9]/g, '') 
            .toLowerCase()
            .replace(/[o]/g, '0')         
            .replace(/[il]/g, '1');       
    };

    const puliziaTesto = (str) => {
        if (!str) return '';
        return str.toString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 35);
    };

    // 🌟 MOTORE DI RICERCA A TRIPLO FALLBACK 🌟
    const trovaMatch = (excelCodRaw, excelDescRaw) => {
        const exCod = puliziaEstrema(excelCodRaw);
        const exDesc = puliziaTesto(excelDescRaw);

        if (!exCod && !exDesc) return null;

        const matches = listinoDb.filter(item => {
            const dbCod = item.codicePulito;
            const dbDesc = item.descrizionePulita;

            if (exCod && dbCod && dbCod === exCod) return true;
            if (exCod && dbCod && exCod.length >= 12 && dbCod.length >= 12 && dbCod.slice(-12) === exCod.slice(-12)) return true;
            if (exCod && dbCod && exCod.length >= 8 && dbCod.length >= 8 && (dbCod.includes(exCod) || exCod.includes(dbCod))) return true;
            if (exDesc && dbDesc && exDesc.length > 20 && dbDesc.length > 20 && (dbDesc.includes(exDesc) || exDesc.includes(dbDesc))) return true;

            return false;
        });

        if (matches.length === 0) return null;

        let bestMatch = matches.find(m => m.isMaster);
        if (!bestMatch) bestMatch = matches.find(m => m.masterId);
        if (!bestMatch) bestMatch = matches[0];

        return bestMatch;
    };

    // --- CARICAMENTO LISTINI CON CACHING DELLE STRINGHE PULITE ---
    const fetchListino = async () => {
        if (listinoDb.length > 0) return listinoDb;
        setIsLoadingListino(true);
        try {
            const queryIds = ['GLOBAL_MASTER'];
            if (userAziendaId) queryIds.push(userAziendaId);

            const qListini = query(collection(db, 'listini_aziendali'), where('companyID', 'in', queryIds));
            const snapshotListini = await getDocs(qListini);
            
            let vociListini = [];
            snapshotListini.docs.forEach(doc => {
                const data = doc.data();
                const arrayVoci = data.listino || data.voci || data.articoli || data.items;
                
                if (Array.isArray(arrayVoci)) {
                    arrayVoci.forEach(item => {
                        const codiceReale = item.codice || item.tariffa || item.codiceArticolo || item.codiceTariffa;
                        if (codiceReale) {
                            vociListini.push({ 
                                ...item, 
                                codice: codiceReale, 
                                codicePulito: puliziaEstrema(codiceReale),
                                descrizionePulita: puliziaTesto(item.descrizione || item.descrizioneEstesa || item.nome || ''),
                                listinoSource: data.nomeListino || data.nome || doc.id 
                            });
                        }
                    });
                } else {
                    const codiceReale = data.codice || data.tariffa || data.codiceArticolo;
                    if (codiceReale) {
                        vociListini.push({ 
                            id: doc.id, 
                            ...data, 
                            codice: codiceReale,
                            codicePulito: puliziaEstrema(codiceReale),
                            descrizionePulita: puliziaTesto(data.descrizione || data.descrizioneEstesa || data.nome || ''),
                            listinoSource: data.nomeListino || data.nome || doc.id
                        });
                    }
                }
            });

            const qMaster = query(collection(db, 'master_universali'), where('companyID', 'in', queryIds));
            const snapshotMaster = await getDocs(qMaster);
            const dataMaster = snapshotMaster.docs.map(doc => {
                const d = doc.data();
                return { 
                    id: doc.id, 
                    isMaster: true, 
                    ...d,
                    codicePulito: puliziaEstrema(d.codice),
                    descrizionePulita: puliziaTesto(d.descrizione || d.nome || ''),
                    listinoSource: 'Master Universitario'
                };
            });
            
            const combined = [...vociListini, ...dataMaster];
            setListinoDb(combined);
            return combined;
        } catch (error) { 
            console.error("Errore listino:", error); 
            return []; 
        } finally { 
            setIsLoadingListino(false); 
        }
    };

    useEffect(() => { fetchListino(); }, []);

    // --- LOGICA DI CALCOLO E UTILITY ---
    const pulisciPrezzo = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return parseFloat(val.toString().replace(/\./g, '').replace(',', '.')) || 0;
    };

    const aggiungiRigaManuale = async () => {
        const nuovaRiga = { 
            id: 'manual_' + Date.now() + Math.random(), 
            progressivo: '', 
            prezzoGaraOriginale: 0, 
            prezzoSenzaManodopera: 0,
            incidenzaManodopera: 0,
            listinoRefId: null, 
            codice: 'CUSTOM', 
            descrizione: '', 
            unitaMisura: 'cad', 
            quantita: 1, 
            numeroInterventi: 1, 
            costoUnitarioBase: 0, 
            scontoProposto: 0, 
            marginePercentuale: 100, 
            prezzoVenditaUnitario: 0, 
            isMaster: false, 
            masterId: null, 
            analisiCosti: null 
        };
        setRighe([...righe, nuovaRiga]);
    };

    const rimuoviRiga = (id) => {
        setRighe(prev => prev.filter(r => r.id !== id));
    };

    const aggiornaDatiRiga = (id, updates) => {
        setRighe(prev => prev.map(riga => {
            if (riga.id !== id) return riga;
            let rAgg = { ...riga, ...updates };
            
            const costo = Number(rAgg.costoUnitarioBase) || 0;
            const bando = Number(rAgg.prezzoGaraOriginale) || 0;

            if (updates.scontoProposto !== undefined) {
                const sconto = Number(updates.scontoProposto) || 0;
                rAgg.prezzoVenditaUnitario = bando - (bando * (sconto / 100));
                rAgg.marginePercentuale = costo > 0 ? ((rAgg.prezzoVenditaUnitario - costo) / costo) * 100 : 100;
            } else if (updates.marginePercentuale !== undefined) {
                const margine = Number(updates.marginePercentuale) || 0;
                rAgg.prezzoVenditaUnitario = costo + (costo * (margine / 100));
                rAgg.scontoProposto = bando > 0 ? ((bando - rAgg.prezzoVenditaUnitario) / bando) * 100 : 0;
            } else if (updates.prezzoVenditaUnitario !== undefined || updates.costoUnitarioBase !== undefined || updates.prezzoGaraOriginale !== undefined) {
                const vendita = Number(rAgg.prezzoVenditaUnitario) || 0;
                rAgg.scontoProposto = bando > 0 ? ((bando - vendita) / bando) * 100 : 0;
                rAgg.marginePercentuale = costo > 0 ? ((vendita - costo) / costo) * 100 : 100;
            }
            return rAgg;
        }));
    };

    // --- GESTIONE EXCEL ---
    const handleLeggiExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (listinoDb.length === 0) await fetchListino();
        const reader = new FileReader();
        reader.onload = (evento) => {
            const data = new Uint8Array(evento.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const righeGrezze = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
            const righePulite = righeGrezze.filter(r => r.length > 0 && r.some(cell => cell !== undefined && cell !== ''));
            setExcelRows(righePulite);
            
            setMapConfig({ 
                progressivo: -1, codice: 0, descrizione: 1, unitaMisura: 2, 
                quantita: 3, numeroInterventi: -1, prezzoOriginale: -1, 
                prezzoTotale: -1, prezzoSenzaManodopera: -1, incidenzaManodopera: -1, listino: -1 
            });
            setShowMapper(true); 
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsArrayBuffer(file);
    };

    const confermaImportazione = () => {
        const nuoveRigheMatchate = [];
        excelRows.forEach((rigaExcel) => {
            const progressivoLetto = mapConfig.progressivo >= 0 ? rigaExcel[mapConfig.progressivo]?.toString().trim() : '';
            
            let prezzoOriginaleLetto = mapConfig.prezzoOriginale >= 0 ? pulisciPrezzo(rigaExcel[mapConfig.prezzoOriginale]) : 0;
            let prezzoTotaleLetto = mapConfig.prezzoTotale >= 0 ? pulisciPrezzo(rigaExcel[mapConfig.prezzoTotale]) : 0;
            
            let prezzoSenzaManodoperaLetto = mapConfig.prezzoSenzaManodopera >= 0 ? pulisciPrezzo(rigaExcel[mapConfig.prezzoSenzaManodopera]) : 0;
            let incidenzaManodoperaLetta = mapConfig.incidenzaManodopera >= 0 ? pulisciPrezzo(rigaExcel[mapConfig.incidenzaManodopera]) : 0;

            const codiceLettoRaw = mapConfig.codice >= 0 ? rigaExcel[mapConfig.codice] : '';
            const descrizioneLettaRaw = mapConfig.descrizione >= 0 ? rigaExcel[mapConfig.descrizione] : '';
            
            const umLetta = mapConfig.unitaMisura >= 0 ? rigaExcel[mapConfig.unitaMisura]?.toString().trim() : '';
            let quantitaLetta = mapConfig.quantita >= 0 ? pulisciPrezzo(rigaExcel[mapConfig.quantita]) : 0;
            let interventiLetti = mapConfig.numeroInterventi >= 0 ? pulisciPrezzo(rigaExcel[mapConfig.numeroInterventi]) : 1;
            if (interventiLetti === 0) interventiLetti = 1;

            if ((codiceLettoRaw || descrizioneLettaRaw) && !isNaN(quantitaLetta) && quantitaLetta > 0) {
                
                const voceTrovataDb = trovaMatch(codiceLettoRaw, descrizioneLettaRaw);
                let voceMasterAssociata = null;

                // 🌟 INIZIO EREDITARIETA' DATI DATABASE 🌟
                if (voceTrovataDb) {
                    if (voceTrovataDb.isMaster) voceMasterAssociata = voceTrovataDb;
                    else if (voceTrovataDb.masterId) voceMasterAssociata = listinoDb.find(m => m.id === voceTrovataDb.masterId);
                    
                    // Se l'Excel non aveva questi dati, LI COPIAMO DAL DATABASE!
                    if (!prezzoSenzaManodoperaLetto && voceTrovataDb.prezzoPuro) {
                        prezzoSenzaManodoperaLetto = Number(voceTrovataDb.prezzoPuro);
                    }
                    if (!incidenzaManodoperaLetta && voceTrovataDb.incidenzaManodopera) {
                        incidenzaManodoperaLetta = Number(voceTrovataDb.incidenzaManodopera);
                    }
                }

                // Se la voce del listino era orfana di dati, proviamo a pescarli dal Master collegato
                if (voceMasterAssociata) {
                    if (!prezzoSenzaManodoperaLetto && voceMasterAssociata.prezzoPuro) {
                        prezzoSenzaManodoperaLetto = Number(voceMasterAssociata.prezzoPuro);
                    }
                    if (!incidenzaManodoperaLetta && voceMasterAssociata.incidenzaManodopera) {
                        incidenzaManodoperaLetta = Number(voceMasterAssociata.incidenzaManodopera);
                    }
                }
                // 🌟 FINE EREDITARIETA' 🌟

                let prezzoBandoReale = 0;
                if (prezzoOriginaleLetto > 0) {
                    prezzoBandoReale = prezzoOriginaleLetto;
                } else if (prezzoTotaleLetto > 0) {
                    prezzoBandoReale = prezzoTotaleLetto / (quantitaLetta * (interventiLetti || 1));
                }
                
                const costoBaseReale = 0; 
                const margineIniziale = costoBaseReale > 0 ? ((prezzoBandoReale - costoBaseReale) / costoBaseReale) * 100 : 100;

                nuoveRigheMatchate.push({ 
                    id: (voceTrovataDb ? 'match_' : 'nomatch_') + Date.now() + Math.random(), 
                    progressivo: progressivoLetto, 
                    prezzoGaraOriginale: prezzoBandoReale, 
                    prezzoSenzaManodopera: prezzoSenzaManodoperaLetto,
                    incidenzaManodopera: incidenzaManodoperaLetta, 
                    listinoRefId: voceTrovataDb?.id || null, 
                    codice: voceTrovataDb?.codice || codiceLettoRaw?.toString().trim() || '', 
                    descrizione: voceTrovataDb?.descrizione || descrizioneLettaRaw?.toString() || 'Voce importata', 
                    unitaMisura: umLetta || voceTrovataDb?.unitaMisura || 'cad', 
                    quantita: quantitaLetta, 
                    numeroInterventi: interventiLetti, 
                    costoUnitarioBase: costoBaseReale, 
                    scontoProposto: 0, 
                    marginePercentuale: margineIniziale, 
                    prezzoVenditaUnitario: prezzoBandoReale, 
                    isMaster: voceTrovataDb?.isMaster || false, 
                    masterId: voceMasterAssociata ? voceMasterAssociata.id : null, 
                    analisiCosti: null 
                });
            }
        });
        setRighe(prev => [...prev, ...nuoveRigheMatchate]);
        setShowMapper(false);
    };

    // --- RIEPILOGHI FINALI ---
    const { totaleCosti, totaleVendita, utileNetto, margineMedio, totaleGara } = useMemo(() => {
        let costi = 0, vendita = 0, gara = 0;
        righe.forEach(r => {
            const intv = Number(r.numeroInterventi) || 1;
            const qta = Number(r.quantita) || 0;
            costi += (Number(r.costoUnitarioBase) * qta * intv);
            vendita += (Number(r.prezzoVenditaUnitario) * qta * intv);
            gara += (Number(r.prezzoGaraOriginale) * qta * intv);
        });
        const utile = vendita - costi;
        return { 
            totaleCosti: costi, 
            totaleVendita: vendita, 
            utileNetto: utile, 
            margineMedio: costi > 0 ? (utile / costi) * 100 : 0, 
            totaleGara: gara 
        };
    }, [righe]);

    const headerCols = useMemo(() => {
        if (!excelRows.length) return [];
        return Array.from({ length: Math.max(...excelRows.slice(0, 10).map(r => r.length)) }, (_, i) => i);
    }, [excelRows]);

    return (
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden mt-6 animate-fade-in relative">
            
            {showUpsell && (
                <div className="fixed inset-0 z-[500] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white max-w-lg w-full rounded-[2.5rem] p-10 text-center shadow-2xl border border-indigo-100 animate-fade-in-up">
                        <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
                            <RocketLaunchIcon className="h-10 w-10 text-white" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Sblocca la Potenza Pro 🚀</h2>
                        <p className="text-slate-600 text-lg mb-8 leading-relaxed">
                            Stai inserendo i prezzi e cercando i fornitori a mano? Gli utenti <strong className="text-indigo-600">PRO</strong> recuperano i costi dallo storico aziendale in 1 click e generano Richieste di Offerta automatiche!
                        </p>
                        <div className="space-y-3">
                            <button onClick={() => window.location.href = '/impostazioni/abbonamento'} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3">
                                Passa al Pro Ora <StarIconSolid className="h-5 w-5 text-amber-400"/>
                            </button>
                            <button onClick={() => setShowUpsell(false)} className="w-full text-slate-400 py-3 font-bold hover:text-slate-600 transition-colors">
                                Magari più tardi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-3">
                        <CalculatorIcon className="h-6 w-6 text-indigo-400" /> Studio Tecnico ed Estimo
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Definisci il costo aziendale e calcola i margini.</p>
                </div>
                
                <div className="flex flex-wrap gap-3 items-center">
                    <button onClick={() => onSave(righe, { totaleCosti, totaleVendita, utileNetto }, true)} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md mr-4 border border-slate-600">
                        <CloudArrowUpIcon className="h-5 w-5 text-indigo-300" /> Salva Bozza
                    </button>
                    
                    {righe.length > 0 && (
                        <button 
                            onClick={() => window.confirm("Eliminare tutto il computo?") && setRighe([])} 
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-md bg-rose-100 text-rose-600 hover:bg-rose-200 border border-rose-200"
                        >
                            <TrashIcon className="h-5 w-5" /> Elimina Computo
                        </button>
                    )}

                    <input type="file" accept=".xlsx, .xls, .csv" ref={fileInputRef} onChange={handleLeggiExcel} style={{ display: 'none' }} />
                    <button 
                        onClick={() => fileInputRef.current.click()} 
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-colors shadow-md bg-emerald-500 hover:bg-emerald-400 text-white"
                    >
                        <DocumentArrowUpIcon className="h-5 w-5" /> Importa Computo (Excel)
                    </button>

                    <button onClick={aggiungiRigaManuale} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-md">
                        <PlusIcon className="h-5 w-5" /> Voce Manuale
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto pb-32">
                <table className="min-w-full divide-y divide-slate-200 border-b border-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-3 py-3 text-left text-[10px] font-black text-slate-500 uppercase min-w-[250px]">Codice & Descrizione Gara</th>
                            <th className="px-2 py-3 text-center text-[10px] font-black text-slate-500 uppercase">U.M.</th>
                            <th className="px-2 py-3 text-center text-[10px] font-black text-indigo-600 uppercase bg-indigo-50/50">Q.tà</th>
                            <th className="px-2 py-3 text-center text-[10px] font-black text-indigo-600 uppercase bg-indigo-50/50">N° Int.</th>
                            <th className="px-3 py-3 text-right text-[10px] font-black text-slate-500 uppercase">P. Bando (Unit)</th>
                            <th className="px-3 py-3 text-right text-[10px] font-black text-slate-800 uppercase bg-slate-100/50">Tot. Bando</th>
                            <th className="px-3 py-3 text-right text-[10px] font-black text-rose-600 uppercase bg-rose-50/50">Costo Az. (Unit)</th>
                            <th className="px-2 py-3 text-center text-[10px] font-black text-sky-600 uppercase bg-sky-50/50">Sconto %</th>
                            <th className="px-2 py-3 text-center text-[10px] font-black text-amber-600 uppercase bg-amber-50/50">Margine %</th>
                            <th className="px-3 py-3 text-right text-[10px] font-black text-emerald-600 uppercase bg-emerald-50/50">P. Offerto (Unit)</th>
                            <th className="px-3 py-3 text-right text-[10px] font-black text-slate-800 uppercase">Tot. Offerta</th>
                            <th className="px-2 py-3 text-center text-[10px] font-black text-slate-500 uppercase">X</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {righe.map(riga => {
                            
                            let costoStorico = null;
                            if (isPro && riga.listinoRefId) {
                                const itemMaster = listinoDb.find(m => m.id === riga.listinoRefId || (m.isMaster && m.codice === riga.codice));
                                if (itemMaster) {
                                    costoStorico = pulisciPrezzo(itemMaster.prezzoUnitario || itemMaster.costoStandard || itemMaster.costoUnitario);
                                }
                            }

                            return (
                            <tr key={riga.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-3 relative">
                                    <div className="flex items-center gap-2 mb-1">
                                        {riga.progressivo && <span className="text-[10px] font-black text-slate-400">#{riga.progressivo}</span>}
                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${riga.codice === 'CUSTOM' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{riga.codice}</span>
                                        {riga.masterId && <span className="flex items-center gap-1 text-[8px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase border border-indigo-200"><StarIconSolid className="h-2 w-2" /> Master</span>}
                                    </div>
                                    <SmartDescrizioneInput riga={riga} listinoDb={listinoDb} onUpdateMultiple={aggiornaDatiRiga} />
                                </td>
                                
                                <td className="px-2 py-3 bg-slate-50/50"><input type="text" value={riga.unitaMisura || ''} onChange={(e) => aggiornaDatiRiga(riga.id, {unitaMisura: e.target.value})} className="w-12 text-center font-bold text-slate-600 bg-white border border-slate-200 rounded px-1 outline-none focus:border-indigo-400 block mx-auto"/></td>
                                <td className="px-2 py-3 bg-indigo-50/30"><input type="number" value={riga.quantita} onChange={(e) => aggiornaDatiRiga(riga.id, {quantita: e.target.value})} className="w-16 text-center font-black text-indigo-700 bg-white border border-indigo-200 rounded px-1 outline-none block mx-auto"/></td>
                                <td className="px-2 py-3 bg-indigo-50/30"><input type="number" min="1" value={riga.numeroInterventi || 1} onChange={(e) => aggiornaDatiRiga(riga.id, {numeroInterventi: e.target.value})} className="w-12 text-center font-black text-indigo-700 bg-white border border-indigo-200 rounded px-1 outline-none block mx-auto"/></td>
                                <td className="px-3 py-3 text-right"><span className="text-slate-400 text-xs">€</span><input type="number" value={Number(riga.prezzoGaraOriginale).toFixed(2)} onChange={(e) => aggiornaDatiRiga(riga.id, {prezzoGaraOriginale: e.target.value})} className="w-16 text-right font-bold text-slate-500 bg-transparent border-b border-transparent focus:border-slate-300 outline-none ml-1"/></td>
                                <td className="px-3 py-3 text-right font-black text-slate-700 bg-slate-100/50 border-r border-slate-200">€ {((Number(riga.prezzoGaraOriginale) || 0) * (Number(riga.quantita) || 0) * (Number(riga.numeroInterventi) || 1)).toLocaleString('it-IT', {minimumFractionDigits: 2})}</td>
                                
                                <td className="px-3 py-3 bg-rose-50/30 text-right align-top">
                                    <div className="flex items-center justify-end gap-1">
                                        <div className="relative">
                                            <span className="text-rose-400 text-xs absolute left-2 top-1/2 -translate-y-1/2">€</span>
                                            <input type="number" value={Number(riga.costoUnitarioBase).toFixed(2)} onChange={(e) => aggiornaDatiRiga(riga.id, {costoUnitarioBase: e.target.value})} disabled={!!riga.analisiCosti} className={`w-20 text-right font-bold text-rose-700 border rounded px-1 outline-none pl-4 ${riga.analisiCosti ? 'bg-slate-100 border-slate-200 cursor-not-allowed' : 'bg-white border-rose-200'}`} />
                                        </div>
                                        <button 
                                            onClick={() => setAnalyzingRigaId(riga.id)} 
                                            className={`p-1.5 rounded-lg border transition-colors shadow-sm ${riga.analisiCosti ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`} 
                                            title="Esplodi Analisi Costi"
                                        >
                                            <ChartPieIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                    
                                    {isPro && costoStorico > 0 && !riga.analisiCosti && (
                                        <div 
                                            className="mt-1.5 flex justify-end items-center gap-1 text-[9px] text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors group"
                                            onClick={() => aggiornaDatiRiga(riga.id, { costoUnitarioBase: costoStorico })}
                                            title="Clicca per incollare il costo aziendale storico per questa lavorazione"
                                        >
                                            <SparklesIcon className="h-3 w-3 text-indigo-400 group-hover:animate-pulse" />
                                            Storico: <strong className="group-hover:underline">€ {costoStorico.toFixed(2)}</strong>
                                        </div>
                                    )}
                                </td>
                                
                                <td className="px-2 py-3 bg-sky-50/30 text-center"><input type="number" value={Number(riga.scontoProposto || 0).toFixed(2)} onChange={(e) => aggiornaDatiRiga(riga.id, {scontoProposto: e.target.value})} className="w-12 text-center font-bold text-sky-700 bg-white border border-sky-200 rounded px-1 outline-none"/> %</td>
                                <td className="px-2 py-3 bg-amber-50/30 text-center"><input type="number" value={Number(riga.marginePercentuale).toFixed(0)} onChange={(e) => aggiornaDatiRiga(riga.id, {marginePercentuale: e.target.value})} className="w-12 text-center font-bold text-amber-700 bg-white border border-amber-200 rounded px-1 outline-none"/> %</td>
                                <td className="px-3 py-3 bg-emerald-50/30 text-right"><span className="text-emerald-500 text-xs">€</span><input type="number" value={Number(riga.prezzoVenditaUnitario).toFixed(2)} onChange={(e) => aggiornaDatiRiga(riga.id, {prezzoVenditaUnitario: e.target.value})} className="w-20 text-right font-black text-emerald-700 bg-white border border-emerald-200 rounded px-1 outline-none ml-1"/></td>
                                <td className="px-3 py-3 text-right font-black text-slate-800 border-l border-slate-200">€ {((Number(riga.quantita) || 0) * (Number(riga.numeroInterventi) || 1) * (Number(riga.prezzoVenditaUnitario) || 0)).toLocaleString('it-IT', {minimumFractionDigits: 2})}</td>
                                <td className="px-2 py-3 text-center"><button onClick={() => rimuoviRiga(riga.id)} className="text-slate-300 hover:text-red-500"><TrashIcon className="h-5 w-5 mx-auto" /></button></td>
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>

            {righe.length > 0 && (
                <div className="bg-slate-50 p-6 grid grid-cols-1 md:grid-cols-4 gap-6 border-t border-slate-200 items-end">
                    {totaleGara > 0 && (
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Base d'Asta (Bando)</p>
                            <p className="text-xl font-bold text-slate-600 line-through">€ {totaleGara.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                        </div>
                    )}
                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-sm">
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Costo Vivo Totale (Azienda)</p>
                        <p className="text-xl font-bold text-rose-700">€ {totaleCosti.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Utile Previsto Totale</p>
                        <div className="flex items-end gap-2">
                            <p className="text-xl font-black text-amber-700">€ {utileNetto.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                            <span className="text-sm font-bold text-amber-500 mb-0.5">(+{margineMedio.toFixed(1)}%)</span>
                        </div>
                    </div>
                    <div className="text-right flex flex-col justify-end h-full md:col-start-4">
                        <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Totale Offerta</p>
                        <p className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-1">€ {totaleVendita.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                        <div className="mt-4 flex gap-3 w-full justify-end">
                            <button onClick={() => onSave(righe, { totaleCosti, totaleVendita, utileNetto }, false)} className="flex-[2] max-w-[300px] flex justify-center items-center gap-2 bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95">
                                <CheckCircleIcon className="h-5 w-5" /> Completa e Procedi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {analyzingRigaId && (
                <AnalisiCostiModal 
                    riga={righe.find(r => r.id === analyzingRigaId)} 
                    onClose={() => setAnalyzingRigaId(null)}
                    onSaveAnalisi={(id, data, costo) => { aggiornaDatiRiga(id, { analisiCosti: data, costoUnitarioBase: costo / (righe.find(r => r.id === id).quantita || 1) }); setAnalyzingRigaId(null); }}
                    magazzinoMateriali={magazzinoMateriali} tuttiMateriali={tuttiMateriali} magazzinoMezzi={magazzinoMezzi} magazzinoAttrezzature={magazzinoAttrezzature} tuttiNoleggi={tuttiNoleggi} ruoliAziendali={ruoliAziendali} tariffeAziendali={tariffeAziendali} subappaltatori={subappaltatori}
                    onRequestRDO={onRequestRDO} 
                    isPro={isPro}
                    onRequirePro={() => setShowUpsell(true)}
                />
            )}

            {showMapper && (
                 <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                     <div className="bg-white w-full max-w-7xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-down">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><SparklesIcon className="h-6 w-6 text-emerald-600" /> Riconoscimento Voci Bando</h3>
                            </div>
                            <button onClick={() => setShowMapper(false)}><XMarkIcon className="h-6 w-6" /></button>
                        </div>
                        <div className="overflow-x-auto p-0 flex-1 bg-slate-100">
                            <table className="min-w-full border-collapse">
                                <thead className="sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th colSpan={headerCols.length} className="p-3 border-b-2 border-slate-300 bg-slate-800 text-white text-sm font-black tracking-widest uppercase text-center border-r-4 border-r-slate-400">
                                            <TableCellsIcon className="h-5 w-5 inline-block mr-2" /> Dati Bando (Excel Originale)
                                        </th>
                                        <th className="p-3 border-b-2 border-indigo-400 bg-indigo-600 text-white text-sm font-black tracking-widest uppercase text-center w-[300px] shadow-inner">
                                            <SparklesIcon className="h-5 w-5 inline-block mr-2" /> Match Database
                                        </th>
                                    </tr>
                                    <tr className="bg-white">
                                        {headerCols.map((colIndex, idx) => (
                                            <th key={colIndex} className={`p-3 border-b border-slate-200 min-w-[150px] ${idx === headerCols.length - 1 ? 'border-r-4 border-r-slate-400' : 'border-r border-slate-200'}`}>
                                                <select
                                                    className="w-full p-2 rounded-lg border border-slate-300 font-bold text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                                                    value={Object.keys(mapConfig).find(key => mapConfig[key] === colIndex) || -1}
                                                    onChange={(e) => {
                                                        const field = e.target.value;
                                                        const newMap = { ...mapConfig };
                                                        if (field !== '-1') {
                                                            Object.keys(newMap).forEach(k => { if (newMap[k] === colIndex) newMap[k] = -1; });
                                                            newMap[field] = colIndex;
                                                        } else {
                                                            const prevField = Object.keys(newMap).find(k => newMap[k] === colIndex);
                                                            if (prevField) newMap[prevField] = -1;
                                                        }
                                                        setMapConfig(newMap);
                                                    }}
                                                >
                                                    <option value="-1" className="text-slate-400">-- Ignora Colonna --</option>
                                                    <option value="progressivo">📌 Num. Progressivo</option>
                                                    <option value="codice">🔑 Codice Articolo</option>
                                                    <option value="descrizione">📝 Descrizione Bando</option>
                                                    <option value="unitaMisura">📏 Unità di Misura</option>
                                                    <option value="quantita">🔢 Quantità Richiesta</option>
                                                    <option value="numeroInterventi">🔄 N° Interventi</option>
                                                    <option value="prezzoOriginale">🏛️ Prezzo Unitario Bando</option>
                                                    <option value="prezzoTotale">💰 Prezzo Totale Bando</option>
                                                    
                                                    {/* 🌟 AGGIUNTA DEI NUOVI PARAMETRI 🌟 */}
                                                    <option value="prezzoSenzaManodopera">🛠️ Prezzo Senza Manodopera</option>
                                                    <option value="incidenzaManodopera">👷 Rapporto R.U. (Incidenza %)</option>
                                                </select>
                                            </th>
                                        ))}
                                        <th className="p-3 border-b border-indigo-200 bg-indigo-50 text-center">
                                            <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200">Risultato Ricerca</span>
                                        </th>
                                    </tr>
                                </thead>
                                
                                <tbody className="bg-white">
                                    {excelRows.slice(0, 5).map((riga, i) => {
                                        const codiceLettoRaw = mapConfig.codice >= 0 ? riga[mapConfig.codice] : '';
                                        const descrizioneLettaRaw = mapConfig.descrizione >= 0 ? riga[mapConfig.descrizione] : '';
                                        
                                        const voceDb = trovaMatch(codiceLettoRaw, descrizioneLettaRaw);

                                        return (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                {headerCols.map((colIndex, idx) => (
                                                    <td key={colIndex} className={`p-3 border-b border-slate-100 text-sm text-slate-700 truncate max-w-[200px] ${idx === headerCols.length - 1 ? 'border-r-4 border-r-slate-400 bg-slate-50/50' : 'border-r border-slate-100'}`}>
                                                        {riga[colIndex] || <span className="text-slate-300">-</span>}
                                                    </td>
                                                ))}
                                                <td className="p-3 border-b border-indigo-100 bg-indigo-50/30">
                                                    {voceDb ? (
                                                        <div className="flex flex-col gap-1.5 animate-fade-in">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] font-black bg-indigo-200 text-indigo-900 px-1.5 py-0.5 rounded shadow-sm border border-indigo-300 uppercase">DB: {voceDb.codice}</span>
                                                            </div>
                                                            <div className="bg-white border border-indigo-200 p-1.5 rounded-md shadow-sm">
                                                                <p className="text-[9px] font-bold text-indigo-500 uppercase flex items-center gap-1 mb-0.5"><StarIconSolid className="h-3 w-3 text-amber-500"/> {voceDb.isMaster ? 'Master Trovato' : 'Voce Esterna Trovata'}</p>
                                                                <p className="text-xs font-black text-slate-800 line-clamp-1">{voceDb.descrizione}</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full">
                                                            {(codiceLettoRaw || descrizioneLettaRaw) ? <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded w-full text-center">Nessun Match</span> : <span className="text-[10px] font-medium text-slate-400 italic">In attesa mappatura...</span>}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-6 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
                            <button onClick={confermaImportazione} className="px-8 py-2.5 font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2"><BoltIcon className="h-5 w-5" /> Importa Gara e Avvia Analisi</button>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
};