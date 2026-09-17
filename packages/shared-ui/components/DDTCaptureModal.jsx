import React, { useState, useRef, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom'; 
import { 
    CameraIcon, XMarkIcon, CloudArrowUpIcon, DocumentTextIcon, 
    CubeIcon, WrenchScrewdriverIcon, CheckBadgeIcon, 
    ExclamationTriangleIcon, XCircleIcon, MapPinIcon 
} from '@heroicons/react/24/solid';

export const DDTCaptureModal = ({ 
    isOpen, 
    onClose, 
    cantieri = [], 
    ordini = [], 
    ddtList = [], 
    onSave, 
    isUploading,
    defaultOrdine = null
}) => {
    
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    
    // Stati del Form
    const [ordineId, setOrdineId] = useState('');
    const [cantiereId, setCantiereId] = useState('');
    const [numeroDDT, setNumeroDDT] = useState('');
    const [conformita, setConformita] = useState('conforme'); 
    const [note, setNote] = useState('');
    const [tipoOggetto, setTipoOggetto] = useState('materiale'); 
    
    const fileInputRef = useRef(null);

    // Auto-compilazione da defaultOrdine
    useEffect(() => {
        if (isOpen && defaultOrdine) {
            setOrdineId(defaultOrdine.id);
            setTipoOggetto(defaultOrdine.tipoOggetto === 'attrezzatura' ? 'attrezzatura' : 'materiale');
            if (defaultOrdine.cantiereId) {
                setCantiereId(defaultOrdine.cantiereId);
            }
        }
    }, [isOpen, defaultOrdine]);

    // Filtro Ordini
    const ordiniAttivi = useMemo(() => {
        if (!Array.isArray(ordini)) return [];
        const ordiniGiaEvasi = new Set(ddtList.filter(d => d.ordineId).map(d => d.ordineId));

        return ordini.filter(o => {
            if (defaultOrdine && o.id === defaultOrdine.id) return true;
            if (ordiniGiaEvasi.has(o.id)) return false;
            
            const stato = (o.stato || '').toLowerCase().trim();
            const statiChiusi = ['chiuso', 'archiviato', 'annullato', 'rifiutato', 'completato', 'consegnato'];
            if (statiChiusi.includes(stato)) return false;
            
            return true;
        });
    }, [ordini, ddtList, defaultOrdine]);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const handleOrdineChange = (e) => {
        const selectedId = e.target.value;
        setOrdineId(selectedId);
        
        if (selectedId) {
            const ord = ordiniAttivi.find(o => o.id === selectedId);
            if (ord && ord.cantiereId) {
                setCantiereId(ord.cantiereId);
            }
        }
    };

    const handleSubmit = () => {
        if (!file) return alert("Devi scattare una foto alla bolla.");
        if (tipoOggetto === 'materiale' && !cantiereId && !ordineId) return alert("Seleziona la destinazione o l'ordine di riferimento.");
        if (!numeroDDT) return alert("Inserisci il numero indicato sulla bolla.");
        
        const ordineSelezionato = ordiniAttivi.find(o => o.id === ordineId);
        const cantiereSelezionato = cantieri.find(c => c.id === cantiereId);
        
        let nomeDestinazione = 'N/D';

        if (tipoOggetto === 'materiale') {
            if (cantiereId === 'MAGAZZINO_SEDE') {
                nomeDestinazione = 'Magazzino Sede';
            } else if (cantiereSelezionato) {
                nomeDestinazione = cantiereSelezionato.nomeCantiere || cantiereSelezionato.cantiereNome || cantiereSelezionato.nome || cantiereSelezionato.titolo || 'Cantiere Sconosciuto';
            } else if (ordineSelezionato && ordineSelezionato.cantiereNome) {
                nomeDestinazione = ordineSelezionato.cantiereNome;
            } else {
                nomeDestinazione = 'Cantiere Sconosciuto';
            }
        } else {
            nomeDestinazione = 'Sede / Magazzino Asset';
        }

        onSave({
            tipoOggetto,
            cantiereId: tipoOggetto === 'materiale' ? cantiereId : 'MAGAZZINO_SEDE',
            nomeCantiere: nomeDestinazione,
            ordineId: ordineId || null,
            numeroOrdine: ordineSelezionato?.numeroOrdine || null,
            fornitoreId: ordineSelezionato?.fornitoreId || null,
            fornitoreNome: ordineSelezionato?.fornitoreNome || ordineSelezionato?.nomeFornitore || null,
            numeroDDT,
            conformita,
            note
        }, file);
    };

    const handleClose = () => {
        setFile(null);
        setPreview(null);
        setCantiereId('');
        setOrdineId('');
        setNumeroDDT('');
        setNote('');
        setConformita('conforme');
        onClose();
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-90 p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
                
                {/* HEADER */}
                <div className="p-4 bg-indigo-600 text-white flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <CameraIcon className="h-6 w-6" /> Registra Arrivo
                    </h2>
                    <button onClick={handleClose} disabled={isUploading} className="p-1 hover:bg-indigo-700 rounded-full transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    
                    {/* SCATTO FOTO */}
                    <div 
                        className="border-2 border-dashed border-indigo-200 rounded-2xl h-40 flex flex-col items-center justify-center bg-indigo-50/50 cursor-pointer relative overflow-hidden group"
                        onClick={() => !isUploading && fileInputRef.current.click()}
                    >
                        {preview ? (
                            <img src={preview} alt="Anteprima" className="absolute inset-0 w-full h-full object-contain bg-black" />
                        ) : (
                            <>
                                <CameraIcon className="h-10 w-10 text-indigo-400 group-hover:scale-110 transition-transform" />
                                <span className="text-sm text-indigo-700 mt-2 font-bold">Fotografa la Bolla (DDT)</span>
                            </>
                        )}
                        <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    </div>
                    
                    {preview && (
                        <button onClick={() => fileInputRef.current.click()} className="text-indigo-600 text-sm w-full text-center font-bold uppercase tracking-wider">
                            Scatta di nuovo
                        </button>
                    )}

                    {/* DATI BOLLA */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">N. Bolla indicato *</label>
                        <input type="text" value={numeroDDT} onChange={e => setNumeroDDT(e.target.value)} disabled={isUploading} placeholder="Es. 1245/A" className="w-full p-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 font-bold uppercase"/>
                    </div>

                    {/* BLOCCO ORDINE E DESTINAZIONE (Ora il <div> è chiuso correttamente) */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <label className="block text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                            <DocumentTextIcon className="h-5 w-5"/> Ordine di Acquisto in Arrivo
                        </label>
                        <select 
                            value={ordineId} 
                            onChange={handleOrdineChange} 
                            className="w-full p-3 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 font-medium"
                            disabled={isUploading || !!defaultOrdine}
                        >
                            <option value="">-- DDT generico / Nessun Ordine --</option>
                            {ordiniAttivi.map(o => {
                                const desc = o.righe && o.righe.length > 0 ? o.righe[0].descrizione : (o.descrizione || '');
                                const previewText = desc ? `| ${desc.substring(0, 20)}...` : '';
                                return (
                                    <option key={o.id} value={o.id}>
                                        {o.fornitoreNome || o.nomeFornitore} {previewText}
                                    </option>
                                );
                            })}
                        </select>
                        
                        <div className="mt-4 pt-4 border-t border-slate-200">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                <MapPinIcon className="h-4 w-4"/> Destinazione Scarico Merce
                            </label>
                            <select 
                                value={cantiereId} 
                                onChange={(e) => setCantiereId(e.target.value)} 
                                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-indigo-500"
                                disabled={isUploading}
                            >
                                <option value="">-- Seleziona Luogo --</option>
                                <option value="MAGAZZINO_SEDE">🏭 Magazzino Sede (Generale)</option>
                                <optgroup label="Cantieri Attivi">
                                    {cantieri.map(c => {
                                        const nomeVisibile = c.nomeCantiere || c.cantiereNome || c.nome || c.titolo || 'Cantiere Senza Nome';
                                        return (
                                            <option key={c.id} value={c.id}>{nomeVisibile}</option>
                                        )
                                    })}
                                </optgroup>
                                
                                {cantiereId && cantiereId !== 'MAGAZZINO_SEDE' && !cantieri.some(c => c.id === cantiereId) && (
                                    <optgroup label="Cantiere dell'Ordine">
                                        <option value={cantiereId}>{ordiniAttivi.find(o => o.id === ordineId)?.cantiereNome || 'Cantiere Archiviato'}</option>
                                    </optgroup>
                                )}
                            </select>
                        </div>
                    </div> {/* <-- ECCO IL DIV CHE MANCAVA! */}

                    {/* CONTROLLO QUALITÀ MERCE */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Stato della Merce *</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setConformita('conforme')} disabled={isUploading} className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${conformita === 'conforme' ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-100 text-gray-400 bg-gray-50'}`}>
                                <CheckBadgeIcon className="h-6 w-6"/> <span className="text-[10px] font-bold uppercase">Tutto Ok</span>
                            </button>
                            <button onClick={() => setConformita('parziale')} disabled={isUploading} className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${conformita === 'parziale' ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm' : 'border-gray-100 text-gray-400 bg-gray-50'}`}>
                                <ExclamationTriangleIcon className="h-6 w-6"/> <span className="text-[10px] font-bold uppercase text-center">Incompleta</span>
                            </button>
                            <button onClick={() => setConformita('danneggiato')} disabled={isUploading} className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${conformita === 'danneggiato' ? 'border-red-500 bg-red-50 text-red-700 shadow-sm' : 'border-gray-100 text-gray-400 bg-gray-50'}`}>
                                <XCircleIcon className="h-6 w-6"/> <span className="text-[10px] font-bold uppercase">Rotta</span>
                            </button>
                        </div>
                    </div>

                    {/* NOTE */}
                    {(conformita === 'parziale' || conformita === 'danneggiato') && (
                        <div className="animate-fade-in">
                            <label className="block text-xs font-bold text-red-500 mb-1">Dettagli Problema (Per la segreteria) *</label>
                            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} required className="w-full p-3 border-2 border-red-200 bg-red-50 rounded-xl text-sm focus:border-red-500 focus:ring-0" placeholder="Es. Mancano 2 tubi in PVC..." disabled={isUploading}/>
                        </div>
                    )}
                    {conformita === 'conforme' && (
                        <div>
                            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={1} className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-0" placeholder="Aggiungi una nota opzionale..." disabled={isUploading}/>
                        </div>
                    )}

                </div>

                {/* FOOTER */}
                <div className="p-4 border-t bg-white shrink-0">
                    <button onClick={handleSubmit} disabled={isUploading || !file || !numeroDDT} className={`w-full py-4 rounded-2xl text-white font-bold shadow-lg flex items-center justify-center gap-2 ${isUploading || !file || !numeroDDT ? 'bg-gray-300 shadow-none cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all'}`}>
                        {isUploading ? 'Trasferimento Dati...' : <><CloudArrowUpIcon className="h-6 w-6" /> Registra e Invia in Ufficio</>}
                    </button>
                </div>

            </div>
        </div>,
        document.body 
    );
};