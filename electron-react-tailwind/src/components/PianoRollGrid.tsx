
import React from 'react'
export const PianoRollGrid: React.FC = () => (
  <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
    {Array.from({length:24}).map((_,i)=>(
      <line key={i} x1={(i*100)+0.5} y1="0" x2={(i*100)+0.5} y2="100%" stroke="rgba(255,255,255,0.05)" />
    ))}
    {Array.from({length:10}).map((_,i)=>(
      <line key={i} x1="0" y1={(i*20)+0.5} x2="100%" y2={(i*20)+0.5} stroke="rgba(255,255,255,0.06)" />
    ))}
  </svg>
)
