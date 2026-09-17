import { useState, useMemo } from 'react';

export const useAnalisiCommessaManager = (
    cantieri = [],
    fattureVendita = [],
    fattureAcquisto = [],
    presenze = [],
    offerte = [],
    programmazione = [], 
    users = [],          
    attrezzature = [],   
    settings = {},
    assegnazioniCantieri = [],
    movimentiMagazzino = [],
    reports = [],
    salData = [] 
) => {
    
    const [dateRange, setDateRange] = useState({
        start: '2023-01-01', 
        end: new Date(new Date().getFullYear() + 1, 11, 31).toISOString().split('T')[0]
    });
    const [filtroCantiereId, setFiltroCantiereId] = useState('azienda');

    const isInRange = (dateObj) => {
        if (!dateObj) return false;
        const d = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
        if (isNaN(d.getTime())) return false; 
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999); 
        return d >= start && d <= end;
    };

    const capacityPlanning = useMemo(() => {
        const today = new Date(); today.setHours(0,0,0,0);
        const in7Days = new Date(today); in7Days.setDate(in7Days.getDate() + 7);
        const in30Days = new Date(today); in30Days.setDate(in30Days.getDate() + 30);
        const in90Days = new Date(today); in90Days.setDate(in90Days.getDate() + 90);

        const numeroOperatori = users.length;
        const capacita7Giorni = numeroOperatori * 40; 
        const capacita30Giorni = numeroOperatori * 160;
        const capacita90Giorni = numeroOperatori * 480;

        let carico7Giorni = 0; let carico30Giorni = 0; let carico90Giorni = 0;

        programmazione.forEach(task => {
            if (!task.dataInizio) return;
            const start = task.dataInizio.toDate ? task.dataInizio.toDate() : new Date(task.dataInizio);
            const numPersoneAssegnate = task.risorseAssegnate?.personale?.length || 1;
            const oreConsumate = (Number(task.durataOre) || 8) * numPersoneAssegnate;

            if (start >= today) {
                if (start <= in7Days) carico7Giorni += oreConsumate;
                if (start <= in30Days) carico30Giorni += oreConsumate;
                if (start <= in90Days) carico90Giorni += oreConsumate;
            }
        });

        return {
            settimanale: { capacita: capacita7Giorni, carico: carico7Giorni, sat: capacita7Giorni > 0 ? Math.round((carico7Giorni / capacita7Giorni) * 100) : 0 },
            mensile: { capacita: capacita30Giorni, carico: carico30Giorni, sat: capacita30Giorni > 0 ? Math.round((carico30Giorni / capacita30Giorni) * 100) : 0 },
            trimestrale: { capacita: capacita90Giorni, carico: carico90Giorni, sat: capacita90Giorni > 0 ? Math.round((carico90Giorni / capacita90Giorni) * 100) : 0 }
        };
    }, [programmazione, users]);

    const calcolaKPI = (targetCantiereId) => {
        let kpi = {
            ricaviReali: 0, costiMateriali: 0, costiNoleggi: 0, costiManodopera: 0,
            costiAttrezzatura: 0, costiGenerali: 0, totaleCostiDiretti: 0, totaleCostiPieni: 0,
            
            // ✅ NUOVI CAMPI SUBAPPALTI E VARIANTI
            costiSubappalti: 0, 
            valoreVarianti: 0,
            costiVarianti: 0,

            margineOperativo: 0, margineNetto: 0, marginePerc: 0, oreLavorate: 0,
            budgetRicaviIniziale: 0, budgetCostiIniziale: 0, // Conserviamo la base
            budgetRicavi: 0, budgetCosti: 0, margineBudget: 0, residuoCosti: 0,
            residuoRicavi: 0, margineAfinire: 0, margineAfinirePerc: 0, 
            ricaviDaSAL: 0, percentualeAvanzamento: 0,
            fatturatoVendite: 0, incassatoVendite: 0, creditiVersoClienti: 0, lavoriDaFatturare: 0, 
            fatturatoAcquisti: 0, pagatoAcquisti: 0, debitiVersoFornitori: 0,
            costoFinaleStimato: 0, varianzaCosti: 0, margineFinaleStimato: 0,
            produttivita: { resaOraria: 0, cpi: 0 },
            tempistiche: { startD: null, endD: null, giorniTotali: 0, giorniTrascorsi: 0, giorniMancanti: 0, percTempoTrascorso: 0, inRitardo: false },
            cashFlow: { in: { scadute: 0, d30: 0, d60: 0, d90: 0, oltre: 0 }, out: { scadute: 0, d30: 0, d60: 0, d90: 0, oltre: 0 }, net: { scadute: 0, d30: 0, d60: 0, d90: 0, oltre: 0 } },
            
            // ✅ NUOVI ARRAY DI DETTAGLIO
            items: [], dettaglioRicavi: [], dettaglioMateriali: [], dettaglioManodopera: [], dettaglioAttrezzature: [], dettaglioSubappalti: []
        };

        const getCantiereNome = (cId) => {
            const c = cantieri.find(c => c.id === cId);
            return c ? (c.nomeCantiere || c.nome || c.titolo || '') : '';
        };

        const addDetail = (category, detail, cantiereId) => {
            const fullDetail = { ...detail, category, cantiereNome: getCantiereNome(cantiereId) };
            kpi.items.push(fullDetail);
            if (category === 'ricavi') kpi.dettaglioRicavi.push(fullDetail);
            if (category === 'materiali') kpi.dettaglioMateriali.push(fullDetail);
            if (category === 'manodopera') kpi.dettaglioManodopera.push(fullDetail);
            if (category === 'attrezzature') kpi.dettaglioAttrezzature.push(fullDetail);
            if (category === 'subappalti') kpi.dettaglioSubappalti.push(fullDetail); // ✅
        };

        const costiRuoli = { operaio: settings.costoOrarioOperaio || 25, tecnico: settings.costoOrarioTecnico || 35, preposto: settings.costoOrarioPreposto || 40, default: 30 };
        const today = new Date(); today.setHours(0,0,0,0);
        const getDaysDiff = (dataScadenza, fallback) => {
            let dStr = dataScadenza;
            if (!dStr) { const fD = new Date(fallback || today); fD.setDate(fD.getDate() + 30); dStr = fD.toISOString().split('T')[0]; }
            const d = new Date(dStr); d.setHours(0,0,0,0);
            return Math.floor((d - today) / (1000 * 60 * 60 * 24));
        };

        const assegnaBucketCassa = (importo, days, tipo) => {
            if (days < 0) kpi.cashFlow[tipo].scadute += importo;
            else if (days <= 30) kpi.cashFlow[tipo].d30 += importo;
            else if (days <= 60) kpi.cashFlow[tipo].d60 += importo;
            else if (days <= 90) kpi.cashFlow[tipo].d90 += importo;
            else kpi.cashFlow[tipo].oltre += importo;
        };

        // ✅ GESTIONE BUDGET E VARIANTI IN CORSO D'OPERA
        let cantiereSpecifico = null;
        if (targetCantiereId !== 'azienda') {
            cantiereSpecifico = cantieri.find(c => c.id === targetCantiereId);
            if (cantiereSpecifico) {
                // Budget Base
                kpi.budgetRicaviIniziale = Number(cantiereSpecifico.valoreAppalto || 0);
                kpi.budgetCostiIniziale = Number(cantiereSpecifico.budgetCosti || 0);

                // Calcolo Varianti (Cerchiamo array 'varianti' nel cantiere)
                const varianti = cantiereSpecifico.varianti || [];
                varianti.forEach(v => {
                    // Contiamo solo le varianti approvate
                    if (v.stato === 'approvata' || v.stato === 'Approvata') {
                        const imp = Number(v.importo || v.valore || 0);
                        const costoStim = Number(v.costoStimato || v.budget || 0);
                        kpi.valoreVarianti += imp;
                        kpi.costiVarianti += costoStim;
                    }
                });

                // Aggiorniamo il Budget Ufficiale!
                kpi.budgetRicavi = kpi.budgetRicaviIniziale + kpi.valoreVarianti;
                kpi.budgetCosti = kpi.budgetCostiIniziale + kpi.costiVarianti;

                // Calcolo Tempistiche
                const sRaw = cantiereSpecifico.dataPresuntaInizio || cantiereSpecifico.dataInizioLavori || cantiereSpecifico.dataInizio;
                const eRaw = cantiereSpecifico.dataFinePresunta || cantiereSpecifico.dataTeoricaFine || cantiereSpecifico.dataFine;
                if (sRaw) kpi.tempistiche.startD = sRaw.toDate ? sRaw.toDate() : new Date(sRaw);
                if (eRaw) kpi.tempistiche.endD = eRaw.toDate ? eRaw.toDate() : new Date(eRaw);
                else if (kpi.tempistiche.startD && cantiereSpecifico.durataGiorniPrevisti) {
                    kpi.tempistiche.endD = new Date(kpi.tempistiche.startD); kpi.tempistiche.endD.setDate(kpi.tempistiche.endD.getDate() + Number(cantiereSpecifico.durataGiorniPrevisti));
                }

                if (kpi.tempistiche.startD && kpi.tempistiche.endD) {
                    const startMs = kpi.tempistiche.startD.getTime(), endMs = kpi.tempistiche.endD.getTime(), todayMs = today.getTime();
                    kpi.tempistiche.giorniTotali = Math.max(1, Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)));
                    kpi.tempistiche.giorniTrascorsi = Math.max(0, Math.ceil((todayMs - startMs) / (1000 * 60 * 60 * 24)));
                    kpi.tempistiche.giorniMancanti = Math.max(0, Math.ceil((endMs - todayMs) / (1000 * 60 * 60 * 24)));
                    kpi.tempistiche.percTempoTrascorso = Math.min(100, Math.round((kpi.tempistiche.giorniTrascorsi / kpi.tempistiche.giorniTotali) * 100));
                }
            }
        }
        kpi.margineBudget = kpi.budgetRicavi - kpi.budgetCosti;

        // SAL
        let maxAvanzamento = 0;
        salData.forEach(s => {
            if (targetCantiereId !== 'azienda' && s.cantiereId !== targetCantiereId) return;
            if (s.stato && s.stato.toLowerCase() === 'annullato') return;
            const d = s.dataEmissione || s.data || s.createdAt || new Date().toISOString();
            if (!isInRange(d)) return;
            let importo = parseFloat(String(s.importoCertificato || s.importoNetto || s.importo || s.totale || s.valore || s.importoAttuale).replace(',', '.'));
            if (isNaN(importo)) importo = 0;
            kpi.ricaviDaSAL += importo;
            addDetail('ricavi', { data: d, descrizione: `SAL ${s.numero || s.titolo || ''}`.trim(), importo: importo, tipo: 'Lavori Certificati' }, s.cantiereId);
            const perc = parseFloat(String(s.percentuale || s.percentualeAvanzamento || s.avanzamento || 0).replace(',', '.'));
            if (!isNaN(perc) && perc > maxAvanzamento) maxAvanzamento = perc;
        });
        kpi.percentualeAvanzamento = targetCantiereId !== 'azienda' ? (maxAvanzamento > 0 ? maxAvanzamento : Number(cantiereSpecifico?.percentualeAvanzamento || 0)) : maxAvanzamento;
        if (targetCantiereId !== 'azienda' && kpi.tempistiche.percTempoTrascorso > (kpi.percentualeAvanzamento + 10)) kpi.tempistiche.inRitardo = true;

        // FATTURE VENDITA
        fattureVendita.forEach(f => {
            if (targetCantiereId !== 'azienda' && f.cantiereId !== targetCantiereId) return;
            if (f.stato && f.stato.toLowerCase() === 'annullata') return; 
            const d = f.dataEmissione || f.data || f.createdAt || new Date().toISOString();
            if (!isInRange(d)) return;
            let imponibile = parseFloat(String(f.imponibile).replace(',', '.'));
            if (isNaN(imponibile) || imponibile === 0) {
                if (f.righe && Array.isArray(f.righe)) imponibile = f.righe.reduce((acc, r) => acc + (parseFloat(String(r.totaleRiga || r.prezzoTotale || r.prezzo || 0).replace(',', '.')) || 0), 0);
                else imponibile = 0;
            }
            let totaleLordo = parseFloat(String(f.totaleDocumento || f.totale).replace(',', '.'));
            if (isNaN(totaleLordo) || totaleLordo === 0) { const iva = parseFloat(String(f.aliquotaIva || 22).replace(',', '.')); totaleLordo = imponibile * (1 + (iva / 100)); }
            kpi.ricaviReali += imponibile; kpi.fatturatoVendite += totaleLordo; 
            if (f.stato && f.stato.toLowerCase() === 'pagata') kpi.incassatoVendite += totaleLordo;
            else assegnaBucketCassa(totaleLordo, getDaysDiff(f.scadenzaPagamento, d), 'in');
            addDetail('ricavi', { data: d, descrizione: `Fattura n. ${f.numeroFattura || 'Bozza'}`, importo: totaleLordo, tipo: (f.stato && f.stato.toLowerCase() === 'pagata') ? 'Incassata' : 'Da Incassare' }, f.cantiereId);
        });

        // ✅ FATTURE ACQUISTO (Filtro Subappalti vs Materiali)
        fattureAcquisto.forEach(f => {
            if (targetCantiereId !== 'azienda' && f.cantiereId !== targetCantiereId) return;
            if (f.stato && f.stato.toLowerCase() === 'annullata') return; 
            const d = f.dataFattura || f.dataEmissione || f.dataRegistrazione || f.createdAt || new Date().toISOString();
            if (!isInRange(d)) return;
            let imponibile = parseFloat(String(f.imponibile || f.prezzo).replace(',', '.'));
            if (isNaN(imponibile) || imponibile === 0) {
                if (f.righe && Array.isArray(f.righe)) imponibile = f.righe.reduce((acc, r) => acc + (parseFloat(String(r.totaleRiga || r.prezzoTotale || r.prezzo || 0).replace(',', '.')) || 0), 0);
                else imponibile = 0;
            }
            let totaleLordo = parseFloat(String(f.totaleDocumento || f.totale).replace(',', '.'));
            if (isNaN(totaleLordo) || totaleLordo === 0) { const iva = parseFloat(String(f.aliquotaIva || 22).replace(',', '.')); totaleLordo = imponibile * (1 + (iva / 100)); }
            kpi.fatturatoAcquisti += totaleLordo;
            
            if (f.stato && f.stato.toLowerCase() === 'pagata') kpi.pagatoAcquisti += totaleLordo;
            else assegnaBucketCassa(totaleLordo, getDaysDiff(f.scadenzaPagamento || f.dataScadenza, d), 'out');
            
           // SMISTAMENTO PER CATEGORIA COSTO
            const cat = (f.categoriaCosto || '').toLowerCase();
            
            // ✅ CORREZIONE: Intercettiamo sia 'nomeFornitore' che 'fornitoreNome'
            const nomeDitta = f.nomeFornitore || f.fornitoreNome || f.ragioneSociale || 'Fornitore Sconosciuto';
            
            if (cat === 'noleggi') {
                kpi.costiNoleggi += imponibile;
                addDetail('materiali', { data: d, descrizione: `Noleggio: ${nomeDitta}`, importo: imponibile, tipo: 'Fattura Passiva' }, f.cantiereId);
            } 
            else if (cat === 'subappalto' || cat === 'subappalti' || cat === 'artigiani') {
                kpi.costiSubappalti += imponibile; // ✅ Isoliamo i subappalti
                addDetail('subappalti', { data: d, descrizione: `SAL Passivo: ${nomeDitta}`, importo: imponibile, tipo: 'Subappalto' }, f.cantiereId);
            } 
            else {
                kpi.costiMateriali += imponibile;
                addDetail('materiali', { data: d, descrizione: `Acquisto: ${nomeDitta}`, importo: imponibile, tipo: 'Fattura Passiva' }, f.cantiereId);
            }
        });

        ['scadute', 'd30', 'd60', 'd90', 'oltre'].forEach(key => kpi.cashFlow.net[key] = kpi.cashFlow.in[key] - kpi.cashFlow.out[key]);

        // MAGAZZINO
        movimentiMagazzino.forEach(mov => {
            if (targetCantiereId !== 'azienda' && mov.cantiereId !== targetCantiereId) return;
            if (!isInRange(mov.createdAt)) return;
            let valore = parseFloat(String(mov.valoreTotale).replace(',', '.'));
            if (isNaN(valore) || valore === 0) {
                let qty = parseFloat(String(mov.quantita).replace(',', '.')); let cost = parseFloat(String(mov.costoUnitario).replace(',', '.'));
                valore = (!isNaN(qty) && !isNaN(cost)) ? (qty * cost) : 0;
            }
            if (valore > 0) {
                if (['trasferimento_cantiere', 'scarico_ddt_diretto', 'scarico_manuale'].includes(mov.tipo)) {
                    kpi.costiMateriali += valore; addDetail('materiali', { data: mov.createdAt, descrizione: `Scarico Magazzino: ${mov.articoloNome}`, importo: valore, tipo: 'Magazzino' }, mov.cantiereId);
                } else if (mov.tipo === 'rientro_avanzo') kpi.costiMateriali -= valore;
            }
        });

        // ORE E ATTREZZATURE (Omesso per brevità: identico alla versione precedente)
        const getAttrezzatureAssegnate = (userId, cantiereId, dataRiferimento) => {
            let automezziTrovati = []; const dataRef = new Date(dataRiferimento); dataRef.setHours(12, 0, 0, 0);
            assegnazioniCantieri.forEach(ass => {
                if (ass.cantiereId !== cantiereId) return;
                if (ass.dataInizio && new Date(ass.dataInizio) > dataRef) return;
                if (ass.dataFine && new Date(ass.dataFine) < dataRef) return;
                const inTeam = (ass.teamMemberIds || []).includes(userId) || (ass.team || []).some(t => t.id === userId || t.userId === userId);
                const isPreposto = ass.preposto?.userId === userId || ass.prepostoId === userId || ass.preposto?.id === userId;
                const isOperaio = (ass.operai || []).some(op => op.userId === userId || op.id === userId) || (ass.operaiIds || []).includes(userId);
                if (inTeam || isPreposto || isOperaio || ass.userId === userId || ass.assegnatoA === userId) {
                    (ass.automezzi || ass.attrezzature || []).forEach(m => automezziTrovati.push(m));
                    (ass.automezziIds || ass.attrezzatureIds || []).forEach(id => automezziTrovati.push({ id, costo: 0 }));
                    if (ass.attrezzaturaId) automezziTrovati.push({ id: ass.attrezzaturaId, costo: 0 });
                }
            });
            attrezzature.forEach(attr => {
                if (attr.cantiereId === cantiereId || attr.cantiereAttuale === cantiereId || attr.assegnatoA === userId || attr.userId === userId) {
                    if (!automezziTrovati.some(m => (typeof m === 'string' ? m : m.id) === attr.id)) automezziTrovati.push({ id: attr.id, costo: attr.costoOrario || 0 });
                }
            });
            return automezziTrovati;
        };

        const processaOreLavoro = (userId, ore, dataLavoro, cId) => {
            if (ore <= 0 || ore >= 24) return;
            const user = users.find(u => u.id === userId);
            const costoTrovato = ore * (costiRuoli[user?.ruolo || 'default']);
            kpi.oreLavorate += ore; kpi.costiManodopera += costoTrovato;
            addDetail('manodopera', { data: dataLavoro, descrizione: `${user?.nome || ''} ${user?.cognome || ''}`.trim(), importo: costoTrovato, tipo: `${ore.toFixed(1)} Ore` }, cId);
            const mezziAssegnati = getAttrezzatureAssegnate(userId, targetCantiereId === 'azienda' ? cId : targetCantiereId, dataLavoro);
            mezziAssegnati.forEach(mezzo => {
                const mezzoId = typeof mezzo === 'string' ? mezzo : mezzo.id;
                let costoOrario = typeof mezzo === 'object' ? Number(mezzo.costo) : 0;
                const anagraficaMezzo = attrezzature.find(a => a.id === mezzoId);
                if (!costoOrario) costoOrario = Number(anagraficaMezzo?.costoOrario || anagraficaMezzo?.costoNoleggio || settings.costoOrarioAttrezzatura || 10);
                const costoTotMezzo = ore * costoOrario;
                kpi.costiAttrezzatura += costoTotMezzo;
                addDetail('attrezzature', { data: dataLavoro, descrizione: anagraficaMezzo?.nome || anagraficaMezzo?.marca || 'Mezzo Assegnato', importo: costoTotMezzo, tipo: 'Costo Uso' }, cId);
            });
        };

        presenze.forEach(p => {
            if (targetCantiereId !== 'azienda' && p.cantiereId !== targetCantiereId) return;
            if (!isInRange(p.timestampInizio)) return;
            if (p.timestampFine) {
                const inizio = p.timestampInizio.toDate ? p.timestampInizio.toDate() : new Date(p.timestampInizio);
                const fine = p.timestampFine.toDate ? p.timestampFine.toDate() : new Date(p.timestampFine);
                const ore = (fine - inizio) / (1000 * 60 * 60);
                processaOreLavoro(p.userId, ore, inizio, p.cantiereId);
            }
        });

        const accoppiamenti = {};
        reports.forEach(r => {
            if (targetCantiereId !== 'azienda' && r.cantiereId !== targetCantiereId) return;
            const rData = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt || r.data || r.dataIntervento);
            if (!isInRange(rData)) return;
            let rawOre = r.oreLavorate || r.oreIntervento || r.ore || r.totaleOre || 0;
            let oreDirette = parseFloat(String(rawOre).replace(',', '.'));
            if (isNaN(oreDirette)) oreDirette = 0;
            if (oreDirette > 0) {
                 processaOreLavoro(r.userId || r.autoreId, oreDirette, rData, r.cantiereId);
            } else {
                const uId = r.userId || r.autoreId; const dataGiorno = rData.toISOString().split('T')[0]; const key = `${uId}_${dataGiorno}`;
                if (!accoppiamenti[key]) accoppiamenti[key] = { inizio: null, fine: null, userId: uId, cantiereId: r.cantiereId };
                if (r.tipologia === 'Inizio Lavoro') { if (!accoppiamenti[key].inizio || rData < accoppiamenti[key].inizio) accoppiamenti[key].inizio = rData; } 
                else if (r.tipologia === 'Fine Lavoro') { if (!accoppiamenti[key].fine || rData > accoppiamenti[key].fine) accoppiamenti[key].fine = rData; }
            }
        });

        Object.values(accoppiamenti).forEach(turno => {
            if (turno.inizio && turno.fine) {
                const ore = (turno.fine - turno.inizio) / (1000 * 60 * 60);
                processaOreLavoro(turno.userId, ore, turno.inizio, turno.cantiereId);
            }
        });

        // ✅ RICALCOLO TOTALI INCLUDENDO SUBAPPALTI
        kpi.totaleCostiDiretti = kpi.costiMateriali + kpi.costiNoleggi + kpi.costiManodopera + kpi.costiAttrezzatura + kpi.costiSubappalti;
        const percSpeseGenerali = settings.percentualeSpeseGenerali || 15;
        kpi.costiGenerali = kpi.totaleCostiDiretti * (percSpeseGenerali / 100);
        kpi.totaleCostiPieni = kpi.totaleCostiDiretti + kpi.costiGenerali;

        kpi.margineOperativo = kpi.ricaviReali - kpi.totaleCostiDiretti;
        kpi.margineNetto = kpi.ricaviReali - kpi.totaleCostiPieni;
        kpi.marginePerc = kpi.ricaviReali > 0 ? (kpi.margineNetto / kpi.ricaviReali) * 100 : 0;
        kpi.creditiVersoClienti = kpi.fatturatoVendite - kpi.incassatoVendite;
        kpi.debitiVersoFornitori = kpi.fatturatoAcquisti - kpi.pagatoAcquisti;
        kpi.lavoriDaFatturare = kpi.ricaviDaSAL > kpi.ricaviReali ? (kpi.ricaviDaSAL - kpi.ricaviReali) : 0;

        const valoreProduzione = kpi.ricaviDaSAL > 0 ? kpi.ricaviDaSAL : kpi.ricaviReali;
        kpi.produttivita.resaOraria = kpi.oreLavorate > 0 ? (valoreProduzione / kpi.oreLavorate) : 0;
        kpi.produttivita.cpi = kpi.totaleCostiPieni > 0 ? (valoreProduzione / kpi.totaleCostiPieni) : 0;

        if (targetCantiereId !== 'azienda') {
            if (kpi.percentualeAvanzamento > 0 && kpi.percentualeAvanzamento <= 100) kpi.costoFinaleStimato = (kpi.totaleCostiPieni / kpi.percentualeAvanzamento) * 100;
            else kpi.costoFinaleStimato = kpi.totaleCostiPieni > 0 ? kpi.totaleCostiPieni : kpi.budgetCosti;
            kpi.varianzaCosti = kpi.budgetCosti - kpi.costoFinaleStimato; 
            kpi.margineFinaleStimato = kpi.budgetRicavi - kpi.costoFinaleStimato;
        }
        return kpi;
    };

    const listaCantieriAnalizzati = useMemo(() => {
        if (filtroCantiereId !== 'azienda') return [];
        return cantieri.filter(c => c.stato === 'attivo').map(c => ({ ...c, nome: c.nomeCantiere, kpi: calcolaKPI(c.id) }));
    }, [filtroCantiereId, cantieri, fattureVendita, fattureAcquisto, presenze, offerte, programmazione, users, attrezzature, settings, dateRange, assegnazioniCantieri, movimentiMagazzino, reports, salData]);

    const analisi = useMemo(() => {
        const baseKPI = calcolaKPI(filtroCantiereId);
        if (filtroCantiereId === 'azienda') {
            baseKPI.costoFinaleStimato = listaCantieriAnalizzati.reduce((acc, c) => acc + c.kpi.costoFinaleStimato, 0);
            baseKPI.varianzaCosti = listaCantieriAnalizzati.reduce((acc, c) => acc + c.kpi.varianzaCosti, 0);
            baseKPI.margineFinaleStimato = listaCantieriAnalizzati.reduce((acc, c) => acc + c.kpi.margineFinaleStimato, 0);
            const totBudgetRicavi = listaCantieriAnalizzati.reduce((acc, c) => acc + c.kpi.budgetRicavi, 0);
            baseKPI.margineAfinirePerc = totBudgetRicavi > 0 ? (baseKPI.margineFinaleStimato / totBudgetRicavi) * 100 : 0;

            let cantieriInRitardo = 0;
            listaCantieriAnalizzati.forEach(c => { if (c.kpi.tempistiche.inRitardo) cantieriInRitardo++; });
            baseKPI.tempistiche.cantieriInRitardo = cantieriInRitardo;
            
            const valProdAz = baseKPI.ricaviDaSAL > 0 ? baseKPI.ricaviDaSAL : baseKPI.ricaviReali;
            baseKPI.produttivita.resaOraria = baseKPI.oreLavorate > 0 ? (valProdAz / baseKPI.oreLavorate) : 0;
            baseKPI.produttivita.cpi = baseKPI.totaleCostiPieni > 0 ? (valProdAz / baseKPI.totaleCostiPieni) : 0;
        } 
        return baseKPI;
    }, [filtroCantiereId, cantieri, fattureVendita, fattureAcquisto, presenze, offerte, programmazione, users, attrezzature, settings, dateRange, assegnazioniCantieri, movimentiMagazzino, reports, salData, listaCantieriAnalizzati]);

    return { analisi, listaCantieriAnalizzati, filtroCantiereId, setFiltroCantiereId, dateRange, setDateRange, capacityPlanning };
};