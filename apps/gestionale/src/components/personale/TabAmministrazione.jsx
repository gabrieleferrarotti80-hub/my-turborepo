import React from 'react';
import { CalculatorIcon, BellAlertIcon, CheckCircleIcon, XCircleIcon, CurrencyEuroIcon, DocumentTextIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';

const formattaDataSafe = (dataRaw) => {
    if (!dataRaw) return 'N/D';
    if (typeof dataRaw.toDate === 'function') return dataRaw.toDate().toLocaleDateString('it-IT');
    return new Date(dataRaw).toLocaleDateString('it-IT');
};

const safeGetTime = (val) => {
    if (!val) return 0;
    if (typeof val.toDate === 'function') return val.toDate().getTime();
    return new Date(val).getTime() || 0;
};

export const TabAmministrazione = ({
    selectedUser, setSelectedUser, isNewUser, isStorico, canViewCosts, updateNestedField,
    handleAutoCalcoloMaturati, richiesteUtente, handleRispostaRichiesta,
    bpMese, setBpMese, bpAnno, setBpAnno, MESI, ANNI,
    uploadingBusta, handleFileUpload, presenzeUtente
}) => {
    if (isNewUser || !canViewCosts) return null;

    return (
        <div className="space-y-6 animate-fade-in pointer-events-auto">
            <div className="bg-emerald-50 p-6 rounded-2xl shadow-sm border border-emerald-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-emerald-200 pb-3 gap-3">
                    <h3 className="text-lg font-bold text-emerald-900">Contatori Ferie e Permessi</h3>
                    {!isStorico && (
                        <button type="button" onClick={handleAutoCalcoloMaturati} className="text-xs font-bold bg-white text-emerald-700 border border-emerald-300 px-3 py-2 rounded-lg hover:bg-emerald-100 flex items-center gap-1 shadow-sm transition-colors">
                            <CalculatorIcon className="h-4 w-4" /> Auto-Calcola da Assunzione
                        </button>
                    )}
                </div>
                
                <h4 className="text-xs font-extrabold text-emerald-800 uppercase tracking-widest mb-3">Ferie (Giorni)</h4>
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-emerald-50 text-center"><p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Maturate (Correnti)</p><input type="number" step="0.5" className="w-20 text-center text-lg font-black text-gray-800 border-none bg-gray-50 rounded-lg p-1.5 focus:ring-emerald-500" value={selectedUser?.contatori?.ferieMaturate || 0} onChange={e => updateNestedField('contatori', null, 'ferieMaturate', parseFloat(e.target.value) || 0)} /></div>
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-emerald-50 text-center opacity-80"><p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Godute</p><input type="number" step="0.5" className="w-20 text-center text-lg font-black text-emerald-600 border-none bg-gray-50 rounded-lg p-1.5 focus:ring-emerald-500" value={selectedUser?.contatori?.ferieGodute || 0} onChange={e => updateNestedField('contatori', null, 'ferieGodute', parseFloat(e.target.value) || 0)} /></div>
                    <div className="bg-yellow-50 p-3 rounded-xl shadow-sm border border-yellow-100 text-center"><p className="text-[10px] font-bold text-yellow-700 uppercase mb-1">Residue (Anno Prec.)</p><input type="number" step="0.5" className="w-20 text-center text-lg font-black text-gray-800 border-none bg-white rounded-lg p-1.5 focus:ring-yellow-500" value={selectedUser?.contatori?.residuiFeriePrec || 0} onChange={e => updateNestedField('contatori', null, 'residuiFeriePrec', parseFloat(e.target.value) || 0)} /></div>
                </div>

                <h4 className="text-xs font-extrabold text-sky-800 uppercase tracking-widest mb-3">Permessi ROL (Ore)</h4>
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-sky-50 text-center"><p className="text-[10px] font-bold text-sky-600 uppercase mb-1">Maturati (Correnti)</p><input type="number" step="1" className="w-20 text-center text-lg font-black text-gray-800 border-none bg-gray-50 rounded-lg p-1.5 focus:ring-sky-500" value={selectedUser?.contatori?.permessiMaturati || 0} onChange={e => updateNestedField('contatori', null, 'permessiMaturati', parseInt(e.target.value) || 0)} /></div>
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-sky-50 text-center opacity-80"><p className="text-[10px] font-bold text-sky-600 uppercase mb-1">Goduti</p><input type="number" step="1" className="w-20 text-center text-lg font-black text-sky-600 border-none bg-gray-50 rounded-lg p-1.5 focus:ring-sky-500" value={selectedUser?.contatori?.permessiGoduti || 0} onChange={e => updateNestedField('contatori', null, 'permessiGoduti', parseInt(e.target.value) || 0)} /></div>
                    <div className="bg-yellow-50 p-3 rounded-xl shadow-sm border border-yellow-100 text-center"><p className="text-[10px] font-bold text-yellow-700 uppercase mb-1">Residui (Anno Prec.)</p><input type="number" step="1" className="w-20 text-center text-lg font-black text-gray-800 border-none bg-white rounded-lg p-1.5 focus:ring-yellow-500" value={selectedUser?.contatori?.residuiPermessiPrec || 0} onChange={e => updateNestedField('contatori', null, 'residuiPermessiPrec', parseInt(e.target.value) || 0)} /></div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border shadow-sm border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2"><BellAlertIcon className="h-5 w-5 text-orange-500"/> Richieste dall'App</h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {richiesteUtente.length > 0 ? richiesteUtente.map(req => {
                        const isPending = ['in_attesa', 'pendenza'].includes(req.stato);
                        let valoreCalcolato = req.quantita || 0;
                        if (!req.quantita) {
                            if (req.tipo === 'permesso') valoreCalcolato = req.ore || 0;
                            else if (req.tipo === 'ferie' && req.dataInizio) {
                                const d1 = new Date(req.dataInizio);
                                const d2 = req.dataFine ? new Date(req.dataFine) : d1;
                                valoreCalcolato = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
                            }
                        }

                        return (
                        <div key={req.id} className={`p-4 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isPending ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 opacity-70'}`}>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${req.tipo === 'ferie' ? 'bg-indigo-100 text-indigo-700' : 'bg-sky-100 text-sky-700'}`}>{req.tipo}</span>
                                    <span className="font-bold text-gray-800">{valoreCalcolato} {req.tipo === 'ferie' ? 'Giorni' : 'Ore'}</span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">Periodo: <span className="font-bold">{formattaDataSafe(req.dataInizio)} {req.dataFine ? `al ${formattaDataSafe(req.dataFine)}` : ''}</span></p>
                                {req.note && <p className="text-[11px] italic text-gray-500 mt-1">"{req.note}"</p>}
                            </div>
                            
                            <div className="flex gap-2 w-full md:w-auto">
                                {isPending ? (
                                    <>
                                        <button onClick={() => handleRispostaRichiesta(req, 'approvata')} className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-700 flex items-center justify-center gap-1 transition-colors"><CheckCircleIcon className="h-4 w-4"/> Approva</button>
                                        <button onClick={() => handleRispostaRichiesta(req, 'rifiutata')} className="flex-1 md:flex-none px-4 py-2 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200 flex items-center justify-center gap-1 transition-colors"><XCircleIcon className="h-4 w-4"/> Rifiuta</button>
                                    </>
                                ) : (
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${req.stato === 'approvata' ? 'text-emerald-600 border border-emerald-200 bg-emerald-50' : 'text-red-600 border border-red-200 bg-red-50'}`}>{req.stato}</span>
                                )}
                            </div>
                        </div>
                    )}) : <p className="text-center py-6 text-gray-400 italic bg-gray-50 rounded-xl border border-dashed">Nessuna richiesta trovata.</p>}
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2"><CurrencyEuroIcon className="h-5 w-5 text-emerald-600"/> Archivio Buste Paga</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Carica Singola</p>
                        <div className="flex gap-2">
                            <div className="w-2/3"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Mese</label><select className="w-full rounded-lg border-gray-300 text-sm font-medium" value={bpMese} onChange={e => setBpMese(e.target.value)}>{MESI.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                            <div className="w-1/3"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Anno</label><select className="w-full rounded-lg border-gray-300 text-sm font-medium" value={bpAnno} onChange={e => setBpAnno(e.target.value)}>{ANNI.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                        </div>
                        <div className="relative border-2 border-dashed border-emerald-300 rounded-xl p-5 text-center hover:bg-emerald-50 transition-all cursor-pointer bg-white mt-4">
                            <input type="file" accept=".pdf" disabled={isStorico || uploadingBusta} onChange={(e) => handleFileUpload(e, 'bustapaga')} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <p className="text-sm font-bold text-emerald-700">{uploadingBusta ? 'Caricamento...' : '+ Seleziona PDF'}</p>
                        </div>
                    </div>
                    
                    <div className="md:col-span-2">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-1">
                            {selectedUser?.bustePaga?.length > 0 ? selectedUser.bustePaga.sort((a,b)=>b.anno-a.anno || MESI.indexOf(b.mese)-MESI.indexOf(a.mese)).map((bp, i) => (
                                <div key={i} className="flex flex-col p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-emerald-300 transition-colors group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600"><DocumentTextIcon className="h-5 w-5"/></div>
                                        {!isStorico && <button type="button" onClick={() => setSelectedUser({...selectedUser, bustePaga: selectedUser.bustePaga.filter((_, idx) => idx !== i)})} className="text-gray-300 hover:text-red-500 transition-colors"><XMarkIcon className="h-4 w-4" /></button>}
                                    </div>
                                    <h5 className="font-extrabold text-gray-900 text-sm">{bp.mese} {bp.anno}</h5>
                                    <a href={bp.url} target="_blank" rel="noreferrer" className="w-full text-center py-1.5 mt-2 bg-gray-50 text-gray-700 font-bold text-xs rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">Apri PDF</a>
                                </div>
                            )) : <div className="col-span-full py-10 text-center text-gray-400 italic border border-dashed rounded-xl bg-gray-50">Nessuna busta paga archiviata.</div>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2"><ClockIcon className="h-5 w-5 text-indigo-600"/> Registro Ultime Presenze (30gg)</h3>
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-50">
                            <tr className="text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                                <th className="px-4 py-3 border-b">Data</th>
                                <th className="px-4 py-3 border-b text-center">Stato / Tipo</th>
                                <th className="px-4 py-3 border-b text-center">Ingresso</th>
                                <th className="px-4 py-3 border-b text-center">Uscita</th>
                                <th className="px-4 py-3 border-b">Cantiere</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {presenzeUtente.length > 0 ? presenzeUtente.map((p, idx) => {
                                const dtInizio = new Date(safeGetTime(p.timestampInizio));
                                const dtFine = p.timestampFine ? new Date(safeGetTime(p.timestampFine)) : null;
                                const statoColor = p.stato === 'lavoro' ? 'bg-emerald-100 text-emerald-800' : p.stato === 'ferie' ? 'bg-sky-100 text-sky-800' : p.stato === 'malattia' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800';
                                return (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 font-bold text-gray-700">{dtInizio.toLocaleDateString('it-IT')}</td>
                                        <td className="px-4 py-2 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statoColor}`}>{p.stato}</span></td>
                                        <td className="px-4 py-2 text-center font-mono text-gray-600">{p.stato === 'lavoro' ? dtInizio.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'}) : '-'}</td>
                                        <td className="px-4 py-2 text-center font-mono text-gray-600">{p.stato === 'lavoro' ? (dtFine ? dtFine.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'}) : 'In corso') : '-'}</td>
                                        <td className="px-4 py-2 text-xs text-gray-600 truncate max-w-[150px]">{p.cantiereNome || '-'}</td>
                                    </tr>
                                );
                            }) : <tr><td colSpan="5" className="p-6 text-center text-gray-400 italic">Nessuna timbratura trovata.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};