import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebaseData } from 'shared-core';
import { PlusIcon } from '@heroicons/react/24/outline';

// IMPORTA GLI ALTRI COMPONENTI CHE ABBIAMO ESTRATTO
import { FaseCard } from './FaseCard'; // Aggiusta il percorso

export const Step3PreventivoAnalitico = ({ 
    fasi, setFasi, 
    magazzinoMateriali, tuttiMateriali, fornitori,
    tuttiNoleggi, noleggiatori,
    magazzinoMezzi, magazzinoAttrezzature, 
    ruoliAziendali, tariffeAziendali,
    subappaltatori,
    percSpeseGenerali, 
    percUtile,         
    onNext 
}) => {
    const { db, userAziendaId } = useFirebaseData();
    
    const [wbsNodes, setWbsNodes] = useState([]);
    const [aliasAziendali, setAliasAziendali] = useState([]);
    const [expandedFase, setExpandedFase] = useState(fasi.length > 0 ? fasi[0].id : null);

    useEffect(() => {
        const loadDati = async () => {
            if (!userAziendaId) return;
            try {
                // 1. Carica Albero WBS 
                const qWBS = query(collection(db, 'wbs_nodes'));
                const snapWBS = await getDocs(qWBS);
                setWbsNodes(snapWBS.docs.map(d => ({ id: d.id, ...d.data() })));

                // 2. Carica Memoria Alias Aziendale
                const qA = query(collection(db, 'alias_aziendali'), where('companyID', '==', userAziendaId));
                const snapA = await getDocs(qA);
                setAliasAziendali(snapA.docs.map(d => d.data()));
            } catch (error) {
                console.error("Errore caricamento WBS:", error);
            }
        };
        loadDati();
    }, [db, userAziendaId]);

    const handleSaveAlias = async (testoDigitato, masterId) => {
        if (!testoDigitato || !masterId || !userAziendaId) return;
        const txt = testoDigitato.toLowerCase();
        if (aliasAziendali.some(a => a.testoDigitato === txt && a.masterId === masterId)) return;
        try {
            await addDoc(collection(db, 'alias_aziendali'), { companyID: userAziendaId, testoDigitato: txt, masterId: masterId, timestamp: serverTimestamp() });
            setAliasAziendali(prev => [...prev, { companyID: userAziendaId, testoDigitato: txt, masterId }]);
        } catch (e) {
            console.error("Errore salvataggio alias:", e);
        }
    };

    const addFase = () => {
        const nuova = { 
            id: Date.now(), titolo: '', quantitaFase: 1, umFase: 'a corpo', masterId: null, numeroInterventi: 1,
            percSpeseGenerali: percSpeseGenerali, percUtile: percUtile,                 
            costi: { materiali: [], manodopera: [], mezzi: [], attrezzature: [], noli: [], subappalti: [], altro: [] }, 
            prezzoVendita: 0 
        };
        setFasi([...fasi, nuova]);
        setExpandedFase(nuova.id);
    };

    const updateFaseMeta = (id, field, value) => setFasi(fasi.map(f => f.id === id ? { ...f, [field]: value } : f));
    const updateFaseCosti = (faseId, categoria, nuoveRighe) => setFasi(fasi.map(f => f.id === faseId ? { ...f, costi: { ...f.costi, [categoria]: nuoveRighe } } : f));
    const deleteFase = (id) => { if(window.confirm("Eliminare questa fase e tutti i suoi costi?")) setFasi(fasi.filter(f => f.id !== id)); };

    const calcolaTotaliGenerali = () => {
        let mat=0, man=0, mez=0, nol=0, sub=0, alt=0, att=0, vendita=0;
        fasi.forEach(f => {
            vendita += Number(f.prezzoVendita) || 0;
            const interventi = Number(f.numeroInterventi) || 1;
            const somma = (arr) => (arr||[]).reduce((s, c) => s + ((Number(c.numeroPersone)||1)*(Number(c.quantita)||0)*(Number(c.costoUnitario)||0)), 0);
            mat += somma(f.costi.materiali) * interventi; 
            man += somma(f.costi.manodopera) * interventi; 
            mez += somma(f.costi.mezzi) * interventi;
            att += somma(f.costi.attrezzature) * interventi;
            nol += somma(f.costi.noli) * interventi; 
            sub += somma(f.costi.subappalti) * interventi; 
            alt += somma(f.costi.altro) * interventi;
        });
        const costiDiretti = mat + man + mez + att + nol + sub + alt;
        return { mat, man, mez, att, nol, sub, alt, costiDiretti, vendita };
    };
    const totali = calcolaTotaliGenerali();

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap lg:flex-nowrap justify-between items-center gap-4 sticky top-0 z-20">
                <div className="w-full lg:w-auto">
                    <h3 className="text-xl font-black text-slate-800">Distinta Base (WBS)</h3>
                    <p className="text-xs text-slate-500 mt-1">Scomponi il lavoro in fasi, quantità e costi.</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-end items-center">
                    <div className="hidden xl:flex gap-2 mr-4">
                        <div className="text-center px-2 border-r border-slate-200"><p className="text-[9px] font-bold text-sky-500 uppercase">Materiali</p><p className="text-xs font-black text-slate-700">€{totali.mat.toFixed(0)}</p></div>
                        <div className="text-center px-2 border-r border-slate-200"><p className="text-[9px] font-bold text-orange-500 uppercase">Manodop.</p><p className="text-xs font-black text-slate-700">€{totali.man.toFixed(0)}</p></div>
                        <div className="text-center px-2 border-r border-slate-200"><p className="text-[9px] font-bold text-teal-500 uppercase">Attrezz.</p><p className="text-xs font-black text-slate-700">€{totali.att.toFixed(0)}</p></div>
                        <div className="text-center px-2"><p className="text-[9px] font-bold text-rose-500 uppercase">Subappalti</p><p className="text-xs font-black text-slate-700">€{totali.sub.toFixed(0)}</p></div>
                    </div>
                    <div className="bg-slate-800 px-4 py-2 rounded-lg text-center shadow-inner">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tot. Costi Diretti</p>
                        <p className="text-lg font-black text-white">€ {totali.costiDiretti.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                    </div>
                    <button onClick={addFase} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md ml-2">
                        <PlusIcon className="h-5 w-5"/> Aggiungi Fase
                    </button>
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                {fasi.map((fase, idx) => (
                    <FaseCard 
                        key={fase.id} fase={fase} idx={idx}
                        isExpanded={expandedFase === fase.id} setExpanded={() => setExpandedFase(expandedFase === fase.id ? null : fase.id)}
                        wbsNodes={wbsNodes} aliasAziendali={aliasAziendali} onSaveAlias={handleSaveAlias}
                        onUpdateMeta={updateFaseMeta} onUpdateCosti={updateFaseCosti} onDelete={() => deleteFase(fase.id)}
                        magazzinoMateriali={magazzinoMateriali} tuttiMateriali={tuttiMateriali} magazzinoMezzi={magazzinoMezzi} magazzinoAttrezzature={magazzinoAttrezzature} tuttiNoleggi={tuttiNoleggi} ruoliAziendali={ruoliAziendali} tariffeAziendali={tariffeAziendali} subappaltatori={subappaltatori}
                        globalPercSpeseGenerali={percSpeseGenerali} globalPercUtile={percUtile}
                    />
                ))}
            </div>

            <div className="flex justify-end pt-6">
                <button onClick={onNext} className="bg-indigo-600 text-white px-10 py-3 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all text-lg">
                    Vai al Calcolo Margini e PDF ➔
                </button>
            </div>
        </div>
    );
};