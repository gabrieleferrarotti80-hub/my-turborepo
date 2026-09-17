import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useFirebaseData } from 'shared-core';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, serverTimestamp, writeBatch } from 'firebase/firestore';
import { 
    MagnifyingGlassIcon, PlusIcon, PencilSquareIcon, TrashIcon, 
    ClipboardDocumentListIcon, DocumentArrowUpIcon, FolderIcon, 
    ChevronLeftIcon, ChevronRightIcon, ExclamationTriangleIcon, XMarkIcon, 
    AdjustmentsHorizontalIcon, LinkIcon, FolderOpenIcon, SparklesIcon,
    CheckBadgeIcon, ForwardIcon, ArrowPathIcon, BoltIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, CheckCircleIcon } from '@heroicons/react/24/solid';
import * as XLSX from 'xlsx';

import { CsvImportModal } from './CsvImportModal'; 
import { VoceListinoForm } from './VoceListinoForm';
import { WbsManagerModal } from './WbsManagerModal'; 
import { DashboardPurgatorio } from '../super-admin/DashboardPurgatorio'; 

const ITEMS_PER_PAGE = 50; 

export const ListiniManager = () => {
    const { db, userAziendaId } = useFirebaseData();
    const effectiveCompanyId = userAziendaId || 'GLOBAL_MASTER';
    
    const [listino, setListino] = useState([]);
    const [vociMasterDalDB, setVociMasterDalDB] = useState([]);
    const [wbsNodes, setWbsNodes] = useState([]); 
    const [isLoading, setIsLoading] = useState(true);
    
    const [activeTab, setActiveTab] = useState('wbs'); 
    
    const [searchTerm, setSearchTerm] = useState('');
    const [nomeListinoFilter, setNomeListinoFilter] = useState(''); 
    const [currentPage, setCurrentPage] = useState(1);
    
    const fileInputRef = useRef(null);
    const [wbsSelectionFromModal, setWbsSelectionFromModal] = useState(null); 

    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0); 
    const [importTotal, setImportTotal] = useState(0);
    const [showCsvModal, setShowCsvModal] = useState(false);
    const [csvAllRows, setCsvAllRows] = useState([]);
    const [nomeCatalogoTemp, setNomeCatalogoTemp] = useState('');
    const [colMap, setColMap] = useState({ codice: 0, descrizione: 1, um: 2, prezzo: 3, prezzoPuro: 4, manodopera: 5 });

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isWbsModalOpen, setIsWbsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [catalogoToDelete, setCatalogoToDelete] = useState('');
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const [matchIndex, setMatchIndex] = useState(0);
    const [isAutoMatching, setIsAutoMatching] = useState(false);
    const [orphanToLink, setOrphanToLink] = useState(null);

    const [formData, setFormData] = useState({
        nomeListino: 'Dizionario Aziendale', codice: '', descrizione: '', 
        wbsNodeId: null, unitaMisura: 'cad', 
        prezzoUnitario: 0, isMaster: true, note: ''
    });

    useEffect(() => {
        if (!db) return;
        setIsLoading(true);
        
        const qListini = query(collection(db, 'listini_aziendali'), where('companyID', '==', effectiveCompanyId));
        const unsubListini = onSnapshot(qListini, (snapshot) => {
            setListino(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const qMaster = query(collection(db, 'master_universali'), where('companyID', '==', effectiveCompanyId));
        const unsubMaster = onSnapshot(qMaster, (snapshot) => {
            setVociMasterDalDB(snapshot.docs.map(doc => ({ id: doc.id, isMaster: true, ...doc.data() })));
            setIsLoading(false);
        });

        const qWbs = query(collection(db, 'wbs_nodes'));
        const unsubWbs = onSnapshot(qWbs, (snapshot) => {
            setWbsNodes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => { unsubListini(); unsubMaster(); unsubWbs(); };
    }, [db, effectiveCompanyId]);

    const getFullBreadcrumb = (nodeId) => {
        if (!nodeId) return 'N.D.';
        const path = [];
        let curr = wbsNodes.find(n => n.id === nodeId);
        let safeCounter = 0; 
        while (curr && safeCounter < 15) {
            path.unshift(curr.nome);
            curr = wbsNodes.find(n => n.id === curr.parentId);
            safeCounter++;
        }
        return path.join(' > '); 
    };

    const getNextUniCode = () => {
        const pattern = /^UNI-11-(\d+)$/;
        const numbers = vociMasterDalDB
            .map(m => {
                const match = (m.codice || '').match(pattern);
                return match ? parseInt(match[1], 10) : 0;
            })
            .filter(n => n > 0);
            
        const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
        return `UNI-11-${String(nextNum).padStart(3, '0')}`;
    };

    const masterMap = useMemo(() => {
        const map = {};
        vociMasterDalDB.forEach(m => map[m.id] = m);
        return map;
    }, [vociMasterDalDB]);

    const listiniDisponibili = useMemo(() => [...new Set(listino.map(i => i.nomeListino).filter(n => n))].sort(), [listino]);

    const dataWbsFiltered = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return vociMasterDalDB.filter(item => 
            (item.codice + ' ' + item.descrizione).toLowerCase().includes(lowerSearch)
        ).sort((a, b) => {
            if (!searchTerm) {
                const timeA = a.createdAt?.seconds || 0; 
                const timeB = b.createdAt?.seconds || 0;
                return timeB - timeA;
            }
            return (a.codice || '').localeCompare(b.codice || '');
        });
    }, [vociMasterDalDB, searchTerm]);

    const dataLibreriaFiltered = useMemo(() => {
        return listino.filter(item => {
            const matchSearch = (item.codice + ' ' + item.descrizione).toLowerCase().includes(searchTerm.toLowerCase());
            const matchListino = nomeListinoFilter ? item.nomeListino === nomeListinoFilter : true;
            return matchSearch && matchListino;
        }).sort((a, b) => (a.codice || '').localeCompare(b.codice || ''));
    }, [listino, searchTerm, nomeListinoFilter]);

    // 🌟 STATISTICHE PRECISE PER LA LIBRERIA
    const libreriaStats = useMemo(() => {
        const baseList = nomeListinoFilter ? listino.filter(i => i.nomeListino === nomeListinoFilter) : listino;
        const agganciati = baseList.filter(i => i.masterId && masterMap[i.masterId]).length;
        const daMappare = baseList.length - agganciati;
        return { totali: baseList.length, agganciati, daMappare };
    }, [listino, masterMap, nomeListinoFilter]);

    // 🌟 FIX: Formula Orfani
    const orfani = useMemo(() => {
        let baseOrfani = listino.filter(item => (!item.masterId || !masterMap[item.masterId]));
        if (nomeListinoFilter && nomeListinoFilter !== "") {
            baseOrfani = baseOrfani.filter(item => item.nomeListino === nomeListinoFilter);
        }
        return baseOrfani;
    }, [listino, masterMap, nomeListinoFilter]);

    useEffect(() => {
        setMatchIndex(0);
        setCurrentPage(1);
    }, [nomeListinoFilter, activeTab, searchTerm]);

    const safeMatchIndex = Math.min(matchIndex, Math.max(0, orfani.length - 1));
    const currentOrphan = orfani.length > 0 ? orfani[safeMatchIndex] : null;

    const suggerimentiMatch = useMemo(() => {
        if (!currentOrphan) return [];
        const exact = vociMasterDalDB.filter(m => m.codice?.toLowerCase() === currentOrphan.codice?.toLowerCase());
        
        const descSafe = currentOrphan.descrizione || '';
        const words = descSafe.toLowerCase().split(' ').filter(w => w.length > 4);
        
        const textMatches = vociMasterDalDB.filter(m => 
            !exact.includes(m) && words.some(w => (m.descrizione || '').toLowerCase().includes(w))
        );
        return [...exact, ...textMatches].slice(0, 3);
    }, [currentOrphan, vociMasterDalDB]);

    const paginatedDataWbs = useMemo(() => dataWbsFiltered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [dataWbsFiltered, currentPage]);
    const paginatedDataLibreria = useMemo(() => dataLibreriaFiltered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [dataLibreriaFiltered, currentPage]);

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const defaultName = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, ' ');
        const nome = window.prompt("Nome Listino (Es. Prezzario Regione 2026):", defaultName);
        if (!nome || nome.trim() === '') { if (fileInputRef.current) fileInputRef.current.value = ''; return; }
        
        setNomeCatalogoTemp(nome.trim());
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(e.target.result, { type: 'binary' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const allRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
                setCsvAllRows(allRows.filter(row => row.some(cell => String(cell).trim() !== "")));
                setShowCsvModal(true);
            } catch (error) { alert("Errore lettura Excel."); }
        };
        reader.readAsBinaryString(file);
    };

    const eseguiImportazione = async () => {
        setShowCsvModal(false); setIsImporting(true); setImportProgress(0); setImportTotal(csvAllRows.length);
        const CHUNK_SIZE = 450; let batch = writeBatch(db); let operationCount = 0; let totalImported = 0;

        try {
            for (let i = 0; i < csvAllRows.length; i++) {
                const row = csvAllRows[i];
                const codice = String(row[colMap.codice] || '').trim();
                if (!codice) continue; 

                let umRaw = colMap.um !== -1 ? String(row[colMap.um] || '').trim().toLowerCase() : 'cad';
                
                // Parsing Prezzo Unitario
                let prezzoVal = row[colMap.prezzo];
                if (typeof prezzoVal === 'string') prezzoVal = parseFloat(prezzoVal.replace(/[^0-9,-]+/g,"").replace(',', '.')) || 0;
                else if (typeof prezzoVal !== 'number') prezzoVal = 0;

                // 🌟 NUOVO: Parsing Prezzo Puro (Senza Manodopera) 🌟
                let prezzoPuroVal = null;
                if (colMap.prezzoPuro !== -1 && row[colMap.prezzoPuro] !== undefined && row[colMap.prezzoPuro] !== '') {
                    let pRaw = row[colMap.prezzoPuro];
                    if (typeof pRaw === 'string') pRaw = parseFloat(pRaw.replace(/[^0-9,-]+/g,"").replace(',', '.'));
                    if (!isNaN(pRaw)) prezzoPuroVal = pRaw;
                }

                // 🌟 NUOVO: Parsing Incidenza Manodopera 🌟
                let manodoperaVal = null;
                if (colMap.manodopera !== -1 && row[colMap.manodopera] !== undefined && row[colMap.manodopera] !== '') {
                    let mRaw = row[colMap.manodopera];
                    if (typeof mRaw === 'string') mRaw = parseFloat(mRaw.replace(/[^0-9,-]+/g,"").replace(',', '.'));
                    if (!isNaN(mRaw)) manodoperaVal = mRaw;
                }

                batch.set(doc(collection(db, 'listini_aziendali')), {
                    companyID: effectiveCompanyId, 
                    nomeListino: nomeCatalogoTemp,
                    codice: codice, 
                    descrizione: String(row[colMap.descrizione] || '').trim(),
                    unitaMisura: umRaw, 
                    prezzoUnitario: prezzoVal,
                    prezzoPuro: prezzoPuroVal, // Salvato nel database!
                    incidenzaManodopera: manodoperaVal, // Salvato nel database!
                    isMaster: false, 
                    masterId: null, 
                    createdAt: serverTimestamp() 
                });

                operationCount++; totalImported++;
                if (operationCount >= CHUNK_SIZE) {
                    await batch.commit(); batch = writeBatch(db); operationCount = 0; 
                    setImportProgress(totalImported); await new Promise(resolve => setTimeout(resolve, 50)); 
                }
            }
            if (operationCount > 0) { await batch.commit(); setImportProgress(totalImported); }
            alert(`✅ Importate ${totalImported} voci da Excel.`);
            setActiveTab('match'); 
        } catch (error) { alert("Errore durante l'importazione."); } finally {
            setIsImporting(false); setImportProgress(0); if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const payload = { 
            ...formData, companyID: effectiveCompanyId, updatedAt: serverTimestamp(),
            prezzoUnitario: Number(formData.prezzoUnitario),
            createdAt: formData.createdAt || serverTimestamp()
        };
        
        delete payload.id;
        delete payload.masterId;

        try {
            if (editingId) {
                const originalItem = [...vociMasterDalDB, ...listino].find(i => i.id === editingId);
                const collectionName = originalItem?.isMaster ? 'master_universali' : 'listini_aziendali';
                await updateDoc(doc(db, collectionName, editingId), payload);
            } else {
                const collectionName = formData.isMaster ? 'master_universali' : 'listini_aziendali';
                const newDocRef = await addDoc(collection(db, collectionName), payload);
                
                if (orphanToLink && formData.isMaster) {
                    await updateDoc(doc(db, 'listini_aziendali', orphanToLink), {
                        masterId: newDocRef.id,
                        wbsNodeId: formData.wbsNodeId
                    });
                    setOrphanToLink(null);
                }
            }
            setIsFormOpen(false);
        } catch (error) { alert("Errore salvataggio."); }
    };

    const handleDelete = async (item) => {
        if(!window.confirm("Eliminare definitivamente questa voce?")) return;
        const collectionName = item.isMaster ? 'master_universali' : 'listini_aziendali';
        
        try {
            await deleteDoc(doc(db, collectionName, item.id)); 

            if (item.isMaster) {
                const vociDaScollegare = listino.filter(l => l.masterId === item.id);
                if (vociDaScollegare.length > 0) {
                    const batch = writeBatch(db);
                    vociDaScollegare.forEach(voce => {
                        batch.update(doc(db, 'listini_aziendali', voce.id), {
                            masterId: null,
                            wbsNodeId: null
                        });
                    });
                    await batch.commit();
                }
            }
        } catch (error) {
            console.error("Errore eliminazione:", error);
            alert("Errore durante l'eliminazione.");
        }
    };

    const executeDeleteCatalogo = async () => {
        if (catalogoToDelete !== deleteConfirmText) { alert("Nomi non corrispondenti."); return; }
        const vociDaEliminare = listino.filter(item => item.nomeListino === catalogoToDelete);
        setIsDeleteModalOpen(false); setIsImporting(true); setImportTotal(vociDaEliminare.length); setImportProgress(0);
        const CHUNK_SIZE = 450; let batch = writeBatch(db); let operationCount = 0; let deletedCount = 0;

        try {
            for (let i = 0; i < vociDaEliminare.length; i++) {
                batch.delete(doc(db, 'listini_aziendali', vociDaEliminare[i].id)); 
                operationCount++; deletedCount++;
                if (operationCount >= CHUNK_SIZE) {
                    await batch.commit(); batch = writeBatch(db); operationCount = 0;
                    setImportProgress(deletedCount); await new Promise(resolve => setTimeout(resolve, 50)); 
                }
            }
            if (operationCount > 0) { await batch.commit(); setImportProgress(deletedCount); }
            alert(`✅ Eliminazione completata! ${deletedCount} voci rimosse.`);
        } catch (error) { alert("Errore eliminazione."); } finally { setIsImporting(false); setImportProgress(0); }
    };

    const eseguiAutoMatchMassivo = async () => {
        if(!window.confirm("Il sistema cercherà corrispondenze esatte tra i codici del listino e i tuoi Master. Procedere?")) return;
        setIsAutoMatching(true);
        const batch = writeBatch(db);
        let count = 0;

        orfani.forEach(orphan => {
            const exactMatch = vociMasterDalDB.find(m => m.codice?.toLowerCase() === orphan.codice?.toLowerCase());
            if (exactMatch) {
                batch.update(doc(db, 'listini_aziendali', orphan.id), {
                    masterId: exactMatch.id,
                    wbsNodeId: exactMatch.wbsNodeId || null
                });
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
            alert(`⚡ Incredibile! Collegate ${count} voci in un colpo solo.`);
        } else {
            alert("Nessuna corrispondenza esatta trovata. Usa il Matcher Manuale.");
        }
        setIsAutoMatching(false);
        setMatchIndex(0);
    };

    const collegaSingoloOrfano = async (orphanId, masterObj) => {
        try {
            await updateDoc(doc(db, 'listini_aziendali', orphanId), {
                masterId: masterObj.id,
                wbsNodeId: masterObj.wbsNodeId || null
            });
        } catch (e) { alert("Errore collegamento."); }
    };

    const handleApriCreazioneMaster = () => {
        if (!currentOrphan) return;

        let predictedWbsId = null;
        if (suggerimentiMatch.length > 0 && suggerimentiMatch[0].wbsNodeId) {
            predictedWbsId = suggerimentiMatch[0].wbsNodeId;
        } else {
            const descSafe = currentOrphan.descrizione || '';
            const descLower = descSafe.toLowerCase();
            const matchedNodes = wbsNodes.filter(n => n.nome && n.nome.length > 3 && descLower.includes(n.nome.toLowerCase()));
            if (matchedNodes.length > 0) {
                matchedNodes.sort((a, b) => b.nome.length - a.nome.length);
                predictedWbsId = matchedNodes[0].id;
            }
        }

        const { id, masterId, nomeListino, createdAt, updatedAt, companyID, ...cleanOrphan } = currentOrphan;

        setOrphanToLink(currentOrphan.id); 
        setEditingId(null); 
        setFormData({ 
            ...cleanOrphan, 
            codice: getNextUniCode(), 
            nomeListino: 'Dizionario Aziendale',
            isMaster: true, 
            wbsNodeId: predictedWbsId,
            prezzoUnitario: 0
        });
        setIsFormOpen(true);
    };

    const handleCreateWbsNode = async (parentId, nome) => {
        try {
            const cleanParentId = parentId ? parentId : null;
            const docRef = await addDoc(collection(db, 'wbs_nodes'), {
                nome, parentId: cleanParentId, companyID: effectiveCompanyId, createdAt: serverTimestamp()
            });
            return docRef.id;
        } catch (error) { console.error("Errore WBS:", error); return null; }
    };

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-full flex flex-col h-full overflow-hidden">
            
            <div className="flex flex-col gap-6 mb-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <AdjustmentsHorizontalIcon className="h-8 w-8 text-indigo-600" /> Control Room Dati
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Gestisci i Master aziendali, importa listini e normalizza i dati.</p>
                </div>
                
                <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 w-fit">
                    <button onClick={() => setActiveTab('wbs')} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'wbs' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                        👑 Dizionario WBS (Master)
                    </button>
                    <button onClick={() => setActiveTab('libreria')} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'libreria' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                        📚 Libreria Listini Esterni
                    </button>
                    <button onClick={() => setActiveTab('match')} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'match' ? 'bg-emerald-500 text-white shadow-md' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}>
                        <SparklesIcon className="h-5 w-5"/> Smart Match <span className="bg-white text-emerald-600 px-2 py-0.5 rounded-full text-xs">{orfani.length}</span>
                    </button>
                    <button onClick={() => setActiveTab('purgatorio')} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'purgatorio' ? 'bg-amber-500 text-white shadow-md' : 'text-amber-600 bg-amber-50 hover:bg-amber-100'}`}>
                        🔥 Purgatorio Cantieri
                    </button>
                </div>
            </div>

            {activeTab === 'wbs' && (
                <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
                        <div className="relative w-96"><MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" /><input type="text" placeholder="Cerca nei Master..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                        <div className="flex gap-2">
                            <button onClick={() => setIsWbsModalOpen(true)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 flex items-center gap-2"><FolderOpenIcon className="h-5 w-5" /> Tassonomia Albero</button>
                            <button onClick={() => { setEditingId(null); setFormData({ nomeListino: 'Dizionario Aziendale', codice: getNextUniCode(), descrizione: '', wbsNodeId: null, unitaMisura: 'cad', prezzoUnitario: 0, isMaster: true }); setIsFormOpen(true); }} className="px-5 py-2 bg-indigo-600 text-white font-black rounded-xl shadow-md hover:bg-indigo-700 flex items-center gap-2"><PlusIcon className="h-5 w-5" /> Nuovo Master</button>
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-100 sticky top-0 z-10">
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest"><th className="px-6 py-3 text-left">Cartella WBS</th><th className="px-6 py-3 text-left">Codice</th><th className="px-6 py-3 text-left">Descrizione Master</th><th className="px-6 py-3 text-center">U.M.</th><th className="px-6 py-3 text-right">Costo Storico</th><th className="px-6 py-3 text-center">Azioni</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedDataWbs.map(item => (
                                    <tr key={item.id} className="hover:bg-indigo-50/30">
                                        <td className="px-6 py-3 text-[10px] font-bold text-indigo-600"><FolderIcon className="h-3 w-3 inline mr-1"/> {getFullBreadcrumb(item.wbsNodeId)}</td>
                                        <td className="px-6 py-3 font-black text-slate-800">{item.codice}</td>
                                        <td className="px-6 py-3 text-sm text-slate-600 font-medium">{item.descrizione}</td>
                                        <td className="px-6 py-3 text-center"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase">{item.unitaMisuraRiferimento || item.unitaMisura}</span></td>
                                        <td className="px-6 py-3 text-right font-black text-slate-900">€ {(item.prezzoUnitario || 0).toFixed(2)}</td>
                                        <td className="px-6 py-3 text-center">
                                            <button onClick={() => { setEditingId(item.id); setFormData(item); setIsFormOpen(true); }} className="p-1 text-indigo-600 hover:bg-indigo-100 rounded mr-2"><PencilSquareIcon className="h-5 w-5"/></button>
                                            <button onClick={() => handleDelete(item)} className="p-1 text-red-500 hover:bg-red-100 rounded"><TrashIcon className="h-5 w-5"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'libreria' && (
                <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up relative">
                    {isImporting && (<div className="absolute inset-0 z-50 bg-white/80 backdrop-blur flex items-center justify-center"><div className="bg-white p-6 rounded-2xl shadow-xl flex items-center gap-4 border border-indigo-100"><ArrowPathIcon className="h-8 w-8 text-indigo-600 animate-spin"/><div className="text-left"><p className="font-black text-indigo-900">Elaborazione in corso...</p><p className="text-sm font-bold text-indigo-500">Righe processate: {importProgress} / {importTotal}</p></div></div></div>)}
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-4 items-center shrink-0">
                        <select value={nomeListinoFilter} onChange={e => setNomeListinoFilter(e.target.value)} className="p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold outline-none min-w-[200px] cursor-pointer"><option value="">-- Tutti i Cataloghi --</option>{listiniDisponibili.map(l => <option key={l} value={l}>{l}</option>)}</select>
                        <div className="relative flex-1 min-w-[200px]"><MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" /><input type="text" placeholder="Cerca voce importata..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                        
                        <div className="flex items-center gap-2 mr-auto bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
                            <span className="text-[10px] font-black text-slate-500 uppercase">Voci Totali: <span className="text-slate-800">{libreriaStats.totali}</span></span>
                            <span className="text-slate-300">|</span>
                            <span className="text-[10px] font-black text-emerald-600 uppercase">Agganciate: <span className="text-emerald-800">{libreriaStats.agganciati}</span></span>
                            <span className="text-slate-300">|</span>
                            <span className="text-[10px] font-black text-amber-600 uppercase">Da Mappare: <span className="text-amber-800">{libreriaStats.daMappare}</span></span>
                        </div>

                        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileSelect} />
                        <button onClick={() => fileInputRef.current.click()} className="px-5 py-2.5 bg-emerald-50 text-emerald-700 font-black rounded-xl border border-emerald-200 hover:bg-emerald-600 hover:text-white flex items-center gap-2 transition-all"><DocumentArrowUpIcon className="h-5 w-5" /> Importa Excel</button>
                        <button onClick={() => { setCatalogoToDelete(''); setDeleteConfirmText(''); setIsDeleteModalOpen(true); }} className="px-4 py-2.5 bg-red-50 text-red-600 font-bold rounded-xl border border-red-200 hover:bg-red-600 hover:text-white flex items-center gap-2 transition-all"><TrashIcon className="h-5 w-5" /></button>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-100 sticky top-0 z-10">
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest"><th className="px-6 py-3 text-left">Catalogo</th><th className="px-6 py-3 text-left">Codice</th><th className="px-6 py-3 text-left">Descrizione Originale</th><th className="px-6 py-3 text-right">Prezzo Base</th><th className="px-6 py-3 text-center">Stato Mappatura</th><th className="px-6 py-3 text-center">Azioni</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedDataLibreria.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 text-[10px] font-bold text-slate-500"><FolderIcon className="h-3 w-3 inline mr-1"/> {item.nomeListino}</td>
                                        <td className="px-6 py-3 font-black text-slate-700">{item.codice}</td>
                                        <td className="px-6 py-3 text-sm text-slate-600 line-clamp-1">{item.descrizione}</td>
                                        <td className="px-6 py-3 text-right font-bold text-slate-800">€ {(item.prezzoUnitario || 0).toFixed(2)}</td>
                                        <td className="px-6 py-3 text-center">
                                            {item.masterId && masterMap[item.masterId] ? (
                                                <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md text-[9px] font-black uppercase flex items-center justify-center gap-1 w-max mx-auto"><LinkIcon className="h-3 w-3"/> Agganciato</span>
                                            ) : (
                                                <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-md text-[9px] font-black uppercase flex items-center justify-center gap-1 w-max mx-auto"><ExclamationTriangleIcon className="h-3 w-3"/> Da Mappare</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-center"><button onClick={() => handleDelete(item)} className="p-1 text-red-400 hover:bg-red-100 rounded"><TrashIcon className="h-5 w-5"/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'match' && (
                <div className="flex-1 flex flex-col items-center justify-center bg-slate-100 rounded-3xl overflow-hidden p-6 animate-fade-in">
                    
                    <div className="w-full max-w-6xl flex flex-wrap justify-between items-end gap-4 mb-6">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><SparklesIcon className="h-7 w-7 text-emerald-500"/> Normalizzatore A.I.</h2>
                            <p className="text-slate-500 font-medium">Abbiamo trovato <b className="text-emerald-600">{orfani.length}</b> voci esterne da collegare.</p>
                        </div>
                        
                        <div className="flex flex-wrap gap-3 items-center">
                            <select 
                                value={nomeListinoFilter} 
                                onChange={e => { setNomeListinoFilter(e.target.value); setMatchIndex(0); }} 
                                className="p-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 outline-none shadow-sm focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                            >
                                <option value="">-- Filtra per Catalogo (Tutti) --</option>
                                {listiniDisponibili.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>

                            <button onClick={() => setIsWbsModalOpen(true)} className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-6 py-3 rounded-2xl font-black shadow-sm transition-all active:scale-95 flex items-center gap-2">
                                <FolderOpenIcon className="h-5 w-5" /> Tassonomia Albero
                            </button>

                            <button 
                                onClick={eseguiAutoMatchMassivo} 
                                disabled={isAutoMatching || orfani.length === 0}
                                className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isAutoMatching ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <BoltIcon className="h-5 w-5 text-yellow-400" />}
                                Auto-Match per Codice
                            </button>
                        </div>
                    </div>

                    {orfani.length === 0 ? (
                        <div className="bg-white p-12 rounded-[2rem] shadow-xl border border-emerald-100 flex flex-col items-center text-center w-full max-w-4xl">
                            <CheckBadgeIcon className="h-24 w-24 text-emerald-400 mb-4" />
                            <h3 className="text-3xl font-black text-slate-800">Tutto Normalizzato!</h3>
                            <p className="text-slate-500 font-medium mt-2">Non ci sono più voci orfane nel database per il listino selezionato.</p>
                        </div>
                    ) : (
                        <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-stretch">
                            
                            <div className="w-full lg:w-[35%] shrink-0 bg-white p-6 lg:p-8 rounded-[2rem] shadow-xl border border-slate-200 flex flex-col relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-2 bg-amber-400"></div>
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg w-max mb-4">Voce Esterna {safeMatchIndex + 1} di {orfani.length}</span>
                                
                                <p className="text-sm font-bold text-indigo-600 mb-1 truncate"><FolderIcon className="h-4 w-4 inline"/> {currentOrphan?.nomeListino}</p>
                                <h3 className="text-2xl font-black text-slate-800 leading-tight mb-4 break-words">{currentOrphan?.codice}</h3>
                                <p className="text-sm text-slate-600 font-medium bg-slate-50 p-4 rounded-xl border border-slate-100 flex-1 overflow-y-auto max-h-[250px] break-words">{currentOrphan?.descrizione}</p>
                                
                                <div className="mt-6 flex justify-between items-end border-t border-slate-100 pt-4 shrink-0">
                                    <div className="min-w-0 mr-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">U.M.</p>
                                        <p className="font-bold text-slate-800 uppercase truncate">{currentOrphan?.unitaMisura}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Prezzo Letto</p>
                                        <p className="font-black text-slate-800 text-xl lg:text-2xl">€ {(currentOrphan?.prezzoUnitario || 0).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden lg:flex flex-col justify-center items-center shrink-0">
                                <ForwardIcon className="h-10 w-10 text-slate-300" />
                            </div>

                            <div className="w-full lg:flex-1 min-w-0 flex flex-col gap-3">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">Suggerimenti Master</p>
                                
                                {suggerimentiMatch.length === 0 ? (
                                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center flex-1 flex flex-col items-center justify-center">
                                        <p className="text-slate-500 font-medium mb-4">Nessun Master somiglia a questa voce.</p>
                                        <button onClick={handleApriCreazioneMaster} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white px-6 py-3 rounded-xl font-black transition-colors flex items-center gap-2">
                                            <PlusIcon className="h-5 w-5"/> Promuovi a Nuovo Master
                                        </button>
                                    </div>
                                ) : (
                                    suggerimentiMatch.map((sug, i) => (
                                        <div key={sug.id} className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex items-center gap-4 group relative cursor-help hover:z-50">
                                            
                                            <div className="bg-emerald-50 text-emerald-600 h-10 w-10 rounded-full flex items-center justify-center font-black shrink-0">{i+1}</div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded w-max">{sug.codice}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 truncate flex items-center gap-1">
                                                        <FolderOpenIcon className="h-3 w-3 shrink-0"/> {getFullBreadcrumb(sug.wbsNodeId)}
                                                    </p>
                                                </div>
                                                <p className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight">{sug.descrizione}</p>
                                            </div>
                                            
                                            <button onClick={() => collegaSingoloOrfano(currentOrphan.id, sug)} className="bg-emerald-500 text-white p-3 rounded-xl shadow-md hover:bg-emerald-600 active:scale-95 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 relative z-10">
                                                <LinkIcon className="h-5 w-5"/>
                                            </button>

                                            <div className="absolute top-[80%] left-0 mt-2 hidden group-hover:block w-full min-w-[100%] z-[100] bg-slate-900 text-white p-4 rounded-2xl shadow-2xl animate-fade-in-down border border-slate-700 pointer-events-none">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[10px] font-black bg-indigo-500 text-white px-2 py-0.5 rounded shrink-0">{sug.codice}</span>
                                                    <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1 truncate">
                                                        <FolderOpenIcon className="h-3 w-3 shrink-0"/> {getFullBreadcrumb(sug.wbsNodeId)}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium leading-relaxed">{sug.descrizione}</p>
                                            </div>
                                        </div>
                                    ))
                                )}

                                <div className="mt-auto pt-4 flex gap-2">
                                    <button onClick={() => setMatchIndex(prev => (prev < orfani.length - 1 ? prev + 1 : 0))} className="flex-1 bg-slate-200 text-slate-600 hover:bg-slate-300 py-3 rounded-xl font-bold transition-colors">
                                        Salta Voce
                                    </button>
                                    <button onClick={handleApriCreazioneMaster} className="flex-1 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                                        <PlusIcon className="h-5 w-5"/> Crea Master
                                    </button>
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            )}

            {activeTab === 'purgatorio' && (
                <div className="flex-1 overflow-hidden">
                    <DashboardPurgatorio 
                        db={db} 
                        effectiveCompanyId={effectiveCompanyId} 
                        vociMasterDB={vociMasterDalDB} 
                        wbsNodes={wbsNodes} 
                        onOpenWbsManager={() => setIsWbsModalOpen(true)} 
                        externalWbsSelection={wbsSelectionFromModal} 
                        onClearWbsSelection={() => setWbsSelectionFromModal(null)} 
                    />
                </div>
            )}

            <WbsManagerModal isOpen={isWbsModalOpen} onClose={() => setIsWbsModalOpen(false)} onSelect={(nodeId) => { setWbsSelectionFromModal(nodeId); setIsWbsModalOpen(false); }} />
            <CsvImportModal isOpen={showCsvModal} onClose={() => setShowCsvModal(false)} onImport={eseguiImportazione} nomeCatalogoTemp={nomeCatalogoTemp} colMap={colMap} setColMap={setColMap} maxColsOptions={csvAllRows.length > 0 ? Array.from({length: csvAllRows[0].length}, (_,i)=>i) : []} csvAllRows={csvAllRows} />
            <VoceListinoForm 
                isOpen={isFormOpen} 
                onClose={() => setIsFormOpen(false)} 
                onSave={handleSave} 
                editingId={editingId} 
                formData={formData} 
                setFormData={setFormData} 
                wbsNodes={wbsNodes} 
                onAddWbsNode={handleCreateWbsNode}
                handleChange={(e) => { const {name, value, type, checked} = e.target; setFormData(prev => ({...prev, [name]: type === 'checkbox' ? checked : value})); }} 
            />
            
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
                        <div className="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100 relative">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="absolute top-4 right-4 p-2 text-red-400 hover:bg-red-100 rounded-full transition-colors"><XMarkIcon className="h-5 w-5"/></button>
                            <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><ExclamationTriangleIcon className="h-8 w-8" /></div>
                            <h3 className="text-xl font-black text-red-900">Elimina Intero Catalogo</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div><select value={catalogoToDelete} onChange={(e) => { setCatalogoToDelete(e.target.value); setDeleteConfirmText(''); }} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-500"><option value="" disabled>-- Scegli un catalogo --</option>{listiniDisponibili.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                            {catalogoToDelete && (<input type="text" placeholder="Copia e incolla il nome esatto qui per confermare..." value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} className={`w-full p-3 border rounded-xl text-sm font-bold outline-none transition-colors ${deleteConfirmText === catalogoToDelete ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : 'bg-white border-slate-300'}`} />)}
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200">Annulla</button>
                            <button onClick={executeDeleteCatalogo} disabled={!catalogoToDelete || catalogoToDelete !== deleteConfirmText} className="px-5 py-2.5 bg-red-600 text-white font-black rounded-xl shadow-md hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"><TrashIcon className="h-5 w-5" /> Conferma Eliminazione</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};