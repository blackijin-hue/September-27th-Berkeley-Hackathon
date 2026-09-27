import React from 'react';
import { WorkflowStep, VehicleRecord } from '../types';
import { RotateCcw } from 'lucide-react';

interface WorkflowHeaderProps {
  currentStep: WorkflowStep;
  activeVehicle: VehicleRecord;
  vehicles: VehicleRecord[];
  onSelectStep: (step: WorkflowStep) => void;
  onResetData: () => void;
}

export const WorkflowHeader: React.FC<WorkflowHeaderProps> = ({
  currentStep,
  onSelectStep,
  onResetData,
}) => {
  const screens: Array<{ id: WorkflowStep; label: string; num: string }> = [
    { id: 'MONITOR', label: 'OEM RECALL MONITOR', num: '1' },
    { id: 'ANALYZER', label: 'LAST MILE ANALYZER', num: '2' },
    { id: 'OPPORTUNITIES', label: 'SERVICE OPPORTUNITIES', num: '3' },
    { id: 'REVENUE_LEDGER', label: 'REVENUE & SETTLEMENT', num: '4' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4 font-mono">
        {/* Brand in Pure Blue */}
        <div 
          onClick={() => onSelectStep('MONITOR')} 
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-xs tracking-wider shadow-sm group-hover:bg-blue-700 transition-colors">
            LM
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900 font-sans group-hover:text-blue-600 transition-colors">
            LAST MILE
          </span>
        </div>

        {/* 3 Core Screens Navigation Buttons in Pure Blue Palette */}
        <nav className="flex items-center gap-1.5 sm:gap-2">
          {screens.map((screen) => {
            const isActive = currentStep === screen.id;
            return (
              <button
                key={screen.id}
                onClick={() => onSelectStep(screen.id)}
                className={`px-3 py-1.5 text-xs rounded transition-all flex items-center gap-1.5 font-medium ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  isActive ? 'bg-white/20 text-white font-bold' : 'bg-slate-200 text-slate-600'
                }`}>
                  {screen.num}
                </span>
                <span>{screen.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Reset */}
        <div className="flex items-center">
          <button
            onClick={onResetData}
            title="Reset Data"
            className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
