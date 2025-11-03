import React from 'react';

export const SimpleGridTest = () => {
  return (
    <div className="bg-gray-200 p-4">
      <h2 className="text-xl font-bold mb-4">Test della Griglia Semplice</h2>
      
      {/* Questa è la riga fondamentale. Se Tailwind funziona, creerà 7 colonne. */}
      <div className="grid grid-cols-7 gap-2">
        
        {/* Creiamo 14 celle di esempio */}
        {Array.from({ length: 14 }, (_, i) => i + 1).map(number => (
          <div 
            key={number}
            className="bg-blue-500 text-white h-16 flex items-center justify-center rounded"
          >
            {number}
          </div>
        ))}

      </div>
    </div>
  );
};