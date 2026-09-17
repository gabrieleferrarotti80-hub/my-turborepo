import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, doc, updateDoc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { 
    ExclamationTriangleIcon, BoltIcon, CheckBadgeIcon, 
    DocumentTextIcon, ClipboardDocumentCheckIcon, SparklesIcon,
    PlusCircleIcon, FolderOpenIcon, XMarkIcon, BuildingOfficeIcon, ClockIcon, TagIcon, AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

export const DashboardPurgatorio = ({ db, effectiveCompanyId, vociMasterDB, wbsNodes, onOpenWbsManager, externalWbsSelection, onClearWbsSelection }) => {
    const [peccatori, setPeccatori] = useState([]);
    const [aziendeMap, setAziendeMap] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [selectedMasterId, setSelectedMasterId] = useState({});
    
    // Stato per la promozione Standardizzata
    const [itemToPromote, setItemToPromote] = useState(null);
    const [promotionData, setPromotionData] = useState({ nomeUfficiale: '', codiceUfficiale: '', wbsNodeId: '' });

useEffect(() => {
        if (externalWbsSelection && itemToPromote) {
            setPromotionData(prev => ({ ...prev, wbsNodeId: externalWbsSelection }));
            if (onClearWbsSelection) onClearWbsSelection(); // Resetta il ponte
        }
    }, [externalWbsSelection, itemToPromote, onClearWbsSelection]);

    useEffect(() => {
        if (!db) return;
        setIsLoading(true);

        const unsubAziende = onSnapshot(collection(db, 'aziende'), (snap) => {
            const map = {};
            snap.forEach(d => map[d.id] = d.data().ragioneSociale || d.data().nome || d.id);
            setAziendeMap(map);
        });

        const qPrev = query(collection(db, 'offerte'));
        const unsubPrev = onSnapshot(qPrev, (snapshot) => {
            const prevTemp = [];
            snapshot.docs.forEach(documento => {
                const data = documento.data();
                const dataOra = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString('it-IT') : 'N.D.';

                if (data.fasi && Array.isArray(data.fasi)) {
                    data.fasi.forEach(fase => {
                        if (fase.masterId?.startsWith('TEMP-')) {
                            prevTemp.push({
                                uniqueKey: `${documento.id}_${fase.id}`,
                                docId: documento.id,
                                collectionName: 'offerte',
                                originalArray: data.fasi,
                                faseId: fase.id,
                                testoOriginale: fase.titolo,
                                unitaMisura: fase.umFase,
                                quantita: fase.quantitaFase,
                                companyID: data.companyID,
                                dataOra: dataOra,
                                type: 'preventivo'
                            });
                        }
                    });
                }
            });
            
            const qRep = query(collection(db, 'reports'));
            const unsubRep = onSnapshot(qRep, (snapRep) => {
                const repTemp = [];
                snapRep.docs.forEach(documento => {
                    const data = documento.data();
                    const dataOra = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString('it-IT') : 'N.D.';

                    if (data.datiRiepilogo?.lavorazioni) {
                        data.datiRiepilogo.lavorazioni.forEach(lav => {
                            if (lav.masterId?.startsWith('TEMP-')) {
                                repTemp.push({
                                    uniqueKey: `${documento.id}_${lav.id}`,
                                    docId: documento.id,
                                    collectionName: 'reports',
                                    originalArray: data.datiRiepilogo.lavorazioni,
                                    faseId: lav.id,
                                    testoOriginale: lav.descrizione,
                                    unitaMisura: lav.um,
                                    quantita: lav.quantitaProdotta,
                                    companyID: data.companyID,
                                    dataOra: dataOra,
                                    type: 'report'
                                });
                            }
                        });
                    }
                });
                setPeccatori([...prevTemp, ...repTemp].sort((a, b) => b.dataOra.localeCompare(a.dataOra)));
                setIsLoading(false);
            });
            return () => unsubRep();
        });
        return () => { unsubPrev(); unsubAziende(); };
    }, [db]);

    const getFullBreadcrumb = (nodeId) => {
        let path = [];
        let curr = wbsNodes.find(n => n.id === nodeId);
        while (curr) { path.unshift(curr.nome); curr = wbsNodes.find(n => n.id === curr.parentId); }
        return path.join(' > ');
    };

    const wbsFolders = useMemo(() => {
        return wbsNodes
            .map(n => ({ id: n.id, label: getFullBreadcrumb(n.id) }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [wbsNodes]);

    const avviaPromozione = (item) => {
        setItemToPromote(item);
        const randomCode = `UNI-${Math.floor(1000 + Math.random() * 9000)}`;
        setPromotionData({ nomeUfficiale: item.testoOriginale, codiceUfficiale: randomCode, wbsNodeId: '' });
    };

    const eseguiPromozioneStandard = async () => {
        if (!promotionData.wbsNodeId || !promotionData.nomeUfficiale) return alert("Inserisci Nome e Categoria WBS!");
        
        setProcessingId(itemToPromote.uniqueKey);
        try {
            const masterPayload = {
                companyID: effectiveCompanyId,
                codice: promotionData.codiceUfficiale,
                descrizione: promotionData.nomeUfficiale,
                unitaMisuraRiferimento: itemToPromote.unitaMisura,
                wbsNodeId: promotionData.wbsNodeId,
                isMaster: true,
                createdAt: serverTimestamp()
            };
            const newMasterRef = await addDoc(collection(db, 'master_universali'), masterPayload);
            await finalizzaNormalizzazione(itemToPromote, newMasterRef.id, promotionData.codiceUfficiale, promotionData.wbsNodeId);
            setItemToPromote(null);
        } catch (e) { console.error(e); } finally { setProcessingId(null); }
    };

    const finalizzaNormalizzazione = async (item, masterId, masterCodice, wbsId) => {
        const docRef = doc(db, item.collectionName, item.docId);
        const updatedArray = item.originalArray.map(r => r.id === item.faseId ? { ...r, masterId, masterCodice, selectedWbsBaseId: wbsId } : r);
        
        if (item.collectionName === 'reports') await updateDoc(docRef, { 'datiRiepilogo.lavorazioni': updatedArray });
        else await updateDoc(docRef, { fasi: updatedArray });

        const aliasId = `${item.companyID}_${item.testoOriginale.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        await setDoc(doc(db, 'alias_aziendali', aliasId), {
            companyID: item.companyID, testoDigitato: item.testoOriginale, masterId, wbsNodeId: wbsId, createdAt: serverTimestamp()
        }, { merge: true });
        
        setPeccatori(prev => prev.filter(p => p.uniqueKey !== item.uniqueKey));
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500 font-bold animate-pulse">Scansione Database Globale...</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden flex flex-col h-full animate-fade-in-up relative">
            <div className="bg-amber-50 border-b border-amber-100 p-6">
                <h2 className="text-xl font-black text-amber-900 flex items-center gap-2"><ExclamationTriangleIcon className="h-6 w-6"/> Torre di Controllo Standardizzazione</h2>
                <p className="text-sm font-medium text-amber-700">Monitora e normalizza le voci inserite dai tecnici in tutto il SaaS.</p>
            </div>

            <div className="overflow-x-auto flex-1 p-4">
                {peccatori.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20"><CheckBadgeIcon className="h-16 w-16 mb-2 text-emerald-400 opacity-50"/><p className="text-lg font-black">Nessuna voce da normalizzare!</p></div>
                ) : (
                    <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase">
                            <tr>
                                <th className="px-4 py-4 text-left">Azienda & Data</th>
                                <th className="px-4 py-4 text-left">Input Tecnico</th>
                                <th className="px-4 py-4 text-center">U.M.</th>
                                <th className="px-4 py-4 text-left bg-indigo-50/50">Risolvi con Master Esistente</th>
                                <th className="px-4 py-4 text-center bg-indigo-50/50">Crea Standard</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {peccatori.map(item => (
                                <tr key={item.uniqueKey} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-4">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase flex items-center gap-1"><BuildingOfficeIcon className="h-3 w-3"/> {aziendeMap[item.companyID] || 'Azienda Test'}</p>
                                        <p className="text-[9px] text-slate-400 font-bold mt-1 flex items-center gap-1"><ClockIcon className="h-3 w-3"/> {item.dataOra}</p>
                                        <p className="text-[9px] font-bold text-slate-500 mt-2 bg-slate-100 w-fit px-1.5 rounded">{item.type} - {item.docId.slice(-5)}</p>
                                    </td>
                                    <td className="px-4 py-4">
                                        <p className="text-sm font-black text-amber-600 leading-tight">{item.testoOriginale}</p>
                                        <p className="text-[9px] font-mono text-slate-400 mt-1">{item.codiceTemp}</p>
                                    </td>
                                    <td className="px-4 py-4 text-center"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase">{item.unitaMisura}</span></td>
                                    <td className="px-4 py-4 bg-indigo-50/20 align-middle">
                                        <div className="flex items-center gap-2">
                                            <select value={selectedMasterId[item.uniqueKey] || ''} onChange={e => setSelectedMasterId(prev => ({...prev, [item.uniqueKey]: e.target.value}))} className="flex-1 p-2 bg-white border border-indigo-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                                                <option value="">-- Seleziona Master --</option>
                                                {Object.entries(vociMasterDB.reduce((acc, m) => { const p = getFullBreadcrumb(m.wbsNodeId); if(!acc[p]) acc[p]=[]; acc[p].push(m); return acc; }, {})).map(([p, masters]) => (
                                                    <optgroup key={p} label={p}>{masters.map(m => <option key={m.id} value={m.id}>{m.codice} - {m.descrizione.slice(0,35)}...</option>)}</optgroup>
                                                ))}
                                            </select>
                                            <button onClick={() => finalizzaNormalizzazione(item, selectedMasterId[item.uniqueKey], vociMasterDB.find(m => m.id === selectedMasterId[item.uniqueKey]).codice, vociMasterDB.find(m => m.id === selectedMasterId[item.uniqueKey]).wbsNodeId)} disabled={!selectedMasterId[item.uniqueKey]} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-700 transition-all disabled:opacity-50">Applica</button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center bg-indigo-50/20 align-middle">
                                        <button onClick={() => avviaPromozione(item)} className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all whitespace-nowrap"><PlusCircleIcon className="h-4 w-4 inline mr-1"/> Promuovi a Master</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* MODALE DI STANDARDIZZAZIONE CON RICHIAMO AL WBS MANAGER */}
            {itemToPromote && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-emerald-50 p-6 border-b border-emerald-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-emerald-900 flex items-center gap-2"><StarIconSolid className="h-6 w-6 text-emerald-500"/> Promozione Standard</h3>
                                <p className="text-sm font-medium text-emerald-700">Rendi questa voce ufficiale nel catalogo globale.</p>
                            </div>
                            <button onClick={() => setItemToPromote(null)} className="p-2 text-emerald-600 hover:bg-emerald-200 rounded-full"><XMarkIcon className="h-6 w-6"/></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">1. Nome Ufficiale (Standard)</label>
                                <input type="text" value={promotionData.nomeUfficiale} onChange={e => setPromotionData({...promotionData, nomeUfficiale: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Es: Taglio prato mq..."/>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">2. Codice Master</label>
                                    <div className="relative">
                                        <TagIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                        <input type="text" value={promotionData.codiceUfficiale} onChange={e => setPromotionData({...promotionData, codiceUfficiale: e.target.value})} className="w-full pl-9 p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">3. U.M. (Fissa)</label>
                                    <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl font-black text-slate-400 text-center uppercase tracking-widest">{itemToPromote.unitaMisura}</div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">4. Posizione nella Tassonomia WBS</label>
                                <div className="flex items-center gap-2 w-full">
                                    <select 
                                        value={promotionData.wbsNodeId} 
                                        onChange={e => setPromotionData({...promotionData, wbsNodeId: e.target.value})} 
                                        className="flex-1 min-w-0 p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value="" disabled>-- Scegli Categoria WBS --</option>
                                        {wbsFolders.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                                    </select>
                                    <button 
                                        onClick={onOpenWbsManager} 
                                        className="shrink-0 px-4 py-3 bg-emerald-100 text-emerald-700 font-bold rounded-xl hover:bg-emerald-200 transition-colors border border-emerald-200 shadow-sm flex items-center gap-2"
                                        title="Apri il gestore completo della Tassonomia WBS"
                                    >
                                        <AdjustmentsHorizontalIcon className="h-5 w-5"/> Gestisci WBS
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={() => setItemToPromote(null)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Annulla</button>
                            <button onClick={eseguiPromozioneStandard} disabled={processingId || !promotionData.wbsNodeId} className="px-6 py-2.5 bg-emerald-600 text-white font-black rounded-xl shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2"><SparklesIcon className="h-5 w-5"/> Crea e Normalizza</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};