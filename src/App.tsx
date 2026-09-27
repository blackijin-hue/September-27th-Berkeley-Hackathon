/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { WorkflowStep, VehicleRecord } from './types';
import { 
  INITIAL_CAMPAIGNS, 
  NHTSA_2026_OTA_CASES,
  getStoredVehicles, 
  saveStoredVehicles, 
  resetStoredVehicles,
  getStoredActiveVehicleId,
  saveStoredActiveVehicleId 
} from './data/mockData';
import { WorkflowHeader } from './components/WorkflowHeader';
import { OEMRecallMonitor } from './components/OEMRecallMonitor';
import { LastMileAnalyzer } from './components/LastMileAnalyzer';
import { ServiceOpportunities } from './components/ServiceOpportunities';
import { RevenueSettlementLedger } from './components/RevenueSettlementLedger';

export default function App() {
  const [vehicles, setVehicles] = useState<VehicleRecord[]>(() => getStoredVehicles());
  const [campaigns] = useState(INITIAL_CAMPAIGNS);
  const [nhtsaCases] = useState(NHTSA_2026_OTA_CASES);
  const [activeVehicleId, setActiveVehicleId] = useState<string>(() => getStoredActiveVehicleId());
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('MONITOR');

  useEffect(() => {
    saveStoredVehicles(vehicles);
  }, [vehicles]);

  useEffect(() => {
    saveStoredActiveVehicleId(activeVehicleId);
  }, [activeVehicleId]);

  const activeVehicle = vehicles.find((v) => v.id === activeVehicleId) || vehicles[0];

  const handleUpdateVehicle = (updated: VehicleRecord) => {
    setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
  };

  const handleSelectVehicle = (v: VehicleRecord) => {
    setActiveVehicleId(v.id);
  };

  const handleNavigateToAnalyzer = (v: VehicleRecord) => {
    setActiveVehicleId(v.id);
    setCurrentStep('ANALYZER');
  };

  const handleNavigateToOpportunities = (v: VehicleRecord) => {
    setActiveVehicleId(v.id);
    setCurrentStep('OPPORTUNITIES');
  };

  const handleNavigateToLedger = () => {
    setCurrentStep('REVENUE_LEDGER');
  };

  const handleResetData = () => {
    if (window.confirm('Reset all demo vehicle states, consent records, and telemetry to default?')) {
      const reset = resetStoredVehicles();
      setVehicles(reset);
      setActiveVehicleId('VH-HMC-01');
      setCurrentStep('MONITOR');
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col antialiased">
      {/* 3-Screen Header without top-right dropdown */}
      <WorkflowHeader
        currentStep={currentStep}
        activeVehicle={activeVehicle}
        vehicles={vehicles}
        onSelectStep={setCurrentStep}
        onResetData={handleResetData}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5">
        {/* Screen 1: OEM recall monitor (Large OEM Brand Icons & Progress) */}
        {currentStep === 'MONITOR' && (
          <OEMRecallMonitor
            vehicles={vehicles}
            campaigns={campaigns}
            nhtsaCases={nhtsaCases}
            activeVehicle={activeVehicle}
            onSelectVehicle={handleSelectVehicle}
            onNavigateToAnalyzer={handleNavigateToAnalyzer}
          />
        )}

        {/* Screen 2: Last Mile Analyzer */}
        {currentStep === 'ANALYZER' && (
          <LastMileAnalyzer
            vehicle={activeVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onNavigateToOpportunities={handleNavigateToOpportunities}
            onBackToMonitor={() => setCurrentStep('MONITOR')}
          />
        )}

        {/* Screen 3: Service opportunities */}
        {currentStep === 'OPPORTUNITIES' && (
          <ServiceOpportunities
            vehicles={vehicles}
            activeVehicle={activeVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onNavigateToAnalyzer={handleNavigateToAnalyzer}
            onNavigateToLedger={handleNavigateToLedger}
            onBackToMonitor={() => setCurrentStep('MONITOR')}
          />
        )}

        {/* Screen 4: Revenue Settlement Ledger */}
        {currentStep === 'REVENUE_LEDGER' && (
          <RevenueSettlementLedger
            vehicles={vehicles}
            activeVehicle={activeVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onNavigateToAnalyzer={handleNavigateToAnalyzer}
            onNavigateToOpportunities={handleNavigateToOpportunities}
            onBackToMonitor={() => setCurrentStep('MONITOR')}
          />
        )}
      </main>

      {/* Clean Monotone Footer */}
      <footer className="border-t border-zinc-200 bg-white py-3 text-[11px] font-mono text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-zinc-900">LAST MILE</span>
            <span>·</span>
            <span>ENTERPRISE RECALL INTELLIGENCE</span>
          </div>
          <div className="text-zinc-500">
            NHTSA 49 CFR PART 573
          </div>
        </div>
      </footer>
    </div>
  );
}
