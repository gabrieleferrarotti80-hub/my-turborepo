import React, { useState, useMemo } from 'react';
import { 
    PlusIcon, SparklesIcon, XMarkIcon, TruckIcon, 
    BuildingOfficeIcon, ArrowPathIcon, ClipboardDocumentCheckIcon 
} from '@heroicons/react/24/outline';

export const CantiereNoleggiWidget = ({ cantiere, noleggiatori, fattureAcquisto, onUpdate }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({ tipoCosto: 'giornaliero' });

    const [activeAuthId, setActiveAuthId] = useState(null);
    const [authForm, setAuthForm] = useState({});

    const noleggi = cantiere.noleggi || [];

    const noleggiatoreSelezionato = useMemo(() => {
        return noleggiatori.find(n => n.id === formData.fornitoreId);
    }, [formData.fornitoreId, noleggiatori]);

    const listinoDisponibile = noleggiatoreSelezionato?.listino || [];

    const handleSaveNoleggio = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const nuovoNoleggio = {
                id: Date.now().toString(),
                fornitoreId: formData.fornitoreId,
                nomeFornitore: noleggiatoreSelezionato ? noleggiatoreSelezionato.ragioneSociale : 'Noleggiatore',
                mezzo: formData.mezzo || '',
                dataInizio: formData.dataInizio,
                dataFinePrevista: formData.dataFinePrevista || '',
                tipoCosto: formData.tipoCosto, 
                costoPattuito: Number(formData.costoPattuito || 0),
                stato: 'attivo', 
                dataRegistrazione: new Date().toISOString(),
                autorizzazioni: [] 
            };
            await onUpdate({ noleggi: [...noleggi, nuovoNoleggio] });
            setIsAdding(false); setFormData({ tipoCosto: 'giornaliero' });
        } catch (error) { console.error(error); alert("Errore salvataggio."); } finally { setIsSaving(false); }
    };

    const chiudiNoleggio = async (noleggioId) => {
        const dataFineEffettiva = prompt("Inserisci la data di Restituzione (AAAA-MM-GG):", new Date().toISOString().split('T')[0]);
        if (!dataFineEffettiva) return;
        const updatedNoleggi = noleggi.map(nol => nol.id === noleggioId ? { ...nol, stato: 'concluso', dataFineEffettiva } : nol);
        await onUpdate({ noleggi: updatedNoleggi });
    };

    const rimuoviNoleggio = async (noleggioId) => {
        if(!confirm("Eliminare registrazione e relative autorizzazioni?")) return;
        await onUpdate({ noleggi: noleggi.filter(n => n.id !== noleggioId) });
    };

    const handleSaveAutorizzazione = async (e, noleggioId) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const nuovaAuth = {
                id: Date.now().toString(),
                periodo: authForm.periodo || '',
                giorniRiconosciuti: Number(authForm.giorniRiconosciuti || 0),
                importo: Number(authForm.importo || 0),
                note: authForm.note || '',
                dataAutorizzazione: new Date().toISOString()
            };

            const updatedNoleggi = noleggi.map(nol => {
                if (nol.id === noleggioId) return { ...nol, autorizzazioni: [...(nol.autorizzazioni || []), nuovaAuth] };
                return nol;
            });

            await onUpdate({ noleggi: updatedNoleggi });
            setActiveAuthId(null); setAuthForm({});
        } catch (error) { console.error(error); } finally { setIsSaving(false); }
    };

    const eliminaAutorizzazione = async (noleggioId, authId) => {
        if(!confirm("Revocare questa autorizzazione?")) return;
        const updatedNoleggi = noleggi.map(nol => {
            if (nol.id === noleggioId) return { ...nol, autorizzazioni: nol.autorizzazioni.filter(a => a.id !== authId) };
            return nol;
        });
        await onUpdate({ noleggi: updatedNoleggi });
    };

    return (
        <div className="space-y-6 p-4 md:p-6 animate-fade-in">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Noleggi e Mezzi Esterni</h2>
                    <p className="text-sm text-gray-500">Tieni traccia dei mezzi in cantiere e autorizza la fatturazione all'amministrazione.</p>
                </div>
                {!isAdding && (
                    <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-sm font-medium transition-colors">
                        <PlusIcon className="h-5 w-5" /> Registra Ingresso Mezzo
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-xl shadow-sm animate-fade-in-down">
                    <h3 className="font-bold text-indigo-800 mb-4 border-b border-indigo-200 pb-2">Registra Ingresso Mezzo a Noleggio</h3>
                    <form onSubmit={handleSaveNoleggio} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Ditta Noleggiatrice *</label>
                                <select required value={formData.fornitoreId || ''} onChange={e => setFormData({fornitoreId: e.target.value, mezzo: '', costoPattuito: ''})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 bg-white font-bold text-indigo-900">
                                    <option value="">-- Seleziona dall'Albo Noleggiatori --</option>
                                    {noleggiatori.map(f => <option key={f.id} value={f.id}>{f.ragioneSociale}</option>)}
                                </select>
                            </div>

                            {listinoDisponibile.length > 0 && (
                                <div className="md:col-span-2 bg-yellow-50 p-3 rounded-lg border border-yellow-300 flex flex-col justify-center">
                                    <label className="block text-[10px] font-bold text-yellow-800 uppercase mb-1 flex items-center gap-1"><SparklesIcon className="h-3 w-3"/> Scegli dal Listino</label>
                                    <select className="w-full rounded border-yellow-300 text-sm" onChange={(e) => {
                                        const item = listinoDisponibile.find(i => i.id === e.target.value);
                                        if (item) setFormData(prev => ({...prev, mezzo: item.mezzo, tipoCosto: item.tipoCosto, costoPattuito: item.costo}));
                                    }}>
                                        <option value="">-- Autocompila mezzo e tariffa --</option>
                                        {listinoDisponibile.map(item => <option key={item.id} value={item.id}>{item.mezzo} (€ {item.costo} / {item.tipoCosto})</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mezzo o Attrezzatura *</label><input required type="text" value={formData.mezzo || ''} onChange={e => setFormData({...formData, mezzo: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 bg-white" /></div>
                            <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data Ingresso *</label><input required type="date" value={formData.dataInizio || ''} onChange={e => setFormData({...formData, dataInizio: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500" /></div>
                            <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data Uscita Prevista</label><input type="date" value={formData.dataFinePrevista || ''} onChange={e => setFormData({...formData, dataFinePrevista: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500" /></div>
                            <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tipo Tariffa *</label><select value={formData.tipoCosto || 'giornaliero'} onChange={e => setFormData({...formData, tipoCosto: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500"><option value="giornaliero">Giornaliera</option><option value="mensile">Mensile</option><option value="forfait">Forfait (Fisso)</option></select></div>
                            <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Costo (€) *</label><input required type="number" step="0.01" min="0" value={formData.costoPattuito || ''} onChange={e => setFormData({...formData, costoPattuito: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 font-bold text-indigo-700 bg-white" /></div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-indigo-100">
                            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 font-medium shadow-sm">Annulla</button>
                            <button type="submit" disabled={isSaving} className="px-6 py-2 bg-indigo-600 text-white rounded-md font-bold shadow-md">Registra Ingresso</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 gap-8">
                {noleggi.length === 0 && !isAdding && (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200"><TruckIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" /><p className="text-gray-500 font-medium">Nessun mezzo a noleggio in questo cantiere.</p></div>
                )}
                {noleggi.map(nol => {
                    const start = new Date(nol.dataInizio);
                    const end = nol.stato === 'concluso' && nol.dataFineEffettiva ? new Date(nol.dataFineEffettiva) : new Date();
                    let giorniTrascorsi = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
                    if (start > new Date() && nol.stato !== 'concluso') giorniTrascorsi = 0;

                    let costoTeorico = 0;
                    if (nol.tipoCosto === 'forfait') costoTeorico = nol.costoPattuito;
                    else if (nol.tipoCosto === 'giornaliero') costoTeorico = giorniTrascorsi * nol.costoPattuito;
                    else if (nol.tipoCosto === 'mensile') costoTeorico = (giorniTrascorsi / 30) * nol.costoPattuito;

                    const autorizzazioni = nol.autorizzazioni || [];
                    const totaleAutorizzato = autorizzazioni.reduce((acc, aut) => acc + Number(aut.importo || 0), 0);

                    const importoDaAutorizzare = Math.max(0, costoTeorico - totaleAutorizzato);

                    const fattureDelNoleggio = fattureAcquisto.filter(f => f.cantiereId === cantiere.id && f.fornitoreId === nol.fornitoreId && (f.categoriaCosto || '').toLowerCase() === 'noleggi');
                    const totaleFatturato = fattureDelNoleggio.reduce((acc, f) => acc + (Number(f.imponibile) || 0), 0);
                    
                    const isAttivo = nol.stato === 'attivo';
                    const allarmeFatturazione = totaleFatturato > totaleAutorizzato;

                    return (
                        <div key={nol.id} className={`bg-white rounded-2xl shadow-sm border ${allarmeFatturazione ? 'border-red-300 ring-2 ring-red-200' : 'border-gray-200'} overflow-hidden flex flex-col xl:flex-row`}>
                            <div className="p-5 xl:w-1/3 border-b xl:border-b-0 xl:border-r border-gray-100 relative bg-gray-50/50">
                                <button onClick={() => rimuoviNoleggio(nol.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500"><XMarkIcon className="h-5 w-5" /></button>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isAttivo ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'}`}>{isAttivo ? 'IN USO' : 'RESTITUITO'}</span>
                                    <h3 className="font-extrabold text-lg text-gray-900 pr-6">{nol.mezzo}</h3>
                                </div>
                                <p className="text-sm text-gray-600 font-medium mb-4 flex items-center gap-1"><BuildingOfficeIcon className="h-4 w-4"/> {nol.nomeFornitore}</p>
                                
                                <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-4">
                                    <div><p className="text-[10px] text-gray-500 uppercase font-bold">Ingresso</p><p className="text-xs font-semibold">{new Date(nol.dataInizio).toLocaleDateString()}</p></div>
                                    <div><p className="text-[10px] text-gray-500 uppercase font-bold">{isAttivo ? 'Fine Prevista' : 'Data Uscita'}</p><p className="text-xs font-semibold">{nol.dataFineEffettiva ? new Date(nol.dataFineEffettiva).toLocaleDateString() : (nol.dataFinePrevista ? new Date(nol.dataFinePrevista).toLocaleDateString() : 'Non definita')}</p></div>
                                    <div><p className="text-[10px] text-gray-500 uppercase font-bold">Accordo</p><p className="text-xs font-semibold text-indigo-700">€ {nol.costoPattuito} ({nol.tipoCosto})</p></div>
                                    <div><p className="text-[10px] text-gray-500 uppercase font-bold">Giorni Cantiere</p><p className="text-xs font-semibold">{giorniTrascorsi} gg</p></div>
                                </div>
                                {isAttivo && (
                                    <button onClick={() => chiudiNoleggio(nol.id)} className="w-full text-xs bg-gray-800 text-white px-4 py-2.5 rounded shadow hover:bg-black font-bold flex items-center justify-center gap-2 transition-colors"><ArrowPathIcon className="h-4 w-4"/> Registra Restituzione Mezzo</button>
                                )}
                            </div>

                            <div className="p-5 xl:w-1/3 border-b xl:border-b-0 xl:border-r border-gray-100 flex flex-col justify-center space-y-4">
                                <div><p className="text-xs text-gray-500 uppercase font-bold flex justify-between mb-1"><span>1. Costo Teorico Stimato</span></p><p className="text-lg font-bold text-gray-800">€ {costoTeorico.toLocaleString('it-IT')}</p></div>
                                <div><p className="text-xs text-green-600 uppercase font-bold flex justify-between mb-1"><span>2. Lavori Autorizzati (Da Cantiere)</span></p><p className="text-xl font-extrabold text-green-700">€ {totaleAutorizzato.toLocaleString('it-IT')}</p><div className="w-full bg-gray-100 rounded-full h-1 mt-1"><div className="bg-green-500 h-1 rounded-full" style={{ width: `${Math.min((totaleAutorizzato/costoTeorico)*100, 100)}%` }}></div></div></div>
                                <div className="pt-2 border-t border-gray-100">
                                    <p className={`text-xs uppercase font-bold flex justify-between mb-1 ${allarmeFatturazione ? 'text-red-600' : 'text-gray-500'}`}><span>3. Fatture Ricevute (Amministraz.)</span></p>
                                    <p className={`text-xl font-extrabold ${allarmeFatturazione ? 'text-red-600' : 'text-gray-800'}`}>€ {totaleFatturato.toLocaleString('it-IT')}</p>
                                    {allarmeFatturazione && <p className="text-[10px] font-bold text-red-600 mt-2 bg-red-50 p-2 rounded border border-red-100">⚠️ BLOCCO: Hanno fatturato € {(totaleFatturato - totaleAutorizzato).toLocaleString()} in più rispetto a quanto hai autorizzato!</p>}
                                </div>
                            </div>

                            <div className="p-5 xl:w-1/3 bg-white flex flex-col">
                                <div className="flex justify-between items-center mb-4 border-b pb-2">
                                    <h4 className="font-bold text-sm text-gray-800 flex items-center gap-2"><ClipboardDocumentCheckIcon className="h-5 w-5 text-green-600"/> Autorizzazioni</h4>
                                    {importoDaAutorizzare > 0 ? (
                                        <button onClick={() => {
                                            if (activeAuthId === nol.id) {
                                                setActiveAuthId(null); setAuthForm({});
                                            } else {
                                                setActiveAuthId(nol.id);
                                                setAuthForm({
                                                    periodo: `Dal ${new Date(nol.dataInizio).toLocaleDateString('it-IT')} al ${nol.dataFineEffettiva ? new Date(nol.dataFineEffettiva).toLocaleDateString('it-IT') : new Date().toLocaleDateString('it-IT')}`,
                                                    giorniRiconosciuti: giorniTrascorsi,
                                                    importo: parseFloat(importoDaAutorizzare.toFixed(2)),
                                                    note: nol.stato === 'concluso' ? 'Saldo finale fine noleggio' : 'SAL intermedio noleggio'
                                                });
                                            }
                                        }} className="text-xs bg-green-50 text-green-700 font-bold px-3 py-1.5 rounded hover:bg-green-100 transition-colors">
                                            {activeAuthId === nol.id ? 'Annulla' : '+ Autorizza Saldo'}
                                        </button>
                                    ) : (
                                        <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-2 py-1 rounded">✅ Tutto Autorizzato</span>
                                    )}
                                </div>

                                {activeAuthId === nol.id && (
                                    <form onSubmit={(e) => handleSaveAutorizzazione(e, nol.id)} className="bg-gray-50 border border-green-200 rounded-xl p-3 mb-4 shadow-sm animate-fade-in-down">
                                        <div className="space-y-3">
                                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase">Periodo Riferimento</label><input required type="text" value={authForm.periodo || ''} onChange={e => setAuthForm({...authForm, periodo: e.target.value})} className="w-full rounded text-sm border-gray-300 shadow-sm mt-1" /></div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase">Giorni Uso</label><input required type="number" min="1" value={authForm.giorniRiconosciuti || ''} onChange={e => setAuthForm({...authForm, giorniRiconosciuti: e.target.value})} className="w-full rounded text-sm border-gray-300 shadow-sm mt-1" /></div>
                                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase">Importo (€) *</label><input required type="number" step="0.01" min="0" value={authForm.importo || ''} onChange={e => setAuthForm({...authForm, importo: e.target.value})} className="w-full rounded text-sm border-gray-300 shadow-sm mt-1 font-bold text-green-700" /></div>
                                            </div>
                                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase">Note (Opzionale)</label><input type="text" value={authForm.note || ''} onChange={e => setAuthForm({...authForm, note: e.target.value})} className="w-full rounded text-sm border-gray-300 shadow-sm mt-1" /></div>
                                        </div>
                                        <div className="mt-3 flex justify-end"><button type="submit" disabled={isSaving} className="bg-green-600 text-white text-xs font-bold px-4 py-2 rounded shadow hover:bg-green-700">Conferma Autorizzazione</button></div>
                                    </form>
                                )}

                                <div className="space-y-2 flex-1 overflow-y-auto">
                                    {autorizzazioni.length === 0 ? <p className="text-[11px] text-gray-400 italic">Nessun pagamento ancora autorizzato dal cantiere.</p> : autorizzazioni.map(aut => (
                                        <div key={aut.id} className="flex justify-between items-center p-2 bg-gray-50 border border-gray-200 rounded hover:bg-white transition-colors">
                                            <div><p className="text-xs font-bold text-gray-800">{aut.periodo} <span className="text-[10px] text-gray-500 font-normal">({aut.giorniRiconosciuti}gg)</span></p>{aut.note && <p className="text-[10px] text-gray-500 mt-0.5">"{aut.note}"</p>}</div>
                                            <div className="flex items-center gap-3"><p className="font-extrabold text-green-700 text-sm">€ {Number(aut.importo).toLocaleString('it-IT')}</p><button onClick={() => eliminaAutorizzazione(nol.id, aut.id)} className="text-gray-300 hover:text-red-500"><XMarkIcon className="h-4 w-4"/></button></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};