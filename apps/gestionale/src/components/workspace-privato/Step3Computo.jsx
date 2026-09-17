import React, { useState } from 'react';
import { 
    ArchiveBoxIcon, KeyIcon, TruckIcon, UserGroupIcon, BuildingOfficeIcon, WrenchScrewdriverIcon, TrashIcon, PlusIcon, UserIcon, CalculatorIcon, MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';
import { ComparatorePrezzi } from '../../components/ComparatorePrezzi'; // ⚠️ AGGIUSTA IL PERCORSO SE SERVE

export const Step3Computo = ({
    dettaglioCosti, setDettaglioCosti,
    costiInterni, totaleCosti,
    magazzinoMateriali, tuttiMateriali, fornitori,
    tuttiNoleggi, noleggiatori,
    magazzinoMezzi,
    ruoliAziendali, tariffeAziendali,
    subappaltatori,
    onNext, handleSaveAll
}) => {

    const [comparatorTarget, setComparatorTarget] = useState(null); 

    const handleAddCosto = (cat) => setDettaglioCosti(prev => ({ ...prev, [cat]: [...(prev[cat]||[]), { id: Date.now(), isNewItem: true, descrizione: '', numeroPersone: 1, quantita: 1, costoUnitario: 0, unitaMisura: '' }] }));
    const handleAddSubappalto = () => setDettaglioCosti(prev => ({ ...prev, subappalti: [...(prev.subappalti||[]), { id: Date.now(), isNewItem: true, descrizione: '', lavorazione: '', quantita: 1, costoUnitario: 0, unitaMisura: '', preventivoUfficiale: false }] }));
    const handleCostoChange = (cat, id, field, value) => setDettaglioCosti(prev => ({ ...prev, [cat]: prev[cat].map(r => r.id === id ? { ...r, [field]: value } : r) }));
    const handleRemoveCosto = (cat, id) => setDettaglioCosti(prev => ({ ...prev, [cat]: prev[cat].filter(r => r.id !== id) }));

    // === 🌟 FUNZIONE DI IMPORTAZIONE MIGLIORATA ===
    const handleSelectFromComparator = (risorsaScelta) => {
        if (!comparatorTarget) return;
        const { cat, rowId } = comparatorTarget;
        
        setDettaglioCosti(prev => ({
            ...prev,
            [cat]: prev[cat].map(r => {
                if (r.id !== rowId) return r;
                
                let newData = {
                    ...r,
                    descrizione: risorsaScelta.descrizione,
                    costoUnitario: risorsaScelta.prezzo,
                    unitaMisura: risorsaScelta.unitaMisura, // SALVIAMO L'UNITA' DI MISURA
                    isNewItem: true, 
                    salvaInAlbo: false 
                };

                if (cat === 'materiali') newData.fornitoreId = risorsaScelta.fornitoreId;
                if (cat === 'noli') newData.noleggiatoreId = risorsaScelta.fornitoreId;
                
                // FIX INTELLIGENTE PER I SUBAPPALTI:
                if (cat === 'subappalti') {
                    newData.descrizione = risorsaScelta.aziendaNome; // Mette la ditta nella casella giusta
                    newData.lavorazione = risorsaScelta.descrizione; // Mette la lavorazione nella casella giusta
                }

                return newData;
            })
        }));

        setComparatorTarget(null); 
    };

    const renderRigheMateriali = () => (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-2"><ArchiveBoxIcon className="h-5 w-5 text-sky-500"/> Costi Materiali</h4>
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-black tracking-wider">Totale: € {costiInterni.materiali.toFixed(2)}</span>
            </div>
            <table className="w-full text-left mb-2">
                <thead>
                    <tr><th className="py-2 text-[10px] font-bold text-slate-400 uppercase w-[55%]">Materiale e Provenienza</th><th className="py-2 text-[10px] font-bold text-slate-400 uppercase text-center">Q.tà</th><th className="py-2 text-[10px] font-bold text-slate-400 uppercase text-right">Costo Unit.</th><th className="py-2 text-[10px] font-bold text-slate-400 uppercase text-right pr-2">Importo</th><th className="w-8"></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {(dettaglioCosti.materiali||[]).map(riga => (
                        <tr key={riga.id} className="group">
                            <td className="py-2 pr-2">
                                {!riga.isNewItem ? (
                                    <select value={riga.descrizione} onChange={e => {
                                        const val = e.target.value;
                                        setDettaglioCosti(prev => ({
                                            ...prev,
                                            materiali: prev.materiali.map(r => {
                                                if (r.id !== riga.id) return r;
                                                if (val === 'NEW') return { ...r, isNewItem: true, descrizione: '', costoUnitario: 0, fornitoreId: null, unitaMisura: '' };
                                                const matMagazzino = magazzinoMateriali.find(m => m.nome === val);
                                                const matFornitore = tuttiMateriali.find(m => m.descrizione === val);
                                                if (matMagazzino) return { ...r, descrizione: matMagazzino.nome, costoUnitario: matMagazzino.costoStandard || 0, fornitoreId: null, unitaMisura: matMagazzino.unitaMisura };
                                                if (matFornitore) return { ...r, descrizione: matFornitore.descrizione, costoUnitario: matFornitore.prezzo, fornitoreId: matFornitore.fornitoreId, unitaMisura: matFornitore.unitaMisura };
                                                return { ...r, descrizione: val };
                                            })
                                        }));
                                    }} className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-1 focus:ring-sky-500 p-2">
                                        <option value="">Seleziona Materiale...</option>
                                        {magazzinoMateriali.length > 0 && <optgroup label="📦 Dal Magazzino Aziendale">{magazzinoMateriali.map((m) => <option key={`mag-${m.id}`} value={m.nome}>{m.nome}</option>)}</optgroup>}
                                        {tuttiMateriali.length > 0 && <optgroup label="🚚 Da Albo Fornitori (Esterni)">{tuttiMateriali.map((m, i) => <option key={`forn-${i}`} value={m.descrizione}>{m.descrizione} ({m.fornitoreNome}) - €{m.prezzo}</option>)}</optgroup>}
                                        <option value="NEW" className="font-bold text-sky-600">➕ Inserisci Libero / Cerca Miglior Prezzo</option>
                                    </select>
                                ) : (
                                    <div className="bg-sky-50/50 p-2 rounded-lg border border-sky-100 relative">
                                        <div className="flex flex-col xl:flex-row items-start xl:items-center gap-2 mb-2">
                                            <input type="text" placeholder="Nome nuovo materiale..." value={riga.descrizione} onChange={e => handleCostoChange('materiali', riga.id, 'descrizione', e.target.value)} className="w-full xl:flex-1 bg-white border border-slate-200 rounded p-1.5 text-xs font-bold" />
                                            <div className="flex gap-2 w-full xl:w-auto">
                                                <button onClick={() => setComparatorTarget({ cat: 'materiali', rowId: riga.id })} className="bg-indigo-600 text-white text-[10px] px-2 py-1.5 rounded-md font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1 whitespace-nowrap">
                                                    <MagnifyingGlassIcon className="h-3 w-3" /> Trova Prezzo
                                                </button>
                                                {(tuttiMateriali.length > 0 || magazzinoMateriali.length > 0) && <button onClick={() => handleCostoChange('materiali', riga.id, 'isNewItem', false)} className="text-[10px] text-slate-500 hover:text-slate-800 underline whitespace-nowrap px-1">Albo</button>}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </td>
                            {/* MOSTRA L'UNITA' DI MISURA SOTTO LA QUANTITA' */}
                            <td className="py-2 px-1 text-center align-top pt-3">
                                <div className="flex flex-col items-center">
                                    <input type="number" value={riga.quantita} onChange={e => handleCostoChange('materiali', riga.id, 'quantita', e.target.value)} className="w-16 bg-transparent border border-transparent focus:border-slate-300 hover:border-slate-200 rounded p-1 text-sm text-center font-bold" />
                                    {riga.unitaMisura && <span className="text-[10px] text-slate-400 font-bold uppercase">{riga.unitaMisura}</span>}
                                </div>
                            </td>
                            <td className="py-2 px-1 text-right flex items-center justify-end gap-1 align-top pt-3"><span className="text-xs text-slate-400">€</span><input type="number" value={riga.costoUnitario} onChange={e => handleCostoChange('materiali', riga.id, 'costoUnitario', e.target.value)} className="w-20 bg-transparent border border-transparent focus:border-slate-300 hover:border-slate-200 rounded p-1 text-sm text-right font-bold" /></td>
                            <td className="py-2 pl-2 pr-2 text-sm font-black text-slate-800 text-right align-top pt-4">€ {((Number(riga.quantita) || 0) * (Number(riga.costoUnitario) || 0)).toFixed(2)}</td>
                            <td className="py-2 text-right align-top pt-4"><button onClick={() => handleRemoveCosto('materiali', riga.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="h-4 w-4"/></button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button onClick={() => handleAddCosto('materiali')} className="mt-2 text-sky-600 text-xs font-bold flex items-center gap-1 hover:text-sky-800 bg-sky-50 px-3 py-1.5 rounded-lg transition-colors"><PlusIcon className="h-4 w-4"/> Aggiungi Materiale</button>
        </div>
    );

    const renderRigheNoli = () => (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-2"><KeyIcon className="h-5 w-5 text-indigo-500"/> Noli Esterni a Freddo/Caldo</h4>
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-black tracking-wider">Totale: € {costiInterni.noli.toFixed(2)}</span>
            </div>
            <table className="w-full text-left mb-2">
                <thead>
                    <tr><th className="py-2 text-[10px] font-bold text-slate-400 uppercase w-[55%]">Mezzo Noleggiato</th><th className="py-2 text-[10px] font-bold text-slate-400 uppercase text-center">Quantità</th><th className="py-2 text-[10px] font-bold text-slate-400 uppercase text-right">Costo Unit.</th><th className="py-2 text-[10px] font-bold text-slate-400 uppercase text-right pr-2">Importo</th><th className="w-8"></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {(dettaglioCosti.noli||[]).map(riga => (
                        <tr key={riga.id} className="group">
                            <td className="py-2 pr-2">
                                {!riga.isNewItem ? (
                                    <select value={riga.descrizione} onChange={e => {
                                            const val = e.target.value;
                                            setDettaglioCosti(prev => ({
                                                ...prev,
                                                noli: prev.noli.map(r => {
                                                    if (r.id !== riga.id) return r;
                                                    if (val === 'NEW') return { ...r, isNewItem: true, descrizione: '', costoUnitario: 0, noleggiatoreId: null, unitaMisura: '' };
                                                    const nol = tuttiNoleggi.find(n => n.descrizione === val);
                                                    return { ...r, descrizione: nol ? nol.descrizione : val, costoUnitario: nol ? Number(nol.prezzo) : 0, noleggiatoreId: nol ? nol.noleggiatoreId : null, unitaMisura: nol ? nol.tipoCosto : '' };
                                                })
                                            }));
                                        }} className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-1 focus:ring-indigo-500 p-2">
                                        <option value="">Seleziona dall'Albo Noleggiatori...</option>
                                        {tuttiNoleggi.map((n, i) => <option key={`nol-${i}`} value={n.descrizione}>{n.descrizione} ({n.noleggiatoreNome}) - €{n.prezzo}</option>)}
                                        <option value="NEW" className="font-bold text-indigo-600">➕ Inserisci Nolo Libero / Cerca Miglior Prezzo</option>
                                    </select>
                                ) : (
                                    <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 relative">
                                        <div className="flex flex-col xl:flex-row items-start xl:items-center gap-2 mb-2">
                                            <input type="text" placeholder="Es. Piattaforma 20m..." value={riga.descrizione} onChange={e => handleCostoChange('noli', riga.id, 'descrizione', e.target.value)} className="w-full xl:flex-1 bg-white border border-slate-200 rounded p-1.5 text-xs font-bold" />
                                            <div className="flex gap-2 w-full xl:w-auto">
                                                <button onClick={() => setComparatorTarget({ cat: 'noli', rowId: riga.id })} className="bg-indigo-600 text-white text-[10px] px-2 py-1.5 rounded-md font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1 whitespace-nowrap">
                                                    <MagnifyingGlassIcon className="h-3 w-3" /> Trova Prezzo
                                                </button>
                                                {tuttiNoleggi.length > 0 && <button onClick={() => handleCostoChange('noli', riga.id, 'isNewItem', false)} className="text-[10px] text-slate-500 hover:text-slate-800 underline whitespace-nowrap px-1">Albo</button>}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </td>
                            {/* MOSTRA L'UNITA' DI MISURA (es. giornaliero, mensile) */}
                            <td className="py-2 px-1 text-center align-top pt-3">
                                <div className="flex flex-col items-center">
                                    <input type="number" value={riga.quantita} onChange={e => handleCostoChange('noli', riga.id, 'quantita', e.target.value)} className="w-16 bg-transparent border border-transparent focus:border-slate-300 hover:border-slate-200 rounded p-1 text-sm text-center font-bold" />
                                    {riga.unitaMisura && <span className="text-[10px] text-slate-400 font-bold uppercase">{riga.unitaMisura}</span>}
                                </div>
                            </td>
                            <td className="py-2 px-1 text-right flex items-center justify-end gap-1 align-top pt-3"><span className="text-xs text-slate-400">€</span><input type="number" value={riga.costoUnitario} onChange={e => handleCostoChange('noli', riga.id, 'costoUnitario', e.target.value)} className="w-20 bg-transparent border border-transparent focus:border-slate-300 hover:border-slate-200 rounded p-1 text-sm text-right font-bold" /></td>
                            <td className="py-2 pl-2 pr-2 text-sm font-black text-slate-800 text-right align-top pt-4">€ {((Number(riga.quantita) || 0) * (Number(riga.costoUnitario) || 0)).toFixed(2)}</td>
                            <td className="py-2 text-right align-top pt-4"><button onClick={() => handleRemoveCosto('noli', riga.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="h-4 w-4"/></button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button onClick={() => handleAddCosto('noli')} className="mt-2 text-indigo-600 text-xs font-bold flex items-center gap-1 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"><PlusIcon className="h-4 w-4"/> Aggiungi Nolo Esterno</button>
        </div>
    );

    const renderRigheMezziAziendali = () => {
        const formatMezzoName = (a) => `${a.nome}${a.targa ? ` (${a.targa})` : ''}`.trim();

        return (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2"><TruckIcon className="h-5 w-5 text-emerald-500"/> Mezzi Aziendali (Proprietà)</h4>
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-black tracking-wider">Totale: € {costiInterni.mezzi.toFixed(2)}</span>
                </div>
                <table className="w-full text-left mb-2">
                    <thead>
                        <tr>
                            <th className="py-2 text-[10px] font-bold text-slate-400 uppercase w-[55%]">Mezzo Aziendale</th>
                            <th className="py-2 text-[10px] font-bold text-slate-400 uppercase text-center">Giorni</th>
                            <th className="py-2 text-[10px] font-bold text-slate-400 uppercase text-right">Costo Giornaliero</th>
                            <th className="py-2 text-[10px] font-bold text-slate-400 uppercase text-right pr-2">Importo</th>
                            <th className="w-8"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {(dettaglioCosti.mezzi||[]).map(riga => (
                            <tr key={riga.id} className="group">
                                <td className="py-2 pr-2">
                                    <select value={riga.descrizione} onChange={e => {
                                        const val = e.target.value;
                                        setDettaglioCosti(prev => ({
                                            ...prev,
                                            mezzi: prev.mezzi.map(r => {
                                                if (r.id !== riga.id) return r;
                                                
                                                const att = magazzinoMezzi.find(a => formatMezzoName(a) === val);
                                                
                                                let costo = 0;
                                                if (att) {
                                                    if (att.dettagli && Number(att.dettagli.costoGiornaliero) > 0) {
                                                        costo = Number(att.dettagli.costoGiornaliero);
                                                    } else if (Number(att.costoGiornaliero) > 0) {
                                                        costo = Number(att.costoGiornaliero);
                                                    } else if (Number(att.costoOrario) > 0) {
                                                        costo = Number(att.costoOrario) * 8;
                                                    } else if (att.dettagli && Number(att.dettagli.costoOrario) > 0) {
                                                        costo = Number(att.dettagli.costoOrario) * 8;
                                                    } else {
                                                        costo = Number(att.costoStandard) || Number(att.costo) || 0;
                                                    }
                                                }
                                                
                                                return { ...r, descrizione: val, costoUnitario: costo };
                                            })
                                        }));
                                    }} className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-1 focus:ring-emerald-500 p-2">
                                        <option value="">Seleziona Parco Auto/Macchine...</option>
                                        <optgroup label="🚐 Automezzi Stradali">
                                            {magazzinoMezzi.filter(a => (a.categoria || '').toLowerCase() === 'automezzo').map(a => {
                                                const nomeComp = formatMezzoName(a);
                                                return <option key={`att-${a.id}`} value={nomeComp}>{nomeComp}</option>;
                                            })}
                                        </optgroup>
                                        <optgroup label="🚜 Macchine Operatrici">
                                            {magazzinoMezzi.filter(a => (a.categoria || '').toLowerCase() === 'macchina operatrice').map(a => {
                                                const nomeComp = formatMezzoName(a);
                                                return <option key={`att-${a.id}`} value={nomeComp}>{nomeComp}</option>;
                                            })}
                                        </optgroup>
                                    </select>
                                </td>
                                <td className="py-2 px-1 text-center"><input type="number" value={riga.quantita} onChange={e => handleCostoChange('mezzi', riga.id, 'quantita', e.target.value)} className="w-16 bg-transparent border border-transparent focus:border-slate-300 hover:border-slate-200 rounded p-1 text-sm text-center font-bold" /></td>
                                <td className="py-2 px-1 text-right flex items-center justify-end gap-1"><span className="text-xs text-slate-400">€</span><input type="number" value={riga.costoUnitario} onChange={e => handleCostoChange('mezzi', riga.id, 'costoUnitario', e.target.value)} className="w-20 bg-transparent border border-transparent focus:border-slate-300 hover:border-slate-200 rounded p-1 text-sm text-right font-bold" /></td>
                                <td className="py-2 pl-2 pr-2 text-sm font-black text-slate-800 text-right">€ {((Number(riga.quantita) || 0) * (Number(riga.costoUnitario) || 0)).toFixed(2)}</td>
                                <td className="py-2 text-right"><button onClick={() => handleRemoveCosto('mezzi', riga.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="h-4 w-4"/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button onClick={() => handleAddCosto('mezzi')} className="mt-2 text-emerald-600 text-xs font-bold flex items-center gap-1 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"><PlusIcon className="h-4 w-4"/> Aggiungi Mezzo Interno</button>
            </div>
        );
    };
    
    const renderRigheManodopera = () => (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-2"><UserGroupIcon className="h-5 w-5 text-orange-500"/> Costo Manodopera Interna</h4>
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-black tracking-wider">Totale: € {costiInterni.manodopera.toFixed(2)}</span>
            </div>
            <table className="w-full text-left mb-2">
                <thead>
                    <tr>
                        <th className="py-2 text-[10px] font-bold text-slate-400 uppercase w-[35%]">Ruolo / Qualifica</th>
                        <th className="py-2 text-[10px] font-bold text-slate-400 uppercase text-center w-[15%]" title="Numero di persone impiegate per questo ruolo">N° Operatori</th>
                        <th className="py-2 text-[10px] font-bold text-slate-400 uppercase text-center w-[15%]">Ore (a testa)</th>
                        <th className="py-2 text-[10px] font-bold text-slate-400 uppercase text-right w-[15%]">Costo Orario</th>
                        <th className="py-2 text-[10px] font-bold text-slate-400 uppercase text-right pr-2 w-[15%]">Importo</th>
                        <th className="w-8"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {(dettaglioCosti.manodopera||[]).map(riga => {
                        const nOperatori = Number(riga.numeroPersone) || 1;
                        const ore = Number(riga.quantita) || 0;
                        const costoH = Number(riga.costoUnitario) || 0;
                        const importoTotaleRiga = nOperatori * ore * costoH;

                        return (
                            <tr key={riga.id} className="group">
                                <td className="py-2 pr-2">
                                    <select 
                                        value={riga.descrizione} 
                                        onChange={e => {
                                            const ruoloSelezionato = e.target.value;
                                            let nuovoCosto = 0;
                                            if (ruoloSelezionato !== 'Libero' && ruoloSelezionato !== '') {
                                                const tariffaTrovata = Object.entries(tariffeAziendali).find(([key]) => key.toLowerCase() === ruoloSelezionato.toLowerCase());
                                                if (tariffaTrovata) nuovoCosto = tariffaTrovata[1];
                                            }
                                            setDettaglioCosti(prev => ({
                                                ...prev,
                                                manodopera: prev.manodopera.map(r => r.id === riga.id ? { ...r, descrizione: ruoloSelezionato, costoUnitario: nuovoCosto } : r)
                                            }));
                                        }} 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:ring-1 focus:ring-orange-500 p-2"
                                    >
                                        <option value="">Seleziona Ruolo...</option>
                                        {ruoliAziendali.map(r => {
                                            const tariffa = Object.entries(tariffeAziendali).find(([key]) => key.toLowerCase() === r.toLowerCase());
                                            const prezzoDisplay = tariffa ? ` - €${tariffa[1]}/h` : '';
                                            return <option key={r} value={r}>{r}{prezzoDisplay}</option>;
                                        })}
                                        <option value="Libero" className="text-orange-600 font-bold">Altro (Inserimento libero)</option>
                                    </select>
                                    {riga.descrizione === 'Libero' && (
                                        <input type="text" placeholder="Specifica ruolo..." value={riga.ruoloLibero || ''} onChange={e => handleCostoChange('manodopera', riga.id, 'ruoloLibero', e.target.value)} className="w-full mt-1 bg-white border border-slate-200 rounded p-1.5 text-xs font-medium" />
                                    )}
                                </td>
                                <td className="py-2 px-1 text-center align-top pt-3">
                                    <div className="flex items-center justify-center gap-1">
                                        <UserIcon className="h-3 w-3 text-slate-400"/>
                                        <input type="number" min="1" value={riga.numeroPersone || 1} onChange={e => handleCostoChange('manodopera', riga.id, 'numeroPersone', e.target.value)} className="w-12 bg-transparent border border-transparent focus:border-slate-300 hover:border-slate-200 rounded p-1 text-sm text-center font-bold text-orange-600" />
                                    </div>
                                </td>
                                <td className="py-2 px-1 text-center align-top pt-3"><input type="number" value={riga.quantita} onChange={e => handleCostoChange('manodopera', riga.id, 'quantita', e.target.value)} className="w-16 bg-transparent border border-transparent focus:border-slate-300 hover:border-slate-200 rounded p-1 text-sm text-center font-bold" /></td>
                                <td className="py-2 px-1 text-right flex items-center justify-end gap-1 align-top pt-3"><span className="text-xs text-slate-400">€</span><input type="number" value={riga.costoUnitario} onChange={e => handleCostoChange('manodopera', riga.id, 'costoUnitario', e.target.value)} className="w-20 bg-transparent border border-transparent focus:border-slate-300 hover:border-slate-200 rounded p-1 text-sm text-right font-bold" /></td>
                                <td className="py-2 pl-2 pr-2 text-sm font-black text-slate-800 text-right align-top pt-4">€ {importoTotaleRiga.toFixed(2)}</td>
                                <td className="py-2 text-right align-top pt-4"><button onClick={() => handleRemoveCosto('manodopera', riga.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="h-4 w-4"/></button></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <button onClick={() => handleAddCosto('manodopera')} className="mt-2 text-orange-600 text-xs font-bold flex items-center gap-1 hover:text-orange-800 bg-orange-50 px-3 py-1.5 rounded-lg transition-colors"><PlusIcon className="h-4 w-4"/> Aggiungi Manodopera</button>
        </div>
    );

    const renderRigheSubappalti = () => (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 col-span-1 xl:col-span-2">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-2"><BuildingOfficeIcon className="h-5 w-5 text-rose-500"/> Subappalti e Lavorazioni Esterne</h4>
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-black tracking-wider">Totale: € {costiInterni.subappalti.toFixed(2)}</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                    <thead>
                        <tr>
                            <th className="py-2 text-[10px] font-bold text-slate-400 uppercase w-[30%]">Azienda Subappaltatrice</th>
                            <th className="py-2 text-[10px] font-bold text-slate-400 uppercase w-[30%]">Specifica Lavorazione</th>
                            <th className="py-2 text-[10px] font-bold text-slate-400 uppercase text-center w-[15%]">Prev. Ufficiale?</th>
                            <th className="py-2 text-[10px] font-bold text-slate-400 uppercase text-right w-[15%]">Importo (€)</th>
                            <th className="w-8"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {(dettaglioCosti.subappalti||[]).map(riga => (
                            <tr key={riga.id} className="group">
                                <td className="py-3 pr-3 align-top">
                                    {!riga.isNewItem ? (
                                        <select value={riga.descrizione} onChange={e => {
                                            const val = e.target.value;
                                            setDettaglioCosti(prev => ({
                                                ...prev,
                                                subappalti: prev.subappalti.map(r => {
                                                    if (r.id !== riga.id) return r;
                                                    if (val === 'NEW') return { ...r, isNewItem: true, descrizione: '' };
                                                    return { ...r, descrizione: val };
                                                })
                                            }));
                                        }} className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-1 focus:ring-rose-500 p-2">
                                            <option value="">Scegli da Albo Subappaltatori...</option>
                                            {subappaltatori?.map(s => <option key={s.id} value={s.ragioneSociale}>{s.ragioneSociale}</option>)}
                                            <option value="NEW" className="font-bold text-rose-600">➕ Nuovo Subappaltatore / Cerca Prezzo</option>
                                        </select>
                                    ) : (
                                        <div className="bg-rose-50/50 p-2 rounded-lg border border-rose-100 relative">
                                            <div className="flex flex-col xl:flex-row items-start xl:items-center gap-2 mb-2">
                                                <input type="text" placeholder="Nome Azienda..." value={riga.descrizione} onChange={e => handleCostoChange('subappalti', riga.id, 'descrizione', e.target.value)} className="w-full xl:flex-1 bg-white border border-slate-200 rounded p-1.5 text-xs font-bold" />
                                                <div className="flex gap-2 w-full xl:w-auto">
                                                    {/* BOTTONE COMPARATORE */}
                                                    <button onClick={() => setComparatorTarget({ cat: 'subappalti', rowId: riga.id })} className="bg-indigo-600 text-white text-[10px] px-2 py-1.5 rounded-md font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1 whitespace-nowrap">
                                                        <MagnifyingGlassIcon className="h-3 w-3" /> Trova Prezzo
                                                    </button>
                                                    {subappaltatori?.length > 0 && <button onClick={() => handleCostoChange('subappalti', riga.id, 'isNewItem', false)} className="text-[10px] text-slate-500 hover:text-slate-800 underline whitespace-nowrap px-1">Albo</button>}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </td>
                                <td className="py-3 px-2 align-top">
                                    <input type="text" placeholder="Es. Posa Ponteggi, Linea Vita..." value={riga.lavorazione || ''} onChange={e => handleCostoChange('subappalti', riga.id, 'lavorazione', e.target.value)} className="w-full bg-transparent border border-slate-200 focus:border-rose-300 rounded-lg p-2 text-sm font-medium text-slate-700" />
                                </td>
                                <td className="py-3 px-2 text-center align-top">
                                    <div className="flex justify-center items-center h-full pt-2">
                                        <label className="flex items-center cursor-pointer">
                                            <div className="relative">
                                                <input type="checkbox" checked={riga.preventivoUfficiale || false} onChange={e => handleCostoChange('subappalti', riga.id, 'preventivoUfficiale', e.target.checked)} className="sr-only" />
                                                <div className={`block w-10 h-6 rounded-full transition-colors ${riga.preventivoUfficiale ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${riga.preventivoUfficiale ? 'transform translate-x-4' : ''}`}></div>
                                            </div>
                                        </label>
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-500 mt-1 block">{riga.preventivoUfficiale ? 'Confermato' : 'Stima a Voce'}</span>
                                </td>
                                <td className="py-3 pl-2 pr-2 text-right align-top">
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-slate-400">€</span>
                                            <input type="number" value={riga.costoUnitario} onChange={e => {
                                                handleCostoChange('subappalti', riga.id, 'costoUnitario', e.target.value);
                                                handleCostoChange('subappalti', riga.id, 'quantita', 1); 
                                            }} className="w-24 bg-transparent border border-slate-200 focus:border-rose-300 rounded-lg p-2 text-sm text-right font-black text-slate-800" />
                                        </div>
                                        {/* MOSTRA UNITA DI MISURA ANCHE QUI SE PRESENTE DAL COMPARATORE */}
                                        {riga.unitaMisura && <span className="text-[10px] text-slate-400 font-bold uppercase mr-2">/ {riga.unitaMisura}</span>}
                                    </div>
                                </td>
                                <td className="py-3 text-right align-top pt-5"><button onClick={() => handleRemoveCosto('subappalti', riga.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="h-5 w-5"/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button onClick={handleAddSubappalto} className="mt-3 text-rose-600 text-xs font-bold flex items-center gap-1 hover:text-rose-800 bg-rose-50 px-4 py-2 rounded-lg transition-colors"><PlusIcon className="h-4 w-4"/> Aggiungi Subappalto</button>
        </div>
    );

    const renderRigheStandard = (cat, icona, titolo, placeDesc, labelQta, labelCosto, colorClass, buttonColor) => (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">{icona} {titolo}</h4>
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-black tracking-wider">Totale: € {costiInterni[cat].toFixed(2)}</span>
            </div>
            <table className="w-full text-left mb-2">
                <thead>
                    <tr><th className="py-2 text-[10px] font-bold text-slate-400 uppercase w-[55%]">Descrizione</th><th className="py-2 text-[10px] font-bold text-slate-400 uppercase text-center">{labelQta}</th><th className="py-2 text-[10px] font-bold text-slate-400 uppercase text-right">{labelCosto}</th><th className="py-2 text-[10px] font-bold text-slate-400 uppercase text-right pr-2">Importo</th><th className="w-8"></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {(dettaglioCosti[cat]||[]).map(riga => (
                        <tr key={riga.id} className="group">
                            <td className="py-2 pr-2"><input type="text" placeholder={placeDesc} value={riga.descrizione} onChange={e => handleCostoChange(cat, riga.id, 'descrizione', e.target.value)} className="w-full bg-transparent border border-transparent focus:border-slate-300 hover:border-slate-200 rounded p-1 text-sm font-bold text-slate-700" /></td>
                            <td className="py-2 px-1 text-center"><input type="number" value={riga.quantita} onChange={e => handleCostoChange(cat, riga.id, 'quantita', e.target.value)} className="w-16 bg-transparent border border-transparent focus:border-slate-300 hover:border-slate-200 rounded p-1 text-sm text-center font-bold" /></td>
                            <td className="py-2 px-1 text-right flex items-center justify-end gap-1"><span className="text-xs text-slate-400">€</span><input type="number" value={riga.costoUnitario} onChange={e => handleCostoChange(cat, riga.id, 'costoUnitario', e.target.value)} className="w-20 bg-transparent border border-transparent focus:border-slate-300 hover:border-slate-200 rounded p-1 text-sm text-right font-bold" /></td>
                            <td className="py-2 pl-2 pr-2 text-sm font-black text-slate-800 text-right">€ {((Number(riga.quantita) || 0) * (Number(riga.costoUnitario) || 0)).toFixed(2)}</td>
                            <td className="py-2 text-right"><button onClick={() => handleRemoveCosto(cat, riga.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="h-4 w-4"/></button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button onClick={() => handleAddCosto(cat)} className={`mt-2 text-xs font-bold flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg ${buttonColor}`}><PlusIcon className="h-4 w-4"/> Aggiungi Voce</button>
        </div>
    );

    return (
        <div className="space-y-6 max-w-6xl mx-auto animate-fade-in-up relative">
            
            {/* === RENDER DEL POPUP COMPARATORE === */}
            {comparatorTarget && (
                <ComparatorePrezzi 
                    isModal={true} 
                    onClose={() => setComparatorTarget(null)} 
                    onSelect={handleSelectFromComparator} 
                />
            )}

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap lg:flex-nowrap justify-between items-center gap-4">
                <div className="w-full lg:w-auto">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><CalculatorIcon className="h-6 w-6 text-indigo-500"/> Computo Analitico</h3>
                    <p className="text-xs text-slate-500 mt-1">Questi dati genereranno il Budget del Cantiere e non saranno visibili al cliente.</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-end">
                    <div className="bg-sky-50 px-3 py-2 rounded-lg border border-sky-100 text-center"><p className="text-[9px] font-bold text-sky-600 uppercase">Materiali</p><p className="text-sm font-black text-sky-800">€ {costiInterni.materiali.toFixed(2)}</p></div>
                    <div className="bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100 text-center"><p className="text-[9px] font-bold text-indigo-600 uppercase">Noli</p><p className="text-sm font-black text-indigo-800">€ {costiInterni.noli.toFixed(2)}</p></div>
                    <div className="bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 text-center"><p className="text-[9px] font-bold text-emerald-600 uppercase">Mezzi</p><p className="text-sm font-black text-emerald-800">€ {costiInterni.mezzi.toFixed(2)}</p></div>
                    <div className="bg-orange-50 px-3 py-2 rounded-lg border border-orange-100 text-center"><p className="text-[9px] font-bold text-orange-600 uppercase">Manodopera</p><p className="text-sm font-black text-orange-800">€ {costiInterni.manodopera.toFixed(2)}</p></div>
                    <div className="bg-rose-50 px-3 py-2 rounded-lg border border-rose-100 text-center"><p className="text-[9px] font-bold text-rose-600 uppercase">Subappalti</p><p className="text-sm font-black text-rose-800">€ {costiInterni.subappalti.toFixed(2)}</p></div>
                    <div className="bg-purple-50 px-3 py-2 rounded-lg border border-purple-100 text-center"><p className="text-[9px] font-bold text-purple-600 uppercase">Extra</p><p className="text-sm font-black text-purple-800">€ {costiInterni.altro.toFixed(2)}</p></div>
                    
                    <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 text-center ml-2"><p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Totale Costi</p><p className="text-lg font-black text-white">€ {totaleCosti.toFixed(2)}</p></div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-0">
                {renderRigheMateriali()}
                {renderRigheNoli()}
                {renderRigheMezziAziendali()}
                {renderRigheManodopera()}
                {renderRigheSubappalti()}
                
                <div className="xl:col-span-2">
                    {renderRigheStandard('altro', <WrenchScrewdriverIcon className="h-5 w-5 text-purple-500"/>, 'Spese Extra (Generiche)', 'Es. Pratica edilizia, Oneri...', 'Q.tà', 'Costo Unit.', 'text-purple-600', 'bg-purple-50 hover:text-purple-800')}
                </div>
            </div>

            <div className="flex justify-end pt-4 mt-2">
                <button onClick={onNext} className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-lg text-lg">Componi Offerta Cliente ➔</button>
            </div>
        </div>
    );
};