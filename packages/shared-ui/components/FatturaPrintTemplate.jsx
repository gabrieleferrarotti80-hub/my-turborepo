import React, { forwardRef } from 'react';

const formatCurrency = (amount) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount || 0);

// 🌟 HELPER ANTI-CRASH PER GLI INDIRIZZI SALVATI COME OGGETTO 🌟
// Questo sistema evita il blocco dell'app e formatta l'indirizzo in modo elegante
const getAddressLines = (ind, cap, citta, prov, fallbackVia = '') => {
    // Se l'indirizzo è un oggetto {via, cap, citta...}
    if (ind && typeof ind === 'object') {
        const riga1 = ind.via || ind.indirizzo || fallbackVia;
        const riga2 = `${ind.cap || ''} ${ind.citta || ''} ${ind.provincia ? `(${ind.provincia})` : ''}`.trim();
        return [riga1, riga2].filter(Boolean);
    }
    
    // Se l'indirizzo è una semplice stringa
    const riga1 = typeof ind === 'string' && ind.trim() !== '' ? ind : fallbackVia;
    const riga2 = `${cap || ''} ${citta || ''} ${prov ? `(${prov})` : ''}`.trim();
    return [riga1, riga2].filter(Boolean);
};

export const FatturaPrintTemplate = forwardRef(({ data, azienda }, ref) => {
    if (!data) return null;

    // Richiamiamo l'helper per generare le righe formattate
    const aziendaLines = getAddressLines(azienda?.indirizzo, azienda?.cap, azienda?.citta, azienda?.provincia, 'Indirizzo non impostato');
    const clienteLines = getAddressLines(data.indirizzoCliente, data.capCliente, data.cittaCliente, data.provinciaCliente, 'Indirizzo Sconosciuto');

    return (
        <div ref={ref} className="bg-white text-gray-800 font-sans mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '15mm 20mm' }}>
            
            {/* INTESTAZIONE */}
            <div className="flex justify-between items-start border-b-2 border-gray-200 pb-6 mb-8">
                <div className="max-w-[50%]">
                    {/* Sostituisci questo div con un <img src={azienda.logo} /> se hai un logo! */}
                    <h1 className="text-3xl font-black text-indigo-900 tracking-tight uppercase">{azienda?.ragioneSociale || 'LA TUA AZIENDA SRL'}</h1>
                    <div className="mt-3 text-xs text-gray-600 space-y-1">
                        {aziendaLines.map((line, i) => <p key={i}>{line}</p>)}
                        <p><span className="font-bold">P.IVA / CF:</span> {azienda?.partitaIva}</p>
                        {azienda?.email && <p><span className="font-bold">Email:</span> {azienda.email}</p>}
                        {azienda?.telefono && <p><span className="font-bold">Tel:</span> {azienda.telefono}</p>}
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-4xl font-light text-gray-300 tracking-widest uppercase mb-2">Fattura</h2>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 inline-block text-left min-w-[200px]">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Dettagli Documento</p>
                        <p className="text-sm"><span className="font-bold text-gray-700">Numero:</span> <span className="text-lg font-black ml-1">{data.numeroFattura}</span></p>
                        <p className="text-sm mt-1"><span className="font-bold text-gray-700">Data:</span> {new Date(data.dataEmissione).toLocaleDateString('it-IT')}</p>
                    </div>
                </div>
            </div>

            {/* DESTINATARIO */}
            <div className="flex justify-end mb-10">
                <div className="w-1/2 bg-indigo-50/50 p-5 rounded-xl border border-indigo-100">
                    <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest mb-2">Spett.le Cliente</p>
                    <h3 className="text-lg font-black text-gray-900">{data.ragioneSocialeCliente}</h3>
                    {clienteLines.map((line, i) => (
                        <p key={i} className={`text-sm text-gray-600 ${i === 0 ? 'mt-1' : ''}`}>{line}</p>
                    ))}
                    <p className="text-sm text-gray-600 mt-2"><span className="font-bold">P.IVA / CF:</span> {data.pivaCliente || 'Non specificata'}</p>
                </div>
            </div>

            {/* OGGETTO */}
            {data.riferimentoLavori && (
                <div className="mb-8">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Oggetto</p>
                    <p className="text-sm font-bold text-gray-800">{data.riferimentoLavori}</p>
                </div>
            )}

            {/* TABELLA RIGHE */}
            <div className="mb-10">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b-2 border-gray-800 text-gray-900">
                            <th className="py-3 font-bold">Descrizione</th>
                            <th className="py-3 font-bold text-center w-20">Q.tà</th>
                            <th className="py-3 font-bold text-right w-28">Prezzo Unit.</th>
                            <th className="py-3 font-bold text-right w-32">Importo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.righe?.map((riga, index) => (
                            <tr key={index}>
                                <td className="py-4 pr-4 whitespace-pre-line text-gray-700">{riga.descrizione}</td>
                                <td className="py-4 text-center text-gray-600">{riga.quantita}</td>
                                <td className="py-4 text-right text-gray-600">{formatCurrency(riga.prezzoUnitario)}</td>
                                <td className="py-4 text-right font-bold text-gray-900">{formatCurrency(riga.totaleRiga)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* TOTALI E PAGAMENTO */}
            <div className="flex justify-between items-start">
                {/* Note e Pagamento */}
                <div className="w-1/2 pr-8">
                    <div className="mb-6">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Metodo e Scadenza</p>
                        <p className="text-sm text-gray-800"><span className="font-bold">Pagamento:</span> {data.metodoPagamento || 'Non specificato'}</p>
                        {data.scadenzaPagamento && <p className="text-sm text-gray-800"><span className="font-bold">Scadenza:</span> {new Date(data.scadenzaPagamento).toLocaleDateString('it-IT')}</p>}
                    </div>
                    {data.note && (
                        <div>
                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Note e Coordinate</p>
                            <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">{data.note}</p>
                        </div>
                    )}
                </div>

                {/* Box Totali */}
                <div className="w-1/2">
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Imponibile Lordo</span>
                                <span className="font-medium">{formatCurrency(data.imponibile)}</span>
                            </div>
                            
                            <div className="flex justify-between text-gray-600 border-b border-gray-200 pb-3">
                                <span>IVA ({data.aliquotaEffettiva || data.aliquotaIva || 22}%)</span>
                                <span className="font-medium">{formatCurrency(data.importoIva)}</span>
                            </div>

                            <div className="flex justify-between font-bold text-gray-800 pt-1">
                                <span>Totale Documento</span>
                                <span>{formatCurrency(data.totaleDocumento)}</span>
                            </div>

                            {data.importoRitenuta > 0 && (
                                <div className="flex justify-between text-red-600 pt-2 border-t border-gray-200 mt-2">
                                    <span>Ritenuta d'Acconto</span>
                                    <span>- {formatCurrency(data.importoRitenuta)}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-xl font-black text-indigo-900 pt-4 border-t border-gray-800 mt-4">
                                <span>Netto da Pagare</span>
                                <span>{formatCurrency(data.totaleNettoDaPagare || data.totaleDocumento)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* FOOTER PAGINA */}
            <div className="mt-16 pt-8 border-t border-gray-200 text-center text-[10px] text-gray-400">
                Documento generato tramite piattaforma gestionale aziendale. Esente da bollo se l'IVA è applicata.
            </div>
        </div>
    );
});