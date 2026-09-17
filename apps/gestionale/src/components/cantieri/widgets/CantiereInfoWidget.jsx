import React, { useState, useMemo } from 'react';
import { 
    PencilIcon, CheckIcon, XMarkIcon, CalendarDaysIcon, 
    ClockIcon, FlagIcon, UserIcon, DocumentTextIcon, PaperClipIcon
} from '@heroicons/react/24/outline';

const formatDisplayDate = (dateVal) => {
    if (!dateVal) return 'Non impostata';
    let d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
    if (isNaN(d)) return 'Non impostata';
    return d.toLocaleDateString('it-IT');
};

const formatInputDate = (dateVal) => {
    if (!dateVal) return '';
    let d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
    if (isNaN(d)) return '';
    return d.toISOString().split('T')[0];
};

export const CantiereInfoWidget = ({ cantiere, onUpdate, user, offertaCollegata, users = [] }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({});

    const tuttiDocumentiEreditati = useMemo(() => {
        if (!offertaCollegata) return [];
        const docsGara = offertaCollegata.datiAnalisi?.documentiGara || [];
        const docCME = offertaCollegata.datiAnalisi?.docCME || [];
        const docCMECompilato = offertaCollegata.datiElaborazione?.docCMECompilatoFiles || [];
        return [
            ...docsGara.map(d => ({ ...d, labelTag: d.categoria ? `Gara: ${d.categoria}` : 'Gara' })), 
            ...docCME.map(d => ({ ...d, labelTag: 'CME Originale' })), 
            ...docCMECompilato.map(d => ({ ...d, labelTag: 'CME Compilato' }))
        ].filter(d => d.url); 
    }, [offertaCollegata]);

    const handleEdit = () => {
        setFormData({ 
            nomeCantiere: cantiere.nomeCantiere || cantiere.nome || '', 
            cliente: cantiere.cliente || cantiere.nomeCliente || '', 
            tipologiaCantiere: cantiere.tipologiaCantiere || cantiere.tipologia || '', 
            stato: cantiere.stato || 'attivo', 
            indirizzo: cantiere.indirizzo || '', 
            note: cantiere.note || cantiere.descrizione || '', 
            valoreAppalto: Number(cantiere.valoreAppalto || 0), 
            budgetCosti: Number(cantiere.budgetCosti || 0), 
            dataPresuntaInizio: formatInputDate(cantiere.dataPresuntaInizio || cantiere.dataInizioLavori || cantiere.dataInizio), 
            durataGiorniPrevisti: cantiere.durataGiorniPrevisti || 0, 
            dataFinePresunta: formatInputDate(cantiere.dataFinePresunta || cantiere.dataTeoricaFine),
            tecnicoAssegnatoId: cantiere.tecnicoAssegnatoId || ''
        });
        setIsEditing(true);
    };

    const handleDateOrDurationChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            if (name === 'dataPresuntaInizio' || name === 'durataGiorniPrevisti') {
                if (newData.dataPresuntaInizio && newData.durataGiorniPrevisti && newData.durataGiorniPrevisti > 0) {
                    let d = new Date(newData.dataPresuntaInizio); d.setDate(d.getDate() + parseInt(newData.durataGiorniPrevisti)); newData.dataFinePresunta = d.toISOString().split('T')[0];
                }
            }
            return newData;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        const dataToSave = { ...formData };
        if (dataToSave.dataPresuntaInizio) { const dStart = new Date(dataToSave.dataPresuntaInizio); dataToSave.dataPresuntaInizio = dStart; dataToSave.dataInizio = dStart; dataToSave.dataInizioLavori = dStart; }
        if (dataToSave.dataFinePresunta) { const dEnd = new Date(dataToSave.dataFinePresunta); dataToSave.dataFinePresunta = dEnd; dataToSave.dataTeoricaFine = dEnd; }
        dataToSave.durataGiorniPrevisti = parseInt(dataToSave.durataGiorniPrevisti) || 0;
        await onUpdate(dataToSave); 
        setIsSaving(false); 
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
                <div className="bg-white rounded-xl shadow-sm border border-indigo-200 p-6 relative">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                        <h3 className="text-lg font-bold text-indigo-800">Modifica Dati Cantiere</h3>
                        <div className="flex gap-2">
                            <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 flex items-center gap-1 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"><XMarkIcon className="h-4 w-4" /> Annulla</button>
                            <button onClick={handleSave} disabled={isSaving} className="px-3 py-1.5 flex items-center gap-1 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"><CheckIcon className="h-4 w-4" /> {isSaving ? 'Salvataggio...' : 'Salva'}</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Cantiere</label><input type="text" name="nomeCantiere" value={formData.nomeCantiere} onChange={handleDateOrDurationChange} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-gray-50" /></div>
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente</label><input type="text" name="cliente" value={formData.cliente} onChange={handleDateOrDurationChange} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-gray-50" /></div>
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipologia</label><input type="text" name="tipologiaCantiere" value={formData.tipologiaCantiere} onChange={handleDateOrDurationChange} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-gray-50" /></div>
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stato Lavori</label><select name="stato" value={formData.stato} onChange={handleDateOrDurationChange} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-gray-50"><option value="attivo">Attivo</option><option value="chiuso">Chiuso / Completato</option><option value="sospeso">Sospeso</option></select></div>
                            <div>
                                <label className="block text-xs font-bold text-indigo-600 uppercase mb-1 flex items-center gap-1"><UserIcon className="h-4 w-4" /> Tecnico / PM Assegnato</label>
                                <select 
                                    name="tecnicoAssegnatoId" 
                                    value={formData.tecnicoAssegnatoId} 
                                    onChange={handleDateOrDurationChange} 
                                    className="w-full border border-indigo-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-indigo-800"
                                >
                                    <option value="">-- Nessun Tecnico Assegnato --</option>
                                    {users.filter(u => u.attivo !== false).map(u => (
                                        <option key={u.id} value={u.id}>{u.nome} {u.cognome} ({u.ruolo})</option>
                                    ))}
                                </select>
                            </div>

                        </div>
                        <div className="md:col-span-3 bg-indigo-50 p-4 rounded-xl border border-indigo-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div><label className="block text-xs font-bold text-indigo-800 uppercase mb-1 flex items-center gap-1"><CalendarDaysIcon className="h-3 w-3"/> Data Inizio</label><input type="date" name="dataPresuntaInizio" value={formData.dataPresuntaInizio} onChange={handleDateOrDurationChange} className="w-full border border-indigo-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white" /></div>
                            <div><label className="block text-xs font-bold text-indigo-800 uppercase mb-1 flex items-center gap-1"><ClockIcon className="h-3 w-3"/> Durata Lavori (Giorni)</label><input type="number" name="durataGiorniPrevisti" value={formData.durataGiorniPrevisti} onChange={handleDateOrDurationChange} className="w-full border border-indigo-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white font-bold" min="0" /></div>
                            <div><label className="block text-xs font-bold text-indigo-800 uppercase mb-1 flex items-center gap-1"><FlagIcon className="h-3 w-3"/> Fine Teorica</label><input type="date" name="dataFinePresunta" value={formData.dataFinePresunta} onChange={handleDateOrDurationChange} className="w-full border border-indigo-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white" /></div>
                        </div>
                        <div className="md:col-span-3"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Indirizzo / Luogo</label><input type="text" name="indirizzo" value={formData.indirizzo} onChange={handleDateOrDurationChange} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50" /></div>
                        <div className="md:col-span-3"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Note e Descrizione</label><textarea name="note" value={formData.note} onChange={handleDateOrDurationChange} rows="2" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50"></textarea></div>
                        <div className="md:col-span-1"><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Valore Appalto / Contratto (€)</label><input type="number" name="valoreAppalto" value={formData.valoreAppalto} onChange={handleDateOrDurationChange} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" /></div>
                        <div className="md:col-span-1"><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Budget Costi Previsto (€)</label><input type="number" name="budgetCosti" value={formData.budgetCosti} onChange={handleDateOrDurationChange} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" /></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative">
                <button onClick={handleEdit} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors group"><PencilIcon className="h-5 w-5 group-hover:scale-110 transition-transform" /></button>
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2 pr-10">Dettagli Generali</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Nome Cantiere</p><p className="font-medium text-gray-800 mt-1">{cantiere.nomeCantiere || cantiere.nome || 'N/A'}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Cliente</p><p className="font-medium text-gray-800 mt-1">{cantiere.cliente || cantiere.nomeCliente || 'N/A'}</p></div>
                    
                    <div className="md:col-span-2">
                        <p className="text-xs text-indigo-500 uppercase font-bold tracking-wider flex items-center gap-1"><UserIcon className="h-4 w-4" /> Tecnico / PM Assegnato</p>
                        <p className="font-black text-indigo-700 mt-1 text-lg">
                            {cantiere.tecnicoAssegnatoId 
                                ? (() => {
                                    const t = users.find(u => u.id === cantiere.tecnicoAssegnatoId);
                                    return t ? `${t.nome} ${t.cognome}` : 'Tecnico non trovato';
                                })()
                                : '⚠️ Nessun tecnico assegnato'}
                        </p>
                    </div>

                    <div className="md:col-span-2 flex flex-wrap gap-4 mt-2 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
                        <div className="flex-1 min-w-[150px]"><p className="text-xs text-indigo-600 uppercase font-bold tracking-wider flex items-center gap-1"><CalendarDaysIcon className="h-3.5 w-3.5" /> Inizio Lavori</p><p className="text-sm font-bold text-indigo-900 mt-1">{formatDisplayDate(cantiere.dataPresuntaInizio || cantiere.dataInizio)}</p></div>
                        <div className="flex-1 min-w-[100px] border-l border-indigo-200 pl-4"><p className="text-xs text-indigo-600 uppercase font-bold tracking-wider flex items-center gap-1"><ClockIcon className="h-3.5 w-3.5" /> Durata Lavori</p><p className="text-sm font-bold text-indigo-900 mt-1">{cantiere.durataGiorniPrevisti || 0} Giorni</p></div>
                        <div className="flex-1 min-w-[150px] border-l border-indigo-200 pl-4"><p className="text-xs text-rose-600 uppercase font-bold tracking-wider flex items-center gap-1"><FlagIcon className="h-3.5 w-3.5" /> Fine Teorica</p><p className="text-sm font-bold text-rose-700 mt-1">{formatDisplayDate(cantiere.dataFinePresunta || cantiere.dataTeoricaFine)}</p></div>
                    </div>
                    <div><p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Stato Lavori</p><div className="mt-1"><span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${cantiere.stato === 'attivo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{cantiere.stato || 'Attivo'}</span></div></div>
                    <div className="md:col-span-2"><p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Indirizzo / Luogo</p><p className="font-medium text-gray-800 mt-1">{cantiere.indirizzo || 'Nessun indirizzo specificato'}</p></div>
                </div>
                {cantiere.lastModifiedBy && (
                    <div className="mt-8 pt-4 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
                        <span>Ultima modifica: <strong className="text-gray-600">{cantiere.lastModifiedString}</strong></span>
                        <span>Operatore: <strong className="text-gray-600">{cantiere.lastModifiedBy}</strong></span>
                    </div>
                )}
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Dati Economici di Progetto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100"><p className="text-xs text-indigo-800 uppercase font-bold tracking-wider">Valore Appalto / Contratto</p><p className="text-xl font-bold text-indigo-600 mt-1">€ {Number(cantiere.valoreAppalto || 0).toLocaleString()}</p></div>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-100"><p className="text-xs text-red-800 uppercase font-bold tracking-wider">Budget Costi Previsto</p><p className="text-xl font-bold text-red-600 mt-1">€ {Number(cantiere.budgetCosti || 0).toLocaleString()}</p></div>
                </div>
            </div>
            {offertaCollegata && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2 flex items-center gap-2"><DocumentTextIcon className="h-5 w-5 text-indigo-600" />Documentazione Ereditata</h3>
                    {tuttiDocumentiEreditati.length > 0 ? (
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {tuttiDocumentiEreditati.map((doc, idx) => (
                                <li key={idx} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg hover:bg-gray-100 transition-colors"><div className="flex items-center gap-3 overflow-hidden"><PaperClipIcon className="h-5 w-5 text-indigo-500 shrink-0" /><div className="truncate"><p className="text-sm font-medium text-gray-800 truncate" title={doc.name}>{doc.name}</p><p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{doc.labelTag}</p></div></div><a href={doc.url} target="_blank" rel="noopener noreferrer" className="ml-4 px-3 py-1.5 bg-white text-indigo-600 text-xs font-bold rounded-md shadow-sm border border-gray-200 hover:bg-indigo-50 transition-colors shrink-0">Apri</a></li>
                            ))}
                        </ul>
                    ) : ( <p className="text-sm text-gray-500 italic">Nessun documento trovato.</p> )}
                </div>
            )}
        </div>
    );
};