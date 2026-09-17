import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    ArrowLeftIcon, PlusIcon, TrashIcon, PrinterIcon, 
    UserIcon, BuildingOfficeIcon, DocumentTextIcon, BanknotesIcon, BoltIcon,
    CheckCircleIcon, XMarkIcon, ArrowPathIcon
} from '@heroicons/react/24/solid';
import { useReactToPrint } from 'react-to-print';
import { FatturaPrintTemplate } from './FatturaPrintTemplate';

const formatCurrency = (amount) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);

const getAddressString = (addr) => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    const street = addr.via || addr.indirizzo || '';
    const city = addr.citta || '';
    const zip = addr.cap || '';
    const prov = addr.provincia ? `(${addr.provincia})` : '';
    return [street, zip, city, prov].filter(Boolean).join(' ');
};

export const FatturaForm = ({
    onBack, onSave, onSaveSuccess, isLoading, initialData,
    clients = [], cantieri = [], fatture = [], offerte = [], userCompany 
}) => {
    
    const [formData, setFormData] = useState({
        numeroFattura: '',
        dataEmissione: new Date().toISOString().split('T')[0],
        stato: 'Da Inviare',
        clienteId: '',
        ragioneSocialeCliente: '',
        indirizzoCliente: '',
        pivaCliente: '',
        cantiereId: '',
        riferimentoLavori: '',
        righe: [{ descrizione: '', quantita: 1, prezzoUnitario: 0, totaleRiga: 0 }],
        regimeFiscale: 'Standard', 
        aliquotaIva: 22,
        metodoPagamento: 'Bonifico Bancario',
        terminiPagamento: 'Rimessa Diretta',
        scadenzaPagamento: new Date().toISOString().split('T')[0],
        note: ''
    });

    const [importModal, setImportModal] = useState({ isOpen: false, voci: [], cantiereId: null, riferimento: '' });

    // 🌟 IL NUOVO CERVELLO DI AUTO-NUMERAZIONE (Universale e Infallibile)
    const generateInvoiceNumber = (dateString) => {
        const currentYear = new Date(dateString || new Date()).getFullYear();
        
        // Cerca tutte le fatture dello stesso anno (escludendo quella che stiamo modificando ora)
        const fattureAnno = fatture.filter(f => 
            f.dataEmissione && 
            new Date(f.dataEmissione).getFullYear() === currentYear &&
            f.id !== initialData?.id
        );
        
        let maxNum = 0;
        fattureAnno.forEach(f => {
            const match = (f.numeroFattura || '').toString().match(/\d+$/); 
            if (match) {
                const num = parseInt(match[0], 10);
                if (num > maxNum) maxNum = num;
            }
        });
        const nextNum = maxNum + 1;
        const yearSuffix = currentYear.toString().slice(-2);
        return `${yearSuffix}/${nextNum.toString().padStart(3, '0')}`;
    };

    // Genera il numero solo all'apertura se è una fattura nuova
    useEffect(() => {
        if (!initialData && !formData.numeroFattura) {
            setFormData(prev => ({ ...prev, numeroFattura: generateInvoiceNumber(prev.dataEmissione) }));
        }
    }, [fatture, initialData]);

    const cantieriDisponibili = useMemo(() => {
        if (!formData.clienteId) return [];
        return cantieri.filter(cantiere => {
            const isDelCliente = cantiere.clienteId === formData.clienteId;
            const isGiaFatturato = fatture.some(f => f.cantiereId === cantiere.id && f.id !== formData.id && f.stato !== 'Annullata');
            const isCantiereAttuale = formData.cantiereId === cantiere.id;
            return isDelCliente && (!isGiaFatturato || isCantiereAttuale);
        });
    }, [cantieri, fatture, formData.clienteId, formData.id, formData.cantiereId]);

    // CALCOLI FISCALI
    const { imponibile, importoIva, importoRitenuta, totaleDocumento, totaleNettoDaPagare, aliquotaEffettiva } = useMemo(() => {
        const imp = formData.righe.reduce((acc, riga) => acc + (Number(riga.totaleRiga) || 0), 0);
        let ivaEffettiva = Number(formData.aliquotaIva) || 22;
        if (formData.regimeFiscale === 'Reverse Charge') ivaEffettiva = 0; 
        const iva = imp * (ivaEffettiva / 100);
        const tot = imp + iva;
        let ritenuta = 0;
        if (formData.regimeFiscale === 'Ritenuta 4%') ritenuta = imp * 0.04;
        if (formData.regimeFiscale === 'Ritenuta 8%') ritenuta = imp * 0.08;
        if (formData.regimeFiscale === 'Ritenuta 20%') ritenuta = imp * 0.20;
        const netto = tot - ritenuta;
        return { imponibile: imp, importoIva: iva, importoRitenuta: ritenuta, totaleDocumento: tot, totaleNettoDaPagare: netto, aliquotaEffettiva: ivaEffettiva };
    }, [formData.righe, formData.aliquotaIva, formData.regimeFiscale]);

    // NOTE LEGALI
    useEffect(() => {
        let notaFiscale = '';
        if (formData.regimeFiscale === 'Reverse Charge') notaFiscale = "Operazione soggetta a Reverse Charge (inversione contabile) ai sensi dell'art. 17, comma 6, lett. a-ter, D.P.R. 633/1972.";
        else if (formData.regimeFiscale.includes('Ritenuta')) notaFiscale = `Fattura assoggettata a ${formData.regimeFiscale} a titolo di acconto imposte.`;
        setFormData(prev => {
            let baseNote = prev.note || '';
            baseNote = baseNote.replace(/Operazione soggetta a Reverse Charge.*/, '').replace(/Fattura assoggettata a Ritenuta.*/, '').trim();
            return { ...prev, note: baseNote ? `${baseNote}\n${notaFiscale}`.trim() : notaFiscale };
        });
    }, [formData.regimeFiscale]);

    // SCADENZA E IBAN
    useEffect(() => {
        if (formData.dataEmissione && formData.terminiPagamento) {
            const data = new Date(formData.dataEmissione);
            if (formData.terminiPagamento === '30gg DF') data.setDate(data.getDate() + 30);
            else if (formData.terminiPagamento === '30gg FM') { data.setMonth(data.getMonth() + 1); data.setDate(0); }
            else if (formData.terminiPagamento === '60gg DF') data.setDate(data.getDate() + 60);
            else if (formData.terminiPagamento === '60gg FM') { data.setMonth(data.getMonth() + 2); data.setDate(0); }
            setFormData(prev => ({ ...prev, scadenzaPagamento: data.toISOString().split('T')[0] }));
        }
    }, [formData.dataEmissione, formData.terminiPagamento]);

    useEffect(() => {
        if (formData.metodoPagamento === 'Bonifico Bancario' && userCompany?.iban) {
            const ibanString = `Coordinate Bancarie (IBAN): ${userCompany.iban}`;
            setFormData(prev => {
                if (!prev.note.includes('IBAN')) return { ...prev, note: prev.note ? `${prev.note}\n${ibanString}` : ibanString };
                return prev;
            });
        }
    }, [formData.metodoPagamento, userCompany]);

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({ 
                ...prev, ...initialData,
                dataEmissione: initialData.dataEmissione instanceof Date ? initialData.dataEmissione.toISOString().split('T')[0] : (initialData.dataEmissione || prev.dataEmissione),
                scadenzaPagamento: initialData.scadenzaPagamento instanceof Date ? initialData.scadenzaPagamento.toISOString().split('T')[0] : (initialData.scadenzaPagamento || prev.scadenzaPagamento),
                righe: initialData.righe?.length > 0 ? initialData.righe : [{ descrizione: '', quantita: 1, prezzoUnitario: 0, totaleRiga: 0 }]
            }));
        }
    }, [initialData]);

    const componentRef = useRef();
    const triggerPrint = useReactToPrint({
        contentRef: componentRef, 
        documentTitle: `Fattura_${formData.numeroFattura || 'Bozza'}`,
        onPrintError: (error) => console.error("❌ Errore react-to-print:", error)
    });

    const handlePrint = () => {
        if (componentRef.current) triggerPrint();
        else alert("Il modulo di stampa non è ancora pronto. Riprova tra un istante.");
    };

    // 🌟 GESTIONE CAMBIAMENTI (Con Reazione Istantanea allo Stato)
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            
            // Se cambio stato in Pagata/Inviata e non ho il numero, lo genero sotto gli occhi dell'utente!
            if (name === 'stato') {
                if (!prev.numeroFattura || prev.numeroFattura.toLowerCase() === 'bozza' || prev.numeroFattura.trim() === '') {
                    updated.numeroFattura = generateInvoiceNumber(updated.dataEmissione);
                }
            }
            return updated;
        });
    };

    const handleClienteChange = (e) => {
        const clienteId = e.target.value;
        const cliente = clients.find(c => c.id === clienteId);
        if (cliente) {
            setFormData(prev => ({
                ...prev, clienteId,
                ragioneSocialeCliente: cliente.ragioneSociale || `${cliente.nome || ''} ${cliente.cognome || ''}`.trim(),
                indirizzoCliente: cliente.indirizzo || '',
                pivaCliente: cliente.partitaIva || cliente.codiceFiscale || '',
                cantiereId: '', riferimentoLavori: ''
            }));
        } else setFormData(prev => ({ ...prev, clienteId: '', ragioneSocialeCliente: '', indirizzoCliente: '', pivaCliente: '', cantiereId: '', riferimentoLavori: '' }));
    };

    // IL SEGUGIO ALGORITMICO 
    const handleCantiereChange = (e) => {
        const cantiereId = e.target.value;
        const cantiere = cantieri.find(c => c.id === cantiereId);
        
        if (!cantiere) {
            setFormData(prev => ({ ...prev, cantiereId: '', riferimentoLavori: '' }));
            return;
        }

        const testoRiferimento = formData.riferimentoLavori ? formData.riferimentoLavori : `Lavori presso cantiere: ${cantiere.nomeCantiere}`;

        const offertaAssociata = offerte.find(o => String(o.cantiereId) === String(cantiere.id) || String(cantiere.offertaId) === String(o.id));

        if (offertaAssociata) {
            let vociEstratte = [];

            const trovaArrayConPrezzi = (obj) => {
                if (!obj || typeof obj !== 'object') return null;
                for (const val of Object.values(obj)) {
                    if (Array.isArray(val) && val.length > 0 && (val[0].prezzo !== undefined || val[0].prezzoUnitario !== undefined)) {
                        return val;
                    }
                    if (typeof val === 'object' && !Array.isArray(val)) {
                        const found = trovaArrayConPrezzi(val); 
                        if (found) return found;
                    }
                }
                return null;
            };

            const righeVendita = trovaArrayConPrezzi(offertaAssociata);

            if (righeVendita && righeVendita.length > 0) {
                vociEstratte = [...righeVendita];
            } else if (offertaAssociata.dettaglioCosti) {
                const dc = offertaAssociata.dettaglioCosti;
                ['materiali', 'noli', 'mezzi', 'manodopera', 'subappalti', 'altro'].forEach(cat => {
                    if (Array.isArray(dc[cat])) vociEstratte = [...vociEstratte, ...dc[cat]];
                });
            }

            vociEstratte = vociEstratte.filter(v => v.descrizione || v.titolo || Number(v.prezzo || v.prezzoUnitario || v.costoUnitario) > 0);

            if (vociEstratte.length > 0) {
                setImportModal({ isOpen: true, voci: vociEstratte, cantiereId: cantiere.id, riferimento: testoRiferimento });
                return; 
            }
        }

        setFormData(prev => ({ ...prev, cantiereId, riferimentoLavori: testoRiferimento }));
    };

    const handleConfirmImport = (importa) => {
        setFormData(prev => ({
            ...prev,
            cantiereId: importModal.cantiereId,
            riferimentoLavori: importModal.riferimento,
            righe: importa ? importModal.voci.map(voce => {
                const qta = Number(voce.quantita) || 1;
                const prz = Number(voce.prezzo || voce.prezzoUnitario || voce.costoUnitario || voce.importo) || 0;
                return {
                    descrizione: voce.descrizione || voce.titolo || voce.nome || 'Voce importata',
                    quantita: qta,
                    prezzoUnitario: prz,
                    totaleRiga: qta * prz
                };
            }) : prev.righe 
        }));
        
        setImportModal({ isOpen: false, voci: [], cantiereId: null, riferimento: '' });
    };

    const handleRigaChange = (index, field, value) => {
        const newRighe = [...formData.righe];
        newRighe[index][field] = value;
        if (field === 'quantita' || field === 'prezzoUnitario') {
            const qta = Number(newRighe[index].quantita) || 0;
            const prz = Number(newRighe[index].prezzoUnitario) || 0;
            newRighe[index].totaleRiga = qta * prz;
        }
        setFormData(prev => ({ ...prev, righe: newRighe }));
    };

    const addRiga = () => setFormData(prev => ({ ...prev, righe: [...prev.righe, { descrizione: '', quantita: 1, prezzoUnitario: 0, totaleRiga: 0 }] }));
    const removeRiga = (index) => { if (formData.righe.length > 1) setFormData(prev => ({ ...prev, righe: prev.righe.filter((_, i) => i !== index) })); };

    // 🌟 INTERCETTAZIONE AL SALVATAGGIO
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        let numFattura = formData.numeroFattura;
        
        // Ultimo controllo di sicurezza prima di salvare nel Database!
        if (!numFattura || numFattura.toLowerCase() === 'bozza' || numFattura.trim() === '') {
            numFattura = generateInvoiceNumber(formData.dataEmissione);
        }

        const datiDaSalvare = {
            ...formData, 
            numeroFattura: numFattura, // Sovrascrive con il numero sicuro
            imponibile, importoIva, importoRitenuta, totaleDocumento, totaleNettoDaPagare, aliquotaEffettiva,
            righe: formData.righe.map(r => ({ ...r, quantita: Number(r.quantita), prezzoUnitario: Number(r.prezzoUnitario), totaleRiga: Number(r.totaleRiga) }))
        };
        const result = await onSave(datiDaSalvare);
        if (result?.success) onSaveSuccess(result.message);
    };

    const inputClass = "w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all";
    const labelClass = "block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1";

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen animate-fade-in relative">
            
            {importModal.isOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                    <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl p-8 animate-fade-in-up text-center border-t-8 border-indigo-500">
                        <div className="mx-auto bg-indigo-100 text-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                            <BoltIcon className="h-8 w-8" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-2">Preventivo Trovato!</h2>
                        <p className="text-gray-500 mb-8 leading-relaxed">
                            Ho trovato <span className="font-bold text-indigo-600">{importModal.voci.length} voci</span> nel preventivo associato a questo cantiere. Vuoi che compili la fattura automaticamente importando queste voci e i relativi prezzi di vendita?
                        </p>
                        
                        <div className="flex flex-col gap-3">
                            <button type="button" onClick={() => handleConfirmImport(true)} className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg">
                                <CheckCircleIcon className="h-6 w-6"/> Sì, importa tutto
                            </button>
                            <button type="button" onClick={() => handleConfirmImport(false)} className="w-full flex justify-center items-center gap-2 bg-gray-100 text-gray-500 font-bold py-3.5 px-4 rounded-xl hover:bg-gray-200 transition-colors">
                                <XMarkIcon className="h-5 w-5"/> No, scriverò a mano
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="absolute opacity-0 pointer-events-none" style={{ left: '-10000px', top: '-10000px' }}>
                <div ref={componentRef} className="bg-white">
                    <FatturaPrintTemplate 
                        data={{ ...formData, imponibile, importoIva, importoRitenuta, totaleDocumento, totaleNettoDaPagare, aliquotaEffettiva }} 
                        azienda={userCompany} 
                    />
                </div>
            </div>

            <div className="max-w-5xl mx-auto flex justify-between items-center mb-6">
                 <button type="button" onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-bold transition-colors">
                    <ArrowLeftIcon className="h-5 w-5" /> <span>Torna al Registro</span>
                </button>
                <button type="button" onClick={handlePrint} className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black shadow-md transition-all active:scale-95 font-bold text-sm">
                    <PrinterIcon className="h-5 w-5 text-indigo-400" /> Stampa PDF
                </button>
            </div>

            <form onSubmit={handleSubmit} className="max-w-5xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-20">
                <div className="p-8 bg-indigo-900 text-white flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-800 rounded-2xl relative">
                            <DocumentTextIcon className="h-8 w-8 text-indigo-300"/>
                            <BoltIcon className="h-4 w-4 text-yellow-400 absolute -bottom-1 -right-1" title="Automazioni Attive" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black">{initialData?.id ? 'Modifica Fattura' : 'Emissione Nuova Fattura'}</h1>
                            <p className="text-indigo-300 text-sm font-bold">Documento {formData.numeroFattura}</p>
                        </div>
                    </div>
                    <div className="bg-indigo-800/50 p-4 rounded-2xl border border-indigo-700 text-center md:text-right min-w-[200px]">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-1">Netto da Pagare</p>
                        <p className="text-3xl font-black text-green-400">{formatCurrency(totaleNettoDaPagare)}</p>
                    </div>
                </div>

                <div className="p-8 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        
                        {/* 🌟 CAMPO NUMERO FATTURA CON BOTTONE DI RICALCOLO 🌟 */}
                        <div className="relative">
                            <label className={labelClass}>Nr. Fattura</label>
                            <div className="flex gap-2">
                                <input type="text" name="numeroFattura" value={formData.numeroFattura} onChange={handleChange} className={`${inputClass} font-bold`} required />
                                <button 
                                    type="button" 
                                    onClick={() => setFormData(prev => ({...prev, numeroFattura: generateInvoiceNumber(prev.dataEmissione)}))}
                                    className="p-2.5 bg-indigo-100 text-indigo-600 hover:bg-indigo-200 rounded-xl transition-colors shrink-0"
                                    title="Ricalcola Numero Progressivo"
                                >
                                    <ArrowPathIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        
                        <div><label className={labelClass}>Data Emissione</label><input type="date" name="dataEmissione" value={formData.dataEmissione} onChange={handleChange} className={inputClass} required /></div>
                        <div>
                            <label className={labelClass}>Stato Incasso</label>
                            <select name="stato" value={formData.stato} onChange={handleChange} className={`${inputClass} font-bold ${formData.stato === 'Pagata' ? 'text-green-600' : 'text-orange-600'}`}>
                                <option value="Da Inviare">📄 Da Inviare</option>
                                <option value="Inviata">📩 Inviata</option>
                                <option value="Pagata">✅ Pagata</option>
                                <option value="Scaduta">⚠️ Scaduta</option>
                            </select>
                        </div>
                        <div>
                            <label className={`${labelClass} text-indigo-500`}>Regime Fiscale</label>
                            <select name="regimeFiscale" value={formData.regimeFiscale} onChange={handleChange} className={`${inputClass} border-indigo-200 text-indigo-700 font-bold bg-indigo-50`}>
                                <option value="Standard">Standard (IVA Normale)</option>
                                <option value="Reverse Charge">Reverse Charge</option>
                                <option value="Ritenuta 4%">Ritenuta d'Acconto 4%</option>
                                <option value="Ritenuta 8%">Ritenuta d'Acconto 8%</option>
                                <option value="Ritenuta 20%">Ritenuta d'Acconto 20%</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                            <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-4 text-sm"><UserIcon className="h-4 w-4 text-indigo-500"/> Informazioni Cliente</h3>
                            <div className="space-y-4">
                                <select name="clienteId" value={formData.clienteId} onChange={handleClienteChange} className={inputClass} required>
                                    <option value="">-- Seleziona Cliente --</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.ragioneSociale || `${c.nome || ''} ${c.cognome || ''}`.trim()}</option>)}
                                </select>
                                {formData.clienteId && (
                                    <div className="text-xs text-gray-500 space-y-1 pl-1">
                                        <p><span className="font-bold uppercase tracking-tighter text-[9px]">P.IVA:</span> {formData.pivaCliente}</p>
                                        <p><span className="font-bold uppercase tracking-tighter text-[9px]">Sede:</span> {getAddressString(formData.indirizzoCliente)}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 relative">
                            <div className="absolute top-4 right-4"><BoltIcon className="h-4 w-4 text-yellow-500 opacity-50" title="Auto-compilazione preventivo attiva"/></div>
                            <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-4 text-sm"><BuildingOfficeIcon className="h-4 w-4 text-indigo-500"/> Riferimento Lavori</h3>
                            <div className="space-y-4">
                                <select name="cantiereId" value={formData.cantiereId} onChange={handleCantiereChange} className={inputClass} disabled={!formData.clienteId}>
                                    <option value="">-- Nessun Cantiere Specifico --</option>
                                    {cantieriDisponibili.map(c => <option key={c.id} value={c.id}>{c.nomeCantiere}</option>)}
                                </select>
                                {!formData.clienteId && <p className="text-[10px] text-gray-400 font-bold ml-1">Seleziona prima il cliente per vedere i suoi cantieri.</p>}
                                {formData.clienteId && cantieriDisponibili.length === 0 && <p className="text-[10px] text-orange-500 font-bold ml-1">Tutti i cantieri di questo cliente risultano già fatturati o assenti.</p>}
                                <input type="text" name="riferimentoLavori" value={formData.riferimentoLavori} onChange={handleChange} className={inputClass} placeholder="Oggetto della fattura..." />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold text-gray-800 mb-4 px-1 text-sm">Dettaglio Voci Fatturate</h3>
                        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Descrizione Prestazione / Materiale</th>
                                        <th className="px-4 py-3 text-center w-24">Q.tà</th>
                                        <th className="px-4 py-3 text-right w-32">Prezzo Unit.</th>
                                        <th className="px-4 py-3 text-right w-32">Totale</th>
                                        <th className="px-4 py-3 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {formData.righe.map((riga, index) => (
                                        <tr key={index} className="group align-top">
                                            <td className="p-2 pt-3"><textarea value={riga.descrizione} onChange={(e) => handleRigaChange(index, 'descrizione', e.target.value)} className="w-full p-2 border border-transparent focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 rounded-lg text-sm font-medium resize-y" rows={2} placeholder="Descrivi dettagliatamente la voce..." required /></td>
                                            <td className="p-2 pt-3"><input type="number" value={riga.quantita} onChange={(e) => handleRigaChange(index, 'quantita', e.target.value)} className="w-full p-2 border border-transparent focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 rounded-lg text-sm text-center font-bold text-indigo-600" min="1" /></td>
                                            <td className="p-2 pt-3"><input type="number" value={riga.prezzoUnitario === 0 ? '' : riga.prezzoUnitario} onChange={(e) => handleRigaChange(index, 'prezzoUnitario', e.target.value)} className="w-full p-2 border border-transparent focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 rounded-lg text-sm text-right font-bold" step="0.01" placeholder="0.00" /></td>
                                            <td className="p-4 pt-5 text-right font-black text-gray-900 text-sm">{formatCurrency(riga.totaleRiga || 0)}</td>
                                            <td className="p-2 pt-4 text-center"><button type="button" onClick={() => removeRiga(index)} className="p-1 text-gray-300 hover:text-red-500 transition-colors"><TrashIcon className="h-5 w-5" /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button type="button" onClick={addRiga} className="w-full py-3 bg-gray-50 text-indigo-600 text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 border-t border-gray-100"><PlusIcon className="h-4 w-4" /> Aggiungi riga</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-6">
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className={labelClass}>Metodo Pagamento</label><select name="metodoPagamento" value={formData.metodoPagamento} onChange={handleChange} className={inputClass}><option value="Bonifico Bancario">🏦 Bonifico Bancario</option><option value="Rimessa Diretta">🤝 Rimessa Diretta</option><option value="Ri.Ba.">📄 Ri.Ba.</option></select></div>
                                <div><label className={labelClass}>Termini</label><select name="terminiPagamento" value={formData.terminiPagamento} onChange={handleChange} className={inputClass}><option value="Rimessa Diretta">Vista Fattura</option><option value="30gg DF">30 gg Data Fattura</option><option value="30gg FM">30 gg Fine Mese</option><option value="60gg DF">60 gg Data Fattura</option><option value="60gg FM">60 gg Fine Mese</option></select></div>
                            </div>
                            <div><label className={labelClass}>Scadenza Calcolata</label><input type="date" name="scadenzaPagamento" value={formData.scadenzaPagamento} onChange={handleChange} className={`${inputClass} font-bold text-indigo-700 bg-indigo-50`} /></div>
                            <div><label className={labelClass}>Note e Coordinate in calce</label><textarea name="note" value={formData.note} onChange={handleChange} rows={4} className={`${inputClass} text-xs`} placeholder="Coordinate bancarie o istruzioni..." /></div>
                        </div>

                        <div className="bg-indigo-50/50 p-6 md:p-8 rounded-3xl space-y-3 border border-indigo-100 shadow-inner">
                            <div className="flex justify-between text-sm font-bold text-indigo-900/60"><span>Imponibile</span><span>{formatCurrency(imponibile)}</span></div>
                            
                            {formData.regimeFiscale === 'Reverse Charge' ? (
                                <div className="flex justify-between items-center text-sm font-bold text-indigo-900/60"><span>IVA Inversione Contabile</span><span>€ 0,00</span></div>
                            ) : (
                                <div className="flex justify-between items-center text-sm font-bold text-indigo-900/60">
                                    <div className="flex items-center gap-2"><span>IVA</span><input type="number" name="aliquotaIva" value={formData.aliquotaIva} onChange={handleChange} className="w-14 p-1 bg-white border border-indigo-200 rounded text-center text-xs font-black" /><span>%</span></div>
                                    <span>{formatCurrency(importoIva)}</span>
                                </div>
                            )}

                            <div className="flex justify-between text-xl font-black text-indigo-900 pt-3 border-t border-indigo-200/50"><span>Totale Documento</span><span>{formatCurrency(totaleDocumento)}</span></div>
                            
                            {importoRitenuta > 0 && (
                                <div className="flex justify-between text-sm font-bold text-red-500 pt-2"><span>- {formData.regimeFiscale}</span><span>- {formatCurrency(importoRitenuta)}</span></div>
                            )}

                            {importoRitenuta > 0 && (
                                <div className="flex justify-between text-3xl font-black text-green-500 pt-4 border-t border-indigo-200/50 mt-4"><span>Netto a Pagare</span><span>{formatCurrency(totaleNettoDaPagare)}</span></div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button type="submit" disabled={isLoading} className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3">
                        <BanknotesIcon className="h-6 w-6 text-indigo-300"/>
                        {isLoading ? 'Salvataggio...' : 'Emetti e Salva Fattura'}
                    </button>
                </div>
            </form>
        </div>
    );
};