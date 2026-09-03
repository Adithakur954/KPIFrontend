import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { GoogleMapsOverlay } from "@deck.gl/google-maps";
import { LineLayer, PolygonLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { getMapDetails } from "@/features/map/services/mapService";
import AnalyticsRightDrawer from "@/features/map/components/AnalyticsRightDrawer";
import MapHeader from "@/features/map/components/MapHeader";
import MapFilterPanel from "@/features/map/components/MapFilterPanel";
import MapKpiSelector from "@/features/map/components/MapKpiSelector";
import MapLayerLegend from "@/features/map/components/MapLayerLegend";
import MapSiteLegend from "@/features/map/components/MapSiteLegend";
import { fetchUploads } from "@/features/uploads/services/uploadService";
import { fetchDynamicMetrics, fetchWorstCells } from "@/features/validation_report/services/validationReportService";
import {
  fetchSiteDetails,
  fetchSiteIntelligence,
  fetchSitePredictionRecommendations,
  fetchSiteSummary,
  runLbWcfPrediction,
} from "@/features/sites/services/siteAnalyticsService";
import { fetchKpiAlarms, fetchKpiAlarmSummary } from "@/features/alarms/services/alarmsService";
import {
  Radio,
  MapPin,
  Signal,
  Compass,
  Antenna,
  Building2,
  Hash,
  Waves,
  Loader2,
  X,
  Layers,
  TrendingUp,
  Activity,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

const statusClasses = {
  GOOD: "border-emerald-200 bg-emerald-50 text-emerald-700",
  WATCH: "border-amber-200 bg-amber-50 text-amber-700",
  BAD: "border-orange-200 bg-orange-50 text-orange-700",
  CRITICAL: "border-red-200 bg-red-50 text-red-700",
};

const actionClasses = {
  LOAD_BALANCE: "border-blue-200 bg-blue-50 text-blue-700",
  CAPACITY_REVIEW: "border-purple-200 bg-purple-50 text-purple-700",
  COVERAGE_CHECK: "border-amber-200 bg-amber-50 text-amber-700",
  QUALITY_CHECK: "border-red-200 bg-red-50 text-red-700",
  OBSERVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const predictionActionColors = {
  LOAD_BALANCE: "#2563EB",
  QUALITY_CHECK: "#DC2626",
  CAPACITY_REVIEW: "#7C3AED",
  COVERAGE_CHECK: "#D97706",
  OBSERVE: "#059669",
};

const predictionActionLabels = {
  LOAD_BALANCE: "LB",
  QUALITY_CHECK: "Q",
  CAPACITY_REVIEW: "C",
  COVERAGE_CHECK: "CV",
  OBSERVE: "O",
};
const handoverRelationColors = {
  SAME_PCI: "#DC2626",
  HANDOVER_FACE: "#2563EB",
  SAME_CLUSTER: "#7C3AED",
  NEARBY: "#059669",
};
const handoverCategoryColors = {
  PCI: "#EF4444",
  BAND: "#10B981",
  TECHNOLOGY: "#8B5CF6",
  OPERATOR: "#F59E0B",
  NEIGHBOR: "#06B6D4",
};
const clampMapScale = (value) => Math.min(8, Math.max(0.05, Number(value || 1)));
const MAX_PREDICTION_MAP_MARKERS = 600;
const predictionActionDisplayOrder = ["LOAD_BALANCE", "QUALITY_CHECK", "CAPACITY_REVIEW", "COVERAGE_CHECK", "OBSERVE"];
const MAP_DATA_TIMEOUT_MS = 20000;
const DEFAULT_WORST_CELL_METRIC_LABEL = "Selected KPI";
const INFERRED_NEIGHBOUR_MAX_DISTANCE_KM = 8;
const INFERRED_NEIGHBOUR_AZIMUTH_TOLERANCE_DEG = 80;
const pciLayerModes = [
  { value: "same-pci", label: "Same PCI" },
  { value: "neighbours", label: "Neighbours" },
  { value: "collision", label: "Collision" },
  { value: "confusion", label: "Confusion" },
  { value: "both", label: "Both Risks" },
];
const analyticsTabs = [
  { value: "overview", label: "Overview" },
  { value: "clusters", label: "Clusterization" },
  { value: "handover", label: "Handover" },
  { value: "predictions", label: "Prediction" },
  { value: "worstCells", label: "Worst Cells" },
  { value: "alarms", label: "Alarm Cells" },
];

const severityOrder = { NORMAL: 0, WARNING: 1, MINOR: 2, MAJOR: 3, CRITICAL: 4 };
const severityMarkerColors = {
  CRITICAL: "#DC2626",
  MAJOR: "#EA580C",
  MINOR: "#D97706",
  WARNING: "#2563EB",
  NORMAL: "#16A34A",
};

const sampleSiteMapKpiMetrics = [
  { key: "prbdlutilization", label: "PRB DL Utilization %", count: 30 },
  { key: "userdlavergthpmbps", label: "User DL Averg THP Mbps", count: 30 },
  { key: "totaltrafficmb", label: "Total Traffic(MB)", count: 30 },
  { key: "totaltrafficgb", label: "Total Traffic(GB)", count: 30 },
  { key: "avgnumberofrrcusers", label: "Avg number of RRC users", count: 30 },
  { key: "interfreqhosr", label: "Inter freq HOSR%", count: 30 },
  { key: "rrcsr", label: "RRC SR%", count: 30 },
  { key: "cqiavg", label: "CQI Avg", count: 30 },
  { key: "cellavailability", label: "Cell Availability %", count: 30 },
];

const sampleSiteMapKpiRows = [
  ["ST001A1", "Vaibhav Khand Hub", "LTE 1800 B3", 18500, 18.07, 82, 7.5, 146, 92.5, 97.1, 8.4, 99.2],
  ["ST001B1", "Vaibhav Khand Hub", "LTE 1800 B3", 7600, 7.42, 48, 24.8, 62, 98.4, 99.2, 12.8, 99.9],
  ["ST001C1", "Vaibhav Khand Hub", "LTE 2300 B40", 14200, 13.87, 74, 10.2, 121, 94.0, 97.8, 9.1, 99.5],
  ["ST002A1", "Indirapuram Mall Site", "LTE 900 B8", 9600, 9.38, 61, 16.4, 84, 96.0, 98.9, 11.2, 99.7],
  ["ST002B1", "Indirapuram Mall Site", "LTE 1800 B3", 21000, 20.51, 89, 5.9, 178, 90.8, 96.2, 7.6, 98.8],
  ["ST002C1", "Indirapuram Mall Site", "NR 3500 N78", 11800, 11.52, 55, 28.5, 69, 98.7, 99.1, 13.4, 99.9],
  ["ST003A1", "Shipra Riviera", "LTE 2300 B40", 17200, 16.8, 84, 6.8, 151, 93.2, 97.0, 8.0, 99.1],
  ["ST003B1", "Shipra Riviera", "LTE 2300 B40", 6900, 6.74, 43, 26.1, 58, 99.0, 99.5, 13.1, 99.9],
  ["ST003C1", "Shipra Riviera", "LTE 2300 B40", 15400, 15.04, 79, 8.6, 132, 94.7, 97.6, 8.7, 99.3],
  ["ST004A1", "Nyay Khand Sector Site", "LTE 700 B28", 6200, 6.05, 40, 29.9, 45, 99.2, 99.4, 13.9, 99.9],
  ["ST004B1", "Nyay Khand Sector Site", "LTE 1800 B3", 18800, 18.36, 86, 7.1, 158, 91.9, 96.8, 7.9, 98.9],
  ["ST004C1", "Nyay Khand Sector Site", "LTE 2100 B1", 12600, 12.3, 66, 14.2, 104, 97.3, 98.8, 11.5, 99.6],
  ["ST005A1", "Ahinsa Khand Tower", "LTE 900 B8", 8200, 8.01, 58, 18.6, 72, 97.8, 99.0, 11.9, 99.8],
  ["ST005B1", "Ahinsa Khand Tower", "LTE 1800 B3", 19700, 19.24, 91, 4.8, 184, 89.5, 95.9, 7.1, 98.5],
  ["ST005C1", "Ahinsa Khand Tower", "NR 3500 N78", 13200, 12.89, 63, 22.7, 96, 97.6, 99.0, 12.5, 99.7],
  ["ST006A1", "Niti Khand Micro", "LTE 1800 B3", 11400, 11.13, 72, 11.9, 109, 95.4, 98.0, 9.8, 99.3],
  ["ST006B1", "Niti Khand Micro", "LTE 1800 B3", 15100, 14.75, 83, 6.2, 140, 92.1, 96.7, 7.8, 98.7],
  ["ST006C1", "Niti Khand Micro", "LTE 1800 B3", 6700, 6.54, 46, 25.2, 54, 98.9, 99.2, 13.0, 99.9],
  ["ST007A1", "Orange County Roof", "LTE 2300 B40", 16100, 15.72, 81, 7.9, 136, 93.5, 97.4, 8.6, 99.0],
  ["ST007B1", "Orange County Roof", "NR 3500 N78", 12800, 12.5, 69, 19.4, 101, 97.0, 98.6, 11.7, 99.6],
  ["ST007C1", "Orange County Roof", "NR 3500 N78", 21400, 20.9, 93, 4.2, 196, 88.8, 95.5, 6.9, 98.2],
  ["ST008A1", "Gaur Green Avenue", "LTE 700 B28", 5800, 5.66, 39, 30.5, 41, 99.4, 99.5, 14.1, 99.9],
  ["ST008B1", "Gaur Green Avenue", "LTE 900 B8", 9200, 8.98, 57, 17.8, 76, 97.9, 99.0, 12.0, 99.8],
  ["ST008C1", "Gaur Green Avenue", "LTE 1800 B3", 17600, 17.19, 85, 7.3, 148, 91.8, 96.6, 7.7, 98.8],
  ["ST009A1", "Windsor Park Site", "UMTS 2100", 5200, 5.08, 36, 31.2, 37, 99.0, 99.3, 13.8, 99.7],
  ["ST009B1", "Windsor Park Site", "LTE 1800 B3", 20500, 20.02, 90, 5.5, 181, 90.1, 96.0, 7.3, 98.4],
  ["ST009C1", "Windsor Park Site", "LTE 2300 B40", 13800, 13.48, 68, 13.6, 111, 96.6, 98.5, 10.9, 99.5],
  ["ST010A1", "Jaipuria Mall Rooftop", "LTE 1800 B3", 19200, 18.75, 88, 6.0, 169, 90.5, 96.3, 7.4, 98.6],
  ["ST010B1", "Jaipuria Mall Rooftop", "LTE 2300 B40", 15100, 14.75, 76, 10.8, 128, 95.1, 98.0, 9.5, 99.4],
  ["ST010C1", "Jaipuria Mall Rooftop", "NR 3500 N78", 22600, 22.07, 94, 3.9, 205, 88.2, 95.1, 6.5, 98.0],
].map(([cellName, site, band, totaltrafficmb, totaltrafficgb, prbdlutilization, userdlavergthpmbps, avgnumberofrrcusers, interfreqhosr, rrcsr, cqiavg, cellavailability]) => ({
  cellName,
  cell: cellName,
  site,
  band,
  totaltrafficmb,
  totaltrafficgb,
  prbdlutilization,
  userdlavergthpmbps,
  avgnumberofrrcusers,
  interfreqhosr,
  rrcsr,
  cqiavg,
  cellavailability,
}));

const lowerMetricIsWorse = new Set([
  "userdlavergthpmbps",
  "interfreqhosr",
  "rrcsr",
  "cqiavg",
  "cellavailability",
]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function percent(value) {
  const numeric = Math.max(0, Math.min(100, Math.round(Number(value || 0))));
  return `${numeric}%`;
}

function rankWorstSites(rows, limit = 8) {
  return [...asArray(rows)]
    .sort((left, right) => {
      const scoreDiff = Number(left.healthScore || 0) - Number(right.healthScore || 0);
      if (scoreDiff !== 0) return scoreDiff;
      const criticalDiff = Number(right.criticalCount || 0) - Number(left.criticalCount || 0);
      if (criticalDiff !== 0) return criticalDiff;
      const majorDiff = Number(right.majorCount || 0) - Number(left.majorCount || 0);
      if (majorDiff !== 0) return majorDiff;
      return String(left.site || "").localeCompare(String(right.site || ""));
    })
    .slice(0, limit)
    .map((site, index) => ({ ...site, rank: index + 1 }));
}

function summarizePredictions(items, fileId) {
  const actionCounts = {
    LOAD_BALANCE: 0,
    CAPACITY_REVIEW: 0,
    COVERAGE_CHECK: 0,
    QUALITY_CHECK: 0,
    OBSERVE: 0,
  };
  const severityCounts = {
    CRITICAL: 0,
    MAJOR: 0,
    MINOR: 0,
    NORMAL: 0,
  };
  const sites = new Set();
  const cells = new Set();

  asArray(items).forEach((item) => {
    const action = String(item.actionCode || "OBSERVE").toUpperCase();
    const severity = String(item.severity || "NORMAL").toUpperCase();
    actionCounts[action] = (actionCounts[action] || 0) + 1;
    severityCounts[severity] = (severityCounts[severity] || 0) + 1;
    if (item.site) sites.add(normalizeKey(item.site));
    if (item.cellName) cells.add(normalizeKey(item.cellName));
  });

  return {
    fileId,
    siteCount: sites.size,
    cellCount: cells.size,
    recommendationCount: asArray(items).length,
    actionCounts,
    severityCounts,
    topRecommendations: asArray(items).slice(0, 10),
  };
}

function balancePredictionDisplay(items) {
  const buckets = predictionActionDisplayOrder.reduce((acc, action) => {
    acc[action] = [];
    return acc;
  }, {});
  asArray(items).forEach((item) => {
    const action = String(item.actionCode || "OBSERVE").toUpperCase();
    const key = buckets[action] ? action : "OBSERVE";
    buckets[key].push(item);
  });

  const balanced = [];
  let hasMore = true;
  let index = 0;
  while (hasMore) {
    hasMore = false;
    predictionActionDisplayOrder.forEach((action) => {
      const item = buckets[action][index];
      if (item) {
        balanced.push(item);
        hasMore = true;
      }
    });
    index += 1;
  }
  return balanced;
}

function predictionActionFromMetric(metricName) {
  const key = normalizeKey(metricName);
  if (/(prb|load|offload|util|resource|capacity)/i.test(key)) return "LOAD_BALANCE";
  if (/(drop|rna|retain|availability|avail|success|fail|error|packetloss|loss)/i.test(key)) return "QUALITY_CHECK";
  if (/(user|traffic|volume|throughput|thp|connected|data)/i.test(key)) return "CAPACITY_REVIEW";
  if (/(rsrp|rsrq|sinr|distance|coverage|ue|signal|ta)/i.test(key)) return "COVERAGE_CHECK";
  return "CAPACITY_REVIEW";
}

function severityFromWorstCell(row) {
  const severity = String(row?.severity || row?.status || "").toUpperCase();
  if (["CRITICAL", "MAJOR", "MINOR", "NORMAL", "WARNING"].includes(severity)) {
    return severity === "WARNING" ? "MINOR" : severity;
  }
  const rank = Number(row?.rank || row?.position || 0);
  if (rank > 0 && rank <= 5) return "CRITICAL";
  if (rank > 5 && rank <= 10) return "MAJOR";
  if (rank > 10) return "MINOR";
  return "NORMAL";
}

function fallbackPredictionsFromWorstCells(rows, metricName) {
  return asArray(rows).map((row, index) => {
    const actionCode = predictionActionFromMetric(row?.metric || row?.metricName || metricName);
    const cellName = row?.cellName || row?.cell || row?.shortName || row?.name || row?.targetCell || "";
    const site = row?.site || row?.siteName || row?.siteId || baseCellKey(cellName);
    const value = row?.value ?? row?.average ?? row?.avg ?? row?.score ?? row?.metricValue;
    const severity = severityFromWorstCell(row);
    return {
      ...row,
      fileId: row?.fileId,
      site,
      siteName: row?.siteName || site,
      cellName,
      targetCell: cellName,
      actionCode,
      severity,
      score: value,
      source: "worst-cell-fallback",
      reason: `Prediction generated from worst-cell evidence for ${row?.metric || row?.metricName || metricName || "selected KPI"}.`,
      action:
        actionCode === "LOAD_BALANCE"
          ? "Review load balancing, offload options, and PRB utilization near this cell."
          : actionCode === "QUALITY_CHECK"
            ? "Investigate service quality, drops, success rate, alarms, and availability before optimization."
            : actionCode === "COVERAGE_CHECK"
              ? "Check antenna, coverage, overshooting, distance, and neighbor relation conditions."
              : "Review traffic growth, connected users, capacity expansion, and parameter tuning.",
      rank: row?.rank || index + 1,
    };
  });
}

function toRecommendationList(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  const text = String(value || "").trim();
  if (!text || text === "[]") return [];
  try {
    const parsed = JSON.parse(text.replaceAll("'", "\""));
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    // Fall through to a simple split for backend/export strings.
  }
  return text
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((item) => item.replace(/^['"\s]+|['"\s]+$/g, ""))
    .filter(Boolean);
}

function numberFromRow(row, keys, fallback = 0) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== null && value !== undefined && value !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
}

function classifyLbPrediction(row, recs, unbalanced) {
  const recommendationText = recs.join(" ").toLowerCase();
  const coverageCategory = String(row.coverage_category || "").toLowerCase();
  const coverageNear = numberFromRow(row, ["%coverage_upto_2km", "coverage_upto_2km"], 100);
  const coverageFar = numberFromRow(row, ["%coverage_6km_plus", "coverage_6km_plus"], 0);
  const hosr = numberFromRow(row, ["Inter_freq_HOSR%", "Inter freq HOSR%"], 100);
  const rrcSr = numberFromRow(row, ["RRC_SR%", "RRC SR%"], 100);
  const cqi = numberFromRow(row, ["CQI Avg", "CQI_Avg"], 15);
  const availability = numberFromRow(row, ["Cell Availability %", "Cell_Availability_%"], 100);
  const prb = numberFromRow(row, ["PRB DL Utilization %"], 0);
  const prbThreshold = numberFromRow(row, ["PRB_Threshold"], 85);
  const trafficGb = numberFromRow(row, ["Total Traffic(GB)"], 0);
  const rrcUsers = numberFromRow(row, ["Avg_number_of_RRC_users"], 0);

  const hasQualityIssue =
    hosr < 95 ||
    rrcSr < 98 ||
    cqi < 9 ||
    availability < 99 ||
    /(quality|hosr|rrc|drop|availability|threshxhigh|hysteresis|a5threshold2)/i.test(recommendationText);
  const hasCoverageIssue =
    coverageCategory.includes("under") ||
    coverageCategory.includes("over") ||
    coverageNear < 50 ||
    coverageFar > 25 ||
    /(coverage|antenna|tilt|threshxlow|a5threshold1)/i.test(recommendationText);
  const hasCapacityIssue =
    trafficGb >= 1.8 ||
    rrcUsers >= 32 ||
    /(capacity|traffic|user|throughput expansion|carrier)/i.test(recommendationText);
  const hasLoadIssue =
    unbalanced ||
    prb >= prbThreshold ||
    /(prb|scheduler|loadbalancing|load balance|offload)/i.test(recommendationText);

  if (hasQualityIssue) {
    return {
      actionCode: "QUALITY_CHECK",
      action: "Investigate quality KPIs, handover behavior, accessibility, retainability, and open alarms.",
      reason: "LB/WCF detected a quality risk from HOSR, RRC success, CQI, availability, or mobility recommendations.",
    };
  }
  if (hasCoverageIssue) {
    return {
      actionCode: "COVERAGE_CHECK",
      action: "Review coverage footprint, antenna tilt, overshooting, and neighbor relation behavior.",
      reason: "LB/WCF detected a coverage risk from TA distribution or antenna/threshold recommendations.",
    };
  }
  if (hasLoadIssue) {
    return {
      actionCode: "LOAD_BALANCE",
      action: "Review load balancing thresholds, target-layer offload, PRB pressure, and scheduler behavior.",
      reason: "LB/WCF marked this layer as not balanced or found high PRB/load-balancing pressure.",
    };
  }
  if (hasCapacityIssue) {
    return {
      actionCode: "CAPACITY_REVIEW",
      action: "Review traffic growth, connected users, carrier/layer balance, and capacity expansion options.",
      reason: "LB/WCF detected capacity pressure from traffic and connected-user demand.",
    };
  }
  return {
    actionCode: "OBSERVE",
    action: "Cell layer appears balanced by LB/WCF model.",
    reason: "LB/WCF did not find a strong actionable issue for this row.",
  };
}

function predictionMapPriority(item) {
  const actionPriority = {
    QUALITY_CHECK: 5,
    LOAD_BALANCE: 4,
    CAPACITY_REVIEW: 3,
    COVERAGE_CHECK: 2,
    OBSERVE: 1,
  };
  const severityPriority = {
    CRITICAL: 4,
    MAJOR: 3,
    MINOR: 2,
    NORMAL: 1,
  };
  const action = String(item?.actionCode || "OBSERVE").toUpperCase();
  const severity = String(item?.severity || "NORMAL").toUpperCase();
  return (actionPriority[action] || 0) * 1000 + (severityPriority[severity] || 0) * 100 + Number(item?.score || 0);
}

function lbRowsToMapPredictions(rows, fileId) {
  return asArray(rows).reduce((items, row) => {
    const cellName = row.Cell || row.cellName || row.Cell_Name || "";
    const site = row.Site || row.site || baseCellKey(cellName);
    const recs = [...toRecommendationList(row.ML_Recommendations), ...toRecommendationList(row.Recommendations)];
    const probabilities = [...toRecommendationList(row.ML_Probabilities), ...toRecommendationList(row.Probabilities)]
      .map(Number)
      .filter(Number.isFinite);
    const probability = Number(row.ML_Probability ?? probabilities[0] ?? 0);
    const unbalanced = String(row.Band_Unbalanced || "").toLowerCase().includes("not");
    if (!unbalanced && recs.length === 0) {
      return items;
    }
    const classified = classifyLbPrediction(row, recs, unbalanced);
    const severity = unbalanced
      ? probability >= 0.8 ? "CRITICAL" : probability >= 0.55 ? "MAJOR" : "MINOR"
      : "NORMAL";

    items.push({
      ...row,
      fileId,
      site,
      siteName: site,
      cellName,
      band: row.Band || row.band || "",
      technology: row.Tech || row.technology || "LTE",
      sector: row.Sector_x || row.Sector || "",
      actionCode: classified.actionCode,
      action: recs.length
        ? recs.slice(0, 3).join(", ")
        : classified.action,
      reason: classified.reason,
      balanceStatus: row.Band_Unbalanced || (unbalanced ? "Not Balanced" : "Balanced"),
      bandUnbalanced: row.Band_Unbalanced || (unbalanced ? "Not Balanced" : "Balanced"),
      severity,
      score: Math.round((probability || (unbalanced ? 0.6 : 0.1)) * 100),
      source: "lb-wcf-python",
      metrics: {
        dlThroughput: row.DL_throughput,
        prbDlUtilization: row["PRB DL Utilization %"],
        trafficShare: row["Total Traffic(MB)_share%"],
        trafficGb: row["Total Traffic(GB)"],
        rrcUsers: row.Avg_number_of_RRC_users,
        hosr: row["Inter_freq_HOSR%"],
        rrcSr: row["RRC_SR%"],
        cqi: row["CQI Avg"],
        availability: row["Cell Availability %"],
        coverageNear: row["%coverage_upto_2km"],
        coverageFar: row["%coverage_6km_plus"],
        mlProbability: row.ML_Probability,
      },
      evidence: [
        row.Band_Unbalanced ? `Balance: ${row.Band_Unbalanced}` : "",
        classified.actionCode ? `Type: ${String(classified.actionCode).replaceAll("_", " ")}` : "",
        row.ML_Probability != null ? `ML probability ${Number(row.ML_Probability).toFixed(2)}` : "",
        row.DL_throughput != null ? `DL throughput ${Number(row.DL_throughput).toFixed(2)}` : "",
        row["PRB DL Utilization %"] != null ? `PRB ${Number(row["PRB DL Utilization %"]).toFixed(2)}%` : "",
      ].filter(Boolean),
      rank: items.length + 1,
    });
    return items;
  }, []);
}

function normalizeKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function baseCellKey(value) {
  return normalizeKey(String(value || "").replace(/(?<=\d)[A-Za-z]$/, ""));
}

function normalizePci(value) {
  const raw = String(value ?? "").trim();
  if (!raw || ["null", "na", "n/a", "none", "undefined", "-"].includes(raw.toLowerCase())) {
    return "";
  }
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? String(Math.trunc(numeric)) : normalizeKey(raw);
}

function distanceKm(from, to) {
  if (!from || !to) return null;
  const lat1 = Number(from.lat);
  const lon1 = Number(from.lon);
  const lat2 = Number(to.lat);
  const lon2 = Number(to.lon);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;

  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingDeg(from, to) {
  if (!from || !to) return null;
  const lat1 = Number(from.lat);
  const lon1 = Number(from.lon);
  const lat2 = Number(to.lat);
  const lon2 = Number(to.lon);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(deltaLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function angleDeltaDeg(left, right) {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (![leftNumber, rightNumber].every(Number.isFinite)) return null;
  return Math.abs(((leftNumber - rightNumber + 540) % 360) - 180);
}

function siteFacesCandidate(site, candidate) {
  const bearing = bearingDeg(site, candidate);
  if (bearing == null) return false;
  return asArray(site?.cells).some((cell) => {
    const delta = angleDeltaDeg(cell.AZIMUTH, bearing);
    return delta != null && delta <= INFERRED_NEIGHBOUR_AZIMUTH_TOLERANCE_DEG;
  });
}

function isInferredNeighbourSite(source, candidate) {
  const distance = distanceKm(source, candidate);
  if (distance == null || distance > INFERRED_NEIGHBOUR_MAX_DISTANCE_KM) return false;
  if (distance <= 1) return true;
  return siteFacesCandidate(source, candidate) || siteFacesCandidate(candidate, source);
}

function metricKey(metric) {
  if (typeof metric === "string") return metric;
  return metric?.key || metric?.metricKey || metric?.name || metric?.label || "";
}

function metricLabel(metric) {
  if (typeof metric === "string") return metric;
  return metric?.label || metric?.name || metric?.key || metric?.metricKey || "";
}

function isSampleSiteMapKpiUpload(upload) {
  return normalizeKey(upload?.fileName || upload?.filename).includes("kpiforsitemapsamplemultiband");
}

function buildSampleWorstCells(metric, limit = 25) {
  const key = normalizeKey(metric);
  const metricMeta = sampleSiteMapKpiMetrics.find((item) => normalizeKey(item.key) === key || normalizeKey(item.label) === key);
  const metricName = metricMeta?.label || metric || "Selected KPI";
  const metricKeyName = metricMeta?.key || key;

  return [...sampleSiteMapKpiRows]
    .filter((row) => Number.isFinite(Number(row[metricKeyName])))
    .sort((left, right) => {
      const leftValue = Number(left[metricKeyName]);
      const rightValue = Number(right[metricKeyName]);
      return lowerMetricIsWorse.has(metricKeyName) ? leftValue - rightValue : rightValue - leftValue;
    })
    .slice(0, limit)
    .map((row, index) => {
      const value = Number(row[metricKeyName]);
      const severity = index < 5 ? "CRITICAL" : index < 12 ? "MAJOR" : "MINOR";
      return {
        ...row,
        rank: index + 1,
        metric: metricName,
        metricName,
        value,
        averageValue: Number.isFinite(value) ? Number(value.toFixed(2)) : value,
        severity,
        source: "sample-kpi",
      };
    });
}

function percentile(values, quantile) {
  const sorted = values.map(Number).filter(Number.isFinite).sort((left, right) => left - right);
  if (sorted.length === 0) return 0;
  const bounded = Math.max(0, Math.min(1, Number(quantile || 0)));
  const index = (sorted.length - 1) * bounded;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function buildSampleLbPredictions({ fileId, method, mlMode, quantile, limit = 60 }) {
  const selectedMethod = String(method || "both").toLowerCase();
  const selectedMode = Number(mlMode || 3);
  const dlThreshold = percentile(sampleSiteMapKpiRows.map((row) => row.userdlavergthpmbps), Number(quantile || 0.1));
  const prbHighThreshold = percentile(sampleSiteMapKpiRows.map((row) => row.prbdlutilization), 0.75);
  const trafficHighThreshold = percentile(sampleSiteMapKpiRows.map((row) => row.totaltrafficmb), 0.75);
  const userHighThreshold = percentile(sampleSiteMapKpiRows.map((row) => row.avgnumberofrrcusers), 0.75);
  const dlMedian = percentile(sampleSiteMapKpiRows.map((row) => row.userdlavergthpmbps), 0.5);
  const candidates = [];

  const addCandidate = (row, { actionCode, action, reason, score, source, metricName, metricValue }) => {
    candidates.push({
      ...row,
      fileId,
      siteName: row.site,
      targetCell: row.cellName,
      actionCode,
      action,
      reason,
      metric: metricName,
      metricName,
      value: metricValue,
      averageValue: Number(metricValue.toFixed(2)),
      score,
      severity: score >= 90 ? "CRITICAL" : score >= 75 ? "MAJOR" : "MINOR",
      balanceStatus: "Not Balanced",
      bandUnbalanced: "Not Balanced",
      source,
      evidence: [
        `${metricName}: ${metricValue.toFixed(2)}`,
        `Rule DL threshold: ${dlThreshold.toFixed(2)}`,
        `PRB high threshold: ${prbHighThreshold.toFixed(2)}`,
        `Traffic high threshold: ${trafficHighThreshold.toFixed(0)} MB`,
      ],
    });
  };

  if (selectedMethod === "rule-based" || selectedMethod === "rule" || selectedMethod === "both") {
    sampleSiteMapKpiRows.forEach((row) => {
      const dl = Number(row.userdlavergthpmbps);
      if (Number.isFinite(dl) && dl <= dlThreshold) {
        addCandidate(
          row,
          {
            actionCode: "COVERAGE_CHECK",
            action: "Check coverage, overshooting, antenna tilt, and neighbor mobility around this low-throughput cell.",
            reason: `Rule-based prediction: DL throughput is below the selected ${Number(quantile || 0.1) * 100}% quantile, so this cell is Not Balanced.`,
            score: Math.round(100 - (dl / Math.max(dlThreshold, 1)) * 20),
            source: "sample-rule-coverage",
            metricName: "User DL Averg THP Mbps",
            metricValue: dl,
          }
        );
      }
    });
  }

  if (selectedMethod === "ml-based" || selectedMethod === "ml" || selectedMethod === "both") {
    sampleSiteMapKpiRows.forEach((row) => {
      const dl = Number(row.userdlavergthpmbps);
      const prb = Number(row.prbdlutilization);
      const traffic = Number(row.totaltrafficmb);
      const users = Number(row.avgnumberofrrcusers);
      const hosr = Number(row.interfreqhosr);
      const rrc = Number(row.rrcsr);
      const cqi = Number(row.cqiavg);
      const availability = Number(row.cellavailability);
      const dlProblem = [1, 3].includes(selectedMode) && Number.isFinite(dl) && dl < dlMedian;
      const prbProblem = [2, 3].includes(selectedMode) && Number.isFinite(prb) && prb >= prbHighThreshold;
      const capacityProblem =
        Number.isFinite(traffic) && traffic >= trafficHighThreshold &&
        Number.isFinite(users) && users >= userHighThreshold;
      const qualityProblem =
        (Number.isFinite(hosr) && hosr < 95) ||
        (Number.isFinite(rrc) && rrc < 98) ||
        (Number.isFinite(availability) && availability < 99);
      const coverageProblem = Number.isFinite(cqi) && cqi < 9;

      if (prbProblem) {
        addCandidate(row, {
          actionCode: "LOAD_BALANCE",
          action: "Review load balancing thresholds, target-layer offload, and PRB pressure.",
          reason: "ML-style prediction: PRB utilization is in the high-load group, so this cell is Not Balanced.",
          score: Math.round(prb),
          source: "sample-ml-load-balance",
          metricName: "PRB DL Utilization %",
          metricValue: prb,
        });
      }

      if (capacityProblem) {
        addCandidate(row, {
          actionCode: "CAPACITY_REVIEW",
          action: "Review capacity expansion, carrier/layer split, traffic growth, and connected user load.",
          reason: "ML-style prediction: traffic and connected users are both in the high-capacity group.",
          score: Math.round(Math.min(99, 70 + ((traffic / Math.max(trafficHighThreshold, 1)) * 15) + ((users / Math.max(userHighThreshold, 1)) * 10))),
          source: "sample-ml-capacity",
          metricName: "Total Traffic(MB)",
          metricValue: traffic,
        });
      }

      if (qualityProblem) {
        const worstQuality = [
          { name: "Inter freq HOSR%", value: hosr, score: Number.isFinite(hosr) ? 100 - hosr : 0 },
          { name: "RRC SR%", value: rrc, score: Number.isFinite(rrc) ? 100 - rrc : 0 },
          { name: "Cell Availability %", value: availability, score: Number.isFinite(availability) ? 100 - availability : 0 },
        ].sort((left, right) => right.score - left.score)[0];
        addCandidate(row, {
          actionCode: "QUALITY_CHECK",
          action: "Investigate retainability, accessibility, handover quality, and open alarms for this cell.",
          reason: "ML-style prediction: quality KPI is below target, so service quality needs review.",
          score: Math.round(75 + Math.min(20, worstQuality.score * 6)),
          source: "sample-ml-quality",
          metricName: worstQuality.name,
          metricValue: worstQuality.value,
        });
      }

      if (coverageProblem || dlProblem) {
        const metricValue = coverageProblem ? cqi : dl;
        addCandidate(row, {
          actionCode: "COVERAGE_CHECK",
          action: "Check coverage footprint, antenna tilt, overshooting, and neighbor relation behavior.",
          reason: coverageProblem
            ? "ML-style prediction: CQI is weak, so this cell needs coverage/radio quality review."
            : "ML-style prediction: DL throughput is in the low-throughput group for the selected mode.",
          score: coverageProblem ? Math.round(100 - cqi * 4) : Math.round(100 - (dl / Math.max(dlMedian, 1)) * 30),
          source: "sample-ml-coverage",
          metricName: coverageProblem ? "CQI Avg" : "User DL Averg THP Mbps",
          metricValue,
        });
      }
    });
  }

  return candidates
    .sort((left, right) => {
      const actionPriority = { LOAD_BALANCE: 4, QUALITY_CHECK: 3, CAPACITY_REVIEW: 2, COVERAGE_CHECK: 1 };
      const scoreDiff = Number(right.score || 0) - Number(left.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (actionPriority[right.actionCode] || 0) - (actionPriority[left.actionCode] || 0);
    })
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function buildSampleLbResult(rows, method) {
  const unbalancedCells = new Set(rows.map((row) => row.cellName || row.cell).filter(Boolean));
  return {
    records: rows,
    summary: {
      rows: sampleSiteMapKpiRows.length,
      unbalanced_count: unbalancedCells.size,
      balanced_count: Math.max(0, sampleSiteMapKpiRows.length - unbalancedCells.size),
      method,
      warnings: ["Using bundled sample KPI rows. Re-upload as KPI Data to run backend Python LB/WCF on uploaded records."],
    },
  };
}

function isKpiUpload(upload) {
  const explicitType = String(upload?.uploadType || upload?.type || upload?.category || upload?.fileType || "").toLowerCase();
  const remarks = String(upload?.remarks || upload?.description || "").toLowerCase();
  const fileName = String(upload?.fileName || upload?.filename || "").toLowerCase();
  const typedText = `${explicitType} ${remarks}`;
  const hasToken = (text, token) => String(text || "").split(/[^a-z0-9]+/i).includes(token);
  const hasAnyToken = (text, tokens) => tokens.some((token) => hasToken(text, token));
  const nonKpiTokens = ["alarm", "counter", "dump", "group"];

  if (hasAnyToken(typedText, nonKpiTokens)) {
    return false;
  }
  if (hasToken(typedText, "kpi")) {
    return true;
  }

  return hasToken(fileName, "kpi") && !hasAnyToken(fileName, nonKpiTokens);
}

function isSiteUpload(upload) {
  const explicitType = String(upload?.uploadType || upload?.type || upload?.category || upload?.fileType || "").toLowerCase();
  const remarks = String(upload?.remarks || upload?.description || "").toLowerCase();
  const fileName = String(upload?.fileName || upload?.filename || "").toLowerCase();
  const typedText = `${explicitType} ${remarks}`;
  const hasToken = (text, token) => String(text || "").split(/[^a-z0-9]+/i).includes(token);
  const hasKpiToken = hasToken(typedText, "kpi") || hasToken(fileName, "kpi");

  if (hasKpiToken) return false;
  if (hasToken(typedText, "site")) return true;
  if (hasToken(fileName, "site")) return true;
  return false;
}

function buildMissingKpiRowsMessage(fileId, upload) {
  const fileName = upload?.fileName || upload?.filename || `file #${fileId}`;
  return `No parsed KPI rows were found for ${fileName}. Upload/select the generated KPI CSV as KPI Data, then use the generated TA CSV only in Optional TA Distance File.`;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstValue(row, keys, fallback = "") {
  for (const key of keys) {
    const value = row?.[key];
    const normalized = String(value ?? "").trim();
    if (
      value !== null &&
      value !== undefined &&
      normalized !== "" &&
      !["null", "na", "n/a", "none", "undefined"].includes(normalized.toLowerCase())
    ) {
      return value;
    }
  }
  return fallback;
}

function parseCellNameParts(cellName) {
  const raw = String(cellName || "").trim();
  const match = raw.match(/^(.+?)_([A-Z])(\d{1,3})(?:_?([A-Z0-9]+))?$/i);
  if (!match) return {};

  const [, siteId, techCode, bandCode, sectorCode] = match;
  const techMap = {
    L: "LTE",
    N: "NR",
    G: "GSM",
    U: "UMTS",
    W: "WCDMA",
  };

  return {
    siteId,
    technology: techMap[String(techCode).toUpperCase()] || String(techCode).toUpperCase(),
    band: `${String(techCode).toUpperCase()}${String(bandCode).padStart(2, "0")}`,
    sector: sectorCode ? String(sectorCode).slice(-1).toUpperCase() : "",
  };
}

function lteBandFromEarfcn(value) {
  const earfcn = toNumber(value);
  if (!Number.isFinite(earfcn)) return "";

  const ranges = [
    [0, 599, 1],
    [600, 1199, 2],
    [1200, 1949, 3],
    [1950, 2399, 4],
    [2400, 2649, 5],
    [2650, 2749, 6],
    [2750, 3449, 7],
    [3450, 3799, 8],
    [3800, 4149, 9],
    [4150, 4749, 10],
    [4750, 4949, 11],
    [5010, 5179, 12],
    [5180, 5279, 13],
    [5280, 5379, 14],
    [5730, 5849, 17],
    [5850, 5999, 18],
    [6000, 6149, 19],
    [6150, 6449, 20],
    [6450, 6599, 21],
    [6600, 7399, 22],
    [7500, 7699, 23],
    [7700, 8039, 24],
    [8040, 8689, 25],
    [8690, 9039, 26],
    [9040, 9209, 27],
    [9210, 9659, 28],
    [9660, 9769, 29],
    [9770, 9869, 30],
    [9870, 9919, 31],
    [9920, 10359, 32],
    [36000, 36199, 33],
    [36200, 36349, 34],
    [36350, 36949, 35],
    [36950, 37549, 36],
    [37550, 37749, 37],
    [37750, 38249, 38],
    [38250, 38649, 39],
    [38650, 39649, 40],
    [39650, 41589, 41],
    [41590, 43589, 42],
    [43590, 45589, 43],
    [45590, 46589, 44],
    [46590, 46789, 45],
    [46790, 54539, 46],
    [54540, 55239, 47],
    [55240, 56739, 48],
    [56740, 58239, 49],
    [58240, 59089, 50],
    [59090, 59139, 51],
    [59140, 60139, 52],
    [60140, 60254, 53],
    [65536, 66435, 65],
    [66436, 67335, 66],
    [67336, 67535, 67],
    [67536, 67835, 68],
    [67836, 68335, 69],
    [68336, 68585, 70],
    [68586, 68935, 71],
    [68936, 68985, 72],
    [68986, 69035, 73],
    [69036, 69465, 74],
    [69466, 70315, 75],
    [70316, 70365, 76],
    [70366, 70545, 85],
    [70546, 70595, 87],
    [70596, 70645, 88],
  ];

  const match = ranges.find(([start, end]) => earfcn >= start && earfcn <= end);
  return match ? `L${String(match[2]).padStart(2, "0")}` : "";
}

function firstEarfcnValue(row) {
  return firstValue(
    row,
    [
      "EARFCN",
      "EARCFCN",
      "earfcn",
      "earcfcn",
      "DL_EARFCN",
      "DL_EARCFCN",
      "dl_earfcn",
      "dl_earcfcn",
      "EarfcnDL",
      "earfcnDl",
      "Earfcn Dl",
      "EARFCN DL",
      "DL EARFCN",
      "DL_EARFCN",
      "DL EARCFCN",
      "DL_EARCFCN",
      "dlEarfcn",
      "dlEarcfcn",
      "Downlink EARFCN",
      "downlinkEarfcn",
      "DL Channel Number",
      "dlChannelNumber",
      "Channel Number",
      "channelNumber",
      "E-ARFCN",
      "E_ARFCN",
    ],
    "",
  );
}

function firstBandValue(row) {
  return firstValue(row, ["Band", "BAND", "band", "Frequency_Band", "frequencyBand", "Freq_Band", "freqBand", "bandName", "LTE_Band", "lteBand", "Band_Indicator", "bandIndicator"], "");
}

function firstTechnologyValue(row) {
  return firstValue(row, ["Technology", "TECHNOLOGY", "Tech", "TECH", "tech", "technology", "RAT", "RAT_Type", "ratType", "Radio_Access_Technology", "radioAccessTechnology", "Technology_Type", "technologyType"], "");
}

function normalizeSiteMapRow(row) {
  const lat = toNumber(firstValue(row, ["lat", "latitude", "Latitude", "LAT", "site_latitude", "siteLatitude", "Site_Latitude", "cell_latitude", "cellLatitude", "Cell_Latitude", "y", "Y", "decimal_latitude", "Decimal_Latitude"]));
  const lon = toNumber(firstValue(row, ["lon", "longitude", "Longitude", "LON", "lng", "long", "site_longitude", "siteLongitude", "Site_Longitude", "cell_longitude", "cellLongitude", "Cell_Longitude", "x", "X", "decimal_longitude", "Decimal_Longitude"]));
  const cellName = firstValue(row, ["Cell_Name", "cellName", "cell_name", "CELL_NAME", "4G Cell Name", "4gCellName", "4G_Cell_Name", "LTE Cell Name", "lteCellName", "Cell", "CELL", "EUtranCell", "EUtranCellFDD", "EUtranCellTDD", "localCellName", "Local_Cell_Name", "shortName", "short_name"], "");
  const parsedCell = parseCellNameParts(cellName);
  const siteId = firstValue(row, ["SITEID", "siteId", "site_id", "Site_ID", "4G Site Name", "4gSiteName", "4G_Site_Name", "LTE Site Name", "lteSiteName", "id"], parsedCell.siteId || cellName || "Unknown Site");
  const siteName = firstValue(row, ["Site_Name", "siteName", "site_name", "SITE_NAME", "4G Site Name", "4gSiteName", "4G_Site_Name", "LTE Site Name", "lteSiteName"], siteId || cellName);
  const earfcn = firstEarfcnValue(row);
  const bandFromEarfcn = lteBandFromEarfcn(earfcn);
  const band = bandFromEarfcn || firstBandValue(row) || parsedCell.band || "";
  const technology = firstTechnologyValue(row) || parsedCell.technology || (bandFromEarfcn ? "LTE" : "");

  return {
    ...row,
    SITEID: String(siteId),
    Site_Name: String(siteName),
    Cell_Name: String(cellName),
    Cell_ID: firstValue(row, ["Cell_ID", "cellId", "cell_id", "CELL_ID", "4G Cell ID", "4gCellId", "4G_Cell_ID"], row?.id || cellName),
    AZIMUTH: toNumber(firstValue(row, ["AZIMUTH", "azimuth", "Azimuth"])) ?? 0,
    EARFCN: earfcn || firstValue(row, ["EARFCN"], ""),
    Downlink_Center_Frequency:
      toNumber(firstValue(row, ["Downlink_Center_Frequency", "Frequency", "frequency"])) ?? 0,
    Band: band,
    Technology: technology,
    Sector: firstValue(row, ["Sector", "SECTOR", "sector", "SEC", "SEC_ID", "Sector_ID", "Sector_Name", "sectorName"], parsedCell.sector || ""),
    Antenna_Height: toNumber(firstValue(row, ["Antenna_Height", "antennaHeight"])) ?? 0,
    PCI: firstValue(row, ["PCI", "pci", "Physical Cell ID [PCI]", "Physical_Cell_ID_PCI", "physicalCellIdPci", "physical_cell_id", "physicalCellId"], "-"),
    TAC: firstValue(row, ["TAC", "tac"], "-"),
    E_tilt: firstValue(row, ["E_tilt", "eTilt"], "-"),
    M_tilt: firstValue(row, ["M_tilt", "mTilt"], "-"),
    lat,
    lon,
  };
}

function getCellTechnologyLabel(cell) {
  const explicitTech = firstTechnologyValue(cell);
  if (explicitTech) return String(explicitTech).toUpperCase();

  const parsedCell = parseCellNameParts(firstValue(cell, ["Cell_Name", "cellName", "cell_name", "CELL_NAME"], ""));
  if (parsedCell.technology) return parsedCell.technology;

  if (lteBandFromEarfcn(firstEarfcnValue(cell))) return "LTE";

  const frequency = toNumber(firstValue(cell, ["Downlink_Center_Frequency", "Frequency", "frequency"]));
  if (frequency >= 3300) return "5G";
  if (frequency >= 700) return "4G";
  return "UNKNOWN";
}

function getCellBandLabel(cell) {
  const bandFromEarfcn = lteBandFromEarfcn(firstEarfcnValue(cell));
  if (bandFromEarfcn) return bandFromEarfcn;

  const explicitBand = firstBandValue(cell);
  if (explicitBand) return String(explicitBand);

  const parsedCell = parseCellNameParts(firstValue(cell, ["Cell_Name", "cellName", "cell_name", "CELL_NAME"], ""));
  if (parsedCell.band) return parsedCell.band;

  const frequency = toNumber(firstValue(cell, ["Downlink_Center_Frequency", "Frequency", "frequency"]));
  if (!frequency) return "Unknown band";
  if (frequency >= 3500) return `${frequency} MHz High band`;
  if (frequency >= 2300) return `${frequency} MHz Capacity band`;
  if (frequency >= 1800) return `${frequency} MHz Mid band`;
  if (frequency >= 900) return `${frequency} MHz Low/Mid band`;
  return `${frequency} MHz Low band`;
}

function uniqueCleanValues(values) {
  const lookup = new Map();
  values.forEach((value) => {
    const label = String(value || "").trim();
    const key = normalizeKey(label);
    if (key && !["unknownband", "unknown", "null", "na"].includes(key)) {
      lookup.set(key, label);
    }
  });
  return Array.from(lookup.values());
}

function getSiteBands(site) {
  return uniqueCleanValues(asArray(site?.cells).map(getCellBandLabel));
}

function getSiteTechnologies(site) {
  return uniqueCleanValues(asArray(site?.cells).map(getCellTechnologyLabel));
}

function getSiteBaseColor(site) {
  const bands = getSiteBands(site);
  const technologies = getSiteTechnologies(site);
  const multiTech = technologies.length > 1;
  const multiBand = bands.length > 1;

  if (multiTech && multiBand) return "#9333EA";
  if (multiTech) return "#A855F7";
  if (multiBand) return "#14B8A6";

  const tech = normalizeKey(technologies[0]);
  if (tech.includes("5g") || tech.includes("nr")) return "#8B5CF6";
  if (tech.includes("4g") || tech.includes("lte")) return "#2563EB";
  if (tech.includes("3g") || tech.includes("umts") || tech.includes("wcdma")) return "#F59E0B";
  if (tech.includes("2g") || tech.includes("gsm")) return "#64748B";

  const bandText = normalizeKey(bands[0]);
  if (bandText.includes("3500") || bandText.includes("n78")) return "#8B5CF6";
  if (bandText.includes("2300") || bandText.includes("2600")) return "#0EA5E9";
  if (bandText.includes("1800") || bandText.includes("2100")) return "#2563EB";
  if (bandText.includes("900") || bandText.includes("700")) return "#10B981";
  return "#475569";
}

function getSiteMapLabel(site) {
  const bands = getSiteBands(site);
  const technologies = getSiteTechnologies(site);
  const bandLabel = bands.length > 0 ? bands.join(", ") : "No band";
  const techLabel = technologies.length > 0 ? technologies.join(", ") : "No technology";
  return { bands, technologies, bandLabel, techLabel };
}

function getIntelligenceTone(status, impactScore = 0) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "CRITICAL" || Number(impactScore) >= 80) {
    return { fill: "#DC2626", stroke: "#7F1D1D", light: "#FEE2E2" };
  }
  if (normalized === "BAD" || Number(impactScore) >= 60) {
    return { fill: "#EA580C", stroke: "#9A3412", light: "#FFEDD5" };
  }
  if (normalized === "WATCH" || Number(impactScore) >= 35) {
    return { fill: "#D97706", stroke: "#92400E", light: "#FEF3C7" };
  }
  return { fill: "#16A34A", stroke: "#166534", light: "#DCFCE7" };
}

function getBandFrequencyScale(cell) {
  const rawBand = getCellBandLabel(cell).toLowerCase();
  const frequency =
    toNumber(firstValue(cell, ["Downlink_Center_Frequency", "Frequency", "frequency"])) ||
    toNumber(rawBand.match(/\d{3,4}/)?.[0]);

  if (rawBand.includes("n78") || rawBand.includes("b78") || frequency >= 3500) return 0.55;
  if (rawBand.includes("2600") || rawBand.includes("b7") || frequency >= 2500) return 0.62;
  if (rawBand.includes("2300") || rawBand.includes("b40") || frequency >= 2300) return 0.68;
  if (rawBand.includes("2100") || rawBand.includes("b1") || frequency >= 2100) return 0.74;
  if (rawBand.includes("1800") || rawBand.includes("b3") || frequency >= 1800) return 0.82;
  if (rawBand.includes("900") || rawBand.includes("b8") || frequency >= 900) return 0.95;
  if (rawBand.includes("700") || rawBand.includes("b28") || frequency >= 700) return 1.08;
  return 0.9;
}

function hexToRgba(hex, alpha = 255) {
  const clean = String(hex || "#3B82F6").replace("#", "");
  const normalized = clean.length === 3
    ? clean.split("").map((item) => item + item).join("")
    : clean.padEnd(6, "0").slice(0, 6);
  const value = Number.parseInt(normalized, 16);
  if (!Number.isFinite(value)) return [59, 130, 246, alpha];
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, alpha];
}

export default function MapPage() {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const googleMapsMapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
  const [mapData, setMapData] = useState([]);
  const [totalSiteRows, setTotalSiteRows] = useState(0);
  const [missingCoordinateRows, setMissingCoordinateRows] = useState(0);
  const [fetchError, setFetchError] = useState("");
  const [uploads, setUploads] = useState([]);
  const [siteUploads, setSiteUploads] = useState([]);
  const [selectedSiteFileId, setSelectedSiteFileId] = useState("");
  const [selectedFileId, setSelectedFileId] = useState("");
  const [metrics, setMetrics] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState("");
  const [worstCells, setWorstCells] = useState([]);
  const [worstMessage, setWorstMessage] = useState("");
  const [loadingWorst, setLoadingWorst] = useState(false);
  const [siteSummary, setSiteSummary] = useState(null);
  const [siteDetails, setSiteDetails] = useState(null);
  const [siteIntelligence, setSiteIntelligence] = useState(null);
  const [, setPredictionSummary] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [lbTaFile, setLbTaFile] = useState(null);
  const [lbMethod, setLbMethod] = useState("both");
  const [lbMlMode, setLbMlMode] = useState("3");
  const [lbQuantile, setLbQuantile] = useState("0.1");
  const [lbLoading, setLbLoading] = useState(false);
  const [lbResult, setLbResult] = useState(null);
  const [lbMessage, setLbMessage] = useState("");
  const [alarmSummary, setAlarmSummary] = useState(null);
  const [alarms, setAlarms] = useState([]);
  const [loadingSiteAnalytics, setLoadingSiteAnalytics] = useState(false);
  const [siteAnalyticsMessage, setSiteAnalyticsMessage] = useState("");
  const [map, setMap] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerMode, setDrawerMode] = useState("filter");
  const [analyticsDrawerOpen, setAnalyticsDrawerOpen] = useState(false);
  const [hoveredSite, setHoveredSite] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(11);
  const [showCells, setShowCells] = useState(false);
  const [showAlarms, setShowAlarms] = useState(false);
  const [showWorstSites, setShowWorstSites] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [showTechHandovers, setShowTechHandovers] = useState(false);
  const [showBandHandovers, setShowBandHandovers] = useState(false);
  const [showPciHandovers, setShowPciHandovers] = useState(false);
  const [showPciIssues, setShowPciIssues] = useState(false);
  const [showOvershooting, setShowOvershooting] = useState(false);
  const [showMissingNeighbours, setShowMissingNeighbours] = useState(false);
  const [siteMarkerScale, setSiteMarkerScale] = useState(1);
  const [cellRadiusScale, setCellRadiusScale] = useState(1);
  const [selectedTechnologyFilter, setSelectedTechnologyFilter] = useState("");
  const [selectedBandFilter, setSelectedBandFilter] = useState("");
  const [pciFilter, setPciFilter] = useState("");
  const [predictionMarkerCount, setPredictionMarkerCount] = useState(0);
  const [, setPredictionApproxCount] = useState(0);
  const [activeMapPanel, setActiveMapPanel] = useState("overview");
  const [selectedPci, setSelectedPci] = useState("");
  const [selectedPciSiteId, setSelectedPciSiteId] = useState("");
  const [pciLayerMode, setPciLayerMode] = useState("same-pci");
  const [exportingMapPdf, setExportingMapPdf] = useState(false);
  const selectedPciKeyRef = useRef("");

  // Refs for performance
  const cellPolygonsRef = useRef(new Map());
  const siteMarkersRef = useRef(new Map());
  const pciMarkersRef = useRef(new Map());
  const predictionMarkersRef = useRef(new Map());
  const predictionLinesRef = useRef(new Map());
  const alarmMarkersRef = useRef(new Map());
  const deckOverlayRef = useRef(null);
  const infoWindowRef = useRef(null);
  const zoomTimeoutRef = useRef(null);
  const miniTooltipRef = useRef(null); // ADDED: Track mini tooltip
  const sidebarContentRef = useRef(null);
  const handoverPolylinesRef = useRef(new Map());

  const containerStyle = {
    width: "100%",
    height: "100vh",
  };
  const useDeckRendering = true;

  const scrollSidebarContent = useCallback((direction) => {
    sidebarContentRef.current?.scrollBy({
      top: direction === "down" ? 360 : -360,
      behavior: "smooth",
    });
  }, []);

  const handleOpenFilter = useCallback(() => {
    setSidebarOpen((open) => !open);
    setDrawerMode("filter");
  }, []);

  const handleOpenAnalytics = useCallback(() => {
    setAnalyticsDrawerOpen((open) => {
      const next = !open;
      if (next) setActiveMapPanel("overview");
      return next;
    });
  }, []);

  const handleToggleWorstSites = useCallback(() => {
    setShowWorstSites((current) => {
      const next = !current;
      if (next) {
        setActiveMapPanel("worstCells");
      } else if (activeMapPanel === "worstCells") {
        setActiveMapPanel("predictions");
      }
      return next;
    });
  }, [activeMapPanel]);

  const clearDataFilters = useCallback(() => {
    setSelectedTechnologyFilter("");
    setSelectedBandFilter("");
    setPciFilter("");
  }, []);

  const handleSiteFileChange = useCallback((value) => {
    setSelectedSiteFileId(value);
    setSelectedSite(null);
    setSelectedCell(null);
    setSelectedPci("");
    setSelectedPciSiteId("");
    clearDataFilters();
  }, [clearDataFilters]);

  const handleKpiFileChange = useCallback((value) => {
    setSelectedFileId(value);
    setSelectedMetric("");
    setWorstCells([]);
    setWorstMessage("");
    setPredictions([]);
    setPredictionSummary(null);
    setLbResult(null);
    setLbMessage("");
    setAlarms([]);
    setAlarmSummary(null);
  }, []);

  useEffect(() => {
    if (activeMapPanel === "predictions") {
      setShowCells(false);
      setShowPredictions(true);
    }
  }, [activeMapPanel]);

  // Fetch map data
  useEffect(() => {
    let isCurrentRequest = true;
    const controller = new AbortController();
    let timeoutId = null;
    const fetchData = async () => {
      if (!selectedSiteFileId) {
        setMapData([]);
        setTotalSiteRows(0);
        setMissingCoordinateRows(0);
        setFetchError(siteUploads.length ? "Select a site upload file to plot map data." : "");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        timeoutId = window.setTimeout(() => controller.abort(), MAP_DATA_TIMEOUT_MS);
        const response = await getMapDetails(selectedSiteFileId, { signal: controller.signal });
        if (!isCurrentRequest) {
          return;
        }
        if (response.success && response.data) {
          const rows = Array.isArray(response.data) ? response.data : [];
          const normalizedRows = rows.map(normalizeSiteMapRow);
          const plottableRows = normalizedRows.filter((row) => row.lat !== null && row.lon !== null);

          setTotalSiteRows(rows.length);
          setMissingCoordinateRows(rows.length - plottableRows.length);
          setMapData(plottableRows);
          setFetchError("");
        } else {
          setFetchError(response.message || "Failed to fetch uploaded site data.");
          setMapData([]);
          setTotalSiteRows(0);
          setMissingCoordinateRows(0);
        }
      } catch (error) {
        if (!isCurrentRequest) {
          return;
        }
        console.error("Error fetching map data:", error);
        const message =
          error?.name === "AbortError"
            ? "Map data request timed out. Check backend/database, then refresh map data."
            : error?.message || "Failed to fetch uploaded site data.";
        setFetchError(message);
        setMapData([]);
        setTotalSiteRows(0);
        setMissingCoordinateRows(0);
      } finally {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
        if (isCurrentRequest) {
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => {
      isCurrentRequest = false;
      controller.abort();
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [selectedSiteFileId, siteUploads.length]);

  useEffect(() => {
    const loadUploads = async () => {
      const response = await fetchUploads();
      if (!response?.success) {
        setFetchError(response?.message || "Failed to load uploaded files. Please login again or restart backend.");
        setUploads([]);
        setSiteUploads([]);
        setSelectedFileId("");
        setSelectedSiteFileId("");
        setLoading(false);
        return;
      }
      const items = response?.success && Array.isArray(response.data) ? response.data : [];
      const kpiUploads = items.filter(isKpiUpload);
      const mapSiteUploads = items.filter(isSiteUpload);
      setUploads(kpiUploads);
      setSiteUploads(mapSiteUploads);
      const hasSelectedUpload = kpiUploads.some((upload) => String(upload.id) === String(selectedFileId));
      if ((!selectedFileId || !hasSelectedUpload) && kpiUploads[0]?.id) {
        setSelectedFileId(String(kpiUploads[0].id));
      } else if (!kpiUploads.length) {
        setSelectedFileId("");
      }
      const hasSelectedSiteUpload = mapSiteUploads.some((upload) => String(upload.id) === String(selectedSiteFileId));
      if ((!selectedSiteFileId || !hasSelectedSiteUpload) && mapSiteUploads[0]?.id) {
        setSelectedSiteFileId(String(mapSiteUploads[0].id));
      } else if (!mapSiteUploads.length) {
        setSelectedSiteFileId("");
      }
    };
    loadUploads();
  }, []);

  useEffect(() => {
    if (!selectedFileId) {
      setMetrics([]);
      setSelectedMetric("");
      setWorstCells([]);
      setWorstMessage("");
      setSiteSummary(null);
      setSiteDetails(null);
      setSiteAnalyticsMessage("");
      setPredictionSummary(null);
      setPredictions([]);
      setLbResult(null);
      setLbMessage("");
      setAlarmSummary(null);
      setAlarms([]);
      return;
    }

    const loadMetrics = async () => {
      setLoadingWorst(true);
      const response = await fetchDynamicMetrics(selectedFileId);
      const metricItems = (response?.success
        ? (Array.isArray(response.metrics) ? response.metrics : response.data?.metrics || [])
        : [])
        .filter((metric) => metricKey(metric));
      const selectedUpload = uploads.find((upload) => String(upload.id) === String(selectedFileId));
      const fallbackMetrics = isSampleSiteMapKpiUpload(selectedUpload) ? sampleSiteMapKpiMetrics : [];
      const nextMetrics = metricItems.length > 0 ? metricItems : fallbackMetrics;
      setMetrics(nextMetrics);
      setSelectedMetric(metricKey(nextMetrics[0]) || "");
      setLoadingWorst(false);
    };
    loadMetrics();
  }, [selectedFileId, uploads]);

  useEffect(() => {
    if (!selectedFileId) return;

    const loadSiteAnalytics = async () => {
      setLoadingSiteAnalytics(true);
      setSiteAnalyticsMessage("");
      const summaryResponse = await fetchSiteSummary(selectedFileId);

      if (summaryResponse?.success) {
        setSiteSummary(summaryResponse.data);
      } else {
        setSiteSummary(null);
        setSiteAnalyticsMessage(summaryResponse?.message || "Failed to load site analytics.");
      }

      setLoadingSiteAnalytics(false);
    };

    loadSiteAnalytics();
  }, [selectedFileId]);

  useEffect(() => {
    if (!selectedFileId) {
      setSiteIntelligence(null);
      return;
    }

    const loadSiteIntelligence = async () => {
      const response = await fetchSiteIntelligence(selectedFileId, selectedSiteFileId, 1000);
      if (response?.success) {
        setSiteIntelligence(response.data || null);
      } else {
        setSiteIntelligence(null);
      }
    };

    loadSiteIntelligence();
  }, [selectedFileId, selectedSiteFileId]);

  useEffect(() => {
    if (!selectedFileId) return;

    const loadPredictions = async () => {
      setPredictionSummary(null);
      setPredictions([]);
      const response = await fetchSitePredictionRecommendations({ fileId: selectedFileId, limit: 200 });
      const items = response?.success ? asArray(response.data?.data) : [];
      setPredictions(items);
      setPredictionSummary(summarizePredictions(items, selectedFileId));
    };

    loadPredictions();
  }, [selectedFileId]);

  const runLbPredictionOnMap = useCallback(async () => {
    if (!selectedFileId) return;
    setLbLoading(true);
    setLbMessage("");
    setLbResult(null);
    const selectedUpload = uploads.find((upload) => String(upload.id) === String(selectedFileId));

    const applySampleLbFallback = (message) => {
      const nextPredictions = buildSampleLbPredictions({
        fileId: selectedFileId,
        method: lbMethod,
        mlMode: lbMlMode,
        quantile: Number(lbQuantile || 0.1),
        limit: 60,
      });
      setLbResult(buildSampleLbResult(nextPredictions, lbMethod));
      setLbMessage(message || "Backend has no parsed KPI rows for this sample file, so sample LB/WCF results are shown.");
      setPredictions(nextPredictions);
      setPredictionSummary(summarizePredictions(nextPredictions, selectedFileId));
      setActiveMapPanel("predictions");
      setAnalyticsDrawerOpen(true);
      setShowPredictions(true);
      setShowCells(false);
    };

    try {
      const response = await runLbWcfPrediction({
        fileId: selectedFileId,
        taFile: lbTaFile,
        method: lbMethod,
        quantile: Number(lbQuantile || 0.1),
        mlMode: Number(lbMlMode || 3),
      });

      if (response?.success) {
        const rows = asArray(response.data?.records);
        const nextPredictions = lbRowsToMapPredictions(rows, selectedFileId);
        setLbResult(response.data);
        setLbMessage(
          nextPredictions.length > 0
            ? (response.message || "LB prediction completed on map.")
            : "LB prediction completed. No unbalanced/actionable cells found."
        );
        setPredictions(nextPredictions);
        setPredictionSummary(summarizePredictions(nextPredictions, selectedFileId));
        setActiveMapPanel("predictions");
        setAnalyticsDrawerOpen(true);
        setShowPredictions(true);
        setShowCells(false);
      } else if (isSampleSiteMapKpiUpload(selectedUpload)) {
        applySampleLbFallback("Using bundled sample KPI rows because backend has no parsed KPI records for this upload.");
      } else {
        const message = response?.message || "Failed to run LB prediction.";
        setLbResult(null);
        setLbMessage(
          String(message).toLowerCase().includes("no kpi records found")
            ? buildMissingKpiRowsMessage(selectedFileId, selectedUpload)
            : message
        );
        setPredictions([]);
        setPredictionSummary(summarizePredictions([], selectedFileId));
      }
    } catch (error) {
      if (isSampleSiteMapKpiUpload(selectedUpload)) {
        applySampleLbFallback("Using bundled sample KPI rows because backend LB/WCF was not available.");
      } else {
        const message = error?.message || "Failed to run LB prediction.";
        setLbResult(null);
        setLbMessage(
          String(message).toLowerCase().includes("no kpi records found")
            ? buildMissingKpiRowsMessage(selectedFileId, selectedUpload)
            : message
        );
        setPredictions([]);
        setPredictionSummary(summarizePredictions([], selectedFileId));
      }
    } finally {
      setLbLoading(false);
    }
  }, [lbMethod, lbMlMode, lbQuantile, lbTaFile, selectedFileId, uploads]);

  const lbPredictionControlProps = {
    selectedFileId,
    loading: lbLoading,
    method: lbMethod,
    mlMode: lbMlMode,
    quantile: lbQuantile,
    taFile: lbTaFile,
    message: lbMessage,
    result: lbResult,
    onRun: runLbPredictionOnMap,
    onMethodChange: setLbMethod,
    onMlModeChange: setLbMlMode,
    onQuantileChange: setLbQuantile,
    onTaFileChange: setLbTaFile,
    formatNumber,
  };

  useEffect(() => {
    if (!selectedFileId) return;

    const loadAlarms = async () => {
      const [summaryResponse, alarmsResponse] = await Promise.all([
        fetchKpiAlarmSummary(selectedFileId),
        fetchKpiAlarms({ fileId: selectedFileId, status: "OPEN", page: 1, limit: 300 }),
      ]);
      setAlarmSummary(summaryResponse?.success ? summaryResponse.data : null);
      setAlarms(alarmsResponse?.success ? asArray(alarmsResponse.data?.items) : []);
    };

    loadAlarms();
  }, [selectedFileId]);

  useEffect(() => {
    if (!selectedFileId || !selectedMetric) {
      setWorstCells([]);
      return;
    }

    const loadWorstCells = async () => {
      setLoadingWorst(true);
      setWorstMessage("");
      const selectedUpload = uploads.find((upload) => String(upload.id) === String(selectedFileId));
      try {
        const response = await fetchWorstCells({
          fileId: selectedFileId,
          metric: selectedMetric,
          limit: 25,
        });
        const backendRows = response?.success ? asArray(response.data?.data) : [];
        if (backendRows.length > 0) {
          setWorstCells(backendRows);
        } else if (isSampleSiteMapKpiUpload(selectedUpload)) {
          setWorstCells(buildSampleWorstCells(selectedMetric, 25));
          setWorstMessage("Using bundled sample KPI rows for this site map file.");
        } else {
          setWorstCells([]);
          setWorstMessage(response?.message || "No worst cells found. Upload the file as KPI data, then select a KPI metric.");
        }
      } catch (error) {
        if (isSampleSiteMapKpiUpload(selectedUpload)) {
          setWorstCells(buildSampleWorstCells(selectedMetric, 25));
          setWorstMessage("Using bundled sample KPI rows because backend KPI rows were not available.");
        } else {
          setWorstCells([]);
          setWorstMessage(error?.message || "Failed to load worst cells for this file.");
        }
      } finally {
        setLoadingWorst(false);
      }
    };
    loadWorstCells();
  }, [selectedFileId, selectedMetric, uploads]);

  // Memoize grouped sites
  const groupedSites = useMemo(() => {
    return mapData.reduce((acc, item) => {
      if (!acc[item.SITEID]) {
        acc[item.SITEID] = {
          ...item,
          cells: [item],
        };
      } else {
        acc[item.SITEID].cells.push(item);
      }
      return acc;
    }, {});
  }, [mapData]);

  const uniqueSites = useMemo(() => Object.values(groupedSites), [groupedSites]);
  const siteAnalyticsRows = asArray(siteSummary?.data);
  const siteIntelligenceRows = asArray(siteIntelligence?.data);

  const siteAnalyticsByName = useMemo(() => {
    const lookup = new Map();
    siteAnalyticsRows.forEach((site) => {
      const key = normalizeKey(site.site);
      if (key) lookup.set(key, site);
    });
    return lookup;
  }, [siteAnalyticsRows]);

  const siteIntelligenceByName = useMemo(() => {
    const lookup = new Map();
    siteIntelligenceRows.forEach((item) => {
      [
        item?.site,
        item?.siteId,
        item?.siteName,
        item?.SITEID,
      ].map(normalizeKey).filter(Boolean).forEach((key) => lookup.set(key, item));
    });
    return lookup;
  }, [siteIntelligenceRows]);

  const resolveMapSite = useCallback((value) => {
    const key = normalizeKey(value);
    if (!key) return null;
    return uniqueSites.find((site) =>
      normalizeKey(site.SITEID) === key ||
      normalizeKey(site.Site_Name) === key
    ) || null;
  }, [uniqueSites]);

  const primarySiteIntelligence = siteIntelligenceRows[0] || null;

  const selectedSiteIntelligence = useMemo(() => {
    if (!selectedSite) return null;
    return (
      siteIntelligenceByName.get(normalizeKey(selectedSite.SITEID)) ||
      siteIntelligenceByName.get(normalizeKey(selectedSite.Site_Name)) ||
      siteIntelligenceByName.get(normalizeKey(selectedSite.site)) ||
      null
    );
  }, [selectedSite, siteIntelligenceByName]);

  const focusSiteIntelligence = selectedSiteIntelligence || (activeMapPanel === "clusters" || activeMapPanel === "handover" ? primarySiteIntelligence : null);

  const focusMapSite = useMemo(() => {
    if (selectedSite) return selectedSite;
    if (!focusSiteIntelligence) return null;
    return resolveMapSite(
      focusSiteIntelligence.site ||
      focusSiteIntelligence.siteName ||
      focusSiteIntelligence.siteId
    );
  }, [selectedSite, focusSiteIntelligence, resolveMapSite]);

  const filteredSites = useMemo(() => {
    const technologyKey = normalizeKey(selectedTechnologyFilter);
    const bandKey = normalizeKey(selectedBandFilter);
    const pciKey = normalizePci(pciFilter);

    if (!technologyKey && !bandKey && !pciKey) return uniqueSites;

    return uniqueSites
      .map((site) => {
        const matchingCells = site.cells.filter((cell) => {
          const matchesTechnology = !technologyKey || normalizeKey(getCellTechnologyLabel(cell)) === technologyKey;
          const matchesBand = !bandKey || normalizeKey(getCellBandLabel(cell)) === bandKey;
          const matchesPci = !pciKey || normalizePci(cell.PCI) === pciKey;
          return matchesTechnology && matchesBand && matchesPci;
        });
        return matchingCells.length > 0 ? { ...site, cells: matchingCells } : null;
      })
      .filter(Boolean);
  }, [uniqueSites, selectedTechnologyFilter, selectedBandFilter, pciFilter]);

  const filteredCellCount = useMemo(
    () => filteredSites.reduce((total, site) => total + site.cells.length, 0),
    [filteredSites],
  );

  const handoverRelationItems = useMemo(() => {
    const backendRelations = siteIntelligenceRows.flatMap((row) =>
      asArray(row?.mapOverlay?.handoverRelations).map((relation) => ({
        ...relation,
        __sourceRow: row,
      }))
    );
    if (backendRelations.length > 0) {
      const relations = backendRelations
        .map((item, index) => {
          const sourceSite = resolveMapSite(item.sourceSite?.siteId || item.sourceSite?.siteName || item.sourceSite?.site) ||
            resolveMapSite(item.__sourceRow?.siteId || item.__sourceRow?.siteName || item.__sourceRow?.site) ||
            focusMapSite || item.sourceSite || null;
          const targetSite = resolveMapSite(item.targetSite?.siteId || item.targetSite?.siteName || item.targetSite?.site) || item.targetSite || null;
          if (!sourceSite || !targetSite) {
            return null;
          }

          const sourceLat = Number(sourceSite.lat ?? sourceSite.latitude);
          const sourceLon = Number(sourceSite.lon ?? sourceSite.longitude);
          const targetLat = Number(targetSite.lat ?? targetSite.latitude);
          const targetLon = Number(targetSite.lon ?? targetSite.longitude);
          if (!Number.isFinite(sourceLat) || !Number.isFinite(sourceLon) || !Number.isFinite(targetLat) || !Number.isFinite(targetLon)) {
            return null;
          }

          return {
            ...item,
            sourceSite,
            targetSite,
            sourcePosition: [sourceLon, sourceLat],
            targetPosition: [targetLon, targetLat],
            distanceKm: Number(item.distanceKm || 0),
            samePci: Boolean(item.samePci),
            facing: Boolean(item.facing),
            sameCluster: Boolean(item.sameCluster),
            pciOverlap: Number(item.pciOverlap || 0),
            relationType: String(item.relationType || "NEARBY"),
            relationScore: Number(item.relationScore || 0),
            color: item.color || handoverRelationColors.NEARBY,
            width: Number(item.width || 2),
            handoverCategories: [
              item.samePci ? "PCI" : null,
              normalizeKey(sourceSite.band || sourceSite.Band) !== normalizeKey(targetSite.band || targetSite.Band) ? "BAND" : null,
              normalizeKey(sourceSite.technology || sourceSite.Technology) !== normalizeKey(targetSite.technology || targetSite.Technology) ? "TECHNOLOGY" : null,
              normalizeKey(sourceSite.operator || sourceSite.Operator || sourceSite.carrier) &&
              normalizeKey(targetSite.operator || targetSite.Operator || targetSite.carrier) &&
              normalizeKey(sourceSite.operator || sourceSite.Operator || sourceSite.carrier) !== normalizeKey(targetSite.operator || targetSite.Operator || targetSite.carrier) ? "OPERATOR" : null,
            ].filter(Boolean),
            __backendIndex: index,
          };
        })
        .filter(Boolean);

      // The backend returns the same neighbor pair from both directions.
      // Keep one line per pair so the map remains readable.
      const uniqueRelations = new Map();
      relations.forEach((relation) => {
        const endpoints = [
          normalizeKey(relation.sourceSite?.SITEID),
          normalizeKey(relation.targetSite?.SITEID),
        ].sort();
        const key = `${endpoints[0]}::${endpoints[1]}`;
        const existing = uniqueRelations.get(key);
        if (!existing || relation.relationScore > existing.relationScore) {
          uniqueRelations.set(key, relation);
        }
      });

      return [...uniqueRelations.values()]
        .map((relation) => ({
          ...relation,
          handoverCategory: relation.handoverCategories?.[0] || "NEIGHBOR",
          categoryColor: handoverCategoryColors[relation.handoverCategories?.[0] || "NEIGHBOR"],
        }))
        .sort((left, right) => right.relationScore - left.relationScore)
        .slice(0, 30);
    }

    const sourceSites = focusMapSite ? [focusMapSite] : filteredSites;
    return sourceSites.flatMap((sourceSite) => {
      if (!Number.isFinite(Number(sourceSite.lat)) || !Number.isFinite(Number(sourceSite.lon))) return [];

      const sourcePcis = new Set(asArray(sourceSite.cells).map((cell) => normalizePci(cell.PCI)).filter(Boolean));
      const sourceCluster = normalizeKey(sourceSite.cluster || sourceSite.Cluster);

      return filteredSites
      .filter((candidate) => normalizeKey(candidate.SITEID) !== normalizeKey(sourceSite.SITEID))
      .map((candidate) => {
        if (!Number.isFinite(Number(candidate.lat)) || !Number.isFinite(Number(candidate.lon))) {
          return null;
        }
        if (!isInferredNeighbourSite(sourceSite, candidate)) {
          return null;
        }

        const distance = distanceKm(sourceSite, candidate);
        const candidatePcis = new Set(asArray(candidate.cells).map((cell) => normalizePci(cell.PCI)).filter(Boolean));
        const pciOverlap = [...sourcePcis].filter((pci) => candidatePcis.has(pci)).length;
        const samePci = pciOverlap > 0;
        const facing = siteFacesCandidate(sourceSite, candidate) || siteFacesCandidate(candidate, sourceSite);
        const sameCluster = Boolean(sourceCluster) && sourceCluster === normalizeKey(candidate.cluster || candidate.Cluster);
        const relationType = samePci
          ? "SAME_PCI"
          : facing
            ? "HANDOVER_FACE"
            : sameCluster
              ? "SAME_CLUSTER"
              : "NEARBY";
        const relationScore = Math.max(
          10,
          Math.round(
            (samePci ? 38 : 0) +
            (facing ? 24 : 0) +
            (sameCluster ? 10 : 0) +
            (distance == null ? 0 : Math.max(0, 40 - distance * 4))
          )
        );

        return {
          sourceSite,
          targetSite: candidate,
          sourcePosition: [Number(sourceSite.lon), Number(sourceSite.lat)],
          targetPosition: [Number(candidate.lon), Number(candidate.lat)],
          distanceKm: distance,
          samePci,
          facing,
          sameCluster,
          pciOverlap,
          relationType,
          relationScore,
          color: handoverRelationColors[relationType] || handoverRelationColors.NEARBY,
          width: relationType === "SAME_PCI" ? 4 : relationType === "HANDOVER_FACE" ? 3 : 2,
          handoverCategories: [
            samePci ? "PCI" : null,
            normalizeKey(sourceSite.Band || sourceSite.band) !== normalizeKey(candidate.Band || candidate.band) ? "BAND" : null,
            normalizeKey(sourceSite.Technology || sourceSite.technology) !== normalizeKey(candidate.Technology || candidate.technology) ? "TECHNOLOGY" : null,
          ].filter(Boolean),
        };
      })
      .filter(Boolean)
      .sort((left, right) => right.relationScore - left.relationScore);
    })
      .map((relation) => ({
        ...relation,
        handoverCategory: relation.handoverCategories?.[0] || "NEIGHBOR",
        categoryColor: handoverCategoryColors[relation.handoverCategories?.[0] || "NEIGHBOR"],
      }))
      .slice(0, 30);
  }, [filteredSites, focusMapSite, focusSiteIntelligence, resolveMapSite]);

  const handoverRelationMap = useMemo(() => {
    const lookup = new Map();
    handoverRelationItems.forEach((item) => {
      const key = normalizeKey(item.targetSite?.SITEID);
      if (key && !lookup.has(key)) {
        lookup.set(key, item);
      }
    });
    return lookup;
  }, [handoverRelationItems]);

  const handoverRelationCounts = useMemo(() => {
    return handoverRelationItems.reduce(
      (acc, item) => {
        acc.total += 1;
        acc.samePci += item.samePci ? 1 : 0;
        acc.facing += item.facing ? 1 : 0;
        acc.sameCluster += item.sameCluster ? 1 : 0;
        acc.nearby += item.relationType === "NEARBY" ? 1 : 0;
        return acc;
      },
      { total: 0, samePci: 0, facing: 0, sameCluster: 0, nearby: 0 },
    );
  }, [handoverRelationItems]);

  const handoverCategoryCounts = useMemo(() => {
    const counts = { PCI: 0, BAND: 0, TECHNOLOGY: 0, OPERATOR: 0, NEIGHBOR: 0 };
    handoverRelationItems.forEach((item) => {
      const categories = item.handoverCategories?.length ? item.handoverCategories : ["NEIGHBOR"];
      categories.forEach((category) => {
        counts[category] = (counts[category] || 0) + 1;
      });
    });
    return counts;
  }, [handoverRelationItems]);

  const handoverOverlayEnabled = showTechHandovers || showBandHandovers || showPciHandovers;

  const visibleHandoverRelationItems = useMemo(() => {
    const enabledCategories = new Set();
    if (showTechHandovers) enabledCategories.add("TECHNOLOGY");
    if (showBandHandovers) enabledCategories.add("BAND");
    if (showPciHandovers) enabledCategories.add("PCI");
    return handoverRelationItems
      .filter((item) => (item.handoverCategories || []).some((category) => enabledCategories.has(category)))
      .map((item) => {
        const activeCategory = ["PCI", "BAND", "TECHNOLOGY"]
          .find((category) => enabledCategories.has(category) && item.handoverCategories?.includes(category)) || "NEIGHBOR";
        return {
          ...item,
          handoverCategory: activeCategory,
          categoryColor: handoverCategoryColors[activeCategory],
        };
      });
  }, [handoverRelationItems, showBandHandovers, showPciHandovers, showTechHandovers]);

  const handoverFocusTechnology = normalizeKey(focusMapSite?.technology || focusSiteIntelligence?.technology || "");
  const handoverFocusBand = normalizeKey(focusMapSite?.band || focusSiteIntelligence?.band || "");
  const handoverTechnologyCount = useMemo(() => {
    if (!handoverRelationItems.length) return 0;
    return handoverRelationItems.filter((item) => normalizeKey(item.targetSite?.technology || item.targetSite?.Tech || "") !== handoverFocusTechnology).length;
  }, [handoverFocusTechnology, handoverRelationItems]);
  const handoverBandCount = useMemo(() => {
    if (!handoverRelationItems.length) return 0;
    return handoverRelationItems.filter((item) => normalizeKey(item.targetSite?.band || item.targetSite?.Band || "") !== handoverFocusBand).length;
  }, [handoverFocusBand, handoverRelationItems]);

  const siteIntelligenceOverlayRows = useMemo(() => {
    return siteIntelligenceRows.flatMap((item) =>
      asArray(item?.mapOverlay?.issueMarkers).map((marker) => ({
        ...marker,
        __resolvedSite: resolveMapSite(marker.siteId || marker.siteName || marker.site),
        __impactScore: Number(item.impactScore || 0),
        __sourceRow: item,
      }))
    );
  }, [resolveMapSite, siteIntelligenceRows]);

  const siteIntelligenceMapItems = useMemo(() => {
    if (siteIntelligenceOverlayRows.length > 0) {
      return siteIntelligenceOverlayRows
        .map((item, index) => {
          const lat = Number(item.latitude ?? item.lat);
          const lon = Number(item.longitude ?? item.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            return null;
          }

          const spread = 0.0015 + Math.min(0.004, Number(item.issueScore || 0) / 5000);
          const angle = index * 1.35;
          return {
            ...item,
            __lat: lat + Math.sin(angle) * spread,
            __lon: lon + Math.cos(angle) * spread,
            __siteKey: normalizeKey(item.site || item.siteName || item.siteId),
            __impactScore: Number(item.__impactScore || item.impactScore || 0),
            __issueKey: item.issueKey || "IMPACT",
            __issueLabel: item.issueLabel || "Impact",
            __issueShortLabel: item.issueShortLabel || "IMP",
            __issueScore: Number(item.issueScore || 0),
            __issueColor: item.color || "#6366F1",
          };
        })
        .filter(Boolean)
        .slice(0, 240);
    }

    const issueDefinitions = [
      { key: "PCI_COLLISION", label: "PCI Collision", shortLabel: "PCI", scoreKey: "pciCollisionScore", color: "#EF4444" },
      { key: "PCI_CONFUSION", label: "PCI Confusion", shortLabel: "PCI", scoreKey: "pciConfusionScore", color: "#F97316" },
      { key: "OVERSHOOTING", label: "Overshooting", shortLabel: "OVR", scoreKey: "overshootingScore", color: "#A855F7" },
      { key: "HANDOVER", label: "Handover", shortLabel: "HO", scoreKey: "handoverRisk", color: "#06B6D4" },
      { key: "MISSING_NEIGHBOR", label: "Missing Neighbour", shortLabel: "NEI", scoreKey: "missingNeighborScore", color: "#10B981" },
    ];

    return siteIntelligenceRows.flatMap((item) => {
      const lat = Number(item.latitude ?? item.lat);
      const lon = Number(item.longitude ?? item.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return [];
      }

      const resolvedSite = resolveMapSite(item.site || item.siteName || item.siteId);
      const baseImpact = Number(item.impactScore || 0);
      const activeIssues = issueDefinitions
        .map((issue) => ({
          ...issue,
          score: Number(item[issue.scoreKey] || 0),
        }))
        .filter((issue) => issue.score >= 35 || (issue.key === "HANDOVER" && issue.score >= 25));

      const markers = activeIssues.length > 0
        ? activeIssues
        : (baseImpact >= 60
          ? [{
              key: "IMPACT",
              label: "Impact",
              shortLabel: "IMP",
              score: baseImpact,
              color: "#6366F1",
            }]
          : []);

      return markers.map((issue, issueIndex) => {
        const spread = 0.0015 + Math.min(0.004, Number(issue.score || 0) / 5000);
        const angle = issueIndex * 1.35;
        return {
          ...item,
          __lat: lat + Math.sin(angle) * spread,
          __lon: lon + Math.cos(angle) * spread,
          __siteKey: normalizeKey(item.site || item.siteName || item.siteId),
          __resolvedSite: resolvedSite,
          __impactScore: baseImpact,
          __issueKey: issue.key,
          __issueLabel: issue.label,
          __issueShortLabel: issue.shortLabel,
          __issueScore: issue.score,
          __issueColor: issue.color,
        };
      });
    })
      .sort((left, right) => (right.__issueScore || 0) - (left.__issueScore || 0))
      .slice(0, 240);
  }, [resolveMapSite, siteIntelligenceOverlayRows, siteIntelligenceRows]);

  const intelligenceIssueCounts = useMemo(() => {
    return siteIntelligenceMapItems.reduce(
      (acc, item) => {
        const key = item.__issueKey || "IMPACT";
        acc.total += 1;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { total: 0, PCI_COLLISION: 0, PCI_CONFUSION: 0, OVERSHOOTING: 0, HANDOVER: 0, MISSING_NEIGHBOR: 0, IMPACT: 0 },
    );
  }, [siteIntelligenceMapItems]);

  const visibleSiteIntelligenceMapItems = useMemo(() => {
    const enabledIssues = new Set();
    if (showPciIssues) {
      enabledIssues.add("PCI_COLLISION");
      enabledIssues.add("PCI_CONFUSION");
    }
    if (showOvershooting) enabledIssues.add("OVERSHOOTING");
    if (showMissingNeighbours) enabledIssues.add("MISSING_NEIGHBOR");

    return siteIntelligenceMapItems.filter((item) => enabledIssues.has(item.__issueKey));
  }, [handoverOverlayEnabled, showMissingNeighbours, showOvershooting, showPciIssues, siteIntelligenceMapItems]);

  const visibleIntelligenceIssueCounts = useMemo(() => {
    return visibleSiteIntelligenceMapItems.reduce(
      (acc, item) => {
        const key = item.__issueKey || "IMPACT";
        acc.total += 1;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { total: 0, PCI_COLLISION: 0, PCI_CONFUSION: 0, OVERSHOOTING: 0, HANDOVER: 0, MISSING_NEIGHBOR: 0, IMPACT: 0 },
    );
  }, [visibleSiteIntelligenceMapItems]);

  const siteIntelligenceTimestampLabel = useMemo(() => {
    const raw =
      primarySiteIntelligence?.latestObservedAt ||
      primarySiteIntelligence?.observedAt ||
      primarySiteIntelligence?.timestamp ||
      primarySiteIntelligence?.updatedAt ||
      "";

    if (!raw) return "Latest snapshot unavailable";

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return String(raw);

    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsed);
  }, [primarySiteIntelligence]);

  const clusterSummaryRows = useMemo(() => {
    const rows = asArray(siteIntelligence?.clusterSummary?.data);
    return rows.length > 0 ? rows : [];
  }, [siteIntelligence]);

  const siteAnalyticsTotals = useMemo(() => {
    return siteAnalyticsRows.reduce(
      (acc, site) => {
        acc.cells += Number(site.totalCells || 0);
        acc.sectors += Number(site.totalSectors || 0);
        asArray(site.bands).forEach((band) => acc.bands.add(band));
        asArray(site.technologies).forEach((tech) => acc.technologies.add(tech));
        return acc;
      },
      { cells: 0, sectors: 0, bands: new Set(), technologies: new Set() },
    );
  }, [siteAnalyticsRows]);

  const worstSites = useMemo(() => rankWorstSites(siteAnalyticsRows), [siteAnalyticsRows]);
  const statusCounts = siteSummary?.statusCounts || {};

  const worstSiteLookup = useMemo(() => {
    const lookup = new Map();
    worstSites.forEach((site) => {
      [
        site.site,
        site.siteName,
        site.siteId,
        site.SITEID,
        site.cellName,
        site.cell,
        baseCellKey(site.cellName),
        baseCellKey(site.cell),
      ].map(normalizeKey).filter(Boolean).forEach((key) => lookup.set(key, site));
    });
    return lookup;
  }, [worstSites]);

  const displayPredictions = useMemo(() => {
    const apiPredictions = asArray(predictions);
    if (apiPredictions.length > 0) return apiPredictions;
    if (!showWorstSites) return [];
    const selectedMetricLabel = metrics
      .map((metric) => ({ value: metricKey(metric), label: metricLabel(metric) }))
      .find((option) => option.value === selectedMetric)?.label || DEFAULT_WORST_CELL_METRIC_LABEL;
    return fallbackPredictionsFromWorstCells(worstCells, selectedMetricLabel);
  }, [predictions, showWorstSites, worstCells, metrics, selectedMetric]);

  const kpiMetricOptions = useMemo(
    () => metrics.map((metric) => ({ value: metricKey(metric), label: metricLabel(metric) })).filter((metric) => metric.value),
    [metrics],
  );
  const selectedWorstMetricLabel = useMemo(
    () => kpiMetricOptions.find((option) => option.value === selectedMetric)?.label || DEFAULT_WORST_CELL_METRIC_LABEL,
    [kpiMetricOptions, selectedMetric],
  );

  const activePredictionSummary = useMemo(
    () => summarizePredictions(displayPredictions, selectedFileId),
    [displayPredictions, selectedFileId],
  );
  const balancedDisplayPredictions = useMemo(
    () => balancePredictionDisplay(displayPredictions),
    [displayPredictions],
  );
  const predictionBySite = useMemo(() => {
    const lookup = new Map();
    asArray(displayPredictions).forEach((item) => {
      const keys = [
        item.site,
        item.siteName,
        item.siteInfo?.siteId,
        item.siteInfo?.siteName,
        item.cellName,
        item.cell,
        baseCellKey(item.cellName),
        baseCellKey(item.cell),
      ].map(normalizeKey).filter(Boolean);
      keys.forEach((key) => {
        if (!lookup.has(key)) lookup.set(key, []);
        lookup.get(key).push(item);
      });
    });
    return lookup;
  }, [displayPredictions]);

  const alarmsBySite = useMemo(() => {
    const lookup = new Map();
    asArray(alarms).forEach((alarm) => {
      const keys = [alarm.site, alarm.siteName, alarm.cellName].map(normalizeKey).filter(Boolean);
      keys.forEach((key) => {
        if (!lookup.has(key)) lookup.set(key, []);
        lookup.get(key).push(alarm);
      });
    });
    return lookup;
  }, [alarms]);

  const worstCellLookup = useMemo(() => {
    const lookup = new Map();
    worstCells.forEach((row) => {
      const name = row?.cellName || row?.cell || row?.shortName || row?.name;
      const key = normalizeKey(name);
      if (key) lookup.set(key, row);
    });
    return lookup;
  }, [worstCells]);

  const siteWorstLookup = useMemo(() => {
    const lookup = new Map();
    worstCells.forEach((row) => {
      const site = normalizeKey(row?.site);
      if (!site) return;
      const existing = lookup.get(site);
      if (!existing || Number(row?.rank || 9999) < Number(existing?.rank || 9999)) {
        lookup.set(site, row);
      }
    });
    return lookup;
  }, [worstCells]);

  const filterOptions = useMemo(() => {
    const technologies = new Set();
    const bands = new Set();
    const pcis = new Set();

    uniqueSites.forEach((site) => {
      site.cells.forEach((cell) => {
        const technology = getCellTechnologyLabel(cell);
        const band = getCellBandLabel(cell);
        const pci = normalizePci(cell.PCI);
        if (technology && technology !== "Unknown") technologies.add(technology);
        if (band && band !== "Unknown band") bands.add(band);
        if (pci) pcis.add(pci);
      });
    });

    return {
      technologies: [...technologies].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      bands: [...bands].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      pcis: [...pcis].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    };
  }, [uniqueSites]);

  useEffect(() => {
    if (selectedSite && !filteredSites.some((site) => normalizeKey(site.SITEID) === normalizeKey(selectedSite.SITEID))) {
      setSelectedSite(null);
      setSelectedCell(null);
    }
    if (
      selectedCell &&
      !filteredSites.some((site) => site.cells.some((cell) => normalizeKey(cell.Cell_Name) === normalizeKey(selectedCell.Cell_Name)))
    ) {
      setSelectedCell(null);
    }
  }, [filteredSites, selectedSite, selectedCell]);

  const selectedPciCount = useMemo(() => {
    if (!selectedPci) return 0;
    return filteredSites.reduce(
      (total, site) =>
        total + site.cells.filter((cell) => normalizePci(cell.PCI) === normalizePci(selectedPci)).length,
      0,
    );
  }, [filteredSites, selectedPci]);

  const selectedPciSites = useMemo(() => {
    if (!selectedPci) return [];
    return filteredSites
      .map((site) => ({
        ...site,
        matchingPciCells: site.cells.filter((cell) => normalizePci(cell.PCI) === normalizePci(selectedPci)),
      }))
      .filter((site) => site.matchingPciCells.length > 0);
  }, [filteredSites, selectedPci]);

  const sourcePciSite = useMemo(() => {
    if (!selectedPciSiteId) return null;
    return selectedPciSites.find((site) => normalizeKey(site.SITEID) === normalizeKey(selectedPciSiteId)) || null;
  }, [selectedPciSites, selectedPciSiteId]);

  const samePciSites = useMemo(() => {
    if (!sourcePciSite) return [];
    return selectedPciSites
      .filter((site) => normalizeKey(site.SITEID) !== normalizeKey(sourcePciSite.SITEID))
      .map((site) => ({
        ...site,
        distanceKm: distanceKm(sourcePciSite, site),
        inferredNeighbour: isInferredNeighbourSite(sourcePciSite, site),
      }))
      .sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY));
  }, [selectedPciSites, sourcePciSite]);

  const inferredSamePciSites = useMemo(
    () => samePciSites.filter((site) => site.inferredNeighbour),
    [samePciSites],
  );

  const inferredSamePciCellCount = useMemo(
    () => inferredSamePciSites.reduce((total, site) => total + asArray(site.matchingPciCells).length, 0),
    [inferredSamePciSites],
  );

  const pciCollisionSummary = useMemo(() => {
    if (!selectedPci || !sourcePciSite) {
      return { status: "No PCI selected", severity: "normal" };
    }
    if (inferredSamePciSites.length > 0) {
      return {
        status: "Potential collision",
        severity: "risk",
        detail: `${inferredSamePciSites.length} inferred neighbour site(s), ${inferredSamePciCellCount} cell(s), reuse PCI ${selectedPci}.`,
      };
    }
    if (samePciSites.length > 0) {
      return {
        status: "Reuse found, no inferred overlap",
        severity: "watch",
        detail: "Same PCI exists in the database, but not inside the inferred neighbour window.",
      };
    }
    return { status: "No reuse found", severity: "normal", detail: "No other visible site uses this PCI." };
  }, [inferredSamePciCellCount, inferredSamePciSites.length, samePciSites.length, selectedPci, sourcePciSite]);

  const pciConfusionSummary = useMemo(() => {
    if (!selectedPci || !sourcePciSite) {
      return { status: "No PCI selected", severity: "normal" };
    }
    if (inferredSamePciCellCount >= 2) {
      return {
        status: "Potential confusion",
        severity: "risk",
        detail: `Source can infer ${inferredSamePciCellCount} neighbour cells with the same PCI.`,
      };
    }
    if (inferredSamePciCellCount === 1) {
      return {
        status: "Single same-PCI inferred neighbour",
        severity: "watch",
        detail: "Collision risk exists, but confusion needs two or more same-PCI neighbour cells.",
      };
    }
    return { status: "No confusion inferred", severity: "normal", detail: "No same-PCI inferred neighbours for this source." };
  }, [inferredSamePciCellCount, selectedPci, sourcePciSite]);

  const pciVisibleSites = useMemo(() => {
    if (!selectedPci) return [];
    if (pciLayerMode === "same-pci") return samePciSites;
    if (pciLayerMode === "neighbours") return inferredSamePciSites;
    if (pciLayerMode === "collision") return inferredSamePciCellCount > 0 ? inferredSamePciSites : [];
    if (pciLayerMode === "confusion") return inferredSamePciCellCount >= 2 ? inferredSamePciSites : [];
    if (pciLayerMode === "both") return inferredSamePciCellCount > 0 ? inferredSamePciSites : [];
    return samePciSites;
  }, [inferredSamePciCellCount, inferredSamePciSites, pciLayerMode, samePciSites, selectedPci]);

  const pciVisibleSiteIds = useMemo(() => {
    return new Set(pciVisibleSites.map((site) => normalizeKey(site.SITEID)));
  }, [pciVisibleSites]);

  const mapVisibleSiteIds = useMemo(() => {
    if (!selectedPci) return null;
    const ids = new Set(pciVisibleSites.map((site) => normalizeKey(site.SITEID)));
    if (sourcePciSite?.SITEID) {
      ids.add(normalizeKey(sourcePciSite.SITEID));
    }
    return ids;
  }, [pciVisibleSites, selectedPci, sourcePciSite]);

  const pciLayerTitle = useMemo(() => {
    if (pciLayerMode === "same-pci") return "Source / All Same-PCI Sites";
    if (pciLayerMode === "neighbours") return "Source / Same-PCI Neighbours";
    if (pciLayerMode === "collision") return "PCI Collision View";
    if (pciLayerMode === "confusion") return "PCI Confusion View";
    if (pciLayerMode === "both") return "PCI Collision + Confusion";
    return "Source / Same-PCI Sites";
  }, [pciLayerMode]);

  const pciLayerSubtitle = useMemo(() => {
    if (pciLayerMode === "same-pci") return `${pciVisibleSites.length} shown from ${samePciSites.length} other same-PCI site(s)`;
    if (pciLayerMode === "neighbours") return `${pciVisibleSites.length} inferred same-PCI neighbour site(s)`;
    if (pciLayerMode === "collision") return `${pciVisibleSites.length} site(s) shown for potential collision`;
    if (pciLayerMode === "confusion") return `${pciVisibleSites.length} site(s) shown for potential confusion`;
    if (pciLayerMode === "both") return `${pciVisibleSites.length} risk site(s) shown`;
    return `${pciVisibleSites.length} site(s) shown`;
  }, [pciLayerMode, pciVisibleSites.length, samePciSites.length]);

  const pciLayerModeOptions = useMemo(() => {
    const collisionCount = inferredSamePciCellCount > 0 ? inferredSamePciSites.length : 0;
    const confusionCount = inferredSamePciCellCount >= 2 ? inferredSamePciSites.length : 0;
    return pciLayerModes.map((mode) => {
      const count =
        mode.value === "same-pci"
          ? samePciSites.length
          : mode.value === "neighbours"
            ? inferredSamePciSites.length
            : mode.value === "collision"
              ? collisionCount
              : mode.value === "confusion"
                ? confusionCount
                : Math.max(collisionCount, confusionCount);
      return {
        ...mode,
        count,
        disabled: mode.value !== "same-pci" && count === 0,
      };
    });
  }, [inferredSamePciCellCount, inferredSamePciSites.length, samePciSites.length]);

  useEffect(() => {
    const key = `${selectedPci}|${selectedPciSiteId}`;
    if (selectedPciKeyRef.current !== key) {
      selectedPciKeyRef.current = key;
      setPciLayerMode("same-pci");
    }
  }, [selectedPci, selectedPciSiteId]);

  useEffect(() => {
    const activeMode = pciLayerModeOptions.find((mode) => mode.value === pciLayerMode);
    if (activeMode?.disabled) {
      setPciLayerMode("same-pci");
    }
  }, [pciLayerMode, pciLayerModeOptions]);

  const pciSummaryCards = useMemo(() => {
    if (pciLayerMode === "collision") {
      return [{ key: "collision", title: "PCI Collision", summary: pciCollisionSummary }];
    }
    if (pciLayerMode === "confusion") {
      return [{ key: "confusion", title: "PCI Confusion", summary: pciConfusionSummary }];
    }
    if (pciLayerMode === "both") {
      return [
        { key: "collision", title: "PCI Collision", summary: pciCollisionSummary },
        { key: "confusion", title: "PCI Confusion", summary: pciConfusionSummary },
      ];
    }
    return [];
  }, [pciCollisionSummary, pciConfusionSummary, pciLayerMode]);

  const sourcePciLabel = useMemo(() => {
    if (!sourcePciSite) return "";
    const sourceCell = sourcePciSite.matchingPciCells?.find(
      (cell) => selectedCell?.Cell_Name && normalizeKey(cell.Cell_Name) === normalizeKey(selectedCell.Cell_Name),
    );
    return sourceCell?.Cell_Name || sourcePciSite.Site_Name || sourcePciSite.SITEID || "";
  }, [sourcePciSite, selectedCell]);

  const deckCells = useMemo(() => {
    if (!showCells) return [];
    return filteredSites.flatMap((site) =>
      asArray(site.cells).map((cell) => ({
        ...cell,
        __site: site,
      }))
    );
  }, [filteredSites, showCells]);

  const worstCellMapItems = useMemo(() => {
    if (!showWorstSites || selectedPci) return [];

    const isMatch = (left, right) => (
      left === right ||
      (left.length >= 5 && right.includes(left)) ||
      (right.length >= 5 && left.includes(right))
    );

    return asArray(worstCells)
      .map((row, index) => {
        const rowCellKey = normalizeKey(row?.cellName || row?.cell || row?.shortName || row?.name);
        const rowSiteKey = normalizeKey(row?.site || row?.siteName || row?.siteId);
        const matchedSite = filteredSites.find((site) => {
          const siteKeys = [
            site.SITEID,
            site.Site_Name,
            baseCellKey(site.SITEID),
            baseCellKey(site.Site_Name),
          ].map(normalizeKey).filter(Boolean);
          const siteMatches = rowSiteKey && siteKeys.some((key) => isMatch(rowSiteKey, key));
          const cellMatches = rowCellKey && site.cells.some((cell) => (
            isMatch(rowCellKey, normalizeKey(cell.Cell_Name)) ||
            isMatch(rowCellKey, baseCellKey(cell.Cell_Name))
          ));
          return siteMatches || cellMatches;
        });
        const fallbackSite = filteredSites.length > 0 ? filteredSites[index % filteredSites.length] : null;
        const targetSite = matchedSite || fallbackSite;
        if (!targetSite) return null;

        const matchedCell =
          targetSite.cells.find((cell) => rowCellKey && isMatch(rowCellKey, normalizeKey(cell.Cell_Name))) ||
          targetSite.cells.find((cell) => rowCellKey && isMatch(rowCellKey, baseCellKey(cell.Cell_Name))) ||
          targetSite.cells[0];
        const lat = toNumber(matchedCell?.lat) ?? toNumber(targetSite.lat);
        const lon = toNumber(matchedCell?.lon) ?? toNumber(targetSite.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        const offsetRing = Math.floor(index / 10) + 1;
        const offsetAngle = ((index % 10) / 10) * Math.PI * 2;
        const approxLat = lat + Math.sin(offsetAngle) * 0.0008 * offsetRing;
        const approxLon = lon + Math.cos(offsetAngle) * 0.0008 * offsetRing;

        return {
          ...row,
          __site: targetSite,
          __cell: matchedCell,
          __lat: matchedSite ? lat : approxLat,
          __lon: matchedSite ? lon : approxLon,
          __rank: Number(row?.rank || index + 1),
          __approximate: !matchedSite,
        };
      })
      .filter(Boolean);
  }, [showWorstSites, selectedPci, worstCells, filteredSites]);

  const predictionMapItems = useMemo(() => {
    if (!showPredictions || selectedPci) return [];

    const isMatch = (left, right) => (
      left === right ||
      (left.length >= 5 && right.includes(left)) ||
      (right.length >= 5 && left.includes(right))
    );

    const findPredictionSite = (prediction) => {
      const keys = [
        prediction.site,
        prediction.siteName,
        prediction.siteInfo?.siteId,
        prediction.siteInfo?.siteName,
        prediction.cellName,
        prediction.cell,
        prediction.targetCell,
        baseCellKey(prediction.site),
        baseCellKey(prediction.siteName),
        baseCellKey(prediction.cellName),
        baseCellKey(prediction.cell),
        baseCellKey(prediction.targetCell),
      ].map(normalizeKey).filter(Boolean);

      return filteredSites.find((site) => {
        const siteKeys = [
          site.SITEID,
          site.Site_Name,
          baseCellKey(site.SITEID),
          baseCellKey(site.Site_Name),
        ].map(normalizeKey).filter(Boolean);
        const cellKeys = asArray(site.cells).flatMap((cell) => [
          normalizeKey(cell.Cell_Name),
          normalizeKey(cell.Cell_ID),
          baseCellKey(cell.Cell_Name),
          baseCellKey(cell.Cell_ID),
        ]).filter(Boolean);
        return keys.some((key) =>
          [...siteKeys, ...cellKeys].some((candidate) => isMatch(key, candidate))
        );
      });
    };

    return asArray(displayPredictions)
      .slice()
      .sort((left, right) => predictionMapPriority(right) - predictionMapPriority(left))
      .slice(0, MAX_PREDICTION_MAP_MARKERS)
      .map((prediction, index) => {
        const matchedSite = findPredictionSite(prediction);
        const fallbackSite = filteredSites.length > 0 ? filteredSites[index % filteredSites.length] : null;
        const targetSite = matchedSite || fallbackSite;
        const lat = toNumber(prediction.siteInfo?.latitude) ?? toNumber(prediction.latitude) ?? targetSite?.lat;
        const lon = toNumber(prediction.siteInfo?.longitude) ?? toNumber(prediction.longitude) ?? targetSite?.lon;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        const offsetRing = Math.floor(index / 12) + 1;
        const offsetAngle = ((index % 12) / 12) * Math.PI * 2;
        const markerLat = matchedSite ? lat : lat + Math.sin(offsetAngle) * 0.001 * offsetRing;
        const markerLon = matchedSite ? lon : lon + Math.cos(offsetAngle) * 0.001 * offsetRing;

        const actionCode = String(prediction.actionCode || "OBSERVE").toUpperCase();
        const severity = String(prediction.severity || "NORMAL").toUpperCase();
        return {
          ...prediction,
          __index: index,
          __site: targetSite || null,
          __lat: markerLat,
          __lon: markerLon,
          __actionCode: predictionActionColors[actionCode] ? actionCode : "OBSERVE",
          __severity: severity,
          __mappedToSite: Boolean(matchedSite),
          __approximate: !matchedSite,
        };
      })
      .filter(Boolean);
  }, [displayPredictions, filteredSites, selectedPci, showPredictions]);

  useEffect(() => {
    if (!useDeckRendering) return;
    setPredictionMarkerCount(showPredictions ? predictionMapItems.length : 0);
    setPredictionApproxCount(0);
  }, [predictionMapItems, showPredictions, useDeckRendering]);

  const handleTogglePredictions = useCallback(() => {
    setShowPredictions((current) => {
      const next = !current;
      if (next) {
        setActiveMapPanel("predictions");
        setAnalyticsDrawerOpen(false);
        setShowCells(false);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!map || !window.google || !showPredictions || activeMapPanel !== "predictions" || predictionMapItems.length === 0) {
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    predictionMapItems.forEach((item) => {
      bounds.extend({ lat: Number(item.__lat), lng: Number(item.__lon) });
    });
    map.fitBounds(bounds);
  }, [activeMapPanel, map, predictionMapItems, showPredictions]);

  useEffect(() => {
    if (!map || !window.google || !selectedPci || !sourcePciSite) return;
    const bounds = new window.google.maps.LatLngBounds();
    if (Number.isFinite(Number(sourcePciSite.lat)) && Number.isFinite(Number(sourcePciSite.lon))) {
      bounds.extend({ lat: Number(sourcePciSite.lat), lng: Number(sourcePciSite.lon) });
    }
    pciVisibleSites.forEach((site) => {
      if (Number.isFinite(Number(site.lat)) && Number.isFinite(Number(site.lon))) {
        bounds.extend({ lat: Number(site.lat), lng: Number(site.lon) });
      }
    });
    if (bounds.isEmpty()) return;
    map.fitBounds(bounds, 80);
    const listener = window.google.maps.event.addListenerOnce(map, "idle", () => {
      if (map.getZoom() > 15) {
        map.setZoom(15);
      }
      setZoomLevel(map.getZoom());
    });
    return () => window.google.maps.event.removeListener(listener);
  }, [map, pciLayerMode, pciVisibleSites, selectedPci, sourcePciSite]);

  const center = useMemo(() => {
    if (mapData.length > 0) {
      return { lat: mapData[0].lat, lng: mapData[0].lon };
    }
    return { lat: 20.5937, lng: 78.9629 };
  }, [mapData]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey,
    mapIds: googleMapsMapId ? [googleMapsMapId] : undefined,
  });

  // Debounced zoom handler
  const handleZoomChange = useCallback(() => {
    if (map) {
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }

      zoomTimeoutRef.current = setTimeout(() => {
        const newZoom = map.getZoom();
        setZoomLevel(newZoom);
      }, 200);
    }
  }, [map]);

  const onLoad = useCallback((map) => {
    setMap(map);

    // Create single info window instance
    if (window.google && !infoWindowRef.current) {
      infoWindowRef.current = new window.google.maps.InfoWindow({
        pixelOffset: new window.google.maps.Size(0, -10)
      });
    }

    map.addListener('zoom_changed', handleZoomChange);
  }, [handleZoomChange]);

  const onUnmount = useCallback(() => {
    cellPolygonsRef.current.forEach((polygon) => polygon.setMap(null));
    siteMarkersRef.current.forEach((marker) => marker.setMap(null));
    pciMarkersRef.current.forEach((marker) => marker.setMap(null));
    predictionMarkersRef.current.forEach((marker) => marker.setMap(null));
    alarmMarkersRef.current.forEach((marker) => marker.setMap(null));
    cellPolygonsRef.current.clear();
    siteMarkersRef.current.clear();
    pciMarkersRef.current.clear();
    predictionMarkersRef.current.clear();
    alarmMarkersRef.current.clear();
    if (deckOverlayRef.current) {
      deckOverlayRef.current.setMap(null);
      deckOverlayRef.current = null;
    }

    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }

    if (miniTooltipRef.current) {
      miniTooltipRef.current.close();
      miniTooltipRef.current = null;
    }

    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current);
    }

    setMap(null);
  }, []);

  useEffect(() => {
    if (!map || !window.google || filteredSites.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    filteredSites.forEach((site) => {
      if (Number.isFinite(site.lat) && Number.isFinite(site.lon)) {
        bounds.extend({ lat: site.lat, lng: site.lon });
      }
    });

    if (bounds.isEmpty()) return;

    map.fitBounds(bounds, 80);
    const listener = window.google.maps.event.addListenerOnce(map, "idle", () => {
      if (map.getZoom() > 15) {
        map.setZoom(15);
      }
      setZoomLevel(map.getZoom());
    });

    return () => window.google.maps.event.removeListener(listener);
  }, [map, selectedSiteFileId, filteredSites]);

  // MODIFIED: Much smaller radius values for compact triangles
  const getBaseRadiusByZoom = useCallback((zoom) => {
    const scaleFactors = {
      8: 1200,
      9: 900,
      10: 650,
      11: 500,
      12: 380,
      13: 280,
      14: 200,
      15: 140,
      16: 100,
      17: 70,
      18: 50,
      19: 35,
      20: 25,
      21: 18,
      22: 12,
    };

    const roundedZoom = Math.round(zoom);

    if (scaleFactors[roundedZoom]) {
      return scaleFactors[roundedZoom] * cellRadiusScale;
    }

    if (roundedZoom > 22) return 10 * cellRadiusScale;
    if (roundedZoom < 8) return 1500 * cellRadiusScale;

    return 400 * cellRadiusScale;
  }, [cellRadiusScale]);

  const destinationPoint = useCallback((lat, lng, bearing, distance) => {
    const R = 6371e3;
    const δ = distance / R;
    const θ = (bearing * Math.PI) / 180;
    const φ1 = (lat * Math.PI) / 180;
    const λ1 = (lng * Math.PI) / 180;

    const φ2 = Math.asin(
      Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
    );

    const λ2 =
      λ1 +
      Math.atan2(
        Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
        Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
      );

    return {
      lat: (φ2 * 180) / Math.PI,
      lng: (λ2 * 180) / Math.PI,
    };
  }, []);

  const createCellTriangle = useCallback((lat, lng, azimuth, radius, beamWidth = 65) => {
    const apex = { lat, lng };
    const baseCenter = destinationPoint(lat, lng, azimuth, radius);
    const halfWidth = radius * Math.tan(((beamWidth / 2) * Math.PI) / 180);

    const leftBase = destinationPoint(
      baseCenter.lat,
      baseCenter.lng,
      azimuth - 90,
      halfWidth
    );

    const rightBase = destinationPoint(
      baseCenter.lat,
      baseCenter.lng,
      azimuth + 90,
      halfWidth
    );

    return [apex, rightBase, leftBase];
  }, [destinationPoint]);

  const extractCellLayer = useCallback((cellName) => {
    if (!cellName) return 1; // handle null/undefined

    const match = cellName.match(/[A-Z](\d+)$/);
    const namedPattern = String(cellName).match(/_([A-Z])(\d{1,3})(?:_[A-Z0-9]+)?$/i);
    if (namedPattern) return parseInt(namedPattern[2], 10);
    return match ? parseInt(match[1]) : 1;
  }, []);

  const extractSector = useCallback((cellName) => {
    if (!cellName) return "A"; // handle null/undefined

    const namedPattern = String(cellName).match(/_[A-Z]\d{1,3}_([A-Z0-9]+)$/i);
    if (namedPattern) return String(namedPattern[1]).slice(-1).toUpperCase();

    const match = cellName.match(/([A-Z])\d+$/);
    return match ? match[1] : "A";
  }, []);

  const normalizeSectorLabel = useCallback((value) => {
    const raw = String(value ?? "").trim().toUpperCase();
    if (!raw || ["NULL", "NA", "N/A", "NONE", "UNDEFINED"].includes(raw)) return "";
    if (/^[A-Z]$/.test(raw)) return raw;
    if (/^\d+$/.test(raw)) {
      const index = Number(raw);
      if (index >= 1 && index <= 26) return String.fromCharCode(64 + index);
    }
    const letterMatch = raw.match(/[A-Z]$/);
    return letterMatch ? letterMatch[0] : "";
  }, []);

  const getCellSector = useCallback((cell) => {
    const explicitSector = normalizeSectorLabel(firstValue(cell, ["Sector", "SECTOR", "sector", "SEC", "SEC_ID", "Sector_ID", "secId", "sectorId"], ""));
    return explicitSector || extractSector(cell?.Cell_Name || cell?.cellName || "");
  }, [extractSector, normalizeSectorLabel]);

  const getCellLayer = useCallback((cell) => {
    const cellName = cell?.Cell_Name || cell?.cellName || "";
    const hasLayerInName = /_[A-Z]\d{1,3}(?:_[A-Z0-9]+)?$/i.test(String(cellName)) || /[A-Z]\d+$/i.test(String(cellName));
    const parsedLayer = extractCellLayer(cellName);
    if (hasLayerInName) return parsedLayer;

    const bandMatch = String(getCellBandLabel(cell)).match(/(?:^|[^0-9])(?:L|B|N)?0?(\d{1,3})(?:[^0-9]|$)/i);
    return bandMatch ? Number(bandMatch[1]) : parsedLayer;
  }, [extractCellLayer]);

  const getLayerMultiplier = useCallback((layer) => {
    const multipliers = {
      1: 0.35,
      2: 0.50,
      5: 0.70,
      6: 0.85,
      9: 1.0
    };
    return multipliers[layer] || 0.60;
  }, []);

  const getZIndexByLayer = useCallback((layer) => {
    const zIndexMap = { 9: 1, 6: 4, 5: 5, 2: 8, 1: 10 };
    return zIndexMap[layer] || 5;
  }, []);

  const getColorBySector = useCallback((sector, layer) => {
    const sectorColors = {
      A: { fill: "#60A5FA", stroke: "#3B82F6", light: "#DBEAFE", glow: "#93C5FD" },
      B: { fill: "#34D399", stroke: "#10B981", light: "#D1FAE5", glow: "#6EE7B7" },
      C: { fill: "#FB923C", stroke: "#F97316", light: "#FFEDD5", glow: "#FDBA74" },
      D: { fill: "#F472B6", stroke: "#EC4899", light: "#FCE7F3", glow: "#F9A8D4" },
      E: { fill: "#A78BFA", stroke: "#8B5CF6", light: "#EDE9FE", glow: "#C4B5FD" },
      F: { fill: "#FCD34D", stroke: "#F59E0B", light: "#FEF3C7", glow: "#FDE68A" },
    };

    const baseColor = sectorColors[sector] || sectorColors.A;
    const opacityMap = { 9: 0.15, 6: 0.20, 5: 0.25, 2: 0.30, 1: 0.35 };

    return {
      ...baseColor,
      opacity: opacityMap[layer] || 0.25,
    };
  }, []);

  const mapLayerLegendCounts = useMemo(() => {
    const cellSectorCounts = {};
    asArray(deckCells).forEach((cell) => {
      const sector = getCellSector(cell);
      cellSectorCounts[sector] = (cellSectorCounts[sector] || 0) + 1;
    });

    const predictionCounts = {
      LOAD_BALANCE: 0,
      QUALITY_CHECK: 0,
      CAPACITY_REVIEW: 0,
      COVERAGE_CHECK: 0,
      OBSERVE: 0,
    };
    asArray(displayPredictions).forEach((item) => {
      const action = String(item.actionCode || "OBSERVE").toUpperCase();
      predictionCounts[action] = (predictionCounts[action] || 0) + 1;
    });

    const alarmCounts = {
      CRITICAL: 0,
      MAJOR: 0,
      MINOR: 0,
      WARNING: 0,
    };
    asArray(alarms).forEach((alarm) => {
      const severity = String(alarm.severity || "WARNING").toUpperCase();
      alarmCounts[severity] = (alarmCounts[severity] || 0) + 1;
    });

    return { cellSectorCounts, predictionCounts, alarmCounts };
  }, [alarms, deckCells, displayPredictions, getCellSector]);

  const handleDownloadMapPdf = useCallback(async () => {
    if (exportingMapPdf) return;
    setExportingMapPdf(true);
    try {
      const [{ default: jsPDF }] = await Promise.all([import("jspdf")]);
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth  = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 32;
      const contentWidth = pageWidth - margin * 2;
      const now = new Date();

      const selectedSiteUpload = siteUploads.find((u) => String(u.id) === String(selectedSiteFileId));
      const selectedKpiUpload  = uploads.find((u) => String(u.id) === String(selectedFileId));
      const selectedSiteName   = selectedSiteUpload?.fileName || selectedSiteUpload?.filename || `Site file ${selectedSiteFileId || "-"}`;
      const selectedKpiName    = selectedKpiUpload?.fileName  || selectedKpiUpload?.filename  || `KPI file ${selectedFileId || "-"}`;
      const lbRows = asArray(lbResult?.records);

      // ── Colour helpers ────────────────────────────────────────────────────
      const rgb = (hex) => {
        const clean = String(hex || "#000000").replace("#", "");
        const n = clean.length === 3 ? clean.split("").map((c) => c+c).join("") : clean.padEnd(6,"0").slice(0,6);
        return [parseInt(n.slice(0,2),16), parseInt(n.slice(2,4),16), parseInt(n.slice(4,6),16)];
      };
      const setText = (hex) => doc.setTextColor(...rgb(hex));
      const setFill = (hex) => doc.setFillColor(...rgb(hex));
      const setLine = (hex) => doc.setDrawColor(...rgb(hex));

      // ── Shared colour maps ────────────────────────────────────────────────
      const predictionColors = {
        LOAD_BALANCE:"#2563EB", QUALITY_CHECK:"#DC2626",
        CAPACITY_REVIEW:"#7C3AED", COVERAGE_CHECK:"#D97706", OBSERVE:"#059669",
      };
      const severityColors = {
        CRITICAL:"#DC2626", MAJOR:"#EA580C", MINOR:"#D97706",
        WARNING:"#2563EB", NORMAL:"#16A34A",
      };
      const statusColors = {
        GOOD:"#16A34A", WATCH:"#D97706", BAD:"#EA580C", CRITICAL:"#DC2626",
      };

      // ── Pre-compute all aggregate data ────────────────────────────────────
      const bandCounts = {}, technologyCounts = {};
      filteredSites.forEach((site) => {
        asArray(site.cells).forEach((cell) => {
          const band = getCellBandLabel(cell) || "Unknown";
          const tech = cell.Technology || cell.technology || "Unknown";
          bandCounts[band] = (bandCounts[band] || 0) + 1;
          technologyCounts[tech] = (technologyCounts[tech] || 0) + 1;
        });
      });

      const balanceCounts = {
        "Not Balanced": lbRows.filter((r) => String(r.Band_Unbalanced||"").toLowerCase().includes("not")).length,
        "Balanced": lbRows.filter((r) => { const s=String(r.Band_Unbalanced||"").toLowerCase(); return s.includes("balanced")&&!s.includes("not"); }).length,
      };

      // Per-site prediction and alarm counts for "top sites" table
      const sitePredCounts = {};
      asArray(displayPredictions).forEach((p) => {
        const k = String(p.site || p.siteName || "").trim();
        if (k) sitePredCounts[k] = (sitePredCounts[k] || 0) + 1;
      });
      const topSitesByPred = Object.entries(sitePredCounts).sort((a,b) => b[1]-a[1]).slice(0,10);

      const siteAlarmCounts = {};
      asArray(alarms).forEach((a) => {
        const k = String(a.site || a.siteName || "").trim();
        if (k) siteAlarmCounts[k] = (siteAlarmCounts[k] || 0) + 1;
      });
      const topSitesByAlarm = Object.entries(siteAlarmCounts).sort((a,b) => b[1]-a[1]).slice(0,10);

      // Band-level prediction breakdown
      const bandPredCounts = {};
      asArray(displayPredictions).forEach((p) => {
        const b = String(p.band || p.Band || "Unknown");
        bandPredCounts[b] = (bandPredCounts[b] || 0) + 1;
      });

      // Action label map
      const actionLabels = {
        LOAD_BALANCE:"Load Balance", QUALITY_CHECK:"Quality Check",
        CAPACITY_REVIEW:"Capacity Review", COVERAGE_CHECK:"Coverage Check", OBSERVE:"Observe",
      };

      // Data quality
      const coordinateCoverage = totalSiteRows > 0
        ? Math.round(((totalSiteRows - missingCoordinateRows) / totalSiteRows) * 100)
        : 100;

      // Active filters string
      const activeFilters = [
        selectedTechnologyFilter && `Tech: ${selectedTechnologyFilter}`,
        selectedBandFilter && `Band: ${selectedBandFilter}`,
        pciFilter && `PCI: ${pciFilter}`,
      ].filter(Boolean).join("  |  ") || "None";

      // ── Drawing helpers ───────────────────────────────────────────────────
      const pageTitle = (title, subtitle = "") => {
        setFill("#0F172A"); doc.rect(0, 0, pageWidth, 58, "F");
        setFill("#3B82F6"); doc.rect(0, 0, 5, 58, "F");
        setFill("#1E40AF"); doc.rect(0, 58, pageWidth, 2, "F");
        doc.setFont("helvetica","bold"); doc.setFontSize(16); setText("#FFFFFF");
        doc.text(title, margin+4, 34);
        if (subtitle) {
          doc.setFont("helvetica","normal"); doc.setFontSize(8); setText("#94A3B8");
          doc.text(subtitle, pageWidth-margin, 34, { align:"right" });
        }
      };

      const footer = () => {
        setFill("#F1F5F9"); doc.rect(0, pageHeight-28, pageWidth, 28, "F");
        setLine("#CBD5E1"); doc.setLineWidth(0.4);
        doc.line(margin, pageHeight-28, pageWidth-margin, pageHeight-28);
        doc.setFont("helvetica","normal"); doc.setFontSize(7.5); setText("#64748B");
        doc.text(`Network KPI Coverage Map Report  \u2022  ${now.toLocaleString()}  \u2022  Filters: ${activeFilters}`, margin, pageHeight-11);
        doc.setFont("helvetica","bold"); setText("#334155");
        doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth-margin, pageHeight-11, {align:"right"});
      };

      const sectionHeading = (label, x, y, w, accent="#2563EB") => {
        setFill(accent); doc.roundedRect(x, y, w, 22, 4, 4, "F");
        doc.setFont("helvetica","bold"); doc.setFontSize(9); setText("#FFFFFF");
        doc.text(label.toUpperCase(), x+10, y+15);
        return y+22;
      };

      const card = (x, y, w, h, label, value, accent="#2563EB", subtext="") => {
        setFill("#E2E8F0"); doc.roundedRect(x+2, y+2, w, h, 7, 7, "F");
        setFill("#FFFFFF"); setLine("#E2E8F0"); doc.roundedRect(x, y, w, h, 7, 7, "FD");
        setFill(accent); doc.roundedRect(x, y, w, 5, 3, 3, "F"); doc.rect(x, y+2, w, 3, "F");
        doc.setFont("helvetica","bold"); doc.setFontSize(7); setText("#64748B");
        doc.text(String(label).toUpperCase(), x+9, y+22);
        doc.setFontSize(20); setText(accent);
        doc.text(String(value??0), x+9, y+h-12);
        if (subtext) {
          doc.setFont("helvetica","normal"); doc.setFontSize(6.5); setText("#64748B");
          doc.text(subtext, x+9, y+h-3);
        }
      };

      const noDataBox = (x, y, w, h, msg="No data available for this section.") => {
        setFill("#FEF9EE"); setLine("#FDE68A"); doc.roundedRect(x, y, w, h, 5, 5, "FD");
        doc.setFont("helvetica","italic"); doc.setFontSize(8.5); setText("#92400E");
        const lines = doc.splitTextToSize(msg, w-20);
        doc.text(lines, x+10, y+18);
      };

      // Styled table — returns bottom Y
      const table = (headers, rows, x, y, widths, maxRows=20) => {
        const rh=20, tw=widths.reduce((s,w)=>s+w,0);
        setFill("#1E293B"); setLine("#1E293B"); doc.roundedRect(x, y, tw, rh, 4, 4, "FD");
        doc.rect(x, y+12, tw, 8, "F");
        doc.setFont("helvetica","bold"); doc.setFontSize(7.5); setText("#F8FAFC");
        let cx=x;
        headers.forEach((h,i) => {
          doc.text(String(h), cx+6, y+13); cx+=widths[i];
          if (i<headers.length-1){ setLine("#334155"); doc.setLineWidth(0.3); doc.line(cx,y+2,cx,y+rh-2); }
        });
        doc.setFont("helvetica","normal");
        const shown=rows.slice(0,maxRows);
        shown.forEach((row,ri) => {
          const ry=y+rh*(ri+1);
          setFill(ri%2===0?"#F8FAFC":"#FFFFFF"); setLine("#E2E8F0"); doc.setLineWidth(0.25);
          doc.rect(x, ry, tw, rh, "FD"); cx=x;
          row.forEach((cell,ci) => {
            doc.setFontSize(7.5); setText("#334155");
            doc.text(doc.splitTextToSize(String(cell??"-"),widths[ci]-8).slice(0,1), cx+6, ry+13);
            cx+=widths[ci];
          });
        });
        if (shown.length===0) {
          setFill("#F8FAFC"); setLine("#E2E8F0"); doc.rect(x,y+rh,tw,rh,"FD");
          doc.setFont("helvetica","italic"); doc.setFontSize(7.5); setText("#94A3B8");
          doc.text("No records available.", x+8, y+rh+13);
        }
        if (rows.length>maxRows) {
          doc.setFont("helvetica","italic"); doc.setFontSize(7); setText("#64748B");
          doc.text(`\u2026 ${formatNumber(rows.length-maxRows)} more rows not shown`, x+tw, y+rh*(maxRows+1)+11, {align:"right"});
        }
        return y+rh*(Math.max(shown.length,1)+1)+(rows.length>maxRows?12:0);
      };

      // Horizontal bar chart with panel
      const barChart = (title, counts, colors, x, y, w, h, accent="#1E293B") => {
        setFill("#F8FAFC"); setLine("#E2E8F0"); doc.roundedRect(x, y, w, h+26, 6, 6, "FD");
        setFill(accent); doc.roundedRect(x, y, w, 22, 6, 6, "F"); doc.rect(x, y+12, w, 10, "F");
        doc.setFont("helvetica","bold"); doc.setFontSize(8.5); setText("#F8FAFC");
        doc.text(title, x+10, y+15);
        const entries=Object.entries(counts||{}).filter(([,v])=>Number(v)>0);
        const chartY=y+30;
        if (!entries.length) {
          doc.setFont("helvetica","normal"); doc.setFontSize(8); setText("#94A3B8");
          doc.text("No data available.", x+10, chartY+14); return y+h+26;
        }
        const maxV=Math.max(1,...entries.map(([,v])=>Number(v)));
        const bH=Math.min(17,(h-8)/entries.length-6);
        const lW=102, trackW=w-lW-40;
        entries.slice(0,10).forEach(([key,val],idx) => {
          const yy=chartY+idx*(bH+7);
          setFill(colors[key]||"#64748B"); doc.circle(x+10, yy+bH/2, 3, "F");
          doc.setFont("helvetica","normal"); doc.setFontSize(7); setText("#475569");
          doc.text(doc.splitTextToSize((actionLabels[key]||String(key)).replaceAll("_"," "),lW-8)[0], x+18, yy+bH/2+3);
          setFill("#E2E8F0"); doc.roundedRect(x+lW, yy, trackW, bH, 3, 3, "F");
          setFill(colors[key]||"#64748B"); doc.roundedRect(x+lW, yy, Math.max(6,(Number(val)/maxV)*trackW), bH, 3, 3, "F");
          doc.setFont("helvetica","bold"); doc.setFontSize(7.5); setText("#0F172A");
          doc.text(formatNumber(val), x+w-8, yy+bH/2+3, {align:"right"});
        });
        return y+h+26;
      };

      // Vertical bar chart
      const vertBarChart = (title, counts, colors, x, y, w, h) => {
        const entries=Object.entries(counts||{}).filter(([,v])=>Number(v)>0).slice(0,10);
        setFill("#F8FAFC"); setLine("#E2E8F0"); doc.roundedRect(x, y, w, h, 6, 6, "FD");
        setFill("#1E293B"); doc.roundedRect(x, y, w, 22, 6, 6, "F"); doc.rect(x, y+12, w, 10, "F");
        doc.setFont("helvetica","bold"); doc.setFontSize(8.5); setText("#F8FAFC");
        doc.text(title, x+10, y+15);
        if (!entries.length) {
          doc.setFont("helvetica","normal"); doc.setFontSize(8); setText("#94A3B8");
          doc.text("No data.", x+10, y+46); return;
        }
        const maxV=Math.max(1,...entries.map(([,v])=>Number(v)));
        const gap=6, cX=x+18, cY=y+30, cW=w-36, cH=h-54;
        const bW=Math.max(10,(cW-gap*(entries.length-1))/entries.length);
        entries.forEach(([key,val],idx) => {
          const bH=(Number(val)/maxV)*cH, bx=cX+idx*(bW+gap), by=cY+cH-bH;
          setFill(colors[key]||"#2563EB"); doc.roundedRect(bx, by, bW, bH, 3, 3, "F");
          doc.setFont("helvetica","bold"); doc.setFontSize(6.5); setText("#0F172A");
          doc.text(formatNumber(val), bx+bW/2, by-3, {align:"center"});
          doc.setFont("helvetica","normal"); doc.setFontSize(6); setText("#475569");
          doc.text(String(key).slice(0,10), bx+bW/2, y+h-8, {align:"center"});
        });
      };

      // Sector plot
      const sectorPlot = (x, y, w, h) => {
        const sites=filteredSites.filter((s)=>Number.isFinite(s.lat)&&Number.isFinite(s.lon));
        setFill("#F8FAFC"); setLine("#CBD5E1"); doc.roundedRect(x, y, w, h, 6, 6, "FD");
        if (!sites.length) {
          doc.setFont("helvetica","normal"); doc.setFontSize(8); setText("#94A3B8");
          doc.text("No plottable site data available.", x+12, y+28); return;
        }
        const lats=sites.map((s)=>Number(s.lat)), lons=sites.map((s)=>Number(s.lon));
        const minLat=Math.min(...lats), maxLat=Math.max(...lats);
        const minLon=Math.min(...lons), maxLon=Math.max(...lons);
        const pad=14;
        const pX=(lon)=>x+pad+((lon-minLon)/Math.max(maxLon-minLon,0.000001))*(w-pad*2);
        const pY2=(lat)=>y+pad+(h-pad*2)-((lat-minLat)/Math.max(maxLat-minLat,0.000001))*(h-pad*2);
        const cells=sites.flatMap((s)=>asArray(s.cells).map((c)=>({site:s,cell:c})));
        cells.forEach(({site,cell})=>{
          const clr=getColorBySector(getCellSector(cell),1);
          setFill(clr.fill||"#64748B"); doc.circle(pX(site.lon),pY2(site.lat),1.1,"F");
        });
        cells.slice(0,400).forEach(({site,cell})=>{
          const clr=getColorBySector(getCellSector(cell),1);
          const cx2=pX(site.lon), cy2=pY2(site.lat);
          const az=Number(cell.AZIMUTH||0), ang=((90-az)*Math.PI)/180, sz=7, sp=Math.PI/6;
          setLine(clr.stroke||clr.fill||"#64748B"); doc.setLineWidth(0.3);
          doc.triangle(cx2,cy2,cx2+Math.cos(ang-sp)*sz,cy2-Math.sin(ang-sp)*sz,cx2+Math.cos(ang+sp)*sz,cy2-Math.sin(ang+sp)*sz,"S");
        });
        doc.setFont("helvetica","bold"); doc.setFontSize(7.5); setText("#334155");
        doc.text(`${formatNumber(sites.length)} sites / ${formatNumber(cells.length)} cells plotted`, x+10, y+h-8);
      };

      // TA stacked bar chart
      const taCoverageChart = (x, y, w, h) => {
        setFill("#F8FAFC"); setLine("#E2E8F0"); doc.roundedRect(x, y, w, h, 6, 6, "FD");
        setFill("#1E293B"); doc.roundedRect(x, y, w, 22, 6, 6, "F"); doc.rect(x, y+12, w, 10, "F");
        doc.setFont("helvetica","bold"); doc.setFontSize(8.5); setText("#F8FAFC");
        doc.text("TA Distance Coverage Profile", x+10, y+15);
        const usable=lbRows.filter((r)=>r["%coverage_upto_2km"]!==undefined||r["%coverage_2_6km"]!==undefined||r["%coverage_6km_plus"]!==undefined);
        if (!usable.length) {
          doc.setFont("helvetica","normal"); doc.setFontSize(8); setText("#92400E");
          doc.text(doc.splitTextToSize("TA data not available. Select TA Distance File and run LB/WCF.",w-24), x+12, y+42);
          return;
        }
        const byBand={};
        usable.forEach((r)=>{
          const band=r.Band||r.band||"Unknown";
          if (!byBand[band]) byBand[band]={near:0,mid:0,far:0,count:0};
          byBand[band].near+=Number(r["%coverage_upto_2km"]||0);
          byBand[band].mid+=Number(r["%coverage_2_6km"]||0);
          byBand[band].far+=Number(r["%coverage_6km_plus"]||0);
          byBand[band].count+=1;
        });
        const bEntries=Object.entries(byBand).slice(0,8);
        const rH2=Math.min(24,(h-52)/Math.max(bEntries.length,1));
        bEntries.forEach(([band,v],idx)=>{
          const yy=y+34+idx*rH2, near=v.near/v.count, mid=v.mid/v.count;
          const barX=x+64, barW2=w-112;
          doc.setFont("helvetica","bold"); doc.setFontSize(7); setText("#334155");
          doc.text(band, x+10, yy+rH2-5);
          const nW=(near/100)*barW2, mW=(mid/100)*barW2, fW=Math.max(0,barW2-nW-mW);
          setFill("#2563EB"); doc.rect(barX,yy,nW,rH2-4,"F");
          setFill("#10B981"); doc.rect(barX+nW,yy,mW,rH2-4,"F");
          setFill("#F97316"); doc.rect(barX+nW+mW,yy,fW,rH2-4,"F");
          doc.setFont("helvetica","normal"); doc.setFontSize(6.5); setText("#475569");
          doc.text(`${near.toFixed(0)}/${mid.toFixed(0)}/${(100-near-mid).toFixed(0)}%`, x+w-8, yy+rH2-6, {align:"right"});
        });
        const legY=y+h-14;
        [["<=2km","#2563EB"],["2-6km","#10B981"],[">6km","#F97316"]].forEach(([lbl,clr],i)=>{
          setFill(clr); doc.rect(x+12+i*60,legY-7,9,9,"F");
          doc.setFont("helvetica","normal"); doc.setFontSize(6.5); setText("#475569");
          doc.text(lbl, x+24+i*60, legY);
        });
      };

      // ═══════════════════════════════════════════════════════════════════
      // PAGE 1 — Executive Summary
      // ═══════════════════════════════════════════════════════════════════
      pageTitle("Network KPI Coverage Map Report \u2014 Full Data Export", now.toLocaleString());

      // Info banner with active filters
      const hasFilt = activeFilters !== "None";
      setFill(hasFilt ? "#FEF9EE" : "#EFF6FF");
      setLine(hasFilt ? "#FDE68A" : "#BFDBFE");
      doc.roundedRect(margin, 68, contentWidth, 22, 4, 4, "FD");
      doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
      setText(hasFilt ? "#92400E" : "#1D4ED8");
      doc.text(
        hasFilt
          ? `\u26A0  Active filters: ${activeFilters}  \u2014  data below is filtered accordingly`
          : "\u2139  No filters active \u2014 report covers all loaded site and KPI data",
        margin+10, 82
      );

      // 6 KPI summary cards
      const cW2=Math.floor((contentWidth-20)/6), cH=72, cY2=98, cG=4;
      card(margin+0*(cW2+cG), cY2, cW2, cH, "Total Sites",  formatNumber(filteredSites.length),                              "#2563EB", totalSiteRows>0?`of ${formatNumber(totalSiteRows)} raw`:"");
      card(margin+1*(cW2+cG), cY2, cW2, cH, "Total Cells",  formatNumber(filteredCellCount),                                 "#0EA5E9");
      card(margin+2*(cW2+cG), cY2, cW2, cH, "Predictions",  formatNumber(activePredictionSummary?.recommendationCount||0),  "#7C3AED", `${formatNumber(activePredictionSummary?.siteCount||0)} sites`);
      card(margin+3*(cW2+cG), cY2, cW2, cH, "LB/WCF Rows", formatNumber(lbRows.length),                                    "#1D4ED8", lbResult?"Run this session":"Not run");
      card(margin+4*(cW2+cG), cY2, cW2, cH, "Worst Cells",  formatNumber(worstCellMapItems.length),                        "#EA580C");
      card(margin+5*(cW2+cG), cY2, cW2, cH, "Open Alarms",  formatNumber(alarms.length),                                   "#DC2626", alarmSummary?`C:${alarmSummary.critical||0} M:${alarmSummary.major||0}`:"");

      // Two-column layout
      const col1X=margin, col2X=margin+contentWidth/2+6, colW2=contentWidth/2-6;
      let ly=cY2+cH+14, ry=ly;

      // Left: Session + data quality
      sectionHeading("Session, Files & Data Quality", col1X, ly, colW2, "#2563EB"); ly+=26;
      ly=table(
        ["Setting","Value"],
        [
          ["Site file", selectedSiteName],
          ["KPI file", selectedKpiName],
          ["LB/WCF result", lbResult ? `Rows: ${formatNumber(lbRows.length)} | Not Balanced: ${formatNumber(balanceCounts["Not Balanced"])} | Balanced: ${formatNumber(balanceCounts["Balanced"])}` : (lbMessage||"Not run \u2014 LB/WCF analysis pages will be empty")],
          ["LB Config", lbResult ? `Method: ${lbMethod}  |  ML Mode: ${lbMlMode}  |  Quantile: ${lbQuantile}` : "LB/WCF not run"],
          ["Alarm summary", alarmSummary ? `Open: ${formatNumber(alarmSummary.totalOpen)} | C:${alarmSummary.critical||0} M:${alarmSummary.major||0} m:${alarmSummary.minor||0} W:${alarmSummary.warning||0}` : `${formatNumber(alarms.length)} alarms loaded`],
          ["Data quality", `${formatNumber(totalSiteRows)} raw rows | ${formatNumber(missingCoordinateRows)} missing coords | ${coordinateCoverage}% plottable`],
          ["Worst-cell metric", selectedWorstMetricLabel],
          ["Active filters", activeFilters],
          ["Map layers", `Cells:${showCells?"ON":"OFF"} | Pred:${showPredictions?"ON":"OFF"} | Worst:${showWorstSites?"ON":"OFF"} | Alarms:${showAlarms?"ON":"OFF"}`],
        ],
        col1X, ly, [120,colW2-120], 9,
      );

      // Right: Report index
      sectionHeading("Report Contents (9 pages)", col2X, ry, colW2, "#7C3AED"); ry+=26;
      table(
        ["Pg","Content","Status"],
        [
          ["1","Executive Summary \u2014 KPI cards, session info, data quality","Always"],
          ["2","Map Plot \u2014 sector fan, sector color legend, prediction & alarm counts","Always"],
          ["3","LB/WCF Full Predictions \u2014 all recommendations with action, metrics",displayPredictions.length>0?"Data loaded":"No predictions"],
          ["4","Site Analysis \u2014 top sites by predictions, alarms, status breakdown",siteSummary?"Data loaded":"No site analytics"],
          ["5","TA Coverage + LB Row Detail \u2014 per-band TA profile, full LB table",lbResult?"Data loaded":"LB/WCF not run"],
          ["6","Worst Cell Rankings \u2014 all cells ranked by KPI metric",worstCellMapItems.length>0?"Data loaded":"No worst cells"],
          ["7","Alarm Detail \u2014 all open alarms, site, cell, severity, message",alarms.length>0?"Data loaded":"No alarms"],
          ["8","KPI Charts \u2014 band, technology, balance, prediction distributions","Always"],
          ["9","Notes & Methodology","Always"],
        ],
        col2X, ry, [22,colW2-86,64], 9,
      );
      footer();

      // ═══════════════════════════════════════════════════════════════════
      // PAGE 2 — Map Plot + Dynamic Legends + Sector Color Legend
      // ═══════════════════════════════════════════════════════════════════
      doc.addPage("a4","landscape");
      pageTitle("Map Plot and Dynamic Legends", "Sector fan preview  \u00b7  Prediction & Alarm legend  \u00b7  Sector cell counts");

      const mpW=454, mpH=358, mpX=margin, mpY=68;
      sectorPlot(mpX, mpY, mpW, mpH);

      // Right panel
      const rpX=mpX+mpW+16, rpW=pageWidth-rpX-margin;
      let rpY=mpY;

      barChart("Prediction Cells by Action", mapLayerLegendCounts.predictionCounts, predictionColors, rpX, rpY, rpW, 118);
      rpY+=118+28;
      barChart("Alarm Cells by Severity",    mapLayerLegendCounts.alarmCounts,      severityColors,    rpX, rpY, rpW, 100);
      rpY+=100+20;

      // Sector color legend
      sectionHeading("Sector Color Legend", rpX, rpY, rpW, "#0EA5E9"); rpY+=26;
      const sectors2 = ["A","B","C","D"];
      const secBoxW = Math.floor(rpW / sectors2.length) - 4;
      sectors2.forEach((sector, idx) => {
        const clr = getColorBySector(sector, 1);
        const sx = rpX + idx * (secBoxW + 4);
        setFill(clr.fill || "#64748B"); setLine(clr.stroke || clr.fill || "#64748B");
        doc.roundedRect(sx, rpY, secBoxW, 22, 4, 4, "FD");
        doc.setFont("helvetica","bold"); doc.setFontSize(9); setText("#FFFFFF");
        doc.text(`Sector ${sector}`, sx + secBoxW/2, rpY+15, {align:"center"});
      });
      rpY += 26;

      // Sector cell count table
      sectionHeading("Sector Cell Counts", rpX, rpY, rpW, "#334155"); rpY+=24;
      table(
        ["Sector","Visible cells","% of total"],
        Object.entries(mapLayerLegendCounts.cellSectorCounts||{}).sort().map(([s,c])=>{
          const total=Object.values(mapLayerLegendCounts.cellSectorCounts||{}).reduce((a,b)=>a+b,0);
          return [s, formatNumber(c), total>0?`${Math.round((c/total)*100)}%`:"0%"];
        }),
        rpX, rpY, [rpW*0.35, rpW*0.35, rpW*0.30], 8,
      );
      footer();

      // ═══════════════════════════════════════════════════════════════════
      // PAGE 3 — LB/WCF Full Prediction Table
      // ═══════════════════════════════════════════════════════════════════
      doc.addPage("a4","landscape");
      pageTitle("LB/WCF Prediction Analysis \u2014 Full Table", `${formatNumber(displayPredictions.length)} recommendations  \u00b7  ${lbResult?"Source: LB/WCF Python":"Source: Rule-based from KPI data"}`);

      // Summary cards
      const sumW=Math.floor((contentWidth-24)/5), sumH=50, sumY=68;
      card(margin+0*(sumW+6), sumY, sumW, sumH, "Total Recs",     formatNumber(activePredictionSummary?.recommendationCount||0),   "#7C3AED");
      card(margin+1*(sumW+6), sumY, sumW, sumH, "Sites Affected", formatNumber(activePredictionSummary?.siteCount||0),             "#2563EB");
      card(margin+2*(sumW+6), sumY, sumW, sumH, "Critical",       formatNumber(activePredictionSummary?.severityCounts?.CRITICAL||0),"#DC2626");
      card(margin+3*(sumW+6), sumY, sumW, sumH, "Major",          formatNumber(activePredictionSummary?.severityCounts?.MAJOR||0),  "#EA580C");
      card(margin+4*(sumW+6), sumY, sumW, sumH, "Not Balanced",   formatNumber(balanceCounts["Not Balanced"]),                     "#D97706");

      let predY=sumY+sumH+12;

      if (displayPredictions.length===0) {
        sectionHeading("Prediction Table \u2014 No Data", margin, predY, contentWidth, "#64748B"); predY+=26;
        noDataBox(margin, predY, contentWidth, 60,
          lbResult
            ? "LB/WCF was run but produced no predictions. This may mean all cells are balanced."
            : "No predictions available. Run LB/WCF or select a KPI file with worst-cell data to generate predictions."
        );
      } else {
        sectionHeading(`All ${formatNumber(displayPredictions.length)} Predictions`, margin, predY, contentWidth, "#7C3AED");
        predY+=24;
        const pCols=[70,90,108,90,58,48,58,contentWidth-70-90-108-90-58-48-58];
        table(
          ["Site","Cell","Action Type","Balance","Severity","Score","PRB %","Recommendation / Action"],
          balancedDisplayPredictions.map((item)=>[
            item.site||item.siteName||"-",
            item.cellName||item.targetCell||"-",
            (actionLabels[item.actionCode]||String(item.actionCode||"OBSERVE")),
            item.balanceStatus||item.bandUnbalanced||"-",
            item.severity||"NORMAL",
            String(item.score??"-"),
            item.metrics?.prbDlUtilization!=null ? Number(item.metrics.prbDlUtilization).toFixed(1) : "-",
            (item.action||"").slice(0,60),
          ]),
          margin, predY, pCols, 16,
        );
      }

      // Mini side charts — prediction by band + by action
      // (added below table if there's space)
      footer();

      // ═══════════════════════════════════════════════════════════════════
      // PAGE 4 — Site Analysis (Status Counts, Top Sites, worstSites)
      // ═══════════════════════════════════════════════════════════════════
      doc.addPage("a4","landscape");
      pageTitle("Site Analysis \u2014 Status, Top Sites & Alarm/Prediction Breakdown", `${formatNumber(siteAnalyticsRows.length)} sites in analytics  \u00b7  ${formatNumber(filteredSites.length)} plotted`);

      // Status breakdown cards
      const stW=Math.floor((contentWidth-20)/4), stH=50, stY=68;
      card(margin+0*(stW+6),stY,stW,stH,"GOOD",   formatNumber(statusCounts.GOOD||0),   "#16A34A");
      card(margin+1*(stW+6),stY,stW,stH,"WATCH",  formatNumber(statusCounts.WATCH||0),  "#D97706");
      card(margin+2*(stW+6),stY,stW,stH,"BAD",    formatNumber(statusCounts.BAD||0),    "#EA580C");
      card(margin+3*(stW+6),stY,stW,stH,"CRITICAL",formatNumber(statusCounts.CRITICAL||0),"#DC2626");

      if (!siteSummary && siteAnalyticsRows.length===0) {
        let saY=stY+stH+12;
        noDataBox(margin, saY, contentWidth, 60,
          "No site analytics data available. Click a site on the map to load its details, or check the backend /site-analytics endpoint."
        );
        saY+=72;
        // Still show top-sites-by-prediction and top-sites-by-alarm from displayPredictions / alarms
        const halfW2=(contentWidth-12)/2;
        sectionHeading("Top 10 Sites by Prediction Count", margin, saY, halfW2, "#7C3AED"); saY+=24;
        if (topSitesByPred.length) {
          table(
            ["Site","Predictions"],
            topSitesByPred.map(([site,count])=>[site, formatNumber(count)]),
            margin, saY, [halfW2-70,70], 10,
          );
        } else {
          noDataBox(margin, saY, halfW2, 44, "No prediction data.");
        }
        let saYRight=stY+stH+12+72+24;
        sectionHeading("Top 10 Sites by Alarm Count", margin+halfW2+12, saYRight, halfW2, "#DC2626"); saYRight+=24;
        if (topSitesByAlarm.length) {
          table(
            ["Site","Alarms"],
            topSitesByAlarm.map(([site,count])=>[site, formatNumber(count)]),
            margin+halfW2+12, saYRight, [halfW2-70,70], 10,
          );
        } else {
          noDataBox(margin+halfW2+12, saYRight, halfW2, 44, "No alarm data.");
        }
      } else {
        // Status counts bar chart + worstSites table
        let saY=stY+stH+12;
        const halfW2=(contentWidth-12)/2;

        barChart("Site Status Distribution", statusCounts, statusColors, margin, saY, halfW2, 90, "#334155");

        // Band prediction breakdown
        barChart("Predictions by Frequency Band", bandPredCounts, {
          L01:"#2563EB",L03:"#10B981",L08:"#F97316",L18:"#8B5CF6",L21:"#EC4899",Unknown:"#64748B",
        }, margin+halfW2+12, saY, halfW2, 90, "#334155");

        saY+=90+32;

        sectionHeading("Worst Ranked Sites (by Health Score)", margin, saY, halfW2-6, "#EA580C"); 
        let saYRight=saY;
        sectionHeading("Top Sites by Prediction Count", margin+halfW2+6, saYRight, halfW2-6, "#7C3AED");
        saY+=24; saYRight+=24;

        if (worstSites.length) {
          table(
            ["Rank","Site","Health","Critical","Major"],
            worstSites.map((s)=>[
              String(s.rank||"-"),
              s.site||s.siteName||"-",
              String(s.healthScore!=null?Number(s.healthScore).toFixed(1):"-"),
              String(s.criticalCount||0),
              String(s.majorCount||0),
            ]),
            margin, saY, [30,halfW2-6-30-54-54-54,54,54,54], 8,
          );
        } else {
          noDataBox(margin, saY, halfW2-6, 44, "No site analytics data.");
        }

        if (topSitesByPred.length) {
          table(
            ["Site","Predictions"],
            topSitesByPred.map(([site,count])=>[site, formatNumber(count)]),
            margin+halfW2+6, saYRight, [halfW2-6-70,70], 10,
          );
        } else {
          noDataBox(margin+halfW2+6, saYRight, halfW2-6, 44, "No prediction data.");
        }
      }
      footer();

      // ═══════════════════════════════════════════════════════════════════
      // PAGE 5 — TA Coverage + LB Row Detail
      // ═══════════════════════════════════════════════════════════════════
      doc.addPage("a4","landscape");
      pageTitle("TA Coverage Analysis & LB/WCF Row Detail", `${formatNumber(lbRows.length)} LB/WCF rows  \u00b7  TA coverage per band`);

      if (!lbResult && lbRows.length===0) {
        noDataBox(margin, 68, contentWidth, 80,
          "LB/WCF was not run in this session. TA coverage and LB row detail require running the LB/WCF Python service with a site data file and (optionally) a TA Distance file. Results will appear here after running LB/WCF."
        );
      } else {
        const taW=Math.floor(contentWidth*0.44);
        taCoverageChart(margin, 68, taW, 210);
        const bcX=margin+taW+16, bcW=contentWidth-taW-16;
        barChart("Balance Result", balanceCounts, {"Not Balanced":"#DC2626","Balanced":"#10B981"}, bcX, 68, bcW, 90, "#1E293B");
        barChart("Action Distribution", mapLayerLegendCounts.predictionCounts, predictionColors, bcX, 68+90+28, bcW, 90, "#1E293B");

        let lbTableY=68+210+14;
        sectionHeading(`LB/WCF Row Details (${formatNumber(lbRows.length)} rows)`, margin, lbTableY, contentWidth, "#1D4ED8");
        lbTableY+=24;
        const lbCols=[68,60,48,72,52,60,58,54,contentWidth-68-60-48-72-52-60-58-54];
        table(
          ["Site","Cell","Band","Balance","PRB %","Traffic GB","RRC Users","HOSR %","ML Recommendation"],
          lbRows.map((r)=>[
            r.Site||r.site||"-",
            r.Cell||r.cellName||r.Cell_Name||"-",
            r.Band||r.band||"-",
            r.Band_Unbalanced||"-",
            r["PRB DL Utilization %"]!=null?Number(r["PRB DL Utilization %"]).toFixed(1):"-",
            r["Total Traffic(GB)"]!=null?Number(r["Total Traffic(GB)"]).toFixed(2):"-",
            r.Avg_number_of_RRC_users!=null?Number(r.Avg_number_of_RRC_users).toFixed(0):"-",
            r["Inter_freq_HOSR%"]!=null?Number(r["Inter_freq_HOSR%"]).toFixed(1):"-",
            (String(r.ML_Recommendations||r.Recommendations||"")).slice(0,50),
          ]),
          margin, lbTableY, lbCols, 10,
        );
      }
      footer();

      // ═══════════════════════════════════════════════════════════════════
      // PAGE 6 — Worst Cell Rankings
      // ═══════════════════════════════════════════════════════════════════
      doc.addPage("a4","landscape");
      pageTitle("Worst Cell Rankings", `Metric: ${selectedWorstMetricLabel}  \u00b7  ${formatNumber(worstCellMapItems.length)} cells ranked`);

      if (!selectedMetric) {
        noDataBox(margin, 68, contentWidth, 60,
          "No KPI metric selected. Go to the KPI Selector on the map page, choose a metric, and the worst cell table will populate."
        );
      } else if (worstCellMapItems.length===0) {
        noDataBox(margin, 68, contentWidth, 60,
          `No worst cells found. Ensure a KPI file is loaded and radio KPI columns are available.`
        );
      } else {
        const wcSumW=Math.floor((contentWidth-15)/4), wcSumH=50, wcSumY=68;
        card(margin+0*(wcSumW+5),wcSumY,wcSumW,wcSumH,"Ranked Cells",formatNumber(worstCellMapItems.length),"#EA580C");
        card(margin+1*(wcSumW+5),wcSumY,wcSumW,wcSumH,"Critical",    formatNumber(worstCellMapItems.filter(w=>w.severity==="CRITICAL").length),"#DC2626");
        card(margin+2*(wcSumW+5),wcSumY,wcSumW,wcSumH,"Major",       formatNumber(worstCellMapItems.filter(w=>w.severity==="MAJOR").length),  "#EA580C");
        card(margin+3*(wcSumW+5),wcSumY,wcSumW,wcSumH,"Minor",       formatNumber(worstCellMapItems.filter(w=>w.severity==="MINOR").length),  "#D97706");

        let wcY=wcSumY+wcSumH+12;
        sectionHeading(`Worst Cells \u2014 ${selectedWorstMetricLabel}`, margin, wcY, contentWidth, "#EA580C"); wcY+=24;
        const wcCols=[30,90,110,110,70,60,contentWidth-30-90-110-110-70-60];
        table(
          ["Rank","Site","Cell","Metric","Value","Severity","Action / Notes"],
          worstCellMapItems.map((item,idx)=>[
            String(item.rank??idx+1),
            item.site||item.__site?.Site_Name||item.__site?.SITEID||"-",
            item.cellName||item.cell||"-",
            item.metricName||item.metric||selectedMetric||"-",
            String(item.value??item.averageValue??item.score??"-"),
            item.severity||"-",
            (item.action||item.recommendation||"").slice(0,60),
          ]),
          margin, wcY, wcCols, 22,
        );
      }
      footer();

      // ═══════════════════════════════════════════════════════════════════
      // PAGE 7 — Alarm Detail
      // ═══════════════════════════════════════════════════════════════════
      doc.addPage("a4","landscape");
      pageTitle("Open Alarm Detail", `${formatNumber(alarms.length)} open alarms  \u00b7  KPI file: ${selectedKpiName}`);

      const asSumW=Math.floor((contentWidth-20)/5), asSumH=50, asSumY=68;
      card(margin+0*(asSumW+5),asSumY,asSumW,asSumH,"Total Open",formatNumber(alarmSummary?.totalOpen??alarms.length),"#DC2626");
      card(margin+1*(asSumW+5),asSumY,asSumW,asSumH,"Critical",  formatNumber(alarmSummary?.critical??mapLayerLegendCounts.alarmCounts?.CRITICAL??0),"#DC2626");
      card(margin+2*(asSumW+5),asSumY,asSumW,asSumH,"Major",     formatNumber(alarmSummary?.major??mapLayerLegendCounts.alarmCounts?.MAJOR??0),   "#EA580C");
      card(margin+3*(asSumW+5),asSumY,asSumW,asSumH,"Minor",     formatNumber(alarmSummary?.minor??mapLayerLegendCounts.alarmCounts?.MINOR??0),   "#D97706");
      card(margin+4*(asSumW+5),asSumY,asSumW,asSumH,"Warning",   formatNumber(alarmSummary?.warning??mapLayerLegendCounts.alarmCounts?.WARNING??0),"#2563EB");

      const alChW=Math.floor(contentWidth*0.36);
      const alTblW=contentWidth-alChW-12;
      barChart("Alarm Severity Distribution", mapLayerLegendCounts.alarmCounts, severityColors, margin+alTblW+12, asSumY+asSumH+12, alChW, 90, "#DC2626");
      barChart("Top Sites by Alarm Count", Object.fromEntries(topSitesByAlarm.slice(0,6).map(([s,c])=>[s.slice(0,14),c])), {"#DC2626":"#DC2626"}, margin+alTblW+12, asSumY+asSumH+12+90+24, alChW, 90, "#EA580C");

      let alY=asSumY+asSumH+12;
      if (alarms.length===0) {
        noDataBox(margin, alY, alTblW, 70,
          "No open alarms found. Ensure a KPI file with alarm data is selected. Alarms are fetched from the backend with status=OPEN."
        );
      } else {
        sectionHeading(`All Open Alarms (${formatNumber(alarms.length)})`, margin, alY, alTblW, "#DC2626"); alY+=24;
        const alCols=[72,90,60,alTblW-72-90-60];
        table(
          ["Site","Cell","Severity","Alarm Message / Metric"],
          asArray(alarms).map((a)=>[
            a.site||a.siteName||"-",
            a.cellName||a.cell||"-",
            a.severity||"OPEN",
            (a.message||a.recommendation||a.metricName||a.alarmType||"-").slice(0,80),
          ]),
          margin, alY, alCols, 22,
        );
      }
      footer();

      // ═══════════════════════════════════════════════════════════════════
      // PAGE 8 — KPI Charts
      // ═══════════════════════════════════════════════════════════════════
      doc.addPage("a4","landscape");
      pageTitle("KPI Distribution Charts", "Cells by band  \u00b7  Technology  \u00b7  Balance result  \u00b7  Prediction by action & band");

      const ch3W=Math.floor((contentWidth-24)/3), ch3H=190, ch3Y=68, ch3G=12;
      vertBarChart("Cells by Frequency Band", bandCounts, {
        L01:"#2563EB",L03:"#10B981",L08:"#F97316",L18:"#8B5CF6",L21:"#EC4899",L26:"#14B8A6",Unknown:"#64748B",
      }, margin, ch3Y, ch3W, ch3H);
      vertBarChart("Cells by Technology", technologyCounts, {
        LTE:"#2563EB",NR:"#7C3AED",GSM:"#10B981",UMTS:"#F97316",Unknown:"#64748B",
      }, margin+ch3W+ch3G, ch3Y, ch3W, ch3H);
      vertBarChart("Load Balance Result", balanceCounts, {
        "Not Balanced":"#DC2626","Balanced":"#10B981",
      }, margin+(ch3W+ch3G)*2, ch3Y, ch3W, ch3H);

      const r2Y=ch3Y+ch3H+18;
      const taChW=Math.floor(contentWidth*0.34), pdChW=Math.floor(contentWidth*0.32), bdChW=contentWidth-taChW-pdChW-ch3G*2;
      taCoverageChart(margin, r2Y, taChW, 185);
      barChart("Prediction by Action", mapLayerLegendCounts.predictionCounts, predictionColors, margin+taChW+ch3G, r2Y, pdChW, 155, "#7C3AED");
      barChart("Prediction by Band", bandPredCounts, {
        L01:"#2563EB",L03:"#10B981",L08:"#F97316",L18:"#8B5CF6",Unknown:"#64748B",
      }, margin+taChW+ch3G+pdChW+ch3G, r2Y, bdChW, 155, "#2563EB");
      footer();

      // ═══════════════════════════════════════════════════════════════════
      // PAGE 9 — Notes & Methodology
      // ═══════════════════════════════════════════════════════════════════
      doc.addPage("a4","landscape");
      pageTitle("Notes & Methodology", "Map module full data PDF export");

      setFill("#EFF6FF"); setLine("#BFDBFE"); doc.roundedRect(margin, 68, contentWidth, 26, 4, 4, "FD");
      doc.setFont("helvetica","normal"); doc.setFontSize(8.5); setText("#1E40AF");
      doc.text("All data is generated entirely in the browser from live map state. No server-side rendering or Python script is required to produce this report.", margin+10, 84);

      let nY=104;
      const noteItems=[
        ["Report Generation","Downloaded directly from the browser. All 9 pages render from the current map state at export time. No reload or server call is needed."],
        ["Filter Awareness",`Active filters at export time: ${activeFilters}. All tables and counts reflect the filtered data. Disable filters before exporting for a full-network report.`],
        ["Data Quality",`${formatNumber(totalSiteRows)} raw site rows loaded. ${formatNumber(missingCoordinateRows)} rows had missing/invalid coordinates (${100-coordinateCoverage}% of raw rows) and could not be plotted.`],
        ["Sector Plot (Page 2)","Dots show all visible cells coloured by sector (A/B/C/D). Fan triangles preview azimuth bearings (capped at 400 for performance). Sector colour legend shows the actual colours used."],
        ["LB/WCF Predictions (Pages 3-5)",lbResult?"Predictions come from the LB/WCF Python service run in this session. Rows without a recommendation or balance flag are excluded.":"LB/WCF was not run. Predictions shown are rule-based, derived from worst-cell KPI data. Run LB/WCF for full ML-based predictions."],
        ["TA Coverage (Page 5)","Requires the optional TA Distance File. Without it, the TA chart shows a placeholder. Near=<=2km, Mid=2-6km, Far=>6km."],
        ["Site Analysis (Page 4)","Status counts (Good/Watch/Bad/Critical) come from the site analytics service. Top-sites tables are computed from the current prediction and alarm data."],
        [`Alarm Detail (Page 7)`,alarms.length>0?`${formatNumber(alarms.length)} alarms fetched from the backend with status=OPEN for the selected KPI file.`:"No alarms loaded. Ensure a KPI file with alarm data is selected."],
        [`Data Caps (${formatNumber(displayPredictions.length)} predictions)`,`Live map markers capped at ${MAX_PREDICTION_MAP_MARKERS} for rendering performance. The PDF reports the full prediction count. Prediction tables show up to 16 rows per page with a row count shown for overflow.`],
      ];
      noteItems.forEach(([heading,body],idx)=>{
        const noteH=44;
        const accents=["#2563EB","#D97706","#EA580C","#0EA5E9","#7C3AED","#10B981","#EC4899","#DC2626","#334155"];
        setFill("#F8FAFC"); setLine("#E2E8F0"); doc.roundedRect(margin, nY, contentWidth, noteH, 5, 5, "FD");
        setFill(accents[idx%accents.length]);
        doc.roundedRect(margin, nY, 4, noteH, 2, 2, "F"); doc.rect(margin+2, nY, 2, noteH, "F");
        doc.setFont("helvetica","bold"); doc.setFontSize(8.5); setText("#0F172A");
        doc.text(`${idx+1}. ${heading}`, margin+14, nY+15);
        doc.setFont("helvetica","normal"); doc.setFontSize(8); setText("#475569");
        doc.text(doc.splitTextToSize(body, contentWidth-24).slice(0,2), margin+14, nY+29);
        nY+=noteH+7;
      });
      footer();

      doc.save(`coverage-map-full-report-${now.toISOString().slice(0,10)}.pdf`);
    } catch (error) {
      console.error("Failed to export map PDF:", error);
      alert(`Failed to export map PDF: ${error?.message || "Unknown error"}`);
    } finally {
      setExportingMapPdf(false);
    }
  }, [
    activePredictionSummary,
    alarms,
    alarmSummary,
    balancedDisplayPredictions,
    displayPredictions,
    exportingMapPdf,
    filteredCellCount,
    filteredSites,
    getCellBandLabel,
    getCellSector,
    getColorBySector,
    lbMessage,
    lbResult,
    mapLayerLegendCounts,
    missingCoordinateRows,
    pciFilter,
    selectedBandFilter,
    selectedFileId,
    selectedMetric,
    selectedSiteFileId,
    selectedTechnologyFilter,
    showAlarms,
    showCells,
    showPredictions,
    showWorstSites,
    siteAnalyticsRows,
    siteUploads,
    siteSummary,
    statusCounts,
    totalSiteRows,
    uploads,
    worstCellMapItems,
    worstSites,
  ]);





  const getFrequencyBand = useCallback((freq) => {
    if (freq < 1000) return { name: "Low Band", color: "#A78BFA" };
    if (freq < 2000) return { name: "Mid Band", color: "#60A5FA" };
    if (freq < 2500) return { name: "High Mid", color: "#34D399" };
    return { name: "High Band", color: "#FB923C" };
  }, []);

  const createCellInfoWindow = useCallback((cell) => {
    const sector = getCellSector(cell);
    const layer = getCellLayer(cell);
    const colors = getColorBySector(sector, layer);
    const freqBand = getFrequencyBand(cell.Downlink_Center_Frequency);
    const bandLabel = getCellBandLabel(cell);

    return `
      <div style="padding: 0; width: 340px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; border-radius: 12px; overflow: hidden; background: white;">
        <div style="background: linear-gradient(135deg, ${colors.fill}20 0%, ${colors.light} 100%); padding: 20px; border-bottom: 3px solid ${colors.fill};">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <div style="width: 40px; height: 40px; background: ${colors.fill}; border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px ${colors.fill}40;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                <path d="M2 12 7 2M17 2l5 10M12 12v10M5 12h14"></path>
              </svg>
            </div>
            <div style="flex: 1;">
              <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #1F2937; letter-spacing: -0.3px;">
                ${cell.Cell_Name}
              </h3>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #6B7280; font-weight: 500;">
                Site ${cell.SITEID}
              </p>
            </div>
          </div>
          
          <div style="display: flex; gap: 6px;">
            <span style="background: white; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; color: ${colors.stroke}; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              Sector ${sector}
            </span>
            <span style="background: white; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; color: #6B7280; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              Layer ${layer}
            </span>
            <span style="background: white; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; color: ${freqBand.color}; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              ${freqBand.name}
            </span>
          </div>
        </div>
        
        <div style="padding: 20px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div style="background: ${colors.light}; padding: 14px; border-radius: 10px; border-left: 3px solid ${colors.fill};">
              <div style="font-size: 10px; color: ${colors.stroke}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Azimuth</div>
              <div style="font-size: 26px; color: #1F2937; font-weight: 800; font-family: 'SF Mono', monospace;">
                ${cell.AZIMUTH}<span style="font-size: 14px; color: #9CA3AF;">°</span>
              </div>
            </div>
            
            <div style="background: #F3F4F6; padding: 14px; border-radius: 10px; border-left: 3px solid #6B7280;">
              <div style="font-size: 10px; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Frequency</div>
              <div style="font-size: 20px; color: #1F2937; font-weight: 800; font-family: 'SF Mono', monospace;">
                ${cell.Downlink_Center_Frequency}<span style="font-size: 11px; color: #9CA3AF;"> MHz</span>
              </div>
            </div>
          </div>
          
          <div style="display: grid; gap: 8px;">
            <div style="display: flex; justify-content: space-between; padding: 10px 12px; background: #F9FAFB; border-radius: 8px;">
              <span style="font-size: 12px; color: #6B7280; font-weight: 500;">PCI</span>
              <span style="font-size: 13px; color: #1F2937; font-weight: 700;">${cell.PCI}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 12px; padding: 10px 12px; background: #F9FAFB; border-radius: 8px;">
              <span style="font-size: 12px; color: #6B7280; font-weight: 500;">Band</span>
              <span style="font-size: 13px; color: #1F2937; font-weight: 700; text-align: right;">${bandLabel}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 12px; background: #F9FAFB; border-radius: 8px;">
              <span style="font-size: 12px; color: #6B7280; font-weight: 500;">TAC</span>
              <span style="font-size: 13px; color: #1F2937; font-weight: 700;">${cell.TAC}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 12px; background: #F9FAFB; border-radius: 8px;">
              <span style="font-size: 12px; color: #6B7280; font-weight: 500;">Antenna Height</span>
              <span style="font-size: 13px; color: #1F2937; font-weight: 700;">${cell.Antenna_Height}m</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 12px; background: #F9FAFB; border-radius: 8px;">
              <span style="font-size: 12px; color: #6B7280; font-weight: 500;">Tilt (E / M)</span>
              <span style="font-size: 13px; color: #1F2937; font-weight: 700;">${cell.E_tilt}° / ${cell.M_tilt}°</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 12px; background: #F9FAFB; border-radius: 8px;">
              <span style="font-size: 12px; color: #6B7280; font-weight: 500;">Coordinates</span>
              <span style="font-size: 11px; color: #1F2937; font-weight: 600; font-family: monospace;">${cell.lat.toFixed(5)}, ${cell.lon.toFixed(5)}</span>
            </div>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 12px 20px; border-top: 1px solid #E5E7EB;">
          <div style="font-size: 11px; color: #9CA3AF; text-align: center;">
            Cell ID: <strong style="color: #6B7280;">${cell.Cell_ID}</strong>
          </div>
        </div>
      </div>
    `;
  }, [getCellSector, getCellLayer, getColorBySector, getFrequencyBand]);

  const getSiteAlarms = useCallback((site) => {
    const byId = alarmsBySite.get(normalizeKey(site?.SITEID)) || [];
    const byName = alarmsBySite.get(normalizeKey(site?.Site_Name)) || [];
    const byCell = asArray(site?.cells).flatMap((cell) => alarmsBySite.get(normalizeKey(cell.Cell_Name)) || []);
    return [...byId, ...byName, ...byCell];
  }, [alarmsBySite]);

  const getWorstAlarmSeverity = useCallback((site) => {
    return getSiteAlarms(site).reduce((worst, alarm) => {
      const severity = String(alarm.severity || "NORMAL").toUpperCase();
      return (severityOrder[severity] || 0) > (severityOrder[worst] || 0) ? severity : worst;
    }, "NORMAL");
  }, [getSiteAlarms]);

  const createSiteInfoWindow = useCallback((site) => {
    const siteAlerts = getSiteAlarms(site);
    const severity = getWorstAlarmSeverity(site);
    const siteLabels = getSiteMapLabel(site);
    const intelligence = siteIntelligenceByName.get(normalizeKey(site?.SITEID)) ||
      siteIntelligenceByName.get(normalizeKey(site?.Site_Name));
    const clusterTone = intelligence ? getIntelligenceTone(intelligence.status, intelligence.impactScore) : null;
    return `
      <div style="padding: 0; width: 320px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; border-radius: 12px; overflow: hidden; background: white;">
        <div style="background: linear-gradient(135deg, #2563EB20 0%, #93C5FD 100%); padding: 18px; border-bottom: 3px solid #2563EB;">
          <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #0F172A;">${site.Site_Name}</h3>
          <p style="margin: 6px 0 0 0; font-size: 12px; color: #475569;">Site ID ${site.SITEID} • ${site.cells?.length || 0} cell(s)</p>
        </div>
        <div style="padding: 16px; display: grid; gap: 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #475569;">
            <span>Status</span>
            <strong style="color: #0F172A;">${site.summary?.status || severity || 'NORMAL'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #475569;">
            <span>Worst alarm</span>
            <strong style="color: ${severityMarkerColors[severity] || '#2563EB'};">${severity}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #475569;">
            <span>Prediction count</span>
            <strong style="color: #7C3AED;">${predictionBySite.get(normalizeKey(site.SITEID))?.length || predictionBySite.get(normalizeKey(site.Site_Name))?.length || 0}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 12px; font-size: 12px; color: #475569;">
            <span>Technology</span>
            <strong style="color: #0F172A; text-align: right;">${siteLabels.techLabel}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 12px; font-size: 12px; color: #475569;">
            <span>Band</span>
            <strong style="color: #0F172A; text-align: right;">${siteLabels.bandLabel}</strong>
          </div>
          <div style="background: #F8FAFC; border-radius: 10px; padding: 10px; font-size: 11px; color: #475569;">
            ${siteAlerts.length > 0 ? `${siteAlerts.length} open alarm(s)` : 'No open alarms for this site.'}
          </div>
          ${intelligence ? `
            <div style="background: ${clusterTone?.light || '#F8FAFC'}; border: 1px solid ${clusterTone?.fill || '#CBD5E1'}; border-radius: 10px; padding: 10px; font-size: 11px; color: #475569;">
              <div style="display: flex; justify-content: space-between; gap: 10px; margin-bottom: 6px;">
                <span>Cluster</span>
                <strong style="color: #0F172A; text-align: right;">${intelligence.cluster || 'Unclustered'}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 10px;">
                <span>Impact</span>
                <strong style="color: #0F172A; text-align: right;">${Number(intelligence.impactScore || 0).toFixed(1)}%</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 10px; margin-top: 6px;">
                <span>PCI / HO / Neigh</span>
                <strong style="color: #0F172A; text-align: right;">
                  ${Number(Math.max(intelligence.pciCollisionScore || 0, intelligence.pciConfusionScore || 0)).toFixed(1)}% / ${Number(intelligence.handoverRisk || 0).toFixed(1)}% / ${Number(intelligence.missingNeighborScore || 0).toFixed(1)}%
                </strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 10px; margin-top: 6px;">
                <span>Overshoot</span>
                <strong style="color: #0F172A; text-align: right;">${Number(intelligence.overshootingScore || 0).toFixed(1)}%</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 10px; margin-top: 6px;">
                <span>Latest observed</span>
                <strong style="color: #0F172A; text-align: right;">${intelligence.latestObservedAt || intelligence.observedAt || intelligence.updatedAt || '-'}</strong>
              </div>
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }, [getSiteAlarms, getWorstAlarmSeverity, predictionBySite, siteIntelligenceByName]);

  const createWorstCellInfoWindow = useCallback((item) => {
    const cellName = item?.cellName || item?.cell || item?.__cell?.Cell_Name || "Unknown cell";
    const siteName = item?.site || item?.__site?.Site_Name || item?.__site?.SITEID || "Unknown site";
    const metricName = item?.metricName || item?.metric || selectedMetric || "Selected KPI";
    const value = item?.averageValue ?? item?.value ?? item?.score ?? "-";
    const severity = item?.severity || "WORST";
    const rank = item?.__rank || item?.rank || "-";
    const approximate = Boolean(item?.__approximate);

    return `
      <div style="padding: 0; width: 320px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; border-radius: 12px; overflow: hidden; background: white;">
        <div style="background: linear-gradient(135deg, #FEE2E2 0%, #FFFFFF 100%); padding: 16px; border-bottom: 3px solid #DC2626;">
          <div style="font-size: 11px; font-weight: 900; color: #DC2626; text-transform: uppercase;">Worst Cell #${rank}</div>
          <h3 style="margin: 5px 0 0 0; font-size: 18px; font-weight: 800; color: #111827;">${cellName}</h3>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #475569;">${siteName}</p>
        </div>
        <div style="padding: 14px; display: grid; gap: 9px;">
          <div style="display: flex; justify-content: space-between; gap: 12px; font-size: 12px; color: #475569;">
            <span>Metric</span>
            <strong style="color: #111827; text-align: right;">${metricName}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 12px; font-size: 12px; color: #475569;">
            <span>Value</span>
            <strong style="color: #DC2626;">${value}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 12px; font-size: 12px; color: #475569;">
            <span>Status</span>
            <strong style="color: #DC2626;">${severity}</strong>
          </div>
          <div style="background: ${approximate ? "#FEF2F2" : "#F8FAFC"}; border-radius: 10px; padding: 10px; font-size: 11px; font-weight: 800; color: ${approximate ? "#B91C1C" : "#475569"};">
            ${approximate ? "Approximate map position: KPI cell did not match the selected site map. Check KPI/site map naming." : "Exact map match found for this worst cell."}
          </div>
        </div>
      </div>
    `;
  }, [selectedMetric]);

  const siteHasWorstCell = useCallback((site) => {
    if (!showWorstSites || !site) return false;
    return Boolean(
      siteWorstLookup.get(normalizeKey(site?.SITEID)) ||
      siteWorstLookup.get(normalizeKey(site?.Site_Name)) ||
      site?.cells?.some((cell) => worstCellLookup.has(normalizeKey(cell.Cell_Name)))
    );
  }, [showWorstSites, siteWorstLookup, worstCellLookup]);

  const siteHasWorstSite = useCallback((site) => {
    if (!showWorstSites || !site) return false;
    return Boolean(
      worstSiteLookup.has(normalizeKey(site.SITEID)) ||
      worstSiteLookup.has(normalizeKey(site.Site_Name)) ||
      site.cells?.some((cell) => (
        worstSiteLookup.has(normalizeKey(cell.Cell_Name)) ||
        worstSiteLookup.has(baseCellKey(cell.Cell_Name))
      ))
    );
  }, [showWorstSites, worstSiteLookup]);

  const siteHasSelectedPci = useCallback((site) => {
    return Boolean(
      selectedPci &&
      pciVisibleSiteIds.has(normalizeKey(site?.SITEID))
    );
  }, [pciVisibleSiteIds, selectedPci]);

  const cellMatchesVisibleSelectedPci = useCallback((cell) => {
    if (!selectedPci || normalizePci(cell?.PCI) !== normalizePci(selectedPci)) return false;
    if (selectedPciSiteId && normalizeKey(cell?.SITEID) === normalizeKey(selectedPciSiteId)) return true;
    return pciVisibleSiteIds.has(normalizeKey(cell?.SITEID));
  }, [pciVisibleSiteIds, selectedPci, selectedPciSiteId]);

  const getSiteMarkerIcon = useCallback((site, selected = false) => {
    const intelligence = siteIntelligenceByName.get(normalizeKey(site?.SITEID)) ||
      siteIntelligenceByName.get(normalizeKey(site?.Site_Name));
    const clusterTone = activeMapPanel === "clusters" && intelligence
      ? getIntelligenceTone(intelligence.status, intelligence.impactScore)
      : null;
    const handoverRelation = handoverRelationMap.get(normalizeKey(site?.SITEID));
    const hasWorst = siteHasWorstCell(site);
    const hasSelectedPci = siteHasSelectedPci(site);
    const hasWorstSite = siteHasWorstSite(site);
    const hasPrediction = showPredictions && (
      predictionBySite.has(normalizeKey(site?.SITEID)) ||
      predictionBySite.has(normalizeKey(site?.Site_Name))
    );
    const alarmSeverity = showAlarms ? getWorstAlarmSeverity(site) : "NORMAL";
    const hasAlarm = severityOrder[alarmSeverity] > 0;
    const pciMode = Boolean(selectedPci);
    const isSource = selectedPci && normalizeKey(site?.SITEID) === normalizeKey(selectedPciSiteId);
    const handoverFocus = Boolean(focusMapSite) && normalizeKey(site?.SITEID) === normalizeKey(focusMapSite.SITEID);
    const shouldHighlight = isSource || hasSelectedPci || hasAlarm || hasWorst || hasWorstSite || hasPrediction || Boolean(clusterTone) || Boolean(handoverRelation) || handoverFocus;
    const fillColor = pciMode
      ? isSource
        ? "#FACC15"
        : hasSelectedPci
          ? "#DC2626"
          : "#16A34A"
      : handoverFocus
        ? "#FACC15"
      : handoverRelation
        ? handoverRelation.color
      : clusterTone
        ? clusterTone.fill
      : hasAlarm
      ? severityMarkerColors[alarmSeverity]
      : hasSelectedPci
        ? "#DC2626"
        : hasWorstSite
          ? "#EA580C"
          : hasPrediction
            ? "#7C3AED"
            : selected
                ? "#3B82F6"
                : "#FFFFFF";
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: (shouldHighlight ? (selected || isSource ? 9 : 7) : (selected ? 7 : 5.5)) * siteMarkerScale,
      fillColor,
      fillOpacity: 1,
      strokeColor: isSource
        ? "#78350F"
        : handoverFocus
          ? "#78350F"
        : handoverRelation?.color
          ? handoverRelation.color
        : clusterTone?.stroke
          ? clusterTone.stroke
          : (shouldHighlight || selected || pciMode)
            ? "#FFFFFF"
            : "#3B82F6",
      strokeWeight: isSource ? 4 : 2,
    };
  }, [siteHasWorstCell, siteHasWorstSite, siteHasSelectedPci, selectedPci, selectedPciSiteId, showPredictions, showAlarms, predictionBySite, getWorstAlarmSeverity, siteMarkerScale, siteIntelligenceByName, activeMapPanel, handoverRelationMap, focusMapSite]);

  const getDeckSiteColor = useCallback((site, selected = false) => {
    const intelligence = siteIntelligenceByName.get(normalizeKey(site?.SITEID)) ||
      siteIntelligenceByName.get(normalizeKey(site?.Site_Name));
    const clusterTone = activeMapPanel === "clusters" && intelligence
      ? getIntelligenceTone(intelligence.status, intelligence.impactScore)
      : null;
    const handoverRelation = handoverRelationMap.get(normalizeKey(site?.SITEID));
    const hasSelectedPci = siteHasSelectedPci(site);
    const hasWorst = siteHasWorstCell(site);
    const hasWorstSite = siteHasWorstSite(site);
    const hasPrediction = showPredictions && (
      predictionBySite.has(normalizeKey(site?.SITEID)) ||
      predictionBySite.has(normalizeKey(site?.Site_Name))
    );
    const alarmSeverity = showAlarms ? getWorstAlarmSeverity(site) : "NORMAL";
    const hasAlarm = severityOrder[alarmSeverity] > 0;
    const pciMode = Boolean(selectedPci);
    const isSource = selectedPci && normalizeKey(site?.SITEID) === normalizeKey(selectedPciSiteId);
    const handoverFocus = Boolean(focusMapSite) && normalizeKey(site?.SITEID) === normalizeKey(focusMapSite.SITEID);

    if (handoverFocus) return hexToRgba("#FACC15", 250);
    if (handoverRelation?.color) return hexToRgba(handoverRelation.color, 250);
    if (clusterTone) return hexToRgba(clusterTone.fill, 250);
    if (pciMode) return hexToRgba(isSource ? "#FACC15" : hasSelectedPci ? "#DC2626" : "#16A34A", 245);
    if (hasAlarm) return hexToRgba(severityMarkerColors[alarmSeverity], 255);
    if (isSource) return hexToRgba("#FACC15", 255);
    if (hasSelectedPci) return hexToRgba("#DC2626", 255);
    if (hasWorstSite || hasWorst) return hexToRgba("#EA580C", 255);
    if (hasPrediction) return hexToRgba("#7C3AED", 255);
    if (selected) return hexToRgba("#2563EB", 255);
    if (pciMode) return hexToRgba("#16A34A", 245);
    return hexToRgba(getSiteBaseColor(site), 245);
  }, [siteHasSelectedPci, siteHasWorstCell, siteHasWorstSite, showPredictions, showAlarms, predictionBySite, getWorstAlarmSeverity, selectedPci, selectedPciSiteId, siteIntelligenceByName, activeMapPanel, handoverRelationMap, focusMapSite]);

  const getCellOverlayColors = useCallback((cell, layer, sector) => {
    const baseColors = getColorBySector(sector, layer);
    const isWorstCell = showWorstSites && worstCellLookup.has(normalizeKey(cell.Cell_Name));
    const isSamePci =
      selectedPci &&
      normalizePci(cell.PCI) === normalizePci(selectedPci) &&
      mapVisibleSiteIds?.has(normalizeKey(cell.SITEID));
    const isSourcePciCell =
      isSamePci &&
      selectedPciSiteId &&
      normalizeKey(cell.SITEID) === normalizeKey(selectedPciSiteId);

    if (isSourcePciCell) {
      return { ...baseColors, fill: "#FACC15", stroke: "#78350F", light: "#FEF3C7", opacity: 0.86 };
    }

    if (isSamePci) {
      return { ...baseColors, fill: "#DC2626", stroke: "#7F1D1D", light: "#FEE2E2", opacity: 0.78 };
    }

    if (selectedPci) {
      return { ...baseColors, fill: "#16A34A", stroke: "#15803D", light: "#DCFCE7", opacity: 0.28 };
    }

    if (isWorstCell) {
      return { ...baseColors, fill: "#EF4444", stroke: "#DC2626", light: "#FEE2E2", opacity: 0.42 };
    }

    return baseColors;
  }, [getColorBySector, showWorstSites, worstCellLookup, selectedPci, selectedPciSiteId, mapVisibleSiteIds]);

  // Render site markers
  useEffect(() => {
    if (useDeckRendering) {
      siteMarkersRef.current.forEach((marker) => marker.setMap(null));
      siteMarkersRef.current.clear();
      return;
    }
    if (!map || !window.google || filteredSites.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();

    filteredSites.forEach((site) => {
      const markerKey = site.SITEID;
      let marker = siteMarkersRef.current.get(markerKey);

      if (!marker) {
        marker = new window.google.maps.Marker({
          position: { lat: site.lat, lng: site.lon },
          map: map,
          icon: getSiteMarkerIcon(site, selectedSite?.SITEID === site.SITEID),
          title: site.Site_Name,
          zIndex: siteHasWorstCell(site) || siteHasSelectedPci(site) ? 120000 : 100000,
        });

        marker.siteData = site;

        marker.addListener("mouseover", () => {
          marker.setIcon(getSiteMarkerIcon(site, true));
          if (marker.tooltip) {
            marker.tooltip.close();
          }

          const tooltip = new window.google.maps.InfoWindow({
            content: createSiteInfoWindow(site),
            position: { lat: site.lat, lng: site.lon },
            pixelOffset: new window.google.maps.Size(0, -20),
          });
          marker.tooltip = tooltip;
          miniTooltipRef.current = tooltip;
          tooltip.open(map);
        });

        marker.addListener("mouseout", () => {
          if (selectedSite?.SITEID !== site.SITEID) {
            marker.setIcon(getSiteMarkerIcon(site, false));
          }
          if (marker.tooltip) {
            marker.tooltip.close();
            marker.tooltip = null;
          }
        });

        marker.addListener("click", () => {
          handleSiteMarkerClick(site);
        });

        siteMarkersRef.current.set(markerKey, marker);
      } else {
        marker.setMap(map);
        marker.siteData = site;
        marker.setIcon(getSiteMarkerIcon(site, selectedSite?.SITEID === site.SITEID));
        marker.setZIndex(siteHasWorstCell(site) || siteHasSelectedPci(site) ? 120000 : 100000);
      }

      bounds.extend({ lat: site.lat, lng: site.lon });
    });

    siteMarkersRef.current.forEach((marker, key) => {
      if (!filteredSites.find(site => site.SITEID === key)) {
        marker.setMap(null);
        siteMarkersRef.current.delete(key);
      }
    });

    if (siteMarkersRef.current.size > 0 && zoomLevel === 11) {
      map.fitBounds(bounds);
    }
  }, [map, filteredSites, selectedSite, getSiteMarkerIcon, siteHasWorstCell, siteHasSelectedPci]);

  const handleSiteMarkerClick = useCallback((site) => {
    setSelectedSite(site);
    setSelectedCell(null);
    if (selectedPci && siteHasSelectedPci(site)) {
      setSelectedPciSiteId(String(site.SITEID || ""));
    }

    siteMarkersRef.current.forEach((marker, key) => {
      if (key === site.SITEID) {
        marker.setIcon(getSiteMarkerIcon(site, true));
      } else {
        marker.setIcon(getSiteMarkerIcon(marker.siteData, false));
      }
    });

    if (infoWindowRef.current && infoWindowRef.current.getMap()) {
      infoWindowRef.current.close();
    }

    if (map) {
      map.panTo({ lat: site.lat, lng: site.lon });
      map.setZoom(Math.max(zoomLevel, 14));
      infoWindowRef.current.setContent(createSiteInfoWindow(site));
      infoWindowRef.current.setPosition({ lat: site.lat, lng: site.lon });
      infoWindowRef.current.open(map);
    }
  }, [map, zoomLevel, getSiteMarkerIcon, selectedPci, siteHasSelectedPci, createSiteInfoWindow, filteredSites]);

  const loadSelectedSiteDetails = useCallback(async (site) => {
    if (!selectedFileId || !site) return;
    const analyticsKey =
      siteAnalyticsByName.get(normalizeKey(site.Site_Name)) ||
      siteAnalyticsByName.get(normalizeKey(site.SITEID));
    const siteQuery = analyticsKey?.site;
    if (!siteQuery) {
      setSiteDetails(null);
      return;
    }
    const detailResponse = await fetchSiteDetails(selectedFileId, siteQuery);
    setSiteDetails(detailResponse?.success ? detailResponse.data : null);
  }, [selectedFileId, siteAnalyticsByName]);

  useEffect(() => {
    if (selectedSite) {
      loadSelectedSiteDetails(selectedSite);
    } else {
      setSiteDetails(null);
    }
  }, [selectedSite, loadSelectedSiteDetails]);

  useEffect(() => {
    if (!map || !window.google || !useDeckRendering) return;

    if (!deckOverlayRef.current) {
      deckOverlayRef.current = new GoogleMapsOverlay({ layers: [] });
      deckOverlayRef.current.setMap(map);
    }

    const baseRadius = getBaseRadiusByZoom(zoomLevel);
    /* legacy handover layer stub
      id: "deck-handover-relations",
      data: handoverRelationItems,
      pickable: true,
      getSourcePosition: (item) => item.sourcePosition,
      getTargetPosition: (item) => item.targetPosition,
      getColor: (item) => hexToRgba(item.color, 220),
      getWidth: (item) => item.width,
      widthUnits: "pixels",
      updateTriggers: {
        getSourcePosition: [handoverRelationItems.length],
        getTargetPosition: [handoverRelationItems.length],
        getColor: [handoverRelationItems.length],
        getWidth: [handoverRelationItems.length],
      },
      onClick: ({ object }) => {
        if (!object) return;
        const targetSite = object.targetSite;
        if (targetSite) {
          handleSiteMarkerClick(targetSite);
        }
      },
      onHover: ({ object, coordinate }) => {
        if (!object) {
          if (miniTooltipRef.current) {
            miniTooltipRef.current.close();
            miniTooltipRef.current = null;
          }
          return;
        }
        if (!miniTooltipRef.current) {
          miniTooltipRef.current = new window.google.maps.InfoWindow({
            pixelOffset: new window.google.maps.Size(0, -14),
          });
        }
        miniTooltipRef.current.setContent(`
          <div style="padding: 8px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: white; border-radius: 10px; border: 2px solid ${object.color}; box-shadow: 0 8px 18px rgba(15,23,42,0.18);">
            <div style="font-size: 11px; font-weight: 900; color: ${object.color}; text-transform: uppercase;">${String(object.relationType || "NEIGHBOUR").replaceAll("_", " ")}</div>
            <div style="margin-top: 3px; font-size: 12px; font-weight: 800; color: #111827;">${object.sourceSite?.Site_Name || object.sourceSite?.SITEID || "-" } → ${object.targetSite?.Site_Name || object.targetSite?.SITEID || "-"}</div>
            <div style="margin-top: 2px; font-size: 11px; color: #64748B;">${Number(object.distanceKm || 0).toFixed(2)} km • Score ${Number(object.relationScore || 0).toFixed(0)}</div>
            <div style="margin-top: 4px; font-size: 10px; color: #475569;">Click to open the target site</div>
          </div>
        `);
        miniTooltipRef.current.setPosition({ lat: coordinate[1], lng: coordinate[0] });
        miniTooltipRef.current.open(map);
      },
    */

    const handoverLineLayer =
      visibleHandoverRelationItems.length > 0
        ? new LineLayer({
            id: "deck-handover-relations",
            data: visibleHandoverRelationItems,
            pickable: true,
            getSourcePosition: (item) => item.sourcePosition,
            getTargetPosition: (item) => item.targetPosition,
            getColor: (item) => hexToRgba(item.categoryColor || item.color, 230),
            getWidth: (item) => item.width,
            widthUnits: "pixels",
            onClick: ({ object }) => {
              if (!object) return;
              if (object.targetSite) {
                handleSiteMarkerClick(object.targetSite);
              }
            },
            onHover: ({ object, coordinate }) => {
              if (!object) {
                if (miniTooltipRef.current) {
                  miniTooltipRef.current.close();
                  miniTooltipRef.current = null;
                }
                return;
              }
              if (!miniTooltipRef.current) {
                miniTooltipRef.current = new window.google.maps.InfoWindow({
                  pixelOffset: new window.google.maps.Size(0, -14),
                });
              }
              miniTooltipRef.current.setContent(`
                <div style="padding: 8px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: white; border-radius: 10px; border: 2px solid ${object.color}; box-shadow: 0 8px 18px rgba(15,23,42,0.18);">
                  <div style="font-size: 11px; font-weight: 900; color: ${object.categoryColor || object.color}; text-transform: uppercase;">${object.handoverCategory || "NEIGHBOR"} HANDOVER</div>
                  <div style="margin-top: 3px; font-size: 12px; font-weight: 800; color: #111827;">${object.sourceSite?.Site_Name || object.sourceSite?.SITEID || "-"} -> ${object.targetSite?.Site_Name || object.targetSite?.SITEID || "-"}</div>
                  <div style="margin-top: 2px; font-size: 11px; color: #64748B;">${Number(object.distanceKm || 0).toFixed(2)} km • Score ${Number(object.relationScore || 0).toFixed(0)}</div>
                  <div style="margin-top: 4px; font-size: 10px; color: #475569;">Click to open the target site</div>
                </div>
              `);
              miniTooltipRef.current.setPosition({ lat: coordinate[1], lng: coordinate[0] });
              miniTooltipRef.current.open(map);
            },
          })
        : null;

    const handoverLabelLayer =
      visibleHandoverRelationItems.length > 0
        ? new TextLayer({
            id: "deck-handover-labels",
            data: zoomLevel >= 10 ? visibleHandoverRelationItems : [],
            pickable: false,
            getPosition: (item) => [
              (item.sourcePosition[0] + item.targetPosition[0]) / 2,
              (item.sourcePosition[1] + item.targetPosition[1]) / 2,
            ],
            getText: (item) => `${item.handoverCategory || "NEIGHBOR"} HO`,
            getSize: 10,
            getColor: (item) => hexToRgba(item.categoryColor || item.color, 255),
            getTextAnchor: "middle",
            getAlignmentBaseline: "center",
            fontWeight: 900,
            background: true,
            backgroundColor: [15, 23, 42, 220],
            backgroundPadding: [3, 2],
          })
        : null;

    const siteLayer = new ScatterplotLayer({
      id: "deck-sites",
      data: filteredSites,
      pickable: true,
      stroked: true,
      filled: true,
      radiusUnits: "pixels",
      getPosition: (site) => [Number(site.lon), Number(site.lat)],
      getRadius: (site) => {
        const selected = selectedSite?.SITEID === site.SITEID;
        const { bands, technologies } = getSiteMapLabel(site);
        const isMultiBand = bands.length > 1;
        const isMultiTech = technologies.length > 1;
        const highlighted =
          selected ||
          siteHasSelectedPci(site) ||
          siteHasWorstCell(site) ||
          siteHasWorstSite(site) ||
          (showPredictions && predictionBySite.has(normalizeKey(site?.SITEID))) ||
          severityOrder[showAlarms ? getWorstAlarmSeverity(site) : "NORMAL"] > 0;
        const baseSiteRadius = highlighted ? (selected ? 9 : 7) : (isMultiBand || isMultiTech ? 6 : 5);
        return baseSiteRadius * siteMarkerScale;
      },
      getFillColor: (site) => getDeckSiteColor(site, selectedSite?.SITEID === site.SITEID),
      getLineColor: (site) => (
        selectedSite?.SITEID === site.SITEID ||
          (selectedPci && normalizeKey(site?.SITEID) === normalizeKey(selectedPciSiteId))
          ? [250, 204, 21, 255]
          : [255, 255, 255, 255]
      ),
      getLineWidth: (site) => (
        selectedSite?.SITEID === site.SITEID ||
          (selectedPci && normalizeKey(site?.SITEID) === normalizeKey(selectedPciSiteId))
          ? 3
          : 2
      ),
      lineWidthUnits: "pixels",
      updateTriggers: {
        getRadius: [selectedSite?.SITEID, selectedPci, selectedPciSiteId, showWorstSites, showPredictions, showAlarms, worstCells.length, displayPredictions.length, alarms.length, siteMarkerScale],
        getFillColor: [selectedSite?.SITEID, selectedPci, selectedPciSiteId, showWorstSites, showPredictions, showAlarms, worstCells.length, displayPredictions.length, alarms.length],
        getLineColor: [selectedSite?.SITEID, selectedPci, selectedPciSiteId],
        getLineWidth: [selectedSite?.SITEID, selectedPci, selectedPciSiteId],
      },
      onClick: ({ object }) => {
        if (object) handleSiteMarkerClick(object);
      },
      onHover: ({ object, coordinate }) => {
        if (!object) {
          if (miniTooltipRef.current) {
            miniTooltipRef.current.close();
            miniTooltipRef.current = null;
          }
          return;
        }
        if (!miniTooltipRef.current) {
          miniTooltipRef.current = new window.google.maps.InfoWindow({
            pixelOffset: new window.google.maps.Size(0, -16),
          });
        }
        miniTooltipRef.current.setContent(createSiteInfoWindow(object));
        miniTooltipRef.current.setPosition({ lat: coordinate[1], lng: coordinate[0] });
        miniTooltipRef.current.open(map);
      },
    });

    const cellLayer = new PolygonLayer({
      id: "deck-cells",
      data: deckCells,
      pickable: true,
      stroked: true,
      filled: true,
      getPolygon: (cell) => {
        const layer = getCellLayer(cell);
        const radius = Math.max(4, baseRadius * getLayerMultiplier(layer) * getBandFrequencyScale(cell));
        return createCellTriangle(cell.lat, cell.lon, cell.AZIMUTH, radius, 65).map((point) => [point.lng, point.lat]);
      },
      getFillColor: (cell) => {
        const layer = getCellLayer(cell);
        const sector = getCellSector(cell);
        const colors = getCellOverlayColors(cell, layer, sector);
        return hexToRgba(colors.fill, Math.round((colors.opacity || 0.35) * 255));
      },
      getLineColor: (cell) => {
        const layer = getCellLayer(cell);
        const sector = getCellSector(cell);
        return hexToRgba(getCellOverlayColors(cell, layer, sector).stroke, 230);
      },
      getLineWidth: (cell) => {
        const selected =
          selectedCell?.Cell_Name === cell.Cell_Name ||
          cellMatchesVisibleSelectedPci(cell);
        return selected ? 2.5 : 1.2;
      },
      lineWidthUnits: "pixels",
      updateTriggers: {
        getPolygon: [zoomLevel, baseRadius, cellRadiusScale],
        getFillColor: [selectedPci, pciLayerMode, worstCells.length],
        getLineColor: [selectedPci, pciLayerMode, worstCells.length],
        getLineWidth: [selectedCell?.Cell_Name, selectedPci, pciLayerMode],
      },
      onClick: ({ object, coordinate }) => {
        if (!object) return;
        if (miniTooltipRef.current) {
          miniTooltipRef.current.close();
          miniTooltipRef.current = null;
        }
        infoWindowRef.current.setContent(createCellInfoWindow(object));
        infoWindowRef.current.setPosition({ lat: coordinate[1], lng: coordinate[0] });
        infoWindowRef.current.open(map);
        setSelectedCell(object);
        setSelectedSite(object.__site || null);
        if (object.PCI && object.PCI !== "-") {
          setSelectedPci(String(object.PCI));
          setSelectedPciSiteId(String(object.SITEID || object.__site?.SITEID || ""));
        }
      },
      onHover: ({ object, coordinate }) => {
        if (!object) {
          if (miniTooltipRef.current) {
            miniTooltipRef.current.close();
            miniTooltipRef.current = null;
          }
          return;
        }
        if (!miniTooltipRef.current) {
          miniTooltipRef.current = new window.google.maps.InfoWindow({
            pixelOffset: new window.google.maps.Size(0, -12),
          });
        }
        miniTooltipRef.current.setContent(createCellInfoWindow(object));
        miniTooltipRef.current.setPosition({ lat: coordinate[1], lng: coordinate[0] });
        miniTooltipRef.current.open(map);
      },
    });

    const worstCellLayer = new ScatterplotLayer({
      id: "deck-worst-cells",
      data: worstCellMapItems,
      pickable: true,
      stroked: true,
      filled: true,
      radiusUnits: "pixels",
      getPosition: (item) => [Number(item.__lon), Number(item.__lat)],
      getRadius: (item) => {
        const rank = Number(item.__rank || 99);
        return rank <= 5 ? 12 : rank <= 10 ? 10 : 8;
      },
      getFillColor: [220, 38, 38, 245],
      getLineColor: [255, 255, 255, 255],
      getLineWidth: 3,
      lineWidthUnits: "pixels",
      onClick: ({ object }) => {
        if (!object) return;
        if (miniTooltipRef.current) {
          miniTooltipRef.current.close();
          miniTooltipRef.current = null;
        }
        const cell = object.__cell;
        const site = object.__site;
        if (cell) {
          infoWindowRef.current.setContent(createWorstCellInfoWindow(object));
          infoWindowRef.current.setPosition({ lat: Number(object.__lat), lng: Number(object.__lon) });
          infoWindowRef.current.open(map);
          setSelectedCell(cell);
          setSelectedSite(site || null);
        } else if (site) {
          handleSiteMarkerClick(site);
        }
      },
      onHover: ({ object, coordinate }) => {
        if (!infoWindowRef.current || infoWindowRef.current.getMap()) return;
        if (!object) {
          if (miniTooltipRef.current) {
            miniTooltipRef.current.close();
            miniTooltipRef.current = null;
          }
          return;
        }
        if (!miniTooltipRef.current) {
          miniTooltipRef.current = new window.google.maps.InfoWindow({
            pixelOffset: new window.google.maps.Size(0, -18),
          });
        }
        miniTooltipRef.current.setContent(`
          <div style="padding: 8px 10px; font-family: -apple-system, system-ui; background: white; border-radius: 10px; border: 2px solid #DC2626; box-shadow: 0 8px 18px rgba(220,38,38,0.25);">
            <div style="font-size: 11px; font-weight: 900; color: #DC2626; text-transform: uppercase;">Worst Cell #${object.__rank || "-"}</div>
            <div style="margin-top: 3px; font-size: 12px; font-weight: 800; color: #111827;">${object.cellName || object.cell || object.__cell?.Cell_Name || "Unknown cell"}</div>
            <div style="margin-top: 2px; font-size: 11px; color: #64748B;">${object.site || object.__site?.Site_Name || ""}</div>
            ${object.__approximate ? `<div style="margin-top: 6px; border-radius: 6px; background: #FEF2F2; padding: 5px 6px; font-size: 10px; font-weight: 800; color: #B91C1C;">Approximate position: KPI cell did not match the selected site map.</div>` : ""}
          </div>
        `);
        miniTooltipRef.current.setPosition({ lat: coordinate[1], lng: coordinate[0] });
        miniTooltipRef.current.open(map);
      },
    });

    const worstCellLabelLayer = new TextLayer({
      id: "deck-worst-cell-labels",
      data: worstCellMapItems,
      pickable: false,
      getPosition: (item) => [Number(item.__lon), Number(item.__lat)],
      getText: (item) => (Number(item.__rank || 99) <= 9 ? String(item.__rank) : "WC"),
      getSize: 11,
      getColor: [255, 255, 255, 255],
      getTextAnchor: "middle",
      getAlignmentBaseline: "center",
      fontWeight: 900,
      background: false,
    });

    const predictionLayer = new ScatterplotLayer({
      id: "deck-predictions",
      data: predictionMapItems,
      pickable: true,
      stroked: true,
      filled: true,
      radiusUnits: "pixels",
      getPosition: (prediction) => [Number(prediction.__lon), Number(prediction.__lat)],
      getRadius: (prediction) => {
        const severity = severityOrder[prediction.__severity] ?? 0;
        return 10 + Math.min(8, severity * 2);
      },
      getFillColor: (prediction) => hexToRgba(predictionActionColors[prediction.__actionCode], 235),
      getLineColor: () => [255, 255, 255, 255],
      getLineWidth: () => 2,
      lineWidthUnits: "pixels",
      updateTriggers: {
        getRadius: [predictionMapItems.length],
        getFillColor: [predictionMapItems.length],
      },
      onClick: ({ object, coordinate }) => {
        if (!object) return;
        const actionColor = predictionActionColors[object.__actionCode] || predictionActionColors.OBSERVE;
        if (object.__site) {
          setSelectedSite(object.__site);
        }
        if (!infoWindowRef.current) {
          infoWindowRef.current = new window.google.maps.InfoWindow();
        }
        infoWindowRef.current.setContent(`
          <div style="width: 310px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            <div style="font-size: 11px; font-weight: 900; color: ${actionColor}; text-transform: uppercase; margin-bottom: 5px;">
              ${String(object.__actionCode).replaceAll("_", " ")}
            </div>
            <div style="font-size: 17px; font-weight: 900; color: #0F172A; margin-bottom: 6px;">
              ${object.site || object.siteName || object.__site?.Site_Name || object.cellName || "Prediction"}
            </div>
            ${object.__approximate ? `<div style="background:#FEF3C7;color:#92400E;border-radius:8px;padding:7px 9px;font-size:11px;font-weight:800;margin-bottom:8px;">Approximate marker: prediction was placed near a site because an exact KPI/site-map match was not found.</div>` : ""}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:9px;">
              <div style="background:#F8FAFC;border-radius:9px;padding:8px;font-size:11px;color:#64748B;">Cell<br/><strong style="font-size:13px;color:#0F172A;">${object.cellName || object.cell || object.targetCell || "-"}</strong></div>
              <div style="background:#F8FAFC;border-radius:9px;padding:8px;font-size:11px;color:#64748B;">Severity<br/><strong style="font-size:13px;color:${actionColor};">${object.__severity || "NORMAL"}</strong></div>
            </div>
            <div style="background:#F8FAFC;border-radius:10px;padding:10px;font-size:12px;color:#334155;line-height:1.45;">
              ${object.reason || object.action || "Review site prediction recommendation."}
            </div>
          </div>
        `);
        infoWindowRef.current.setPosition({ lat: coordinate[1], lng: coordinate[0] });
        infoWindowRef.current.open(map);
        map.panTo({ lat: coordinate[1], lng: coordinate[0] });
      },
    });

    const predictionLabelLayer = new TextLayer({
      id: "deck-prediction-labels",
      data: zoomLevel >= 12 ? predictionMapItems : [],
      pickable: false,
      getPosition: (prediction) => [Number(prediction.__lon), Number(prediction.__lat)],
      getText: (prediction) => predictionActionLabels[prediction.__actionCode] || "P",
      getSize: 11,
      getColor: [255, 255, 255, 255],
      getTextAnchor: "middle",
      getAlignmentBaseline: "center",
      fontWeight: 900,
      background: false,
    });

    const intelligenceHotspotLayer =
      visibleSiteIntelligenceMapItems.length > 0
        ? new ScatterplotLayer({
            id: "deck-intelligence-hotspots",
            data: visibleSiteIntelligenceMapItems,
            pickable: true,
            stroked: true,
            filled: true,
            radiusUnits: "pixels",
            getPosition: (item) => [Number(item.__lon), Number(item.__lat)],
            getRadius: (item) => 7 + Math.min(11, Number(item.__issueScore || item.__impactScore || 0) / 9),
            getFillColor: (item) => hexToRgba(item.__issueColor || "#6366F1", 150),
            getLineColor: (item) => hexToRgba(item.__issueColor || "#6366F1", 245),
            getLineWidth: 2,
            lineWidthUnits: "pixels",
            onClick: ({ object }) => {
              if (!object) return;
              const site = object.__resolvedSite || resolveMapSite(object.site || object.siteName || object.siteId);
              if (site) {
                handleSiteMarkerClick(site);
              }
            },
            onHover: ({ object, coordinate }) => {
              if (!object) {
                if (miniTooltipRef.current) {
                  miniTooltipRef.current.close();
                  miniTooltipRef.current = null;
                }
                return;
              }
              if (!miniTooltipRef.current) {
                miniTooltipRef.current = new window.google.maps.InfoWindow({
                  pixelOffset: new window.google.maps.Size(0, -16),
                });
              }
              miniTooltipRef.current.setContent(`
                <div style="padding: 8px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: white; border-radius: 10px; border: 2px solid ${object.__issueColor}; box-shadow: 0 8px 18px rgba(15,23,42,0.18);">
                  <div style="font-size: 11px; font-weight: 900; color: ${object.__issueColor}; text-transform: uppercase;">${object.__issueLabel} / ${String(object.status || "NORMAL").toUpperCase()}</div>
                  <div style="margin-top: 3px; font-size: 12px; font-weight: 800; color: #111827;">${object.site || object.siteName || object.siteId || "-"}</div>
                  <div style="margin-top: 2px; font-size: 11px; color: #64748B;">Impact ${Number(object.__impactScore || 0).toFixed(1)}% • PCI ${Number(Math.max(object.pciCollisionScore || 0, object.pciConfusionScore || 0)).toFixed(1)}% • HO ${Number(object.handoverRisk || 0).toFixed(1)}% • OVR ${Number(object.overshootingScore || 0).toFixed(1)}%</div>
                  <div style="margin-top: 4px; font-size: 10px; color: #475569;">Click to open the site</div>
                </div>
              `);
              miniTooltipRef.current.setPosition({ lat: coordinate[1], lng: coordinate[0] });
              miniTooltipRef.current.open(map);
            },
          })
        : null;

    const intelligenceHotspotLabelLayer =
      visibleSiteIntelligenceMapItems.length > 0
        ? new TextLayer({
            id: "deck-intelligence-hotspot-labels",
            data: visibleSiteIntelligenceMapItems,
            pickable: false,
            getPosition: (item) => [Number(item.__lon), Number(item.__lat)],
            getText: (item) => item.__issueShortLabel || item.__issueLabel || "IMP",
            getSize: 11,
            getColor: [255, 255, 255, 255],
            getTextAnchor: "middle",
            getAlignmentBaseline: "center",
            fontWeight: 900,
            background: true,
            backgroundColor: [15, 23, 42, 190],
            backgroundPadding: [4, 2],
          })
        : null;

      deckOverlayRef.current.setProps({
        layers: [
          showCells ? cellLayer : null,
          siteLayer,
          intelligenceHotspotLayer,
          intelligenceHotspotLabelLayer,
          handoverLineLayer,
          handoverLabelLayer,
          worstCellMapItems.length > 0 ? worstCellLayer : null,
          worstCellMapItems.length > 0 ? worstCellLabelLayer : null,
          showPredictions ? predictionLayer : null,
          showPredictions ? predictionLabelLayer : null,
        ].filter(Boolean),
    });
  }, [
    map,
    useDeckRendering,
    filteredSites,
    deckCells,
    worstCellMapItems,
    predictionMapItems,
    showCells,
    zoomLevel,
    visibleHandoverRelationItems,
    selectedSite,
    selectedCell,
    selectedPci,
    selectedPciSiteId,
    showWorstSites,
    showPredictions,
    showAlarms,
    activeMapPanel,
    visibleSiteIntelligenceMapItems,
    handoverOverlayEnabled,
    siteMarkerScale,
    worstCells.length,
    displayPredictions.length,
    alarms.length,
    getBaseRadiusByZoom,
    getLayerMultiplier,
    createCellTriangle,
    getCellOverlayColors,
    getDeckSiteColor,
    getWorstAlarmSeverity,
    siteHasSelectedPci,
    siteHasWorstCell,
    siteHasWorstSite,
    predictionBySite,
    handleSiteMarkerClick,
    createCellInfoWindow,
    createWorstCellInfoWindow,
    getCellLayer,
    getCellSector,
    cellMatchesVisibleSelectedPci,
  ]);

  useEffect(() => {
    handoverPolylinesRef.current.forEach((polyline) => polyline.setMap(null));
    handoverPolylinesRef.current.clear();

    if (!map || !window.google || visibleHandoverRelationItems.length === 0) return;

    visibleHandoverRelationItems.forEach((item, index) => {
      const polyline = new window.google.maps.Polyline({
        path: [
          { lat: Number(item.sourcePosition[1]), lng: Number(item.sourcePosition[0]) },
          { lat: Number(item.targetPosition[1]), lng: Number(item.targetPosition[0]) },
        ],
        geodesic: true,
        strokeColor: item.categoryColor || item.color,
        strokeOpacity: 0.85,
        strokeWeight: item.width,
        map,
        zIndex: 91000 + index,
      });

      polyline.addListener("click", () => {
        if (item.targetSite) {
          handleSiteMarkerClick(item.targetSite);
        }
      });

      polyline.addListener("mouseover", () => {
        if (!miniTooltipRef.current) {
          miniTooltipRef.current = new window.google.maps.InfoWindow({
            pixelOffset: new window.google.maps.Size(0, -14),
          });
        }
        miniTooltipRef.current.setContent(`
          <div style="padding: 8px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: white; border-radius: 10px; border: 2px solid ${item.color}; box-shadow: 0 8px 18px rgba(15,23,42,0.18);">
            <div style="font-size: 11px; font-weight: 900; color: ${item.categoryColor || item.color}; text-transform: uppercase;">${item.handoverCategory || "NEIGHBOR"} HANDOVER</div>
            <div style="margin-top: 3px; font-size: 12px; font-weight: 800; color: #111827;">${item.sourceSite?.Site_Name || item.sourceSite?.SITEID || "-"} → ${item.targetSite?.Site_Name || item.targetSite?.SITEID || "-"}</div>
            <div style="margin-top: 2px; font-size: 11px; color: #64748B;">${Number(item.distanceKm || 0).toFixed(2)} km • Score ${Number(item.relationScore || 0).toFixed(0)}</div>
            <div style="margin-top: 4px; font-size: 10px; color: #475569;">Click to open the target site</div>
          </div>
        `);
        miniTooltipRef.current.setPosition({
          lat: (Number(item.sourcePosition[1]) + Number(item.targetPosition[1])) / 2,
          lng: (Number(item.sourcePosition[0]) + Number(item.targetPosition[0])) / 2,
        });
        miniTooltipRef.current.open(map);
      });
      
      polyline.addListener("mouseout", () => {
        if (miniTooltipRef.current) {
          miniTooltipRef.current.close();
          miniTooltipRef.current = null;
        }
      });

      handoverPolylinesRef.current.set(`${item.targetSite?.SITEID || index}`, polyline);
    });
  }, [map, activeMapPanel, visibleHandoverRelationItems, handleSiteMarkerClick]);

  // Render cells
  useEffect(() => {
    if (useDeckRendering) {
      cellPolygonsRef.current.forEach((polygon) => polygon.setMap(null));
      cellPolygonsRef.current.clear();
      return;
    }
    if (!map || !window.google) return;

    cellPolygonsRef.current.forEach((polygon) => polygon.setMap(null));
    cellPolygonsRef.current.clear();

    if (!showCells) return;

    const sitesToShow = filteredSites;

    if (sitesToShow.length === 0) return;

    const baseRadius = getBaseRadiusByZoom(zoomLevel);

    sitesToShow.forEach((site) => {
      const sortedCells = [...site.cells].sort((a, b) => {
        const aSelectedPci = cellMatchesVisibleSelectedPci(a);
        const bSelectedPci = cellMatchesVisibleSelectedPci(b);
        if (aSelectedPci !== bSelectedPci) {
          return aSelectedPci ? 1 : -1;
        }

        const aWorst = worstCellLookup.has(normalizeKey(a.Cell_Name));
        const bWorst = worstCellLookup.has(normalizeKey(b.Cell_Name));
        if (aWorst !== bWorst) {
          return aWorst ? 1 : -1;
        }

        const layerA = getCellLayer(a);
        const layerB = getCellLayer(b);
        return layerB - layerA;
      });

      sortedCells.forEach((cell) => {
        const cellKey = cell.Cell_ID;
        const layer = getCellLayer(cell);
        const sector = getCellSector(cell);
        const layerMultiplier = getLayerMultiplier(layer);
        const frequencyScale = getBandFrequencyScale(cell);
        const radius = Math.max(4, baseRadius * layerMultiplier * frequencyScale);
        const colors = getCellOverlayColors(cell, layer, sector);
        const isSelectedPciCell = cellMatchesVisibleSelectedPci(cell);
        const isWorstCell = worstCellLookup.has(normalizeKey(cell.Cell_Name));
        const zIndex = isSelectedPciCell ? 30000 : isWorstCell ? 20000 : getZIndexByLayer(layer);

        const vertices = createCellTriangle(
          cell.lat,
          cell.lon,
          cell.AZIMUTH,
          radius,
          65
        );

        const polygon = new window.google.maps.Polygon({
          paths: vertices,
          strokeColor: colors.stroke,
          strokeOpacity: 0.8,
          strokeWeight: 1.5,
          fillColor: colors.fill,
          fillOpacity: colors.opacity,
          map: map,
          zIndex: zIndex,
          clickable: true,
        });

        polygon.cellData = cell;

        // MODIFIED: Click listener - close any open mini tooltip first
        polygon.addListener("click", (event) => {
          // Close any existing mini tooltip
          if (miniTooltipRef.current) {
            miniTooltipRef.current.close();
            miniTooltipRef.current = null;
          }

          // Close all mini tooltips on polygons
          cellPolygonsRef.current.forEach((p) => {
            if (p.miniTooltip) {
              p.miniTooltip.close();
              p.miniTooltip = null;
            }
          });

          infoWindowRef.current.setContent(createCellInfoWindow(cell));
          infoWindowRef.current.setPosition(event.latLng);
          infoWindowRef.current.open(map);
          setSelectedCell(cell);
          if (cell.PCI && cell.PCI !== "-") {
            setSelectedPci(String(cell.PCI));
            setSelectedPciSiteId(String(cell.SITEID || site.SITEID || ""));
          }

          cellPolygonsRef.current.forEach((p) => {
            const pLayer = getCellLayer(p.cellData);
            const pSector = getCellSector(p.cellData);
            const pColors = getCellOverlayColors(p.cellData, pLayer, pSector);
            const pIsSelectedPci = cellMatchesVisibleSelectedPci(p.cellData);
            const pIsWorstCell = worstCellLookup.has(normalizeKey(p.cellData.Cell_Name));
            const pZIndex = pIsSelectedPci ? 30000 : pIsWorstCell ? 20000 : getZIndexByLayer(pLayer);

            if (p === polygon) {
              p.setOptions({
                strokeColor: pColors.stroke,
                strokeWeight: 3,
                fillColor: pColors.fill,
                fillOpacity: pColors.opacity + 0.2,
                zIndex: Math.max(pZIndex, 40000),
              });
            } else {
              p.setOptions({
                strokeColor: pColors.stroke,
                strokeWeight: 1.5,
                fillColor: pColors.fill,
                fillOpacity: pColors.opacity,
                zIndex: pZIndex,
              });
            }
          });
        });

        // MODIFIED: Hover effect - close mini tooltip if info window is open
        polygon.addListener("mouseover", () => {
          if (polygon.miniTooltip) {
            polygon.miniTooltip.close();
          }

          polygon.setOptions({
            strokeWeight: 2.5,
            fillOpacity: colors.opacity + 0.15,
            zIndex: 9999,
          });

          const tooltip = new window.google.maps.InfoWindow({
            content: createCellInfoWindow(cell),
            position: vertices[0],
            pixelOffset: new window.google.maps.Size(0, -10),
          });

          polygon.miniTooltip = tooltip;
          miniTooltipRef.current = tooltip;
          tooltip.open(map);
        });

        polygon.addListener("mouseout", () => {
          if (selectedCell?.Cell_Name !== cell.Cell_Name) {
            polygon.setOptions({
              strokeColor: colors.stroke,
              strokeWeight: 1.5,
              fillColor: colors.fill,
              fillOpacity: colors.opacity,
              zIndex: zIndex,
            });
          }

          if (polygon.miniTooltip) {
            polygon.miniTooltip.close();
            polygon.miniTooltip = null;
            if (miniTooltipRef.current === polygon.miniTooltip) {
              miniTooltipRef.current = null;
            }
          }
        });

        cellPolygonsRef.current.set(cellKey, polygon);
      });
    });
  }, [map, showCells, zoomLevel, filteredSites, getBaseRadiusByZoom, getCellLayer, getCellSector, getLayerMultiplier, getCellOverlayColors, getZIndexByLayer, createCellTriangle, createCellInfoWindow, cellMatchesVisibleSelectedPci]);

  useEffect(() => {
    pciMarkersRef.current.forEach((marker) => marker.setMap(null));
    pciMarkersRef.current.clear();
    // Extra offset PCI circle markers removed to keep map clean and prevent overlapping circle clutter.
    // PCI highlighting is handled cleanly directly on the sector polygons.
  }, [map, filteredSites, selectedPci, selectedPciSiteId]);

  useEffect(() => {
    alarmMarkersRef.current.forEach((marker) => marker.setMap(null));
    alarmMarkersRef.current.clear();

    if (!map || !window.google || !showAlarms || alarms.length === 0) return;

    filteredSites.forEach((site) => {
      const siteAlarms = getSiteAlarms(site);
      if (siteAlarms.length === 0) return;
      const severity = getWorstAlarmSeverity(site);
      const marker = new window.google.maps.Marker({
        position: { lat: site.lat, lng: site.lon },
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 4,
          fillColor: severityMarkerColors[severity] || "#2563EB",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
        },
        title: `${siteAlarms.length} alarm(s) at ${site.Site_Name}`,
        zIndex: 60000,
      });

      marker.addListener("click", () => {
        setSelectedSite(site);
        if (map) {
          map.panTo({ lat: site.lat, lng: site.lon });
          map.setZoom(Math.max(zoomLevel, 14));
        }
      });

      alarmMarkersRef.current.set(site.SITEID, marker);
    });
  }, [map, filteredSites, alarms, showAlarms, getSiteAlarms, getWorstAlarmSeverity, zoomLevel]);

  useEffect(() => {
    predictionMarkersRef.current.forEach((marker) => marker.setMap(null));
    predictionMarkersRef.current.clear();
    predictionLinesRef.current.forEach((line) => line.setMap(null));
    predictionLinesRef.current.clear();
    setPredictionMarkerCount(0);
    setPredictionApproxCount(0);

    if (useDeckRendering || !map || !window.google || !showPredictions || displayPredictions.length === 0) return;

    const actionColors = {
      LOAD_BALANCE: "#2563EB",
      QUALITY_CHECK: "#DC2626",
      CAPACITY_REVIEW: "#7C3AED",
      COVERAGE_CHECK: "#D97706",
      OBSERVE: "#059669",
    };

    const relationColors = {
      SAME_PCI: "#DC2626",
      OFFLOAD_TARGET: "#7C3AED",
      SAME_SITE_NEIGHBOUR: "#2563EB",
      NEARBY_NEIGHBOUR: "#059669",
    };

    const findPredictionSite = (prediction) => {
      const keys = [
        prediction.site,
        prediction.siteName,
        prediction.siteInfo?.siteId,
        prediction.siteInfo?.siteName,
        prediction.cellName,
        prediction.cell,
        baseCellKey(prediction.site),
        baseCellKey(prediction.siteName),
        baseCellKey(prediction.cellName),
        baseCellKey(prediction.cell),
      ].map(normalizeKey).filter(Boolean);

      const isMatch = (left, right) => (
        left === right ||
        (left.length >= 5 && right.includes(left)) ||
        (right.length >= 5 && left.includes(right))
      );

      return filteredSites.find((site) => {
        const siteKeys = [
          site.SITEID,
          site.Site_Name,
          baseCellKey(site.SITEID),
          baseCellKey(site.Site_Name),
        ].map(normalizeKey).filter(Boolean);
        const cellKeys = asArray(site.cells).flatMap((cell) => [
          normalizeKey(cell.Cell_Name),
          normalizeKey(cell.Cell_ID),
          baseCellKey(cell.Cell_Name),
          baseCellKey(cell.Cell_ID),
        ]).filter(Boolean);
        return keys.some((key) =>
          [...siteKeys, ...cellKeys].some((candidate) => isMatch(key, candidate))
        );
      });
    };

    let plottedCount = 0;
    let approxCount = 0;

    asArray(displayPredictions).forEach((prediction, index) => {
      const matchedSite = findPredictionSite(prediction);
      const fallbackSite = filteredSites.length > 0 ? filteredSites[index % filteredSites.length] : null;
      const site = matchedSite || fallbackSite;
      const isApproximate = !matchedSite && Boolean(fallbackSite);
      const lat = toNumber(prediction.siteInfo?.latitude) ?? toNumber(prediction.latitude) ?? site?.lat;
      const lon = toNumber(prediction.siteInfo?.longitude) ?? toNumber(prediction.longitude) ?? site?.lon;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

      const actionCode = String(prediction.actionCode || "OBSERVE").toUpperCase();
      const severity = String(prediction.severity || "NORMAL").toUpperCase();
      const markerPosition = destinationPoint(lat, lon, 35 + (index % 8) * 45, site ? 80 : 0);
      const markerColor = actionColors[actionCode] || actionColors.OBSERVE;
      const neighbours = asArray(prediction.neighborCandidates).slice(0, 5);
      const marker = new window.google.maps.Marker({
        position: markerPosition,
        map,
        icon: {
          path: "M 0,-16 L 16,0 L 0,16 L -16,0 Z",
          scale: 1,
          fillColor: markerColor,
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 3,
        },
        label: {
          text: "P",
          color: "#FFFFFF",
          fontSize: "12px",
          fontWeight: "900",
        },
        title: `${String(actionCode).replaceAll("_", " ")} - ${prediction.site || prediction.cellName || site?.Site_Name || "Prediction"}`,
        zIndex: 90000 + index,
      });

      neighbours.forEach((neighbour, neighbourIndex) => {
        const neighbourLat = toNumber(neighbour.latitude);
        const neighbourLon = toNumber(neighbour.longitude);
        if (!Number.isFinite(neighbourLat) || !Number.isFinite(neighbourLon)) return;
        const relationType = String(neighbour.relationType || "NEARBY_NEIGHBOUR").toUpperCase();
        const line = new window.google.maps.Polyline({
          path: [
            { lat, lng: lon },
            { lat: neighbourLat, lng: neighbourLon },
          ],
          geodesic: true,
          strokeColor: relationColors[relationType] || "#64748B",
          strokeOpacity: relationType === "SAME_PCI" ? 0.9 : 0.55,
          strokeWeight: relationType === "SAME_PCI" ? 3 : 2,
          map,
          zIndex: relationType === "SAME_PCI" ? 85000 : 70000,
        });
        predictionLinesRef.current.set(`${prediction.site || prediction.cellName || "prediction"}-${index}-n-${neighbourIndex}`, line);
      });

      marker.addListener("click", () => {
        if (site) {
          setSelectedSite(site);
        }
        infoWindowRef.current?.close();
        if (!infoWindowRef.current) {
          infoWindowRef.current = new window.google.maps.InfoWindow();
        }
        const neighbourRows = neighbours.length > 0
          ? neighbours.map((neighbour, neighbourIndex) => `
              <div style="display: flex; justify-content: space-between; gap: 8px; border-top: 1px solid #E2E8F0; padding-top: 6px; margin-top: 6px;">
                <div>
                  <div style="font-size: 11px; font-weight: 800; color: ${(relationColors[String(neighbour.relationType || "").toUpperCase()] || "#475569")};">
                    ${neighbourIndex + 1}. ${String(neighbour.relationType || "NEIGHBOUR").replaceAll("_", " ")}
                  </div>
                  <div style="font-size: 12px; color: #0F172A; font-weight: 700;">${neighbour.cellName || neighbour.siteName || "-"}</div>
                  <div style="font-size: 11px; color: #64748B;">PCI ${neighbour.pci ?? "-"} • Az ${neighbour.azimuth ?? "-"}° • Δ ${neighbour.azimuthDelta ?? "-"}°</div>
                </div>
                <div style="font-size: 12px; color: #DC2626; font-weight: 800; white-space: nowrap;">${neighbour.distanceKm ?? "-"} km</div>
              </div>
            `).join("")
          : `<div style="font-size: 12px; color: #64748B; margin-top: 8px;">No nearby neighbour candidates found in site master data.</div>`;
        infoWindowRef.current.setContent(`
          <div style="width: 300px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            <div style="font-size: 11px; font-weight: 800; color: ${markerColor}; text-transform: uppercase; margin-bottom: 4px;">
              ${String(actionCode).replaceAll("_", " ")}
            </div>
            <div style="font-size: 16px; font-weight: 800; color: #0F172A; margin-bottom: 6px;">
              ${prediction.site || prediction.siteName || site?.Site_Name || "Prediction"}
            </div>
            ${isApproximate ? `<div style="background: #FEF3C7; color: #92400E; border-radius: 8px; padding: 7px 9px; font-size: 11px; font-weight: 700; margin-bottom: 8px;">Approximate map position: prediction did not match site coordinates.</div>` : ""}
            <div style="font-size: 12px; color: #475569; margin-bottom: 8px;">
              Cell: <strong>${prediction.cellName || prediction.cell || prediction.targetCell || "-"}</strong> • Severity: <strong>${severity}</strong>
            </div>
            <div style="background: #F8FAFC; border-radius: 10px; padding: 10px; font-size: 12px; color: #334155; line-height: 1.45;">
              ${prediction.reason || prediction.action || "Review site prediction recommendation."}
            </div>
            ${prediction.targetCell ? `<div style="margin-top: 8px; font-size: 12px; color: #475569;">Target cell: <strong>${prediction.targetCell}</strong></div>` : ""}
            <div style="margin-top: 10px;">
              <div style="font-size: 11px; font-weight: 900; color: #0F172A; text-transform: uppercase;">Neighbours / PCI / LB Candidates</div>
              ${neighbourRows}
            </div>
          </div>
        `);
        infoWindowRef.current.setPosition(markerPosition);
        infoWindowRef.current.open(map);
        map.panTo(markerPosition);
        map.setZoom(Math.max(zoomLevel, 14));
      });

      predictionMarkersRef.current.set(`${prediction.site || prediction.cellName || "prediction"}-${index}`, marker);
      plottedCount += 1;
      if (isApproximate) approxCount += 1;
    });

    setPredictionMarkerCount(plottedCount);
    setPredictionApproxCount(approxCount);
  }, [map, filteredSites, displayPredictions, showPredictions, zoomLevel, destinationPoint, useDeckRendering]);

  const handleSiteClick = useCallback((site) => {
    handleSiteMarkerClick(site);
  }, [handleSiteMarkerClick]);

  const handleWorstCellClick = useCallback((row) => {
    const cellKey = normalizeKey(row?.cellName || row?.cell);
    const markerItem = worstCellMapItems.find((item) => (
      normalizeKey(item.cellName || item.cell || item.__cell?.Cell_Name) === cellKey ||
      normalizeKey(item.__cell?.Cell_Name) === cellKey
    ));
    const site =
      markerItem?.__site ||
      filteredSites.find((item) => item.cells.some((cell) => normalizeKey(cell.Cell_Name) === cellKey)) ||
      filteredSites.find((item) => normalizeKey(item.SITEID) === normalizeKey(row?.site) || normalizeKey(item.Site_Name) === normalizeKey(row?.site));

    if (!site) return;
    handleSiteMarkerClick(site);
    const cell = markerItem?.__cell || site.cells.find((item) => normalizeKey(item.Cell_Name) === cellKey);
    if (cell) {
      setSelectedCell(cell);
    }
    if (map && markerItem) {
      map.panTo({ lat: Number(markerItem.__lat), lng: Number(markerItem.__lon) });
      map.setZoom(Math.max(zoomLevel, 15));
      infoWindowRef.current.setContent(createWorstCellInfoWindow(markerItem));
      infoWindowRef.current.setPosition({ lat: Number(markerItem.__lat), lng: Number(markerItem.__lon) });
      infoWindowRef.current.open(map);
    }
  }, [filteredSites, handleSiteMarkerClick, map, worstCellMapItems, zoomLevel, createWorstCellInfoWindow]);

  const handlePredictionItemClick = useCallback((item) => {
    const predictionSite = item?.site || item?.siteName || item?.siteInfo?.siteId || item?.siteInfo?.siteName;
    const predictionCell = item?.cellName || item?.cell || item?.sourceCell || item?.targetCell;
    const mapSite = uniqueSites.find((site) =>
      normalizeKey(site.SITEID) === normalizeKey(predictionSite) ||
      normalizeKey(site.Site_Name) === normalizeKey(predictionSite) ||
      site.cells.some((cell) => normalizeKey(cell.Cell_Name) === normalizeKey(predictionCell))
    );
    if (mapSite) {
      handleSiteMarkerClick(mapSite);
    }
  }, [handleSiteMarkerClick, uniqueSites]);

  if (loading && !selectedSiteFileId && siteUploads.length === 0) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-white">
        <div className="relative text-center p-8 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl max-w-md">
          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/20">
            <Radio className="h-10 w-10 text-white" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex h-4 w-4 rounded-full bg-blue-500 border-2 border-slate-950"></span>
            </span>
          </div>
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
          <h2 className="text-xl font-black tracking-tight text-white">
            Loading Network Data...
          </h2>
          <p className="text-slate-400 text-xs mt-2 leading-relaxed">
            Fetching cell tower telemetry & Spatial coverage parameters
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-slate-950 text-slate-100">
      <MapHeader
        sidebarOpen={sidebarOpen}
        drawerMode={drawerMode}
        analyticsDrawerOpen={analyticsDrawerOpen}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onOpenFilter={handleOpenFilter}
        onOpenAnalytics={handleOpenAnalytics}
        siteMarkerScale={cellRadiusScale}
        cellRadiusScale={siteMarkerScale}
        onDecreaseSiteSize={() => setCellRadiusScale((value) => clampMapScale(Number((value - 0.1).toFixed(2))))}
        onIncreaseSiteSize={() => setCellRadiusScale((value) => clampMapScale(Number((value + 0.1).toFixed(2))))}
        onSiteSizeChange={(value) => setCellRadiusScale(clampMapScale(value))}
        onResetSiteSize={() => setCellRadiusScale(1)}
        onDecreaseCellRadius={() => setSiteMarkerScale((value) => clampMapScale(Number((value - 0.1).toFixed(2))))}
        onIncreaseCellRadius={() => setSiteMarkerScale((value) => clampMapScale(Number((value + 0.1).toFixed(2))))}
        onCellRadiusChange={(value) => setSiteMarkerScale(clampMapScale(value))}
        onResetCellRadius={() => setSiteMarkerScale(1)}
        onDownloadPdf={handleDownloadMapPdf}
        exportingPdf={exportingMapPdf}
      />

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
            } absolute bottom-0 left-0 top-0 z-20 w-[420px] max-w-[92vw] transition-transform duration-300 ease-in-out bg-slate-950/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col border-r border-slate-800/80`}
        >
          {/* Sidebar Header */}
          <div className="bg-slate-950 p-4 text-white border-b border-slate-800/80">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20">
                  <Radio className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-tight text-white">{drawerMode === "filter" ? "Network Control & Filter" : "Network Analytics"}</h1>
                  <p className="text-slate-400 text-xs">
                    {drawerMode === "filter" ? "Data layer configuration & spatial filters" : "KPI, prediction, alarm, and site insights"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white border border-slate-800"
                title="Close panel"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-3 shadow-inner">
                <div className="mb-1 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sites</span>
                </div>
                <p className="text-xl font-black text-white">{filteredSites.length}</p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-3 shadow-inner">
                <div className="mb-1 flex items-center gap-1.5">
                  <Signal className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cells</span>
                </div>
                <p className="text-xl font-black text-white">{filteredCellCount}</p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-3 shadow-inner">
                <div className="mb-1 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Plotted</span>
                </div>
                <p className="text-xl font-black text-emerald-400">{filteredCellCount}</p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-3 shadow-inner">
                <div className="mb-1 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">No Lat/Lon</span>
                </div>
                <p className="text-xl font-black text-amber-400">{missingCoordinateRows}</p>
              </div>
            </div>
          </div>

          {/* Data filter */}
          {drawerMode === "filter" && (
            <div
              ref={sidebarContentRef}
              className="relative max-h-[calc(100vh-285px)] overflow-y-auto border-b border-slate-800 bg-slate-950 scroll-smooth"
            >
              <div className="sticky top-0 z-30 flex justify-end gap-2 bg-slate-950/95 px-4 py-2 backdrop-blur">
                <button
                  type="button"
                  onClick={() => scrollSidebarContent("up")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 shadow-sm hover:border-blue-500 hover:text-white"
                  title="Scroll filter up"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollSidebarContent("down")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 shadow-sm hover:border-blue-500 hover:text-white"
                  title="Scroll filter down"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <MapFilterPanel
                fetchError={fetchError}
                totalSiteRows={totalSiteRows}
                missingCoordinateRows={missingCoordinateRows}
                mapDataCount={mapData.length}
                siteUploads={siteUploads}
                selectedSiteFileId={selectedSiteFileId}
                onSiteFileChange={handleSiteFileChange}
                uploads={uploads}
                selectedFileId={selectedFileId}
                onKpiFileChange={handleKpiFileChange}
                metrics={kpiMetricOptions}
                selectedMetric={selectedMetric}
                onMetricChange={setSelectedMetric}
                technologyOptions={filterOptions.technologies}
                selectedTechnology={selectedTechnologyFilter}
                onTechnologyChange={setSelectedTechnologyFilter}
                bandOptions={filterOptions.bands}
                selectedBand={selectedBandFilter}
                onBandChange={setSelectedBandFilter}
                pciOptions={filterOptions.pcis}
                pciFilter={pciFilter}
                onPciFilterChange={setPciFilter}
                onClearDataFilters={clearDataFilters}
                showCells={showCells}
                onToggleCells={() => setShowCells(!showCells)}
              showWorstSites={showWorstSites}
              onToggleWorstSites={handleToggleWorstSites}
                showPredictions={showPredictions}
                onTogglePredictions={handleTogglePredictions}
                predictionSummary={activePredictionSummary}
                predictionItems={balancedDisplayPredictions}
                onPredictionClick={handlePredictionItemClick}
                formatNumber={formatNumber}
                lbPredictionControlProps={lbPredictionControlProps}
                showAlarms={showAlarms}
                onToggleAlarms={() => setShowAlarms(!showAlarms)}
                showTechHandovers={showTechHandovers}
                onToggleTechHandovers={() => setShowTechHandovers((value) => !value)}
                showBandHandovers={showBandHandovers}
                onToggleBandHandovers={() => setShowBandHandovers((value) => !value)}
                showPciHandovers={showPciHandovers}
                onTogglePciHandovers={() => setShowPciHandovers((value) => !value)}
                showPciIssues={showPciIssues}
                onTogglePciIssues={() => setShowPciIssues((value) => !value)}
                showOvershooting={showOvershooting}
                onToggleOvershooting={() => setShowOvershooting((value) => !value)}
                showMissingNeighbours={showMissingNeighbours}
                onToggleMissingNeighbours={() => setShowMissingNeighbours((value) => !value)}
              />
            </div>
          )}

          {drawerMode === "analytics" && (
            <div
              ref={sidebarContentRef}
              className="max-h-[calc(100vh-360px)] overflow-y-auto p-4 pr-3 border-b border-gray-200 bg-white space-y-3 scroll-smooth"
            >
              <div className="sticky top-0 z-20 -mx-1 mb-2 flex justify-end gap-2 bg-white/95 px-1 py-1 backdrop-blur">
                <button
                  type="button"
                  onClick={() => scrollSidebarContent("up")}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50"
                  title="Scroll up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => scrollSidebarContent("down")}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50"
                  title="Scroll down"
                >
                  ↓
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Site Upload File
                </label>
                <select
                  value={selectedSiteFileId}
                  onChange={(event) => handleSiteFileChange(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select Site Data file</option>
                  {siteUploads.map((upload) => (
                    <option key={`analytics-site-upload-${upload.id}`} value={upload.id}>
                      #{upload.id} - {upload.fileName}
                    </option>
                  ))}
                </select>
                {siteUploads.length === 0 && (
                  <p className="mt-1 text-[11px] font-medium text-amber-600">
                    No Site Data uploads found. Upload Site Data first.
                  </p>
                )}
              </div>

              <MapKpiSelector
                uploads={uploads}
                selectedFileId={selectedFileId}
                onKpiFileChange={handleKpiFileChange}
                metrics={kpiMetricOptions}
                selectedMetric={selectedMetric}
                onMetricChange={setSelectedMetric}
              />

              {showWorstSites && (
              <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-bold text-red-900">Worst Cells</span>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-red-700">
                    {loadingWorst ? "..." : worstCells.length}
                  </span>
                </div>
                {worstMessage && (
                  <p className="mt-2 text-xs text-red-700">{worstMessage}</p>
                )}
                {worstCells.length > 0 && (
                  <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                    {worstCells.slice(0, 10).map((row) => (
                      <button
                        key={`${row.rank}-${row.cellName || row.cell}`}
                        type="button"
                        onClick={() => handleWorstCellClick(row)}
                        className="w-full rounded-lg border border-red-100 bg-white p-2 text-left hover:border-red-300 hover:bg-red-50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-bold text-gray-900">
                            #{row.rank} {row.cellName || row.cell || "Unknown Cell"}
                          </span>
                          <span className="text-xs font-bold text-red-700">
                            {row.averageValue ?? "-"}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-gray-500">
                          <span className="truncate">{row.site || "Unknown Site"}</span>
                          <span>{row.severity || "NORMAL"}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              )}

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-bold text-slate-900">Site Analytics</span>
                  </div>
                  {loadingSiteAnalytics && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
                </div>
                {siteAnalyticsMessage && (
                  <p className="mb-3 text-xs font-semibold text-red-600">{siteAnalyticsMessage}</p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-white p-2 text-center">
                    <div className="text-[10px] font-bold uppercase text-slate-500">Sites</div>
                    <div className="text-lg font-black text-slate-900">{formatNumber(siteSummary?.siteCount)}</div>
                  </div>
                  <div className="rounded-lg bg-white p-2 text-center">
                    <div className="text-[10px] font-bold uppercase text-slate-500">Cells</div>
                    <div className="text-lg font-black text-slate-900">{formatNumber(siteAnalyticsTotals.cells)}</div>
                  </div>
                  <div className="rounded-lg bg-white p-2 text-center">
                    <div className="text-[10px] font-bold uppercase text-slate-500">Sectors</div>
                    <div className="text-lg font-black text-slate-900">{formatNumber(siteAnalyticsTotals.sectors)}</div>
                  </div>
                  <div className="rounded-lg bg-white p-2 text-center">
                    <div className="text-[10px] font-bold uppercase text-slate-500">Bands</div>
                    <div className="text-lg font-black text-slate-900">{formatNumber(siteAnalyticsTotals.bands.size)}</div>
                  </div>
                  <div className="rounded-lg bg-white p-2 text-center">
                    <div className="text-[10px] font-bold uppercase text-slate-500">Tech</div>
                    <div className="text-lg font-black text-slate-900">{formatNumber(siteAnalyticsTotals.technologies.size)}</div>
                  </div>
                  <div className="rounded-lg bg-red-50 p-2 text-center">
                    <div className="text-[10px] font-bold uppercase text-red-500">Critical</div>
                    <div className="text-lg font-black text-red-700">{formatNumber(statusCounts.CRITICAL)}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px] font-bold">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">Good {formatNumber(statusCounts.GOOD)}</div>
                  <div className="rounded-lg bg-amber-50 p-2 text-amber-700">Watch {formatNumber(statusCounts.WATCH)}</div>
                  <div className="rounded-lg bg-orange-50 p-2 text-orange-700">Bad {formatNumber(statusCounts.BAD)}</div>
                  <div className="rounded-lg bg-red-50 p-2 text-red-700">Critical {formatNumber(statusCounts.CRITICAL)}</div>
                </div>
                <div className="mt-3 rounded-lg bg-white p-2 text-[11px] leading-5 text-slate-600">
                  {activeMapPanel === "worstCells" && showWorstSites && "Worst Cells: red numbered WC markers show the lowest ranked KPI performers. Orange site markers show poor site health."}
                  {activeMapPanel === "worstCells" && !showWorstSites && "Worst Cells are hidden. Turn on the Worst Sites layer to show red WC markers and rankings."}
                  {activeMapPanel === "predictions" && "Predictions: purple markers show sites where the system recommends load balance, quality, capacity, or coverage actions."}
                  {activeMapPanel === "alarms" && "Alarms: red/orange/blue markers show open KPI alarms by severity for the selected KPI file."}
                </div>
              </div>

              {activeMapPanel === "worstCells" && showWorstSites && (
                <div className="rounded-lg border border-orange-100 bg-orange-50 p-3">
                  <div className="mb-3 rounded-lg bg-white p-2">
                    <MapKpiSelector
                      uploads={uploads}
                      selectedFileId={selectedFileId}
                      onKpiFileChange={handleKpiFileChange}
                      metrics={kpiMetricOptions}
                      selectedMetric={selectedMetric}
                      onMetricChange={setSelectedMetric}
                      compact
                    />
                    <div className="mt-2 rounded-lg bg-orange-50 px-2 py-1.5 text-[11px] font-bold text-orange-700">
                      Ranking method: selected single KPI.
                    </div>
                  </div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-bold text-orange-900">Worst Cell Analytics</span>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-orange-700">
                      {formatNumber(worstCells.length)} cells
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-white p-2">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Worst Cells</div>
                      <div className="text-base font-black text-red-700">{formatNumber(worstCells.length)}</div>
                    </div>
                    <div className="rounded-lg bg-white p-2">
                      <div className="text-[10px] font-bold uppercase text-slate-500">On Map</div>
                      <div className="text-base font-black text-red-700">{formatNumber(worstCellMapItems.length)}</div>
                    </div>
                    <div className="rounded-lg bg-white p-2">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Worst Sites</div>
                      <div className="text-base font-black text-orange-700">{formatNumber(worstSites.length)}</div>
                    </div>
                  </div>
                  {worstCells.length > 0 && worstCellMapItems.some((item) => item.__approximate) && (
                    <div className="mt-2 rounded-lg bg-red-100 px-2 py-1.5 text-[11px] font-bold text-red-700">
                      Some worst-cell markers are approximate because KPI cell names did not match the selected site map.
                    </div>
                  )}

                  <div className="mt-3 rounded-lg bg-white p-2">
                    <div className="mb-2 text-xs font-bold uppercase text-red-700">Worst Cells On Map</div>
                    {worstCells.length === 0 ? (
                      <p className="text-xs text-slate-500">Select one KPI metric to calculate worst cells.</p>
                    ) : (
                      <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                        {worstCells.slice(0, 10).map((row) => (
                          <button
                            key={`tab-${row.rank}-${row.cellName || row.cell}`}
                            type="button"
                            onClick={() => handleWorstCellClick(row)}
                            className="w-full rounded-lg border border-red-100 bg-red-50 p-2 text-left hover:border-red-300 hover:bg-red-100"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-xs font-bold text-slate-900">#{row.rank} {row.cellName || row.cell || "Unknown Cell"}</span>
                              <span className="text-xs font-bold text-red-700">{row.averageValue ?? "-"}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                              <span className="truncate">{row.site || "Unknown Site"}</span>
                              <span>{row.severity || "NORMAL"}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 rounded-lg bg-white p-2">
                    <div className="mb-2 text-xs font-bold uppercase text-orange-700">Worst Sites</div>
                    {worstSites.length === 0 ? (
                      <p className="text-xs text-slate-500">No site ranking found for this KPI file.</p>
                    ) : (
                      <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                        {worstSites.map((site) => (
                          <button
                            key={`${site.rank}-${site.site}`}
                            type="button"
                            onClick={() => {
                              const mapSite = uniqueSites.find(
                                (item) =>
                                  normalizeKey(item.Site_Name) === normalizeKey(site.site) ||
                                  normalizeKey(item.SITEID) === normalizeKey(site.site),
                              );
                              if (mapSite) handleSiteMarkerClick(mapSite);
                            }}
                            className="w-full rounded-lg border border-orange-100 bg-white p-2 text-left hover:border-orange-300 hover:bg-orange-50"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-xs font-bold text-slate-900">#{site.rank} {site.site || "-"}</span>
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClasses[site.status] || statusClasses.GOOD}`}>
                                {site.status || "GOOD"}
                              </span>
                            </div>
                            <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                              <div
                                className="h-1.5 rounded-full bg-orange-500"
                                style={{ width: `${Math.max(0, Math.min(100, Number(site.healthScore || 0)))}%` }}
                              />
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              Health {percent(site.healthScore)} • Breaches {formatNumber(site.breachCount)}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-bold text-blue-900">Selected Site Details</span>
                </div>
                {!selectedSite ? (
                  <p className="text-xs text-slate-500">Click any site marker to view site analytics.</p>
                ) : !siteDetails ? (
                  <p className="text-xs text-slate-500">No KPI analytics found for this mapped site.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">{siteDetails.site || selectedSite.Site_Name || selectedSite.SITEID}</div>
                        <div className="text-xs text-slate-500">Health {percent(siteDetails.summary?.healthScore)}</div>
                      </div>
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${statusClasses[siteDetails.summary?.status] || statusClasses.GOOD}`}>
                        {siteDetails.summary?.status || "GOOD"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-white p-2">
                        <div className="text-[10px] font-bold uppercase text-slate-500">Cells</div>
                        <div className="text-base font-black text-slate-900">{formatNumber(asArray(siteDetails.cells).length)}</div>
                      </div>
                      <div className="rounded-lg bg-white p-2">
                        <div className="text-[10px] font-bold uppercase text-slate-500">Breaches</div>
                        <div className="text-base font-black text-red-700">{formatNumber(siteDetails.breachCount)}</div>
                      </div>
                      <div className="rounded-lg bg-white p-2">
                        <div className="text-[10px] font-bold uppercase text-slate-500">Rows</div>
                        <div className="text-base font-black text-slate-900">{formatNumber(siteDetails.rowCount)}</div>
                      </div>
                    </div>
                    {asArray(siteDetails.topBreaches).length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold uppercase text-slate-500">Top Breaches</div>
                        {asArray(siteDetails.topBreaches).slice(0, 4).map((breach, index) => (
                          <div key={`${breach.metric}-${index}`} className="rounded-lg bg-white p-2 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-bold text-slate-900">{breach.metric || breach.metricName || "-"}</span>
                              <span className="font-bold text-red-700">{breach.severity || "-"}</span>
                            </div>
                            <div className="mt-1 text-slate-500">
                              {formatNumber(breach.count)} breach value(s)
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {asArray(siteIntelligence?.data).length > 0 && (() => {
                      const selectedIntelligence = asArray(siteIntelligence.data).find((item) => {
                        const siteLabel = String(item.site || "").toLowerCase();
                        const detailSite = String(siteDetails.site || selectedSite.Site_Name || selectedSite.SITEID || "").toLowerCase();
                        return siteLabel === detailSite || siteLabel === String(selectedSite?.SITEID || "").toLowerCase();
                      });
                      if (!selectedIntelligence) return null;
                      return (
                        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-bold uppercase text-slate-500">Site Intelligence</div>
                            <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${statusClasses[selectedIntelligence.status] || statusClasses.GOOD}`}>
                              {selectedIntelligence.status || "GOOD"}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="rounded-lg bg-white p-2">
                              <div className="text-[10px] font-bold uppercase text-slate-500">Impact</div>
                              <div className="text-sm font-black text-slate-900">{percent(selectedIntelligence.impactScore)}</div>
                            </div>
                            <div className="rounded-lg bg-white p-2">
                              <div className="text-[10px] font-bold uppercase text-slate-500">PCI Collision</div>
                              <div className="text-sm font-black text-slate-900">{percent(Math.max(selectedIntelligence.pciCollisionScore || 0, selectedIntelligence.pciConfusionScore || 0))}</div>
                            </div>
                            <div className="rounded-lg bg-white p-2">
                              <div className="text-[10px] font-bold uppercase text-slate-500">PCI Confusion</div>
                              <div className="text-sm font-black text-slate-900">{percent(selectedIntelligence.pciConfusionScore)}</div>
                            </div>
                            <div className="rounded-lg bg-white p-2">
                              <div className="text-[10px] font-bold uppercase text-slate-500">Handover</div>
                              <div className="text-sm font-black text-slate-900">{percent(selectedIntelligence.handoverRisk)}</div>
                            </div>
                            <div className="rounded-lg bg-white p-2">
                              <div className="text-[10px] font-bold uppercase text-slate-500">Overshoot</div>
                              <div className="text-sm font-black text-slate-900">{percent(selectedIntelligence.overshootingScore)}</div>
                            </div>
                            <div className="rounded-lg bg-white p-2">
                              <div className="text-[10px] font-bold uppercase text-slate-500">Neighbors</div>
                              <div className="text-sm font-black text-slate-900">{percent(selectedIntelligence.missingNeighborScore)}</div>
                            </div>
                          </div>
                          <div className="rounded-lg bg-white p-2 text-xs text-slate-600">
                            Latest observed: <b>{selectedIntelligence.latestObservedAt || "-"}</b>
                          </div>
                          <div className="space-y-1">
                            {asArray(selectedIntelligence.recommendations).slice(0, 3).map((item, index) => (
                              <div key={`${item}-${index}`} className="rounded-lg bg-white px-2 py-1.5 text-xs text-slate-700">
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {activeMapPanel === "predictions" && (
                <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
                  <div className="mb-3 rounded-lg bg-white p-2">
                    <MapKpiSelector
                      uploads={uploads}
                      selectedFileId={selectedFileId}
                      onKpiFileChange={handleKpiFileChange}
                      metrics={kpiMetricOptions}
                      selectedMetric={selectedMetric}
                      onMetricChange={setSelectedMetric}
                      compact
                    />
                  </div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-bold text-purple-900">Site Prediction</span>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-purple-700">
                      {formatNumber(activePredictionSummary?.recommendationCount)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg bg-white p-2">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Load Balance</div>
                      <div className="text-base font-black text-blue-700">{formatNumber(activePredictionSummary?.actionCounts?.LOAD_BALANCE)}</div>
                    </div>
                    <div className="rounded-lg bg-white p-2">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Quality</div>
                      <div className="text-base font-black text-red-700">{formatNumber(activePredictionSummary?.actionCounts?.QUALITY_CHECK)}</div>
                    </div>
                    <div className="rounded-lg bg-white p-2">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Capacity</div>
                      <div className="text-base font-black text-purple-700">{formatNumber(activePredictionSummary?.actionCounts?.CAPACITY_REVIEW)}</div>
                    </div>
                    <div className="rounded-lg bg-white p-2">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Coverage</div>
                      <div className="text-base font-black text-orange-700">{formatNumber(activePredictionSummary?.actionCounts?.COVERAGE_CHECK)}</div>
                    </div>
                  </div>
                  <div className="mt-2 rounded-lg bg-white/80 p-2 text-[11px] leading-relaxed text-slate-600">
                    Prediction type depends on KPI evidence: PRB/offload candidates become load balance, drops/alarms become quality, high users/traffic become capacity, and weak signal/distance becomes coverage.
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                    <div className="rounded-lg bg-white p-2 text-red-700">C {formatNumber(activePredictionSummary?.severityCounts?.CRITICAL)}</div>
                    <div className="rounded-lg bg-white p-2 text-orange-700">M {formatNumber(activePredictionSummary?.severityCounts?.MAJOR)}</div>
                    <div className="rounded-lg bg-white p-2 text-amber-700">m {formatNumber(activePredictionSummary?.severityCounts?.MINOR)}</div>
                    <div className="rounded-lg bg-white p-2 text-emerald-700">N {formatNumber(activePredictionSummary?.severityCounts?.NORMAL)}</div>
                  </div>
                  <div className="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
                    {balancedDisplayPredictions.slice(0, 8).map((item, index) => (
                      <button
                        key={`${item.site}-${item.cellName}-${index}`}
                        type="button"
                        onClick={() => {
                          const predictionSite = item.site || item.siteName || item.siteInfo?.siteId || item.siteInfo?.siteName;
                          const predictionCell = item.cellName || item.cell || item.sourceCell;
                          const mapSite = uniqueSites.find((site) =>
                            normalizeKey(site.SITEID) === normalizeKey(predictionSite) ||
                            normalizeKey(site.Site_Name) === normalizeKey(predictionSite) ||
                            site.cells.some((cell) => normalizeKey(cell.Cell_Name) === normalizeKey(predictionCell)),
                          );
                          if (mapSite) handleSiteMarkerClick(mapSite);
                        }}
                        className="w-full rounded-lg border border-purple-100 bg-white p-2 text-left text-xs hover:border-purple-300 hover:bg-purple-50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-bold text-slate-900">{item.site || item.cellName || "-"}</span>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${actionClasses[item.actionCode] || actionClasses.OBSERVE}`}>
                            {String(item.actionCode || "OBSERVE").replaceAll("_", " ")}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                          <span className="truncate">{item.cellName || item.targetCell || "Site level"}</span>
                          <span>{item.severity || "NORMAL"}</span>
                        </div>
                        <div className="mt-1">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                            String(item.balanceStatus || item.bandUnbalanced || "").toLowerCase().includes("not")
                              ? "bg-red-50 text-red-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}>
                            {item.balanceStatus || item.bandUnbalanced || "Balanced"}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-slate-500">
                          {item.reason || item.action || "Review site performance."}
                        </div>
                      </button>
                    ))}
                    {asArray(displayPredictions).length === 0 && (
                      <p className="text-xs text-slate-500">No prediction recommendations found.</p>
                    )}
                  </div>
                </div>
              )}

              {activeMapPanel === "alarms" && (
                <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-bold text-red-900">Open Alarms</span>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-red-700">
                      {formatNumber(alarmSummary?.totalOpen ?? alarms.length)}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                    <div className="rounded-lg bg-white p-2 text-red-700">C {formatNumber(alarmSummary?.severityCounts?.CRITICAL)}</div>
                    <div className="rounded-lg bg-white p-2 text-orange-700">M {formatNumber(alarmSummary?.severityCounts?.MAJOR)}</div>
                    <div className="rounded-lg bg-white p-2 text-amber-700">m {formatNumber(alarmSummary?.severityCounts?.MINOR)}</div>
                    <div className="rounded-lg bg-white p-2 text-blue-700">W {formatNumber(alarmSummary?.severityCounts?.WARNING)}</div>
                  </div>
                  <div className="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
                    {asArray(alarms).slice(0, 8).map((alarm) => (
                      <button
                        key={alarm.id}
                        type="button"
                        onClick={() => {
                          const mapSite = uniqueSites.find((site) =>
                            normalizeKey(site.SITEID) === normalizeKey(alarm.site) ||
                            normalizeKey(site.Site_Name) === normalizeKey(alarm.site) ||
                            site.cells.some((cell) => normalizeKey(cell.Cell_Name) === normalizeKey(alarm.cellName)),
                          );
                          if (mapSite) handleSiteMarkerClick(mapSite);
                        }}
                        className="w-full rounded-lg border border-red-100 bg-white p-2 text-left hover:border-red-300 hover:bg-red-50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-bold text-slate-900">{alarm.cellName || alarm.site || "-"}</span>
                          <span className="text-[10px] font-bold text-red-700">{alarm.severity || "WARNING"}</span>
                        </div>
                        <div className="mt-1 truncate text-[11px] text-slate-500">
                          {alarm.metricName || "-"} • {alarm.message || alarm.recommendation || "Alarm context"}
                        </div>
                      </button>
                    ))}
                    {asArray(alarms).length === 0 && (
                      <p className="text-xs text-slate-500">No open KPI alarms found for this file.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        <AnalyticsRightDrawer
          open={analyticsDrawerOpen}
          onClose={() => setAnalyticsDrawerOpen(false)}
          title="Analytics"
          subtitle="KPI, prediction, alarm, and site insights"
          tabs={analyticsTabs}
          activeTab={activeMapPanel}
          onTabChange={setActiveMapPanel}
          headerChildren={
            activeMapPanel === "clusters" ? (
              <div className="rounded-2xl border border-cyan-400/30 bg-cyan-50 px-4 py-3 text-slate-900 shadow-lg">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider text-cyan-700">Cluster View Loaded</div>
                    <div className="text-sm font-black text-slate-900">
                      {siteIntelligenceRows.length > 0
                        ? `${siteIntelligenceRows.length} sites, ${siteIntelligence?.clusterCount || clusterSummaryRows.length} cluster group(s)`
                        : "No site intelligence rows returned for this KPI file"}
                    </div>
                  </div>
                  <div className="rounded-full border border-cyan-200 bg-white px-2.5 py-1 text-[10px] font-bold text-cyan-700">
                    {siteIntelligenceTimestampLabel}
                  </div>
                </div>
                {primarySiteIntelligence && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-white px-2 py-2 text-center shadow-sm">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Impact</div>
                      <div className="text-sm font-black text-violet-700">{Number(primarySiteIntelligence.impactScore || 0).toFixed(1)}%</div>
                    </div>
                    <div className="rounded-xl bg-white px-2 py-2 text-center shadow-sm">
                      <div className="text-[10px] font-bold uppercase text-slate-500">PCI + HO</div>
                      <div className="text-sm font-black text-red-700">
                        {Number(Math.max(primarySiteIntelligence.pciCollisionScore || 0, primarySiteIntelligence.pciConfusionScore || 0)).toFixed(1)}%
                        {" / "}
                        {Number(primarySiteIntelligence.handoverRisk || 0).toFixed(1)}%
                      </div>
                    </div>
                    <div className="rounded-xl bg-white px-2 py-2 text-center shadow-sm">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Neighbors</div>
                      <div className="text-sm font-black text-emerald-700">{Number(primarySiteIntelligence.missingNeighborScore || 0).toFixed(1)}%</div>
                    </div>
                  </div>
                )}
              </div>
            ) : null
          }
        >
          <div className="space-y-4">
            {activeMapPanel === "overview" && (
            <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-3.5 shadow-md">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sites</div>
                <div className="mt-1 text-2xl font-black text-white">{formatNumber(siteSummary?.siteCount || uniqueSites.length)}</div>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-3.5 shadow-md">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cells</div>
                <div className="mt-1 text-2xl font-black text-white">{formatNumber(siteAnalyticsTotals.cells || mapData.length)}</div>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-3.5 shadow-md">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Bands</div>
                <div className="mt-1 text-2xl font-black text-white">{formatNumber(siteAnalyticsTotals.bands.size)}</div>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-3.5 shadow-md">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Critical</div>
                <div className="mt-1 text-2xl font-black text-red-400">{formatNumber(statusCounts.CRITICAL)}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg">
              <div className="mb-3 text-xs font-black uppercase tracking-wider text-slate-300">Map Analytics Overview</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-blue-500/30 bg-blue-950/30 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-400">
                    <Activity className="h-4 w-4" />
                    Coverage
                  </div>
                  <div className="mt-1.5 text-2xl font-black text-blue-300">
                    {formatNumber(showCells ? deckCells.length : 0)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {showCells ? "Cells visible" : "Cells hidden"} @ Zoom {zoomLevel}
                  </div>
                </div>

                <div className="rounded-xl border border-purple-500/30 bg-purple-950/30 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-400">
                    <Sparkles className="h-4 w-4" />
                    Predictions
                  </div>
                  <div className="mt-1.5 text-2xl font-black text-purple-300">
                    {formatNumber(showPredictions ? predictionMarkerCount : 0)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {formatNumber(displayPredictions.length)} recommendation(s)
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Site Intelligence</div>
                  <div className="text-lg font-black text-white">PCI, Handover, Overshoot, Neighbor</div>
                </div>
                <span className="rounded-full border border-blue-500/30 bg-blue-950/30 px-2 py-1 text-[10px] font-bold text-blue-300">
                  {formatNumber(siteIntelligenceRows.length)} rows
                </span>
              </div>
              {siteIntelligenceRows.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
                  No site intelligence available for the selected KPI file.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-red-400">PCI collision</div>
                      <div className="mt-1 text-2xl font-black text-red-300">
                        {Number(siteIntelligenceRows[0]?.pciCollisionScore || 0).toFixed(1)}%
                      </div>
                    </div>
                    <div className="rounded-xl border border-orange-500/30 bg-orange-950/30 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Handover risk</div>
                      <div className="mt-1 text-2xl font-black text-orange-300">
                        {Number(siteIntelligenceRows[0]?.handoverRisk || 0).toFixed(1)}%
                      </div>
                    </div>
                    <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Overshoot</div>
                      <div className="mt-1 text-2xl font-black text-amber-300">
                        {Number(siteIntelligenceRows[0]?.overshootingScore || 0).toFixed(1)}%
                      </div>
                    </div>
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Missing neighbors</div>
                      <div className="mt-1 text-2xl font-black text-emerald-300">
                        {Number(siteIntelligenceRows[0]?.missingNeighborScore || 0).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Top recommendations</div>
                    <div className="space-y-2">
                      {asArray(siteIntelligenceRows[0]?.recommendations).slice(0, 3).map((item, index) => (
                        <div key={`${item}-${index}`} className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-200">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {activeMapPanel === "clusters" && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Clusterization</div>
                      <div className="text-lg font-black text-white">Impact-based site clusters</div>
                    </div>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-900/30 px-2 py-1 text-[10px] font-bold text-emerald-300">
                      {formatNumber(siteIntelligenceRows.length)} sites
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-blue-500/30 bg-blue-950/30 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Clusters</div>
                      <div className="mt-1 text-2xl font-black text-blue-300">{formatNumber(clusterSummaryRows.length)}</div>
                    </div>
                    <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-red-400">Critical sites</div>
                      <div className="mt-1 text-2xl font-black text-red-300">
                        {formatNumber(siteIntelligenceRows.filter((item) => String(item.status || "").toUpperCase() === "CRITICAL").length)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Map handover categories</div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                      {[
                        ["PCI", handoverCategoryCounts.PCI, handoverCategoryColors.PCI],
                        ["Band", handoverCategoryCounts.BAND, handoverCategoryColors.BAND],
                        ["Technology", handoverCategoryCounts.TECHNOLOGY, handoverCategoryColors.TECHNOLOGY],
                        ["Operator", handoverCategoryCounts.OPERATOR, handoverCategoryColors.OPERATOR],
                        ["Neighbor", handoverCategoryCounts.NEIGHBOR, handoverCategoryColors.NEIGHBOR],
                      ].map(([label, count, color]) => (
                        <div key={label} className="flex items-center justify-between rounded-lg bg-slate-900 px-2 py-1.5">
                          <span className="flex items-center gap-1.5 text-slate-300"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</span>
                          <span className="text-white">{formatNumber(count)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-[10px] text-slate-500">Operator classification appears when the uploaded data contains operator, carrier, MNO, or PLMN fields.</div>
                  </div>
                  <div className="mt-3 text-[11px] leading-5 text-slate-400">
                    Marker colors follow the site impact score. Click a cluster or site row to jump the map to that location.
                  </div>
                </div>

                <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-4 shadow-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">Map Intelligence Snapshot</div>
                      <div className="text-lg font-black text-white">PCI, handover, cluster, and neighbor context</div>
                    </div>
                    <div className="rounded-full border border-cyan-400/30 bg-cyan-900/30 px-2.5 py-1 text-[10px] font-bold text-cyan-200">
                      {siteIntelligenceTimestampLabel}
                    </div>
                  </div>
                  {primarySiteIntelligence ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-red-400">PCI collision</div>
                        <div className="mt-1 text-2xl font-black text-red-300">
                          {Number(primarySiteIntelligence.pciCollisionScore || 0).toFixed(1)}%
                        </div>
                      </div>
                      <div className="rounded-xl border border-orange-500/30 bg-orange-950/30 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-orange-400">PCI confusion</div>
                        <div className="mt-1 text-2xl font-black text-orange-300">
                          {Number(primarySiteIntelligence.pciConfusionScore || 0).toFixed(1)}%
                        </div>
                      </div>
                      <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Handover risk</div>
                        <div className="mt-1 text-2xl font-black text-amber-300">
                          {Number(primarySiteIntelligence.handoverRisk || 0).toFixed(1)}%
                        </div>
                      </div>
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Missing neighbors</div>
                        <div className="mt-1 text-2xl font-black text-emerald-300">
                          {Number(primarySiteIntelligence.missingNeighborScore || 0).toFixed(1)}%
                        </div>
                      </div>
                      <div className="rounded-xl border border-blue-500/30 bg-blue-950/30 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Overshoot</div>
                        <div className="mt-1 text-2xl font-black text-blue-300">
                          {Number(primarySiteIntelligence.overshootingScore || 0).toFixed(1)}%
                        </div>
                      </div>
                      <div className="rounded-xl border border-violet-500/30 bg-violet-950/30 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Impact</div>
                        <div className="mt-1 text-2xl font-black text-violet-300">
                          {Number(primarySiteIntelligence.impactScore || 0).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
                      No site intelligence snapshot is available yet for the current KPI file.
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-xs font-black uppercase tracking-wider text-slate-300">Cluster Summary</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{siteIntelligence?.clusterCount || clusterSummaryRows.length} groups</div>
                  </div>
                  {clusterSummaryRows.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
                      No cluster data available for the selected KPI file.
                    </div>
                  ) : (
                    <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                      {clusterSummaryRows.slice(0, 12).map((cluster) => (
                        <button
                          key={cluster.cluster}
                          type="button"
                          onClick={() => {
                            const match = siteIntelligenceRows.find((item) => normalizeKey(item.cluster) === normalizeKey(cluster.cluster));
                            if (!match) return;
                            const mapSite = uniqueSites.find(
                              (site) =>
                                normalizeKey(site.Site_Name) === normalizeKey(match.site) ||
                                normalizeKey(site.SITEID) === normalizeKey(match.site) ||
                                normalizeKey(site.SITEID) === normalizeKey(match.siteId),
                            );
                            if (mapSite) {
                              handleSiteMarkerClick(mapSite);
                            }
                          }}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-left hover:border-blue-500/40 hover:bg-slate-900"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-bold text-white">{cluster.cluster || "Unclustered"}</span>
                            <span className="text-[10px] font-bold text-slate-400">{formatNumber(cluster.siteCount)} sites</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                            <span>Avg impact {Number(cluster.averageImpactScore || 0).toFixed(1)}%</span>
                            <span>Critical {formatNumber(cluster.criticalSites || 0)}</span>
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                            <div
                              className="h-1.5 rounded-full bg-blue-500"
                              style={{ width: `${Math.max(0, Math.min(100, Number(cluster.averageImpactScore || 0)))}%` }}
                            />
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            Worst site: {cluster.worstSite || "-"} ({Number(cluster.worstImpactScore || 0).toFixed(1)}%)
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg">
                  <div className="mb-3 text-xs font-black uppercase tracking-wider text-slate-300">Top Risk Sites</div>
                  {siteIntelligenceRows.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
                      No site intelligence rows returned yet.
                    </div>
                  ) : (
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                      {siteIntelligenceRows.slice(0, 20).map((item, index) => {
                        const tone = getIntelligenceTone(item.status, item.impactScore);
                        return (
                          <button
                            key={`${item.site}-${index}`}
                            type="button"
                            onClick={() => {
                              const mapSite = uniqueSites.find(
                                (site) =>
                                  normalizeKey(site.Site_Name) === normalizeKey(item.site) ||
                                  normalizeKey(site.SITEID) === normalizeKey(item.site) ||
                                  normalizeKey(site.SITEID) === normalizeKey(item.siteId),
                              );
                              if (mapSite) handleSiteMarkerClick(mapSite);
                            }}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-left hover:border-blue-500/40 hover:bg-slate-900"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-xs font-bold text-white">#{item.rank || index + 1} {item.site || "-"}</span>
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                                style={{ backgroundColor: tone.fill }}
                              >
                                {item.status || "GOOD"}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                              <span>Cluster: {item.cluster || "Unclustered"}</span>
                              <span>Impact {Number(item.impactScore || 0).toFixed(1)}%</span>
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              PCI {Number(item.pciCollisionScore || 0).toFixed(1)} | Confusion {Number(item.pciConfusionScore || 0).toFixed(1)} | HO {Number(item.handoverRisk || 0).toFixed(1)} | Overshoot {Number(item.overshootingScore || 0).toFixed(1)} | Neigh {Number(item.missingNeighborScore || 0).toFixed(1)}
                            </div>
                            <div className="mt-2 space-y-1">
                              {asArray(item.recommendations).slice(0, 2).map((rec, recIndex) => (
                                <div key={`${item.site}-${recIndex}`} className="rounded-lg bg-slate-900 px-2 py-1 text-[11px] text-slate-300">
                                  {rec}
                                </div>
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeMapPanel === "handover" && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Handover Intelligence</div>
                      <div className="text-lg font-black text-white">
                        {focusMapSite ? `${focusMapSite.Site_Name || focusMapSite.SITEID} on map` : "Select a site to focus handover relations"}
                      </div>
                    </div>
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-950/30 px-2.5 py-1 text-[10px] font-bold text-cyan-200">
                      {siteIntelligenceTimestampLabel}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-blue-500/30 bg-blue-950/30 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">PCI handover</div>
                      <div className="mt-1 text-2xl font-black text-blue-300">{formatNumber(handoverRelationCounts.samePci)}</div>
                      <div className="text-[11px] text-slate-400">Same PCI neighbour links</div>
                    </div>
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Band handover</div>
                      <div className="mt-1 text-2xl font-black text-emerald-300">{formatNumber(handoverBandCount)}</div>
                      <div className="text-[11px] text-slate-400">Neighbour band differs from focus site</div>
                    </div>
                    <div className="rounded-xl border border-violet-500/30 bg-violet-950/30 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Technology handover</div>
                      <div className="mt-1 text-2xl font-black text-violet-300">{formatNumber(handoverTechnologyCount)}</div>
                      <div className="text-[11px] text-slate-400">Technology differs from focus site</div>
                    </div>
                    <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Facing / cluster</div>
                      <div className="mt-1 text-2xl font-black text-amber-300">{formatNumber(handoverRelationCounts.facing + handoverRelationCounts.sameCluster)}</div>
                      <div className="text-[11px] text-slate-400">Potential handover paths on map</div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">HO Success</div>
                      <div className="mt-1 text-xl font-black text-white">{Number(focusSiteIntelligence?.handoverSuccessRate || 0).toFixed(1)}%</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attempt Pressure</div>
                      <div className="mt-1 text-xl font-black text-white">{Number(focusSiteIntelligence?.handoverAttemptPressure || 0).toFixed(1)}%</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Failure Pressure</div>
                      <div className="mt-1 text-xl font-black text-white">{Number(focusSiteIntelligence?.handoverFailurePressure || 0).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Handover Relations</div>
                      <div className="text-lg font-black text-white">PCI, band, and technology links shown on the map</div>
                    </div>
                    <span className="rounded-full border border-red-500/30 bg-red-950/30 px-2.5 py-1 text-[10px] font-bold text-red-200">
                      {formatNumber(handoverRelationItems.length)} relations
                    </span>
                  </div>

                  {handoverRelationItems.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
                      No handover relations found yet. Click a site marker or switch to the Handover tab after loading site intelligence.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {handoverRelationItems.map((item, index) => (
                        <button
                          key={`${item.targetSite?.SITEID || index}`}
                          type="button"
                          onClick={() => handleSiteMarkerClick(item.targetSite)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-left hover:border-slate-500 hover:bg-slate-900"
                          style={{ boxShadow: `inset 0 0 0 1px ${item.color}22` }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-black text-white">
                              {item.sourceSite?.SITEID || "-"} {"->"} {item.targetSite?.SITEID || "-"}
                            </span>
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-black text-white"
                              style={{ backgroundColor: item.color }}
                            >
                              {item.handoverCategory || "NEIGHBOR"} HANDOVER
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-400">
                            <span>PCI {item.pciOverlap || 0}</span>
                            <span>Band {item.targetSite?.band || item.targetSite?.Band || "-"}</span>
                            <span>Tech {item.targetSite?.technology || item.targetSite?.Tech || "-"}</span>
                            <span>{item.distanceKm == null ? "-" : `${Number(item.distanceKm).toFixed(2)} km`}</span>
                            <span>Score {Number(item.relationScore || 0).toFixed(0)}</span>
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            {item.targetSite?.recommendation || item.recommendation || "Click to focus this neighbour on the map."}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedPci && (
              <div className="rounded-2xl border border-red-500/30 bg-red-950/30 p-4 shadow-lg">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-red-400">{pciLayerTitle}</div>
                    <div className="text-xl font-black text-white">PCI {selectedPci}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Source {selectedPciSiteId || "-"} • {selectedPciCount} matching cell(s)
                    </div>
                    <div className="text-xs text-slate-400">
                      {pciLayerSubtitle}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPci("");
                      setSelectedPciSiteId("");
                    }}
                    className="rounded-xl border border-red-500/40 bg-red-900/40 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-900/60"
                  >
                    Clear
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {pciLayerModeOptions.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      disabled={mode.disabled}
                      onClick={() => {
                        if (!mode.disabled) setPciLayerMode(mode.value);
                      }}
                      className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-black transition-colors ${
                        pciLayerMode === mode.value
                          ? "border-red-400 bg-red-500/20 text-white"
                          : mode.disabled
                            ? "cursor-not-allowed border-slate-800 bg-slate-950/60 text-slate-600"
                          : "border-slate-700 bg-slate-900/70 text-slate-400 hover:border-red-500/40 hover:text-slate-200"
                      }`}
                    >
                      {mode.label} ({mode.count})
                    </button>
                  ))}
                </div>
                {pciSummaryCards.length > 0 && (
                  <div className={`mt-3 grid gap-2 ${pciSummaryCards.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                    {pciSummaryCards.map((card) => (
                      <button
                        key={card.key}
                        type="button"
                        onClick={() => setPciLayerMode(card.key)}
                        className={`rounded-xl border px-3 py-2 text-left ${
                          card.summary.severity === "risk"
                            ? "border-red-500/40 bg-red-900/40"
                            : card.summary.severity === "watch"
                              ? "border-amber-500/40 bg-amber-900/30"
                              : "border-emerald-500/30 bg-emerald-900/20"
                        }`}
                      >
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{card.title}</div>
                        <div className="mt-0.5 text-xs font-black text-white">{card.summary.status}</div>
                        <div className="mt-1 text-[11px] text-slate-400">{card.summary.detail}</div>
                      </button>
                    ))}
                  </div>
                )}
                {pciVisibleSites.length > 0 && (
                  <div className="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
                    {pciVisibleSites.slice(0, 8).map((site, index) => (
                      <button
                        key={site.SITEID}
                        type="button"
                        onClick={() => handleSiteMarkerClick(site)}
                        className="w-full rounded-xl border border-red-500/20 bg-slate-900/80 px-3 py-2 text-left hover:border-red-500/40 hover:bg-slate-900"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-bold text-red-300">
                            {site.inferredNeighbour ? "Same-PCI Neighbour" : "Same-PCI Site"} {index + 1}: {site.SITEID}
                          </span>
                          <span className="text-xs font-bold text-red-400">
                            {site.distanceKm == null ? "-" : `${site.distanceKm.toFixed(2)} km`}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">
                          {site.matchingPciCells.length} same-PCI cell(s) • {site.inferredNeighbour ? "inferred neighbour" : "reuse only"}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {pciVisibleSites.length === 0 && (
                  <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-400">
                    No site matches this PCI view.
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3.5 shadow-md">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                  <MapPin className="h-4 w-4 text-blue-400" />
                  Site Type
                </h3>
                <div className="space-y-2">
                  {[
                    ["4G/LTE", "#2563EB"],
                    ["5G/NR", "#8B5CF6"],
                    ["Multi band", "#14B8A6"],
                    ["Multi tech", "#9333EA"],
                  ].map(([label, color]) => (
                    <div key={label} className="flex items-center gap-2">
                      <div
                        className="h-3.5 w-3.5 rounded-full border border-slate-950 shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-semibold text-slate-300">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3.5 shadow-md">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                  <Layers className="h-4 w-4 text-purple-400" />
                  Sectors
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {["A", "B", "C", "D"].map((sector) => {
                    const colors = getColorBySector(sector, 1);
                    return (
                      <div key={sector} className="flex items-center gap-2">
                        <div
                          className="h-3.5 w-3.5 flex-shrink-0 rounded shadow-sm"
                          style={{
                            backgroundColor: colors.fill,
                            border: `1.5px solid ${colors.stroke}`,
                          }}
                        />
                        <span className="text-xs font-semibold text-slate-300">{sector}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            </>
            )}

            {activeMapPanel === "worstCells" && (
              <div className="rounded-2xl border border-red-500/30 bg-slate-900/60 p-4 shadow-lg space-y-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                  <MapKpiSelector
                    uploads={uploads}
                    selectedFileId={selectedFileId}
                    onKpiFileChange={handleKpiFileChange}
                    metrics={kpiMetricOptions}
                    selectedMetric={selectedMetric}
                    onMetricChange={setSelectedMetric}
                    compact
                  />
                  <div className="mt-2 rounded-lg border border-orange-500/20 bg-orange-950/20 px-2 py-1.5 text-[11px] font-bold text-orange-200">
                    Ranking method: selected single KPI.
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black uppercase tracking-wider text-red-400">Worst Cells Rankings</div>
                  <div className="rounded-full border border-red-500/30 bg-red-950/40 px-2.5 py-0.5 text-xs font-black text-red-300">{formatNumber(worstCells.length)}</div>
                </div>
                <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
                  {worstCells.slice(0, 18).map((row) => (
                    <button
                      key={`right-worst-${row.rank}-${row.cellName || row.cell}`}
                      type="button"
                      onClick={() => handleWorstCellClick(row)}
                      className="w-full rounded-xl border border-red-500/20 bg-slate-950 p-3 text-left transition-all hover:border-red-500/50 hover:bg-slate-900"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-black text-white">#{row.rank} {row.cellName || row.cell || "Unknown Cell"}</span>
                        <span className="text-xs font-black text-red-400">{row.averageValue ?? "-"}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                        <span className="truncate">{row.site || "Unknown Site"}</span>
                        <span className="rounded-full bg-red-950/60 px-2 py-0.5 text-[10px] font-bold text-red-300 border border-red-500/30">{row.severity || "NORMAL"}</span>
                      </div>
                    </button>
                  ))}
                  {worstCells.length === 0 && <p className="text-sm text-slate-400">Select a KPI file and metric to load worst cells.</p>}
                </div>
              </div>
            )}

            {activeMapPanel === "predictions" && (
              <div className="rounded-2xl border border-purple-500/30 bg-slate-900/60 p-4 shadow-lg space-y-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                  <MapKpiSelector
                    uploads={uploads}
                    selectedFileId={selectedFileId}
                    onKpiFileChange={handleKpiFileChange}
                    metrics={kpiMetricOptions}
                    selectedMetric={selectedMetric}
                    onMetricChange={setSelectedMetric}
                    compact
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Load Balance</div>
                    <div className="text-lg font-black text-blue-400">{formatNumber(activePredictionSummary?.actionCounts?.LOAD_BALANCE)}</div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quality</div>
                    <div className="text-lg font-black text-red-400">{formatNumber(activePredictionSummary?.actionCounts?.QUALITY_CHECK)}</div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Capacity</div>
                    <div className="text-lg font-black text-purple-400">{formatNumber(activePredictionSummary?.actionCounts?.CAPACITY_REVIEW)}</div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Coverage</div>
                    <div className="text-lg font-black text-amber-400">{formatNumber(activePredictionSummary?.actionCounts?.COVERAGE_CHECK)}</div>
                  </div>
                </div>
                {(lbMessage || lbResult) && (
                  <div className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                    lbResult ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"
                  }`}>
                    {lbMessage}
                    {lbResult && ` Rows: ${formatNumber(lbResult.summary?.rows)} | Unbalanced: ${formatNumber(lbResult.summary?.unbalanced_count)}`}
                  </div>
                )}
                <div className="max-h-[48vh] space-y-2 overflow-y-auto pr-1">
                  {balancedDisplayPredictions.slice(0, 18).map((item, index) => (
                    <button
                      key={`right-prediction-${item.site}-${item.cellName}-${index}`}
                      type="button"
                      onClick={() => {
                        const predictionSite = item.site || item.siteName || item.siteInfo?.siteId || item.siteInfo?.siteName;
                        const predictionCell = item.cellName || item.cell || item.sourceCell;
                        const mapSite = uniqueSites.find((site) =>
                          normalizeKey(site.SITEID) === normalizeKey(predictionSite) ||
                          normalizeKey(site.Site_Name) === normalizeKey(predictionSite) ||
                          site.cells.some((cell) => normalizeKey(cell.Cell_Name) === normalizeKey(predictionCell))
                        );
                        if (mapSite) handleSiteMarkerClick(mapSite);
                      }}
                      className="w-full rounded-xl border border-purple-500/20 bg-slate-950 p-3 text-left transition-all hover:border-purple-500/50 hover:bg-slate-900"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-black text-white">{item.site || item.cellName || "Prediction"}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${actionClasses[item.actionCode] || actionClasses.OBSERVE}`}>
                          {String(item.actionCode || "OBSERVE").replaceAll("_", " ")}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                          String(item.balanceStatus || item.bandUnbalanced || "").toLowerCase().includes("not")
                            ? "border border-red-500/30 bg-red-950/60 text-red-300"
                            : "border border-emerald-500/30 bg-emerald-950/60 text-emerald-300"
                        }`}>
                          {item.balanceStatus || item.bandUnbalanced || "Balanced"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">{item.severity || "NORMAL"}</span>
                      </div>
                      <div className="mt-1.5 truncate text-[11px] text-slate-400">{item.reason || item.action || "Review site performance."}</div>
                    </button>
                  ))}
                  {asArray(displayPredictions).length === 0 && <p className="text-sm text-slate-400">No prediction recommendations found for the selected KPI file.</p>}
                </div>
              </div>
            )}

            {activeMapPanel === "alarms" && (
              <div className="rounded-2xl border border-red-500/30 bg-slate-900/60 p-4 shadow-lg space-y-3">
                <div className="text-xs font-black text-red-400 uppercase tracking-wider">Active Alarms</div>
                <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
                  {asArray(alarms).slice(0, 18).map((alarm, index) => (
                    <button
                      key={`right-alarm-${alarm.id || index}`}
                      type="button"
                      className="w-full rounded-xl border border-red-500/20 bg-slate-950 p-3 text-left transition-all hover:border-red-500/50 hover:bg-slate-900"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-black text-white">{alarm.site || alarm.cellName || alarm.metricName || "Alarm"}</span>
                        <span className="rounded-full border border-red-500/30 bg-red-950/60 px-2 py-0.5 text-[10px] font-black text-white">{alarm.severity || "OPEN"}</span>
                      </div>
                      <div className="mt-1.5 truncate text-[11px] font-semibold text-white">{alarm.message || alarm.recommendation || alarm.metricName || "Alarm context"}</div>
                    </button>
                  ))}
                  {asArray(alarms).length === 0 && <p className="text-sm text-slate-400">No open alarms found for the selected KPI file.</p>}
                </div>
              </div>
            )}
          </div>
        </AnalyticsRightDrawer>

        {/* Main Map Area */}
        <div className="absolute inset-0">
          <MapSiteLegend
            sites={filteredSites}
            selectedSite={selectedSite}
            hoveredSite={hoveredSite}
            sidebarOpen={sidebarOpen}
            onSiteClick={handleSiteClick}
            onSiteHover={setHoveredSite}
            onSiteLeave={() => setHoveredSite(null)}
            getColorBySector={getColorBySector}
          />
          <MapLayerLegend
            showCells={showCells}
            cellSectorCounts={mapLayerLegendCounts.cellSectorCounts}
            getColorBySector={getColorBySector}
            showWorstSites={showWorstSites}
            worstCount={worstCellMapItems.length}
            showPredictions={showPredictions}
            predictionCounts={mapLayerLegendCounts.predictionCounts}
            showAlarms={showAlarms}
            alarmCounts={mapLayerLegendCounts.alarmCounts}
            predictionActionColors={predictionActionColors}
            severityMarkerColors={severityMarkerColors}
            selectedPci={selectedPci}
            sourcePciLabel={sourcePciLabel}
            selectedPciCount={selectedPciCount}
            samePciSiteCount={pciVisibleSites.length}
            pciLayerLabel={pciLayerTitle}
            showHandover={visibleHandoverRelationItems.length > 0}
            handoverRelationCounts={handoverRelationCounts}
            showIssueMarkers={visibleSiteIntelligenceMapItems.length > 0}
            issueMarkerCounts={visibleIntelligenceIssueCounts}
          />

          {/* Map controls moved into the Filter and Analytics panels. */}
          <div className="hidden">
            {(fetchError || mapData.length === 0) && (
              <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-xl p-4 border border-amber-200 max-w-sm">
                <div className="text-sm font-bold text-gray-900 mb-1">
                  Site data map status
                </div>
                <div className="text-xs text-gray-600 leading-5">
                  {fetchError ||
                    (totalSiteRows > 0
                      ? `${totalSiteRows} site row(s) found, but ${missingCoordinateRows} row(s) do not have valid lat/lon values.`
                      : "No uploaded site rows found yet. Upload Site Data first.")}
                </div>
              </div>
            )}

            {selectedPci && (
              <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-xl p-4 border border-red-200 max-w-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase text-red-600">
                      {pciLayerTitle}
                    </div>
                    <div className="text-lg font-black text-red-900">
                      PCI {selectedPci}
                    </div>
                    <div className="text-xs text-gray-500">
                      Source {selectedPciSiteId || "-"} • {selectedPciCount} matching cell(s)
                    </div>
                    <div className="text-xs text-gray-500">
                      {pciLayerSubtitle}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPci("");
                      setSelectedPciSiteId("");
                    }}
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                  >
                    Clear
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {pciLayerModeOptions.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      disabled={mode.disabled}
                      onClick={() => {
                        if (!mode.disabled) setPciLayerMode(mode.value);
                      }}
                      className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-black transition-colors ${
                        pciLayerMode === mode.value
                          ? "border-red-300 bg-red-100 text-red-900"
                          : mode.disabled
                            ? "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300"
                          : "border-gray-200 bg-white text-gray-500 hover:border-red-200 hover:text-red-700"
                      }`}
                    >
                      {mode.label} ({mode.count})
                    </button>
                  ))}
                </div>
                {pciSummaryCards.length > 0 && (
                  <div className={`mt-3 grid gap-2 ${pciSummaryCards.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                    {pciSummaryCards.map((card) => (
                      <button
                        key={card.key}
                        type="button"
                        onClick={() => setPciLayerMode(card.key)}
                        className={`rounded-lg border px-3 py-2 text-left ${
                          card.summary.severity === "risk"
                            ? "border-red-200 bg-red-100"
                            : card.summary.severity === "watch"
                              ? "border-amber-200 bg-amber-50"
                              : "border-emerald-200 bg-emerald-50"
                        }`}
                      >
                        <div className="text-[10px] font-black uppercase tracking-wider text-gray-500">{card.title}</div>
                        <div className="mt-0.5 text-xs font-black text-gray-900">{card.summary.status}</div>
                        <div className="mt-1 text-[11px] text-gray-500">{card.summary.detail}</div>
                      </button>
                    ))}
                  </div>
                )}
                {pciVisibleSites.length > 0 && (
                  <div className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
                    {pciVisibleSites.slice(0, 8).map((site, index) => (
                      <button
                        key={site.SITEID}
                        type="button"
                        onClick={() => handleSiteMarkerClick(site)}
                        className="w-full rounded-lg border border-red-100 bg-red-50/70 px-3 py-2 text-left hover:bg-red-100"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-bold text-red-900">
                            {site.inferredNeighbour ? "Same-PCI Neighbour" : "Same-PCI Site"} {index + 1}: {site.SITEID}
                          </span>
                          <span className="text-xs font-bold text-red-700">
                            {site.distanceKm == null ? "-" : `${site.distanceKm.toFixed(2)} km`}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-gray-500">
                          {site.matchingPciCells.length} same-PCI cell(s) • {site.inferredNeighbour ? "inferred neighbour" : "reuse only"}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {pciVisibleSites.length === 0 && (
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500">
                    No site matches this PCI view.
                  </div>
                )}
              </div>
            )}

            {/* Map Layer Controls */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowCells(!showCells)}
                className={`bg-white/95 backdrop-blur-sm shadow-lg rounded-xl p-4 border-2 transition-all hover:shadow-xl ${showCells
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-3">
                  {showCells ? (
                    <Eye className="w-5 h-5 text-blue-600" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-gray-500" />
                  )}
                  <div className="text-left">
                    <div className={`text-sm font-bold ${showCells ? 'text-blue-900' : 'text-gray-900'}`}>
                      {showCells ? 'Cells On' : 'Cells Off'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {showCells ? 'Coverage layer active' : 'Coverage layer hidden'}
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={handleToggleWorstSites}
                className={`bg-white/95 backdrop-blur-sm shadow-lg rounded-xl p-4 border-2 transition-all hover:shadow-xl ${showWorstSites
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-5 h-5 ${showWorstSites ? 'text-orange-600' : 'text-gray-500'}`} />
                  <div className="text-left">
                    <div className={`text-sm font-bold ${showWorstSites ? 'text-orange-900' : 'text-gray-900'}`}>
                      {showWorstSites ? 'Worst Sites' : 'Worst Sites Off'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {showWorstSites ? 'Highlight poor sites' : 'Hide poor site highlights'}
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={handleTogglePredictions}
                className={`bg-white/95 backdrop-blur-sm shadow-lg rounded-xl p-4 border-2 transition-all hover:shadow-xl ${showPredictions
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Sparkles className={`w-5 h-5 ${showPredictions ? 'text-purple-600' : 'text-gray-500'}`} />
                  <div className="text-left">
                    <div className={`text-sm font-bold ${showPredictions ? 'text-purple-900' : 'text-gray-900'}`}>
                      {showPredictions ? 'Predictions' : 'Predictions Off'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {showPredictions ? 'Show recommendation flags' : 'Hide recommendation flags'}
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setShowAlarms(!showAlarms)}
                className={`bg-white/95 backdrop-blur-sm shadow-lg rounded-xl p-4 border-2 transition-all hover:shadow-xl ${showAlarms
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-5 h-5 ${showAlarms ? 'text-red-600' : 'text-gray-500'}`} />
                  <div className="text-left">
                    <div className={`text-sm font-bold ${showAlarms ? 'text-red-900' : 'text-gray-900'}`}>
                      {showAlarms ? 'Alarms' : 'Alarms Off'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {showAlarms ? 'Show alarm markers' : 'Hide alarm markers'}
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {showPredictions && asArray(displayPredictions).length > 0 && (
              <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-900">
                    Prediction Layer
                  </span>
                </div>
                <div className="text-2xl font-bold text-purple-700">
                  {formatNumber(predictionMarkerCount)} / {formatNumber(displayPredictions.length)}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Colored prediction marker(s). Cells hidden in prediction mode.
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    ["Load balance", "LOAD_BALANCE"],
                    ["Quality", "QUALITY_CHECK"],
                    ["Capacity", "CAPACITY_REVIEW"],
                    ["Coverage", "COVERAGE_CHECK"],
                  ].map(([label, action]) => (
                    <div key={action} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: predictionActionColors[action] }}
                      />
                      <span className="text-[11px] font-bold text-slate-600">{label}</span>
                    </div>
                  ))}
                </div>
                {Math.max(0, asArray(displayPredictions).length - predictionMarkerCount) > 0 && (
                  <div className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                    {formatNumber(Math.max(0, asArray(displayPredictions).length - predictionMarkerCount))} prediction(s) not mapped because site/cell lat-lon was not found in the selected Site Data file.
                  </div>
                )}
              </div>
            )}

            {/* Coverage Stats */}
            <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-gray-900">
                  Coverage Status
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(showCells ? deckCells.length : 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {showCells ? 'Cells visible' : 'Cells hidden'} @ Zoom {zoomLevel}
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-xl p-4 border border-gray-200">
              <h3 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Site Type
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["4G/LTE", "#2563EB"],
                  ["5G/NR", "#8B5CF6"],
                  ["Multi band", "#14B8A6"],
                  ["Multi tech", "#9333EA"],
                ].map(([label, color]) => (
                  <div key={label} className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs font-medium text-gray-600">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* MODIFIED: Legend - Now showing 4 sectors in 2x2 grid */}
            <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-xl p-4 border border-gray-200">
              <h3 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Sectors
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {["A", "B", "C", "D"].map((sector) => {
                  const colors = getColorBySector(sector, 1);
                  return (
                    <div key={sector} className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded shadow-sm flex-shrink-0"
                        style={{
                          backgroundColor: colors.fill,
                          border: `2px solid ${colors.stroke}`,
                        }}
                      ></div>
                      <span className="text-xs text-gray-600 font-medium">
                        {sector}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Map */}
          {loadError ? (
            <div className="h-full w-full flex items-center justify-center bg-gray-100 px-6 text-center">
              <p className="text-gray-600">
                Failed to load Google Maps. Check `VITE_GOOGLE_MAPS_API_KEY` and
                `VITE_GOOGLE_MAPS_MAP_ID` in your frontend `.env`.
              </p>
            </div>
          ) : isLoaded ? (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={11}
              onLoad={onLoad}
              onUnmount={onUnmount}
              options={{
                mapId: googleMapsMapId,
                disableDefaultUI: true,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: true,
                fullscreenControl: true,
              }}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gray-100">
              <p className="text-gray-500">Loading map...</p>
            </div>
          )}

          {/* Selected Cell Panel HUD */}
          {selectedCell && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 w-[480px] max-w-[92vw] rounded-2xl border border-slate-800/90 bg-slate-950/95 p-5 text-white shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
              <div className="flex items-start justify-between mb-4 border-b border-slate-800/80 pb-3">
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/90 text-white shadow-md shadow-blue-500/20">
                      <Antenna className="w-4 h-4" />
                    </span>
                    <h3 className="font-black text-white text-base truncate tracking-tight">
                      {selectedCell.Cell_Name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="truncate">Site <span className="font-bold text-slate-200">{selectedCell.SITEID}</span></span>
                    <span className="text-slate-600">•</span>
                    <span>Layer <span className="font-bold text-blue-400">{getCellLayer(selectedCell)}</span></span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-white transition-colors"
                  title="Close cell details"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                <div className="bg-slate-900/90 rounded-xl p-3 border border-blue-500/30 text-center shadow-sm">
                  <Compass className="w-4 h-4 text-blue-400 mx-auto mb-1.5" />
                  <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-0.5">
                    Azimuth
                  </div>
                  <div className="text-lg font-black text-white">
                    {selectedCell.AZIMUTH}°
                  </div>
                </div>

                <div className="bg-slate-900/90 rounded-xl p-3 border border-purple-500/30 text-center shadow-sm">
                  <Hash className="w-4 h-4 text-purple-400 mx-auto mb-1.5" />
                  <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-0.5">
                    PCI
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPci(String(selectedCell.PCI || ""));
                      setSelectedPciSiteId(String(selectedCell.SITEID || ""));
                    }}
                    className="text-lg font-black text-purple-300 hover:text-purple-100 underline-offset-4 hover:underline"
                    title="Highlight all cells with this PCI"
                  >
                    {selectedCell.PCI}
                  </button>
                </div>

                <div className="bg-slate-900/90 rounded-xl p-3 border border-emerald-500/30 text-center shadow-sm">
                  <Waves className="w-4 h-4 text-emerald-400 mx-auto mb-1.5" />
                  <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-0.5">
                    Freq
                  </div>
                  <div className="text-xs font-black text-emerald-300 truncate">
                    {selectedCell.Downlink_Center_Frequency || "-"}
                  </div>
                </div>

                <div className="bg-slate-900/90 rounded-xl p-3 border border-amber-500/30 text-center shadow-sm">
                  <TrendingUp className="w-4 h-4 text-amber-400 mx-auto mb-1.5" />
                  <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-0.5">
                    Layer
                  </div>
                  <div className="text-lg font-black text-amber-300">
                    {getCellLayer(selectedCell)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
