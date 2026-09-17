import React, { useState, useEffect } from 'react';
import { useFirebaseData, useAziendaManager } from 'shared-core';
import { 
    BuildingOfficeIcon, BanknotesIcon, DocumentTextIcon, 
    PaintBrushIcon, PlusIcon, TrashIcon, CheckIcon,
    ArrowPathIcon, PhotoIcon, CurrencyDollarIcon, WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

export const SettingsContent = () => {
    const { db, user, userAziendaId, data, storage } = useFirebaseData();
    const { updateDatiAzienda, isLoading } = useAziendaManager(db, storage, user, userAziendaId);

    const [activeTab, setActiveTab] = useState('anagrafica');
    const [formData, setFormData] = useState(null);
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);

    useEffect(() => {
        const currentCompany = (data?.companies || []).find(c => c.id === userAziendaId);
        if (currentCompany && !formData) {
            
            // 🌟 RECUPERO VECCHI DATI: Cerca nei vecchi cassetti per non perdere nulla!
            const vecchiCosti = currentCompany.costSettings || currentCompany.impostazioni || {};

            setFormData({
                ...currentCompany,
                ragioneSociale: currentCompany.ragioneSociale || currentCompany.companyName || '',
                piva: currentCompany.piva || currentCompany.partitaIva || currentCompany.companyPiva || '',
                codiceFiscale: currentCompany.codiceFiscale || currentCompany.companyCf || '',
                
                indirizzo: currentCompany.indirizzo || currentCompany.sedeLegale || currentCompany.companyAddress || '',
                citta: currentCompany.citta || currentCompany.companyCity || '',
                cap: currentCompany.cap || currentCompany.companyCap || '',
                provincia: currentCompany.provincia || currentCompany.companyProv || '',
                
                sedeOperativa: currentCompany.sedeOperativa || '',
                pec: currentCompany.pec || '',
                codiceSDI: currentCompany.codiceSDI || '',
                email: currentCompany.email || '',
                telefono: currentCompany.telefono || '',
                sitoWeb: currentCompany.sitoWeb || '',
                capitaleSociale: currentCompany.capitaleSociale || '',
                rea: currentCompany.rea || '',

                contiCorrenti: currentCompany.contiCorrenti || [{ banca: '', intestatario: '', iban: '' }],
                numeratori: currentCompany.numeratori || { preventivi: 1, fatture: 1, ddt: 1 },
                testiDefault: currentCompany.testiDefault || { 
                    notePreventivo: 'Validità offerta: 30 giorni lavorativi.\nPrezzi IVA esclusa.', 
                    noteFattura: 'Contributo CONAI assolto ove dovuto.',
                    metodoPagamento: 'Bonifico Bancario 30gg DFFM'
                },
                grafica: currentCompany.grafica || { colorePrimario: '#4f46e5' },

                // 🌟 QUI AVVIENE LA MAGIA DELLA MIGRAZIONE
                costoOrarioOperaio: currentCompany.costoOrarioOperaio ?? vecchiCosti.costoOrarioOperaio ?? 25,
                costoOrarioTecnico: currentCompany.costoOrarioTecnico ?? vecchiCosti.costoOrarioTecnico ?? 35,
                costoOrarioPreposto: currentCompany.costoOrarioPreposto ?? vecchiCosti.costoOrarioPreposto ?? 40,
                costoOrarioAttrezzatura: currentCompany.costoOrarioAttrezzatura ?? vecchiCosti.costoOrarioAttrezzatura ?? 10,
                percentualeSpeseGenerali: currentCompany.percentualeSpeseGenerali ?? vecchiCosti.percentualeSpeseGenerali ?? 15,
            });
        }
    }, [data?.companies, userAziendaId, formData]);

    if (!formData) return <div className="p-8 text-center text-gray-500 animate-pulse font-bold">Caricamento impostazioni...</div>;

    const handleChange = (e, section = null) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'number' ? Number(value) : value;

        if (section) {
            setFormData(prev => ({ ...prev, [section]: { ...prev[section], [name]: finalValue } }));
        } else {
            setFormData(prev => ({ ...prev, [name]: finalValue }));
        }
    };

    const handleContoChange = (index, field, value) => {
        const nuoviConti = [...formData.contiCorrenti];
        nuoviConti[index][field] = value;
        setFormData(prev => ({ ...prev, contiCorrenti: nuoviConti }));
    };

    const aggiungiConto = () => {
        setFormData(prev => ({ ...prev, contiCorrenti: [...prev.contiCorrenti, { banca: '', intestatario: '', iban: '' }] }));
    };

    const rimuoviConto = (index) => {
        const nuoviConti = formData.contiCorrenti.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, contiCorrenti: nuoviConti }));
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

  const saveSettings = async () => {
        const payloadSicuro = {
            ...formData,
            ragioneSociale: formData.ragioneSociale || '',
            piva: formData.piva || '',
            codiceFiscale: formData.codiceFiscale || '',
            indirizzo: formData.indirizzo || '',
            citta: formData.citta || '',
            cap: formData.cap || '',
            provincia: formData.provincia || '',
            sedeOperativa: formData.sedeOperativa || '',
            pec: formData.pec || '',
            codiceSDI: formData.codiceSDI || '',
            email: formData.email || '',
            telefono: formData.telefono || '',
            sitoWeb: formData.sitoWeb || '',
            capitaleSociale: formData.capitaleSociale || '',
            rea: formData.rea || '',
            
            // Assicuriamo che i parametri numerici siano effettivamente numeri
            costoOrarioOperaio: Number(formData.costoOrarioOperaio),
            costoOrarioTecnico: Number(formData.costoOrarioTecnico),
            costoOrarioPreposto: Number(formData.costoOrarioPreposto),
            costoOrarioAttrezzatura: Number(formData.costoOrarioAttrezzatura),
            percentualeSpeseGenerali: Number(formData.percentualeSpeseGenerali),

            iban: (formData.contiCorrenti && formData.contiCorrenti.length > 0) ? (formData.contiCorrenti[0].iban || '') : '',
            banca: (formData.contiCorrenti && formData.contiCorrenti.length > 0) ? (formData.contiCorrenti[0].banca || '') : '',

            contiCorrenti: (formData.contiCorrenti || []).map(conto => ({
                banca: conto.banca || '',
                intestatario: conto.intestatario || '',
                iban: conto.iban || ''
            }))
        };

        delete payloadSicuro.partitaIva;
        delete payloadSicuro.companyPiva;
        delete payloadSicuro.companyAddress;
        delete payloadSicuro.companyCity;
        delete payloadSicuro.companyCap;
        delete payloadSicuro.companyProv;

        Object.keys(payloadSicuro).forEach(key => {
            if (payloadSicuro[key] === undefined) {
                payloadSicuro[key] = ''; 
            }
        });

        const cleanData = JSON.parse(JSON.stringify(payloadSicuro));

        if (cleanData.logoUrl === undefined) cleanData.logoUrl = '';

        const res = await updateDatiAzienda(cleanData, logoFile);
        
        if (res.success) alert("✅ Impostazioni salvate con successo!");
        else alert("❌ Errore durante il salvataggio: " + res.message);
    };

    const tabs = [
        { id: 'anagrafica', label: 'Dati Fiscali & Sedi', icon: BuildingOfficeIcon },
        { id: 'parametri', label: 'Costi & Parametri Base', icon: CurrencyDollarIcon }, // 🌟 NUOVO TAB
        { id: 'banche', label: 'Banche & Pagamenti', icon: BanknotesIcon },
        { id: 'documenti', label: 'Numeratori & Testi PDF', icon: DocumentTextIcon },
        { id: 'grafica', label: 'Design & Carta Intestata', icon: PaintBrushIcon },
    ];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in pb-24">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Impostazioni Aziendali</h1>
                    <p className="text-gray-500 font-medium mt-1">Configura l'intestazione, i parametri di calcolo e i conti per l'azienda.</p>
                </div>
                <button 
                    onClick={saveSettings} 
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 font-bold shadow-lg transition-all disabled:opacity-50"
                >
                    {isLoading ? <ArrowPathIcon className="h-5 w-5 animate-spin"/> : <CheckIcon className="h-5 w-5"/>}
                    {isLoading ? 'Salvataggio...' : 'Salva Impostazioni'}
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                
                <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200 p-4 flex flex-col gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${
                                activeTab === tab.id 
                                ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                            }`}
                        >
                            <tab.icon className={`h-5 w-5 ${activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 p-6 md:p-8 bg-white overflow-y-auto">
                    
                    {activeTab === 'anagrafica' && (
                        <div className="space-y-6 animate-fade-in">
                            <h2 className="text-xl font-extrabold text-gray-800 border-b pb-2 mb-6">Ragione Sociale e Identificativi</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Ragione Sociale *</label>
                                    <input type="text" name="ragioneSociale" value={formData.ragioneSociale || ''} onChange={handleChange} className="w-full rounded-xl border-gray-300 font-bold text-gray-900 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Partita IVA *</label>
                                    <input type="text" name="piva" value={formData.piva || ''} onChange={handleChange} className="w-full rounded-xl border-gray-300 font-mono focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Codice Fiscale</label>
                                    <input type="text" name="codiceFiscale" value={formData.codiceFiscale || ''} onChange={handleChange} className="w-full rounded-xl border-gray-300 font-mono focus:ring-indigo-500" placeholder="Se diverso da P.IVA" />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Sede Legale (Via e Civico)</label>
                                    <input type="text" name="indirizzo" value={formData.indirizzo || ''} onChange={handleChange} className="w-full rounded-xl border-gray-300 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Città</label>
                                    <input type="text" name="citta" value={formData.citta || ''} onChange={handleChange} className="w-full rounded-xl border-gray-300 focus:ring-indigo-500" />
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-1/3">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Prov.</label>
                                        <input type="text" name="provincia" value={formData.provincia || ''} onChange={handleChange} maxLength={2} placeholder="MI" className="w-full rounded-xl border-gray-300 uppercase text-center focus:ring-indigo-500" />
                                    </div>
                                    <div className="w-2/3">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">CAP</label>
                                        <input type="text" name="cap" value={formData.cap || ''} onChange={handleChange} maxLength={5} className="w-full rounded-xl border-gray-300 focus:ring-indigo-500" />
                                    </div>
                                </div>

                                <div className="md:col-span-2 border-t pt-4">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Sede Operativa (Opzionale)</label>
                                    <input type="text" name="sedeOperativa" value={formData.sedeOperativa || ''} onChange={handleChange} className="w-full rounded-xl border-gray-300 focus:ring-indigo-500" placeholder="Se diversa dalla sede legale" />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Indirizzo PEC *</label>
                                    <input type="email" name="pec" value={formData.pec || ''} onChange={handleChange} className="w-full rounded-xl border-gray-300 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Codice Destinatario (SDI)</label>
                                    <input type="text" name="codiceSDI" value={formData.codiceSDI || ''} onChange={handleChange} className="w-full rounded-xl border-gray-300 font-mono uppercase focus:ring-indigo-500" maxLength={7} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Email Cortesia</label>
                                    <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="w-full rounded-xl border-gray-300 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Telefono</label>
                                    <input type="text" name="telefono" value={formData.telefono || ''} onChange={handleChange} className="w-full rounded-xl border-gray-300 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Sito Web</label>
                                    <input type="text" name="sitoWeb" value={formData.sitoWeb || ''} onChange={handleChange} className="w-full rounded-xl border-gray-300 focus:ring-indigo-500" placeholder="www.azienda.com" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Capitale Sociale (€)</label>
                                    <input type="text" name="capitaleSociale" value={formData.capitaleSociale || ''} onChange={handleChange} className="w-full rounded-xl border-gray-300 focus:ring-indigo-500" placeholder="Es. 10.000 i.v." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Iscrizione REA</label>
                                    <input type="text" name="rea" value={formData.rea || ''} onChange={handleChange} className="w-full rounded-xl border-gray-300 focus:ring-indigo-500" placeholder="Es. MI-123456" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 🌟 NUOVO TAB: PARAMETRI AZIENDALI 🌟 */}
                    {activeTab === 'parametri' && (
                        <div className="space-y-8 animate-fade-in">
                            <div>
                                <h2 className="text-xl font-extrabold text-gray-800 border-b pb-2 mb-4">Costi Orari Manodopera</h2>
                                <p className="text-sm text-gray-500 mb-6">Questi costi verranno utilizzati dal software per il calcolo automatico dei preventivi e per le stime di cantiere.</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">👷 Costo Operaio</label>
                                        <div className="flex items-center gap-2">
                                            <input type="number" step="0.01" name="costoOrarioOperaio" value={formData.costoOrarioOperaio} onChange={handleChange} className="w-full rounded-lg border-gray-300 font-bold text-lg text-gray-800 focus:ring-indigo-500" />
                                            <span className="text-gray-500 font-bold">€/h</span>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">📐 Costo Tecnico</label>
                                        <div className="flex items-center gap-2">
                                            <input type="number" step="0.01" name="costoOrarioTecnico" value={formData.costoOrarioTecnico} onChange={handleChange} className="w-full rounded-lg border-gray-300 font-bold text-lg text-gray-800 focus:ring-indigo-500" />
                                            <span className="text-gray-500 font-bold">€/h</span>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">📋 Costo Preposto</label>
                                        <div className="flex items-center gap-2">
                                            <input type="number" step="0.01" name="costoOrarioPreposto" value={formData.costoOrarioPreposto} onChange={handleChange} className="w-full rounded-lg border-gray-300 font-bold text-lg text-gray-800 focus:ring-indigo-500" />
                                            <span className="text-gray-500 font-bold">€/h</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h2 className="text-xl font-extrabold text-gray-800 border-b pb-2 mb-4">Costi Attrezzature & Ricarichi</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                                            <WrenchScrewdriverIcon className="h-4 w-4"/> Costo Medio Orario Attrezzature
                                        </label>
                                        <div className="flex items-center gap-2 mb-3">
                                            <input type="number" step="0.01" name="costoOrarioAttrezzatura" value={formData.costoOrarioAttrezzatura} onChange={handleChange} className="w-full rounded-lg border-gray-300 font-bold text-lg text-gray-800 focus:ring-indigo-500" />
                                            <span className="text-gray-500 font-bold">€/h</span>
                                        </div>
                                        <p className="text-xs text-gray-400 font-medium">Usato automaticamente se la specifica attrezzatura non ha un costo orario definito nel preventivo.</p>
                                    </div>

                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Ricarico Spese Generali & Amministrazione</label>
                                        <div className="flex items-center gap-2 mb-3">
                                            <input type="number" step="0.01" name="percentualeSpeseGenerali" value={formData.percentualeSpeseGenerali} onChange={handleChange} className="w-full rounded-lg border-gray-300 font-bold text-lg text-gray-800 focus:ring-indigo-500" />
                                            <span className="text-gray-500 font-bold">%</span>
                                        </div>
                                        <p className="text-xs text-gray-400 font-medium">Ricarico percentuale forfettario da applicare su ogni calcolo di commessa e preventivo base.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: BANCHE E IBAN */}
                    {activeTab === 'banche' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center border-b pb-2 mb-6">
                                <h2 className="text-xl font-extrabold text-gray-800">Conti Correnti Aziendali</h2>
                                <button onClick={aggiungiConto} className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-emerald-200 transition-colors">
                                    <PlusIcon className="h-4 w-4"/> Aggiungi IBAN
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                {formData.contiCorrenti.map((conto, index) => (
                                    <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl relative group">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nome Banca</label>
                                                <input type="text" value={conto.banca} onChange={(e) => handleContoChange(index, 'banca', e.target.value)} placeholder="Es. Intesa Sanpaolo" className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Intestatario Conto</label>
                                                <input type="text" value={conto.intestatario} onChange={(e) => handleContoChange(index, 'intestatario', e.target.value)} placeholder="Es. Mario Rossi SRL" className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Codice IBAN</label>
                                                <input type="text" value={conto.iban} onChange={(e) => handleContoChange(index, 'iban', e.target.value.toUpperCase())} placeholder="IT00A0000000000000000000000" className="w-full rounded-lg border-gray-300 font-mono text-indigo-700 font-bold tracking-widest focus:ring-indigo-500" />
                                            </div>
                                        </div>
                                        {formData.contiCorrenti.length > 1 && (
                                            <button onClick={() => rimuoviConto(index)} className="absolute top-4 right-4 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Rimuovi questo conto">
                                                <TrashIcon className="h-5 w-5"/>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 italic mt-4">Questi conti appariranno come tendina per la selezione veloce quando creerai una nuova fattura o preventivo.</p>
                        </div>
                    )}

                    {/* TAB: NUMERATORI E TESTI PDF */}
                    {activeTab === 'documenti' && (
                        <div className="space-y-8 animate-fade-in">
                            <div>
                                <h2 className="text-xl font-extrabold text-gray-800 border-b pb-2 mb-4">Punti di Partenza (Numeratori)</h2>
                                <p className="text-sm text-gray-500 mb-6">Imposta da quale numero il sistema deve far partire il prossimo documento creato.</p>
                                
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                        <label className="block text-[10px] font-bold text-indigo-800 uppercase mb-1">Prossimo N. Preventivo</label>
                                        <input type="number" name="preventivi" value={formData.numeratori?.preventivi || 1} onChange={(e) => handleChange(e, 'numeratori')} className="w-full rounded-lg border-indigo-300 font-bold text-xl text-center focus:ring-indigo-500" />
                                    </div>
                                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                        <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">Prossimo N. Fattura</label>
                                        <input type="number" name="fatture" value={formData.numeratori?.fatture || 1} onChange={(e) => handleChange(e, 'numeratori')} className="w-full rounded-lg border-emerald-300 font-bold text-xl text-center focus:ring-emerald-500" />
                                    </div>
                                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                                        <label className="block text-[10px] font-bold text-orange-800 uppercase mb-1">Prossimo N. DDT</label>
                                        <input type="number" name="ddt" value={formData.numeratori?.ddt || 1} onChange={(e) => handleChange(e, 'numeratori')} className="w-full rounded-lg border-orange-300 font-bold text-xl text-center focus:ring-orange-500" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h2 className="text-xl font-extrabold text-gray-800 border-b pb-2 mb-6">Testi Predefiniti PDF</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Termini e Note di Default (Preventivi)</label>
                                        <textarea rows="3" name="notePreventivo" value={formData.testiDefault?.notePreventivo || ''} onChange={(e) => handleChange(e, 'testiDefault')} className="w-full rounded-xl border-gray-300 text-sm focus:ring-indigo-500" placeholder="Es. Offerta valida 30 giorni..."></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Note di Default (Fatture)</label>
                                        <textarea rows="2" name="noteFattura" value={formData.testiDefault?.noteFattura || ''} onChange={(e) => handleChange(e, 'testiDefault')} className="w-full rounded-xl border-gray-300 text-sm focus:ring-indigo-500" placeholder="Es. Contributo CONAI assolto..."></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Metodo Pagamento Predefinito</label>
                                        <input type="text" name="metodoPagamento" value={formData.testiDefault?.metodoPagamento || ''} onChange={(e) => handleChange(e, 'testiDefault')} className="w-full rounded-xl border-gray-300 text-sm focus:ring-indigo-500" placeholder="Es. Bonifico Bancario 30gg DFFM" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: GRAFICA E LOGO */}
                    {activeTab === 'grafica' && (
                        <div className="animate-fade-in h-full flex flex-col md:flex-row gap-8">
                            
                            <div className="w-full md:w-1/2 space-y-6">
                                <div>
                                    <h2 className="text-xl font-extrabold text-gray-800 border-b pb-2 mb-4">Personalizzazione PDF</h2>
                                    <p className="text-sm text-gray-500 mb-6">Queste impostazioni genereranno la tua carta intestata in automatico.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Colore Tema Aziendale</label>
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="color" 
                                            name="colorePrimario" 
                                            value={formData.grafica?.colorePrimario || '#4f46e5'} 
                                            onChange={(e) => handleChange(e, 'grafica')} 
                                            className="h-12 w-24 p-1 rounded cursor-pointer border border-gray-300"
                                        />
                                        <span className="text-sm font-mono text-gray-500 bg-gray-100 px-3 py-1 rounded">{formData.grafica?.colorePrimario || '#4f46e5'}</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Logo Aziendale</label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors relative cursor-pointer group">
                                        <input type="file" accept="image/png, image/jpeg" onChange={handleLogoChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                        <PhotoIcon className="h-10 w-10 text-gray-400 mx-auto mb-2 group-hover:text-indigo-500 transition-colors" />
                                        <p className="text-sm font-bold text-indigo-600">Clicca o trascina il tuo logo qui</p>
                                        <p className="text-xs text-gray-500 mt-1">Formato consigliato: PNG trasparente, max 2MB</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                                    <p className="text-xs text-yellow-800 font-medium">
                                        <strong>Nota:</strong> L'intestazione in alto a destra e il piè di pagina in basso vengono generati <strong>automaticamente</strong> pescando i dati che hai inserito nel Tab "Dati Fiscali & Sedi".
                                    </p>
                                </div>
                            </div>

                            <div className="w-full md:w-1/2 bg-gray-200 p-6 rounded-2xl flex items-center justify-center border border-gray-300 shadow-inner">
                                <div className="bg-white w-full aspect-[1/1.414] shadow-2xl relative overflow-hidden flex flex-col justify-between">
                                    <div className="h-3 w-full" style={{ backgroundColor: formData.grafica?.colorePrimario || '#4f46e5' }}></div>
                                    <div className="px-6 py-6 flex justify-between items-start border-b border-gray-100">
                                        <div className="w-1/2 h-16 flex items-center justify-start">
                                            {(logoPreview || formData.logoUrl) ? (
                                                <img src={logoPreview || formData.logoUrl} alt="Logo Preview" className="max-h-full max-w-full object-contain" />
                                            ) : (
                                                <div className="text-[10px] text-gray-300 font-bold border border-dashed border-gray-300 p-2 text-center w-full">LOGO AZIENDA</div>
                                            )}
                                        </div>
                                        <div className="w-1/2 text-right">
                                            <h3 className="text-[11px] font-black text-gray-800 uppercase leading-tight">{formData.ragioneSociale || 'RAGIONE SOCIALE SRL'}</h3>
                                            <p className="text-[8px] text-gray-500 mt-1">
                                                {formData.indirizzo || 'Via Roma 1'}, {formData.cap || '20100'} {formData.citta || 'Milano'} ({formData.provincia || 'MI'})
                                            </p>
                                            <p className="text-[8px] text-gray-500">P.IVA: {formData.piva || formData.partitaIva || '01234567890'}</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 p-6">
                                        <h1 className="text-xl font-bold mb-4" style={{ color: formData.grafica?.colorePrimario || '#4f46e5' }}>DOCUMENTO PREVIEW</h1>
                                        <div className="space-y-2 opacity-20">
                                            <div className="h-2 bg-gray-400 rounded w-full"></div>
                                            <div className="h-2 bg-gray-400 rounded w-5/6"></div>
                                            <div className="h-2 bg-gray-400 rounded w-4/6"></div>
                                        </div>
                                    </div>
                                    <div className="px-6 py-4 border-t border-gray-100 text-center space-y-0.5">
                                        <p className="text-[7px] font-bold text-gray-700">
                                            {formData.ragioneSociale || 'Nome Azienda'} - Sede Legale: {formData.indirizzo || 'Indirizzo'}
                                        </p>
                                        <p className="text-[7px] text-gray-500">
                                            C.F. / P.IVA: {formData.piva || formData.partitaIva || '0123456789'} | 
                                            Cap. Soc. {formData.capitaleSociale || '10.000'} | 
                                            REA: {formData.rea || 'MI-12345'}
                                        </p>
                                        <p className="text-[7px] text-gray-500">PEC: {formData.pec || 'info@pec.it'} | Tel: {formData.telefono || '02 123456'}</p>
                                        {formData.sitoWeb && <p className="text-[7px] text-indigo-500">{formData.sitoWeb}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};