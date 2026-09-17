import React, { useState, useMemo, useEffect } from 'react';
import { useFirebaseData } from 'shared-core';
import { 
    doc, setDoc, deleteDoc, updateDoc, increment, 
    serverTimestamp, collection, addDoc, query, where, onSnapshot, arrayUnion
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions'; 
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
    UserPlusIcon, MagnifyingGlassIcon, TrashIcon,
    ArchiveBoxArrowDownIcon, CalendarDaysIcon, 
    XMarkIcon, EyeIcon, ExclamationTriangleIcon, BellAlertIcon,
    AdjustmentsHorizontalIcon, DocumentArrowUpIcon,
    IdentificationIcon, WrenchScrewdriverIcon, CurrencyEuroIcon
} from '@heroicons/react/24/outline';

import { SignatureModal } from 'shared-ui'; 

// IMPORTA LE NUOVE MODALI MODULARI
import { ModaleCCNL } from './components/personale/ModaleCCNL.jsx';
import { ModaleMassiveLul } from './components/personale/ModaleMassiveLul.jsx';
import { ModaleArchiviazione } from './components/personale/ModaleArchiviazione.jsx';

// IMPORTA I TAB MODULARI
import { TabAnagrafica } from './components/personale/TabAnagrafica.jsx';
import { TabDotazioni } from './components/personale/TabDotazioni.jsx';
import { TabAmministrazione } from './components/personale/TabAmministrazione.jsx';

const getInitials = (nome = '', cognome = '') => `${nome?.charAt(0) || ''}${cognome?.charAt(0) || ''}`.toUpperCase() || '👤';

const formattaDataSafe = (dataRaw) => {
    if (!dataRaw) return 'N/D';
    if (typeof dataRaw.toDate === 'function') return dataRaw.toDate().toLocaleDateString('it-IT');
    return new Date(dataRaw).toLocaleDateString('it-IT');
};

const safeGetTime = (val) => {
    if (!val) return 0;
    if (typeof val.toDate === 'function') return val.toDate().getTime();
    return new Date(val).getTime() || 0;
};

const ROLE_CONFIG = {
    'proprietario': { label: 'Titolare / Admin', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    'amministrazione': { label: 'Amministrazione', color: 'bg-pink-100 text-pink-800 border-pink-200' },
    'tecnico': { label: 'Tecnico / Geometra', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    'preposto': { label: 'Preposto / Caposquadra', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    'operaio': { label: 'Dipendente', color: 'bg-green-100 text-green-800 border-green-200' }, 
    'ex_dipendente': { label: 'Ex Dipendente', color: 'bg-gray-100 text-gray-600 border-gray-300' }, 
    'default': { label: 'Non Definito', color: 'bg-gray-50 text-gray-500 border-gray-200' }
};

const DOC_CATEGORIES = [
    { id: 'identita', label: 'Documento Identità', icon: '🆔' },
    { id: 'fiscale', label: 'Codice Fiscale', icon: '💳' },
    { id: 'contratto', label: 'Contratto / UNILAV', icon: '📝' },
    { id: 'formazione', label: 'Attestato Formazione', icon: '🎓' },
    { id: 'specializzazione', label: 'Patentino', icon: '🏗️' },
    { id: 'visita', label: 'Idoneità Sanitaria', icon: '🩺' },
    { id: 'altro', label: 'Altro', icon: '📎' },
];

const MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const ANNI = [2024, 2025, 2026, 2027, 2028];

const INITIAL_USER_STATE = {
    nome: '', cognome: '', email: '', ruolo: 'operaio', costoOrario: '',
    telefonoAziendale: '', telefonoPrivato: '',
    nazionalita: 'Italiana', numeroPermessoSoggiorno: '', dataNascita: '',
    dataAssunzione: '', scadenzaContratto: '', noteRinnovo: '', attivo: true,
    contrattoApplicato: '', 
    percentualeLavoro: 100, 
    documentiPersonali: { scadenze: { cartaIdentita: '', patente: '', permessoSoggiorno: '' }, patente: { tipologia: '' } },
    domicilio: { domicilioUgualeResidenza: true, via: '', citta: '', cap: '', provincia: '' },
    residenza: { via: '', citta: '', cap: '', provincia: '' },
    contatori: { ferieMaturate: 0, ferieGodute: 0, permessiMaturati: 0, permessiGoduti: 0, residuiFeriePrec: 0, residuiPermessiPrec: 0 },
    documenti: [],
    bustePaga: []
};

export const PersonnelContent = () => {
    const { db, data, loadingData, companyID, user, app } = useFirebaseData();
    const users = data?.users || [];
    const assegnazioniMagazzino = data?.assegnazioniMagazzino || []; 
    const presenzeGlobali = data?.presenze || []; 
    const richiesteFeriePermessi = data?.richieste_ferie || []; 
    const storage = getStorage(app);

    const [view, setView] = useState('list'); 
    const [statusFilter, setStatusFilter] = useState('attivi'); 
    const [selectedUser, setSelectedUser] = useState(null);
    const [profileTab, setProfileTab] = useState('anagrafica'); 

    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const [uploadingFile, setUploadingFile] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('identita');
    const [docExpiryDate, setDocExpiryDate] = useState('');
    const [uploadingBusta, setUploadingBusta] = useState(false);
    
    const [bpMese, setBpMese] = useState(MESI[new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1]);
    const [bpAnno, setBpAnno] = useState(new Date().getFullYear());

    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [isContrattiModalOpen, setIsContrattiModalOpen] = useState(false);
    const [isMassiveLulModalOpen, setIsMassiveLulModalOpen] = useState(false);
    const [archivingUser, setArchivingUser] = useState(null); 
    const [isArchiviazioneModalOpen, setIsArchiviazioneModalOpen] = useState(false);
    
    // Stato per i contratti CCNL (necessario per il menu a tendina)
    const [contrattiCCNL, setContrattiCCNL] = useState([]);

    const currentUserData = useMemo(() => users.find(u => u.id === user?.uid || u.email === user?.email), [users, user]);
    const canViewCosts = ['proprietario', 'amministrazione'].includes(currentUserData?.ruolo);

    useEffect(() => {
        if (!db || !companyID) return;
        const q = query(collection(db, 'impostazioni_ccnl'), where('companyID', '==', companyID));
        const unsub = onSnapshot(q, (snap) => setContrattiCCNL(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => unsub();
    }, [db, companyID]);

    const dotazioniUtente = useMemo(() => {
        if (!selectedUser?.id) return { inUso: [], storico: [] };
        const dotazioniTrovate = assegnazioniMagazzino.filter(a => a.dipendenteId === selectedUser.id || a.assegnatoA === selectedUser.id);
        const dotazioniConDatiReali = dotazioniTrovate.map(dot => {
            let nomeDisplay = dot.articoloNome || dot.nomeArticolo || dot.attrezzaturaNome || dot.articolo?.nome || "Articolo Ignoto";
            let statoCalcolato = "Sconosciuto";
            let isStorico = false;
            if (dot.dataRientro || dot.dataRestituzione) {
                isStorico = true;
                statoCalcolato = (dot.dataRiparazione || dot.statoWorkflow === 'riparazione_completata') ? 'Restituito (Riparato)' : dot.dataGuasto ? 'Restituito (Guasto)' : 'Restituito';
            } else {
                isStorico = false;
                statoCalcolato = dot.dataGuasto ? 'In Uso (Guasto Segnalato)' : (dot.dataConferma || dot.confermaRicezione) ? 'In Uso' : 'Da Confermare (In Attesa)';
            }
            return { ...dot, nomeDisplay, statoDisplay: statoCalcolato, isStorico, dataOrdinamento: dot.dataRientro || dot.dataAssegnazione || dot.createdAt };
        });
        return {
            inUso: dotazioniConDatiReali.filter(a => !a.isStorico).sort((a,b) => new Date(b.dataOrdinamento || 0) - new Date(a.dataOrdinamento || 0)),
            storico: dotazioniConDatiReali.filter(a => a.isStorico).sort((a,b) => new Date(b.dataOrdinamento || 0) - new Date(a.dataOrdinamento || 0))
        };
    }, [assegnazioniMagazzino, selectedUser?.id]);

    const presenzeUtente = useMemo(() => {
        if (!selectedUser?.id) return [];
        return presenzeGlobali.filter(p => p.userId === selectedUser.id).sort((a, b) => safeGetTime(b.timestampInizio) - safeGetTime(a.timestampInizio)).slice(0, 30);
    }, [presenzeGlobali, selectedUser?.id]);

    const richiesteUtente = useMemo(() => {
        if (!selectedUser?.id) return [];
        return richiesteFeriePermessi.filter(r => r.userId === selectedUser.id).sort((a, b) => safeGetTime(b.createdAt) - safeGetTime(a.createdAt));
    }, [richiesteFeriePermessi, selectedUser?.id]);

    const handleRispostaRichiesta = async (richiesta, esito) => {
        if (!confirm(`Vuoi ${esito === 'approvata' ? 'approvare' : 'rifiutare'} questa richiesta?`)) return;
        setIsSaving(true);
        try {
            const richiestaRef = doc(db, 'richieste_ferie', richiesta.id);
            const userRef = doc(db, 'users', richiesta.userId);

            let valoreDaScalare = 0;
            if (richiesta.quantita) valoreDaScalare = parseFloat(richiesta.quantita);
            else if (richiesta.tipo === 'permesso' && richiesta.ore) valoreDaScalare = parseFloat(richiesta.ore);
            else if (richiesta.tipo === 'ferie' && richiesta.dataInizio) {
                const d1 = new Date(richiesta.dataInizio);
                const d2 = richiesta.dataFine ? new Date(richiesta.dataFine) : d1;
                valoreDaScalare = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
            }

            await updateDoc(richiestaRef, {
                stato: esito,
                approvatoDa: user.uid,
                nomeApprovatore: currentUserData ? `${currentUserData.nome} ${currentUserData.cognome}` : 'Amministrazione',
                updatedAt: serverTimestamp(), noteAdmin: ''
            });

            if (esito === 'approvata' && valoreDaScalare > 0) {
                const campoContatore = richiesta.tipo === 'ferie' ? 'contatori.ferieGodute' : 'contatori.permessiGoduti';
                await updateDoc(userRef, { [campoContatore]: increment(valoreDaScalare) });
                setSelectedUser(prev => ({
                    ...prev,
                    contatori: { ...prev.contatori, [richiesta.tipo === 'ferie' ? 'ferieGodute' : 'permessiGoduti']: (prev.contatori?.[richiesta.tipo === 'ferie' ? 'ferieGodute' : 'permessiGoduti'] || 0) + valoreDaScalare }
                }));
            }

            await addDoc(collection(db, 'notifiche'), {
                userId: richiesta.userId, mittenteId: user.uid, companyID: companyID || null,
                titolo: `Richiesta ${richiesta.tipo === 'ferie' ? 'Ferie' : 'Permesso'} ${esito === 'approvata' ? 'Approvata ✅' : 'Rifiutata ❌'}`,
                messaggio: `La tua richiesta di ${valoreDaScalare} ${richiesta.tipo === 'ferie' ? 'giorni' : 'ore'} (dal ${formattaDataSafe(richiesta.dataInizio)}) è stata ${esito} dall'amministrazione.`,
                tipo: 'ferie_permessi', letta: false, dataCreazione: serverTimestamp()
            });

            alert(`Richiesta ${esito} correttamente.`);
        } catch (error) { alert("Errore: " + error.message); } finally { setIsSaving(false); }
    };

    const handlePrintDotazioni = () => { /* ... Da implementare ... */ };

    const scadenzeGlobali = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const warningDays = 60; 
        let alerts = [];
        users.filter(u => u.attivo !== false).forEach(u => {
            const checkAndAdd = (dateString, type, label) => {
                if (!dateString) return;
                const expDate = new Date(dateString);
                const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
                if (diffDays <= warningDays) alerts.push({ id: `${u.id}-${type}`, user: u, userName: `${u.nome} ${u.cognome}`, type, label, dateString: expDate.toLocaleDateString('it-IT'), diffDays, status: diffDays < 0 ? 'scaduto' : 'in_scadenza' });
            };
            checkAndAdd(u.scadenzaContratto, 'contratto', 'Scadenza Contratto');
            checkAndAdd(u.documentiPersonali?.scadenze?.cartaIdentita, 'identita', 'Carta Identità');
            checkAndAdd(u.documentiPersonali?.scadenze?.patente, 'patente', 'Patente');
            checkAndAdd(u.documentiPersonali?.scadenze?.permessoSoggiorno, 'permesso', 'Permesso Soggiorno');
            if (Array.isArray(u.documenti)) u.documenti.forEach(doc => checkAndAdd(doc.dataScadenza, 'fascicolo', doc.nome));
        });
        return alerts.sort((a, b) => a.diffDays - b.diffDays);
    }, [users]);

    const stats = useMemo(() => {
        const attivi = users.filter(u => u.attivo !== false);
        return { 
            totali: attivi.length, 
            exDipendenti: users.filter(u => u.attivo === false).length, 
            operativi: attivi.filter(u => ['operaio', 'preposto'].includes(u.ruolo)).length, 
            costoMedio: attivi.length ? (attivi.reduce((acc, u) => acc + Number(u.costoOrario || 0), 0) / attivi.length).toFixed(2) : 0,
            allarmiScaduti: scadenzeGlobali.filter(s => s.status === 'scaduto').length,
            allarmiInScadenza: scadenzeGlobali.filter(s => s.status === 'in_scadenza').length
        };
    }, [users, scadenzeGlobali]);

    const filteredUsers = useMemo(() => {
        return users.filter(u => (statusFilter === 'attivi' ? u.attivo !== false : u.attivo === false) && (u.nome + ' ' + u.cognome).toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    }, [users, searchQuery, statusFilter]);

    const updateNestedField = (category, subCategory, field, value) => {
        setSelectedUser(prev => {
            const updated = { ...prev };
            if (!updated[category]) updated[category] = {};
            if (subCategory) {
                if (!updated[category][subCategory]) updated[category][subCategory] = {};
                updated[category][subCategory][field] = value;
            } else { updated[category][field] = value; }
            return updated;
        });
    };

    const applicaRinnovo = (azione) => {
        if (!selectedUser) return;
        const dataOggi = new Date().toLocaleDateString('it-IT');
        let noteAttuali = selectedUser.noteRinnovo ? selectedUser.noteRinnovo + '\n' : '';
        if (azione === 'indeterminato') {
            setSelectedUser(prev => ({ ...prev, scadenzaContratto: '', noteRinnovo: noteAttuali + `[${dataOggi}] Trasformato a Indeterminato.` }));
        } else {
            let dataBase = selectedUser.scadenzaContratto ? new Date(selectedUser.scadenzaContratto) : new Date();
            dataBase.setMonth(dataBase.getMonth() + parseInt(azione));
            setSelectedUser(prev => ({ ...prev, scadenzaContratto: dataBase.toISOString().split('T')[0], noteRinnovo: noteAttuali + `[${dataOggi}] Prorogato di ${azione} mesi (Fino al ${dataBase.toLocaleDateString('it-IT')}).` }));
        }
    };

    const handleAutoCalcoloMaturati = () => {
        if (!selectedUser?.dataAssunzione) return alert("Devi prima inserire la 'Data Assunzione' nel tab Anagrafica.");
        if (!selectedUser?.contrattoApplicato) return alert("Devi prima selezionare un 'Contratto Applicato' nel tab Anagrafica.");
        
        const contrattoScelto = contrattiCCNL.find(c => c.id === selectedUser.contrattoApplicato);
        if (!contrattoScelto) return alert("Il contratto selezionato non esiste più nel database.");

        let dataInizio;
        if (typeof selectedUser.dataAssunzione.toDate === 'function') dataInizio = selectedUser.dataAssunzione.toDate();
        else dataInizio = new Date(selectedUser.dataAssunzione);
        dataInizio.setHours(0, 0, 0, 0); 
        
        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);
        const inizioAnnoCorrente = new Date(oggi.getFullYear(), 0, 1);
        
        if (dataInizio > oggi) return alert("La data di assunzione inserita è nel futuro!");
        
        const percentualePartTime = (selectedUser.percentualeLavoro || 100) / 100;
        const ferieAnnueBase = Number(contrattoScelto.ferieAnnueGG) || 0; 
        const permessiAnnuiBase = Number(contrattoScelto.permessiAnnuiH) || 0; 

        let ferieResidue = 0;
        let permessiResidui = 0;
        let ferieCorrenti = 0;
        let permessiCorrenti = 0;

        if (dataInizio < inizioAnnoCorrente) {
            const fineAnnoScorso = new Date(oggi.getFullYear() - 1, 11, 31);
            const giorniLavoratiPassati = Math.floor((fineAnnoScorso - dataInizio) / (1000 * 60 * 60 * 24));
            const frazioneAnniPassati = giorniLavoratiPassati / 365.25;

            ferieResidue = frazioneAnniPassati * ferieAnnueBase * percentualePartTime;
            permessiResidui = frazioneAnniPassati * permessiAnnuiBase * percentualePartTime;

            const giorniLavoratiCorrenti = Math.floor((oggi - inizioAnnoCorrente) / (1000 * 60 * 60 * 24));
            const frazioneAnnoCorrente = giorniLavoratiCorrenti / 365.25;

            ferieCorrenti = frazioneAnnoCorrente * ferieAnnueBase * percentualePartTime;
            permessiCorrenti = frazioneAnnoCorrente * permessiAnnuiBase * percentualePartTime;

        } else {
            const giorniLavoratiCorrenti = Math.floor((oggi - dataInizio) / (1000 * 60 * 60 * 24));
            const frazioneAnnoCorrente = giorniLavoratiCorrenti / 365.25;

            ferieCorrenti = frazioneAnnoCorrente * ferieAnnueBase * percentualePartTime;
            permessiCorrenti = frazioneAnnoCorrente * permessiAnnuiBase * percentualePartTime;
        }

        ferieResidue = parseFloat(ferieResidue.toFixed(1));
        permessiResidui = Math.round(permessiResidui);
        ferieCorrenti = parseFloat(ferieCorrenti.toFixed(1));
        permessiCorrenti = Math.round(permessiCorrenti);

        const message = `⏱️ CALCOLO AUTOMATICO RATEI COMPLETO\n\n` +
                        `📌 Anno Corrente (${oggi.getFullYear()}):\n` +
                        `- Ferie Maturate: ${ferieCorrenti} gg\n` +
                        `- Permessi Maturati: ${permessiCorrenti} h\n\n` +
                        `🕰️ Residui Anni Precedenti (dal ${dataInizio.getFullYear()}):\n` +
                        `- Ferie Residue: ${ferieResidue} gg\n` +
                        `- Permessi Residui: ${permessiResidui} h\n\n` +
                        `Vuoi applicare questi valori? (Le ore "Godute" non verranno toccate)`;

        if(confirm(message)) {
            setSelectedUser(prev => ({
                ...prev,
                contatori: {
                    ...prev.contatori,
                    ferieMaturate: ferieCorrenti,
                    permessiMaturati: permessiCorrenti,
                    residuiFeriePrec: ferieResidue,
                    residuiPermessiPrec: permessiResidui
                }
            }));
        }
    };

    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file || !selectedUser?.id) return alert("Salva prima il profilo base.");
        
        if (type === 'bustapaga') {
            setUploadingBusta(true);
            try {
                const fileRef = ref(storage, `users/${selectedUser.id}/bustepaga/${bpAnno}_${bpMese}_${file.name}`);
                await uploadBytes(fileRef, file);
                const url = await getDownloadURL(fileRef);
                const newBusta = { id: Date.now().toString(), nome: file.name, mese: bpMese, anno: bpAnno, url, caricatoIl: new Date().toISOString() };
                setSelectedUser(prev => ({ ...prev, bustePaga: [...(prev.bustePaga || []), newBusta] }));
            } catch (error) { alert(error.message); } finally { setUploadingBusta(false); }
        } else {
            setUploadingFile(true);
            try {
                const fileRef = ref(storage, `users/${selectedUser.id}/documents/${selectedCategory}/${Date.now()}_${file.name}`);
                await uploadBytes(fileRef, file);
                const url = await getDownloadURL(fileRef);
                setSelectedUser(prev => ({ ...prev, documenti: [...(prev.documenti || []), { id: Date.now().toString(), nome: file.name, url, categoria: selectedCategory, dataScadenza: docExpiryDate || null, caricatoIl: new Date().toISOString() }] }));
                setDocExpiryDate('');
            } catch (error) { alert(error.message); } finally { setUploadingFile(false); }
        }
    };

    const handleSignatureConfirm = async (blob) => {
        setIsSignatureModalOpen(false);
        if (!selectedUser?.id) return alert("Salva il profilo base prima.");
        setIsSaving(true);
        try {
            const fileRef = ref(storage, `users/${selectedUser.id}/firma/firma_${Date.now()}.png`);
            await uploadBytes(fileRef, blob);
            const url = await getDownloadURL(fileRef);
            setSelectedUser(prev => ({ ...prev, firmaUrl: url }));
            alert("Firma acquisita!");
        } catch (error) { alert(error.message); } finally { setIsSaving(false); }
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            let docId = selectedUser.id;
            if (!docId || selectedUser.password) {
                const manageUserAuthFn = httpsCallable(getFunctions(app), 'manageUserAuth'); 
                const result = await manageUserAuthFn({ email: selectedUser.email, password: selectedUser.password || null, nome: selectedUser.nome, cognome: selectedUser.cognome });
                docId = result.data.uid; 
            }
            const payload = { 
                ...selectedUser, 
                id: docId, companyID, updatedAt: new Date().toISOString(),
                contrattoApplicato: selectedUser.contrattoApplicato || '',
                percentualeLavoro: Number(selectedUser.percentualeLavoro) || 100,
                contatori: selectedUser.contatori || { ferieMaturate: 0, ferieGodute: 0, permessiMaturati: 0, permessiGoduti: 0, residuiFeriePrec: 0, residuiPermessiPrec: 0 }
            };
            delete payload.password; 
            if (canViewCosts) payload.costoOrario = Number(selectedUser.costoOrario || 0);
            await setDoc(doc(db, 'users', docId), payload, { merge: true });
            setView('list');
        } catch (error) { alert(`Errore: ${error.message}`); } finally { setIsSaving(false); }
    };

    const handleDeleteUser = async (id) => {
        if(confirm("Attenzione: Questa azione eliminerà DEFINITIVAMENTE il dipendente. Procedere?")) await deleteDoc(doc(db, 'users', id));
    };

    const openArchiviazioneModal = (u) => {
        setArchivingUser(u);
        setIsArchiviazioneModalOpen(true);
    };

    // ==========================================
    // 🎨 RENDER SCHERMATE
    // ==========================================
    if (loadingData) return <div className="p-8 text-center text-gray-500 animate-pulse">Caricamento...</div>;

    if (view === 'form') {
        const isNewUser = !selectedUser?.id;
        const isStorico = selectedUser?.attivo === false;

        return (
            <div className="p-4 md:p-8 max-w-6xl mx-auto animate-fade-in-down pb-24">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                            {isNewUser ? 'Nuova Assunzione' : `${selectedUser.nome} ${selectedUser.cognome}`}
                            {isStorico && <span className="bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-bold border border-red-200">ARCHIVIATO</span>}
                        </h2>
                        {!isNewUser && <p className="text-gray-500 font-medium text-sm mt-1">{ROLE_CONFIG[selectedUser.ruolo]?.label} | {selectedUser.email}</p>}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setView('list')} className="px-5 py-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-all">← Indietro</button>
                        {!isStorico && <button onClick={handleSaveUser} disabled={isSaving} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2">
                            {isSaving ? 'Salvataggio...' : 'Salva Modifiche'}
                        </button>}
                    </div>
                </div>

                {isStorico && selectedUser.datiUscita && (
                    <div className="mb-6 p-5 bg-red-50 border border-red-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-inner">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-white rounded-full shadow-sm"><ArchiveBoxArrowDownIcon className="h-6 w-6 text-red-500" /></div>
                            <div>
                                <h4 className="text-red-900 font-extrabold">Rapporto concluso il {new Date(selectedUser.datiUscita.dataUscita).toLocaleDateString('it-IT')}</h4>
                                <p className="text-sm text-red-700 mt-1"><span className="font-bold">Motivo:</span> {selectedUser.datiUscita.motivo.toUpperCase()}</p>
                                {selectedUser.datiUscita.note && <p className="text-sm text-red-700 mt-0.5"><span className="font-bold">Note:</span> {selectedUser.datiUscita.note}</p>}
                            </div>
                        </div>
                        {selectedUser.datiUscita.materialeRestituito && (
                            <div className="bg-white px-5 py-3 rounded-xl border border-red-100 shadow-sm text-right">
                                <p className="text-xs font-extrabold text-green-600 uppercase mb-1 flex items-center justify-end gap-1">✓ Materiale Riconsegnato</p>
                                <p className="text-[10px] text-gray-500">Confermato da: {selectedUser.datiUscita.materialeConfermatoDaNome}</p>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto pb-px">
                    <button onClick={() => setProfileTab('anagrafica')} className={`px-4 py-3 font-bold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${profileTab === 'anagrafica' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-gray-500 hover:text-gray-800'}`}><IdentificationIcon className="h-5 w-5"/> Anagrafica e Contratti</button>
                    <button disabled={isNewUser} onClick={() => !isNewUser && setProfileTab('dotazioni')} className={`px-4 py-3 font-bold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${isNewUser ? 'opacity-50 cursor-not-allowed' : ''} ${profileTab === 'dotazioni' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-gray-500 hover:text-gray-800'}`}><WrenchScrewdriverIcon className="h-5 w-5"/> Dotazioni e App</button>
                    {canViewCosts && <button disabled={isNewUser} onClick={() => !isNewUser && setProfileTab('amministrazione')} className={`px-4 py-3 font-bold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${isNewUser ? 'opacity-50 cursor-not-allowed' : ''} ${profileTab === 'amministrazione' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-gray-500 hover:text-gray-800'}`}><CurrencyEuroIcon className="h-5 w-5"/> Presenze e Cedolini</button>}
                </div>

                <div className={`space-y-6 ${isStorico ? 'opacity-90 pointer-events-none' : ''}`}>
                    
                    {profileTab === 'anagrafica' && (
                        <TabAnagrafica 
                            selectedUser={selectedUser} setSelectedUser={setSelectedUser}
                            isNewUser={isNewUser} isStorico={isStorico} canViewCosts={canViewCosts}
                            updateNestedField={updateNestedField} applicaRinnovo={applicaRinnovo}
                            selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
                            docExpiryDate={docExpiryDate} setDocExpiryDate={setDocExpiryDate}
                            uploadingFile={uploadingFile} handleFileUpload={handleFileUpload}
                            DOC_CATEGORIES={DOC_CATEGORIES} contrattiCCNL={contrattiCCNL}
                        />
                    )}

                    {profileTab === 'dotazioni' && (
                        <TabDotazioni 
                            selectedUser={selectedUser} setSelectedUser={setSelectedUser}
                            isNewUser={isNewUser} isStorico={isStorico} 
                            dotazioniUtente={dotazioniUtente} handlePrintDotazioni={handlePrintDotazioni}
                            setIsSignatureModalOpen={setIsSignatureModalOpen}
                        />
                    )}

                    {profileTab === 'amministrazione' && (
                        <TabAmministrazione 
                            selectedUser={selectedUser} setSelectedUser={setSelectedUser}
                            isNewUser={isNewUser} isStorico={isStorico} canViewCosts={canViewCosts}
                            updateNestedField={updateNestedField} handleAutoCalcoloMaturati={handleAutoCalcoloMaturati}
                            richiesteUtente={richiesteUtente} handleRispostaRichiesta={handleRispostaRichiesta}
                            bpMese={bpMese} setBpMese={setBpMese} bpAnno={bpAnno} setBpAnno={setBpAnno}
                            MESI={MESI} ANNI={ANNI} uploadingBusta={uploadingBusta} handleFileUpload={handleFileUpload}
                            presenzeUtente={presenzeUtente}
                        />
                    )}
                </div>
                
                <SignatureModal isOpen={isSignatureModalOpen} onClose={() => setIsSignatureModalOpen(false)} onConfirm={handleSignatureConfirm} itemName={`Fascicolo: ${selectedUser?.nome}`} />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 animate-fade-in pb-20 relative">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div><h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Risorse Umane</h1><p className="text-gray-500">Gestione anagrafiche, DPI, Buste Paga e Scadenziario.</p></div>
                {canViewCosts && (
                    <div className="flex gap-3">
                        <button onClick={() => setIsMassiveLulModalOpen(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 font-bold shadow-md transition-all">
                            <DocumentArrowUpIcon className="h-5 w-5"/> Upload Multiplo LUL
                        </button>
                        <button onClick={() => setIsContrattiModalOpen(true)} className="flex items-center gap-2 bg-white text-gray-800 border border-gray-300 px-4 py-2.5 rounded-xl hover:bg-gray-50 font-bold shadow-sm transition-all">
                            <AdjustmentsHorizontalIcon className="h-5 w-5"/> CCNL
                        </button>
                        <button onClick={() => { setSelectedUser({...INITIAL_USER_STATE}); setView('form'); setProfileTab('anagrafica'); }} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 font-bold shadow-md transition-all">
                            <UserPlusIcon className="h-5 w-5"/> Assumi
                        </button>
                    </div>
                )}
            </div>

            {statusFilter === 'scadenze' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4"><div className="p-3 bg-gray-100 text-gray-600 rounded-xl"><CalendarDaysIcon className="h-8 w-8"/></div><div><p className="text-xs font-bold text-gray-400 uppercase">Totale Alert</p><p className="text-2xl font-extrabold text-gray-900">{scadenzeGlobali.length}</p></div></div>
                    <div className="bg-red-50 p-5 rounded-2xl shadow-sm border border-red-100 flex items-center gap-4"><div className="p-3 bg-red-100 text-red-600 rounded-xl"><ExclamationTriangleIcon className="h-8 w-8"/></div><div><p className="text-xs font-bold text-red-400 uppercase">Documenti Scaduti</p><p className="text-2xl font-extrabold text-red-700">{stats.allarmiScaduti}</p></div></div>
                    <div className="bg-yellow-50 p-5 rounded-2xl shadow-sm border border-yellow-100 flex items-center gap-4"><div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl"><BellAlertIcon className="h-8 w-8"/></div><div><p className="text-xs font-bold text-yellow-500 uppercase">In Scadenza (60gg)</p><p className="text-2xl font-extrabold text-yellow-700">{stats.allarmiInScadenza}</p></div></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border"><p className="text-xs font-bold text-gray-400 uppercase">Forza Lavoro Attiva</p><p className="text-2xl font-extrabold text-gray-900">{stats.totali}</p></div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border"><p className="text-xs font-bold text-gray-400 uppercase">Operativi</p><p className="text-2xl font-extrabold text-green-700">{stats.operativi}</p></div>
                    {canViewCosts && <div className="bg-white p-5 rounded-2xl shadow-sm border"><p className="text-xs font-bold text-gray-400 uppercase">Costo Medio /h</p><p className="text-2xl font-extrabold text-orange-700">€{stats.costoMedio}</p></div>}
                    <div className="bg-gray-50 p-5 rounded-2xl shadow-sm border"><p className="text-xs font-bold text-gray-400 uppercase">Storico Ex-Dipendenti</p><p className="text-2xl font-extrabold text-gray-500">{stats.exDipendenti}</p></div>
                </div>
            )}

            <div className="flex gap-6 mb-4 border-b border-gray-200 overflow-x-auto">
                <button onClick={() => setStatusFilter('attivi')} className={`pb-3 px-2 font-bold text-sm border-b-2 transition-all whitespace-nowrap ${statusFilter === 'attivi' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Personale Attivo</button>
                <button onClick={() => setStatusFilter('storico')} className={`pb-3 px-2 font-bold text-sm border-b-2 transition-all whitespace-nowrap ${statusFilter === 'storico' ? 'border-gray-600 text-gray-800' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Archivio Storico</button>
                <button onClick={() => setStatusFilter('scadenze')} className={`pb-3 px-2 font-bold text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${statusFilter === 'scadenze' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-400 hover:text-red-500'}`}>
                    Scadenziario HR {scadenzeGlobali.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{scadenzeGlobali.length}</span>}
                </button>
            </div>

            {statusFilter === 'scadenze' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-50/80"><tr className="border-b text-gray-500 font-bold uppercase text-[10px] tracking-widest"><th className="px-6 py-4">Dipendente</th><th className="px-6 py-4">Tipo Documento</th><th className="px-6 py-4 text-center">Data Scadenza</th><th className="px-6 py-4">Stato</th><th className="px-6 py-4"></th></tr></thead>
                        <tbody className="divide-y divide-gray-100">
                            {scadenzeGlobali.length === 0 ? <tr><td colSpan="5" className="p-8 text-center text-gray-400 font-medium">Nessuna scadenza critica nei prossimi 60 giorni.</td></tr> : 
                             scadenzeGlobali.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-900">{item.userName}</td>
                                    <td className="px-6 py-4 font-medium text-gray-600">{item.label}</td>
                                    <td className="px-6 py-4 text-center font-mono">{item.dateString}</td>
                                    <td className="px-6 py-4">
                                        {item.status === 'scaduto' ? <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 w-max"><ExclamationTriangleIcon className="h-3 w-3"/> SCADUTO DA {Math.abs(item.diffDays)} GG</span> : <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 w-max"><BellAlertIcon className="h-3 w-3"/> SCADE TRA {item.diffDays} GG</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right"><button onClick={() => { setSelectedUser({...item.user}); setView('form'); setProfileTab('anagrafica'); }} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100">Risolvi</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b bg-gray-50/50 flex items-center gap-3"><MagnifyingGlassIcon className="h-5 w-5 text-gray-400" /><input type="text" placeholder="Cerca..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 border-none focus:ring-0 text-sm bg-transparent" /></div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm"><thead className="bg-gray-50/80"><tr className="border-b text-gray-500 font-bold uppercase text-[10px] tracking-widest"><th className="px-6 py-4">Dipendente</th><th className="px-6 py-4 text-center">Contratto</th><th className="px-6 py-4 text-center">Ruolo</th>{canViewCosts && <th className="px-6 py-4 text-right">Costo /h</th>}<th className="px-6 py-4"></th></tr></thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map(u => {
                                const conf = ROLE_CONFIG[u.ruolo] || ROLE_CONFIG['default'];
                                return (
                                    <tr key={u.id} className={`transition-colors group ${u.attivo === false ? 'bg-gray-50 opacity-70' : 'hover:bg-indigo-50/20'}`}>
                                        <td className="px-6 py-4 flex items-center gap-4"><div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${u.attivo === false ? 'bg-gray-400' : 'bg-indigo-600'}`}>{getInitials(u.nome, u.cognome)}</div><div><div className="font-bold text-gray-900">{u.nome} {u.cognome}</div><div className="text-[10px] text-gray-400">{u.email}</div></div></td>
                                        <td className="px-6 py-4 text-center">
                                            {u.attivo === false ? <span className="text-red-600 font-bold text-[10px]">USCITO: {new Date(u.datiUscita?.dataUscita).toLocaleDateString('it-IT')}</span> : 
                                            u.scadenzaContratto ? <span className="text-blue-600 font-bold text-[10px]">Scad. {new Date(u.scadenzaContratto).toLocaleDateString('it-IT')}</span> : <span className="text-emerald-600 font-bold text-[10px]">Indeterminato</span>}
                                        </td>
                                        <td className="px-6 py-4 text-center"><span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${conf.color}`}>{conf.label}</span></td>
                                        {canViewCosts && <td className="px-6 py-4 text-right font-extrabold text-gray-900">€ {Number(u.costoOrario || 0).toFixed(2)}</td>}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => { setSelectedUser({...INITIAL_USER_STATE, ...u}); setView('form'); setProfileTab('anagrafica'); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><EyeIcon className="h-4 w-4"/></button>
                                                {u.attivo !== false ? (
                                                    <button onClick={() => openArchiviazioneModal(u)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Dimetti / Licenzia"><ArchiveBoxArrowDownIcon className="h-5 w-5"/></button>
                                                ) : (
                                                    <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Elimina fisicamente dal Database"><TrashIcon className="h-4 w-4"/></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody></table>
                    </div>
                </div>
            )}

            {/* RICHIAMO DELLE NUOVE MODALI MODULARI */}
            <ModaleCCNL 
                isOpen={isContrattiModalOpen} 
                onClose={() => setIsContrattiModalOpen(false)} 
                db={db} companyID={companyID} 
            />
            
            <ModaleMassiveLul 
                isOpen={isMassiveLulModalOpen} 
                onClose={() => setIsMassiveLulModalOpen(false)} 
                users={users} db={db} storage={storage} 
            />

            <ModaleArchiviazione 
                isOpen={isArchiviazioneModalOpen} 
                onClose={() => setIsArchiviazioneModalOpen(false)}
                archivingUser={archivingUser}
                currentUserData={currentUserData}
                userAuth={user}
                db={db} app={app}
                onSuccess={() => { setIsArchiviazioneModalOpen(false); setStatusFilter('storico'); setArchivingUser(null); alert("✅ Dipendente archiviato."); }}
            />
        </div>
    );
};