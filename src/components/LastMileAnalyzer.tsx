import React, { useState } from 'react';
import { VehicleRecord, RecommendedIntervention, DealerOpportunity, BehaviorProfile } from '../types';
import { runLastMileAgentAnalysis } from '../services/aiService';
import {
  RotateCcw,
  Check,
  ShieldAlert,
  Wifi,
  Activity,
  Headphones,
  CheckCircle2,
  Receipt,
  Server,
  Smartphone,
  Bell,
  ArrowRight,
  Send,
  Loader2,
  Lock,
  Building2
} from 'lucide-react';

interface LastMileAnalyzerProps {
  vehicle: VehicleRecord;
  onUpdateVehicle: (updated: VehicleRecord) => void;
  onNavigateToOpportunities: (vehicle: VehicleRecord) => void;
  onBackToMonitor: () => void;
}

interface ProfilePersonaConfig {
  label: string;
  subTitle: string;
  caricatureSvg: React.ReactNode;
  contextTag: string;
  badgeBg: string;
  iconBg: string;
  bannerBorder: string;
  bannerBg: string;
  primaryConstraint: string;
}

export const LastMileAnalyzer: React.FC<LastMileAnalyzerProps> = ({
  vehicle,
  onUpdateVehicle,
  onNavigateToOpportunities,
  onBackToMonitor,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showLedgerDetails, setShowLedgerDetails] = useState(true);
  const [isSendingAppPush, setIsSendingAppPush] = useState(false);
  const [isSendingDealerNoti, setIsSendingDealerNoti] = useState(false);
  const [showSimulateConsentModal, setShowSimulateConsentModal] = useState(false);

  const [authScopes, setAuthScopes] = useState<string[]>([
    'AUTHORIZE_DEALER_CONTACT',
    'TRANSMIT_DIAGNOSTIC_LOGS',
  ]);
  const [preferredWindow, setPreferredWindow] = useState('Tomorrow 09:00 - 12:00');
  const [selectedIntervention, setSelectedIntervention] = useState<RecommendedIntervention>(
    vehicle.aiDiagnosis.recommendedIntervention
  );

  const hasConsent = vehicle.status === 'CONSENT_GRANTED' || vehicle.status === 'DEALER_NOTIFIED' || vehicle.status === 'RECALL_COMPLETED';
  const isDealerNotified = vehicle.status === 'DEALER_NOTIFIED' || vehicle.status === 'RECALL_COMPLETED';
  const isPushSent = vehicle.status === 'CONSENT_REQUESTED';

  const handleRunAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await runLastMileAgentAnalysis(vehicle);
      const updated: VehicleRecord = {
        ...vehicle,
        aiDiagnosis: {
          ...vehicle.aiDiagnosis,
          rootCauseSummary: result.rootCauseSummary,
          recommendedIntervention: result.recommendedIntervention,
          generatedAt: new Date().toISOString(),
        },
      };
      setSelectedIntervention(result.recommendedIntervention);
      onUpdateVehicle(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleScope = (scope: string) => {
    if (authScopes.includes(scope)) {
      setAuthScopes(authScopes.filter((s) => s !== scope));
    } else {
      setAuthScopes([...authScopes, scope]);
    }
  };

  // STEP 1: Request Customer Consent via OEM Connected App (MyHyundai / FordPass)
  const handleRequestConsentViaOemApp = async () => {
    setIsSendingAppPush(true);
    // Simulate OEM Connected Car Push Gateway
    await new Promise((resolve) => setTimeout(resolve, 800));

    const updatedVehicle: VehicleRecord = {
      ...vehicle,
      status: 'CONSENT_REQUESTED',
      consentRecord: {
        ...vehicle.consentRecord,
        status: 'PENDING_OEM_APP_CONFIRMATION',
        oemAppPushSentAt: new Date().toISOString(),
        selectedInterventionId: selectedIntervention.id,
        authorizedScopes: authScopes,
        preferredTimeWindow: preferredWindow,
      },
    };

    setIsSendingAppPush(false);
    onUpdateVehicle(updatedVehicle);
    setShowSimulateConsentModal(true); // Open interactive preview allowing user to simulate customer acceptance on their phone
  };

  // Simulation: Customer accepts consent prompt inside MyHyundai / FordPass App
  const handleSimulateCustomerAcceptance = () => {
    const updatedVehicle: VehicleRecord = {
      ...vehicle,
      status: 'CONSENT_GRANTED',
      consentRecord: {
        ...vehicle.consentRecord,
        status: 'CONSENT_GRANTED',
        timestamp: new Date().toISOString(),
        signatureName: vehicle.ownerName,
        selectedInterventionId: selectedIntervention.id,
      },
    };
    setShowSimulateConsentModal(false);
    onUpdateVehicle(updatedVehicle);
  };

  // STEP 2: Dispatch Formal Dealer Notification (Only enabled if Consent is Granted)
  const handleSendDealerNotification = async () => {
    setIsSendingDealerNoti(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    const dealerName = vehicle.make === 'Hyundai' 
      ? 'Coastline Hyundai Certified Service Hub'
      : 'Metro Ford Pro Commercial & Retail Hub';

    const wItem = selectedIntervention.warrantyLineItem;
    const reimbursement = wItem?.totalReimbursementUsd || selectedIntervention.dealerWarrantyCreditUsd || 198;
    const transmissionFee = Math.round(reimbursement * 0.05 * 100) / 100;
    const executionRevenue = Math.round(reimbursement * 0.30 * 100) / 100;

    const newDealerOpp: DealerOpportunity = {
      leadId: `LEAD-${vehicle.make.toUpperCase()}-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      roNumber: `RO-${vehicle.make.toUpperCase()}-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      dealerName,
      dealerAddress: '1500 Van Ness Ave, San Francisco, CA',
      dealerDistanceMiles: 3.4,
      status: 'LEAD_SOLD_TRANSMITTED',
      assignedTech: vehicle.make === 'Hyundai' ? 'Min-Seok Kim (Master GDS Specialist #41)' : 'Marcus Brody (Senior FDRS Master #77)',
      techContact: '(415) 550-9840',
      warrantyLaborHours: wItem?.flatRateHours || 1.1,
      warrantyReimbursementUsd: reimbursement,
      transmissionFeeRate: 0.05,
      transmissionFeeUsd: transmissionFee,
      executionRevenueRate: 0.30,
      executionRevenueUsd: executionRevenue,
      platformRevenueUsd: transmissionFee, // 5% recognized upon transmission
      leadSaleCommissionRate: 0.05,
      dmsTransmissionId: `DMS-${vehicle.make === 'Hyundai' ? 'WEBDCS' : 'CDK'}-TX-${Math.floor(100000 + Math.random() * 900000)}`,
      dmsStatus: 'TRANSMITTED_ACKNOWLEDGED',
      transmittedAt: new Date().toISOString(),
      warrantyLineItem: wItem,
      suggestedCustomerCare: vehicle.make === 'Hyundai' ? 'Power Seat Motor Stall Amperage Recalibration' : 'High-Voltage Battery Junction Resistance Scan',
      potentialUpsellRevUsd: 145,
      serviceScheduledFor: preferredWindow,
      dispatchEtaMinutes: 20,
    };

    const updatedVehicle: VehicleRecord = {
      ...vehicle,
      status: 'DEALER_NOTIFIED',
      consentRecord: {
        ...vehicle.consentRecord,
        dealerNotifiedAt: new Date().toISOString(),
        authorizedDealership: dealerName,
      },
      dealerOpportunity: newDealerOpp,
    };

    setIsSendingDealerNoti(false);
    onUpdateVehicle(updatedVehicle);
  };

  const sig = vehicle.signals;
  const isWeakRf = (sig.connectivity?.cellularSignalDbm || sig.cellularSignalDbm) < -105 || !sig.connectivity?.wifiAvailable;
  const ticket = vehicle.customerRequestTicket;
  const warranty = selectedIntervention.warrantyLineItem;
  const oemAppName = vehicle.make === 'Hyundai' ? 'MyHyundai with Bluelink' : 'FordPass Connect';

  // Visual Character Avatars / Caricatures illustrating each customer's specific dilemma
  const renderCustomerCaricature = (profile: BehaviorProfile) => {
    switch (profile) {
      case 'CONNECTIVITY_CONSTRAINED':
        return (
          <svg className="w-14 h-14" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" rx="32" fill="#F1F5F9" />
            <path d="M12 20H52M12 32H52M12 44H52" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
            <rect x="18" y="14" width="12" height="12" rx="2" fill="#475569" />
            <text x="21" y="23" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="monospace">B2</text>
            <path d="M16 48C18 42 22 38 32 38C42 38 46 42 48 48H16Z" fill="#334155" />
            <circle cx="23" cy="48" r="3.5" fill="#0F172A" />
            <circle cx="41" cy="48" r="3.5" fill="#0F172A" />
            <path d="M42 16L54 28M42 28L54 16" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );

      case 'BUSY_DELAYER':
        return (
          <svg className="w-14 h-14" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" rx="32" fill="#FEF3C7" />
            <circle cx="28" cy="20" r="7" fill="#B45309" />
            <path d="M18 46C18 36 22 30 28 30C34 30 38 36 38 46H18Z" fill="#92400E" />
            <rect x="34" y="38" width="9" height="7" rx="1" fill="#78350F" />
            <circle cx="45" cy="22" r="10" fill="#FFFFFF" stroke="#D97706" strokeWidth="2" />
            <path d="M45 16V22L49 24" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M42 8L48 8" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        );

      case 'CONFUSED_USER':
        return (
          <svg className="w-14 h-14" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" rx="32" fill="#EEF2FF" />
            <circle cx="26" cy="24" r="7.5" fill="#4338CA" />
            <circle cx="24" cy="23" r="2.5" stroke="#FFFFFF" strokeWidth="1" />
            <circle cx="29" cy="23" r="2.5" stroke="#FFFFFF" strokeWidth="1" />
            <path d="M16 48C16 38 20 34 26 34C32 34 36 38 36 48H16Z" fill="#3730A3" />
            <circle cx="46" cy="18" r="8" fill="#FFFFFF" stroke="#6366F1" strokeWidth="1.5" />
            <text x="43" y="23" fill="#4338CA" fontSize="12" fontWeight="bold">?</text>
          </svg>
        );

      case 'REPEATED_FAILURE':
        return (
          <svg className="w-14 h-14" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" rx="32" fill="#FFE4E6" />
            <path d="M14 44L18 28H46L50 44H14Z" fill="#BE123C" />
            <rect x="22" y="32" width="20" height="7" rx="1" fill="#FFFFFF" opacity="0.6" />
            <circle cx="20" cy="46" r="4" fill="#1E293B" />
            <circle cx="44" cy="46" r="4" fill="#1E293B" />
            <path d="M32 10L42 26H22L32 10Z" fill="#E11D48" />
            <path d="M32 16V20M32 23H32.01" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        );

      case 'SKEPTICAL_LOW_URGENCY':
        return (
          <svg className="w-14 h-14" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" rx="32" fill="#FFEDD5" />
            <path d="M15 42C17 34 24 30 32 30C40 30 47 34 49 42H15Z" fill="#C2410C" />
            <circle cx="22" cy="44" r="3.5" fill="#18181B" />
            <circle cx="42" cy="44" r="3.5" fill="#18181B" />
            <circle cx="32" cy="18" r="9" fill="#FFFFFF" stroke="#EA580C" strokeWidth="1.5" />
            <path d="M32 18L37 13" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );

      case 'PROMPT_COMPLETER':
      default:
        return (
          <svg className="w-14 h-14" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" rx="32" fill="#DBEAFE" />
            <rect x="14" y="24" width="26" height="18" rx="2" fill="#1D4ED8" />
            <path d="M40 28L48 33V42H40V28Z" fill="#2563EB" />
            <circle cx="22" cy="44" r="3.5" fill="#0F172A" />
            <circle cx="43" cy="44" r="3.5" fill="#0F172A" />
            <path d="M48 10L42 20H48L44 28L54 18H48L52 10H48Z" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1" />
          </svg>
        );
    }
  };

  const getPersonaConfig = (profile: BehaviorProfile): ProfilePersonaConfig => {
    switch (profile) {
      case 'CONNECTIVITY_CONSTRAINED':
        return {
          label: 'Connectivity Constrained',
          subTitle: 'Subterranean Concrete Attenuation Barrier',
          caricatureSvg: renderCustomerCaricature(profile),
          contextTag: 'Physical RF blockage · High willing intent',
          badgeBg: 'bg-slate-200 text-slate-900 border-slate-300',
          iconBg: 'bg-slate-100 border-slate-300',
          bannerBorder: 'border-slate-300',
          bannerBg: 'bg-slate-50/70',
          primaryConstraint: 'Subterranean B2 Concrete (-116 dBm)',
        };
      case 'BUSY_DELAYER':
        return {
          label: 'Busy Delayer',
          subTitle: 'High-Utilization Executive (Anti-Immobilization)',
          caricatureSvg: renderCustomerCaricature(profile),
          contextTag: 'Client transport schedule · 35m vehicle lockout fear',
          badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
          iconBg: 'bg-amber-50 border-amber-200',
          bannerBorder: 'border-amber-300',
          bannerBg: 'bg-amber-50/50',
          primaryConstraint: '17 Daytime Deferrals · Zero Mid-Day Downtime',
        };
      case 'CONFUSED_USER':
        return {
          label: 'Confused User',
          subTitle: 'Intimidated by Digital Terms & Safety Disclaimers',
          caricatureSvg: renderCustomerCaricature(profile),
          contextTag: 'Senior owners · Digital interface friction',
          badgeBg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
          iconBg: 'bg-indigo-50 border-indigo-200',
          bannerBorder: 'border-indigo-300',
          bannerBg: 'bg-indigo-50/50',
          primaryConstraint: 'Terms Modal Backed Out 6 Times',
        };
      case 'REPEATED_FAILURE':
        return {
          label: 'Repeated Failure',
          subTitle: 'Firmware Checksum Rejection & Hardware Resistance',
          caricatureSvg: renderCustomerCaricature(profile),
          contextTag: 'System rollbacks · Hardware Ohm breach',
          badgeBg: 'bg-rose-100 text-rose-900 border-rose-400 font-bold',
          iconBg: 'bg-rose-50 border-rose-200',
          bannerBorder: 'border-rose-300',
          bannerBg: 'bg-rose-50/50',
          primaryConstraint: 'Block 64 Verification Abort (2 Rollbacks)',
        };
      case 'SKEPTICAL_LOW_URGENCY':
        return {
          label: 'Skeptical / Low Urgency',
          subTitle: 'Performance Apprehension & Power Curve Concern',
          caricatureSvg: renderCustomerCaricature(profile),
          contextTag: 'Forum rumor hesitation · Auto-updates toggled OFF',
          badgeBg: 'bg-orange-100 text-orange-900 border-orange-300',
          iconBg: 'bg-orange-50 border-orange-200',
          bannerBorder: 'border-orange-300',
          bannerBg: 'bg-orange-50/50',
          primaryConstraint: 'Manual Settings Lockout · Dyno Verification Needed',
        };
      case 'PROMPT_COMPLETER':
      default:
        return {
          label: 'Prompt Completer',
          subTitle: 'Proactive Commercial Fleet Uptime Manager',
          caricatureSvg: renderCustomerCaricature(profile),
          contextTag: 'Corporate logistics · Scheduled dwell dispatch',
          badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
          iconBg: 'bg-blue-50 border-blue-200',
          bannerBorder: 'border-blue-300',
          bannerBg: 'bg-blue-50/50',
          primaryConstraint: 'Immediate Consent Granted (Predawn Depot)',
        };
    }
  };

  const persona = getPersonaConfig(sig.behaviorProfile);
  const totalClaimAmount = warranty?.totalReimbursementUsd || selectedIntervention.dealerWarrantyCreditUsd || 198;

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-mono">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-slate-900">ANALYZER:</span>
          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 font-bold rounded">
            {vehicle.vin}
          </span>
          <span className="text-xs text-slate-600 font-sans">
            {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.ownerName})
          </span>
          <span className={`text-xs px-2 py-0.5 font-bold rounded border ${
            vehicle.riskLevel === 'HIGH'
              ? 'bg-rose-50 text-rose-700 border-rose-300'
              : 'bg-amber-50 text-amber-700 border-amber-300'
          }`}>
            RISK: {vehicle.riskLevel} ({vehicle.riskConfidence}%)
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={onBackToMonitor}
            className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:text-blue-600 rounded bg-white transition-colors"
          >
            ← MONITOR
          </button>
          <button
            onClick={handleRunAiAnalysis}
            disabled={isAnalyzing}
            className="px-3 py-1.5 border border-slate-200 text-slate-800 hover:border-blue-400 hover:text-blue-600 rounded bg-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isAnalyzing ? 'RUNNING...' : 'DIAGNOSE'}</span>
          </button>
          <button
            onClick={() => onNavigateToOpportunities(vehicle)}
            disabled={!isDealerNotified}
            className={`px-4 py-1.5 font-semibold rounded flex items-center gap-1.5 transition-colors ${
              isDealerNotified
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>OPPORTUNITIES →</span>
          </button>
        </div>
      </div>

      {/* 2-Column Action Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Customer Profile Caricature, Official Ticket & Telemetry */}
        <div className="lg:col-span-6 space-y-3">
          
          {/* Section A: Customer Caricature & Behavior Profile Card */}
          <div className={`border rounded p-3.5 shadow-sm space-y-3 ${persona.bannerBorder} ${persona.bannerBg}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="shrink-0 p-1 bg-white rounded-full border border-slate-200 shadow-xs">
                  {persona.caricatureSvg}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 font-sans">
                      {vehicle.ownerName}
                    </span>
                    <span className="text-[11px] text-slate-500 font-normal font-sans">
                      ({vehicle.ownerCity}, {vehicle.ownerState})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-sans font-medium">
                    {persona.subTitle}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className={`text-[10px] font-mono px-2.5 py-1 rounded border inline-block shadow-2xs ${persona.badgeBg}`}>
                  {persona.label.toUpperCase()}
                </span>
                <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                  {persona.contextTag}
                </div>
              </div>
            </div>

            {/* Official Call Center Ticket */}
            {ticket && (
              <div className="bg-white border border-slate-200 rounded p-3 text-xs space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="flex items-center gap-1.5 text-blue-700 font-bold text-[11px]">
                    <Headphones className="w-3.5 h-3.5" />
                    <span>CUSTOMER INBOUND CASE #{ticket.ticketId}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-sans">
                    Via {ticket.channel.replace(/_/g, ' ')} · {ticket.agentName}
                  </span>
                </div>

                <div className="text-slate-800 font-sans text-xs italic bg-slate-50 p-2.5 rounded border border-slate-100 leading-relaxed">
                  {ticket.customerStatedRequest}
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-sans">
                  <span>Customer Requested Resolution:</span>
                  <strong className="text-slate-800 font-mono">{ticket.resolutionRequested}</strong>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-600 font-sans pt-1 border-t border-slate-200/60">
              <span>Primary Barrier: <strong className="font-mono text-slate-900">{persona.primaryConstraint}</strong></span>
              <span>Prior OTA Behavior: <strong className="font-mono text-slate-900">{sig.priorUpdateCompletionBehavior}</strong></span>
            </div>
          </div>

          {/* Section B: Deep Telemetry Metrics */}
          <div className="bg-white border border-slate-200 rounded p-3.5 space-y-2.5 shadow-sm">
            <div className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex justify-between">
              <span>TELEMETRY METRICS &amp; FAILURES</span>
              <span className="text-blue-700">NHTSA {vehicle.nhtsaCode}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Telemetry 1: Connectivity */}
              <div className={`p-2.5 rounded border ${isWeakRf ? 'bg-rose-50/60 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>CONNECTIVITY</span>
                  <Wifi className="w-3 h-3" />
                </div>
                <div className={`font-bold text-sm ${isWeakRf ? 'text-rose-600' : 'text-slate-900'}`}>
                  {sig.connectivity?.cellularSignalDbm || sig.cellularSignalDbm} dBm
                </div>
                <div className="text-slate-600 font-sans text-[11px] mt-0.5">
                  Tech: <strong className="font-mono">{sig.connectivity?.cellularTechnology || 'LTE'}</strong> · Pkt Loss: <strong className="font-mono text-rose-600">{sig.connectivity?.packetLossPct || 0}%</strong>
                </div>
              </div>

              {/* Telemetry 2: Error Code */}
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded">
                <span className="text-slate-500 block text-[11px]">ERROR CODE &amp; FAULT</span>
                <span className="font-bold text-xs text-rose-700 font-mono truncate block">
                  {sig.errorCode || sig.lastErrorCode || 'NO_FAULT'}
                </span>
                <div className="text-slate-600 font-sans text-[11px] mt-0.5">
                  Failures: <strong className="font-mono">{sig.downloadAttempts} attempts</strong> ({sig.priorOTAFailures} prior)
                </div>
              </div>

              {/* Telemetry 3: Recent Activity */}
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>VEHICLE ACTIVITY</span>
                  <Activity className="w-3 h-3" />
                </div>
                <span className="font-bold text-slate-900">{sig.recentVehicleActivity?.dailyDrivingHours || sig.dailyDrivingHours} hrs/day</span>
                <div className="text-slate-600 font-sans text-[11px] mt-0.5 truncate">
                  Dwell: <strong className="font-mono">{sig.recentVehicleActivity?.overnightDwellHours || 8}h</strong> · {sig.recentVehicleActivity?.parkingLocationType || sig.parkingEnvironment}
                </div>
              </div>

              {/* Telemetry 4: Customer Deferrals & Timing */}
              <div className="p-2.5 bg-amber-50/50 border border-amber-200 rounded">
                <span className="text-slate-500 block text-[11px]">DEFERRALS &amp; DELAYS</span>
                <span className="font-bold text-amber-800">{sig.customerDeferralCount} Snoozes</span>
                <div className="text-slate-600 font-sans text-[11px] mt-0.5 truncate">
                  Start to install: <strong className="font-mono">{sig.daysBtwOtaStartAndInstalledSuccess ? `${sig.daysBtwOtaStartAndInstalledSuccess}d` : 'UNRESOLVED'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Section C: Root-Cause & NHTSA Severity Card */}
          <div className="p-3.5 bg-rose-50/80 border border-rose-300 rounded text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-800 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>NHTSA RECALL SEVERITY: {sig.recallSeverity?.label || 'TIER-1 CRITICAL DEFECT'}</span>
              </span>
              <span className="font-bold text-[10px] text-rose-900 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">
                {sig.recallSeverity?.riskCategory || 'SAFETY_DEFECT'}
              </span>
            </div>
            <div className="text-slate-800 font-sans leading-relaxed text-xs">
              <strong>Failure Mechanism:</strong> {sig.failureReason || vehicle.aiDiagnosis.rootCauseSummary}
            </div>
          </div>
        </div>

        {/* Right Column: ACTION DIRECTIVE & SEPARATED 2-STEP CONSENT + DEALER NOTIFICATION PROCESS */}
        <div className="lg:col-span-6 space-y-3">
          <div className="bg-white border border-slate-200 rounded p-4 space-y-3.5 shadow-sm">
            
            {/* Header: Pre-Approved Value */}
            <div className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 flex justify-between items-center">
              <span className="tracking-wide">ACTION DIRECTIVE &amp; WORKFLOW PIPELINE</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-mono font-bold text-xs border border-blue-200">
                ${totalClaimAmount}.00 PRE-AUTHORIZED
              </span>
            </div>

            {/* Selected Action Directive Card */}
            <div className="p-3 bg-blue-50/70 border border-blue-300 rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-600 text-white rounded">
                  {selectedIntervention.channel}
                </span>
                <span className="text-blue-900 font-bold text-xs font-mono">
                  OEM REIMBURSEMENT: ${totalClaimAmount}.00
                </span>
              </div>
              <div className="font-bold text-sm text-slate-900 font-sans">
                {selectedIntervention.title}
              </div>
              <p className="text-xs text-slate-700 font-sans leading-relaxed">
                {selectedIntervention.summary}
              </p>
              
              {/* Direct Customer Proposal */}
              <div className="bg-white p-2.5 rounded border border-blue-200 text-xs text-slate-800 font-sans">
                <span className="text-blue-700 font-bold block mb-0.5 text-[11px]">Proposed Outreach Text:</span>
                "{selectedIntervention.customerOfferText}"
              </div>
            </div>

            {/* Live Warranty Claim Ledger */}
            <div className="border border-slate-300 rounded bg-slate-50/90 overflow-hidden text-xs">
              <div 
                onClick={() => setShowLedgerDetails(!showLedgerDetails)}
                className="p-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-200/60 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-blue-700" />
                  <span className="font-bold text-slate-900 tracking-tight">
                    OEM WARRANTY CLAIM BREAKDOWN (LIVE GATEWAY)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-blue-600 text-white font-mono px-1.5 py-0.5 rounded font-bold">
                    {warranty?.oemGatewaySource || (vehicle.make === 'Hyundai' ? 'HYUNDAI_WEBDCS_V2' : 'FORD_OWLS_PTS_V4')}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    {showLedgerDetails ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {showLedgerDetails && (
                <div className="p-3 space-y-2 bg-white font-mono">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block">STANDARD OP CODE (TSB PROCEDURE):</span>
                      <strong className="text-blue-900 font-bold text-xs">
                        {warranty?.opCode || (vehicle.make === 'Hyundai' ? '26V160R1' : '26V211F2')}
                      </strong>
                      <span className="text-[11px] text-slate-600 font-sans block mt-0.5">
                        {warranty?.opCodeDescription || 'Diagnostic reflash and mechanical verification'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">PRE-APPROVAL:</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        <CheckCircle2 className="w-3 h-3 text-blue-600" />
                        PRE-APPROVED
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-500 text-[10px] block">FLAT RATE:</span>
                      <strong className="text-slate-900">{warranty?.flatRateHours || 1.1} hrs</strong>
                    </div>

                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-500 text-[10px] block">APPROVED RATE:</span>
                      <strong className="text-slate-900">${warranty?.approvedLaborRateUsd || 180}/hr</strong>
                    </div>

                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-500 text-[10px] block">TRAVEL/MOBILE:</span>
                      <strong className="text-blue-700">+${warranty?.travelAllowanceUsd || 45}</strong>
                    </div>

                    <div className="p-2 bg-blue-50/80 rounded border border-blue-200">
                      <span className="text-blue-800 text-[10px] block font-bold">TOTAL CLAIM:</span>
                      <strong className="text-blue-950 font-extrabold text-sm">${totalClaimAmount}.00</strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-sans">
                    <span className="flex items-center gap-1">
                      <Server className="w-3 h-3 text-slate-400" />
                      Audited against 49 CFR Part 573 Statutory OEM Warranty Ledger
                    </span>
                    <strong className="text-blue-800 font-mono">100% OEM FUNDED</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Authorization Scopes Selection */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={authScopes.includes('AUTHORIZE_DEALER_CONTACT')}
                  onChange={() => toggleScope('AUTHORIZE_DEALER_CONTACT')}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-900 font-sans">Authorize Dealer Contact</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={authScopes.includes('TRANSMIT_DIAGNOSTIC_LOGS')}
                  onChange={() => toggleScope('TRANSMIT_DIAGNOSTIC_LOGS')}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-900 font-sans">Transmit Diagnostic Logs</span>
              </label>
            </div>

            {/* Target Service Schedule Window */}
            <div>
              <label className="block text-slate-500 text-[10px] mb-1 font-mono">PREFERRED SERVICE TIMEFRAME:</label>
              <select
                value={preferredWindow}
                onChange={(e) => setPreferredWindow(e.target.value)}
                disabled={hasConsent}
                className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-slate-900 bg-white text-xs focus:border-blue-500 disabled:bg-slate-50"
              >
                <option value="Tomorrow 09:00 - 12:00">Tomorrow 09:00 - 12:00</option>
                <option value="Tomorrow 13:00 - 17:00">Tomorrow 13:00 - 17:00</option>
                <option value="Next Day 09:00 - 12:00">Next Day 09:00 - 12:00</option>
              </select>
            </div>

            {/* SEPARATED 2-STAGE PROCESS: STAGE 1 (OEM APP CONSENT) & STAGE 2 (DEALER NOTIFICATION) */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              
              {/* STAGE 1 CARD: OEM CONNECTED APP CONSENT */}
              <div className={`p-3 rounded border text-xs space-y-2 transition-all ${
                hasConsent 
                  ? 'bg-blue-50/70 border-blue-200' 
                  : isPushSent
                  ? 'bg-amber-50/70 border-amber-300'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span className="text-slate-900 font-mono">STEP 1: CUSTOMER CONSENT VIA OEM APP</span>
                  </div>
                  {hasConsent ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white font-mono flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      CONSENT GRANTED
                    </span>
                  ) : isPushSent ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 font-mono flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      AWAITING APP ACTION
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 font-mono">
                      PENDING DISPATCH
                    </span>
                  )}
                </div>

                <p className="text-slate-600 font-sans text-xs">
                  Sends an encrypted notification prompt directly to <strong className="text-slate-900">{vehicle.ownerName}'s {oemAppName}</strong> smartphone app requesting permission for dealership contact &amp; diagnostic tethering.
                </p>

                {/* Consent Request Button or Status */}
                {!hasConsent ? (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleRequestConsentViaOemApp}
                      disabled={isSendingAppPush || authScopes.length === 0}
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-semibold rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-xs"
                    >
                      {isSendingAppPush ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                          <span>SENDING PUSH TO {oemAppName.toUpperCase()}...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 text-blue-400" />
                          <span>REQUEST CONSENT VIA {oemAppName.toUpperCase()}</span>
                        </>
                      )}
                    </button>

                    {isPushSent && (
                      <button
                        onClick={() => setShowSimulateConsentModal(true)}
                        className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-900 font-mono text-xs font-bold rounded border border-blue-300"
                      >
                        VIEW APP PROMPT
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-2 bg-white rounded border border-blue-200 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-600">
                      Authorized by <strong className="text-slate-900">{vehicle.consentRecord.signatureName || vehicle.ownerName}</strong>
                    </span>
                    <span className="text-blue-800 font-bold">
                      {new Date(vehicle.consentRecord.timestamp || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>

              {/* STAGE 2 CARD: DEALERSHIP NOTIFICATION & RO CREATION */}
              <div className={`p-3 rounded border text-xs space-y-2 transition-all ${
                isDealerNotified
                  ? 'bg-blue-50 border-blue-300'
                  : hasConsent
                  ? 'bg-white border-blue-300 shadow-xs ring-1 ring-blue-400'
                  : 'bg-slate-50 border-slate-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Bell className="w-4 h-4 text-blue-700" />
                    <span className="text-slate-900 font-mono">STEP 2: TRANSMIT LEAD TO DEALER (5% FEE) &amp; UNLOCK EXECUTION (30%)</span>
                  </div>
                  {isDealerNotified ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-700 text-white font-mono flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      LEAD TRANSMITTED (5% EARNED)
                    </span>
                  ) : hasConsent ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 font-mono animate-pulse">
                      READY TO SEND (5% FEE)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-500 font-mono flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      LOCKED (NEEDS CONSENT)
                    </span>
                  )}
                </div>

                <p className="text-slate-600 font-sans text-xs">
                  {hasConsent ? (
                    <span>
                      Customer consent verified. Transmitting this qualified lead generates <strong className="text-blue-900 font-mono">${(totalClaimAmount * 0.05).toFixed(2)} USD (5% Transmission Fee)</strong>. When the dealer executes the service, the platform realizes <strong className="text-blue-900 font-mono">${(totalClaimAmount * 0.30).toFixed(2)} USD (30% Execution Revenue)</strong> out of <strong className="text-slate-900 font-mono">${totalClaimAmount}.00</strong> OEM reimbursement.
                    </span>
                  ) : (
                    <span className="italic text-slate-500">
                      Compliance constraint: Dealership transmission is strictly locked until the customer explicitly grants consent via the OEM Connected App.
                    </span>
                  )}
                </p>

                {/* Send Dealer Notification Button */}
                {hasConsent && !isDealerNotified ? (
                  <button
                    onClick={handleSendDealerNotification}
                    disabled={isSendingDealerNoti}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isSendingDealerNoti ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>TRANSMITTING LEAD TO DEALER DMS...</span>
                      </>
                    ) : (
                      <>
                        <Bell className="w-3.5 h-3.5" />
                        <span>SEND LEAD TO DEALER DMS (5% EARNED: ${(totalClaimAmount * 0.05).toFixed(2)})</span>
                      </>
                    )}
                  </button>
                ) : isDealerNotified ? (
                  <div className="flex items-center justify-between p-2 bg-white rounded border border-blue-200 font-mono text-xs">
                    <div className="flex items-center gap-2 text-blue-950 font-bold">
                      <Check className="w-4 h-4 text-blue-600" />
                      <span>LEAD TRANSMITTED ({vehicle.dealerOpportunity?.roNumber || vehicle.dealerOpportunity?.leadId}) · ${(totalClaimAmount * 0.05).toFixed(2)} (5% FEE)</span>
                    </div>
                    <button
                      onClick={() => onNavigateToOpportunities(vehicle)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow-xs"
                    >
                      VIEW REVENUE →
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* MODAL SIMULATION: Interactive OEM App Screen on Smartphone */}
      {showSimulateConsentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-sm w-full overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150">
            {/* Phone Screen Header */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-xs tracking-wide">{oemAppName.toUpperCase()}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">12:28 PM</span>
            </div>

            {/* Notification Card */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                  {vehicle.make === 'Hyundai' ? 'H' : 'F'}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Official Safety Recall Service Offer</h4>
                  <p className="text-[10px] text-slate-500 font-mono">NHTSA Recall {vehicle.nhtsaCode}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
                <p className="font-semibold text-slate-900">
                  Hi {vehicle.ownerName},
                </p>
                <p>
                  {selectedIntervention.customerOfferText}
                </p>
                <div className="pt-1.5 border-t border-slate-200 text-[11px] text-slate-600 font-mono">
                  <span>Selected Service: <strong>{selectedIntervention.title}</strong></span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 space-y-1 bg-blue-50/50 p-2.5 rounded border border-blue-100">
                <div className="font-bold text-blue-900">Consent Terms:</div>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] text-slate-600">
                  <li>Allow authorized dealership contact &amp; scheduling</li>
                  <li>Transmit diagnostic trouble codes to technician terminal</li>
                  <li>100% complimentary OEM warranty coverage ($0 cost to you)</li>
                </ul>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => setShowSimulateConsentModal(false)}
                  className="flex-1 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={handleSimulateCustomerAcceptance}
                  className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Grant Consent</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
