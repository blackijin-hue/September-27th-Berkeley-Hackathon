import React, { useState } from 'react';
import { VehicleRecord, DealerOpportunity, OEMWarrantyClaim } from '../types';
import { 
  DollarSign, 
  Send, 
  Check, 
  Building2, 
  ShieldCheck, 
  ArrowRight, 
  Lock, 
  FileText, 
  TrendingUp, 
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  Car,
  Receipt,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Database
} from 'lucide-react';

interface ServiceOpportunitiesProps {
  vehicles: VehicleRecord[];
  activeVehicle: VehicleRecord;
  onUpdateVehicle: (updated: VehicleRecord) => void;
  onNavigateToAnalyzer: (vehicle: VehicleRecord) => void;
  onNavigateToLedger?: () => void;
  onBackToMonitor: () => void;
}

export const ServiceOpportunities: React.FC<ServiceOpportunitiesProps> = ({
  vehicles,
  activeVehicle,
  onUpdateVehicle,
  onNavigateToAnalyzer,
  onNavigateToLedger,
  onBackToMonitor,
}) => {
  const [activeTab, setActiveTab] = useState<'ACTIVE_LEAD' | 'ALL_OPPORTUNITIES'>('ACTIVE_LEAD');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState<VehicleRecord | null>(null);

  // Helper to compute service expense dealer can reap from OEM
  const getDealerReapedServiceExpense = (v: VehicleRecord): number => {
    if (v.dealerOpportunity?.warrantyReimbursementUsd) {
      return v.dealerOpportunity.warrantyReimbursementUsd;
    }
    if (v.aiDiagnosis.recommendedIntervention.warrantyLineItem?.totalReimbursementUsd) {
      return v.aiDiagnosis.recommendedIntervention.warrantyLineItem.totalReimbursementUsd;
    }
    return v.aiDiagnosis.recommendedIntervention.dealerWarrantyCreditUsd || 198;
  };

  // 5% Transmission fee formula (Lead sale only)
  const getTransmissionFee = (serviceExpense: number): number => {
    return Math.round(serviceExpense * 0.05 * 100) / 100;
  };

  // 30% Execution revenue formula (OEM Warranty Claim Filed)
  const getExecutionRevenue = (serviceExpense: number): number => {
    return Math.round(serviceExpense * 0.30 * 100) / 100;
  };

  // Check if vehicle has verified OEM warranty reimbursement claim filed
  const hasFiledWarrantyClaim = (v: VehicleRecord): boolean => {
    return (
      v.status === 'DEALER_EXECUTED' ||
      v.dealerOpportunity?.status === 'DEALER_EXECUTED' ||
      v.dealerOpportunity?.settlementBasis === 'OEM_WARRANTY_REIMBURSEMENT_CLAIM' ||
      v.dealerOpportunity?.warrantyClaimStatus === 'CLAIM_APPROVED' ||
      v.dealerOpportunity?.warrantyClaimStatus === 'CLAIM_SUBMITTED'
    );
  };

  // Current recognized revenue for a vehicle based on the OEM Data Rule:
  // - If dealer filed OEM warranty reimbursement claim -> 30% Execution Revenue (Result Data)
  // - Otherwise -> Strictly 5% Lead Sale Fee
  const getRecognizedRevenue = (v: VehicleRecord): number => {
    const expense = getDealerReapedServiceExpense(v);
    if (hasFiledWarrantyClaim(v)) {
      return getExecutionRevenue(expense); // 30%
    }
    if (v.status === 'DEALER_NOTIFIED' || v.dealerOpportunity?.status === 'LEAD_SOLD_TRANSMITTED') {
      return getTransmissionFee(expense); // Strictly 5% Lead Sale
    }
    return 0;
  };

  // Categorized groups
  const executedVehicles = vehicles.filter(hasFiledWarrantyClaim);

  const transmittedVehicles = vehicles.filter(
    (v) => (v.status === 'DEALER_NOTIFIED' || v.dealerOpportunity?.status === 'LEAD_SOLD_TRANSMITTED') &&
           !hasFiledWarrantyClaim(v)
  );

  const readyToTransmitVehicles = vehicles.filter(
    (v) => v.status === 'CONSENT_GRANTED'
  );

  // Aggregated Financial Metrics
  const total5PctTransmissionFees = transmittedVehicles.reduce(
    (sum, v) => sum + getTransmissionFee(getDealerReapedServiceExpense(v)),
    0
  );

  const total30PctExecutionRevenue = executedVehicles.reduce(
    (sum, v) => sum + getExecutionRevenue(getDealerReapedServiceExpense(v)),
    0
  );

  const totalCombinedPlatformRevenue = total5PctTransmissionFees + total30PctExecutionRevenue;

  const totalDealerServiceValue = [...executedVehicles, ...transmittedVehicles].reduce(
    (sum, v) => sum + getDealerReapedServiceExpense(v),
    0
  );

  const pipelinePotentialRevenue = readyToTransmitVehicles.reduce(
    (sum, v) => sum + getExecutionRevenue(getDealerReapedServiceExpense(v)),
    0
  );

  // Active Vehicle Metrics
  const activeExpense = getDealerReapedServiceExpense(activeVehicle);
  const activeTransmissionFee = getTransmissionFee(activeExpense);
  const activeExecutionRevenue = getExecutionRevenue(activeExpense);
  const activeRecognizedRevenue = getRecognizedRevenue(activeVehicle);
  const activeDealerNetProfit = Math.round((activeExpense - activeRecognizedRevenue) * 100) / 100;

  const isExecuted = hasFiledWarrantyClaim(activeVehicle);

  const isAlreadyTransmitted = 
    (activeVehicle.status === 'DEALER_NOTIFIED' || 
     activeVehicle.dealerOpportunity?.status === 'LEAD_SOLD_TRANSMITTED') &&
    !isExecuted;

  const hasConsent = 
    activeVehicle.consentRecord.status === 'CONSENT_GRANTED' || 
    isAlreadyTransmitted || 
    isExecuted;

  const activeWarrantyItem = 
    activeVehicle.dealerOpportunity?.warrantyLineItem || 
    activeVehicle.aiDiagnosis.recommendedIntervention.warrantyLineItem;

  // Handle Transmitting / Sending Lead to Dealer DMS (Earns 5% Fee strictly as Lead Sale)
  const handleTransmitLeadToDealer = async () => {
    setIsTransmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 700));

    const dealerName = activeVehicle.make === 'Hyundai' 
      ? 'Coastline Hyundai Certified Service Hub' 
      : 'Metro Ford Pro Commercial Hub';

    const wItem = activeVehicle.aiDiagnosis.recommendedIntervention.warrantyLineItem;
    const reimbursement = wItem?.totalReimbursementUsd || activeVehicle.aiDiagnosis.recommendedIntervention.dealerWarrantyCreditUsd || 198;
    const transFee = Math.round(reimbursement * 0.05 * 100) / 100;
    const execRev = Math.round(reimbursement * 0.30 * 100) / 100;

    const newDealerOpp: DealerOpportunity = {
      leadId: `LEAD-${activeVehicle.make.toUpperCase()}-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      roNumber: `RO-${activeVehicle.make.toUpperCase()}-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      dealerName,
      dealerAddress: activeVehicle.make === 'Hyundai' ? '1500 Van Ness Ave, San Francisco, CA' : '3200 Bayshore Blvd, San Francisco, CA',
      dealerDistanceMiles: activeVehicle.make === 'Hyundai' ? 3.4 : 4.8,
      status: 'LEAD_SOLD_TRANSMITTED',
      assignedTech: activeVehicle.make === 'Hyundai' ? 'Min-Seok Kim (Master GDS Specialist #41)' : 'Derrick Kowalczyk (Senior EV Master #91)',
      techContact: activeVehicle.make === 'Hyundai' ? '(415) 550-9840' : '(415) 770-4210',
      warrantyLaborHours: wItem?.flatRateHours || 1.1,
      warrantyReimbursementUsd: reimbursement,
      transmissionFeeRate: 0.05,
      transmissionFeeUsd: transFee,
      executionRevenueRate: 0.30,
      executionRevenueUsd: execRev,
      platformRevenueUsd: transFee, // Strictly 5% Lead Sale recognized upon transmission
      leadSaleCommissionRate: 0.05,
      settlementBasis: 'LEAD_SALE_TRANSMISSION_ONLY',
      warrantyClaimStatus: 'UNCLAIMED',
      dmsTransmissionId: `DMS-${activeVehicle.make === 'Hyundai' ? 'WEBDCS' : 'CDK'}-TX-${Math.floor(100000 + Math.random() * 900000)}`,
      dmsStatus: 'TRANSMITTED_ACKNOWLEDGED',
      transmittedAt: new Date().toISOString(),
      warrantyLineItem: wItem,
      suggestedCustomerCare: activeVehicle.make === 'Hyundai' ? 'Power Seat Motor Stall Amperage Recalibration' : 'HV Contactor Thermal Cycling Resistance Audit',
      potentialUpsellRevUsd: 145,
      serviceScheduledFor: activeVehicle.consentRecord.preferredTimeWindow || 'Within 48 Hours',
    };

    const updatedVehicle: VehicleRecord = {
      ...activeVehicle,
      status: 'DEALER_NOTIFIED',
      consentRecord: {
        ...activeVehicle.consentRecord,
        dealerNotifiedAt: new Date().toISOString(),
        authorizedDealership: dealerName,
      },
      dealerOpportunity: newDealerOpp,
    };

    setIsTransmitting(false);
    onUpdateVehicle(updatedVehicle);
  };

  // Action: Ingest OEM Warranty Reimbursement Claim as Official Result Data (Upgrades to 30%)
  const handleSyncOEMWarrantyClaim = async (v: VehicleRecord) => {
    setIsExecuting(true);
    await new Promise((resolve) => setTimeout(resolve, 600));

    const expense = getDealerReapedServiceExpense(v);
    const transFee = getTransmissionFee(expense);
    const execRev = getExecutionRevenue(expense);
    const claimSys = v.make === 'Hyundai' ? 'HYUNDAI_WEBDCS' : 'FORD_OASIS_PTS';
    const claimNum = `CLM-${v.make.toUpperCase()}-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    const warrantyClaimData: OEMWarrantyClaim = {
      claimNumber: claimNum,
      claimStatus: 'CLAIM_APPROVED',
      oemClaimSystem: claimSys,
      submittedAt: new Date(Date.now() - 3600000).toISOString(),
      approvedAt: new Date().toISOString(),
      claimedLaborHours: v.dealerOpportunity?.warrantyLaborHours || 1.1,
      claimedReimbursementUsd: expense,
      opCode: v.dealerOpportunity?.warrantyLineItem?.opCode || (v.make === 'Hyundai' ? '26V160V1' : '26V211F2'),
      technicianCertificationId: v.make === 'Hyundai' ? 'TECH-HMC-GDS-41' : 'TECH-FORD-EV-91',
      claimRemittanceAdviceId: `REM-${claimSys.slice(0, 4)}-${Math.floor(100000 + Math.random() * 900000)}`,
      complianceCertified: true,
    };

    const updatedOpp: DealerOpportunity = {
      ...(v.dealerOpportunity || {
        roNumber: `RO-${v.make.toUpperCase()}-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        leadId: `LEAD-${v.make.toUpperCase()}-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        dealerName: v.make === 'Hyundai' ? 'Coastline Hyundai Certified Service Hub' : 'Metro Ford Pro Commercial Hub',
        dealerAddress: 'San Francisco, CA',
        dealerDistanceMiles: 3.5,
        warrantyLaborHours: 1.1,
        suggestedCustomerCare: 'Comprehensive Multi-Point Safety Check',
        potentialUpsellRevUsd: 145,
      }),
      status: 'DEALER_EXECUTED',
      warrantyReimbursementUsd: expense,
      transmissionFeeRate: 0.05,
      transmissionFeeUsd: transFee,
      executionRevenueRate: 0.30,
      executionRevenueUsd: execRev,
      platformRevenueUsd: execRev, // Full 30% execution revenue recognized!
      settlementBasis: 'OEM_WARRANTY_REIMBURSEMENT_CLAIM',
      warrantyClaimStatus: 'CLAIM_APPROVED',
      warrantyClaim: warrantyClaimData,
      dealerExecutedAt: new Date().toISOString(),
      dealerExecutionInvoiceId: `INV-${v.make.toUpperCase()}-2026-${Math.floor(10000 + Math.random() * 90000)}`,
    };

    const updatedVehicle: VehicleRecord = {
      ...v,
      status: 'DEALER_EXECUTED',
      dealerOpportunity: updatedOpp,
    };

    setIsExecuting(false);
    setShowClaimModal(null);
    onUpdateVehicle(updatedVehicle);
  };

  // Action: Revert to Lead Sale Only (5%) by removing/unlinking the warranty claim
  const handleRevertToLeadSaleOnly = async (v: VehicleRecord) => {
    setIsExecuting(true);
    await new Promise((resolve) => setTimeout(resolve, 400));

    const expense = getDealerReapedServiceExpense(v);
    const transFee = getTransmissionFee(expense);

    if (v.dealerOpportunity) {
      const updatedOpp: DealerOpportunity = {
        ...v.dealerOpportunity,
        status: 'LEAD_SOLD_TRANSMITTED',
        platformRevenueUsd: transFee, // Back to 5%
        settlementBasis: 'LEAD_SALE_TRANSMISSION_ONLY',
        warrantyClaimStatus: 'UNCLAIMED',
        warrantyClaim: undefined,
        dealerExecutedAt: undefined,
      };

      const updatedVehicle: VehicleRecord = {
        ...v,
        status: 'DEALER_NOTIFIED',
        dealerOpportunity: updatedOpp,
      };

      setIsExecuting(false);
      setShowClaimModal(null);
      onUpdateVehicle(updatedVehicle);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto font-mono">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">SERVICE OPPORTUNITIES &amp; LEAD MONETIZATION</span>
            <span className="text-[11px] px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-200 font-bold rounded">
              OEM DATA INTEGRATED
            </span>
          </div>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Integrated with OEM warranty processing gateways (WebDCS / OASIS). <strong>Dealer warranty reimbursement claims serve as verified execution result data (30% revenue)</strong>. Unclaimed records settle strictly as <strong>Lead Sales (5% dispatch fee)</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center border border-slate-200 rounded p-0.5 bg-white shadow-xs">
            <button
              onClick={() => setActiveTab('ACTIVE_LEAD')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'ACTIVE_LEAD' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600 hover:text-blue-600'
              }`}
            >
              SELECTED LEAD
            </button>
            <button
              onClick={() => setActiveTab('ALL_OPPORTUNITIES')}
              className={`px-3 py-1 rounded flex items-center gap-1.5 transition-colors ${
                activeTab === 'ALL_OPPORTUNITIES' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600 hover:text-blue-600'
              }`}
            >
              <span>ALL OPPORTUNITIES</span>
              <span className={`text-[10px] px-1 rounded ${activeTab === 'ALL_OPPORTUNITIES' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {vehicles.length}
              </span>
            </button>
          </div>

          {onNavigateToLedger && (
            <button
              onClick={onNavigateToLedger}
              className="px-3 py-1.5 bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 rounded transition-colors flex items-center gap-1 font-semibold"
            >
              <Receipt className="w-3.5 h-3.5 text-blue-600" />
              <span>SETTLEMENT LEDGER →</span>
            </button>
          )}

          <button
            onClick={onBackToMonitor}
            className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:text-blue-600 rounded bg-white transition-colors"
          >
            ← MONITOR
          </button>
        </div>
      </div>

      {/* OEM DATA INTEGRATION RULE BANNER */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-3.5 rounded-lg shadow-sm border border-blue-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Database className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <span className="font-bold text-white font-mono flex items-center gap-1.5">
              <span>OEM WARRANTY CLAIM DATA INTEGRATION PROTOCOL</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-1.5 py-0.2 rounded">
                GROUND TRUTH VERIFIED
              </span>
            </span>
            <p className="text-slate-300 font-sans text-[11px] leading-relaxed">
              <strong>Warranty Reimbursement Claim Filed:</strong> Official claim submission in OEM warranty processing (Hyundai WebDCS / Ford OASIS) serves as verified ground truth execution data → <strong>30% full platform revenue share realized</strong>.<br />
              <strong>Unclaimed / Dispatched Lead:</strong> In the absence of an official OEM warranty claim, the transaction is calculated strictly as a <strong>5% Lead Sale Fee</strong>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
          <span className="px-2 py-1 bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 rounded font-semibold">
            Claim Filed: 30% Settled
          </span>
          <span className="px-2 py-1 bg-sky-950/80 border border-sky-500/60 text-sky-300 rounded font-semibold">
            Unclaimed: 5% Lead Only
          </span>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: 5% Lead Sale Fees */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="font-semibold">5% LEAD SALE FEES (UNCLAIMED)</span>
            <Send className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">${total5PctTransmissionFees.toFixed(2)}</span>
            <span className="text-[11px] text-slate-400">({transmittedVehicles.length} leads sold)</span>
          </div>
          <div className="text-[10px] text-blue-700 font-sans">
            Unclaimed in OEM · Lead sales only
          </div>
        </div>

        {/* Card 2: 30% OEM Warranty Claim Settlements */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="font-semibold">30% WARRANTY CLAIM REVENUE</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-700">${total30PctExecutionRevenue.toFixed(2)}</span>
            <span className="text-[11px] text-slate-400">({executedVehicles.length} verified)</span>
          </div>
          <div className="text-[10px] text-emerald-700 font-sans">
            Official OEM reimbursement claims
          </div>
        </div>

        {/* Card 3: Combined Platform Revenue */}
        <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-500/40 rounded-lg p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-blue-900 text-[11px]">
            <span className="font-bold flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-blue-600" />
              NET PLATFORM REVENUE
            </span>
            <span className="bg-blue-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded">
              TOTAL COLLECTED
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-blue-900">
            ${totalCombinedPlatformRevenue.toFixed(2)} USD
          </div>
          <div className="text-[10px] text-blue-800 font-sans font-medium">
            5% lead sales + 30% warranty claims
          </div>
        </div>

        {/* Card 4: Gross OEM Warranty Reaped */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="font-semibold">GROSS OEM SERVICE VOLUME</span>
            <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ${totalDealerServiceValue.toFixed(2)} USD
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Gross dealer claims · 70% dealer profit
          </div>
        </div>
      </div>

      {/* VIEW SELECTOR: ALL OPPORTUNITIES vs ACTIVE LEAD */}
      {activeTab === 'ALL_OPPORTUNITIES' ? (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-bold text-sm text-slate-900">FLEET RECALL OPPORTUNITIES &amp; SETTLEMENT LEDGER</span>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Dealer OEM warranty reimbursement claim status and recognized platform revenue
              </p>
            </div>
            <div className="text-xs text-slate-500 font-sans">
              Showing <strong>{vehicles.length}</strong> total fleet VINs
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">VEHICLE &amp; OWNER</th>
                  <th className="py-2.5 px-4">OEM WARRANTY EXPENSE</th>
                  <th className="py-2.5 px-4">LEAD SALE FEE (5%)</th>
                  <th className="py-2.5 px-4">WARRANTY EXECUTION (30%)</th>
                  <th className="py-2.5 px-4">OEM SETTLEMENT BASIS</th>
                  <th className="py-2.5 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((v) => {
                  const expense = getDealerReapedServiceExpense(v);
                  const sendFee = getTransmissionFee(expense);
                  const execRev = getExecutionRevenue(expense);
                  const isVExecuted = hasFiledWarrantyClaim(v);
                  const isVSold = (v.status === 'DEALER_NOTIFIED' || v.dealerOpportunity?.status === 'LEAD_SOLD_TRANSMITTED') && !isVExecuted;
                  const isVConsented = v.status === 'CONSENT_GRANTED';

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{v.ownerName}</div>
                        <div className="text-slate-500 font-mono text-[11px]">
                          {v.year} {v.make} {v.model} · <span className="text-slate-400">{v.vin}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        ${expense.toFixed(2)} USD
                        <span className="block text-[10px] text-slate-400 font-sans font-normal">
                          100% OEM Warranty
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        ${sendFee.toFixed(2)} USD
                        <span className="block text-[10px] text-slate-400 font-sans font-normal">
                          5% Lead Sale Fee
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-900 bg-blue-50/40">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                          <span>${execRev.toFixed(2)} USD</span>
                        </div>
                        <span className="block text-[10px] text-blue-700 font-sans font-medium">
                          30% Execution Take
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {isVExecuted ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Warranty Claim Approved (30%)
                            </span>
                            <span className="block text-[10px] text-slate-500 mt-0.5">
                              {v.dealerOpportunity?.warrantyClaim?.claimNumber || 'OEM Claim Synced'}
                            </span>
                          </div>
                        ) : isVSold ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-sky-800 font-bold bg-sky-100 border border-sky-300 px-2 py-0.5 rounded">
                              <Send className="w-3 h-3 text-sky-600" />
                              Lead Sale Only (5%)
                            </span>
                            <span className="block text-[10px] text-amber-700 font-sans mt-0.5">
                              Warranty Claim Unclaimed
                            </span>
                          </div>
                        ) : isVConsented ? (
                          <span className="inline-flex items-center gap-1 text-blue-800 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3 text-blue-600" />
                            Consented · Ready to Send
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded">
                            <Lock className="w-3 h-3 text-slate-400" />
                            Awaiting Customer Consent
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isVSold && (
                            <button
                              onClick={() => setShowClaimModal(v)}
                              className="px-2 py-1 text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded transition-colors flex items-center gap-1"
                              title="Sync dealer filed OEM warranty reimbursement claim data to settle 30% execution revenue"
                            >
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              <span>Sync Claim</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              onNavigateToAnalyzer(v);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 hover:border-blue-500 text-slate-700 hover:text-blue-600 rounded transition-colors"
                          >
                            Details →
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ACTIVE LEAD DETAIL VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* LEFT COLUMN: OPPORTUNITY DETAILS & OEM CLAIM DATA */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3.5 shadow-xs">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-mono">LEAD ID:</span>
                    <span className="text-xs font-bold text-blue-700 font-mono">
                      {activeVehicle.dealerOpportunity?.leadId || activeVehicle.dealerOpportunity?.roNumber || `LEAD-${activeVehicle.id}`}
                    </span>
                    {isExecuted ? (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.2 rounded font-mono">
                        Warranty Claim Approved (30%)
                      </span>
                    ) : isAlreadyTransmitted ? (
                      <span className="text-[10px] font-bold bg-sky-100 text-sky-900 border border-sky-300 px-1.5 py-0.2 rounded font-mono">
                        Lead Sale Dispatched (5% Fee)
                      </span>
                    ) : null}
                  </div>
                  <div className="font-bold text-base text-slate-900 font-sans mt-1">
                    {activeVehicle.ownerName}
                  </div>
                  <div className="text-xs text-slate-500 font-sans">
                    {activeVehicle.year} {activeVehicle.make} {activeVehicle.model} ({activeVehicle.vin})
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold text-slate-900 font-mono block">
                    ${activeExpense.toFixed(2)} USD
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    GROSS DEALER REIMBURSEMENT
                  </span>
                </div>
              </div>

              {/* Verified OEM Warranty Claim Items Dealer Reaps */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>OFFICIAL OEM WARRANTY CLAIM BREAKDOWN</span>
                  <span className="text-[10px] text-blue-700 font-normal">
                    Source: {activeWarrantyItem?.oemGatewaySource || (activeVehicle.make === 'Hyundai' ? 'HYUNDAI WEBDCS' : 'FORD OWLS PTS')}
                  </span>
                </div>

                <div className="p-3 border border-slate-200 rounded-md bg-slate-50/50 space-y-2 text-xs font-sans">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        {activeWarrantyItem?.opCodeDescription || activeVehicle.aiDiagnosis.recommendedIntervention.title}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        OpCode: <strong className="text-slate-800">{activeWarrantyItem?.opCode || '26V-CODE'}</strong> · NHTSA {activeVehicle.nhtsaCode}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      ${(activeWarrantyItem?.baseLaborTotalUsd || 198).toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-[11px] font-mono text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px]">FLAT RATE TIME:</span>
                      <span className="font-bold text-slate-800">{activeWarrantyItem?.flatRateHours || 1.1} hrs</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">APPROVED RATE:</span>
                      <span className="font-bold text-slate-800">${activeWarrantyItem?.approvedLaborRateUsd || 180}/hr</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">TRAVEL / MOBILE:</span>
                      <span className="font-bold text-slate-800">+${(activeWarrantyItem?.travelAllowanceUsd || 45).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Additional Dealership Upsell / Customer Care Potential */}
                <div className="p-2.5 border border-slate-200 rounded-md bg-white flex items-center justify-between text-xs font-sans">
                  <div>
                    <span className="font-semibold text-slate-900 block">
                      {activeVehicle.dealerOpportunity?.suggestedCustomerCare || 'Authorized Complimentary Multi-Point Inspection'}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Recommended high-retention customer goodwill care
                    </span>
                  </div>
                  <span className="font-mono font-bold text-blue-700">
                    +${(activeVehicle.dealerOpportunity?.potentialUpsellRevUsd || 145).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* OEM Warranty Reimbursement Status Card */}
              {isExecuted ? (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-md text-xs space-y-1.5">
                  <div className="font-bold text-emerald-950 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>OEM Warranty Reimbursement Claim Verified</span>
                    </span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 font-mono px-1.5 py-0.5 rounded font-bold">
                      VERIFIED RESULT DATA
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-700 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px]">CLAIM NUMBER:</span>
                      <span className="font-bold text-emerald-900">{activeVehicle.dealerOpportunity?.warrantyClaim?.claimNumber || 'CLM-2026-AUTO'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">OEM SYSTEM:</span>
                      <span className="font-bold text-slate-900">{activeVehicle.dealerOpportunity?.warrantyClaim?.oemClaimSystem || (activeVehicle.make === 'Hyundai' ? 'HYUNDAI WEBDCS' : 'FORD OASIS PTS')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">CLAIMED AMOUNT:</span>
                      <span className="font-bold text-slate-900">${activeExpense.toFixed(2)} USD</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">SETTLEMENT BASIS:</span>
                      <span className="font-bold text-emerald-800">30% Full Execution (${activeExecutionRevenue.toFixed(2)})</span>
                    </div>
                  </div>
                </div>
              ) : isAlreadyTransmitted ? (
                <div className="p-3 bg-amber-50/70 border border-amber-300 rounded-md text-xs space-y-1.5">
                  <div className="font-bold text-amber-950 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Warranty Reimbursement Unclaimed (Lead Sale Only)</span>
                    </span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-mono px-1.5 py-0.5 rounded font-bold">
                      5% FEE ONLY
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-sans">
                    Dealer received the lead via DMS but has not submitted an official OEM warranty reimbursement claim yet.
                    Platform revenue is recognized strictly as a <strong>Lead Sale fee (5%: ${activeTransmissionFee.toFixed(2)})</strong>.
                  </p>
                </div>
              ) : null}

              {/* Customer Contact & Booking Preference */}
              <div className="p-3 bg-blue-50/30 border border-blue-200 rounded-md text-xs font-sans space-y-1.5">
                <div className="font-semibold text-blue-950 flex items-center gap-1.5 font-mono">
                  <Car className="w-3.5 h-3.5 text-blue-600" />
                  <span>CONSENTED CUSTOMER APPOINTMENT PREFERENCE</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                  <div>
                    <span className="text-slate-400 block">PREFERRED WINDOW:</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {activeVehicle.consentRecord.preferredTimeWindow || 'Within 48 Hours'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">CONTACT CHANNEL:</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {activeVehicle.consentRecord.contactPreference || 'OEM CONNECTED APP & PHONE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 2-TIER MONETIZATION & REALIZATION CONSOLE */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3.5 shadow-xs">
              <div className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span>OEM REVENUE SETTLEMENT CONSOLE</span>
                </span>
                <span className="text-[10px] text-blue-700 font-mono font-bold">
                  {isExecuted ? '30% EXECUTION' : isAlreadyTransmitted ? '5% LEAD SALE' : 'READY TO DISPATCH'}
                </span>
              </div>

              {/* 2-Tier Monetization Breakdown Card */}
              <div className="p-3.5 rounded-lg border-2 border-blue-500/30 bg-blue-50/50 space-y-3">
                <div className="text-xs font-bold text-blue-950 flex items-center justify-between">
                  <span>SETTLEMENT BASIS</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    isExecuted ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                  }`}>
                    {isExecuted ? 'OEM WARRANTY CLAIM (30%)' : 'LEAD DISPATCH ONLY (5%)'}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  {/* Tier 1: 5% Transmission Fee */}
                  <div className={`p-2 rounded border flex items-center justify-between ${
                    isAlreadyTransmitted && !isExecuted 
                      ? 'bg-sky-100/70 border-sky-400 text-sky-950 font-bold' 
                      : isExecuted 
                      ? 'bg-white/80 border-slate-200 text-slate-600' 
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="block text-[11px]">1. Lead Transmission Fee (5%)</span>
                        {isAlreadyTransmitted && !isExecuted && (
                          <span className="text-[9px] bg-sky-200 text-sky-900 px-1 rounded">Active</span>
                        )}
                      </div>
                      <span className="text-[10px] font-sans font-normal text-slate-500">
                        Charged when lead sent without warranty claim
                      </span>
                    </div>
                    <span className="text-sm font-bold text-blue-900">
                      ${activeTransmissionFee.toFixed(2)} USD
                    </span>
                  </div>

                  {/* Tier 2: 30% Execution Full Revenue */}
                  <div className={`p-2 rounded border flex items-center justify-between ${
                    isExecuted 
                      ? 'bg-emerald-100/80 border-emerald-400 text-emerald-950 font-bold' 
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="block text-[11px]">2. OEM Warranty Execution Take (30%)</span>
                        {isExecuted && (
                          <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1 rounded">Verified Result</span>
                        )}
                      </div>
                      <span className="text-[10px] font-sans font-normal text-slate-500">
                        Realized from dealer OEM warranty claim
                      </span>
                    </div>
                    <span className={`text-sm font-bold ${isExecuted ? 'text-emerald-800' : 'text-slate-400'}`}>
                      ${activeExecutionRevenue.toFixed(2)} USD
                    </span>
                  </div>

                  {/* Current Recognized Revenue Total */}
                  <div className="pt-2 border-t border-blue-200 flex items-baseline justify-between">
                    <div>
                      <span className="font-bold text-blue-950 text-xs block">Current Recognized Revenue:</span>
                      <span className="text-[10px] text-blue-700 font-sans">
                        {isExecuted 
                          ? '30% Realized from OEM Warranty Claim' 
                          : isAlreadyTransmitted 
                          ? '5% Recognized from Lead Sale (Unclaimed)' 
                          : 'Awaiting Lead Dispatch to Dealer'}
                      </span>
                    </div>
                    <span className="font-bold text-xl text-blue-900">
                      ${activeRecognizedRevenue.toFixed(2)} USD
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-200/80 text-[11px] text-slate-600 font-sans flex items-center justify-between">
                  <span>Dealer Retained Profit (70%):</span>
                  <span className="font-mono font-bold text-slate-900">
                    ${activeDealerNetProfit.toFixed(2)} USD
                  </span>
                </div>
              </div>

              {/* Dealership Recipient & Integration Route */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Purchasing Dealership:</span>
                  <span className="text-blue-700 font-bold font-mono">DMS &amp; OEM DIRECT</span>
                </div>
                <div className="font-bold text-slate-900 font-sans text-xs">
                  {activeVehicle.dealerOpportunity?.dealerName || (
                    activeVehicle.make === 'Hyundai' 
                      ? 'Coastline Hyundai Certified Service Hub' 
                      : 'Metro Ford Pro Commercial Hub'
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {activeVehicle.dealerOpportunity?.dealerAddress || '1500 Van Ness Ave, San Francisco, CA'}
                </div>
                <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>OEM Portal Gateway:</span>
                  <span className="font-semibold text-slate-700">
                    {activeVehicle.make === 'Hyundai' ? 'Hyundai WebDCS XML Gateway' : 'Ford OASIS / CDK Open Web Services'}
                  </span>
                </div>
              </div>

              {/* Dynamic Interactive Action Buttons */}
              <div className="space-y-2 pt-1">
                {isExecuted ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-md space-y-1.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-950">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>OEM WARRANTY CLAIM APPROVED (30% SETTLED)</span>
                      </div>
                      <div className="text-[11px] text-emerald-900 font-mono">
                        Claim: {activeVehicle.dealerOpportunity?.warrantyClaim?.claimNumber || 'CLM-2026-AUTO'} · RO {activeVehicle.dealerOpportunity?.roNumber}
                      </div>
                      <div className="text-[11px] text-slate-700 font-sans">
                        OEM result data verified. Platform revenue of <strong className="text-emerald-900 font-mono">${activeExecutionRevenue.toFixed(2)} USD</strong> (30%) finalized.
                      </div>
                    </div>

                    {/* Button to simulate reverting to Lead Sale only */}
                    <button
                      onClick={() => handleRevertToLeadSaleOnly(activeVehicle)}
                      disabled={isExecuting}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] rounded border border-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                      title="Revert to unclaimed status to test 5% Lead Sale calculation"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-500" />
                      <span>Revert to Unclaimed Status (Test 5% Lead Sale Only)</span>
                    </button>
                  </div>
                ) : isAlreadyTransmitted ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-sky-100/70 border border-sky-300 rounded-md space-y-1.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-sky-950">
                        <Check className="w-4 h-4 text-sky-700" />
                        <span>LEAD SALE TRANSMITTED (CURRENT 5% FEE: ${activeTransmissionFee.toFixed(2)})</span>
                      </div>
                      <div className="text-[11px] text-sky-900 font-mono">
                        DMS TX: {activeVehicle.dealerOpportunity?.dmsTransmissionId || 'DMS-TX-98402'}
                      </div>
                      <div className="text-[10px] text-slate-600 font-sans">
                        Dealer has not filed an OEM warranty reimbursement claim yet; calculated strictly as a lead sale.
                      </div>
                    </div>

                    {/* Step to sync OEM Warranty Reimbursement claim as result data */}
                    <button
                      onClick={() => setShowClaimModal(activeVehicle)}
                      disabled={isExecuting}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>SYNC OEM WARRANTY CLAIM (RECOGNIZE 30%: ${activeExecutionRevenue.toFixed(2)})</span>
                    </button>
                  </div>
                ) : hasConsent ? (
                  <button
                    onClick={handleTransmitLeadToDealer}
                    disabled={isTransmitting}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isTransmitting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>DISPATCHING LEAD TO DEALER DMS...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>DISPATCH LEAD TO DEALER (EARN 5%: ${activeTransmissionFee.toFixed(2)})</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700">
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span>CUSTOMER CONSENT REQUIRED</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-sans">
                      Per compliance mandates, leads cannot be transmitted until the customer grants consent via the OEM connected app.
                    </p>
                    <button
                      onClick={() => onNavigateToAnalyzer(activeVehicle)}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>OBTAIN CONSENT IN ANALYZER</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Note on 5% vs 30% Value Proposition */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 font-sans space-y-1">
              <span className="font-bold text-slate-700 block">OEM Integration Business Model:</span>
              <p className="leading-relaxed">
                Whether a recall service was completed is verified via official warranty reimbursement claim submissions in OEM systems. Once confirmed, the platform recognizes <strong>30% execution revenue</strong>. Prior to claim submission, the platform strictly charges a <strong>5% lead generation fee</strong>.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* POPUP MODAL: OEM WARRANTY REIMBURSEMENT CLAIM SYNC MODAL */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-lg w-full overflow-hidden font-mono animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs tracking-wider">SYNC OEM WARRANTY REIMBURSEMENT CLAIM</span>
              </div>
              <button
                onClick={() => setShowClaimModal(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 font-sans text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-950 font-mono text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>AUTOMATED OEM RESULT DATA DETECTION</span>
                </div>
                <p className="text-slate-700 leading-relaxed text-[11px]">
                  The dealer submitted a warranty reimbursement claim via the OEM portal ({showClaimModal.make === 'Hyundai' ? 'Hyundai WebDCS Gateway' : 'Ford OASIS/PTS'}). Ingest this claim submission as official ground-truth execution result data to settle 30% platform revenue.
                </p>
              </div>

              {/* Claim Itemized Fields */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 font-mono text-[11px]">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Target Vehicle / VIN:</span>
                  <span className="font-bold text-slate-900">{showClaimModal.vin}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">OEM Claim System:</span>
                  <span className="font-bold text-blue-700">
                    {showClaimModal.make === 'Hyundai' ? 'Hyundai WebDCS (Korea/US)' : 'Ford OASIS / OWLS PTS'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">NHTSA Recall Code:</span>
                  <span className="font-bold text-slate-800">{showClaimModal.nhtsaCode}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Labor OpCode:</span>
                  <span className="font-bold text-slate-800">
                    {showClaimModal.dealerOpportunity?.warrantyLineItem?.opCode || (showClaimModal.make === 'Hyundai' ? '26V160V1' : '26V211F2')}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Dealer Claimed Reimbursement:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    ${getDealerReapedServiceExpense(showClaimModal).toFixed(2)} USD
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-emerald-800 font-bold">Settled Revenue (30% Execution Take):</span>
                  <span className="font-bold text-emerald-700 text-base">
                    ${getExecutionRevenue(getDealerReapedServiceExpense(showClaimModal)).toFixed(2)} USD
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowClaimModal(null)}
                  className="px-3 py-2 border border-slate-300 text-slate-700 font-mono text-xs rounded hover:bg-slate-50 transition-colors"
                >
                  Cancel (Keep 5% Lead Sale Only)
                </button>
                <button
                  onClick={() => handleSyncOEMWarrantyClaim(showClaimModal)}
                  disabled={isExecuting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold rounded shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  {isExecuting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Ingesting Claim...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve &amp; Ingest Claim (Settle 30%)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
