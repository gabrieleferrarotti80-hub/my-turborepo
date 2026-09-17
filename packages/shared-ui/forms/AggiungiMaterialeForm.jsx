import React, { useState } from 'react';
import { useTheme } from '../context/themeContext.jsx'; 
import { 
    ArrowLeftIcon, 
    CubeIcon, 
    LinkIcon, 
    ClipboardDocumentCheckIcon,
    ExclamationTriangleIcon, 
    CurrencyEuroIcon,
    MapPinIcon,
    Bars3BottomLeftIcon,
    QrCodeIcon,
    TagIcon
} from '@heroicons/react/24/outline';

export const AggiungiMaterialeForm = ({ 
    onBack, 
    onSaveSuccess, 
    addMateriale, 
    isAdding, 
    onSwitchToImport,
    ddtList = [],
    ordiniList = [],
    fornitoriList = [] // <--- AGGIUNGI QUESTA RIGA QUI
}) => {
    
    const { primaryColor, colorClasses } = useTheme();
    
    // --- STATO UNIFICATO (Vecchi campi + Nuovi campi avanzati) ---
    const [formData, setFormData] = useState({
        nomeGenerico: '',
        specifiche: '',
        marca: '',
        codice: '',
        descrizione: '',
        categoria: '',
        quantita: '',
        unitaMisura: 'pz',
        sogliaMinima: '10',
        costoUnitario: '',
        fornitore: '',
        posizioneMagazzino: '',
        ddtId: '',
        ordineId: ''
    });
    
    const [message, setMessage] = useState('');
    const [righeOrdine, setRigheOrdine] = useState([]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- LOGICA 1: Quando selezioni un DDT ---
    const handleDDTChange = (e) => {
        const selectedDDTId = e.target.value;
        const selectedDDT = ddtList.find(d => d.id === selectedDDTId);
        
        let newOrdineId = formData.ordineId;
        let newRighe = righeOrdine;

        if (selectedDDT && selectedDDT.ordineId) {
            const ordineCollegato = ordiniList.find(o => o.id === selectedDDT.ordineId);
            if (ordineCollegato) {
                newOrdineId = ordineCollegato.id;
                newRighe = ordineCollegato.righe || [];
            }
        }

        setFormData(prev => ({ 
            ...prev, 
            ddtId: selectedDDTId,
            ordineId: newOrdineId 
        }));
        setRigheOrdine(newRighe);
    };

    // --- LOGICA 2: Quando selezioni un Ordine ---
    const handleOrdineChange = (e) => {
        const selectedId = e.target.value;
        setFormData(prev => ({ ...prev, ordineId: selectedId }));

        if (!selectedId) {
            setRigheOrdine([]);
            return;
        }

        const ordine = ordiniList.find(o => o.id === selectedId);
        if (ordine && Array.isArray(ordine.righe)) {
            setRigheOrdine(ordine.righe);
        } else {
            setRigheOrdine([]);
        }
    };

    // --- LOGICA 3: Auto-Compilazione da Ordine ---
    const handleRigaOrdineSelect = (e) => {
        const index = e.target.value;
        if (index === "") return;

        const riga = righeOrdine[index];
        if (riga) {
            setFormData(prev => ({
                ...prev,
                nomeGenerico: riga.descrizione || '', // Pre-compila il nome generico
                quantita: riga.quantita || '',
                costoUnitario: riga.prezzoUnitario || '',
                unitaMisura: 'pz' 
            }));
        }
    };

    // --- SALVATAGGIO ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        // Composizione intelligente del nome (es: "Viti Fischer 4x40mm Legno")
        const nomeEsteso = `${formData.nomeGenerico.trim()} ${formData.marca.trim()} ${formData.specifiche.trim()}`.replace(/\s+/g, ' ').trim();

        const datiDaSalvare = {
            nome: nomeEsteso, 
            nomeGenerico: formData.nomeGenerico.trim(),
            specifiche: formData.specifiche.trim(),
            marca: formData.marca.trim(),
            categoria: formData.categoria || 'Materiale',
            tipoArticolo: 'materiale',
            unitaMisura: formData.unitaMisura,
            quantita: parseFloat(formData.quantita) || 0,
            sogliaMinima: parseFloat(formData.sogliaMinima) || 0,
            costoUnitario: parseFloat(formData.costoUnitario) || 0,
            fornitore: formData.fornitore.trim(),
            posizioneMagazzino: formData.posizioneMagazzino.trim(),
            ddtId: formData.ddtId || null,
            ordineId: formData.ordineId || null,
            dettagli: { 
                codice: formData.codice.trim(),
                descrizione: formData.descrizione.trim()
            } 
        };

        const result = await addMateriale(datiDaSalvare);

        if (result && result.success) {
            if (onSaveSuccess) onSaveSuccess(result.message);
        } else {
            setMessage(result?.message || "Errore sconosciuto durante il salvataggio.");
        }
    };

    const formatDate = (d) => d ? new Date(d.toDate ? d.toDate() : d).toLocaleDateString() : '';

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            
            {/* HEADER */}
            <div className="flex justify-between items-center mb-4">
                <button onClick={onBack} disabled={isAdding} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 hover:underline font-bold transition-colors disabled:opacity-50">
                    <ArrowLeftIcon className="h-5 w-5" /> Torna all'Inventario
                </button>
                <button onClick={onSwitchToImport} className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg transition-colors border border-slate-300 shadow-sm">
                    Importa Excel
                </button>
            </div>
            
            <div className="border-b border-slate-200 pb-4 flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <CubeIcon className="h-8 w-8" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Nuovo Materiale</h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">Registra consumabili e collegali a ordini e DDT.</p>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-xl text-sm font-bold shadow-sm ${message.includes('Errore') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8 pt-2">
                
                {/* --- SEZIONE 0: PROVENIENZA (DDT/ORDINI) --- */}
                <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 space-y-4 shadow-sm">
                    <h3 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
                        <LinkIcon className="h-5 w-5"/> Collegamento a Documenti
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Rif. DDT (Opzionale)</label>
                            <select name="ddtId" value={formData.ddtId} onChange={handleDDTChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                                <option value="">-- Nessun DDT --</option>
                                {ddtList.map(ddt => (
                                    <option key={ddt.id} value={ddt.id}>
                                        {formatDate(ddt.createdAt)} - {ddt.nomeCantiere || 'Sconosciuto'}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Rif. Ordine Acquisto</label>
                            <select name="ordineId" value={formData.ordineId} onChange={handleOrdineChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                                <option value="">-- Nessun Ordine --</option>
                                {ordiniList.map(ord => {
                                    const descPrimaRiga = ord.righe && ord.righe.length > 0 ? ord.righe[0].descrizione : '';
                                    const anteprima = descPrimaRiga ? `| ${descPrimaRiga.substring(0, 25)}${descPrimaRiga.length > 25 ? '...' : ''}` : '';
                                    return (
                                        <option key={ord.id} value={ord.id}>
                                            {ord.numeroOrdine} - {ord.nomeFornitore || 'Fornitore'} {anteprima}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>

                    {/* AUTO-COMPILAZIONE */}
                    {righeOrdine.length > 0 && (
                        <div className="mt-2 pt-4 border-t border-indigo-200">
                            <label className="block text-[11px] font-bold text-indigo-800 uppercase mb-1.5 flex items-center gap-1">
                                <ClipboardDocumentCheckIcon className="h-4 w-4"/> Compila dati da riga ordine:
                            </label>
                            <select onChange={handleRigaOrdineSelect} className="w-full p-2.5 border-2 border-indigo-300 bg-white rounded-lg text-sm font-medium text-slate-800 cursor-pointer hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm">
                                <option value="">-- Seleziona voce per auto-compilare --</option>
                                {righeOrdine.map((riga, idx) => (
                                    <option key={idx} value={idx}>
                                        {riga.descrizione} (Qta: {riga.quantita} - € {riga.prezzoUnitario})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* --- SEZIONE 1: IDENTIFICAZIONE AVANZATA --- */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                        <TagIcon className="h-5 w-5 text-indigo-500" /> Identificazione Articolo
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputField label="Nome Generico" name="nomeGenerico" value={formData.nomeGenerico} onChange={handleChange} required placeholder="Es. Viti, Cavo, Silicone..." />
                        <InputField label="Specifiche / Misura" name="specifiche" value={formData.specifiche} onChange={handleChange} required placeholder="Es. 4x40mm Legno, 1.5mmq..." />
                        <InputField label="Marca / Produttore" name="marca" value={formData.marca} onChange={handleChange} placeholder="Es. Fischer, Bticino, Mapei..." />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <QrCodeIcon className="h-4 w-4" /> Codice Articolo / SKU
                            </label>
                            <input type="text" name="codice" value={formData.codice} onChange={handleChange} placeholder="Es. MAP-12345" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 hover:bg-white transition-all text-sm font-medium"/>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Categoria <span className="text-red-500">*</span></label>
                            <select name="categoria" value={formData.categoria} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-sm font-medium" required>
                                <option value="">-- Seleziona --</option>
                                <option value="Materiale Elettrico">Materiale Elettrico</option>
                                <option value="Materiale Idraulico">Materiale Idraulico</option>
                                <option value="Edilizia">Edilizia (Cemento, Sabbia...)</option>
                                <option value="Ferramenta">Ferramenta (Viti, Bulloni...)</option>
                                <option value="Chimici">Chimici e Vernici</option>
                                <option value="Altro">Altro / Varie</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Unità di Misura <span className="text-red-500">*</span></label>
                            <select name="unitaMisura" value={formData.unitaMisura} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-sm font-medium" required>
                                <option value="pz">Pezzi (pz)</option>
                                <option value="scatola">Scatole (cf / box)</option>
                                <option value="kg">Chilogrammi (kg)</option>
                                <option value="L">Litri (L)</option>
                                <option value="m">Metri Lineari (m)</option>
                                <option value="mq">Metri Quadri (mq)</option>
                            </select>
                        </div>
                        
                        <div className="md:col-span-3 mt-2">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <Bars3BottomLeftIcon className="h-4 w-4" /> Note Aggiuntive / Descrizione
                            </label>
                            <textarea name="descrizione" value={formData.descrizione} onChange={handleChange} placeholder="Dettagli aggiuntivi sul prodotto..." className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 hover:bg-white transition-all text-sm font-medium min-h-[60px]" />
                        </div>
                    </div>
                </div>

                {/* --- SEZIONE 2: GIACENZA E SOTTOSCORTA --- */}
                <div className="p-5 bg-amber-50/50 rounded-xl border border-amber-200 space-y-4">
                    <h3 className="font-bold text-amber-800 flex items-center gap-2 text-sm">
                        <ExclamationTriangleIcon className="h-5 w-5" /> Giacenza e Allarmi
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label={`Quantità Iniziale (${formData.unitaMisura})`} name="quantita" type="number" value={formData.quantita} onChange={handleChange} required placeholder="Es. 50" />
                        <div>
                            <InputField label={`Soglia di Riordino (${formData.unitaMisura})`} name="sogliaMinima" type="number" value={formData.sogliaMinima} onChange={handleChange} placeholder="Es. 10" />
                            <p className="text-[10px] text-amber-600 mt-1.5 font-medium leading-tight">Sotto questa soglia l'articolo sarà segnalato "Da Riordinare".</p>
                        </div>
                    </div>
                </div>

                {/* --- SEZIONE 3: ACQUISTO E POSIZIONAMENTO --- */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Acquisto e Posizionamento</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <CurrencyEuroIcon className="h-4 w-4 text-emerald-500"/> Costo Unitario
                            </label>
                            <input type="number" step="any" name="costoUnitario" value={formData.costoUnitario} onChange={handleChange} placeholder="Es. 2.50" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 hover:bg-white text-sm font-medium transition-all"/>
                        </div>
                       <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Fornitore Abituale
                            </label>
                            {/* La combo-box: input + datalist */}
                            <input 
                                type="text" 
                                list="lista-fornitori"
                                name="fornitore" 
                                value={formData.fornitore} 
                                onChange={handleChange} 
                                placeholder="Seleziona dalla lista o digita..." 
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 hover:bg-white text-sm font-medium transition-all"
                            />
                            <datalist id="lista-fornitori">
                                {fornitoriList.map(f => {
                                    // Peschiamo il nome corretto dal database fornitori
                                    const nomeFornitore = f.ragioneSociale || f.nome || f.nomeFornitore;
                                    if (nomeFornitore) {
                                        return <option key={f.id} value={nomeFornitore} />;
                                    }
                                    return null;
                                })}
                            </datalist>
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <MapPinIcon className="h-4 w-4 text-slate-400"/> Posizione in Magazzino
                            </label>
                            <input type="text" name="posizioneMagazzino" value={formData.posizioneMagazzino} onChange={handleChange} placeholder="Es. Scaffale A, Cassetto 3" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 hover:bg-white text-sm font-medium transition-all"/>
                        </div>
                    </div>
                </div>

                {/* --- BOTTONI --- */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                    <button type="button" onClick={onBack} disabled={isAdding} className="py-2.5 px-6 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50">
                        Annulla
                    </button>
                    <button type="submit" disabled={isAdding} className="py-2.5 px-6 text-white rounded-xl font-bold transition-all shadow-md bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg disabled:bg-slate-400 transform active:scale-95">
                        {isAdding ? 'Creazione in corso...' : 'Salva Materiale'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const InputField = ({ label, name, type = 'text', value, onChange, required = false, placeholder = '' }) => (
    <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            {label} {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <input 
            type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required} step={type === 'number' ? "any" : undefined}
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 hover:bg-white text-sm font-medium transition-all" 
        />
    </div>
);