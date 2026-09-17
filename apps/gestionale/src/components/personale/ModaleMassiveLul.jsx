import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { DocumentArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

const MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const ANNI = [2024, 2025, 2026, 2027, 2028];

export const ModaleMassiveLul = ({ isOpen, onClose, users, db, storage }) => {
    const [massiveLulLogs, setMassiveLulLogs] = useState([]);
    const [isProcessingMassive, setIsProcessingMassive] = useState(false);
    const [bpMese, setBpMese] = useState(MESI[new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1]);
    const [bpAnno, setBpAnno] = useState(new Date().getFullYear());

    if (!isOpen) return null;

    const handleMassiveLulUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsProcessingMassive(true);
        setMassiveLulLogs(["Inizio analisi del documento PDF..."]);

        try {
            const fileBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
            const numPages = pdf.numPages;
            
            setMassiveLulLogs(prev => [...prev, `Il PDF contiene ${numPages} pagine. Cerco i Codici Fiscali...`]);

            const dipendentiAttivi = users.filter(u => u.attivo !== false && u.codiceFiscale);
            let currentUserMatch = null;
            const pageGroups = []; 

            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ').toUpperCase();

                let foundUser = null;
                for (const dip of dipendentiAttivi) {
                    if (pageText.includes(dip.codiceFiscale.toUpperCase())) {
                        foundUser = dip;
                        break;
                    }
                }

                if (foundUser) {
                    currentUserMatch = foundUser;
                    pageGroups.push({ user: currentUserMatch, pages: [i - 1] }); 
                } else if (currentUserMatch) {
                    pageGroups[pageGroups.length - 1].pages.push(i - 1);
                } else {
                    setMassiveLulLogs(prev => [...prev, `⚠️ Pagina ${i} ignorata: CF non riconosciuto.`]);
                }
            }

            setMassiveLulLogs(prev => [...prev, `Trovati ${pageGroups.length} dipendenti. Inizio i tagli e i caricamenti...`]);
            const pdfDoc = await PDFDocument.load(fileBuffer);
            let successCount = 0;

            for (const group of pageGroups) {
                try {
                    setMassiveLulLogs(prev => [...prev, `⏳ Taglio e caricamento per ${group.user.nome} ${group.user.cognome}...`]);
                    const newPdf = await PDFDocument.create();
                    const copiedPages = await newPdf.copyPages(pdfDoc, group.pages);
                    copiedPages.forEach(p => newPdf.addPage(p));
                    const pdfBytes = await newPdf.save();
                    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

                    const fileName = `${bpAnno}_${bpMese}_LUL.pdf`;
                    const timestampId = Date.now().toString() + Math.floor(Math.random()*1000);
                    const fileRef = ref(storage, `users/${group.user.id}/bustepaga/${timestampId}_${fileName}`);
                    
                    await uploadBytes(fileRef, blob);
                    const url = await getDownloadURL(fileRef);

                    const newBusta = { id: timestampId, nome: fileName, mese: bpMese, anno: bpAnno, url: url, caricatoIl: new Date().toISOString() };
                    await updateDoc(doc(db, 'users', group.user.id), { bustePaga: arrayUnion(newBusta) });

                    successCount++;
                    setMassiveLulLogs(prev => [...prev, `✅ ${group.user.nome} salvato!`]);
                } catch (err) {
                    setMassiveLulLogs(prev => [...prev, `❌ Errore caricamento per ${group.user.nome}: ${err.message}`]);
                }
            }

            setMassiveLulLogs(prev => [...prev, `🎉 PROCESSO COMPLETATO! Inviati ${successCount} LUL.`]);
        } catch (error) {
            setMassiveLulLogs(prev => [...prev, `🚨 ERRORE CRITICO: ${error.message}`]);
        } finally {
            setIsProcessingMassive(false);
            e.target.value = ''; 
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl animate-fade-in-up flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div>
                        <h3 className="text-2xl font-extrabold text-emerald-700 flex items-center gap-2">
                            <DocumentArrowUpIcon className="h-7 w-7"/> Smistamento LUL Automatico
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Carica il PDF unico dello studio paghe. Il sistema lo dividerà leggendo i Codici Fiscali.</p>
                    </div>
                    <button onClick={() => !isProcessingMassive && onClose()} disabled={isProcessingMassive} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600 disabled:opacity-50"><XMarkIcon className="h-6 w-6"/></button>
                </div>

                <div className="space-y-6">
                    <div className="flex gap-4">
                        <div className="w-1/2">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Mese di Riferimento</label>
                            <select className="w-full rounded-xl border-gray-300 font-bold text-gray-700 bg-gray-50" value={bpMese} onChange={e => setBpMese(e.target.value)} disabled={isProcessingMassive}>
                                {MESI.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="w-1/2">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Anno</label>
                            <select className="w-full rounded-xl border-gray-300 font-bold text-gray-700 bg-gray-50" value={bpAnno} onChange={e => setBpAnno(e.target.value)} disabled={isProcessingMassive}>
                                {ANNI.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="relative border-4 border-dashed border-emerald-300 rounded-2xl p-8 text-center bg-emerald-50 hover:bg-emerald-100 transition-colors">
                        <input type="file" accept=".pdf" disabled={isProcessingMassive} onChange={handleMassiveLulUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                        <DocumentArrowUpIcon className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                        <h4 className="text-lg font-extrabold text-emerald-800">Trascina qui il PDF unico</h4>
                        <p className="text-sm text-emerald-600 font-medium mt-1">Oppure clicca per selezionarlo dal PC</p>
                    </div>

                    <div className="bg-gray-900 rounded-xl p-4 overflow-y-auto h-48 border-2 border-gray-800 font-mono text-xs text-green-400 shadow-inner">
                        {massiveLulLogs.length === 0 ? <p className="text-gray-500 italic">In attesa del file PDF...</p> : massiveLulLogs.map((log, index) => (
                            <div key={index} className={`mb-1 ${log.includes('❌') ? 'text-red-400' : log.includes('⚠️') ? 'text-yellow-400' : ''}`}>&gt; {log}</div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};