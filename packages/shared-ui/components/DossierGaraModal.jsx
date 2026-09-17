import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { XMarkIcon, DocumentDuplicateIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export const DossierGaraModal = ({ isOpen, onClose, users }) => {
    // STATI
    const [selectedUsers, setSelectedUsers] = useState([]); // Array di ID utente selezionati
    const [excludedDocs, setExcludedDocs] = useState([]);   // Array di URL dei documenti DESELEZIONATI manualmente
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressStatus, setProgressStatus] = useState('');

    if (!isOpen) return null;

    // Recupera la lista documenti di un utente
    const getDocumentList = (user) => {
        return user.documenti && Array.isArray(user.documenti) ? user.documenti : [];
    };

    // Gestione Selezione Utente (Checkbox Principale)
    const toggleUser = (user) => {
        const userId = user.id;
        const docs = getDocumentList(user);
        
        if (selectedUsers.includes(userId)) {
            // Deseleziona utente
            setSelectedUsers(prev => prev.filter(id => id !== userId));
        } else {
            // Seleziona utente
            setSelectedUsers(prev => [...prev, userId]);
            // Quando seleziono l'utente, mi assicuro che tutti i suoi documenti tornino selezionati di default
            // (rimuovendoli dalla lista degli "esclusi")
            const docUrls = docs.map(d => d.url);
            setExcludedDocs(prev => prev.filter(url => !docUrls.includes(url)));
        }
    };

    // Gestione Selezione Singolo Documento (Checkbox Figlio)
    const toggleDoc = (docUrl) => {
        if (excludedDocs.includes(docUrl)) {
            // Era escluso, lo rimetto
            setExcludedDocs(prev => prev.filter(url => url !== docUrl));
        } else {
            // Era selezionato, lo escludo
            setExcludedDocs(prev => [...prev, docUrl]);
        }
    };

    // IL MOTORE DI UNIONE PDF
    const generateDossier = async () => {
        setIsGenerating(true);
        setProgressStatus('Inizializzazione documento...');

        try {
            const mergedPdf = await PDFDocument.create();
            const usersToProcess = users.filter(u => selectedUsers.includes(u.id));

            for (let i = 0; i < usersToProcess.length; i++) {
                const user = usersToProcess[i];
                
                // Filtra solo i documenti che NON sono stati esclusi manualmente
                const userDocs = getDocumentList(user).filter(doc => !excludedDocs.includes(doc.url));

                for (let j = 0; j < userDocs.length; j++) {
                    const doc = userDocs[j];
                    setProgressStatus(`Elaborazione ${user.nome} ${user.cognome} (${j + 1}/${userDocs.length})...`);

                    try {
                        const fetchResponse = await fetch(doc.url);
                        const arrayBuffer = await fetchResponse.arrayBuffer();
                        const lowerName = doc.nome.toLowerCase();

                        if (lowerName.endsWith('.pdf')) {
                            const pdfDoc = await PDFDocument.load(arrayBuffer);
                            const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                            copiedPages.forEach(page => mergedPdf.addPage(page));
                        } else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png')) {
                            let image;
                            if (lowerName.endsWith('.png')) {
                                image = await mergedPdf.embedPng(arrayBuffer);
                            } else {
                                image = await mergedPdf.embedJpg(arrayBuffer);
                            }
                            const page = mergedPdf.addPage([595.28, 841.89]); // Dimensioni foglio A4
                            const { width, height } = image.scaleToFit(500, 750); 
                            page.drawImage(image, {
                                x: page.getWidth() / 2 - width / 2,
                                y: page.getHeight() / 2 - height / 2,
                                width,
                                height,
                            });
                        }
                    } catch (err) {
                        console.error(`Errore nel caricamento del documento ${doc.nome}:`, err);
                    }
                }
            }

            setProgressStatus('Salvataggio del file unificato in corso...');
            const pdfBytes = await mergedPdf.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Dossier_Gara_Allegati_${new Date().toISOString().split('T')[0]}.pdf`;
            link.click();

            setProgressStatus('Dossier completato!');
            setTimeout(() => {
                setIsGenerating(false);
                onClose();
            }, 1500);

        } catch (error) {
            console.error("Errore critico durante l'unione:", error);
            alert("Si è verificato un errore durante la generazione del Dossier.");
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* HEADER */}
                <div className="flex justify-between items-center p-5 border-b bg-indigo-50">
                    <div>
                        <h3 className="font-bold text-indigo-900 text-lg flex items-center gap-2">
                            <DocumentDuplicateIcon className="h-6 w-6"/> Generatore Dossier Gara
                        </h3>
                        <p className="text-sm font-semibold text-indigo-700">Seleziona il personale e gli attestati da includere</p>
                    </div>
                    <button onClick={onClose} disabled={isGenerating} className="p-2 bg-white rounded-full text-gray-500 hover:text-red-500 shadow-sm disabled:opacity-50">
                        <XMarkIcon className="h-5 w-5"/>
                    </button>
                </div>

                {/* CORPO - LISTA DIPENDENTI E DOCUMENTI */}
                <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                    {isGenerating ? (
                        <div className="flex flex-col items-center justify-center h-full py-10">
                            <ArrowPathIcon className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
                            <p className="text-lg font-bold text-indigo-900">Generazione PDF in corso...</p>
                            <p className="text-sm text-gray-500 mt-2">{progressStatus}</p>
                            <p className="text-xs text-orange-500 mt-4 font-bold text-center">Non chiudere questa finestra.<br/>L'operazione potrebbe richiedere alcuni secondi a seconda del numero di file.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {users.map(u => {
                                const docs = getDocumentList(u);
                                const hasDocs = docs.length > 0;
                                const isSelected = selectedUsers.includes(u.id);

                                return (
                                    <div key={u.id} className={`flex flex-col bg-white border rounded-xl overflow-hidden transition-all shadow-sm ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-indigo-300'} ${!hasDocs ? 'opacity-60 bg-gray-50' : ''}`}>
                                        
                                        {/* RIGA DIPENDENTE (Cliccabile) */}
                                        <label className={`flex items-center justify-between p-4 ${hasDocs ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 disabled:opacity-50"
                                                    checked={isSelected}
                                                    disabled={!hasDocs}
                                                    onChange={() => toggleUser(u)}
                                                />
                                                <div>
                                                    <p className="font-bold text-gray-800">{u.nome} {u.cognome}</p>
                                                    <p className="text-[10px] text-gray-500 uppercase">{u.ruolo}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${hasDocs ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                                    {docs.length} Allegati
                                                </span>
                                            </div>
                                        </label>

                                        {/* SOTTO-LISTA DOCUMENTI (Visibile solo se dipendente selezionato) */}
                                        {isSelected && hasDocs && (
                                            <div className="bg-indigo-50/30 border-t border-indigo-100 p-3 space-y-1">
                                                <p className="text-[11px] font-bold text-indigo-800 ml-10 mb-2 uppercase tracking-wide">
                                                    Scegli i documenti da includere:
                                                </p>
                                                {docs.map((doc, idx) => {
                                                    // È selezionato se NON è nell'array degli esclusi
                                                    const isDocSelected = !excludedDocs.includes(doc.url);
                                                    
                                                    return (
                                                        <label key={idx} className="flex items-center gap-3 ml-10 p-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors group">
                                                            <input 
                                                                type="checkbox" 
                                                                className="w-4 h-4 text-indigo-500 rounded border-indigo-200 focus:ring-indigo-500"
                                                                checked={isDocSelected}
                                                                onChange={() => toggleDoc(doc.url)}
                                                            />
                                                            <span className={`text-xs ${isDocSelected ? 'text-gray-700 font-medium group-hover:text-indigo-700' : 'text-gray-400 line-through'}`}>
                                                                {doc.nome}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* FOOTER - TASTO GENERA */}
                {!isGenerating && (
                    <div className="p-4 border-t bg-white flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-600">Dipendenti selezionati: {selectedUsers.length}</span>
                        <button 
                            onClick={generateDossier}
                            disabled={selectedUsers.length === 0}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-colors"
                        >
                            <DocumentDuplicateIcon className="h-5 w-5"/> Genera PDF Unico
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};