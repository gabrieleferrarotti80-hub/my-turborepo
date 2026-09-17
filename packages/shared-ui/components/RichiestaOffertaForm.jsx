import React, { useState, useMemo } from 'react';
import { 
    ArrowLeftIcon, ShoppingCartIcon, BuildingOfficeIcon, TrashIcon, 
    PlusIcon, EnvelopeIcon, LinkIcon, UsersIcon, CheckCircleIcon,
    PaperClipIcon, ArrowUpTrayIcon, TagIcon,
    ArchiveBoxIcon, TruckIcon, WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

export const RichiestaOffertaForm = ({ 
    onBack, onSave, cantieri = [], fornitori = [], subappaltatori = [], noleggiatori = [], isLoading,
    catalogo = [], 
    datiIniziali = null 
}) => {
    
    const initialTipoRDO = useMemo(() => {
        if (datiIniziali && datiIniziali.righe && datiIniziali.righe.length > 0) {
            const tipologiaRiga = datiIniziali.righe[0].tipologia || '';
            if (['nolo', 'automezzo', 'macchina_operatrice', 'attrezzatura'].includes(tipologiaRiga)) return 'nolo';
            if (tipologiaRiga === 'subappalto') return 'subappalto';
        }
        return 'materiale';
    }, [datiIniziali]);

    const [tipoRDO, setTipoRDO] = useState(initialTipoRDO);

    const getEmptyRiga = (tipo) => {
        if (tipo === 'nolo') return { descrizione: '', quantita: 1, unitaMisura: 'gg', tipoNolo: 'a_freddo', note: '' };
        if (tipo === 'subappalto') return { descrizione: '', quantita: 1, unitaMisura: 'corpo', tipoPosa: 'fornitura_e_posa', note: '' };
        return { descrizione: '', quantita: 1, unitaMisura: 'pz', note: '' };
    };

    const [formData, setFormData] = useState({
        titolo: datiIniziali?.titolo || '',
        cantiereId: datiIniziali?.cantiereId || '',
        dataScadenza: datiIniziali?.dataScadenza || '',
        noteGenerali: datiIniziali?.noteGenerali || '',
        metodoInvio: 'link_smart',
        righe: datiIniziali?.righe ? datiIniziali.righe.map(r => ({ ...getEmptyRiga(initialTipoRDO), ...r })) : [getEmptyRiga(initialTipoRDO)],
        fornitoriSelezionati: datiIniziali?.fornitoriSelezionati || [], 
        emailEsterne: datiIniziali?.emailEsterne || [] 
    });

    const [nuovaEmail, setNuovaEmail] = useState('');
    const [files, setFiles] = useState([]);

    const handleTipoRDOChange = (nuovoTipo) => {
        if (formData.righe[0].descrizione !== '' || formData.fornitoriSelezionati.length > 0) {
            if (!window.confirm("Cambiando tipologia azzererai le righe e i fornitori selezionati. Vuoi procedere?")) return;
        }
        setTipoRDO(nuovoTipo);
        setFormData(prev => ({
            ...prev,
            righe: [getEmptyRiga(nuovoTipo)],
            fornitoriSelezionati: []
        }));
    };

    const vociDizionario = useMemo(() => {
        const risultati = { mezzi: [], materiali: [], subappalti: [] };
        if (!Array.isArray(catalogo)) return risultati;

        catalogo.forEach(gruppo => {
            const macro = gruppo.macroCategoria ? `[${gruppo.macroCategoria}] ` : '';
            const base = `${macro}${gruppo.famiglia}`;
            let vociEspanse = gruppo.voci && gruppo.voci.length > 0 ? gruppo.voci.map(v => `${base} - ${v}`) : [base];

            if (gruppo.tipoArticolo === 'nolo') risultati.mezzi.push(...vociEspanse);
            if (gruppo.tipoArticolo === 'materiale') risultati.materiali.push(...vociEspanse);
            if (gruppo.tipoArticolo === 'subappalto') risultati.subappalti.push(...vociEspanse);
        });
        return risultati;
    }, [catalogo]);

    const listaFornitoriFiltrata = useMemo(() => {
        if (tipoRDO === 'nolo') return noleggiatori;
        if (tipoRDO === 'subappalto') return subappaltatori;
        return fornitori;
    }, [tipoRDO, fornitori, noleggiatori, subappaltatori]);

    const handleAddRiga = () => setFormData(prev => ({ ...prev, righe: [...prev.righe, getEmptyRiga(tipoRDO)] }));
    const handleRemoveRiga = (index) => { if (formData.righe.length > 1) setFormData(prev => ({ ...prev, righe: prev.righe.filter((_, i) => i !== index) })); };
    const handleRigaChange = (index, field, value) => { 
        const newRighe = [...formData.righe]; 
        newRighe[index][field] = value; 
        setFormData(prev => ({ ...prev, righe: newRighe })); 
    };

    const toggleFornitore = (id) => {
        setFormData(prev => {
            const isSelected = prev.fornitoriSelezionati.includes(id);
            return { ...prev, fornitoriSelezionati: isSelected ? prev.fornitoriSelezionati.filter(fid => fid !== id) : [...prev.fornitoriSelezionati, id] };
        });
    };

    const handleAddEmail = () => {
        if (nuovaEmail && nuovaEmail.includes('@') && !formData.emailEsterne.includes(nuovaEmail)) {
            setFormData(prev => ({ ...prev, emailEsterne: [...prev.emailEsterne, nuovaEmail] }));
            setNuovaEmail('');
        }
    };
    
    const removeEmail = (email) => setFormData(prev => ({ ...prev, emailEsterne: prev.emailEsterne.filter(e => e !== email) }));

    const handleFileChange = (e) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files)]);
        }
    };
    
    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        let emailFinali = [...formData.emailEsterne];
        if (nuovaEmail && nuovaEmail.includes('@') && !emailFinali.includes(nuovaEmail)) {
            emailFinali.push(nuovaEmail);
        }

        if (formData.fornitoriSelezionati.length === 0 && emailFinali.length === 0) {
            alert("Devi selezionare almeno un'azienda dall'albo o inserire un'email valida.");
            return;
        }
        
        const cantiereScelto = cantieri.find(c => c.id === formData.cantiereId);
        
        // Formattiamo le righe aggiungendo la "tipologiaEstesa" per creare mail perfette
        const righeFormattate = formData.righe.map(r => {
            let descTipo = 'Fornitura';
            if (tipoRDO === 'nolo') descTipo = r.tipoNolo === 'a_caldo' ? 'Nolo a Caldo' : 'Nolo a Freddo';
            if (tipoRDO === 'subappalto') descTipo = r.tipoPosa === 'solo_posa' ? 'Solo Posa' : 'Fornitura e Posa';

            return {
                ...r,
                tipologia: tipoRDO, // Chiave tecnica (nolo, subappalto, materiale)
                tipologiaEstesa: descTipo // Testo bello per l'email!
            };
        });

        const payload = {
            ...formData,
            tipoOggetto: tipoRDO,
            righe: righeFormattate,
            emailEsterne: emailFinali, 
            cantiereNome: formData.cantiereId === 'magazzino' ? 'Magazzino / Scorte' : (cantiereScelto?.nomeCantiere || formData.cantiereId.replace('GARA_', 'GARA: ')),
            stato: 'in_attesa', 
            dataInserimento: new Date().toISOString()
        };
        
        onSave(payload, files);
    };

    const inputClass = "w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition-colors";
    const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5";

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen animate-fade-in-down">
            
            <datalist id="lista-mezzi">{vociDizionario.mezzi.map((v, i) => <option key={i} value={v} />)}</datalist>
            <datalist id="lista-materiali">{vociDizionario.materiali.map((v, i) => <option key={i} value={v} />)}</datalist>
            <datalist id="lista-subappalti">{vociDizionario.subappalti.map((v, i) => <option key={i} value={v} />)}</datalist>

            <div className="max-w-5xl mx-auto mb-6 flex justify-between items-center">
                <button type="button" onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors">
                    <ArrowLeftIcon className="h-5 w-5" /> <span>Annulla e Torna Indietro</span>
                </button>
            </div>

            <form onSubmit={handleSubmit} className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden mb-20 border border-slate-200">
                <div className="p-8 bg-indigo-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-800 rounded-xl"><ShoppingCartIcon className="h-8 w-8 text-indigo-300" /></div>
                        <div><h1 className="text-2xl font-black">Nuova Richiesta di Offerta (RDO)</h1><p className="text-indigo-300 text-sm font-medium mt-1">Crea la lista, allega documenti e inviala alle aziende.</p></div>
                    </div>
                </div>

                <div className="p-8 space-y-10">
                    
                    {/* SELETTORE A 3 VIE */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <TagIcon className="h-5 w-5 text-indigo-500"/> Di cosa hai bisogno? (Tipologia Gara)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div onClick={() => handleTipoRDOChange('materiale')} className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${tipoRDO === 'materiale' ? 'border-sky-500 bg-sky-50 shadow-md ring-2 ring-sky-100' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                                <ArchiveBoxIcon className={`h-8 w-8 ${tipoRDO === 'materiale' ? 'text-sky-600' : 'text-slate-400'}`}/>
                                <div><h4 className={`font-bold ${tipoRDO === 'materiale' ? 'text-sky-900' : 'text-slate-700'}`}>Fornitura Materiali</h4><p className="text-[10px] text-slate-500">Acquisto beni di consumo</p></div>
                            </div>
                            <div onClick={() => handleTipoRDOChange('nolo')} className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${tipoRDO === 'nolo' ? 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-100' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                                <TruckIcon className={`h-8 w-8 ${tipoRDO === 'nolo' ? 'text-indigo-600' : 'text-slate-400'}`}/>
                                <div><h4 className={`font-bold ${tipoRDO === 'nolo' ? 'text-indigo-900' : 'text-slate-700'}`}>Noleggio Mezzi/Attrezzi</h4><p className="text-[10px] text-slate-500">Macchine operatrici e furgoni</p></div>
                            </div>
                            <div onClick={() => handleTipoRDOChange('subappalto')} className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${tipoRDO === 'subappalto' ? 'border-rose-500 bg-rose-50 shadow-md ring-2 ring-rose-100' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                                <WrenchScrewdriverIcon className={`h-8 w-8 ${tipoRDO === 'subappalto' ? 'text-rose-600' : 'text-slate-400'}`}/>
                                <div><h4 className={`font-bold ${tipoRDO === 'subappalto' ? 'text-rose-900' : 'text-slate-700'}`}>Lavori in Subappalto</h4><p className="text-[10px] text-slate-500">Affidamento posa o opere</p></div>
                            </div>
                        </div>
                    </div>

                    {/* DETTAGLI RDO */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2"><BuildingOfficeIcon className="h-5 w-5 text-indigo-500"/> Dettagli Richiesta</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2"><label className={labelClass}>Titolo / Oggetto della Gara *</label><input required type="text" value={formData.titolo} onChange={e => setFormData({...formData, titolo: e.target.value})} className={inputClass} placeholder={`Es. ${tipoRDO === 'materiale' ? 'Fornitura tubazioni...' : tipoRDO === 'nolo' ? 'Noleggio escavatori per scavo...' : 'Opere di muratura tetto...'}`} /></div>
                            <div><label className={labelClass}>Scadenza ricezione offerte *</label><input required type="date" value={formData.dataScadenza} onChange={e => setFormData({...formData, dataScadenza: e.target.value})} className={inputClass} /></div>
                            
                            <div className="md:col-span-3">
                                <label className={labelClass}>Cantiere o Gara di Destinazione *</label>
                                <select required value={formData.cantiereId} onChange={e => setFormData({...formData, cantiereId: e.target.value})} className={inputClass}>
                                    <option value="">-- Seleziona Cantiere o Magazzino --</option>
                                    <option value="magazzino" className="font-bold text-indigo-700">📦 MAGAZZINO / SCORTA GENERALE</option>
                                    {cantieri.map(c => <option key={c.id} value={c.id}>{c.nomeCantiere}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-3"><label className={labelClass}>Capitolato Speciale / Note Generali (Opzionale)</label><textarea value={formData.noteGenerali} onChange={e => setFormData({...formData, noteGenerali: e.target.value})} rows={3} className={inputClass} placeholder="Scrivi qui eventuali condizioni contrattuali o richieste per i fornitori..."></textarea></div>
                        </div>
                    </div>

                    {/* TABELLA DINAMICA */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <ShoppingCartIcon className="h-5 w-5 text-indigo-500"/> Elenco Richieste
                        </h3>
                        
                        <div className="border border-slate-200 rounded-xl overflow-x-auto">
                            <table className="min-w-full text-left text-sm whitespace-nowrap">
                                <thead className={`text-[10px] font-black uppercase text-slate-600 ${tipoRDO === 'materiale' ? 'bg-sky-50' : tipoRDO === 'nolo' ? 'bg-indigo-50' : 'bg-rose-50'}`}>
                                    <tr>
                                        <th className="p-3 min-w-[250px]">{tipoRDO === 'subappalto' ? 'Lavorazione Richiesta' : tipoRDO === 'nolo' ? 'Macchinario / Automezzo' : 'Descrizione Materiale'}</th>
                                        {tipoRDO === 'nolo' && <th className="p-3 w-40">Tipo Nolo</th>}
                                        {tipoRDO === 'subappalto' && <th className="p-3 w-40">Tipo Appalto</th>}
                                        <th className="p-3 w-24 text-center">{tipoRDO === 'nolo' ? 'Durata' : 'Quantità'}</th>
                                        <th className="p-3 w-20 text-center">Unità</th>
                                        <th className="p-3">Note Specifiche per Riga</th>
                                        <th className="p-3 w-10 text-center">X</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {formData.righe.map((riga, idx) => {
                                        let dlId = tipoRDO === 'materiale' ? "lista-materiali" : tipoRDO === 'nolo' ? "lista-mezzi" : "lista-subappalti";
                                        return (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-2">
                                                    <input required type="text" list={dlId} value={riga.descrizione} onChange={e => handleRigaChange(idx, 'descrizione', e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800" placeholder="Descrivi la richiesta..." />
                                                </td>
                                                {tipoRDO === 'nolo' && (
                                                    <td className="p-2">
                                                        <select value={riga.tipoNolo} onChange={e => handleRigaChange(idx, 'tipoNolo', e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-indigo-700 bg-indigo-50/50 focus:ring-2 focus:ring-indigo-500">
                                                            <option value="a_freddo">A Freddo (Senza Op.)</option>
                                                            <option value="a_caldo">A Caldo (Con Operatore)</option>
                                                        </select>
                                                    </td>
                                                )}
                                                {tipoRDO === 'subappalto' && (
                                                    <td className="p-2">
                                                        <select value={riga.tipoPosa} onChange={e => handleRigaChange(idx, 'tipoPosa', e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-rose-700 bg-rose-50/50 focus:ring-2 focus:ring-rose-500">
                                                            <option value="fornitura_e_posa">Fornitura e Posa</option>
                                                            <option value="solo_posa">Solo Posa in Opera</option>
                                                        </select>
                                                    </td>
                                                )}
                                                <td className="p-2">
                                                    <input required type="number" min="0.1" step="0.1" value={riga.quantita} onChange={e => handleRigaChange(idx, 'quantita', e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg text-center focus:ring-2 focus:ring-indigo-500 font-bold" />
                                                </td>
                                                <td className="p-2">
                                                    <select value={riga.unitaMisura} onChange={e => handleRigaChange(idx, 'unitaMisura', e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                                        {tipoRDO === 'nolo' ? (
                                                            <><option value="gg">Giorni</option><option value="mesi">Mesi</option><option value="ore">Ore</option></>
                                                        ) : tipoRDO === 'subappalto' ? (
                                                            <><option value="corpo">A Corpo</option><option value="mq">Mq</option><option value="ml">Ml</option><option value="ore">Ore</option></>
                                                        ) : (
                                                            <><option value="pz">Pz</option><option value="mt">Mt</option><option value="kg">Kg</option><option value="lt">Lt</option><option value="mq">Mq</option><option value="mc">Mc</option><option value="scatola">Scatole</option><option value="pallet">Pallet</option></>
                                                        )}
                                                    </select>
                                                </td>
                                                <td className="p-2">
                                                    <input type="text" value={riga.note} onChange={e => handleRigaChange(idx, 'note', e.target.value)} className="w-full p-2.5 border border-transparent hover:border-slate-200 focus:border-indigo-500 rounded-lg text-xs text-slate-600 bg-transparent focus:bg-white" placeholder="Specifiche tecniche..." />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button type="button" onClick={() => handleRemoveRiga(idx)} className="text-slate-300 hover:text-red-500 p-1"><TrashIcon className="h-5 w-5 mx-auto"/></button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <button type="button" onClick={handleAddRiga} className="w-full py-4 bg-slate-50 text-slate-600 font-bold text-xs flex items-center justify-center gap-1 hover:bg-slate-100 transition-colors border-t border-slate-200">
                                <PlusIcon className="h-5 w-5"/> Aggiungi Riga all'Ordine
                            </button>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <PaperClipIcon className="h-5 w-5 text-indigo-500"/> 3. Documenti Allegati (Es. Planimetrie, Computi Excel)
                        </h3>
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                                <ArrowUpTrayIcon className="h-8 w-8 text-slate-400 mb-2" />
                                <p className="text-sm text-slate-600 font-bold">Clicca o trascina per allegare file</p>
                                <p className="text-xs text-slate-400 mt-1">PDF, Excel, Word, Immagini</p>
                            </div>
                            <input type="file" className="hidden" multiple onChange={handleFileChange} />
                        </label>
                        
                        {files.length > 0 && (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {files.map((f, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                        <span className="text-xs font-bold text-indigo-800 flex items-center gap-2 truncate pr-4">
                                            <PaperClipIcon className="h-4 w-4 shrink-0"/> {f.name}
                                        </span>
                                        <button type="button" onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-600 shrink-0">
                                            <TrashIcon className="h-4 w-4"/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2"><UsersIcon className="h-5 w-5 text-indigo-500"/> 4. Aziende da Invitare alla Gara</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm h-72 flex flex-col">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center justify-between">
                                    Dal tuo Albo Aziendale
                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{listaFornitoriFiltrata.length} Disponibili</span>
                                </p>
                                <p className="text-xs text-slate-400 mb-3">La lista è filtrata automaticamente in base alla tipologia richiesta.</p>
                                
                                <div className="overflow-y-auto pr-2 space-y-2 flex-1">
                                    {listaFornitoriFiltrata.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic text-center mt-8">Nessuna ditta presente in questa categoria.</p>
                                    ) : listaFornitoriFiltrata.map(f => (
                                        <label key={f.id} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${formData.fornitoriSelezionati.includes(f.id) ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                                            <input type="checkbox" checked={formData.fornitoriSelezionati.includes(f.id)} onChange={() => toggleFornitore(f.id)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                                            <div>
                                                <span className={`text-sm font-bold block ${formData.fornitoriSelezionati.includes(f.id) ? 'text-indigo-900' : 'text-slate-700'}`}>{f.ragioneSociale}</span>
                                                {f.categoria && <span className="text-[10px] text-slate-500">{f.categoria}</span>}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm h-72 flex flex-col">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Aziende Esterne (Non a sistema)</p>
                                <div className="flex gap-2 mb-4">
                                    <input type="email" value={nuovaEmail} onChange={e => setNuovaEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddEmail())} placeholder="Digita l'email e premi invio..." className="flex-1 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                                    <button type="button" onClick={handleAddEmail} className="bg-slate-800 text-white px-4 rounded-lg text-sm font-bold hover:bg-black transition-colors">Aggiungi</button>
                                </div>
                                <div className="space-y-2 overflow-y-auto flex-1">
                                    {formData.emailEsterne.length === 0 && !nuovaEmail ? <p className="text-xs text-slate-400 italic text-center mt-8">Nessuna email esterna inserita.</p> : formData.emailEsterne.map((email, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-2 bg-white border border-slate-200 rounded-lg">
                                            <span className="text-sm font-medium text-slate-700 flex items-center gap-2"><EnvelopeIcon className="h-4 w-4 text-slate-400"/> {email}</span>
                                            <button type="button" onClick={() => removeEmail(email)} className="text-red-400 hover:text-red-600 p-1"><TrashIcon className="h-4 w-4"/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2"><EnvelopeIcon className="h-5 w-5 text-indigo-500"/> 5. Come vuoi ricevere i preventivi?</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div onClick={() => setFormData({...formData, metodoInvio: 'link_smart'})} className={`p-5 rounded-xl border-2 cursor-pointer transition-all relative ${formData.metodoInvio === 'link_smart' ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                {formData.metodoInvio === 'link_smart' && <CheckCircleIcon className="absolute top-4 right-4 h-6 w-6 text-indigo-600"/>}
                                <div className="bg-indigo-100 w-12 h-12 rounded-full flex justify-center items-center mb-3"><LinkIcon className="h-6 w-6 text-indigo-600"/></div>
                                <h4 className="font-bold text-slate-900 text-lg">Portale Smart (Consigliato)</h4>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">Il fornitore riceve un link sicuro, apre una pagina web e digita i prezzi direttamente a sistema. Tu vedi la tabella comparativa compilarsi in tempo reale.</p>
                            </div>
                            <div onClick={() => setFormData({...formData, metodoInvio: 'email_classica'})} className={`p-5 rounded-xl border-2 cursor-pointer transition-all relative ${formData.metodoInvio === 'email_classica' ? 'border-slate-800 bg-slate-50 shadow-md ring-2 ring-slate-200' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                {formData.metodoInvio === 'email_classica' && <CheckCircleIcon className="absolute top-4 right-4 h-6 w-6 text-slate-800"/>}
                                <div className="bg-slate-200 w-12 h-12 rounded-full flex justify-center items-center mb-3"><EnvelopeIcon className="h-6 w-6 text-slate-700"/></div>
                                <h4 className="font-bold text-slate-900 text-lg">Email Classica con PDF / Excel</h4>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">Il fornitore riceve una normale email con la lista e i file allegati. Quando ti risponderà con il suo preventivo, sarai tu a digitare i suoi prezzi nel gestionale.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-4">
                    <p className="text-xs text-slate-500 font-medium mr-auto">Destinatari totali: <span className="font-bold text-indigo-600">{formData.fornitoriSelezionati.length + formData.emailEsterne.length + (nuovaEmail ? 1 : 0)}</span></p>
                    <button type="submit" disabled={isLoading} className="px-8 py-3.5 bg-indigo-600 text-white font-black rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2">
                        {isLoading ? 'Invio in corso...' : 'Invia Richieste di Offerta'}
                    </button>
                </div>
            </form>
        </div>
    );
};