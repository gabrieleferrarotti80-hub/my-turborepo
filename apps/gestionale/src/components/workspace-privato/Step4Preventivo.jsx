import React, { useState } from 'react';
import { 
    CalculatorIcon, DocumentPlusIcon, ExclamationTriangleIcon, ArrowPathIcon, CheckCircleIcon, PrinterIcon, PlayIcon, TrashIcon, PlusIcon 
} from '@heroicons/react/24/outline';

export const Step4Preventivo = ({
    offerta, cliente, azienda, datiLead,
    datiPdf, setDatiPdf,
    totaleCosti,
    percSpeseGenerali, setPercSpeseGenerali,
    percUtile, setPercUtile,
    approvatoreId, setApprovatoreId,
    approvatoriPossibili,
    isOwnerOrAdmin, hasPreventiviVerbali,
    isSaving,
    handleSaveAll, richiediApprovazione, handleConvertAndSave,
    coloreTema,
    costoPieno, importoSpeseGenerali, importoUtileAtteso, prezzoVenditaSuggerito, utileReale, percUtileReale,
    handleRigaChangePdf, handleAddRigaPdf, handleRemoveRigaPdf, handleApplicaPrezzoSuggerito
}) => {

    const [nascondiPrezziSingoli, setNascondiPrezziSingoli] = useState(false);

    return (
        <div className="flex flex-col xl:flex-row gap-6 animate-fade-in-up relative">
            
            <style>{`
                @media print { 
                    body * { visibility: hidden; } 
                    #print-area, #print-area * { visibility: visible; } 
                    #print-area { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%; 
                        height: auto !important; 
                        overflow: visible !important; 
                    } 
                    html, body { height: auto !important; overflow: visible !important; }
                    .print\\:hidden { display: none !important; }
                    @page { size: A4; margin: 15mm; } 
                }
            `}</style>
            
            {/* Controlli Sinistra (Workflow) */}
            <div className="w-full xl:w-[400px] flex-shrink-0 space-y-4 print:hidden">
                
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
                    <h4 className="font-black text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2"><CalculatorIcon className="h-5 w-5 text-indigo-600"/> Calcolatore Margini Globali</h4>
                    
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs text-slate-600">
                            <span>Costi Diretti (Fasi):</span> 
                            <span className="font-bold text-slate-800">€ {totaleCosti.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center text-xs text-slate-600">
                            <span className="flex items-center gap-1">
                                Spese Gen.
                                <input type="number" value={percSpeseGenerali} onChange={e=>setPercSpeseGenerali(Number(e.target.value))} className="w-12 p-0.5 border border-slate-300 rounded text-center text-indigo-700 font-bold focus:ring-1 focus:ring-indigo-500"/>
                                %
                            </span>
                            <span className="font-bold text-rose-600">+ € {importoSpeseGenerali.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center text-xs font-bold border-t border-slate-100 pt-2 text-slate-800">
                            <span>Costo Pieno Aziendale:</span> 
                            <span>€ {costoPieno.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center text-xs text-slate-600 border-b border-slate-100 pb-3">
                            <span className="flex items-center gap-1">
                                Utile Atteso
                                <input type="number" value={percUtile} onChange={e=>setPercUtile(Number(e.target.value))} className="w-12 p-0.5 border border-slate-300 rounded text-center text-emerald-700 font-bold focus:ring-1 focus:ring-emerald-500"/>
                                %
                            </span>
                            <span className="font-bold text-emerald-600">+ € {importoUtileAtteso.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center text-sm font-black text-indigo-800 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                            <span>TOTALE SUGGERITO:</span>
                            <span>€ {prezzoVenditaSuggerito.toFixed(2)}</span>
                        </div>

                        <button onClick={handleApplicaPrezzoSuggerito} className="w-full py-2.5 mt-2 bg-indigo-600 text-white text-[11px] uppercase tracking-wider font-black rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex justify-center items-center gap-2">
                            <DocumentPlusIcon className="h-4 w-4"/> Applica Ricarichi a tutte le Fasi
                        </button>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Check Rendimento Reale</p>
                        <div className="flex justify-between text-xs text-slate-600 mb-1"><span>Prezzo Vendita (dal PDF):</span> <span className="font-bold">€ {datiPdf.totaleImponibile.toFixed(2)}</span></div>
                        <div className="flex justify-between text-xs text-slate-600"><span>Utile Effettivo:</span> <span className={`font-black ${utileReale >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>€ {utileReale.toFixed(2)} ({percUtileReale.toFixed(1)}%)</span></div>
                    </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={nascondiPrezziSingoli} onChange={e => setNascondiPrezziSingoli(e.target.checked)} className="h-5 w-5 text-amber-600 rounded focus:ring-amber-500 border-amber-300"/>
                        <div>
                            <p className="text-sm font-bold text-amber-900">Stampa a Corpo (Nascondi Prezzi)</p>
                            <p className="text-[10px] text-amber-700 leading-tight">Il cliente vedrà l'elenco delle lavorazioni, ma il prezzo sarà visibile solo sul Totale in fondo.</p>
                        </div>
                    </label>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <h4 className="font-bold text-slate-800 border-b pb-2 mb-4">Workflow Preventivo</h4>
                    
                    {hasPreventiviVerbali && (
                        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
                            <ExclamationTriangleIcon className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold text-orange-800">Attenzione: Preventivi a Voce</p>
                                <p className="text-[10px] text-orange-700 leading-tight mt-0.5">Hai inserito dei subappalti senza spuntare "Preventivo Ufficiale". I margini potrebbero variare.</p>
                            </div>
                        </div>
                    )}

                    {['approvata', 'inviata', 'accettata', 'convertita_in_cantiere'].includes(offerta.stato) ? (
                        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <p className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                                <CheckCircleIcon className="h-5 w-5"/> Preventivo Approvato
                            </p>
                        </div>
                    ) : offerta.stato === 'in_approvazione' ? (
                        <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                            <p className="text-sm font-bold text-purple-800 flex items-center gap-2">
                                <ArrowPathIcon className="h-4 w-4 animate-spin"/> In attesa di approvazione
                            </p>
                            {isOwnerOrAdmin && (
                                <button onClick={() => handleSaveAll('approvata')} className="mt-3 w-full py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 shadow-sm transition-colors">
                                    ✅ Approva Ora
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="mb-4 space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">1. Chiedi Approvazione a:</label>
                            <select value={approvatoreId} onChange={e => setApprovatoreId(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-500">
                                <option value="">-- Seleziona Responsabile --</option>
                                {approvatoriPossibili.map(a => <option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}
                            </select>
                            <button onClick={richiediApprovazione} disabled={isSaving} className="w-full py-2.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg hover:bg-purple-200 transition-colors shadow-sm">
                                {isSaving ? 'Invio in corso...' : 'Invia Richiesta in Agenda'}
                            </button>
                            
                            {isOwnerOrAdmin && (
                                <div className="pt-2 border-t border-slate-200 mt-2">
                                    <button onClick={() => handleSaveAll('approvata')} className="w-full py-2 text-xs font-bold rounded-lg transition-colors bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                                        Oppure Approva Subito
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <button onClick={() => { handleSaveAll('inviata', false); window.print(); }} className="w-full py-3 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 flex justify-center items-center gap-2 shadow-md mb-4 mt-2">
                        <PrinterIcon className="h-5 w-5"/> {['inviata', 'convertita_in_cantiere', 'accettata'].includes(offerta.stato) ? 'Ristampa PDF' : '2. Stampa PDF / Segna Inviato'}
                    </button>

                    {offerta.stato !== 'convertita_in_cantiere' ? (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl mt-6">
                            <p className="text-[10px] font-black text-emerald-800 uppercase text-center mb-2">Il cliente ha accettato?</p>
                            <button onClick={handleConvertAndSave} className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-lg font-bold hover:bg-emerald-700 transition-all shadow-sm">
                                <PlayIcon className="h-5 w-5"/> 3. VINTO! Apri Cantiere
                            </button>
                        </div>
                    ) : (
                        <div className="mt-6 p-4 bg-emerald-100 border border-emerald-300 rounded-xl text-center">
                            <CheckCircleIcon className="h-8 w-8 text-emerald-600 mx-auto mb-1" />
                            <p className="text-sm font-black text-emerald-800">LAVORO VINTO</p>
                            <p className="text-xs text-emerald-700 font-medium">Cantiere già generato.</p>
                        </div>
                    )}

                    <button onClick={() => handleSaveAll('rifiutata')} className="w-full mt-4 py-2 text-xs font-bold bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors">Segna come Perso</button>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex gap-2">
                        <div className="w-1/2"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Numero</label><input type="text" value={datiPdf.numero} onChange={e=>setDatiPdf({...datiPdf, numero: e.target.value})} className="w-full rounded-lg border-slate-300 text-sm font-bold"/></div>
                        <div className="w-1/2"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data</label><input type="date" value={datiPdf.data} onChange={e=>setDatiPdf({...datiPdf, data: e.target.value})} className="w-full rounded-lg border-slate-300 text-sm"/></div>
                    </div>
                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Oggetto Stampato</label><input type="text" value={datiPdf.oggetto} onChange={e=>setDatiPdf({...datiPdf, oggetto: e.target.value})} className="w-full rounded-lg border-slate-300 text-sm font-bold"/></div>
                    
                    {/* 🌟 NOVITÀ: INPUT CON DATALIST PER I METODI DI PAGAMENTO */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Metodo Pagamento</label>
                        <input 
                            type="text" 
                            list="metodi-pagamento"
                            value={datiPdf.pagamento} 
                            onChange={e=>setDatiPdf({...datiPdf, pagamento: e.target.value})} 
                            placeholder="Seleziona o digita..."
                            className="w-full rounded-lg border-slate-300 text-sm focus:ring-indigo-500"
                        />
                        <datalist id="metodi-pagamento">
                            <option value="Bonifico Bancario Vista Fattura" />
                            <option value="Bonifico Bancario 30gg DFFM" />
                            <option value="Bonifico Bancario 30/60gg DFFM" />
                            <option value="30% Acconto, Saldo a fine lavori" />
                            <option value="50% Acconto, Saldo a fine lavori" />
                            <option value="Rimessa Diretta" />
                            <option value="Ri.Ba. 30gg DFFM" />
                        </datalist>
                    </div>

                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Note (Fondo pagina)</label><textarea rows="2" value={datiPdf.note} onChange={e=>setDatiPdf({...datiPdf, note: e.target.value})} className="w-full rounded-lg border-slate-300 text-xs"/></div>
                </div>
            </div>

            {/* FOGLIO A4 (Il PDF) */}
            <div id="print-area" className="flex-1 bg-white w-full max-w-[210mm] min-h-[297mm] mx-auto p-10 sm:p-14 shadow-2xl relative flex flex-col border border-slate-200">
                
                <div className="flex justify-between items-start border-b-[3px] pb-6 mb-8" style={{ borderColor: coloreTema }}>
                    <div className="w-1/2">
                        {azienda?.logoUrl ? <img src={azienda.logoUrl} className="max-h-20 object-contain" alt="Logo" /> : <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: coloreTema }}>{azienda?.ragioneSociale || 'AZIENDA N.D.'}</h1>}
                    </div>
                    <div className="w-1/2 text-right text-[11px] text-slate-600 space-y-0.5">
                        <p className="font-bold text-slate-900">{azienda?.ragioneSociale}</p>
                        <p>{azienda?.indirizzo}</p>
                        <p>{azienda?.cap} {azienda?.citta} ({azienda?.provincia})</p>
                        <p>P.IVA: {azienda?.piva}</p>
                        <p>{azienda?.email} | {azienda?.telefono}</p>
                    </div>
                </div>

                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-widest mb-1">PREVENTIVO</h2>
                        <p className="text-sm font-bold text-slate-500">N. {datiPdf.numero} del {new Date(datiPdf.data).toLocaleDateString('it-IT')}</p>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 min-w-[250px] text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Spett.le Cliente</p>
                        <p className="font-bold text-slate-900 text-lg leading-tight">{cliente?.ragioneSociale || `${cliente?.nome || ''} ${cliente?.cognome || ''}`}</p>
                        <p className="text-sm text-slate-600 mt-1">{cliente?.indirizzo || ''}</p>
                        <p className="text-sm text-slate-600">{cliente?.cap || ''} {cliente?.citta || ''} {cliente?.provincia ? `(${cliente.provincia})` : ''}</p>
                        <div className="text-[10px] text-slate-500 mt-2 font-mono">
                            <p>P.IVA/CF: {cliente?.partitaIva || cliente?.codiceFiscale || 'N/D'}</p>
                            {cliente?.pec && <p>PEC: {cliente.pec}</p>}
                            {cliente?.codiceSdi && <p>SDI: {cliente.codiceSdi}</p>}
                        </div>
                    </div>
                </div>

                <div className="mb-8 bg-slate-50 py-3 px-4 rounded-lg border-l-4" style={{ borderColor: coloreTema }}>
                    <p className="text-sm mb-1"><span className="font-bold text-slate-600 uppercase text-[10px] tracking-wider inline-block w-20">Oggetto:</span> <span className="font-bold text-slate-900">{datiPdf.oggetto || 'Descrizione dei lavori da eseguire'}</span></p>
                    {datiLead.indirizzoCantiere && <p className="text-sm"><span className="font-bold text-slate-600 uppercase text-[10px] tracking-wider inline-block w-20">Luogo:</span> <span className="font-medium text-slate-800">{datiLead.indirizzoCantiere}</span></p>}
                </div>

                {/* TABELLA VOCI PREVENTIVO AL CLIENTE */}
                <table className="w-full text-left mb-8">
                    <thead>
                        <tr className="border-b-2" style={{ borderColor: coloreTema }}>
                            <th className={`py-2 text-xs font-black text-slate-700 uppercase ${nascondiPrezziSingoli ? 'w-full' : 'w-1/2'}`}>Descrizione Lavoro / Articolo</th>
                            {!nascondiPrezziSingoli && (
                                <>
                                    <th className="py-2 text-xs font-black text-slate-700 uppercase text-center w-16">Q.tà</th>
                                    <th className="py-2 text-xs font-black text-slate-700 uppercase text-right w-24">Prezzo Unit.</th>
                                    <th className="py-2 text-xs font-black text-slate-700 uppercase text-right w-16">IVA</th>
                                    <th className="py-2 text-xs font-black text-slate-700 uppercase text-right w-28">Importo</th>
                                </>
                            )}
                            <th className="print:hidden w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {datiPdf.righe.map(riga => (
                            <tr key={riga.id} className="group">
                               <td className="py-3 pr-2">
    <textarea 
        className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-slate-800 font-medium print:p-0 print:m-0 resize-none overflow-hidden leading-tight" 
        placeholder="Inserisci descrizione..." 
        value={riga.descrizione} 
        readOnly={true} // In stampa non vogliamo che sia editabile accidentalmente
        rows={riga.descrizione ? riga.descrizione.split('\n').length : 1}
        style={{ height: 'auto' }}
    />
</td>
                                
                                {!nascondiPrezziSingoli && (
                                    <>
                                        <td className="py-3 px-1 text-center align-top"><input type="number" className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-center text-slate-800 print:p-0 print:m-0" value={riga.quantita} onChange={e => handleRigaChangePdf(riga.id, 'quantita', e.target.value)} /></td>
                                        <td className="py-3 px-1 text-right align-top flex items-center justify-end gap-1 whitespace-nowrap"><span className="text-sm text-slate-500">€</span><input type="number" className="w-16 bg-transparent border-none focus:ring-0 p-0 text-sm text-right text-slate-800 print:p-0 print:m-0" value={riga.prezzo} onChange={e => handleRigaChangePdf(riga.id, 'prezzo', e.target.value)} /></td>
                                        <td className="py-3 px-1 text-right align-top"><select className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-slate-500 text-right print:appearance-none print:p-0 print:m-0" value={riga.iva} onChange={e => handleRigaChangePdf(riga.id, 'iva', e.target.value)}><option value="22">22%</option><option value="10">10%</option><option value="4">4%</option><option value="0">0%</option></select></td>
                                        <td className="py-3 pl-2 text-sm font-bold text-slate-900 text-right align-top whitespace-nowrap">€ {(Number(riga.quantita) * Number(riga.prezzo)).toFixed(2)}</td>
                                    </>
                                )}
                                <td className="print:hidden text-right align-top pt-3"><button onClick={() => handleRemoveRigaPdf(riga.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="h-4 w-4"/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="flex items-center gap-4 print:hidden mb-8">
                    <button onClick={handleAddRigaPdf} className="text-indigo-600 text-xs font-bold flex items-center gap-1 hover:text-indigo-800"><PlusIcon className="h-4 w-4"/> Aggiungi riga manuale</button>
                    <div className="flex items-center gap-2 ml-auto">
                        <label className="text-xs font-bold text-slate-500">Sconto Globale (€):</label>
                        <input type="number" value={datiPdf.sconto} onChange={e=>setDatiPdf({...datiPdf, sconto: e.target.value})} className="w-20 rounded-lg border-slate-300 text-sm text-red-600 font-bold p-1 text-right"/>
                    </div>
                </div>

                <div className="flex justify-end mb-12 mt-4 page-break-inside-avoid">
                    <div className="w-full sm:w-1/2 md:w-1/3 bg-slate-50 rounded-xl p-5 border border-slate-200">
                        <div className="flex justify-between text-sm mb-2 text-slate-600 font-medium"><span>Imponibile:</span> <span className="whitespace-nowrap">€ {datiPdf.totaleImponibile.toFixed(2)}</span></div>
                        {Number(datiPdf.sconto) > 0 && <div className="flex justify-between text-sm mb-2 text-red-500 font-bold"><span>Sconto Applicato:</span> <span className="whitespace-nowrap">- € {Number(datiPdf.sconto).toFixed(2)}</span></div>}
                        <div className="flex justify-between text-sm mb-4 text-slate-600 font-medium border-b border-slate-200 pb-3"><span>Totale IVA:</span> <span className="whitespace-nowrap">€ {datiPdf.totaleIva.toFixed(2)}</span></div>
                        <div className="flex justify-between text-xl font-black" style={{ color: coloreTema }}><span>TOTALE:</span> <span className="whitespace-nowrap">€ {datiPdf.totale.toFixed(2)}</span></div>
                    </div>
                </div>

                <div className="mt-auto pt-8 page-break-inside-avoid">
                    {datiPdf.note && <div className="mb-6"><p className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1">Note e Condizioni</p><p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{datiPdf.note}</p></div>}
                    {datiPdf.pagamento && <div><p className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1">Pagamento e Coordinate Bancarie</p><p className="text-xs text-slate-600 font-medium">{datiPdf.pagamento}</p>{azienda?.iban && <p className="text-xs text-slate-800 font-mono mt-1">IBAN: <span className="font-bold tracking-wider">{azienda.iban}</span> {azienda.banca ? `(${azienda.banca})` : ''}</p>}</div>}
                </div>

                <div className="mt-12 pt-4 border-t border-slate-200 text-center space-y-0.5 page-break-inside-avoid">
                    <p className="text-[8px] font-bold text-slate-500">{azienda?.ragioneSociale} - Sede Legale: {azienda?.indirizzo} {azienda?.citta}</p>
                    <p className="text-[8px] text-slate-400">P.IVA/CF: {azienda?.piva} | Cap. Soc. {azienda?.capitaleSociale} | REA: {azienda?.rea}</p>
                </div>
            </div>
        </div>
    );
};