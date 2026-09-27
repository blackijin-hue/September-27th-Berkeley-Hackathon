export type WorkflowStep = 'MONITOR' | 'ANALYZER' | 'OPPORTUNITIES' | 'REVENUE_LEDGER';

export type RecallRiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type BehaviorProfile =
  | 'PROMPT_COMPLETER'
  | 'BUSY_DELAYER'
  | 'CONFUSED_USER'
  | 'REPEATED_FAILURE'
  | 'CONNECTIVITY_CONSTRAINED'
  | 'SKEPTICAL_LOW_URGENCY';

export type RecallSeverityLevel =
  | 'CRITICAL_SAFETY_DO_NOT_DRIVE'
  | 'CRITICAL_SAFETY_ENTRAPMENT'
  | 'SAFETY_DEFECT_FIRE_HAZARD'
  | 'SAFETY_DEFECT_PROPULSION_STALL'
  | 'COMPLIANCE_NON_CRITICAL';

export interface CallCenterTicket {
  ticketId: string;
  channel: 'PHONE_INBOUND' | 'WEB_PORTAL' | 'CONNECTED_APP_CHAT' | 'DEALERSHIP_ESCALATION';
  timestamp: string;
  agentName: string;
  customerStatedRequest: string;
  urgencyLevel: 'URGENT' | 'ROUTINE' | 'ELEVATED';
  resolutionRequested: string;
}

export interface OEMWarrantyLineItem {
  opCode: string;
  opCodeDescription: string;
  flatRateHours: number;
  approvedLaborRateUsd: number;
  baseLaborTotalUsd: number;
  travelAllowanceUsd: number;
  partsAllowanceUsd: number;
  totalReimbursementUsd: number;
  oemGatewaySource: 'HYUNDAI_WEBDCS_V2' | 'FORD_OWLS_PTS_V4' | 'GM_GWM_STAR' | 'STELLANTIS_WITECH';
  preAuthorizationStatus: 'PRE_APPROVED_CERTIFIED' | 'CLAIM_PENDING_RO' | 'AUDIT_FLAGGED';
  nhtsaComplianceCredit: boolean;
}

export interface NHTSA2026Case {
  id: string;
  nhtsaCampaignNumber: string;
  oemBrand: string;
  oemGroup: string;
  modelsAffected: string;
  modelYear: string;
  unitsAffected: number;
  component: string;
  summary: string;
  softwareRemedyDescription: string;
  otaCompletionRatePct: number;
  gapRatePct: number;
  atRiskUnits: number;
  announcementDate: string;
  auditDeadline: string;
  isPureOta: boolean; // true if primarily OTA remedy
  dealerFallbackReason: string; // why dealer service is required upon OTA failure or lockout
  dealerServiceProcedure: string; // what the dealership technician actually performs
  nhtsaSeverityRating?: {
    level: RecallSeverityLevel;
    label: string;
    hazardDescription: string;
    actionMandate: string;
    regulatoryCitation: string;
  };
}

export type VehicleStatus =
  | 'AT_RISK_INCOMPLETE'
  | 'CONSENT_REQUESTED' // Step 1: OEM App Push Sent
  | 'CONSENT_GRANTED'   // Step 2: Customer Accepted via Connected App
  | 'DEALER_NOTIFIED'   // Step 3: Opportunity Sent/Transmitted to Dealer DMS (5% Transmission Fee Accrued)
  | 'DEALER_EXECUTED'   // Step 4: Dealer Executed & Claim Completed (30% Full Service Revenue Realized)
  | 'CONSENT_DECLINED'
  | 'DISPATCHED'
  | 'RECALL_COMPLETED';

export interface RecallCampaign {
  id: string;
  nhtsaCode: string;
  title: string;
  safetySeverity: 'CRITICAL_SAFETY' | 'SAFETY_COMPLIANCE' | 'RELIABILITY';
  description: string;
  remedyType: 'OTA_FIRMWARE_REFLASH' | 'DUAL_PATH_OTA_OR_DEALER';
  totalFleetEligible: number;
  releasedCount: number;
  downloadedCount: number;
  completedCount: number;
  atRiskCount: number;
  releasedDate: string;
  nhtsaAuditDeadline: string;
  reimbursementRatePerHour: number;
}

export interface SignalTelemetry {
  // Core Requested Telemetry Fields
  otaStatus: 'DOWNLOAD_FAILED' | 'INSTALLATION_LOCKED_OUT' | 'PENDING_USER_CONFIRMATION' | 'ABORTED_MID_FLASH' | 'INSTALLED_SUCCESS';
  failure: boolean;
  failureReason: string;
  previousFailureOfOtherOTA: boolean;
  errorCode: string;
  daysBtwOtaStartAndInstalledSuccess: number | null; // null if not yet successful
  priorUpdateCompletionBehavior: string; // e.g. "Consistently delayed >14 days", "Installed same night", "Failed twice on v3.8"
  connectivity: {
    cellularSignalDbm: number;
    cellularTechnology: '5G_NR' | '4G_LTE' | 'DEGRADED_2G_EDGE' | 'NO_SIGNAL';
    wifiAvailable: boolean;
    wifiSignalStrength: 'NONE' | 'WEAK' | 'FAIR' | 'STRONG';
    packetLossPct: number;
  };
  recentVehicleActivity: {
    lastDriveTimestamp: string;
    dailyDrivingHours: number;
    averageTripDurationMins: number;
    frequentShortTrips: boolean;
    overnightDwellHours: number;
    parkingLocationType: 'UNDERGROUND_CONCRETE' | 'STREET_UNSHELTERED' | 'RURAL_OUTDOOR' | 'COMMERCIAL_DEPOT' | 'PRIVATE_GARAGE';
  };
  recallSeverity: {
    level: RecallSeverityLevel;
    label: string;
    riskCategory: 'ENTRAPMENT_LIFE_SAFETY' | 'BATTERY_THERMAL_RUNAWAY' | 'PROPULSION_STALL_ACCIDENT' | 'FMVSS_NON_COMPLIANCE';
    nhtsaNoticeTitle: string;
  };

  // Behavioral profile classification
  behaviorProfile: BehaviorProfile;
  behaviorProfileSummary: string;

  // Compatibility fields for existing sub-components
  downloadAttempts: number;
  lastErrorCode: string | null;
  cellularSignalDbm: number;
  wifiAvailable: boolean;
  wifiSignalStrength: 'NONE' | 'WEAK' | 'FAIR' | 'STRONG';
  averageDailySOC: number;
  minRequiredSOCForFlash: number;
  chargingHabit: string;
  parkingEnvironment: 'UNDERGROUND_CONCRETE' | 'STREET_UNSHELTERED' | 'RURAL_OUTDOOR' | 'COMMERCIAL_DEPOT' | 'PRIVATE_GARAGE';
  customerDeferralCount: number;
  lastUserAction: string;
  lastUserActionTime: string;
  priorOTAFailures: number;
  dailyDrivingHours: number;
  shiftScheduleDependency: string;
}

export interface SignalFactor {
  category: 'INFRASTRUCTURE' | 'SAFETY_INVARIANT' | 'BEHAVIORAL' | 'HISTORICAL' | 'OPERATIONAL_LOCKOUT';
  label: string;
  detail: string;
  severity: 'CRITICAL' | 'MODERATE' | 'LOW';
  impactPercentage: number;
}

export interface RecommendedIntervention {
  id: string;
  title: string;
  channel: 'MOBILE_SERVICE' | 'DEALER_VALET' | 'SUPERCHARGER_CONCIERGE' | 'SCHEDULED_PRECONDITION';
  summary: string;
  customerOfferText: string;
  whyThisFits: string;
  estimatedTimeToResolutionHours: number;
  estimatedCostToOEM: number;
  dealerWarrantyCreditUsd: number;
  warrantyLineItem?: OEMWarrantyLineItem; // Official Verified OEM Warranty Ledger Breakdown
}

export interface AIDiagnosis {
  nonCreditScoreDisclaimer: string;
  rootCauseSummary: string;
  barrierArchetype: 'INFRASTRUCTURE_GAP' | 'OPERATIONAL_LOCKOUT' | 'EXPERIENCE_APPREHENSION' | 'FLEET_WINDOW_CONFLICT';
  explainabilityNarrative: string;
  signalsAnalyzed: SignalFactor[];
  recommendedIntervention: RecommendedIntervention;
  alternativeInterventions: RecommendedIntervention[];
  dealerWarrantyCreditUsd?: number;
  generatedAt?: string;
}

export interface ConsentRecord {
  status: 'AWAITING_CUSTOMER' | 'PENDING_OEM_APP_CONFIRMATION' | 'CONSENT_GRANTED' | 'CONSENT_DECLINED';
  timestamp?: string;
  authorizedDealership?: string;
  authorizedScopes: string[];
  selectedInterventionId: string;
  customerNotes?: string;
  signatureName?: string;
  contactPreference?: 'PHONE' | 'SMS' | 'EMAIL' | 'IN_APP';
  preferredTimeWindow?: string;
  oemAppPushSentAt?: string;
  dealerNotifiedAt?: string;
}

export type OEMWarrantyClaimStatus = 'UNCLAIMED' | 'CLAIM_SUBMITTED' | 'CLAIM_APPROVED' | 'CLAIM_REJECTED';
export type SettlementBasis = 'OEM_WARRANTY_REIMBURSEMENT_CLAIM' | 'LEAD_SALE_TRANSMISSION_ONLY';

export interface OEMWarrantyClaim {
  claimNumber: string;
  claimStatus: OEMWarrantyClaimStatus;
  oemClaimSystem: 'HYUNDAI_WEBDCS' | 'FORD_OASIS_PTS' | 'CDK_GLOBAL' | 'OEM_WARRANTY_PORTAL';
  submittedAt: string;
  approvedAt?: string;
  claimedLaborHours: number;
  claimedReimbursementUsd: number;
  opCode: string;
  technicianCertificationId?: string;
  claimRemittanceAdviceId?: string;
  complianceCertified: boolean;
}

export interface DealerOpportunity {
  roNumber: string;
  leadId?: string;
  dealerName: string;
  dealerAddress: string;
  dealerDistanceMiles: number;
  status: 'PENDING_TRANSMISSION' | 'LEAD_SOLD_TRANSMITTED' | 'DEALER_EXECUTED' | 'PENDING_DISPATCH' | 'DISPATCHED_EN_ROUTE' | 'SERVICE_IN_PROGRESS' | 'REMEDIATED_CERTIFIED';
  assignedTech?: string;
  techContact?: string;
  warrantyLaborHours: number;
  warrantyReimbursementUsd: number; // Gross service expense the dealer can reap from OEM
  
  // 2-Tier Monetization Model
  transmissionFeeRate?: number; // 0.05 (5% fee when opportunity is sent to dealership)
  transmissionFeeUsd?: number;  // Gross expense * 5%
  executionRevenueRate?: number; // 0.30 (30% revenue realized when dealer executes opportunity)
  executionRevenueUsd?: number;  // Gross expense * 30%
  platformRevenueUsd?: number;   // Current recognized revenue (5% if sent, 30% if executed)
  leadSaleCommissionRate?: number;

  // OEM Warranty Reimbursement Claim Integration
  // When dealer files a warranty reimbursement claim with the OEM, it is used as verified execution result data (30% rev).
  // Otherwise, if unclaimed or transmission only, it is strictly calculated as a Lead Sale (5% fee).
  settlementBasis?: SettlementBasis;
  warrantyClaimStatus?: OEMWarrantyClaimStatus;
  warrantyClaim?: OEMWarrantyClaim;
  
  dmsTransmissionId?: string;
  dmsStatus?: 'TRANSMITTED_ACKNOWLEDGED' | 'QUEUED' | 'PENDING_TRANSMISSION';
  transmittedAt?: string;
  dealerExecutedAt?: string;
  dealerExecutionInvoiceId?: string;
  warrantyLineItem?: OEMWarrantyLineItem;
  suggestedCustomerCare: string;
  potentialUpsellRevUsd: number;
  serviceScheduledFor?: string;
  dispatchEtaMinutes?: number;
  nhtsaCertificateId?: string;
  completionNotes?: string;
  completedAt?: string;
}

export interface VehicleRecord {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  trim: string;
  mileage: number;
  softwareVersion: string;
  targetFirmwareVersion: string;
  campaignId: string;
  campaignTitle: string;
  nhtsaCode: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerCity: string;
  ownerState: string;
  daysPending: number;
  status: VehicleStatus;
  riskLevel: RecallRiskLevel;
  riskConfidence: number;
  primaryBarrier: string;
  signals: SignalTelemetry;
  aiDiagnosis: AIDiagnosis;
  consentRecord: ConsentRecord;
  dealerOpportunity?: DealerOpportunity;
  customerRequestTicket?: CallCenterTicket; // Official Call Center / Customer Inbound Case
}
