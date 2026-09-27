import React, { useState } from 'react';
import { VehicleRecord, DealerOpportunity, OEMWarrantyClaim } from '../types';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
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
  Download,
  Filter,
  AlertCircle,
  ExternalLink,
  Zap,
  Database,
  RotateCcw
} from 'lucide-react';

interface RevenueSettlementLedgerProps {
  vehicles: VehicleRecord[];
  activeVehicle: VehicleRecord;
  onUpdateVehicle: (updated: VehicleRecord) => void;
  onNavigateToAnalyzer: (vehicle: VehicleRecord) => void;
  onNavigateToOpportunities: (vehicle: VehicleRecord) => void;
  onBackToMonitor: () => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs font-mono space-y-1.5 z-50">
        <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex items-center justify-between gap-4">
          <span>{label}</span>
          {data.milestone && (
            <span className="text-[10px] text-blue-400 font-sans">{data.milestone}</span>
          )}
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex items-center justify-between gap-4 text-blue-400 font-bold">
            <span>Total Platform Revenue:</span>
            <span>${Number(data.platformRevenue).toFixed(2)} USD</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-emerald-400">
            <span>30% Warranty Claims Approved:</span>
            <span>${Number(data.executionRevenue || 0).toFixed(2)} USD</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-sky-400">
            <span>5% Lead Sale Fees:</span>
            <span>${Number(data.transmissionFees || 0).toFixed(2)} USD</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-400 pt-1 border-t border-slate-800">
            <span>Gross Dealer Claims:</span>
            <span>${Number(data.dealerReapedExpense).toFixed(2)} USD</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const RevenueSettlementLedger: React.FC<RevenueSettlementLedgerProps> = ({
  vehicles,
  activeVehicle,
  onUpdateVehicle,
  onNavigateToAnalyzer,
  onNavigateToOpportunities,
  onBackToMonitor,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'CLAIMED_30' | 'UNCLAIMED_5' | 'CONSENTED'>('ALL');
  const [selectedInvoiceVehicle, setSelectedInvoiceVehicle] = useState<VehicleRecord | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);

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

  // 5% Transmission Fee formula (Lead Sale only)
  const getTransmissionFee = (serviceExpense: number): number => {
    return Math.round(serviceExpense * 0.05 * 100) / 100;
  };

  // 30% Full Execution Revenue formula (Warranty Claim Filed)
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

  // Categorized vehicle groups
  const executedVehicles = vehicles.filter(hasFiledWarrantyClaim);

  const transmittedVehicles = vehicles.filter(
    (v) => (v.status === 'DEALER_NOTIFIED' || v.dealerOpportunity?.status === 'LEAD_SOLD_TRANSMITTED') &&
           !hasFiledWarrantyClaim(v)
  );

  const consentedVehicles = vehicles.filter(
    (v) => v.status === 'CONSENT_GRANTED'
  );

  // Financial aggregates
  const total5PctTransmissionFees = transmittedVehicles.reduce(
    (sum, v) => sum + getTransmissionFee(getDealerReapedServiceExpense(v)),
    0
  );

  const total30PctExecutionRevenue = executedVehicles.reduce(
    (sum, v) => sum + getExecutionRevenue(getDealerReapedServiceExpense(v)),
    0
  );

  const totalCombinedPlatformRevenue = total5PctTransmissionFees + total30PctExecutionRevenue;

  const totalGrossDealerServiceVolume = [...executedVehicles, ...transmittedVehicles].reduce(
    (sum, v) => sum + getDealerReapedServiceExpense(v),
    0
  );

  const totalDealerNetRetainedEarnings = [...executedVehicles, ...transmittedVehicles].reduce(
    (sum, v) => {
      const expense = getDealerReapedServiceExpense(v);
      const fee = getRecognizedRevenue(v);
      return sum + (expense - fee);
    },
    0
  );

  const pipelinePotentialRevenue = consentedVehicles.reduce(
    (sum, v) => sum + getExecutionRevenue(getDealerReapedServiceExpense(v)),
    0
  );

  // Historical revenue data points leading up to today
  const chartData = [
    { 
      period: 'W1 (Aug 03)', 
      leadsSent: 0, 
      platformRevenue: 0, 
      executionRevenue: 0,
      transmissionFees: 0, 
      dealerReapedExpense: 0, 
      milestone: 'NHTSA 26V-160 / 26V-211 Published' 
    },
    { 
      period: 'W2 (Aug 10)', 
      leadsSent: 1, 
      platformRevenue: 12.40, 
      executionRevenue: 0,
      transmissionFees: 12.40, 
      dealerReapedExpense: 248.00, 
      milestone: 'Initial Lead Dispatched via Connected App' 
    },
    { 
      period: 'W3 (Aug 17)', 
      leadsSent: 2, 
      platformRevenue: 24.80, 
      executionRevenue: 0,
      transmissionFees: 24.80, 
      dealerReapedExpense: 496.00, 
      milestone: 'Hyundai WebDCS Gateway Certified' 
    },
    { 
      period: 'W4 (Aug 24)', 
      leadsSent: 3, 
      platformRevenue: 36.95, 
      executionRevenue: 0,
      transmissionFees: 36.95, 
      dealerReapedExpense: 739.00, 
      milestone: 'Fleet Batch Pilot Initiated' 
    },
    { 
      period: 'W5 (Aug 31)', 
      leadsSent: 4, 
      platformRevenue: 49.35, 
      executionRevenue: 0,
      transmissionFees: 49.35, 
      dealerReapedExpense: 987.00, 
      milestone: 'CDK Open Web Services Connected' 
    },
    { 
      period: 'W6 (Sep 07)', 
      leadsSent: 5, 
      platformRevenue: 111.35, 
      executionRevenue: 62.00,
      transmissionFees: 49.35, 
      dealerReapedExpense: 1235.00, 
      milestone: 'First OEM Warranty Reimbursement Verified (30%)' 
    },
    { 
      period: 'W7 (Sep 14)', 
      leadsSent: 6, 
      platformRevenue: 136.15, 
      executionRevenue: 62.00,
      transmissionFees: 74.15, 
      dealerReapedExpense: 1483.00, 
      milestone: 'Ford Pro Mobile Service Scaling' 
    },
    { 
      period: 'W8 (Sep 21)', 
      leadsSent: 7, 
      platformRevenue: 198.15, 
      executionRevenue: 111.60,
      transmissionFees: 86.55, 
      dealerReapedExpense: 1731.00, 
      milestone: 'Bay Area Dealership Network Live' 
    },
    { 
      period: 'Today (Live)', 
      leadsSent: 7 + transmittedVehicles.length + executedVehicles.length, 
      platformRevenue: Math.round((198.15 + totalCombinedPlatformRevenue) * 100) / 100, 
      executionRevenue: Math.round((111.60 + total30PctExecutionRevenue) * 100) / 100,
      transmissionFees: Math.round((86.55 + total5PctTransmissionFees) * 100) / 100,
      dealerReapedExpense: Math.round((1731.00 + totalGrossDealerServiceVolume) * 100) / 100,
      milestone: 'Live OEM Warranty & Lead Settlements' 
    },
  ];

  // Filtered vehicle list
  const filteredVehicles = vehicles.filter((v) => {
    if (filter === 'CLAIMED_30') {
      return hasFiledWarrantyClaim(v);
    }
    if (filter === 'UNCLAIMED_5') {
      return (v.status === 'DEALER_NOTIFIED' || v.dealerOpportunity?.status === 'LEAD_SOLD_TRANSMITTED') &&
             !hasFiledWarrantyClaim(v);
    }
    if (filter === 'CONSENTED') {
      return v.status === 'CONSENT_GRANTED';
    }
    return true; // 'ALL'
  });

  // Action: Ingest OEM Warranty Reimbursement Claim as Official Result Data (Upgrades to 30%)
  const handleSyncOEMWarrantyClaim = async (v: VehicleRecord) => {
    setExecutingId(v.id);
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

    setExecutingId(null);
    onUpdateVehicle(updatedVehicle);
  };

  // Action: Transmit Consented Lead to Dealer DMS (Earns 5% Fee strictly as Lead Sale)
  const handleTransmitLead = async (v: VehicleRecord) => {
    setExecutingId(v.id);
    await new Promise((resolve) => setTimeout(resolve, 600));

    const expense = getDealerReapedServiceExpense(v);
    const transFee = getTransmissionFee(expense);
    const execRev = getExecutionRevenue(expense);
    const dealerName = v.make === 'Hyundai' 
      ? 'Coastline Hyundai Certified Service Hub' 
      : 'Metro Ford Pro Commercial Hub';

    const updatedOpp: DealerOpportunity = {
      leadId: `LEAD-${v.make.toUpperCase()}-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      roNumber: `RO-${v.make.toUpperCase()}-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      dealerName,
      dealerAddress: v.make === 'Hyundai' ? '1500 Van Ness Ave, San Francisco, CA' : '3200 Bayshore Blvd, San Francisco, CA',
      dealerDistanceMiles: 3.8,
      status: 'LEAD_SOLD_TRANSMITTED',
      warrantyLaborHours: 1.1,
      warrantyReimbursementUsd: expense,
      transmissionFeeRate: 0.05,
      transmissionFeeUsd: transFee,
      executionRevenueRate: 0.30,
      executionRevenueUsd: execRev,
      platformRevenueUsd: transFee, // Strictly 5% Lead Sale recognized upon transmission
      settlementBasis: 'LEAD_SALE_TRANSMISSION_ONLY',
      warrantyClaimStatus: 'UNCLAIMED',
      dmsTransmissionId: `DMS-${v.make === 'Hyundai' ? 'WEBDCS' : 'CDK'}-TX-${Math.floor(100000 + Math.random() * 900000)}`,
      dmsStatus: 'TRANSMITTED_ACKNOWLEDGED',
      transmittedAt: new Date().toISOString(),
      suggestedCustomerCare: 'High-Retention Customer Goodwill Care',
      potentialUpsellRevUsd: 145,
    };

    const updatedVehicle: VehicleRecord = {
      ...v,
      status: 'DEALER_NOTIFIED',
      consentRecord: {
        ...v.consentRecord,
        dealerNotifiedAt: new Date().toISOString(),
        authorizedDealership: dealerName,
      },
      dealerOpportunity: updatedOpp,
    };

    setExecutingId(null);
    onUpdateVehicle(updatedVehicle);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto font-mono">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">REVENUE SETTLEMENT LEDGER &amp; OEM DATA CLEARING</span>
            <span className="text-[11px] px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-200 font-bold rounded">
              OEM DATA INTEGRATED
            </span>
          </div>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Revenue settlement ledger integrated with OEM data clearing. <strong>Dealer warranty reimbursement claims serve as official execution result data (30% revenue)</strong>; unclaimed leads settle strictly as <strong>Lead Sales (5% dispatch fee)</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => onNavigateToOpportunities(activeVehicle)}
            className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:text-blue-600 rounded bg-white transition-colors"
          >
            ← SERVICE OPPORTUNITIES
          </button>
          <button
            onClick={onBackToMonitor}
            className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:text-blue-600 rounded bg-white transition-colors"
          >
            MONITOR
          </button>
        </div>
      </div>

      {/* OEM DATA INTEGRATION RULE BANNER */}
      <div className="bg-slate-900 text-white p-3.5 rounded-lg border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Database className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <span className="font-bold text-slate-200 font-mono flex items-center gap-1.5">
              <span>OEM DATA LINKED SETTLEMENT PRINCIPLE</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.2 rounded font-sans">
                AUTOMATED AUDIT CLEARING
              </span>
            </span>
            <p className="text-slate-300 font-sans text-[11px] leading-relaxed">
              <strong>1. Warranty Reimbursement Claim Ingestion:</strong> When a dealer completes a remedy and obtains OEM approval (WebDCS / OASIS), the claim data is ingested as verified execution result data to settle <strong>30% full platform revenue</strong>.<br />
              <strong>2. Unclaimed / Lead Transmission Status:</strong> Prior to official warranty claim submission, records are settled strictly as a <strong>5% Lead Sale Fee</strong>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
          <span className="px-2 py-1 bg-emerald-950 border border-emerald-500/60 text-emerald-300 rounded font-bold">
            Warranty Claim: 30% Settlement
          </span>
          <span className="px-2 py-1 bg-sky-950 border border-sky-500/60 text-sky-300 rounded font-bold">
            Unclaimed: 5% Lead Only
          </span>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: Total Leads Generated */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="font-semibold">TOTAL FLEET LEADS</span>
            <Layers className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-sans text-slate-900">
              {transmittedVehicles.length + executedVehicles.length}
            </span>
            <span className="text-[11px] text-slate-400">/ {vehicles.length} fleet</span>
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            {executedVehicles.length} claims approved · {transmittedVehicles.length} unclaimed
          </div>
        </div>

        {/* Card 2: 5% Transmission Fees Accrued */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="font-semibold">5% LEAD SALE FEES</span>
            <Send className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ${total5PctTransmissionFees.toFixed(2)}
          </div>
          <div className="text-[10px] text-sky-700 font-sans">
            Unclaimed leads ({transmittedVehicles.length}) · Lead sales only
          </div>
        </div>

        {/* Card 3: 30% Service Execution Revenue Realized */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="font-semibold">30% WARRANTY CLAIM REVENUE</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            ${total30PctExecutionRevenue.toFixed(2)}
          </div>
          <div className="text-[10px] text-emerald-700 font-sans">
            OEM result data verified ({executedVehicles.length})
          </div>
        </div>

        {/* Card 4: COMBINED PLATFORM REVENUE COLLECTED */}
        <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-600/50 rounded-lg p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-blue-900 text-[11px]">
            <span className="font-bold flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-blue-600" />
              NET PLATFORM REVENUE
            </span>
            <span className="bg-blue-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded">
              COLLECTED
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-blue-900">
            ${totalCombinedPlatformRevenue.toFixed(2)} USD
          </div>
          <div className="text-[10px] text-blue-800 font-sans font-medium">
            5% lead sales + 30% warranty claims
          </div>
        </div>

        {/* Card 5: Dealer Retained Net Value (70%) */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="font-semibold">DEALER NET RETAINED (70%)</span>
            <Building2 className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ${totalDealerNetRetainedEarnings.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            70% gross margin retained by participating dealers
          </div>
        </div>
      </div>

      {/* HISTORICAL REVENUE TREND LINE CHART (RECHARTS) */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
        {/* Chart Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-xs text-slate-900 tracking-wide">
                HISTORICAL REVENUE GROWTH TREND (OEM REIMBURSEMENT &amp; LEAD SALES)
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-900 font-bold px-1.5 py-0.2 rounded font-mono">
                RECHARTS
              </span>
            </div>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Cumulative growth trajectory of 30% OEM warranty reimbursement claims and 5% unclaimed lead dispatch fees over time.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded text-blue-900 font-bold flex items-center gap-1">
              <span className="text-[10px] text-blue-600 font-normal">CUMULATIVE REV:</span>
              <span>${chartData[chartData.length - 1].platformRevenue.toFixed(2)} USD</span>
            </div>
            <div className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 font-bold hidden sm:flex items-center gap-1">
              <span className="text-[10px] text-emerald-600 font-normal">MOM GROWTH:</span>
              <span>+194.2%</span>
            </div>
          </div>
        </div>

        {/* Recharts LineChart Visualizer */}
        <div className="w-full h-72 pt-1 font-mono">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 12, right: 25, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis 
                dataKey="period" 
                stroke="#64748B" 
                fontSize={11} 
                tickLine={false} 
                dy={6}
              />
              <YAxis 
                stroke="#64748B" 
                fontSize={11} 
                tickLine={false} 
                tickFormatter={(v) => `$${v}`} 
                dx={-4}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                iconType="circle"
              />
              {/* Primary Line: Cumulative Platform Revenue */}
              <Line
                type="monotone"
                dataKey="platformRevenue"
                name="Total Platform Revenue (Combined)"
                stroke="#2563EB"
                strokeWidth={3}
                dot={{ r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#FFFFFF' }}
                activeDot={{ r: 6, fill: '#1D4ED8' }}
              />
              {/* Secondary Line: 30% Execution Revenue (Warranty Claims) */}
              <Line
                type="monotone"
                dataKey="executionRevenue"
                name="30% Warranty Claims Approved (OEM Result Data)"
                stroke="#10B981"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={{ r: 3, fill: '#10B981' }}
              />
              {/* Tertiary Line: 5% Transmission Fees (Lead Sales) */}
              <Line
                type="monotone"
                dataKey="transmissionFees"
                name="5% Lead Sale Fees (Unclaimed Leads)"
                stroke="#38BDF8"
                strokeWidth={2}
                dot={{ r: 3, fill: '#38BDF8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FILTER & AUDIT TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-bold text-slate-800">FILTER BY SETTLEMENT BASIS:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1 rounded transition-colors ${
              filter === 'ALL'
                ? 'bg-slate-900 text-white font-bold'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            All Settlements ({vehicles.length})
          </button>
          <button
            onClick={() => setFilter('CLAIMED_30')}
            className={`px-3 py-1 rounded flex items-center gap-1 transition-colors ${
              filter === 'CLAIMED_30'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Warranty Claims Approved 30% ({executedVehicles.length})</span>
          </button>
          <button
            onClick={() => setFilter('UNCLAIMED_5')}
            className={`px-3 py-1 rounded flex items-center gap-1 transition-colors ${
              filter === 'UNCLAIMED_5'
                ? 'bg-sky-600 text-white font-bold'
                : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200'
            }`}
          >
            <Send className="w-3 h-3" />
            <span>Unclaimed · Lead Sales 5% ({transmittedVehicles.length})</span>
          </button>
          <button
            onClick={() => setFilter('CONSENTED')}
            className={`px-3 py-1 rounded flex items-center gap-1 transition-colors ${
              filter === 'CONSENTED'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Consented · Ready to Dispatch ({consentedVehicles.length})</span>
          </button>
        </div>
      </div>

      {/* COMPREHENSIVE REVENUE LEDGER TABLE */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="font-bold text-sm text-slate-900">
              AUDITED SETTLEMENT TRANSACTION LEDGER
            </span>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Itemized transactions categorized by OEM warranty reimbursement claim status and recognized platform fee
            </p>
          </div>
          <div className="text-xs text-slate-500 font-sans">
            Showing <strong>{filteredVehicles.length}</strong> record(s)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px]">
              <tr>
                <th className="py-2.5 px-4">TRANSACTION REF</th>
                <th className="py-2.5 px-4">VEHICLE &amp; OWNER</th>
                <th className="py-2.5 px-4">PARTICIPATING DEALER</th>
                <th className="py-2.5 px-4">OEM WARRANTY EXPENSE</th>
                <th className="py-2.5 px-4">SETTLEMENT BASIS &amp; DATA SOURCE</th>
                <th className="py-2.5 px-4">RECOGNIZED REVENUE</th>
                <th className="py-2.5 px-4">STATUS</th>
                <th className="py-2.5 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.map((v) => {
                const expense = getDealerReapedServiceExpense(v);
                const transFee = getTransmissionFee(expense);
                const execRev = getExecutionRevenue(expense);
                const isExecuted = hasFiledWarrantyClaim(v);
                const isTransmitted = (v.status === 'DEALER_NOTIFIED' || v.dealerOpportunity?.status === 'LEAD_SOLD_TRANSMITTED') && !isExecuted;
                const isConsented = v.status === 'CONSENT_GRANTED';
                const isExecuting = executingId === v.id;

                return (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Transaction Reference */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {v.dealerOpportunity?.roNumber || `RO-PENDING-${v.id}`}
                      </div>
                      {isExecuted ? (
                        <div className="text-[10px] text-emerald-700 font-bold">
                          {v.dealerOpportunity?.warrantyClaim?.claimNumber || v.dealerOpportunity?.dealerExecutionInvoiceId || 'OEM CLAIM SYNCED'}
                        </div>
                      ) : isTransmitted ? (
                        <div className="text-[10px] text-sky-700">
                          {v.dealerOpportunity?.dmsTransmissionId || 'DMS TX LIVE'}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 italic">Awaiting Consent</div>
                      )}
                    </td>

                    {/* Customer & Vehicle */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 font-sans">{v.ownerName}</div>
                      <div className="text-slate-500 font-mono text-[11px]">
                        {v.year} {v.make} {v.model}
                      </div>
                      <div className="text-slate-400 font-mono text-[10px]">{v.vin}</div>
                    </td>

                    {/* Participating Dealer */}
                    <td className="py-3 px-4 font-sans text-xs">
                      <div className="font-medium text-slate-800">
                        {v.dealerOpportunity?.dealerName || (
                          v.make === 'Hyundai' ? 'Coastline Hyundai Hub' : 'Metro Ford Pro Hub'
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {v.make === 'Hyundai' ? 'Hyundai WebDCS Gateway' : 'Ford OASIS / CDK Open DMS'}
                      </div>
                    </td>

                    {/* Gross Service Expense */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      ${expense.toFixed(2)}
                      <span className="block text-[10px] text-slate-400 font-sans font-normal">
                        100% OEM Warranty
                      </span>
                    </td>

                    {/* Settlement Basis & Data Source */}
                    <td className="py-3 px-4 font-sans text-[11px]">
                      {isExecuted ? (
                        <div>
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded font-mono text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            OEM Warranty Claim Approved (30%)
                          </span>
                          <span className="block text-[10px] text-slate-500 mt-0.5 font-mono">
                            {v.dealerOpportunity?.warrantyClaim?.oemClaimSystem || 'OEM WebDCS/OASIS'} Live
                          </span>
                        </div>
                      ) : isTransmitted ? (
                        <div>
                          <span className="inline-flex items-center gap-1 font-bold text-sky-800 bg-sky-100 border border-sky-300 px-2 py-0.5 rounded font-mono text-[10px]">
                            <Send className="w-3 h-3 text-sky-600" />
                            Lead Sale Dispatched (5%)
                          </span>
                          <span className="block text-[10px] text-amber-700 font-sans mt-0.5">
                            Warranty Claim Unclaimed
                          </span>
                        </div>
                      ) : isConsented ? (
                        <span className="text-blue-700 font-mono text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          Awaiting Lead Dispatch
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">
                          Customer Consent Required
                        </span>
                      )}
                    </td>

                    {/* Net Recognized Revenue Badge */}
                    <td className="py-3 px-4 font-mono font-bold bg-blue-50/40">
                      {isExecuted ? (
                        <div className="text-emerald-700 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                          <span>${execRev.toFixed(2)} USD</span>
                        </div>
                      ) : isTransmitted ? (
                        <div className="text-blue-700 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                          <span>${transFee.toFixed(2)} USD</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal">$0.00 (Pending)</span>
                      )}
                      <span className="block text-[10px] text-slate-500 font-sans font-normal">
                        {isExecuted ? '30% Result Settled' : isTransmitted ? '5% Lead Sale Fee' : 'Pipeline'}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {isExecuted ? (
                        <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Claim Approved
                        </span>
                      ) : isTransmitted ? (
                        <span className="inline-flex items-center gap-1 text-sky-900 font-bold bg-sky-100 border border-sky-300 px-2 py-0.5 rounded">
                          <Send className="w-3 h-3 text-sky-600" />
                          Lead Dispatched
                        </span>
                      ) : isConsented ? (
                        <span className="inline-flex items-center gap-1 text-blue-800 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          <Clock className="w-3 h-3 text-blue-500" />
                          Consented (Ready)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          <Lock className="w-3 h-3 text-slate-400" />
                          Awaiting Consent
                        </span>
                      )}
                    </td>

                    {/* Action Column */}
                    <td className="py-3 px-4 text-right">
                      {isExecuted ? (
                        <button
                          onClick={() => setSelectedInvoiceVehicle(v)}
                          className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-xs transition-colors flex items-center gap-1 ml-auto"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Claim Invoice (30%)</span>
                        </button>
                      ) : isTransmitted ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSyncOEMWarrantyClaim(v)}
                            disabled={isExecuting}
                            className="px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-xs transition-colors flex items-center gap-1 disabled:opacity-50"
                            title="Ingest dealer submitted OEM warranty reimbursement claim data to upgrade settlement to 30%"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Sync Claim (30%)</span>
                          </button>
                          <button
                            onClick={() => setSelectedInvoiceVehicle(v)}
                            className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-blue-600 bg-white border border-slate-200 rounded"
                            title="View 5% Lead Sale Receipt"
                          >
                            Receipt (5%)
                          </button>
                        </div>
                      ) : isConsented ? (
                        <button
                          onClick={() => handleTransmitLead(v)}
                          disabled={isExecuting}
                          className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded shadow-xs transition-colors flex items-center gap-1 ml-auto disabled:opacity-50"
                        >
                          <Send className="w-3 h-3" />
                          <span>Send Lead (5%)</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onNavigateToAnalyzer(v)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-blue-600 bg-white border border-slate-200 rounded hover:border-blue-400 transition-colors"
                        >
                          Analyzer →
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP MODAL: OFFICIAL REVENUE SETTLEMENT STATEMENT & DEALER INVOICE */}
      {selectedInvoiceVehicle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-xl w-full overflow-hidden font-mono animate-in fade-in zoom-in-95 duration-150">
            {/* Invoice Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs tracking-wider">OFFICIAL REVENUE SETTLEMENT STATEMENT</span>
              </div>
              <button
                onClick={() => setSelectedInvoiceVehicle(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Invoice Body */}
            <div className="p-5 space-y-4 font-sans text-xs">
              <div className="flex items-start justify-between border-b border-slate-200 pb-3 font-mono">
                <div>
                  <div className="text-[10px] text-slate-400">SETTLEMENT INVOICE #</div>
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedInvoiceVehicle.dealerOpportunity?.dealerExecutionInvoiceId || `INV-LM-2026-${selectedInvoiceVehicle.id}`}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Lead Ref: {selectedInvoiceVehicle.dealerOpportunity?.leadId || `LEAD-${selectedInvoiceVehicle.id}`}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400">SETTLEMENT DATE</div>
                  <div className="font-semibold text-slate-800 text-xs">
                    {new Date(selectedInvoiceVehicle.dealerOpportunity?.dealerExecutedAt || selectedInvoiceVehicle.dealerOpportunity?.transmittedAt || Date.now()).toLocaleDateString()}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-bold">
                    TERMS: NET 15 OEM CLEARING
                  </div>
                </div>
              </div>

              {/* Dealership & Vehicle Info */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">BILLED DEALERSHIP:</span>
                  <span className="font-bold text-slate-900 block">
                    {selectedInvoiceVehicle.dealerOpportunity?.dealerName || 'Certified Franchise Hub'}
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    DMS Gateway: {selectedInvoiceVehicle.dealerOpportunity?.dmsTransmissionId || 'CDK/WebDCS Live'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">REPAIRED VEHICLE:</span>
                  <span className="font-bold text-slate-900 block">
                    {selectedInvoiceVehicle.year} {selectedInvoiceVehicle.make} {selectedInvoiceVehicle.model}
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    VIN: {selectedInvoiceVehicle.vin} · {selectedInvoiceVehicle.ownerName}
                  </span>
                </div>
              </div>

              {/* OEM Warranty Claim Verification Badge */}
              {hasFiledWarrantyClaim(selectedInvoiceVehicle) ? (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-md font-mono text-[11px] space-y-1">
                  <div className="font-bold text-emerald-950 flex items-center justify-between">
                    <span>OEM WARRANTY REIMBURSEMENT CLAIM VERIFIED</span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1 rounded">
                      GROUND TRUTH VERIFIED
                    </span>
                  </div>
                  <div className="text-slate-600 text-[10px]">
                    Claim #: <strong className="text-slate-900">{selectedInvoiceVehicle.dealerOpportunity?.warrantyClaim?.claimNumber || 'CLM-2026-AUTO'}</strong> ·
                    System: {selectedInvoiceVehicle.dealerOpportunity?.warrantyClaim?.oemClaimSystem || (selectedInvoiceVehicle.make === 'Hyundai' ? 'Hyundai WebDCS' : 'Ford OASIS/PTS')} ·
                    Status: CLAIM_APPROVED (30% Execution Settlement)
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-md font-mono text-[11px] space-y-1">
                  <div className="font-bold text-amber-950 flex items-center justify-between">
                    <span>WARRANTY REIMBURSEMENT UNCLAIMED (LEAD SALE ONLY)</span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-1 rounded">
                      5% FEE ONLY
                    </span>
                  </div>
                  <div className="text-slate-600 text-[10px]">
                    In the absence of an official OEM warranty claim, the transaction is billed strictly as a Lead Sale fee (5%).
                  </div>
                </div>
              )}

              {/* Itemized Monetization Breakdown */}
              <div className="space-y-2 font-mono">
                <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span>ITEMIZED SETTLEMENT CALCULATION</span>
                  <span className="text-[10px] text-slate-500 font-normal">NHTSA Recall {selectedInvoiceVehicle.nhtsaCode}</span>
                </div>

                <div className="border border-slate-200 rounded-md divide-y divide-slate-200 text-xs">
                  {/* Line 1: OEM Warranty Expense Reaped by Dealer */}
                  <div className="p-2.5 flex items-center justify-between bg-white">
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        Gross OEM Warranty Service Reimbursement
                      </span>
                      <span className="text-[10px] text-slate-500">
                        OpCode: {selectedInvoiceVehicle.aiDiagnosis.recommendedIntervention.warrantyLineItem?.opCode || '26V-CODE'} · 100% Pre-Approved
                      </span>
                    </div>
                    <span className="font-bold text-slate-900">
                      ${getDealerReapedServiceExpense(selectedInvoiceVehicle).toFixed(2)} USD
                    </span>
                  </div>

                  {/* Line 2: Lead Transmission Fee (5%) */}
                  <div className="p-2.5 flex items-center justify-between bg-sky-50/40">
                    <div>
                      <span className="font-semibold text-sky-950 block">
                        1. Qualified Lead Transmission Fee (5%)
                      </span>
                      <span className="text-[10px] text-sky-700">
                        Charged upon sending consented lead to dealer DMS (applies prior to claim filing)
                      </span>
                    </div>
                    <span className="font-bold text-sky-900">
                      ${getTransmissionFee(getDealerReapedServiceExpense(selectedInvoiceVehicle)).toFixed(2)} USD
                    </span>
                  </div>

                  {/* Line 3: OEM Warranty Execution Success Fee (30%) */}
                  <div className={`p-2.5 flex items-center justify-between ${
                    hasFiledWarrantyClaim(selectedInvoiceVehicle) ? 'bg-emerald-50/50' : 'bg-slate-50 opacity-60'
                  }`}>
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        2. OEM Warranty Reimbursement Settle (+25% Take)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {hasFiledWarrantyClaim(selectedInvoiceVehicle) 
                          ? 'OEM warranty claim verified in gateway → 30% execution revenue realized' 
                          : 'Unclaimed warranty: Lead sale 5% fee only'}
                      </span>
                    </div>
                    <span className="font-bold text-emerald-800">
                      {hasFiledWarrantyClaim(selectedInvoiceVehicle) 
                        ? `$${(getExecutionRevenue(getDealerReapedServiceExpense(selectedInvoiceVehicle)) - getTransmissionFee(getDealerReapedServiceExpense(selectedInvoiceVehicle))).toFixed(2)} USD`
                        : '$0.00 (Unclaimed)'}
                    </span>
                  </div>

                  {/* Total Platform Recognized Revenue */}
                  <div className="p-3 bg-blue-100/50 flex items-center justify-between text-blue-950">
                    <div>
                      <span className="font-bold text-sm block">
                        TOTAL PLATFORM REVENUE COLLECTED
                      </span>
                      <span className="text-[10px] text-blue-800 font-sans">
                        {hasFiledWarrantyClaim(selectedInvoiceVehicle) 
                          ? 'Settled from verified OEM warranty reimbursement claim data (30%)' 
                          : 'Settled from qualified lead transmission fee (5%)'}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-blue-950">
                      ${getRecognizedRevenue(selectedInvoiceVehicle).toFixed(2)} USD
                    </span>
                  </div>
                </div>

                {/* Dealer Retained Profit Summary */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Dealer Retained Net Profit (70%):</span>
                  <span className="font-bold text-slate-900">
                    ${(getDealerReapedServiceExpense(selectedInvoiceVehicle) - getRecognizedRevenue(selectedInvoiceVehicle)).toFixed(2)} USD
                  </span>
                </div>
              </div>

              {/* Legal / Statutory Compliance Note */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-500 space-y-1">
                <span className="font-bold text-slate-700 block">Audit &amp; Compliance Certification:</span>
                <p>
                  Settlement recorded in full compliance with NHTSA 49 CFR Part 573 recall clearing procedures and electronic DMS clearinghouse standards.
                </p>
              </div>

              {/* Close Button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedInvoiceVehicle(null)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold rounded shadow-xs transition-colors"
                >
                  Close Statement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
