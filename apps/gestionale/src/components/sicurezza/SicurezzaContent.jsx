import React, { useState, useMemo, useEffect } from 'react';
import { useFirebaseData, useSicurezzaManager } from 'shared-core';
import { EyeIcon, AcademicCapIcon, IdentificationIcon, UserGroupIcon } from '@heroicons/react/24/solid';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'; 
import { VerbaleConsegnaDPI, DossierGaraModal } from 'shared-ui'; 
import { DocumentArrowDownIcon, ExclamationTriangleIcon, XMarkIcon, CheckBadgeIcon, TableCellsIcon, DocumentMagnifyingGlassIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'; 
import { doc, getDoc } from 'firebase/firestore'; 

export const SicurezzaContent = ({ view }) => {
    const { db, storage, user, userAziendaId, data } = useFirebaseData();
    const { uploadPOS, isLoading } = useSicurezzaManager(db, storage, user, userAziendaId);
    
    // Legge la memoria ma NON la cancella subito
    const [selectedCantiere, setSelectedCantiere] = useState(() => {
        return localStorage.getItem('sicurezzaPreselectCantiereId') || '';
    });

    // Cancella la memoria SOLO DOPO che la pagina si è mostrata
    useEffect(() => {
        if (localStorage.getItem('sicurezzaPreselectCantiereId')) {
            localStorage.removeItem('sicurezzaPreselectCantiereId');
        }
    }, []);

    const [selectedFile, setSelectedFile] = useState(null);
    const [previewDpi, setPreviewDpi] = useState(null);
    
    const [selectedUserDocs, setSelectedUserDocs] = useState(null);
    const [isFetchingDocs, setIsFetchingDocs] = useState(false); 
    const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);

    const cantieri = data?.cantieri || [];
    const currentCompany = (data?.companies || []).find(c => c.id === userAziendaId);
    const posList = data?.sicurezza_pos || []; 
    const users = data?.users || [];

    const corsiMonitorati = [
        { id: 'sicurezza_lavoratori', label: 'Sicurezza 81/08' },
        { id: 'primo_soccorso_antincendio', label: '1° Soccorso/Antin.' },
        { id: 'manutentore_verde', label: 'Manut. Verde' },
        { id: 'attrezzature_art_73', label: 'Art. 73' },
        { id: 'mmt', label: 'MMT' },
        { id: 'scale_aeree', label: 'Scale Aeree' },
        { id: 'lavori_quota_dpi3', label: 'Quota/DPI 3 Cat.' },
        { id: 'tree_climbing', label: 'Tree Climbing' }
    ];

    const getStatusColor = (dateStr) => {
        if (!dateStr) return ''; 
        const oggi = new Date();
        const scadenza = new Date(dateStr);
        const diffGiorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
        
        if (diffGiorni < 0) return 'bg-red-500 text-white border-red-600'; 
        if (diffGiorni <= 60) return 'bg-orange-400 text-white border-orange-500'; 
        return 'bg-green-100 text-green-800 border-green-200'; 
    };

    const formationAlerts = useMemo(() => {
        let scade = 0;
        let scaduti = 0;
        let assenti = 0; 
        
        users.forEach(u => {
            const scadenze = u.documentiPersonali?.scadenze || {};
            const docIdentity = scadenze.permessoSoggiorno || scadenze.cartaIdentita;
            
            const dateDaControllare = [
                docIdentity, 
                scadenze.patente, 
                ...corsiMonitorati.map(c => scadenze[c.id])
            ];
            
            dateDaControllare.forEach(dataStr => {
                if (!dataStr) {
                    assenti++; 
                    return;
                }
                const diffGiorni = Math.ceil((new Date(dataStr) - new Date()) / (1000 * 60 * 60 * 24));
                if (diffGiorni < 0) scaduti++;
                else if (diffGiorni <= 60) scade++;
            });
        });
        return { scade, scaduti, assenti };
    }, [users]);

    const exportToCSV = () => {
        const separator = ";"; 
        let csvContent = `Dipendente${separator}Ruolo${separator}Doc. Identità/Permesso Sogg.${separator}Scadenza Patente${separator}`;
        csvContent += corsiMonitorati.map(c => c.label).join(separator) + "\n";

        const formatDataExcel = (dateStr) => {
            if (!dateStr) return 'Assente';
            return new Date(dateStr).toLocaleDateString('it-IT');
        };

        users.forEach(u => {
            const scadenze = u.documentiPersonali?.scadenze || {};
            let row = `"${u.nome} ${u.cognome}"${separator}"${u.ruolo || ''}"${separator}`;
            const docScadenza = scadenze.permessoSoggiorno || scadenze.cartaIdentita;
            
            row += `"${formatDataExcel(docScadenza)}"${separator}`;
            row += `"${formatDataExcel(scadenze.patente)}"${separator}`;
            
            corsiMonitorati.forEach(c => {
                row += `"${formatDataExcel(scadenze[c.id])}"${separator}`;
            });
            csvContent += row + "\n";
        });

        const BOM = "\uFEFF"; 
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Matrice_Formazione_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const dpiConsegnati = useMemo(() => {
        const assegnazioni = (data?.assegnazioniMagazzino || []).filter(a => a.isDPI === true || a.tipo === 'DPI' || a.categoria === 'DPI');
        return assegnazioni.map(dpi => {
            const creatore = users.find(u => u.id === dpi.creatoDa);
            return {
                ...dpi,
                consegnatarioFirmaUrl: creatore?.firmaUrl || creatore?.firma_base64 || null,
                creatoDa_Nome: creatore ? `${creatore.nome} ${creatore.cognome}` : (dpi.creatoDa_Nome || 'Ufficio Tecnico')
            };
        });
    }, [data?.assegnazioniMagazzino, users]);

    const dpiScadenze = useMemo(() => {
        const attrezzature = data?.attrezzature || [];
        const assegnazioni = data?.assegnazioniMagazzino || [];
        
        return attrezzature
            .filter(a => a.categoria === 'DPI' && (a.dataScadenza || a.richiedeRevisione))
            .map(dpi => {
                const oggi = new Date();
                oggi.setHours(0,0,0,0);
                
                let dataScadenzaFormatted = 'N/D';
                let giorniScadenza = Infinity;
                let isScaduto = false;

                if (dpi.dataScadenza) {
                    const scadenza = new Date(dpi.dataScadenza);
                    scadenza.setHours(0,0,0,0);
                    giorniScadenza = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
                    isScaduto = giorniScadenza < 0;
                    dataScadenzaFormatted = scadenza.toLocaleDateString('it-IT');
                }

                const assegnazioniDPI = assegnazioni.filter(a => a.attrezzaturaId === dpi.id || a.articoloId === dpi.id);

                let dataRevisioneFormatted = 'Non Richiesta';
                let giorniRevisione = Infinity;
                let isRevisioneScaduta = false;

                if (dpi.richiedeRevisione && dpi.mesiRevisione) {
                    const confermeDPI = assegnazioniDPI.filter(a => a.dataConferma); 
                    
                    if (confermeDPI.length > 0) {
                        const dateConferme = confermeDPI
                            .map(a => {
                                const d = a.dataConferma?.toDate ? a.dataConferma.toDate() : a.dataConferma;
                                return new Date(d);
                            })
                            .filter(d => !isNaN(d.getTime()));

                        if (dateConferme.length > 0) {
                            dateConferme.sort((a, b) => a - b); 
                            const primaConferma = dateConferme[0]; 

                            const revisione = new Date(primaConferma);
                            revisione.setMonth(revisione.getMonth() + parseInt(dpi.mesiRevisione, 10));
                            revisione.setHours(0,0,0,0);

                            giorniRevisione = Math.ceil((revisione - oggi) / (1000 * 60 * 60 * 24));
                            isRevisioneScaduta = giorniRevisione < 0;
                            dataRevisioneFormatted = revisione.toLocaleDateString('it-IT');
                        } else {
                            dataRevisioneFormatted = "Errore Data";
                        }
                    } else if (assegnazioniDPI.length > 0) {
                        dataRevisioneFormatted = "In attesa di firma";
                    } else {
                        dataRevisioneFormatted = "Inizia all'uso";
                    }
                }
                
                let assegnatoANome = 'In Magazzino';
                let isAssegnato = false;

                if (dpi.stato === 'assegnato' || dpi.stato === 'in uso') {
                    isAssegnato = true;
                }

                if (assegnazioniDPI.length > 0) {
                    const assegnazioniOrdinate = [...assegnazioniDPI].sort((a, b) => {
                        const dateA = new Date(a.dataAssegnazione || (a.createdAt?.toDate ? a.createdAt.toDate() : 0));
                        const dateB = new Date(b.dataAssegnazione || (b.createdAt?.toDate ? b.createdAt.toDate() : 0));
                        return dateB - dateA; 
                    });
                    
                    const ultimaAss = assegnazioniOrdinate[0];
                    if (ultimaAss.stato === 'in uso' || ultimaAss.stato === 'assegnato') {
                        isAssegnato = true;
                        assegnatoANome = ultimaAss.assegnatoA_Nome || 'Sconosciuto';
                    }
                }

                if (isAssegnato && assegnatoANome === 'In Magazzino' && (dpi.assegnatoA || dpi.userId)) {
                    const dipendente = users.find(u => u.id === (dpi.assegnatoA || dpi.userId));
                    if (dipendente) assegnatoANome = `${dipendente.nome} ${dipendente.cognome}`;
                }

                const urgenzaMaggiore = Math.min(giorniScadenza, giorniRevisione);

                return {
                    ...dpi,
                    dataScadenzaFormatted,
                    giorniScadenza,
                    isScaduto,
                    dataRevisioneFormatted,
                    giorniRevisione,
                    isRevisioneScaduta,
                    isAssegnato,
                    assegnatoANome,
                    urgenzaMaggiore
                };
            })
            .sort((a, b) => a.urgenzaMaggiore - b.urgenzaMaggiore);
    }, [data?.attrezzature, users, data?.assegnazioniMagazzino]);

    const handleUploadPOS = async () => {
        if (!selectedFile || !selectedCantiere) return alert("Seleziona file e cantiere");
        const res = await uploadPOS(selectedCantiere, selectedFile);
        if (res.success) {
            alert("POS Caricato!");
            setSelectedFile(null);
        } else {
            alert("Errore: " + res.message);
        }
    };

    const apriFascicolo = async (utenteBase) => {
        setSelectedUserDocs(utenteBase);
        setIsFetchingDocs(true);
        try {
            const userRef = doc(db, 'users', utenteBase.id);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const datiReali = userSnap.data();
                setSelectedUserDocs(prev => ({
                    ...prev,
                    documenti: datiReali.documenti || [], 
                    documentiPersonali: datiReali.documentiPersonali || prev.documentiPersonali
                }));
            }
        } catch (error) {
            console.error("Errore fetch diretto documenti:", error);
        } finally {
            setIsFetchingDocs(false);
        }
    };

    return (
        <div className="animate-fade-in relative">
            
            {/* --- SEZIONE POS --- */}
            {view === 'pos' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form Upload */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
                        <h3 className="text-lg font-bold mb-4 text-gray-800">Carica Nuovo POS</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Cantiere</label>
                                <select 
                                    className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 ${selectedCantiere ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-inner' : 'border-gray-300'}`} 
                                    value={selectedCantiere} 
                                    onChange={e => setSelectedCantiere(e.target.value)}
                                >
                                    <option value="">-- Seleziona --</option>
                                    {cantieri.map(c => <option key={c.id} value={c.id}>{c.nomeCantiere}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">File PDF</label>
                                <input 
                                    type="file" 
                                    accept=".pdf" 
                                    onChange={e => setSelectedFile(e.target.files[0])} 
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                                />
                            </div>
                            <button 
                                onClick={handleUploadPOS} 
                                disabled={isLoading} 
                                className="w-full py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors"
                            >
                                {isLoading ? 'Caricamento...' : 'Carica Documento'}
                            </button>
                        </div>
                    </div>

                    {/* Lista POS */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold mb-4 text-gray-800">Archivio POS Attivi</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600 uppercase border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3">Cantiere</th>
                                        <th className="px-4 py-3">File</th>
                                        <th className="px-4 py-3">Data Caricamento</th>
                                        <th className="px-4 py-3">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {posList.map(pos => {
                                        const cantiere = cantieri.find(c => c.id === pos.cantiereId);
                                        return (
                                            <tr key={pos.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900">{cantiere?.nomeCantiere || 'Sconosciuto'}</td>
                                                <td className="px-4 py-3 truncate max-w-xs text-gray-600">{pos.nomeFile}</td>
                                                <td className="px-4 py-3 text-gray-500">{new Date(pos.createdAt?.toDate ? pos.createdAt.toDate() : pos.createdAt).toLocaleDateString()}</td>
                                                <td className="px-4 py-3">
                                                    <a href={pos.url} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-800 hover:underline flex items-center gap-1 font-medium">
                                                        <EyeIcon className="h-4 w-4"/> Visualizza
                                                    </a>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {posList.length === 0 && <p className="p-8 text-center text-gray-400">Nessun Piano Operativo Sicurezza (POS) caricato.</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* --- SEZIONE REGISTRO E SCADENZE DPI --- */}
            {view === 'dpi' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                            <ExclamationTriangleIcon className="h-6 w-6 text-orange-500"/>
                            Scadenziario Dispositivi (DPI)
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-gray-50 text-gray-600 uppercase border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3">DPI (Seriale)</th>
                                        <th className="px-4 py-3">In Carico A</th>
                                        <th className="px-4 py-3 text-center border-x bg-gray-50">Data Scadenza<br/><span className="text-[10px] font-normal lowercase">(Vita Utile)</span></th>
                                        <th className="px-4 py-3 text-center border-r bg-gray-50">Prossima Revisione<br/><span className="text-[10px] font-normal lowercase">(DPI 3° Cat.)</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {dpiScadenze.map(dpi => (
                                        <tr key={dpi.id} className={`hover:bg-gray-50 ${(dpi.isScaduto || dpi.isRevisioneScaduta) ? 'bg-red-50/50' : ''}`}>
                                            <td className="px-4 py-3">
                                                <p className="font-bold text-gray-900">{dpi.nome}</p>
                                                <p className="text-xs text-gray-500">
                                                    SN: {dpi.seriale || 'N/D'} {dpi.dettagli?.marca ? `- ${dpi.dettagli.marca}` : ''}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                {dpi.isAssegnato ? (
                                                    <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md">👤 {dpi.assegnatoANome}</span>
                                                ) : (
                                                    <span className="text-gray-500 italic">📦 Magazzino</span>
                                                )}
                                            </td>
                                            
                                            <td className="px-4 py-3 text-center border-x">
                                                {dpi.dataScadenzaFormatted !== 'N/D' ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-bold text-gray-700">{dpi.dataScadenzaFormatted}</span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 mt-1 rounded uppercase shadow-sm ${
                                                            dpi.isScaduto ? 'bg-red-500 text-white' : dpi.giorniScadenza < 30 ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-200 text-gray-700'
                                                        }`}>
                                                            {dpi.isScaduto ? 'Scaduto' : `Tra ${dpi.giorniScadenza} gg`}
                                                        </span>
                                                    </div>
                                                ) : <span className="text-gray-400">-</span>}
                                            </td>

                                            <td className="px-4 py-3 text-center border-r">
                                                {dpi.dataRevisioneFormatted !== 'Non Richiesta' ? (
                                                    <div className="flex flex-col items-center">
                                                        {dpi.dataRevisioneFormatted === "Inizia all'uso" ? (
                                                            <span className="text-gray-400 italic font-medium">Inizia all'uso</span>
                                                        ) : dpi.dataRevisioneFormatted === "In attesa di firma" ? (
                                                            <span className="text-orange-500 italic font-bold">In attesa di firma</span>
                                                        ) : (
                                                            <>
                                                                <span className="font-bold text-gray-700">{dpi.dataRevisioneFormatted}</span>
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 mt-1 rounded uppercase shadow-sm ${
                                                                    dpi.isRevisioneScaduta ? 'bg-red-500 text-white' : dpi.giorniRevisione < 30 ? 'bg-orange-400 text-white' : 'bg-green-100 text-green-800'
                                                                }`}>
                                                                    {dpi.isRevisioneScaduta ? 'Da Revisionare' : `Tra ${dpi.giorniRevisione} gg`}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                ) : <span className="text-gray-400 text-xs italic">Non Richiesta</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {dpiScadenze.length === 0 && <p className="p-8 text-center text-gray-400">Nessun DPI con dati di scadenza/revisione inserito a sistema.</p>}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold mb-4 text-gray-800">Storico Consegne DPI</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600 uppercase border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3">Dipendente</th>
                                        <th className="px-4 py-3">DPI Consegnato</th>
                                        <th className="px-4 py-3">Data Assegnazione</th>
                                        <th className="px-4 py-3 text-right">Azioni / Verbale PDF</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {dpiConsegnati.map(dpi => (
                                        <tr key={dpi.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-bold text-gray-900">{dpi.assegnatoA_Nome}</td>
                                            <td className="px-4 py-3 text-gray-600">{dpi.attrezzaturaNome || dpi.articoloNome || 'DPI'}</td>
                                            <td className="px-4 py-3 text-gray-500">
                                                {dpi.dataAssegnazione ? new Date(dpi.dataAssegnazione).toLocaleDateString('it-IT') : (dpi.createdAt?.toDate ? dpi.createdAt.toDate().toLocaleDateString('it-IT') : '-')}
                                            </td>
                                            <td className="px-4 py-3 flex items-center justify-end gap-2">
                                                {dpi.dataConferma || dpi.firmaUrl ? (
                                                    <>
                                                        <button 
                                                            onClick={() => setPreviewDpi(dpi)} 
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors border border-gray-300 shadow-sm"
                                                        >
                                                            <EyeIcon className="h-4 w-4" /> Anteprima
                                                        </button>
                                                        <PDFDownloadLink 
                                                            document={<VerbaleConsegnaDPI data={dpi} azienda={currentCompany} />} 
                                                            fileName={`Verbale_DPI_${dpi.assegnatoA_Nome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`}
                                                        >
                                                            {({ loading }) => (
                                                                <button 
                                                                    disabled={loading} 
                                                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm"
                                                                >
                                                                    <DocumentArrowDownIcon className="h-4 w-4" /> {loading ? 'Gener...' : 'Scarica'}
                                                                </button>
                                                            )}
                                                        </PDFDownloadLink>
                                                    </>
                                                ) : (
                                                    <span className="text-orange-600 font-semibold text-xs bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200 flex items-center w-max gap-1">
                                                        <ExclamationTriangleIcon className="h-4 w-4" /> In attesa di firma
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {dpiConsegnati.length === 0 && <p className="p-8 text-center text-gray-400">Nessun DPI assegnato in archivio.</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* --- VISTA: MATRICE FORMAZIONE & PERSONALE --- */}
            {view === 'formazione' && (
                <div className="space-y-6">
                    
                    {/* WIDGET ALLARMI */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                            <div className="p-3 bg-red-500 rounded-full text-white"><ExclamationTriangleIcon className="h-6 w-6"/></div>
                            <div>
                                <p className="text-sm font-bold text-red-800">Scaduti</p>
                                <p className="text-2xl font-black text-red-600">{formationAlerts.scaduti}</p>
                            </div>
                        </div>

                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                            <div className="p-3 bg-orange-400 rounded-full text-white"><ExclamationTriangleIcon className="h-6 w-6"/></div>
                            <div>
                                <p className="text-sm font-bold text-orange-800">In Scadenza (60gg)</p>
                                <p className="text-2xl font-black text-orange-600">{formationAlerts.scade}</p>
                            </div>
                        </div>

                        <div className="bg-gray-100 border border-gray-300 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                            <div className="p-3 bg-gray-500 rounded-full text-white"><XMarkIcon className="h-6 w-6"/></div>
                            <div>
                                <p className="text-sm font-bold text-gray-800">Assenti / Mancanti</p>
                                <p className="text-2xl font-black text-gray-600">{formationAlerts.assenti}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <AcademicCapIcon className="h-7 w-7 text-indigo-600"/>
                                Matrice delle Competenze Formative
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="flex gap-3 text-xs font-bold uppercase tracking-wider bg-gray-50 px-3 py-2 rounded-lg border">
                                    <span className="flex items-center gap-1 text-green-700"><div className="w-3 h-3 bg-green-500 rounded-full"></div> In Regola</span>
                                    <span className="flex items-center gap-1 text-orange-600"><div className="w-3 h-3 bg-orange-400 rounded-full"></div> In Scadenza</span>
                                    <span className="flex items-center gap-1 text-red-600"><div className="w-3 h-3 bg-red-500 rounded-full"></div> Scaduto</span>
                                    <span className="flex items-center gap-1 text-gray-600 font-medium">Assente</span>
                                </div>
                                <button 
                                    onClick={() => setIsDossierModalOpen(true)} 
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-colors text-sm"
                                >
                                    <DocumentDuplicateIcon className="h-5 w-5"/> Genera Dossier Gara
                                </button>
                                <button 
                                    onClick={exportToCSV} 
                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-colors text-sm"
                                >
                                    <TableCellsIcon className="h-5 w-5"/> Esporta Matrice
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-gray-100">
                            <table className="w-full text-[11px] text-left border-collapse">
                                <thead className="bg-gray-800 text-white uppercase">
                                    <tr>
                                        <th className="px-4 py-3 border-r border-gray-700 sticky left-0 bg-gray-800 z-10 w-48">Dipendente</th>
                                        <th className="px-2 py-3 text-center border-r border-gray-700 bg-gray-700">C.I. / P.S.</th>
                                        <th className="px-2 py-3 text-center border-r border-gray-700 bg-gray-700">Patente</th>
                                        {corsiMonitorati.map(corso => (
                                            <th key={corso.id} className="px-2 py-3 text-center border-r border-gray-700 min-w-[90px]">{corso.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => {
                                        const scadenze = u.documentiPersonali?.scadenze || {};
                                        const docIdentity = scadenze.permessoSoggiorno || scadenze.cartaIdentita;
                                        
                                        return (
                                            <tr key={u.id} className="hover:bg-gray-50 border-b">
                                                <td 
                                                    className="px-4 py-3 font-bold text-gray-900 border-r sticky left-0 bg-white z-10 cursor-pointer hover:bg-indigo-50 transition-colors group"
                                                    onClick={() => apriFascicolo(u)}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            {u.nome} {u.cognome}
                                                            <span className="block text-[9px] text-gray-500 font-normal uppercase">{u.ruolo}</span>
                                                        </div>
                                                        <DocumentMagnifyingGlassIcon className="h-5 w-5 text-indigo-300 group-hover:text-indigo-600"/>
                                                    </div>
                                                </td>

                                                <td className="px-1 py-3 text-center border-r">
                                                    {docIdentity ? (
                                                        <div className={`mx-auto w-20 py-1 rounded border font-bold ${getStatusColor(docIdentity)}`}>
                                                            {scadenze.permessoSoggiorno ? 'P.S.' : 'C.I.'}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-900 font-bold text-[10px]">ASSENTE</span>
                                                    )}
                                                </td>

                                                <td className="px-1 py-3 text-center border-r">
                                                    {scadenze.patente ? (
                                                        <div className={`mx-auto w-20 py-1 rounded border font-bold ${getStatusColor(scadenze.patente)}`}>
                                                            {u.documentiPersonali?.patente?.tipologia || 'Patente'}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-900 font-bold text-[10px]">ASSENTE</span>
                                                    )}
                                                </td>

                                                {corsiMonitorati.map(corso => {
                                                    const dataScadenza = scadenze[corso.id];
                                                    return (
                                                        <td key={corso.id} className="px-1 py-3 text-center border-r">
                                                            {dataScadenza ? (
                                                                <div className={`mx-auto w-20 py-1 rounded border font-bold shadow-sm ${getStatusColor(dataScadenza)}`}>
                                                                    {new Date(dataScadenza).toLocaleDateString('it-IT', {month:'2-digit', year:'2-digit'})}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-900 font-bold text-[10px]">ASSENTE</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {users.length === 0 && <p className="p-10 text-center text-gray-400 italic">Nessun dipendente censito nel database.</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODALE FASCICOLO PERSONALE CON DATI IN DIRETTA --- */}
            {selectedUserDocs && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                        <div className="flex justify-between items-center p-5 border-b bg-indigo-50">
                            <div>
                                <h3 className="font-bold text-indigo-900 text-lg flex items-center gap-2">
                                    <DocumentMagnifyingGlassIcon className="h-6 w-6"/> Fascicolo Personale
                                </h3>
                                <p className="text-sm font-semibold text-indigo-700">{selectedUserDocs.nome} {selectedUserDocs.cognome}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedUserDocs(null)} 
                                className="p-2 bg-white rounded-full text-gray-500 hover:text-red-500 shadow-sm"
                            >
                                <XMarkIcon className="h-5 w-5"/>
                            </button>
                        </div>
                        
                        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4 relative">
                            
                            {isFetchingDocs && (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 backdrop-blur-sm">
                                    <div className="flex flex-col items-center animate-pulse text-indigo-600">
                                        <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2"/>
                                        <p className="font-bold text-sm">Recupero allegati in corso...</p>
                                    </div>
                                </div>
                            )}

                            {selectedUserDocs.documentiPersonali?.corsiExtra?.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-sm font-bold text-gray-700 border-b pb-2 mb-3">Corsi Extra Registrati</h4>
                                    <ul className="space-y-2">
                                        {selectedUserDocs.documentiPersonali.corsiExtra.map((cx, idx) => (
                                            <li key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border text-sm">
                                                <span className="font-semibold text-gray-800">{cx.nome}</span>
                                                <span className={`px-2 py-1 rounded font-bold text-xs ${cx.scadenza ? getStatusColor(cx.scadenza) : 'bg-gray-200 text-gray-700'}`}>
                                                    {cx.scadenza ? new Date(cx.scadenza).toLocaleDateString('it-IT') : 'Nessuna scadenza'}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <h4 className="text-sm font-bold text-gray-700 border-b pb-2 mb-3">File e Attestati Caricati</h4>
                            {selectedUserDocs.documenti && selectedUserDocs.documenti.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {selectedUserDocs.documenti.map((docItem, idx) => (
                                        <a 
                                            key={idx} 
                                            href={docItem.url} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="flex items-center gap-3 p-3 border border-indigo-100 bg-white rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm group"
                                        >
                                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                <DocumentArrowDownIcon className="h-5 w-5"/>
                                            </div>
                                            <span className="text-sm font-medium text-gray-700 truncate">{docItem.nome}</span>
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                !isFetchingDocs && (
                                    <p className="text-gray-500 text-sm italic bg-gray-50 p-4 rounded-lg text-center border border-dashed">
                                        Nessun file o attestato caricato per questo dipendente.
                                    </p>
                                )
                            )}

                        </div>
                    </div>
                </div>
            )}

            {/* MODALE ANTEPRIMA VERBALE DPI */}
            {previewDpi && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 sm:p-6 animate-fade-in backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                            <div>
                                <h3 className="font-bold text-gray-800 text-lg">Anteprima Verbale DPI</h3>
                                <p className="text-xs text-gray-500">Dipendente: {previewDpi.assegnatoA_Nome}</p>
                            </div>
                            <button 
                                onClick={() => setPreviewDpi(null)} 
                                className="flex items-center gap-1 px-3 py-2 bg-gray-200 hover:bg-red-100 hover:text-red-600 text-gray-700 rounded-lg transition-colors font-semibold text-sm"
                            >
                                <XMarkIcon className="h-5 w-5" /> Chiudi
                            </button>
                        </div>
                        <div className="flex-1 w-full bg-gray-200">
                            <PDFViewer width="100%" height="100%" className="border-none">
                                <VerbaleConsegnaDPI data={previewDpi} azienda={currentCompany} />
                            </PDFViewer>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ MODALE DOSSIER GARA */}
            <DossierGaraModal 
                isOpen={isDossierModalOpen} 
                onClose={() => setIsDossierModalOpen(false)} 
                users={users} 
            />

        </div>
    );
};

export default SicurezzaContent;