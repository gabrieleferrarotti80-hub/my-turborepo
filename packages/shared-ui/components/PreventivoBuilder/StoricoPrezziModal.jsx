import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useFirebaseData } from 'shared-core';
import { 
    MagnifyingGlassIcon, XMarkIcon, DocumentTextIcon, 
    PlusCircleIcon, CalendarDaysIcon, BuildingStorefrontIcon,
    ArchiveBoxArrowDownIcon, TruckIcon, WrenchScrewdriverIcon, ArchiveBoxIcon
} from '@heroicons/react/24/outline';

export const StoricoPrezziModal = ({ onClose, onSelect, tipoRicerca, tuttiMateriali = [], tuttiNoleggi = [] }) => {
    const { db, companyID } = useFirebaseData();
    const [offerte, setOfferte] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const checkCategoria = (tipoDoc, tipoRiga, descRiga) => {
        const tDoc = (tipoDoc || '').toLowerCase();
        const tRiga = (tipoRiga || '').toLowerCase();
        const desc = (descRiga || '').toLowerCase();
        const combinedTipo = `${tDoc} ${tRiga}`.toLowerCase();

        const isAttrezzatura = combinedTipo.includes('attrezzatura') || combinedTipo.includes('minuta') || 
                               desc.includes('trapano') || desc.includes('smerigliatrice') || desc.includes('flessibile') || desc.includes('martello');

        const isNoloAutomezzo = (
            combinedTipo.includes('nolo') || combinedTipo.includes('mezzo') || combinedTipo.includes('macchina') || combinedTipo.includes('veicolo') || combinedTipo.includes('automezzo') || 
            desc.includes('escavatore') || desc.includes('piattaforma') || desc.includes('gru ') || desc.includes('camion') || desc.includes('furgone') || desc.includes('terna')
        ) && !isAttrezzatura;

        const isSubappalto = combinedTipo.includes('subappalto') || combinedTipo.includes('posa') || combinedTipo.includes('lavorazion');
        const isMateriale = combinedTipo.includes('materiale') || (!isNoloAutomezzo && !isAttrezzatura && !isSubappalto);

        return { isMateriale, isAttrezzatura, isNoloAutomezzo, isSubappalto };
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const fetchedOfferte = [];
                
                // 1. Aggiungiamo i LISTINI UFFICIALI NOLI
                if (tipoRicerca === 'noli') {
                    tuttiNoleggi.forEach((nolo, idx) => {
                        fetchedOfferte.push({
                            id: `listino_nolo_${idx}`,
                            fornitoreId: nolo.noleggiatoreId,
                            aziendaNome: nolo.noleggiatoreNome,
                            data: new Date().toISOString(), 
                            documento: 'Listino Ufficiale',
                            descrizione: nolo.descrizione || nolo.nome,
                            prezzo: Number(nolo.prezzo || nolo.costoUnitario || 0),
                            quantitaRichiesta: 1,
                            unitaMisura: nolo.unitaMisura || 'gg',
                            tipoSource: 'Listino Fornitore',
                            icona: <TruckIcon className="h-5 w-5 text-indigo-500" />,
                            colore: 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold'
                        });
                    });
                }

                // 2. Aggiungiamo i LISTINI UFFICIALI MATERIALI
                if (tipoRicerca === 'materiali') {
                    tuttiMateriali.forEach((mat, idx) => {
                        fetchedOfferte.push({
                            id: `listino_mat_${idx}`,
                            fornitoreId: mat.fornitoreId,
                            aziendaNome: mat.fornitoreNome,
                            data: new Date().toISOString(),
                            documento: 'Listino Ufficiale',
                            descrizione: mat.descrizione || mat.nome,
                            prezzo: Number(mat.prezzo || mat.costoUnitario || 0),
                            quantitaRichiesta: 1,
                            unitaMisura: mat.unitaMisura || 'pz',
                            tipoSource: 'Listino Fornitore',
                            icona: <ArchiveBoxIcon className="h-5 w-5 text-sky-500" />,
                            colore: 'bg-sky-50 border-sky-400 text-sky-900 font-bold'
                        });
                    });
                }

                // 3. RECUPERA PREVENTIVI DIRETTI
                const qPrev = query(collection(db, 'preventivi_fornitori'), where('companyID', '==', companyID));
                const snapPrev = await getDocs(qPrev);
                
                snapPrev.forEach(doc => {
                    const data = doc.data();
                    if (data.stato !== 'rifiutato' && data.stato !== 'annullato') {
                        (data.righe || []).forEach(r => {
                            const { isMateriale, isAttrezzatura, isNoloAutomezzo, isSubappalto } = checkCategoria(data.tipoOggetto, data.categoriaCosto, r.descrizione);
                            
                            let matchTipo = false;
                            if (tipoRicerca === 'materiali') matchTipo = isMateriale && !isAttrezzatura;
                            if (tipoRicerca === 'noli') matchTipo = isNoloAutomezzo && !isAttrezzatura;
                            if (tipoRicerca === 'subappalti') matchTipo = isSubappalto;

                            if (matchTipo) {
                                fetchedOfferte.push({
                                    id: doc.id + '_' + Math.random(),
                                    preventivoId: doc.id,
                                    fornitoreId: data.fornitoreId,
                                    aziendaNome: data.nomeFornitore || data.fornitoreNome,
                                    data: data.dataDocumento || data.createdAt,
                                    documento: `Prev. N° ${data.numeroDocumento || 'N/D'}`,
                                    descrizione: r.descrizione,
                                    prezzo: Number(r.prezzoUnitario),
                                    quantitaRichiesta: r.quantita,
                                    unitaMisura: r.unitaMisura || r.um || 'pz',
                                    tipoSource: 'Preventivo Fornitore',
                                    icona: isNoloAutomezzo ? <TruckIcon className="h-5 w-5 text-indigo-500" /> : isSubappalto ? <WrenchScrewdriverIcon className="h-5 w-5 text-rose-500" /> : <ArchiveBoxIcon className="h-5 w-5 text-sky-500" />,
                                    colore: isNoloAutomezzo ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : isSubappalto ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-sky-50 border-sky-200 text-sky-800'
                                });
                            }
                        });
                    }
                });

                // 4. RECUPERA RDO AGGIUDICATE
                const qRdo = query(collection(db, 'richieste_offerta'), where('companyID', '==', companyID));
                const snapRdo = await getDocs(qRdo);
                
                snapRdo.forEach(doc => {
                    const data = doc.data();
                    if (data.stato === 'aggiudicata' && data.fornitoreVincenteId) {
                        (data.righe || []).forEach((r, idx) => {
                            const p = data.risposte?.[data.fornitoreVincenteId]?.prezzi?.[idx];
                            if (p && Number(p) > 0) {
                                const tipologiaRdo = r.tipologia || data.categoriaCosto;
                                const { isMateriale, isAttrezzatura, isNoloAutomezzo, isSubappalto } = checkCategoria(data.tipoOggetto, tipologiaRdo, r.descrizione);

                                let matchTipoRdo = false;
                                if (tipoRicerca === 'materiali') matchTipoRdo = isMateriale && !isAttrezzatura;
                                if (tipoRicerca === 'noli') matchTipoRdo = isNoloAutomezzo && !isAttrezzatura;
                                if (tipoRicerca === 'subappalti') matchTipoRdo = isSubappalto;

                                if (matchTipoRdo) {
                                    fetchedOfferte.push({
                                        id: doc.id + '_' + idx,
                                        rdoId: doc.id,
                                        fornitoreId: data.fornitoreVincenteId,
                                        aziendaNome: data.fornitoreVincenteNome,
                                        data: data.dataAggiudicazione || data.dataInserimento,
                                        documento: `RDO: ${data.titolo}`,
                                        descrizione: r.descrizione,
                                        prezzo: Number(p),
                                        quantitaRichiesta: r.quantita,
                                        unitaMisura: r.unitaMisura || 'pz',
                                        tipoSource: 'Gara Aggiudicata',
                                        icona: isNoloAutomezzo ? <TruckIcon className="h-5 w-5 text-indigo-500" /> : isSubappalto ? <WrenchScrewdriverIcon className="h-5 w-5 text-rose-500" /> : <ArchiveBoxArrowDownIcon className="h-5 w-5 text-emerald-500" />,
                                        colore: isNoloAutomezzo ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : isSubappalto ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    });
                                }
                            }
                        });
                    }
                });

                fetchedOfferte.sort((a, b) => new Date(b.data) - new Date(a.data));
                setOfferte(fetchedOfferte);
            } catch (error) {
                console.error("Errore fetch storico:", error);
            } finally {
                setLoading(false);
            }
        };
        if (companyID && db) fetchData();
    }, [db, companyID, tipoRicerca, tuttiMateriali, tuttiNoleggi]);

    const filtered = useMemo(() => {
        if (!search) return offerte;
        const terms = search.toLowerCase().split(' ');
        return offerte.filter(o => {
            const text = `${o.descrizione} ${o.aziendaNome} ${o.documento}`.toLowerCase();
            return terms.every(t => text.includes(t));
        });
    }, [search, offerte]);

    const titoloRicerca = tipoRicerca === 'noli' ? 'Noleggi Macchinari' : tipoRicerca === 'subappalti' ? 'Lavorazioni in Subappalto' : 'Materiali';

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[300] flex justify-center items-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                
                {/* HEADER */}
                <div className="bg-indigo-900 p-6 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h2 className="font-black text-xl flex items-center gap-2">
                            <MagnifyingGlassIcon className="h-6 w-6 text-indigo-300"/> Cerca in Archivio: {titoloRicerca}
                        </h2>
                        <p className="text-indigo-200 text-sm mt-1">Scegli tra i Listini Ufficiali, i Preventivi e le RDO passate.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-indigo-800 rounded-full transition-colors">
                        <XMarkIcon className="h-6 w-6"/>
                    </button>
                </div>

                {/* BARRA DI RICERCA */}
                <div className="p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Cerca voce, ditta o nome gara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                        />
                    </div>
                </div>

                {/* LISTA RISULTATI */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    {loading ? (
                        <div className="text-center py-12 text-slate-400 font-bold animate-pulse">Analisi listini e archivio in corso...</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                            <ArchiveBoxArrowDownIcon className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                            <h3 className="text-lg font-bold text-slate-700">Nessun prezzo trovato in archivio</h3>
                            <p className="text-slate-500 text-sm mt-1">Non ci sono listini, preventivi o RDO che contengono questa parola per la categoria <span className="font-bold text-slate-600">{titoloRicerca}</span>.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filtered.map(item => (
                                <div key={item.id} className={`bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${item.tipoSource === 'Listino Fornitore' ? 'shadow-sm border-indigo-200' : 'hover:shadow-md'}`}>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest border flex items-center gap-1 ${item.colore}`}>
                                                {item.icona} {item.tipoSource}
                                            </span>
                                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                <CalendarDaysIcon className="h-3.5 w-3.5"/> 
                                                {new Date(item.data).toLocaleDateString('it-IT')}
                                            </span>
                                        </div>
                                        <h4 className="text-lg font-black text-slate-800 truncate" title={item.descrizione}>{item.descrizione}</h4>
                                        <p className="text-sm font-medium text-slate-600 flex items-center gap-1 truncate mt-0.5">
                                            <BuildingStorefrontIcon className="h-4 w-4 text-slate-400"/> {item.aziendaNome} <span className="text-slate-300 mx-1">|</span> {item.documento}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Prezzo Unit. ({item.unitaMisura})</p>
                                            <p className="text-2xl font-black text-indigo-700">€ {item.prezzo.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                                        </div>
                                        <button 
                                            onClick={() => onSelect(item)} 
                                            className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-colors shrink-0"
                                        >
                                            <PlusCircleIcon className="h-5 w-5"/> Usa Prezzo
                                        </button>
                                    </div>

                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};