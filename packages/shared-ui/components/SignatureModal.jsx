import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/solid';

export const SignatureModal = ({ isOpen, onClose, onConfirm, itemName }) => {
    const sigCanvas = useRef({});
    const [isEmpty, setIsEmpty] = useState(true);

    if (!isOpen) return null;

    const clear = () => {
        sigCanvas.current.clear();
        setIsEmpty(true);
    };

    const save = () => {
        if (isEmpty) return alert("Per favore firma prima di confermare.");
        
        // 🔴 FIX: Usiamo getCanvas() invece di getTrimmedCanvas() che dava errore
        const canvasElement = sigCanvas.current.getCanvas();
        
        // Convertiamo il canvas standard in un Blob per Firebase
        canvasElement.toBlob((blob) => {
            if (blob) {
                onConfirm(blob);
            } else {
                alert("Errore durante il salvataggio della firma.");
            }
        }, 'image/png');
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-90 p-4">
            <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                
                <div className="p-4 bg-gray-100 border-b flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Firma per ricezione DPI</h3>
                    <button onClick={onClose}><XMarkIcon className="h-6 w-6 text-gray-500"/></button>
                </div>

                <div className="p-4 bg-yellow-50 text-yellow-800 text-xs text-center border-b border-yellow-100">
                    Dichiaro di aver ricevuto il DPI: <strong>{itemName}</strong>,<br/>
                    di essere stato istruito sul suo utilizzo e mi impegno a usarlo correttamente.
                </div>

                <div className="bg-white p-4 flex justify-center">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg w-full">
                        <SignatureCanvas 
                            ref={sigCanvas}
                            penColor="black"
                            // Aumentiamo un po' l'altezza per rendere la firma più comoda
                            canvasProps={{ className: 'w-full h-48 bg-white' }} 
                            onBegin={() => setIsEmpty(false)}
                        />
                    </div>
                </div>

                <div className="p-4 bg-gray-50 flex gap-3">
                    <button onClick={clear} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold">
                        Pulisci
                    </button>
                    <button onClick={save} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                        <CheckIcon className="h-5 w-5"/> Conferma
                    </button>
                </div>
            </div>
        </div>
    );
};
