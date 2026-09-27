import React, { useState } from 'react';
import { VehicleRecord, RecallCampaign, NHTSA2026Case } from '../types';
import { ArrowRight, Wrench, AlertTriangle, Calendar, Flag, Award, ShieldAlert } from 'lucide-react';

interface OEMRecallMonitorProps {
  vehicles: VehicleRecord[];
  campaigns: RecallCampaign[];
  nhtsaCases: NHTSA2026Case[];
  activeVehicle: VehicleRecord;
  onSelectVehicle: (vehicle: VehicleRecord) => void;
  onNavigateToAnalyzer: (vehicle: VehicleRecord) => void;
}

export const OEMRecallMonitor: React.FC<OEMRecallMonitorProps> = ({
  vehicles,
  nhtsaCases,
  activeVehicle,
  onSelectVehicle,
  onNavigateToAnalyzer,
}) => {
  // Helper to calculate timeline metrics based on Simulated baseline: Sep 27, 2026
  const getTimelineMetrics = (startDateStr: string, deadlineStr: string) => {
    const currentDate = new Date('2026-09-27T00:00:00Z');
    const startDate = new Date(`${startDateStr}T00:00:00Z`);
    const deadlineDate = new Date(`${deadlineStr}T00:00:00Z`);

    const totalDurationMs = deadlineDate.getTime() - startDate.getTime();
    const elapsedMs = currentDate.getTime() - startDate.getTime();
    const remainingMs = deadlineDate.getTime() - currentDate.getTime();

    const elapsedDays = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
    const totalDays = Math.max(1, Math.floor(totalDurationMs / (1000 * 60 * 60 * 24)));

    const progressPct = Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)));

    return {
      elapsedDays,
      remainingDays,
      totalDays,
      progressPct,
      isUrgent: remainingDays <= 60,
    };
  };

  const rawOemBrandCards = [
    {
      brand: 'Hyundai',
      symbol: 'H',
      nhtsaCode: '26V-160',
      units: '61.1K',
      gapPct: 58.8,
      completionPct: 41.2,
      isDualPath: true,
      startDate: '2026-03-24',
      deadline: '2026-11-15',
    },
    {
      brand: 'Ford',
      symbol: 'F',
      nhtsaCode: '26V-211',
      units: '114.9K',
      gapPct: 43.8,
      completionPct: 56.2,
      isDualPath: true,
      startDate: '2026-04-18',
      deadline: '2026-12-01',
    },
    {
      brand: 'Stellantis',
      symbol: 'ST',
      nhtsaCode: '26V-388',
      units: '215.2K',
      gapPct: 51.1,
      completionPct: 48.9,
      isDualPath: true,
      startDate: '2026-05-18',
      deadline: '2026-12-15',
    },
    {
      brand: 'Rivian',
      symbol: 'R',
      nhtsaCode: '26V-597',
      units: '98.8K',
      gapPct: 4.8,
      completionPct: 95.2,
      isDualPath: false,
      startDate: '2026-09-16',
      deadline: '2026-11-30',
    },
    {
      brand: 'Tesla',
      symbol: 'T',
      nhtsaCode: '24V-051',
      units: '2.19M',
      gapPct: 11.5,
      completionPct: 88.5,
      isDualPath: false,
      startDate: '2026-01-30',
      deadline: '2026-10-31',
    },
    {
      brand: 'General Motors',
      symbol: 'GM',
      nhtsaCode: '26V-305',
      units: '88.4K',
      gapPct: 47.2,
      completionPct: 52.8,
      isDualPath: false,
      startDate: '2026-05-10',
      deadline: '2026-12-30',
    },
    {
      brand: 'Toyota',
      symbol: 'TOY',
      nhtsaCode: '26V-452',
      units: '64.2K',
      gapPct: 38.6,
      completionPct: 61.4,
      isDualPath: false,
      startDate: '2026-06-01',
      deadline: '2026-12-31',
    },
    {
      brand: 'Lucid',
      symbol: 'L',
      nhtsaCode: '26V-504',
      units: '24.6K',
      gapPct: 29.0,
      completionPct: 71.0,
      isDualPath: false,
      startDate: '2026-07-15',
      deadline: '2027-01-15',
    },
  ];

  // RANKING ALGORITHM: Sort primarily by highest Gap % and secondarily by lowest remaining days
  const rankedCards = [...rawOemBrandCards]
    .map((item) => {
      const t = getTimelineMetrics(item.startDate, item.deadline);
      return {
        ...item,
        remainingDays: t.remainingDays,
        elapsedDays: t.elapsedDays,
      };
    })
    .sort((a, b) => {
      if (b.gapPct !== a.gapPct) {
        return b.gapPct - a.gapPct;
      }
      return a.remainingDays - b.remainingDays;
    })
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  const [selectedBrand, setSelectedBrand] = useState<string>(activeVehicle.make || rankedCards[0].brand);

  const currentCase = nhtsaCases.find((c) => c.oemBrand === selectedBrand) || nhtsaCases[0];
  const timeline = getTimelineMetrics(currentCase.announcementDate, currentCase.auditDeadline);

  // Filter vehicles relevant to current brand (Hyundai or Ford)
  const brandVehicles = vehicles.filter((v) => v.make === currentCase.oemBrand);
  const displayVehicles = brandVehicles.length > 0 ? brandVehicles : vehicles;

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-mono">
      {/* 1. Ranked OEM Cards Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Award className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-bold text-slate-800 tracking-wider">
              NHTSA AUDIT URGENCY RANKING
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-sans">
            Sorted by: <strong className="text-rose-600 font-mono">HIGHEST GAP %</strong> &amp; <strong className="text-slate-800 font-mono">FEWEST DAYS REMAINING</strong>
          </div>
        </div>

        {/* OEM Brand Selector Cards with Rank Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {rankedCards.map((item) => {
            const isSelected = selectedBrand === item.brand;
            const isTop3 = item.rank <= 3;

            return (
              <button
                key={item.brand}
                onClick={() => {
                  setSelectedBrand(item.brand);
                  const matching = vehicles.find((v) => v.make === item.brand);
                  if (matching) onSelectVehicle(matching);
                }}
                className={`p-2.5 rounded border text-left transition-all flex flex-col justify-between h-28 relative ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-blue-300 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                        isTop3
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      #{item.rank}
                    </span>
                    <span className="font-bold text-xs font-sans text-slate-900 truncate max-w-[50px]">
                      {item.brand}
                    </span>
                  </div>

                  <span
                    className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.symbol}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">GAP:</span>
                    <span className={`text-[11px] font-bold px-1 rounded ${
                      item.gapPct > 30 
                        ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                        : 'text-slate-600'
                    }`}>
                      {item.gapPct}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>LEFT:</span>
                    <span className={`font-bold font-mono ${
                      item.remainingDays <= 60 ? 'text-rose-600 font-extrabold' : 'text-slate-700'
                    }`}>
                      {item.remainingDays}d
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-0.5 flex justify-between">
                  <span>{item.nhtsaCode}</span>
                  <span>{item.units}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Key Action Console */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 bg-slate-900 text-white font-bold text-xs rounded">
              RANK #{rankedCards.find((r) => r.brand === currentCase.oemBrand)?.rank || 1}
            </span>
            <span className="text-base font-bold text-slate-900 font-sans">
              {currentCase.oemBrand}
            </span>
            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 font-bold rounded">
              NHTSA {currentCase.nhtsaCampaignNumber}
            </span>
            <span className={`text-xs px-2 py-0.5 font-bold rounded ${
              !currentCase.isPureOta 
                ? 'bg-amber-50 text-amber-800 border border-amber-300' 
                : 'bg-slate-100 text-slate-700'
            }`}>
              {!currentCase.isPureOta ? '★ DUAL-PATH' : 'PURE OTA'}
            </span>
            <span className="text-xs text-slate-500">
              {currentCase.modelsAffected}
            </span>
          </div>

          <div className="text-xs text-slate-500 font-sans">
            Statutory 49 CFR Part 573 Enforcement
          </div>
        </div>

        {/* 2-A: TIMETABLE SCHEDULE */}
        <div className="border border-slate-200 bg-slate-50/80 rounded p-3 text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>REGULATORY COMPLIANCE SCHEDULE</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px] font-sans">Time Remaining:</span>
              <span className={`px-2.5 py-0.5 rounded font-mono font-bold text-xs shadow-sm border ${
                timeline.isUrgent
                  ? 'bg-rose-600 text-white border-rose-700 ring-2 ring-rose-200'
                  : 'bg-slate-900 text-white border-slate-950'
              }`}>
                {timeline.remainingDays} DAYS LEFT
              </span>
            </div>
          </div>

          <div className="relative pt-2 pb-1">
            <div className="absolute top-5 left-3 right-3 h-0.5 bg-slate-300 -z-0" />
            <div 
              className="absolute top-5 left-3 h-0.5 bg-slate-700 -z-0 transition-all duration-300"
              style={{ width: `calc(${timeline.progressPct}% - 12px)` }}
            />

            <div className="relative z-10 flex justify-between items-start">
              <div className="flex flex-col items-start text-left max-w-[120px]">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-slate-100">
                  1
                </div>
                <div className="mt-1 font-bold text-slate-800 text-[11px]">LAUNCH</div>
                <div className="text-[10px] text-slate-500">{currentCase.announcementDate}</div>
                <div className="text-[10px] text-slate-400">T-0d</div>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-white shadow">
                  NOW
                </div>
                <div className="mt-1 font-bold text-slate-900 text-[11px]">CURRENT AUDIT</div>
                <div className="text-[10px] text-slate-600">2026-09-27</div>
                <div className="text-[10px] font-bold text-slate-700">+{timeline.elapsedDays}d ({timeline.progressPct}%)</div>
              </div>

              <div className="flex flex-col items-end text-right max-w-[140px]">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-4 ring-slate-100 ${
                  timeline.isUrgent ? 'bg-rose-600 text-white' : 'bg-slate-700 text-white'
                }`}>
                  <Flag className="w-3 h-3" />
                </div>
                <div className={`mt-1 font-bold text-[11px] ${timeline.isUrgent ? 'text-rose-700' : 'text-slate-900'}`}>
                  NHTSA DEADLINE
                </div>
                <div className="text-[10px] text-slate-700 font-bold">{currentCase.auditDeadline}</div>
                <div className={`text-[10px] font-bold font-mono ${timeline.isUrgent ? 'text-rose-600' : 'text-slate-500'}`}>
                  -{timeline.remainingDays}d ({timeline.totalDays}d total)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2-B: UNITS PROGRESS BAR */}
        <div className="pt-1">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-600">
              AFFECTED FLEET: <strong className="text-slate-900">{currentCase.unitsAffected.toLocaleString()}</strong> · RESOLVED: <strong className="text-blue-600">{currentCase.otaCompletionRatePct}%</strong>
            </span>
            <span className="text-rose-600 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>UNRESOLVED GAP: {currentCase.gapRatePct}% ({currentCase.atRiskUnits.toLocaleString()} units)</span>
            </span>
          </div>

          <div className="w-full bg-slate-100 h-2.5 rounded-full flex overflow-hidden">
            <div className="bg-blue-600 h-full" style={{ width: `${currentCase.otaCompletionRatePct}%` }} />
            <div className="bg-rose-500 h-full" style={{ width: `${currentCase.gapRatePct}%` }} />
          </div>
        </div>

        {/* 2-C: NHTSA RECALL SEVERITY + FAILURE TRIGGER + DEALER DIRECTIVE (3-Card Layout) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          {/* Card 1: NHTSA Defect Severity Rating (NEW) */}
          <div className="p-2.5 bg-rose-50/80 border border-rose-300 rounded flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1 text-rose-700 font-bold mb-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>NHTSA DEFECT SEVERITY:</span>
              </div>
              <div className="font-bold text-slate-900 font-sans text-xs">
                {currentCase.nhtsaSeverityRating?.label || 'TIER-1 CRITICAL SAFETY DEFECT'}
              </div>
              <p className="text-[11px] text-slate-700 font-sans mt-0.5 leading-tight">
                {currentCase.nhtsaSeverityRating?.hazardDescription || currentCase.summary}
              </p>
            </div>
            <div className="mt-2 pt-1 border-t border-rose-200 text-[10px] text-rose-800 font-mono font-bold">
              {currentCase.nhtsaSeverityRating?.regulatoryCitation || '49 CFR Part 573.6'}
            </div>
          </div>

          {/* Card 2: Failure Trigger */}
          <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded flex flex-col justify-between">
            <div>
              <span className="text-amber-800 font-bold block mb-1">FAILURE TRIGGER:</span>
              <span className="text-slate-800 font-sans text-xs leading-tight block">
                {currentCase.dealerFallbackReason}
              </span>
            </div>
            <div className="mt-2 pt-1 border-t border-amber-200 text-[10px] text-amber-700 font-mono">
              ROOT MECHANISM: SENSOR / MODEM TIMEOUT
            </div>
          </div>

          {/* Card 3: Dealer Directive */}
          <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded flex flex-col justify-between">
            <div>
              <span className="text-blue-700 font-bold block mb-1">DEALER DIRECTIVE:</span>
              <span className="text-slate-800 font-sans text-xs leading-tight block">
                {currentCase.dealerServiceProcedure}
              </span>
            </div>
            <div className="mt-2 pt-1 border-t border-blue-200 text-[10px] text-blue-800 font-mono font-bold">
              WARRANTY CODE: REIMBURSED
            </div>
          </div>
        </div>
      </div>

      {/* 3. Action Queue Table with Enhanced Synthetic Behavioral Profile Tags */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden font-mono shadow-sm">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Wrench className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-bold text-slate-900">
              {currentCase.oemBrand.toUpperCase()} VEHICLE TELEMETRY & BEHAVIOR QUEUE ({displayVehicles.length})
            </span>
          </div>

          <button
            onClick={() => onNavigateToAnalyzer(activeVehicle)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-semibold text-xs transition-colors shadow-sm"
          >
            <span>ANALYZER</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">VEHICLE &amp; OWNER</th>
                <th className="py-2.5 px-4 font-semibold">VIN</th>
                <th className="py-2.5 px-4 font-semibold">BEHAVIOR PROFILE</th>
                <th className="py-2.5 px-4 font-semibold">TELEMETRY ERROR</th>
                <th className="py-2.5 px-4 font-semibold">CONNECTIVITY</th>
                <th className="py-2.5 px-4 font-semibold">STATUS</th>
                <th className="py-2.5 px-4 text-right font-semibold">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {displayVehicles.map((vehicle) => {
                const isSelected = activeVehicle.id === vehicle.id;
                const profile = vehicle.signals.behaviorProfile;

                // Profile Badge Styling
                const getProfileBadge = (p: string) => {
                  switch (p) {
                    case 'PROMPT_COMPLETER':
                      return 'bg-blue-100 text-blue-800 border-blue-200';
                    case 'BUSY_DELAYER':
                      return 'bg-amber-100 text-amber-800 border-amber-200';
                    case 'CONFUSED_USER':
                      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
                    case 'REPEATED_FAILURE':
                      return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
                    case 'CONNECTIVITY_CONSTRAINED':
                      return 'bg-slate-200 text-slate-800 border-slate-300';
                    case 'SKEPTICAL_LOW_URGENCY':
                      return 'bg-orange-100 text-orange-800 border-orange-200';
                    default:
                      return 'bg-slate-100 text-slate-700 border-slate-200';
                  }
                };

                return (
                  <tr
                    key={vehicle.id}
                    onClick={() => {
                      onSelectVehicle(vehicle);
                      setSelectedBrand(vehicle.make);
                    }}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/60 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      <div>{vehicle.year} {vehicle.model}</div>
                      <div className="text-[11px] text-slate-500 font-normal font-sans">{vehicle.ownerName} ({vehicle.ownerCity})</div>
                    </td>

                    <td className="py-2.5 px-4 text-[11px] font-mono text-slate-500">
                      {vehicle.vin}
                    </td>

                    <td className="py-2.5 px-4">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border inline-block ${getProfileBadge(profile)}`}>
                        {profile.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 text-[11px] font-mono text-slate-700 max-w-xs truncate">
                      {vehicle.signals.errorCode || vehicle.signals.lastErrorCode || 'NO_FAULT'}
                    </td>

                    <td className="py-2.5 px-4 font-mono text-[11px]">
                      <span className={vehicle.signals.connectivity?.cellularSignalDbm < -100 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                        {vehicle.signals.connectivity?.cellularSignalDbm || vehicle.signals.cellularSignalDbm} dBm
                      </span>
                      <span className="text-slate-400 ml-1">
                        ({vehicle.signals.connectivity?.cellularTechnology || 'LTE'})
                      </span>
                    </td>

                    <td className="py-2.5 px-4 font-mono text-[11px]">
                      {vehicle.status === 'DEALER_EXECUTED' ? (
                        <span className="text-emerald-900 font-bold bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
                          EXECUTED (30%)
                        </span>
                      ) : vehicle.status === 'DEALER_NOTIFIED' ? (
                        <span className="text-blue-900 font-bold bg-blue-100 border border-blue-200 px-2 py-0.5 rounded">
                          SENT (5%)
                        </span>
                      ) : vehicle.status === 'CONSENT_GRANTED' ? (
                        <span className="text-blue-800 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          CONSENTED
                        </span>
                      ) : vehicle.status === 'CONSENT_REQUESTED' ? (
                        <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          APP PUSH SENT
                        </span>
                      ) : vehicle.status === 'RECALL_COMPLETED' ? (
                        <span className="text-slate-900 font-bold bg-slate-200 px-2 py-0.5 rounded">
                          CERTIFIED
                        </span>
                      ) : (
                        <span className="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                          AT RISK
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectVehicle(vehicle);
                          setSelectedBrand(vehicle.make);
                          onNavigateToAnalyzer(vehicle);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-mono text-[11px] px-3 py-1 rounded font-semibold transition-colors shadow-xs"
                      >
                        ACTION →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
