// packages/shared-ui/forms/AnalisiPreliminareForm.jsx

import React, { useState, useMemo } from 'react';
import { 
    DocumentTextIcon, UserIcon, MapPinIcon, 
    ChatBubbleBottomCenterTextIcon, PlusCircleIcon,
    CheckIcon, PaperClipIcon, ArrowUpTrayIcon, ClipboardDocumentCheckIcon,
    CalendarDaysIcon, ClockIcon
} from '@heroicons/react/24/outline';
import { FileUploadZone } from '../components/FileUploadZone';

export const AnalisiPreliminareForm = ({ 
    datiIniziali, clienteSelezionato, personnel = [], 
    onSubmit, onAddReferente, isSaving 
}) => {
    const [formData, setFormData] = useState({
        descrizioneRichiesta: datiIniziali?.datiAnalisi?.descrizioneRichiesta || '',
        valoreEconomico: datiIniziali?.datiAnalisi?.valoreEconomico || '', 
        
        // ✅ NUOVI CAMPI TEMPORALI
        scadenzaOfferta: datiIniziali?.datiAnalisi?.scadenzaOfferta || '',
        tipoInizioLavori: datiIniziali?.datiAnalisi?.tipoInizioLavori || 'data_esatta', // 'data_esatta' o 'giorni_da_vittoria'
        dataInizioLavori: datiIniziali?.datiAnalisi?.dataInizioLavori || '',
        giorniInizioLavori: datiIniziali?.datiAnalisi?.giorniInizioLavori || 30,

        referenteSelezionato: datiIniziali?.datiAnalisi?.referenteSelezionato || '',
        necessitaSopralluogo: datiIniziali?.datiAnalisi?.necessitaSopralluogo || false,
        dataSopralluogo: datiIniziali?.datiAnalisi?.dataSopralluogo || '',
        oraSopralluogo: datiIniziali?.datiAnalisi?.oraSopralluogo || '09:00', 
        assegnatarioSopralluogo: datiIniziali?.datiAnalisi?.assegnatarioSopralluogo || '',
        noteInterne: datiIniziali?.datiAnalisi?.noteInterne || '',
        documentiRichiesti: datiIniziali?.datiAnalisi?.documentiRichiesti || [] 
    });

    const [customDoc, setCustomDoc] = useState(''); 

    const categorieDocumenti = [
        { id: 'bando', label: "Bando / Lettera d'Invito" },
        { id: 'disciplinare', label: "Disciplinare di Gara" },
        { id: 'capitolato', label: "Capitolato Tecnico / Speciale" },
        { id: 'planimetrie', label: "Planimetrie / Elaborati Grafici" },
        { id: 'economici', label: "Documenti Economici / Computi" },
        { id: 'altro', label: "Altri Documenti / Richieste" }
    ];

    const documentiStandard = [
        "DGUE (Documento di Gara Unico Europeo)",
        "DURC (Documento Unico Regolarità Contributiva)",
        "Visura Camerale",
        "Documento Identità (C.I.) Titolare",
        "Certificazione SOA",
        "Certificazioni ISO (9001, 14001, 45001...)",
        "PassOE",
        "Garanzia Provvisoria (Fideiussione)",
        "Ricevuta Pagamento Contributo ANAC",
        "Patto di Integrità",
        "Dichiarazioni Sostitutive (Art. 80)",
        "Offerta Tecnica",
        "Offerta Economica"
    ];

    const checklistCompleta = useMemo(() => {
        const list = [...documentiStandard];
        (formData.documentiRichiesti || []).forEach(doc => {
            if (!list.includes(doc)) list.push(doc);
        });
        return list;
    }, [formData.documentiRichiesti]);

    const [documentiGaraFiles, setDocumentiGaraFiles] = useState({
        bando: [], disciplinare: [], capitolato: [], planimetrie: [], economici: [], altro: []
    });

    const handleCategoryFiles = (categoriaId, files) => { setDocumentiGaraFiles(prev => ({ ...prev, [categoriaId]: files })); };
    const documentiEsistenti = datiIniziali?.datiAnalisi?.documentiGara || [];
    const [isAddingReferente, setIsAddingReferente] = useState(false);
    const [nuovoReferente, setNuovoReferente] = useState({ nome: '', cognome: '', email: '', telefono: '' });

    const referentiDisponibili = [];
    if (clienteSelezionato?.referente?.nome) {
        referentiDisponibili.push({ id: 'principale', nome: `${clienteSelezionato.referente.nome} ${clienteSelezionato.referente.cognome}`, label: `Principale - ${clienteSelezionato.referente.nome} ${clienteSelezionato.referente.cognome}` });
    }
    if (clienteSelezionato?.referenti && Array.isArray(clienteSelezionato.referenti)) {
        clienteSelezionato.referenti.forEach((r, idx) => {
            referentiDisponibili.push({ id: `extra_${idx}`, nome: `${r.nome} ${r.cognome}`, label: `${r.nome} ${r.cognome} ${r.context ? `(${r.context})` : ''}` });
        });
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleDocToggle = (docName) => {
        setFormData(prev => {
            const list = prev.documentiRichiesti || [];
            if (list.includes(docName)) return { ...prev, documentiRichiesti: list.filter(d => d !== docName) };
            return { ...prev, documentiRichiesti: [...list, docName] };
        });
    };

    const handleAddCustomDoc = () => {
        if (customDoc.trim()) {
            handleDocToggle(customDoc.trim());
            setCustomDoc('');
        }
    };

    const handleSalva = async (e) => {
        e.preventDefault();
        
        let referenteFinale = formData.referenteSelezionato;
        if (isAddingReferente && nuovoReferente.nome) {
            const refString = `${nuovoReferente.nome} ${nuovoReferente.cognome}`;
            await onAddReferente(nuovoReferente);
            referenteFinale = refString;
        }

        const flatFilesList = [];
        Object.entries(documentiGaraFiles).forEach(([categoria, files]) => {
            files.forEach(file => { file.categoria = categoria; flatFilesList.push(file); });
        });

        onSubmit({
            ...formData,
            referenteSelezionato: referenteFinale,
            documentiGaraFiles: flatFilesList 
        });
    };

    return (
        <form onSubmit={handleSalva} className="space-y-10 animate-fade-in">
            <div className="border-b border-slate-200 pb-4 mb-6">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Fase 1: Analisi Preliminare</h2>
                <p className="text-sm text-slate-500 font-medium">Inquadra la richiesta, allega i documenti del bando e spunta la lista dei documenti che serviranno per partecipare.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-8">
                    
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">
                        <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <DocumentTextIcon className="h-4 w-4"/> Dettagli Richiesta e Tempistiche
                        </h3>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1">Descrizione Lavori / Oggetto Gara</label>
                                <textarea 
                                    name="descrizioneRichiesta" value={formData.descrizioneRichiesta} onChange={handleChange} required rows="2"
                                    placeholder="Descrivi brevemente cosa richiede il cliente o l'oggetto dell'appalto..."
                                    className="w-full p-3 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none shadow-sm bg-white"
                                ></textarea>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1">Importo a Base / Stimato (€)</label>
                                    <div className="relative">
                                        <input 
                                            type="number" step="0.01" name="valoreEconomico" value={formData.valoreEconomico} onChange={handleChange} placeholder="0.00"
                                            className="w-full pl-8 p-3 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm bg-white"
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1 mb-1 flex items-center gap-1"><CalendarDaysIcon className="h-3 w-3"/> Scadenza Offerta</label>
                                    <input 
                                        type="date" name="scadenzaOfferta" value={formData.scadenzaOfferta} onChange={handleChange} 
                                        className="w-full p-3 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm bg-white"
                                    />
                                </div>
                            </div>

                            {/* ✅ NUOVO BLOCCO: PIANIFICAZIONE CANTIERE */}
                            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                                <label className="block text-[10px] font-black text-indigo-800 uppercase tracking-widest mb-3 flex items-center gap-1">
                                    <ClockIcon className="h-4 w-4"/> Previsione Inizio Lavori (Per Cantiere)
                                </label>
                                <div className="flex flex-col sm:flex-row gap-4 mb-3">
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                                        <input type="radio" name="tipoInizioLavori" value="data_esatta" checked={formData.tipoInizioLavori === 'data_esatta'} onChange={handleChange} className="text-indigo-600 focus:ring-indigo-500" /> 
                                        Data Specifica
                                    </label>
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                                        <input type="radio" name="tipoInizioLavori" value="giorni_da_vittoria" checked={formData.tipoInizioLavori === 'giorni_da_vittoria'} onChange={handleChange} className="text-indigo-600 focus:ring-indigo-500" /> 
                                        Dinamica (Dopo accettazione)
                                    </label>
                                </div>
                                
                                {formData.tipoInizioLavori === 'data_esatta' ? (
                                    <input type="date" name="dataInizioLavori" value={formData.dataInizioLavori} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                ) : (
                                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                        <span className="text-xs font-bold text-slate-600">Avvio cantiere</span>
                                        <input type="number" name="giorniInizioLavori" value={formData.giorniInizioLavori} onChange={handleChange} className="w-20 p-2 border border-slate-300 rounded-md text-center text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" min="0" />
                                        <span className="text-xs font-bold text-slate-600">giorni dopo la firma.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <ArrowUpTrayIcon className="h-4 w-4"/> Documentazione Ricevuta (Bando)
                        </h3>
                        <p className="text-[11px] text-slate-500 mb-4 font-medium">Allega qui i documenti forniti dal cliente o scaricati dal portale.</p>
                        
                        <div className="space-y-4">
                            {categorieDocumenti.map(cat => (
                                <div key={cat.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <p className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-2">{cat.label}</p>
                                    <FileUploadZone onFilesSelected={(files) => handleCategoryFiles(cat.id, files)} isUploading={isSaving} />
                                    {documentiGaraFiles[cat.id]?.length > 0 && (
                                        <ul className="mt-2 text-[11px] font-medium text-blue-800 bg-blue-50/50 border border-blue-100 p-2 rounded-lg space-y-1">
                                            {documentiGaraFiles[cat.id].map((f, i) => (
                                                <li key={i} className="flex items-center gap-1.5"><PaperClipIcon className="h-3 w-3" /> {f.name}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>

                        {documentiEsistenti.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-slate-200">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Archivio Documenti Salvati</p>
                                <div className="space-y-4">
                                    {categorieDocumenti.map(cat => {
                                        const docsInCat = documentiEsistenti.filter(d => d.categoria === cat.id || (!d.categoria && cat.id === 'altro'));
                                        if (docsInCat.length === 0) return null;
                                        return (
                                            <div key={`saved_${cat.id}`}>
                                                <p className="text-[10px] font-bold text-slate-500 mb-1">{cat.label}</p>
                                                <ul className="space-y-1.5 text-sm font-medium text-slate-600">
                                                    {docsInCat.map((doc, idx) => (
                                                        <li key={idx}>
                                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-indigo-600 transition-colors">
                                                                <DocumentTextIcon className="h-4 w-4" /> {doc.name || `Allegato ${idx + 1}`}
                                                            </a>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-8">

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <ClipboardDocumentCheckIcon className="h-4 w-4"/> Checklist Documenti da Preparare
                        </h3>
                        <p className="text-[11px] text-slate-500 mb-4 font-medium">Spunta i documenti richiesti dal bando. Servirà come promemoria per il caricamento finale nella Fase 3.</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                            {checklistCompleta.map(doc => {
                                const isChecked = (formData.documentiRichiesti || []).includes(doc);
                                return (
                                    <label key={doc} className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer border transition-all group ${isChecked ? 'bg-indigo-50/80 border-indigo-200' : 'bg-slate-50 border-slate-100 hover:border-indigo-100'}`}>
                                        <input type="checkbox" checked={isChecked} onChange={() => handleDocToggle(doc)} className="mt-0.5 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer" />
                                        <span className={`text-xs font-bold transition-colors ${isChecked ? 'text-indigo-800' : 'text-slate-600 group-hover:text-indigo-600'}`}>{doc}</span>
                                    </label>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                            <input 
                                type="text" value={customDoc} onChange={(e) => setCustomDoc(e.target.value)}
                                placeholder="Altro documento specifico (es. Certificato X)..."
                                className="flex-1 p-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomDoc())}
                            />
                            <button type="button" onClick={handleAddCustomDoc} className="px-3 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors">Aggiungi</button>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-black text-orange-600 uppercase tracking-widest flex items-center gap-2"><UserIcon className="h-4 w-4"/> Interlocutore / Referente</h3>
                            <button type="button" onClick={() => setIsAddingReferente(!isAddingReferente)} className="text-[10px] font-bold bg-orange-50 text-orange-700 px-2 py-1 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors flex items-center gap-1">
                                {isAddingReferente ? 'ANNULLA' : <><PlusCircleIcon className="h-3 w-3"/> NUOVO CONTATTO</>}
                            </button>
                        </div>
                        {!isAddingReferente ? (
                            <select name="referenteSelezionato" value={formData.referenteSelezionato} onChange={handleChange} className="w-full p-3 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none shadow-sm bg-white">
                                <option value="">-- Seleziona Referente --</option>
                                {referentiDisponibili.map(ref => <option key={ref.id} value={ref.nome}>{ref.label}</option>)}
                            </select>
                        ) : (
                            <div className="space-y-3 bg-orange-50/50 p-4 rounded-xl border border-orange-100 animate-fade-in">
                                <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest border-b border-orange-200 pb-2 mb-2">Aggiungi nuovo contatto alla rubrica</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="text" placeholder="Nome" value={nuovoReferente.nome} onChange={(e) => setNuovoReferente({...nuovoReferente, nome: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" required />
                                    <input type="text" placeholder="Cognome" value={nuovoReferente.cognome} onChange={(e) => setNuovoReferente({...nuovoReferente, cognome: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" required />
                                    <input type="email" placeholder="Email" value={nuovoReferente.email} onChange={(e) => setNuovoReferente({...nuovoReferente, email: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                                    <input type="text" placeholder="Telefono" value={nuovoReferente.telefono} onChange={(e) => setNuovoReferente({...nuovoReferente, telefono: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={`p-5 rounded-2xl border transition-all duration-300 ${formData.necessitaSopralluogo ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex justify-between items-center mb-4 border-b border-slate-200/60 pb-3">
                            <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${formData.necessitaSopralluogo ? 'text-teal-700' : 'text-slate-500'}`}><MapPinIcon className="h-4 w-4"/> Necessario Sopralluogo Tecnico?</h3>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" name="necessitaSopralluogo" checked={formData.necessitaSopralluogo} onChange={handleChange} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                            </label>
                        </div>
                        {formData.necessitaSopralluogo ? (
                            <div className="space-y-4 animate-fade-in">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-[10px] font-black text-teal-800 uppercase tracking-widest ml-1 mb-1">Data Prevista</label><input type="date" name="dataSopralluogo" value={formData.dataSopralluogo} onChange={handleChange} required={formData.necessitaSopralluogo} className="w-full p-2.5 border border-teal-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none shadow-sm bg-white" /></div>
                                    <div><label className="block text-[10px] font-black text-teal-800 uppercase tracking-widest ml-1 mb-1">Ora Prevista</label><input type="time" name="oraSopralluogo" value={formData.oraSopralluogo} onChange={handleChange} required={formData.necessitaSopralluogo} className="w-full p-2.5 border border-teal-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none shadow-sm bg-white" /></div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-teal-800 uppercase tracking-widest ml-1 mb-1">Tecnico Incaricato</label>
                                    <select name="assegnatarioSopralluogo" value={formData.assegnatarioSopralluogo} onChange={handleChange} required={formData.necessitaSopralluogo} className="w-full p-2.5 border border-teal-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none shadow-sm bg-white">
                                        <option value="">-- Seleziona Tecnico --</option>
                                        {personnel.map(user => <option key={user.id} value={user.id}>{user.nome} {user.cognome}</option>)}
                                    </select>
                                </div>
                            </div>
                        ) : <p className="text-xs text-slate-500 font-medium italic py-2">Nessun sopralluogo richiesto. Si procederà direttamente all'elaborazione tecnica.</p>}
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2"><ChatBubbleBottomCenterTextIcon className="h-4 w-4"/> Note Interne</h3>
                        <textarea name="noteInterne" value={formData.noteInterne} onChange={handleChange} rows="2" placeholder="Annotazioni ad uso interno..." className="w-full p-3 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-500 outline-none resize-none shadow-sm bg-slate-50 hover:bg-white transition-colors"></textarea>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-200 mt-8">
                <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-10 py-3.5 bg-indigo-600 text-white font-black rounded-xl shadow-lg hover:bg-indigo-700 hover:shadow-indigo-200 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                    {isSaving ? 'Salvataggio in corso...' : <><CheckIcon className="h-5 w-5" /> Salva e Procedi all'Elaborazione</>}
                </button>
            </div>
        </form>
    );
};