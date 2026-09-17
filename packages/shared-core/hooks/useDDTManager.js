import { useState } from 'react';
import { collection, addDoc, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const useDDTManager = (db, storage, user, companyID) => {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);

    const uploadDDT = async (file, dati) => {
        setIsUploading(true);
        setError(null);
        
        try {
            if (!file) throw new Error("La foto o il PDF della bolla è obbligatorio.");
            
            const finalCantiereId = dati.cantiereId || 'MAGAZZINO_SEDE';
            const finalNomeCantiere = dati.nomeCantiere || 'Magazzino Sede';

            // 1. Upload Foto
            const folderId = dati.ordineId || 'orfani';
            const fileSafeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const storagePath = `ddt_acquisti/${folderId}/${Date.now()}_${fileSafeName}`;
            const storageRef = ref(storage, storagePath);
            
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            // 2. Salvataggio Documento DDT
            const nuovoDDT = {
                companyID,
                cantiereId: finalCantiereId,
                cantiereNome: finalNomeCantiere,
                registratoDa: user.uid,
                registratoDaNome: user.displayName || user.email,
                numeroDDT: dati.numeroDDT || 'N/D',
                dataDDT: dati.dataDDT || new Date().toISOString().split('T')[0],
                conformita: dati.conformita || 'conforme', 
                note: dati.note || '',
                fileUrl: downloadURL,
                fileName: file.name,
                dataRegistrazione: new Date().toISOString(),
                ordineId: dati.ordineId || null,
                numeroOrdine: dati.numeroOrdine || null,
                fornitoreId: dati.fornitoreId || null,
                fornitoreNome: dati.fornitoreNome || null,
                tipoOggetto: dati.tipoOggetto || 'misto', // Ora può contenere più cose, usiamo l'etichetta generica
                stato: dati.ordineId ? 'associato_ordine' : 'da_riconciliare',
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'ddt_acquisti'), nuovoDDT);

            // 3. LA MAGIA: SMISTAMENTO INTELLIGENTE PER SINGOLA RIGA
            if (dati.ordineId) {
                const ordineRef = doc(db, 'ordini_acquisto', dati.ordineId);
                
                const nuovoStatoOrdine = dati.conformita === 'conforme' ? 'consegnato' : 'consegnato_con_riserva';
                await updateDoc(ordineRef, {
                    stato: nuovoStatoOrdine,
                    dataRicezioneEffettiva: new Date().toISOString(),
                    ricevutoDa: user.uid
                });

                const ordineSnap = await getDoc(ordineRef);
                
                if (ordineSnap.exists()) {
                    const ordineData = ordineSnap.data();
                    const righe = ordineData.righe || [];

                    for (const riga of righe) {
                        // 🌟 CONTROLLO TIPOLOGIA RIGA 🌟
                        const tipologiaRiga = riga.tipologia || 'materiale'; // default se non specificato
                        const qtaNumerica = Number(riga.quantita) || 1;
                        const prezzoNumerico = Number(riga.prezzoUnitario) || 0;

                        if (tipologiaRiga === 'attrezzatura') {
                            await addDoc(collection(db, 'attrezzature'), {
                                companyID, nome: riga.descrizione, quantita: qtaNumerica, unitaMisura: riga.unitaMisura || 'pz',
                                fornitoreNome: ordineData.fornitoreNome, valoreAcquisto: prezzoNumerico,
                                dataAcquisto: new Date().toISOString(), posizioneCorrenteId: finalCantiereId, posizioneCorrenteNome: finalNomeCantiere,
                                stato: 'disponibile', origineDDT: dati.numeroDDT, ordineId: dati.ordineId
                            });

                        } else if (tipologiaRiga === 'macchina_operatrice' || tipologiaRiga === 'automezzo') {
                            // Creiamo il mezzo nella collezione 'mezzi' (o come chiami la tua anagrafica mezzi)
                            // Creiamo un record per ogni singola quantità (se compri 2 furgoni, crea 2 furgoni separati per le targhe!)
                            for(let i=0; i<qtaNumerica; i++) {
                                await addDoc(collection(db, 'mezzi_aziendali'), {
                                    companyID, 
                                    tipo: tipologiaRiga, // 'macchina_operatrice' o 'automezzo'
                                    modello: riga.descrizione, 
                                    fornitoreNome: ordineData.fornitoreNome, 
                                    valoreAcquisto: prezzoNumerico,
                                    dataAcquisto: new Date().toISOString(), 
                                    cantiereAttualeId: finalCantiereId, 
                                    cantiereAttualeNome: finalNomeCantiere,
                                    stato: 'disponibile', 
                                    targa_telaio: 'DA INSERIRE', // Da compilare poi in amministrazione
                                    origineDDT: dati.numeroDDT, 
                                    ordineId: dati.ordineId
                                });
                            }

                        } else if (tipologiaRiga === 'subappalto') {
                            // I subappalti non si "caricano" a magazzino, ma potremmo registrarli come contratti attivi
                            // Al momento li saltiamo dal carico logistico fisico.
                            console.log("Subappalto rilevato, nessun movimento di magazzino fisico necessario.");

                        } else {
                            // 🧱 LOGICA MATERIALE (Doppio movimento: Sede -> Cantiere)
                            await addDoc(collection(db, 'movimenti_magazzino'), {
                                companyID, articolo: riga.descrizione, quantita: qtaNumerica, unitaMisura: riga.unitaMisura || 'pz',
                                valoreUnitario: prezzoNumerico, tipoMovimento: 'carico', causale: 'acquisto_fornitore',
                                dataMovimento: new Date().toISOString(), origine: ordineData.fornitoreNome,
                                destinazioneId: 'MAGAZZINO_SEDE', destinazioneNome: 'Magazzino Sede', riferimentoDDT: dati.numeroDDT, ordineId: dati.ordineId, registratoDa: user.uid
                            });

                            if (finalCantiereId !== 'MAGAZZINO_SEDE') {
                                await addDoc(collection(db, 'movimenti_magazzino'), {
                                    companyID, articolo: riga.descrizione, quantita: qtaNumerica, unitaMisura: riga.unitaMisura || 'pz',
                                    valoreTotaleAssegnato: Number(riga.totaleRiga) || 0, tipoMovimento: 'scarico', causale: 'trasferimento_cantiere',
                                    dataMovimento: new Date().toISOString(), origineId: 'MAGAZZINO_SEDE', origineNome: 'Magazzino Sede',
                                    destinazioneId: finalCantiereId, destinazioneNome: finalNomeCantiere, riferimentoDDT: dati.numeroDDT, ordineId: dati.ordineId, registratoDa: user.uid
                                });
                            }
                        }
                    }
                }
            }

            setIsUploading(false);
            return { success: true, message: "DDT registrato e smistato con successo!", id: docRef.id };

        } catch (err) {
            console.error("Errore upload DDT:", err);
            setError(err.message);
            setIsUploading(false);
            return { success: false, message: err.message };
        }
    };

    return { uploadDDT, isUploading, error };
};