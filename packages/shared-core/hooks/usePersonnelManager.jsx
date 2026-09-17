import { useState } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const usePersonnelManager = (db, storage) => { 
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const processSignature = async (base64String, basePath) => {
        if (!base64String || typeof base64String !== 'string' || !base64String.includes('base64,')) return null;
        try {
            const arr = base64String.split(',');
            let mime = 'image/png';
            const mimeMatch = arr[0].match(/:(.*?);/);
            if (mimeMatch && mimeMatch[1]) mime = mimeMatch[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while(n--){ u8arr[n] = bstr.charCodeAt(n); }
            const blob = new Blob([u8arr], {type: mime});
            const sigPath = `${basePath}/firma_${Date.now()}.png`;
            const sigRef = ref(storage, sigPath);
            await uploadBytes(sigRef, blob);
            return await getDownloadURL(sigRef);
        } catch (error) {
            console.error("Errore upload firma:", error);
            return null;
        }
    };

    const addPersonnel = async (userData, companyID, filesToUpload = []) => {
        // ... (mantieni invariata la funzione addPersonnel che avevi)
        setIsLoading(true);
        try {
            const uploadedDocuments = await Promise.all(
                filesToUpload.map(async (file) => {
                    const tempPath = `users/temp-${Date.now()}/documents/${file.name}`;
                    const fileRef = ref(storage, tempPath);
                    await uploadBytes(fileRef, file);
                    const url = await getDownloadURL(fileRef);
                    return { nome: file.name, url };
                })
            );
            if (userData.firma_base64) {
                if (userData.firma_base64.startsWith('data:')) {
                    const sigUrl = await processSignature(userData.firma_base64, `users/temp-${Date.now()}/firma`);
                    if (sigUrl) { userData.firmaUrl = sigUrl; delete userData.firma_base64; }
                } else if (userData.firma_base64.startsWith('http')) {
                    userData.firmaUrl = userData.firma_base64; delete userData.firma_base64;
                }
            }
            const finalUserData = { ...userData, documenti: uploadedDocuments };
            const response = await fetch('/api/createEmployee', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeData: finalUserData, companyID }),
            });
            if (!response.ok) throw new Error("Errore API salvataggio");
            setMessage('Aggiunto con successo!');
            return { success: true };
        } catch (error) {
            setMessage(error.message); setIsError(true); return { success: false };
        } finally { setIsLoading(false); }
    };

    const updatePersonnel = async (userId, updatedData, filesToUpload = []) => {
        setIsLoading(true);
        setMessage('');
        setIsError(false);
        
        console.log("🚀 [MANAGER] Ricevuta richiesta di Update per l'utente:", userId);
        console.log("📦 [MANAGER] File in coda per il caricamento:", filesToUpload.length);

        try {
            // 1. CARICAMENTO NUOVI ATTESTATI
            const uploadedDocuments = await Promise.all(
                filesToUpload.map(async (file) => {
                    console.log(`⏳ [MANAGER] Upload in corso per: ${file.name}...`);
                    const filePath = `users/${userId}/documents/${Date.now()}_${file.name}`;
                    const fileRef = ref(storage, filePath);
                    await uploadBytes(fileRef, file);
                    const url = await getDownloadURL(fileRef);
                    console.log(`✅ [MANAGER] Upload completato! URL:`, url);
                    return { nome: file.name, url };
                })
            );

            // 2. RECUPERO VECCHI DOCUMENTI
            const userDocRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userDocRef);
            let documentiEsistenti = [];
            if (userSnap.exists() && userSnap.data().documenti) {
                documentiEsistenti = userSnap.data().documenti;
            }

            // 3. UNIONE DOCUMENTI
            if (uploadedDocuments.length > 0) {
                updatedData.documenti = [...documentiEsistenti, ...uploadedDocuments];
                console.log("💾 [MANAGER] Array documenti finale pronto per il salvataggio:", updatedData.documenti);
            }

            // 4. FIRMA
            if (updatedData.firma_base64) {
                if (updatedData.firma_base64.startsWith('data:')) {
                    const sigUrl = await processSignature(updatedData.firma_base64, `users/${userId}/firma`);
                    if (sigUrl) { updatedData.firmaUrl = sigUrl; delete updatedData.firma_base64; }
                } else if (updatedData.firma_base64.startsWith('http')) {
                    updatedData.firmaUrl = updatedData.firma_base64; delete updatedData.firma_base64;
                }
            }

            await updateDoc(userDocRef, updatedData);
            console.log("🎉 [MANAGER] Aggiornamento Firestore completato!");
            
            setMessage('Dati e file aggiornati con successo!');
            return { success: true };
        } catch (error) {
            console.error("❌ [MANAGER] Errore critico:", error);
            setMessage(error.message);
            setIsError(true);
            return { success: false };
        } finally {
            setIsLoading(false);
        }
    };

    return { addPersonnel, updatePersonnel, isLoading, message, isError };
};