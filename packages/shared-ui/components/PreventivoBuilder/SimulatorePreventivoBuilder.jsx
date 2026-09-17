// packages/shared-ui/components/PreventivoBuilder/SimulatorePreventivoBuilder.jsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFirebaseData } from 'shared-core';
import { collection, query, where, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
import { CheckCircleIcon, UserGroupIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import { PreventivoHeader } from './PreventivoHeader';
import { PreventivoFooter } from './PreventivoFooter';
import { PreventivoTableRow } from './PreventivoTableRow';
import { ImportatoreExcel } from './ImportatoreExcel'; 

export const SimulatorePreventivoBuilder = ({ 
    offertaId, 
    righeIniziali = [], 
    onSave, 
    onSync, // 🌟 PROP AGGIUNTA
    onRequestRDO,
    aziendaTargetId = '', 
    nomeAziendaEsterna = '',
    filtroCategoria,
    setFiltroCategoria
}) => {
    
    const { db, data } = useFirebaseData();
    const companiesList = data?.companies || [];

    const matchAzienda = companiesList.find(c => c.id === aziendaTargetId);
    const contextCompanyName = aziendaTargetId === 'EXTERNAL' 
        ? nomeAziendaEsterna 
        : (matchAzienda ? (matchAzienda.companyName || matchAzienda.ragioneSociale) : 'Simulazione Anonima');

    const [magazzinoMateriali, setMagazzinoMateriali] = useState([]);
    const [magazzinoMezzi, setMagazzinoMezzi] = useState([]);
    const [magazzinoAttrezzature, setMagazzinoAttrezzature] = useState([]);
    const [ruoliAziendali, setRuoliAziendali] = useState([]);
    const [tariffeAziendali, setTariffeAziendali] = useState({});

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: '' });
    const [searchTerm, setSearchTerm] = useState('');

    const [lastEditedRowId, setLastEditedRowId] = useState(() => {
        if (!offertaId) return null;
        return localStorage.getItem(`bookmark_offerta_${offertaId}`) || null;
    });

    const [copiedAnalisi, setCopiedAnalisi] = useState(null);
    const [righe, setRighe] = useState(righeIniziali);

    // 🌟 TRASMETTITORE CONTINUO AL PADRE (Previene la perdita dati se cambi tab) 🌟
    const onSyncRef = useRef(onSync);
    useEffect(() => { onSyncRef.current = onSync; }, [onSync]);
    useEffect(() => { if (onSyncRef.current) onSyncRef.current(righe); }, [righe]);

    useEffect(() => {
        if (lastEditedRowId && offertaId) {
            localStorage.setItem(`bookmark_offerta_${offertaId}`, lastEditedRowId);
        }
    }, [lastEditedRowId, offertaId]);

    const scrollToRow = (id) => {
        const element = document.getElementById(`riga-${id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isFullscreen]);

    useEffect(() => {
        document.body.style.overflow = isFullscreen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isFullscreen]);

    useEffect(() => {
        const fetchDatiAziendaTarget = async () => {
            if (!aziendaTargetId || aziendaTargetId === 'EXTERNAL') {
                setMagazzinoMateriali([]); setMagazzinoMezzi([]); setMagazzinoAttrezzature([]);
                const tariffeBaseEsterne = { 'Operaio': 25, 'Preposto': 30, 'Tecnico': 40 };
                setRuoliAziendali(Object.keys(tariffeBaseEsterne)); setTariffeAziendali(tariffeBaseEsterne); setTariffeSimulazione(tariffeBaseEsterne); 
                return;
            }

            try {
                const docSnap = await getDoc(doc(db, 'companies', aziendaTargetId));
                let baseTariffe = {};
                if (docSnap.exists()) {
                    const compData = docSnap.data();
                    baseTariffe = { ...(compData.tariffeManodopera || compData.tariffeAziendali || compData.costiOrari || {}) };
                }

                const qUsers = query(collection(db, 'users'), where('companyID', '==', aziendaTargetId));
                const snapUsers = await getDocs(qUsers);
                const raggruppamentoCosti = {};
                snapUsers.docs.forEach(doc => {
                    const u = doc.data();
                    const ruolo = u.ruolo || u.qualifica;
                    const costo = Number(u.costoOrario) || Number(u.costoAziendale) || 0;
                    if (ruolo && costo > 0) {
                        if (!raggruppamentoCosti[ruolo]) raggruppamentoCosti[ruolo] = [];
                        raggruppamentoCosti[ruolo].push(costo);
                    }
                });
                
                Object.keys(raggruppamentoCosti).forEach(ruolo => {
                    const esisteGia = Object.keys(baseTariffe).find(k => k.toLowerCase() === ruolo.toLowerCase());
                    if (!esisteGia) {
                        const somma = raggruppamentoCosti[ruolo].reduce((a, b) => a + b, 0);
                        baseTariffe[ruolo] = somma / raggruppamentoCosti[ruolo].length;
                    }
                });
                
                setTariffeAziendali(baseTariffe); setRuoliAziendali(Object.keys(baseTariffe)); setTariffeSimulazione(baseTariffe); 

                const qMag = query(collection(db, 'magazzino'), where('companyID', '==', aziendaTargetId));
                const snapMag = await getDocs(qMag);
                setMagazzinoMateriali(snapMag.docs.map(d => ({id: d.id, ...d.data()})));

                const qAtt = query(collection(db, 'attrezzature'), where('companyID', '==', aziendaTargetId));
                const snapAtt = await getDocs(qAtt);
                const tutteAtt = snapAtt.docs.map(d => ({id: d.id, ...d.data()}));
                
                setMagazzinoMezzi(tutteAtt.filter(a => {
                    const cat = (a.categoria || '').toLowerCase();
                    return cat === 'automezzo' || cat === 'macchina operatrice' || cat.includes('mezzo') || cat.includes('veicolo');
                }));
                setMagazzinoAttrezzature(tutteAtt.filter(a => {
                    const cat = (a.categoria || '').toLowerCase();
                    return cat !== 'automezzo' && cat !== 'macchina operatrice' && !cat.includes('mezzo') && !cat.includes('veicolo');
                }));

            } catch (err) { console.error("Errore fetch dati azienda target:", err); }
        };
        fetchDatiAziendaTarget();
    }, [aziendaTargetId, db]);

    const [parametriGlobali, setParametriGlobali] = useState({ sg: 15, imprevisti: 0, utile: 10 });
    const [isImporterOpen, setIsImporterOpen] = useState(false); 

    const subappaltatori = useMemo(() => data?.subappaltatori || [], [data?.subappaltatori]);
    const fornitori = useMemo(() => data?.fornitori || [], [data?.fornitori]);
    const noleggiatori = useMemo(() => data?.noleggiatori || [], [data?.noleggiatori]);

    const [tariffeSimulazione, setTariffeSimulazione] = useState({});
    const [showTariffeModal, setShowTariffeModal] = useState(false);

    useEffect(() => {
        if (Object.keys(tariffeAziendali).length > 0 && Object.keys(tariffeSimulazione).length === 0) {
            setTariffeSimulazione(tariffeAziendali);
        }
    }, [tariffeAziendali]);

    const parseNum = (val) => {
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        if (val === null || val === undefined || val === '') return 0;
        let str = val.toString();
        if (str.includes('.') && str.includes(',')) {
            str = str.replace(/\./g, '').replace(',', '.');
        } 
        else if (str.includes(',') && !str.includes('.')) {
            str = str.replace(',', '.');
        }
        const parsed = parseFloat(str);
        return isNaN(parsed) ? 0 : parsed;
    };

    const handleUpdateTariffaSimulazione = (ruolo, nuovoValore) => {
        const val = parseNum(nuovoValore);
        setTariffeSimulazione(prev => ({ ...prev, [ruolo]: val }));

        setRighe(prev => prev.map(riga => {
            if (!riga.analisiCosti || !riga.analisiCosti.manodopera) return riga;
            
            let hasChanges = false;
            const nuovaManodopera = riga.analisiCosti.manodopera.map(m => {
                if (m.descrizione && m.descrizione.toLowerCase() === ruolo.toLowerCase()) {
                    hasChanges = true;
                    return { ...m, costoUnitario: val };
                }
                return m;
            });

            if (hasChanges) {
                const calcTot = (arr) => (arr||[]).reduce((acc, curr) => {
                    const p = curr.numeroPersone !== undefined && curr.numeroPersone !== '' ? parseNum(curr.numeroPersone) : 1;
                    return acc + (p * parseNum(curr.quantita) * parseNum(curr.costoUnitario));
                }, 0);
                
                const nuoviCostiInterni = {
                    materiali: calcTot(riga.analisiCosti.materiali),
                    attrezzature: calcTot(riga.analisiCosti.attrezzature),
                    noli: calcTot(riga.analisiCosti.noli),
                    mezzi: calcTot(riga.analisiCosti.mezzi),
                    manodopera: calcTot(nuovaManodopera),
                    subappalti: calcTot(riga.analisiCosti.subappalti),
                    smaltimenti: calcTot(riga.analisiCosti.smaltimenti),
                    altro: calcTot(riga.analisiCosti.altro),
                };
                
                const nuovoCostoVivoTotale = Object.values(nuoviCostiInterni).reduce((a,b)=>a+b, 0);
                const nuovoCostoUnitarioBase = nuovoCostoVivoTotale / (parseNum(riga.quantita) || 1);
                
                return applicaMatematicaRiga(riga, { 
                    analisiCosti: { ...riga.analisiCosti, manodopera: nuovaManodopera, totaleCostoVivo: nuovoCostoVivoTotale },
                    costoUnitarioBase: nuovoCostoUnitarioBase
                });
            }
            return riga;
        }));
    };

    const tuttiMateriali = useMemo(() => fornitori.flatMap(f => (f.listino || []).map(m => ({ ...m, fornitoreId: f.id, fornitoreNome: f.ragioneSociale }))), [fornitori]);
    const tuttiNoleggi = useMemo(() => noleggiatori.flatMap(n => (n.listino || []).map(m => ({ ...m, noleggiatoreId: n.id, noleggiatoreNome: n.ragioneSociale }))), [noleggiatori]);

    const [listinoDb, setListinoDb] = useState([]);
    const [storicoBigData, setStoricoBigData] = useState([]);
    const [vociStoricheBigData, setVociStoricheBigData] = useState([]); 
    const [analyzingRigaId, setAnalyzingRigaId] = useState(null);

    const categorieGanttUsate = useMemo(() => {
        const categorie = righe.map(r => r.categoriaGantt).filter(Boolean);
        return [...new Set(categorie)].sort(); 
    }, [righe]);

    const filteredRighe = useMemo(() => {
        let result = righe;

        if (filtroCategoria) {
            result = result.filter(r => {
                if (!r.analisiCosti) return false;
                if (filtroCategoria === 'attrezzature') {
                    return (r.analisiCosti.attrezzature?.length > 0) || (r.analisiCosti.mezzi?.length > 0);
                }
                return r.analisiCosti[filtroCategoria] && r.analisiCosti[filtroCategoria].length > 0;
            });
        }

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(r => {
                if ((r.codice || '').toLowerCase().includes(term) || (r.descrizione || '').toLowerCase().includes(term)) {
                    return true;
                }
                
                if (r.analisiCosti) {
                    const categorie = ['materiali', 'attrezzature', 'noli', 'mezzi', 'manodopera', 'subappalti', 'smaltimenti', 'altro'];
                    for (let cat of categorie) {
                        if (r.analisiCosti[cat] && Array.isArray(r.analisiCosti[cat])) {
                            const trovatoNelDettaglio = r.analisiCosti[cat].some(voce => 
                                (voce.descrizione || '').toLowerCase().includes(term)
                            );
                            if (trovatoNelDettaglio) return true;
                        }
                    }
                }
                return false;
            });
        }

        return result;
    }, [righe, searchTerm, filtroCategoria]);

    const puliziaEstrema = (str) => str ? str.toString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase().replace(/[o]/g, '0').replace(/[il]/g, '1') : '';
    const puliziaTesto = (str) => str ? str.toString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 35) : '';

    const fetchListiniEStorico = async () => {
        if (listinoDb.length > 0) return;
        try {
            const qMaster = query(collection(db, 'master_universali'));
            const snapshotMaster = await getDocs(qMaster);
            const dataMaster = snapshotMaster.docs.map(doc => {
                const d = doc.data();
                return { id: doc.id, isMaster: true, ...d, codicePulito: puliziaEstrema(d.codice), descrizionePulita: puliziaTesto(d.descrizione || d.nome || ''), listinoSource: 'Master Universitario' };
            });
            setListinoDb(dataMaster);

            const qStorico = query(collection(db, 'storico_analisi_simulazioni'));
            const snapshotStorico = await getDocs(qStorico);
            const dataStorico = snapshotStorico.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStoricoBigData(dataStorico);
            
            const qVoci = query(collection(db, 'storico_voci_inserite'));
            const snapshotVoci = await getDocs(qVoci);
            setVociStoricheBigData(snapshotVoci.docs.map(d => d.data()));

        } catch (error) { console.error("Errore fetch database:", error); } 
    };

    useEffect(() => { fetchListiniEStorico(); }, []);

    const handleCopiaAnalisi = (riga) => {
        if (!riga.analisiCosti) return;
        setCopiedAnalisi({
            analisi: riga.analisiCosti,
            qtaBase: riga.quantita,
            unitaMisura: riga.unitaMisura
        });
        setToast({ visible: true, message: 'Analisi copiata in memoria! ✂️' });
        setTimeout(() => setToast({ visible: false, message: '' }), 3000);
    };

    const handleIncollaAnalisi = (targetRigaId) => {
        if (!copiedAnalisi) return;

        const targetRiga = righe.find(r => r.id === targetRigaId);
        if (!targetRiga) return;

        if (targetRiga.analisiCosti) {
            const conferma = window.confirm("Questa voce ha già un'analisi costi.\nVuoi davvero sovrascriverla?");
            if (!conferma) return;
        }

        const qtaBase = parseNum(copiedAnalisi.qtaBase) || 1;
        const qtaTarget = parseNum(targetRiga.quantita) || 1;
        const ratio = qtaTarget / qtaBase;

        const analisiScalata = {};
        let nuovoCostoVivoTotale = 0;
        const categorieValide = ['materiali', 'attrezzature', 'noli', 'mezzi', 'manodopera', 'subappalti', 'smaltimenti', 'altro'];

        categorieValide.forEach(cat => {
            if (copiedAnalisi.analisi[cat] && Array.isArray(copiedAnalisi.analisi[cat])) {
                analisiScalata[cat] = copiedAnalisi.analisi[cat].map(item => {
                    const scaledQta = parseNum(item.quantita) * ratio;
                    const p = item.numeroPersone !== undefined && item.numeroPersone !== '' ? parseNum(item.numeroPersone) : 1;
                    nuovoCostoVivoTotale += (p * scaledQta * parseNum(item.costoUnitario));
                    return { ...item, quantita: scaledQta };
                });
            } else {
                analisiScalata[cat] = [];
            }
        });
        analisiScalata.totaleCostoVivo = nuovoCostoVivoTotale;

        const costoBaseDerivato = nuovoCostoVivoTotale / qtaTarget;

        aggiornaDatiRiga(targetRigaId, {
            analisiCosti: analisiScalata,
            costoUnitarioBase: costoBaseDerivato
        });

        setToast({ visible: true, message: 'Analisi incollata e proporzionata! 📋' });
        setTimeout(() => setToast({ visible: false, message: '' }), 3000);
    };

    const handleSalvaBozza = async () => {
        try {
            await onSave(righe, { totaleCosti: totaleCostiVivi, totaleVendita, utileNetto }, true);
            setToast({ visible: true, message: 'Bozza salvata con successo! 💾' });
            setTimeout(() => setToast({ visible: false, message: '' }), 3000);
        } catch (error) {
            console.error("Errore salvataggio:", error);
            setToast({ visible: true, message: 'Errore durante il salvataggio ❌' });
            setTimeout(() => setToast({ visible: false, message: '' }), 3000);
        }
    };

    const aggiungiRigaManuale = async () => {
        const nuovaRiga = { 
            id: 'manual_' + Date.now() + Math.random(), 
            progressivo: '', prezzoGaraOriginale: 0, prezzoSenzaManodopera: 0, incidenzaManodopera: 0,
            listinoRefId: null, codice: 'CUSTOM', descrizione: '', unitaMisura: 'cad', 
            quantita: 1, numeroInterventi: 1, costoUnitarioBase: 0, 
            scontoProposto: 0, marginePercentuale: parametriGlobali.utile, prezzoVenditaUnitario: 0,
            isMaster: false, masterId: null, isFromBigData: false, analisiCosti: null,
            categoriaGantt: '' 
        };
        setSearchTerm(''); 
        if (setFiltroCategoria) setFiltroCategoria(null); 
        setRighe([...righe, nuovaRiga]);
        setLastEditedRowId(nuovaRiga.id);
        
        setTimeout(() => scrollToRow(nuovaRiga.id), 100);
    };

    const rimuoviRiga = (id) => setRighe(prev => prev.filter(r => r.id !== id));

    const applicaMatematicaRiga = (rigaBase, updates) => {
        let rAgg = { ...rigaBase, ...updates };

        if (updates.quantita !== undefined && rigaBase.analisiCosti) {
            const oldQta = parseNum(rigaBase.quantita) || 1;
            const newQta = parseNum(updates.quantita) || 1;
            
            if (oldQta !== newQta && oldQta > 0 && newQta > 0) {
                const ratio = newQta / oldQta;
                const analisiScalata = {};
                let nuovoCostoVivoTotale = 0;
                const categorieValide = ['materiali', 'attrezzature', 'noli', 'mezzi', 'manodopera', 'subappalti', 'smaltimenti', 'altro'];

                categorieValide.forEach(cat => {
                    if (rigaBase.analisiCosti[cat] && Array.isArray(rigaBase.analisiCosti[cat])) {
                        analisiScalata[cat] = rigaBase.analisiCosti[cat].map(item => {
                            const scaledQta = parseNum(item.quantita) * ratio;
                            const p = item.numeroPersone !== undefined && item.numeroPersone !== '' ? parseNum(item.numeroPersone) : 1;
                            nuovoCostoVivoTotale += (p * scaledQta * parseNum(item.costoUnitario));
                            return { ...item, quantita: scaledQta };
                        });
                    } else {
                        analisiScalata[cat] = [];
                    }
                });
                analisiScalata.totaleCostoVivo = nuovoCostoVivoTotale;
                rAgg.analisiCosti = analisiScalata;
            }
        }

        const costoBase = parseNum(rAgg.costoUnitarioBase);
        const bando = parseNum(rAgg.prezzoGaraOriginale);
        const sgPerc = parseNum(parametriGlobali.sg) / 100;
        const impPerc = parseNum(parametriGlobali.imprevisti) / 100;
        
        const costoTotale = costoBase + (costoBase * sgPerc) + (costoBase * impPerc);

        if (updates.scontoProposto !== undefined) {
            const sconto = parseNum(updates.scontoProposto);
            rAgg.prezzoVenditaUnitario = bando - (bando * (sconto / 100));
            rAgg.marginePercentuale = costoTotale > 0 ? ((rAgg.prezzoVenditaUnitario - costoTotale) / costoTotale) * 100 : parametriGlobali.utile;
        } 
        else if (updates.marginePercentuale !== undefined) {
            const utilePerc = parseNum(updates.marginePercentuale);
            if (costoTotale > 0) {
                rAgg.prezzoVenditaUnitario = costoTotale + (costoTotale * (utilePerc / 100));
                rAgg.scontoProposto = bando > 0 ? ((bando - rAgg.prezzoVenditaUnitario) / bando) * 100 : 0;
            }
        } 
        else if (updates.prezzoVenditaUnitario !== undefined) {
            const pVendita = parseNum(updates.prezzoVenditaUnitario);
            rAgg.scontoProposto = bando > 0 ? ((bando - pVendita) / bando) * 100 : 0;
            rAgg.marginePercentuale = costoTotale > 0 ? ((pVendita - costoTotale) / costoTotale) * 100 : parametriGlobali.utile;
        }
        else {
            const utilePerc = parseNum(rAgg.marginePercentuale);
            if (costoTotale > 0) {
                rAgg.prezzoVenditaUnitario = costoTotale + (costoTotale * (utilePerc / 100));
                rAgg.scontoProposto = bando > 0 ? ((bando - rAgg.prezzoVenditaUnitario) / bando) * 100 : 0;
            } else {
                const sconto = parseNum(rAgg.scontoProposto);
                rAgg.prezzoVenditaUnitario = bando - (bando * (sconto / 100));
            }
        }
        return rAgg;
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            setRighe(prevRighe => {
                let hasFixes = false;
                const righeRipulite = prevRighe.map(riga => {
                    if (!riga.analisiCosti) return riga;
                    
                    let totaleSicuro = 0;
                    const categorieValide = ['materiali', 'attrezzature', 'noli', 'mezzi', 'manodopera', 'subappalti', 'smaltimenti', 'altro'];
                    
                    categorieValide.forEach(cat => {
                        if (riga.analisiCosti[cat] && Array.isArray(riga.analisiCosti[cat])) {
                            riga.analisiCosti[cat].forEach(item => {
                                const p = item.numeroPersone !== undefined && item.numeroPersone !== '' ? parseNum(item.numeroPersone) : 1;
                                totaleSicuro += (p * parseNum(item.quantita) * parseNum(item.costoUnitario));
                            });
                        }
                    });

                    const qtaRow = parseNum(riga.quantita) || 1;
                    const expectedCostoBase = totaleSicuro / qtaRow;

                    if (Math.abs(parseNum(riga.costoUnitarioBase) - expectedCostoBase) > 0.5) {
                        hasFixes = true;
                        return applicaMatematicaRiga(riga, { 
                            analisiCosti: { ...riga.analisiCosti, totaleCostoVivo: totaleSicuro },
                            costoUnitarioBase: expectedCostoBase 
                        });
                    }
                    return riga;
                });

                if (hasFixes) {
                    setToast({ visible: true, message: '🛠️ Auto-Riparazione: Trovati e svelati costi fantasma!' });
                    setTimeout(() => setToast({ visible: false, message: '' }), 5000);
                    return righeRipulite;
                }
                return prevRighe;
            });
        }, 1500); 
        
        return () => clearTimeout(timeout);
    }, []);

    const aggiornaDatiRiga = (id, updates) => {
        setLastEditedRowId(id);
        setRighe(prev => prev.map(riga => riga.id === id ? applicaMatematicaRiga(riga, updates) : riga));
    };

    const aggiornaMolteRighe = (updatesArray) => {
        setRighe(prev => {
            let nuoveRighe = [...prev];
            updatesArray.forEach(({id, updates}) => {
                nuoveRighe = nuoveRighe.map(riga => riga.id === id ? applicaMatematicaRiga(riga, updates) : riga);
            });
            return nuoveRighe;
        });
    };

    const handleGlobalParamsChange = (field, value) => {
        const newVal = parseNum(value);
        setParametriGlobali(prev => ({ ...prev, [field]: newVal }));
        
        const newSg = field === 'sg' ? newVal : parametriGlobali.sg;
        const newImp = field === 'imprevisti' ? newVal : parametriGlobali.imprevisti;
        const newUtile = field === 'utile' ? newVal : parametriGlobali.utile; 
        
        const sgPerc = newSg / 100;
        const impPerc = newImp / 100;

        setRighe(prev => prev.map(riga => {
            const costoBase = parseNum(riga.costoUnitarioBase);
            const bando = parseNum(riga.prezzoGaraOriginale);
            const costoTotale = costoBase + (costoBase * sgPerc) + (costoBase * impPerc);
            const utilePerc = field === 'utile' ? newUtile : parseNum(riga.marginePercentuale);

            let nuovoPrezzoVendita, nuovoSconto;
            if (costoTotale > 0) {
                nuovoPrezzoVendita = costoTotale + (costoTotale * (utilePerc / 100));
                nuovoSconto = bando > 0 ? ((bando - nuovoPrezzoVendita) / bando) * 100 : 0;
            } else {
                const scontoBase = parseNum(riga.scontoProposto);
                nuovoPrezzoVendita = bando - (bando * (scontoBase / 100));
                nuovoSconto = scontoBase;
            }
            return { ...riga, marginePercentuale: utilePerc, prezzoVenditaUnitario: nuovoPrezzoVendita, scontoProposto: nuovoSconto };
        }));
    };

    const salvaVoceInBigData = async (categoria, item) => {
        try {
            const nuovaVoce = { categoria, descrizione: item.descrizione, costoRegistrato: parseNum(item.costoUnitario), contestoAzienda: contextCompanyName, timestamp: Date.now(), autore: 'super_admin_simulatore' };
            await addDoc(collection(db, 'storico_voci_inserite'), nuovaVoce);
            
            const snap = await getDocs(collection(db, 'storico_voci_inserite'));
            setVociStoricheBigData(snap.docs.map(d => d.data())); 
        } catch (err) { console.error("Errore salvataggio voce manuale:", err); }
    };

    const gestisciSalvataggioAnalisi = async (idRiga, dataAnalisi) => {
        setLastEditedRowId(idRiga);
        
        const rigaAttuale = righe.find(r => r.id === idRiga);
        if (!rigaAttuale) return;

        let totaleSicuro = 0;
        
        if (dataAnalisi) {
            const categorieValide = ['materiali', 'attrezzature', 'noli', 'mezzi', 'manodopera', 'subappalti', 'smaltimenti', 'altro'];
            categorieValide.forEach(cat => {
                if (dataAnalisi[cat] && Array.isArray(dataAnalisi[cat])) {
                    dataAnalisi[cat].forEach(item => {
                        const p = item.numeroPersone !== undefined && item.numeroPersone !== '' ? parseNum(item.numeroPersone) : 1;
                        totaleSicuro += (p * parseNum(item.quantita) * parseNum(item.costoUnitario));
                    });
                }
            });
            dataAnalisi.totaleCostoVivo = totaleSicuro;
        }

        const costoBaseDerivato = totaleSicuro / (parseNum(rigaAttuale.quantita) || 1);
        
        let arrayAggiornamenti = [
            { id: idRiga, updates: { analisiCosti: dataAnalisi, costoUnitarioBase: costoBaseDerivato } }
        ];

        if (dataAnalisi && rigaAttuale.codice && rigaAttuale.codice !== 'CUSTOM') {
            const righeSimili = righe.filter(r => r.id !== idRiga && r.codice === rigaAttuale.codice);
            
            if (righeSimili.length > 0) {
                const conferma = window.confirm(`✨ Trovate altre ${righeSimili.length} voci con il codice "${rigaAttuale.codice}".\n\nVuoi propagare questa analisi automaticamente a tutte, proporzionandone le quantità e i fabbisogni?`);
                
                if (conferma) {
                    const qtaBase = parseNum(rigaAttuale.quantita) || 1;
                    const categorieValide = ['materiali', 'attrezzature', 'noli', 'mezzi', 'manodopera', 'subappalti', 'smaltimenti', 'altro'];

                    righeSimili.forEach(rTarget => {
                        const qtaTarget = parseNum(rTarget.quantita) || 1;
                        const ratio = qtaTarget / qtaBase;
                        
                        const analisiScalata = {};
                        let nuovoCostoVivoTotale = 0;

                        categorieValide.forEach(cat => {
                            if (dataAnalisi[cat] && Array.isArray(dataAnalisi[cat])) {
                                analisiScalata[cat] = dataAnalisi[cat].map(item => {
                                    const scaledQta = parseNum(item.quantita) * ratio;
                                    const p = item.numeroPersone !== undefined && item.numeroPersone !== '' ? parseNum(item.numeroPersone) : 1;
                                    nuovoCostoVivoTotale += (p * scaledQta * parseNum(item.costoUnitario));
                                    return { ...item, quantita: scaledQta };
                                });
                            } else {
                                analisiScalata[cat] = [];
                            }
                        });
                        analisiScalata.totaleCostoVivo = nuovoCostoVivoTotale;

                        arrayAggiornamenti.push({
                            id: rTarget.id,
                            updates: {
                                analisiCosti: analisiScalata,
                                costoUnitarioBase: (nuovoCostoVivoTotale / qtaTarget) 
                            }
                        });
                    });
                }
            }
        }

        aggiornaMolteRighe(arrayAggiornamenti);
        setAnalyzingRigaId(null);

        setTimeout(() => scrollToRow(idRiga), 150);

        if (dataAnalisi && !rigaAttuale.isMaster && !rigaAttuale.masterId) {
            try {
                const nuovoStorico = {
                    codiceOriginale: rigaAttuale.codice, codicePulito: puliziaEstrema(rigaAttuale.codice), descrizioneOriginale: rigaAttuale.descrizione, descrizionePulita: puliziaTesto(rigaAttuale.descrizione),
                    unitaMisura: rigaAttuale.unitaMisura || 'pz', analisiCosti: dataAnalisi, costoUnitarioDerivato: costoBaseDerivato,
                    incidenzaManodopera: rigaAttuale.incidenzaManodopera || 0, prezzoSenzaManodopera: rigaAttuale.prezzoSenzaManodopera || 0,
                    timestamp: Date.now(), autoreId: 'super_admin', aziendaContesto: contextCompanyName, stato: 'approvato'
                };
                await addDoc(collection(db, 'storico_analisi_simulazioni'), nuovoStorico);
                setStoricoBigData(prev => [...prev, { id: Date.now().toString(), ...nuovoStorico }]);
            } catch (err) { console.error("Errore salvataggio Big Data:", err); }
        }
    };

    const { totaleCostiVivi, totaleSG, totaleImp, totaleVendita, utileNetto, margineMedio, totaleGara } = useMemo(() => {
        let costiVivi = 0, sg = 0, imp = 0, vendita = 0, gara = 0;
        const sgPerc = parseNum(parametriGlobali.sg) / 100;
        const impPerc = parseNum(parametriGlobali.imprevisti) / 100;

        righe.forEach(r => {
            const intv = parseNum(r.numeroInterventi) || 1;
            const qta = parseNum(r.quantita) || 0;
            const cBase = parseNum(r.costoUnitarioBase) || 0;
            costiVivi += (cBase * qta * intv);
            sg += (cBase * sgPerc * qta * intv);
            imp += (cBase * impPerc * qta * intv);
            vendita += (parseNum(r.prezzoVenditaUnitario) * qta * intv);
            gara += (parseNum(r.prezzoGaraOriginale) * qta * intv);
        });
        const costiComplessivi = costiVivi + sg + imp;
        const utile = vendita - costiComplessivi;
        return { totaleCostiVivi: costiVivi, totaleSG: sg, totaleImp: imp, totaleVendita: vendita, utileNetto: utile, margineMedio: costiComplessivi > 0 ? (utile / costiComplessivi) * 100 : 0, totaleGara: gara };
    }, [righe, parametriGlobali]);

    const handleCompletaProcedi = () => {
        onSave(righe, { totaleCosti: totaleCostiVivi, totaleVendita, utileNetto }, false);
        setToast({ visible: true, message: 'Computo completato con successo! 🚀' });
        setTimeout(() => setToast({ visible: false, message: '' }), 3000);
    };

    const builderContent = (
        <div className={`bg-white shadow-lg overflow-hidden flex flex-col transition-all duration-300 ${
            isFullscreen ? 'fixed inset-0 z-[99999] rounded-none m-0 w-screen h-screen' : 'rounded-3xl border border-slate-200 mt-6 relative'
        }`}>
            
            <PreventivoHeader 
                listinoDbLength={listinoDb.length}
                lastEditedRowId={lastEditedRowId}
                scrollToRow={scrollToRow}
                isFullscreen={isFullscreen}
                setIsFullscreen={setIsFullscreen}
                righeLength={righe.length}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                handleSalvaBozza={handleSalvaBozza}
                svuotaTabella={() => window.confirm("Eliminare tutto il computo?") && setRighe([])}
                openImporter={() => setIsImporterOpen(true)}
                aggiungiRigaManuale={aggiungiRigaManuale}
                parametriGlobali={parametriGlobali}
                handleGlobalParamsChange={handleGlobalParamsChange}
                setShowTariffeModal={setShowTariffeModal}
                filtroCategoria={filtroCategoria}
                setFiltroCategoria={setFiltroCategoria}
            />

            <div className={`overflow-auto w-full bg-white relative ${isFullscreen ? 'flex-1' : 'max-h-[55vh]'}`}>
                <table className="min-w-full border-collapse">
                    <thead className="bg-slate-200 border-b-[3px] border-slate-500 shadow-md sticky top-0 z-40">
                        <tr className="divide-x divide-slate-300">
                            <th className="px-3 py-3 text-left text-[10px] font-black text-slate-600 uppercase min-w-[300px]">Codice & Descrizione Gara</th>
                            <th className="px-2 py-3 text-center text-[10px] font-black text-slate-600 uppercase">U.M.</th>
                            <th className="px-2 py-3 text-center text-[10px] font-black text-indigo-700 uppercase bg-indigo-100/50">Q.tà</th>
                            <th className="px-2 py-3 text-center text-[10px] font-black text-indigo-700 uppercase bg-indigo-100/50">N° Int.</th>
                            <th className="px-3 py-3 text-right text-[10px] font-black text-slate-600 uppercase">P. Bando (Unit)</th>
                            <th className="px-3 py-3 text-right text-[10px] font-black text-slate-800 uppercase bg-slate-300/50">Tot. Bando</th>
                            <th className="px-3 py-3 text-right text-[10px] font-black text-rose-700 uppercase bg-rose-100/50">Costo Diretto (Unit)</th>
                            <th className="px-3 py-3 text-right text-[10px] font-black text-rose-900 uppercase bg-rose-200/50">Costo Diretto (Tot)</th>
                            <th className="px-2 py-3 text-center text-[10px] font-black text-sky-700 uppercase bg-sky-100/50">Sconto %</th>
                            <th className="px-2 py-3 text-center text-[10px] font-black text-amber-700 uppercase bg-amber-100/50">Utile %</th>
                            <th className="px-3 py-3 text-right text-[10px] font-black text-emerald-700 uppercase bg-emerald-100/50">P. Offerto (Unit)</th>
                            <th className="px-3 py-3 text-right text-[10px] font-black text-slate-800 uppercase">Tot. Offerta</th>
                            <th className="px-2 py-3 text-center text-[10px] font-black text-slate-600 uppercase">X</th>
                        </tr>
                    </thead>
                    
                    {filteredRighe.length === 0 && righe.length > 0 && (
                        <tbody>
                            <tr>
                                <td colSpan="13" className="py-12 text-center">
                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                        <MagnifyingGlassIcon className="h-8 w-8 text-slate-300" />
                                        <p className="font-bold">Nessuna voce trovata per questa ricerca/filtro</p>
                                        <button onClick={() => { setSearchTerm(''); if(setFiltroCategoria) setFiltroCategoria(null); }} className="text-sm text-indigo-500 hover:text-indigo-600 underline">Azzera filtro</button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    )}

                    {filteredRighe.map(riga => (
                        <PreventivoTableRow 
                            key={riga.id}
                            riga={riga}
                            listinoDb={listinoDb}
                            analyzingRigaId={analyzingRigaId}
                            lastEditedRowId={lastEditedRowId}
                            setAnalyzingRigaId={setAnalyzingRigaId}
                            setLastEditedRowId={setLastEditedRowId}
                            aggiornaDatiRiga={aggiornaDatiRiga}
                            rimuoviRiga={rimuoviRiga}
                            parseNum={parseNum}
                            copiedAnalisi={copiedAnalisi}
                            handleCopiaAnalisi={handleCopiaAnalisi}
                            handleIncollaAnalisi={handleIncollaAnalisi}
                            gestisciSalvataggioAnalisi={gestisciSalvataggioAnalisi}
                            salvaVoceInBigData={salvaVoceInBigData}
                            magazzinoMateriali={magazzinoMateriali}
                            tuttiMateriali={tuttiMateriali}
                            magazzinoMezzi={magazzinoMezzi}
                            magazzinoAttrezzature={magazzinoAttrezzature}
                            tuttiNoleggi={tuttiNoleggi}
                            ruoliAziendali={ruoliAziendali}
                            tariffeAziendali={tariffeAziendali}
                            tariffeSimulazione={tariffeSimulazione}
                            subappaltatori={subappaltatori}
                            onRequestRDO={onRequestRDO}
                            vociStoricheBigData={vociStoricheBigData}
                            categorieGanttUsate={categorieGanttUsate}
                        />
                    ))}
                </table>
            </div>

            <PreventivoFooter 
                righeLength={righe.length}
                totaleGara={totaleGara}
                totaleCostiVivi={totaleCostiVivi}
                totaleSG={totaleSG}
                totaleImp={totaleImp}
                utileNetto={utileNetto}
                margineMedio={margineMedio}
                totaleVendita={totaleVendita}
                handleCompletaProcedi={handleCompletaProcedi}
            />

            {showTariffeModal && (
                <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200">
                        <div className="bg-orange-50 p-6 border-b border-orange-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-orange-900 flex items-center gap-2">
                                    <UserGroupIcon className="h-6 w-6 text-orange-600" /> Costi Manodopera
                                </h3>
                                <p className="text-[10px] font-bold text-orange-700 mt-1 uppercase tracking-wider">Validi solo per questa simulazione</p>
                            </div>
                            <button onClick={() => setShowTariffeModal(false)} className="p-2 text-orange-600 hover:bg-orange-200 rounded-full transition-colors"><XMarkIcon className="h-6 w-6" /></button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-500 mb-6 font-medium">Modifica il costo orario dei ruoli per adattarlo alle esigenze di questo specifico cantiere. Le modifiche non altereranno l'anagrafica reale dell'azienda.</p>
                            
                            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                                {Object.entries(tariffeSimulazione).map(([ruolo, costo]) => (
                                    <div key={ruolo} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                                        <span className="font-bold text-slate-700 text-sm">{ruolo}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-400">€/h</span>
                                            <input 
                                                type="text" 
                                                value={costo} 
                                                onChange={(e) => handleUpdateTariffaSimulazione(ruolo, e.target.value)}
                                                className="w-20 p-2 text-sm font-black text-right border border-slate-300 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end">
                            <button onClick={() => setShowTariffeModal(false)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-black transition-all">
                                Fatto
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast.visible && (
                <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-[999999] flex items-center gap-3 border border-slate-700 animate-fade-in-up">
                    <CheckCircleIcon className="h-6 w-6 text-emerald-400" />
                    <span className="font-bold">{toast.message}</span>
                </div>
            )}

            <ImportatoreExcel 
                isOpen={isImporterOpen}
                onClose={() => setIsImporterOpen(false)}
                onImportSuccess={(nuoveRighe) => {
                    setRighe(prev => [...prev, ...nuoveRighe]);
                }}
                listinoDb={listinoDb}
                storicoBigData={storicoBigData}
                parametriGlobali={parametriGlobali}
            />
        </div>
    );

    return isFullscreen ? createPortal(builderContent, document.body) : builderContent;
};