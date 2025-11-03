import React, { useState, useEffect, useRef, useMemo } from 'react';
// highlight-start
import { useFirebaseData } from 'shared-core'; // Percorso relativo aggiornato
// highlight-end
import { Document, Page } from 'react-pdf';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { doc, getDoc } from 'firebase/firestore';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Nota: La configurazione manuale del worker non è più necessaria con le versioni recenti di react-pdf.
// Rimuovendo l'import e la riga di configurazione si risolve l'errore.

const RapportinoCompleter = ({ templateId }) => {
  const { db, auth } = useFirebaseData();
  const [templateData, setTemplateData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [finalPdfBytes, setFinalPdfBytes] = useState(null);
  const [fieldValues, setFieldValues] = useState({});
  const [pageDimensions, setPageDimensions] = useState({});
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!db || !auth || !templateId) {
      setIsLoading(false);
      return;
    }

    const fetchTemplate = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const docRef = doc(db, 'rapportinoTemplates', templateId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          throw new Error("Nessun modello trovato con l'ID fornito.");
        }

        const data = docSnap.data();
        setTemplateData(data);
        
        const initialValues = {};
        data.fields.forEach(field => {
            if (field.type === 'checkbox') {
                initialValues[field.name] = false;
            } else {
                initialValues[field.name] = '';
            }
        });
        setFieldValues(initialValues);

      } catch (error) {
        console.error("Errore nel caricamento del modello:", error);
        setError("Errore nel caricamento del modello. Per favore, riprova o contatta il supporto.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTemplate();
  }, [templateId, db, auth]);

  const fileData = useMemo(() => {
    if (templateData && templateData.pdfBytes) {
      return { data: new Uint8Array(templateData.pdfBytes) };
    }
    return null;
  }, [templateData]);

  const handleGeneratePdf = async () => {
    if (!templateData) return;

    const { pdfBytes, fields } = templateData;
    
    try {
      const pdfDoc = await PDFDocument.load(new Uint8Array(pdfBytes));
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const textFieldsToDraw = [];
      const checkboxesToDraw = [];

      fields.forEach(field => {
        const page = pages[field.page - 1];
        if (!page) return;

        if (field.type === 'text') {
            if (fieldValues[field.name]) {
                const yPos = page.getHeight() - field.y;
                textFieldsToDraw.push({
                    page,
                    text: fieldValues[field.name],
                    x: field.x,
                    y: yPos,
                });
            }
        } else if (field.type === 'checkbox') {
            if (fieldValues[field.name] === true) {
                const yPos = page.getHeight() - field.y;
                checkboxesToDraw.push({
                    page,
                    x: field.x,
                    y: yPos,
                });
            }
        }
      });
        
      textFieldsToDraw.forEach(item => {
        item.page.drawText(item.text, {
            x: item.x,
            y: item.y,
            font: font,
            size: 10,
            color: rgb(0, 0, 0),
        });
      });

      checkboxesToDraw.forEach(item => {
        item.page.drawText('✓', {
            x: item.x,
            y: item.y,
            font: fontBold,
            size: 12,
            color: rgb(0, 0, 0),
        });
      });

      const modifiedPdfBytes = await pdfDoc.save();
      setFinalPdfBytes(modifiedPdfBytes);
    } catch (e) {
      console.error("Errore durante la generazione del PDF:", e);
      setError("Errore durante la generazione del PDF. Controlla i dati inseriti.");
    }
  };

  const handleInputChange = (fieldName, value) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleCheckboxChange = (fieldName) => {
    setFieldValues(prev => ({
        ...prev,
        [fieldName]: !prev[fieldName]
    }));
  };

  const onPageLoadSuccess = (page) => {
    console.log('Page loaded successfully! Page number:', page.pageNumber, 'Dimensions:', page.getViewport({ scale: 1 }));
    const viewport = page.getViewport({ scale: 1 });
    setPageDimensions(prev => ({
      ...prev,
      [page.pageNumber]: { width: viewport.width, height: viewport.height }
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-t-4 border-blue-500 rounded-full animate-spin"></div>
        <p className="ml-4 text-lg text-gray-700">Caricamento librerie e modello...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-lg shadow-md max-w-lg mx-auto mt-8 text-center">
        <p>Errore: {error}</p>
        <p className="text-sm mt-2">Assicurati che l'ID del template sia corretto e che le regole di sicurezza di Firestore permettano la lettura.</p>
      </div>
    );
  }

  if (templateData && !finalPdfBytes) {
    return (
      <div className="flex flex-col items-center p-4 min-h-screen bg-gray-50">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">Compila Rapportino</h2>
        <div ref={containerRef} className="relative w-full max-w-4xl shadow-lg rounded-lg overflow-hidden bg-white">
          <Document
            file={fileData}
          >
            {Array.from({ length: templateData.fields.reduce((max, f) => Math.max(max, f.page), 1) }, (_, index) => {
              const pageNumber = index + 1;
              const fieldsOnPage = templateData.fields.filter(f => f.page === pageNumber);
              const pageDim = pageDimensions[pageNumber];
              
              let scale = 1;
              if (pageDim && containerRef.current) {
                scale = containerRef.current.offsetWidth / pageDim.width;
              }

              return (
                <div key={pageNumber} className="relative mb-4">
                  <Page pageNumber={pageNumber} onLoadSuccess={onPageLoadSuccess} />
                  {pageDim && fieldsOnPage.map((field, i) => {
                      const yPos = (pageDim.height - field.y) * scale;
                      const xPos = field.x * scale;
                      
                      if (field.type === 'text') {
                          return (
                              <input
                                  key={i}
                                  type="text"
                                  value={fieldValues[field.name] || ''}
                                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                                  placeholder={field.name}
                                  className="absolute bg-white/50 border border-orange-500 rounded-md p-1 text-sm z-10 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                  style={{
                                      left: `${xPos}px`,
                                      top: `${yPos}px`,
                                      transform: 'translateY(-100%)',
                                      width: '150px'
                                  }}
                              />
                          );
                      } else if (field.type === 'checkbox') {
                          return (
                              <div
                                  key={i}
                                  onClick={() => handleCheckboxChange(field.name)}
                                  className="absolute w-4 h-4 border-2 rounded cursor-pointer z-10"
                                  style={{
                                      left: `${xPos}px`,
                                      top: `${yPos}px`,
                                      backgroundColor: fieldValues[field.name] ? '#2563eb' : 'white',
                                      borderColor: fieldValues[field.name] ? '#2563eb' : '#a1a1aa'
                                  }}
                              >
                                  {fieldValues[field.name] && (
                                      <svg className="h-full w-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                  )}
                              </div>
                          );
                      }
                  })}
                </div>
              );
            })}
          </Document>
        </div>
        <div className="mt-8">
          <button
            onClick={handleGeneratePdf}
            className="bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105"
          >
            Genera PDF Compilato
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 min-h-screen bg-gray-50">
      <h3 className="text-3xl font-bold mb-6 text-gray-800">Rapportino Compilato</h3>
      {finalPdfBytes && (
        <div className="w-full max-w-4xl shadow-lg rounded-lg overflow-hidden bg-white">
          <Document file={{ data: finalPdfBytes }}>
            <Page pageNumber={1} />
          </Document>
        </div>
      )}
      <div className="mt-8">
        <a
          href={URL.createObjectURL(new Blob([finalPdfBytes], { type: 'application/pdf' }))}
          download="rapportino_compilato.pdf"
          className="bg-green-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:bg-green-700 transition duration-300 transform hover:scale-105"
        >
          Scarica il PDF
        </a>
      </div>
    </div>
  );
};

export default RapportinoCompleter;
