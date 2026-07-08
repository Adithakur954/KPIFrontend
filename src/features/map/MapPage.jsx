import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { GoogleMapsOverlay } from "@deck.gl/google-maps";
import { PolygonLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { getMapDetails } from "./MapService";
import AnalyticsRightDrawer from "./components/AnalyticsRightDrawer";
import LbPredictionControls from "./components/LbPredictionControls";
import MapHeader from "./components/MapHeader";
import MapFilterPanel from "./components/MapFilterPanel";
import MapKpiSelector from "./components/MapKpiSelector";
import MapSiteLegend from "./components/MapSiteLegend";
import { fetchUploads } from "../uploads/services/uploadService";
import { fetchDynamicMetrics, fetchWorstCells } from "../validation_report/validationReportService";
import {
  fetchSiteDetails,
  fetchSitePredictionRecommendations,
  fetchSiteSummary,
  runLbWcfPrediction,
} from "../sites/siteAnalyticsService";
import { fetchKpiAlarms, fetchKpiAlarmSummary } from "../alarms/alarmsService";
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

function lbRowsToMapPredictions(rows, fileId) {
  return asArray(rows).reduce((items, row) => {
    const cellName = row.Cell || row.cellName || row.Cell_Name || "";
    const site = row.Site || row.site || baseCellKey(cellName);
    const recs = [...asArray(row.ML_Recommendations), ...asArray(row.Recommendations)];
    const probabilities = [...asArray(row.ML_Probabilities), ...asArray(row.Probabilities)]
      .map(Number)
      .filter(Number.isFinite);
    const probability = Number(row.ML_Probability ?? probabilities[0] ?? 0);
    const unbalanced = String(row.Band_Unbalanced || "").toLowerCase().includes("not");
    if (!unbalanced && recs.length === 0) {
      return items;
    }
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
      actionCode: unbalanced ? "LOAD_BALANCE" : "OBSERVE",
      action: recs.length
        ? recs.slice(0, 3).join(", ")
        : unbalanced
          ? "Review load balancing thresholds and target layer offload for this cell."
          : "Cell layer appears balanced by LB/WCF model.",
      reason: unbalanced
        ? "Python LB/WCF model marked this band as not balanced."
        : "Python LB/WCF model marked this band as balanced.",
      severity,
      score: Math.round((probability || (unbalanced ? 0.6 : 0.1)) * 100),
      source: "lb-wcf-python",
      metrics: {
        dlThroughput: row.DL_throughput,
        prbDlUtilization: row["PRB DL Utilization %"],
        trafficShare: row["Total Traffic(MB)_share%"],
        mlProbability: row.ML_Probability,
      },
      evidence: [
        row.Band_Unbalanced ? `Balance: ${row.Band_Unbalanced}` : "",
        row.ML_Probability != null ? `ML probability ${Number(row.ML_Probability).toFixed(2)}` : "",
        row.DL_throughput != null ? `DL throughput ${Number(row.DL_throughput).toFixed(2)}` : "",
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

function isKpiUpload(upload) {
  const explicitType = String(upload?.uploadType || upload?.type || upload?.category || upload?.fileType || "").toLowerCase();
  const remarks = String(upload?.remarks || upload?.description || "").toLowerCase();
  const fileName = String(upload?.fileName || upload?.filename || "").toLowerCase();
  const typedText = `${explicitType} ${remarks}`;
  const hasToken = (text, token) => String(text || "").split(/[^a-z0-9]+/i).includes(token);
  const hasAnyToken = (text, tokens) => tokens.some((token) => hasToken(text, token));
  const nonKpiTokens = ["site", "alarm", "counter", "dump", "group"];

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

  if (hasToken(typedText, "site")) return true;
  if (hasToken(fileName, "site")) return true;
  return false;
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

function normalizeSiteMapRow(row) {
  const lat = toNumber(firstValue(row, ["lat", "latitude", "Latitude", "LAT"]));
  const lon = toNumber(firstValue(row, ["lon", "longitude", "Longitude", "LON", "lng"]));
  const cellName = firstValue(row, ["Cell_Name", "cellName", "cell_name", "CELL_NAME"], "");
  const siteId = firstValue(row, ["SITEID", "siteId", "site_id", "Site_ID", "id"], cellName || "Unknown Site");
  const siteName = firstValue(row, ["Site_Name", "siteName", "site_name", "SITE_NAME"], siteId || cellName);

  return {
    ...row,
    SITEID: String(siteId),
    Site_Name: String(siteName),
    Cell_Name: String(cellName),
    Cell_ID: firstValue(row, ["Cell_ID", "cellId", "cell_id", "CELL_ID"], row?.id || cellName),
    AZIMUTH: toNumber(firstValue(row, ["AZIMUTH", "azimuth", "Azimuth"])) ?? 0,
    Downlink_Center_Frequency:
      toNumber(firstValue(row, ["Downlink_Center_Frequency", "Frequency", "frequency"])) ?? 0,
    Band: firstValue(row, ["Band", "BAND", "band", "Frequency_Band", "frequencyBand", "bandName"], ""),
    Technology: firstValue(row, ["Technology", "TECHNOLOGY", "Tech", "TECH", "tech", "technology", "RAT"], ""),
    Antenna_Height: toNumber(firstValue(row, ["Antenna_Height", "antennaHeight"])) ?? 0,
    PCI: firstValue(row, ["PCI", "pci"], "-"),
    TAC: firstValue(row, ["TAC", "tac"], "-"),
    E_tilt: firstValue(row, ["E_tilt", "eTilt"], "-"),
    M_tilt: firstValue(row, ["M_tilt", "mTilt"], "-"),
    lat,
    lon,
  };
}

function getCellTechnologyLabel(cell) {
  const explicitTech = firstValue(cell, ["Technology", "TECHNOLOGY", "Tech", "TECH", "tech", "technology", "RAT"], "");
  if (explicitTech) return String(explicitTech).toUpperCase();

  const frequency = toNumber(firstValue(cell, ["Downlink_Center_Frequency", "Frequency", "frequency"]));
  if (frequency >= 3300) return "5G";
  if (frequency >= 700) return "4G";
  return "UNKNOWN";
}

function getCellBandLabel(cell) {
  const explicitBand = firstValue(cell, ["Band", "BAND", "band", "Frequency_Band", "frequencyBand", "bandName"], "");
  if (explicitBand) return String(explicitBand);

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
  const [predictionSummary, setPredictionSummary] = useState(null);
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
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerMode, setDrawerMode] = useState("filter");
  const [analyticsDrawerOpen, setAnalyticsDrawerOpen] = useState(false);
  const [hoveredSite, setHoveredSite] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(11);
  const [showCells, setShowCells] = useState(false);
  const [showAlarms, setShowAlarms] = useState(true);
  const [showWorstSites, setShowWorstSites] = useState(true);
  const [showPredictions, setShowPredictions] = useState(true);
  const [siteMarkerScale, setSiteMarkerScale] = useState(1);
  const [selectedTechnologyFilter, setSelectedTechnologyFilter] = useState("");
  const [selectedBandFilter, setSelectedBandFilter] = useState("");
  const [pciFilter, setPciFilter] = useState("");
  const [predictionMarkerCount, setPredictionMarkerCount] = useState(0);
  const [predictionApproxCount, setPredictionApproxCount] = useState(0);
  const [activeMapPanel, setActiveMapPanel] = useState("worstCells");
  const [selectedPci, setSelectedPci] = useState("");
  const [selectedPciSiteId, setSelectedPciSiteId] = useState("");

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
    setAnalyticsDrawerOpen((open) => !open);
  }, []);

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
        const response = await getMapDetails(selectedSiteFileId);
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
        setFetchError(error?.message || "Failed to fetch uploaded site data.");
      } finally {
        if (isCurrentRequest) {
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => {
      isCurrentRequest = false;
    };
  }, [selectedSiteFileId, siteUploads.length]);

  useEffect(() => {
    const loadUploads = async () => {
      const response = await fetchUploads();
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
      const nextMetric = metricKey(nextMetrics[0]);
      setSelectedMetric(nextMetric);
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
      setShowPredictions(true);
      setShowCells(false);
    } else {
      setLbResult(null);
      setLbMessage(response?.message || "Failed to run LB prediction.");
      setPredictions([]);
      setPredictionSummary(summarizePredictions([], selectedFileId));
    }
    setLbLoading(false);
  }, [lbMethod, lbMlMode, lbQuantile, lbTaFile, selectedFileId]);

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

  const siteAnalyticsByName = useMemo(() => {
    const lookup = new Map();
    siteAnalyticsRows.forEach((site) => {
      const key = normalizeKey(site.site);
      if (key) lookup.set(key, site);
    });
    return lookup;
  }, [siteAnalyticsRows]);

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
    return fallbackPredictionsFromWorstCells(worstCells, selectedMetric);
  }, [predictions, worstCells, selectedMetric]);

  const kpiMetricOptions = useMemo(
    () => metrics.map((metric) => ({ value: metricKey(metric), label: metricLabel(metric) })).filter((metric) => metric.value),
    [metrics],
  );

  const activePredictionSummary = useMemo(
    () => summarizePredictions(displayPredictions, selectedFileId),
    [displayPredictions, selectedFileId],
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

  const pciNeighbours = useMemo(() => {
    if (!sourcePciSite) return [];
    return selectedPciSites
      .filter((site) => normalizeKey(site.SITEID) !== normalizeKey(sourcePciSite.SITEID))
      .map((site) => ({
        ...site,
        distanceKm: distanceKm(sourcePciSite, site),
      }))
      .sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY));
  }, [selectedPciSites, sourcePciSite]);

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
  }, [worstCells, filteredSites]);

  const predictionMapItems = useMemo(() => {
    if (!showPredictions) return [];

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
      .map((prediction, index) => {
        const matchedSite = findPredictionSite(prediction);
        const lat = toNumber(prediction.siteInfo?.latitude) ?? toNumber(prediction.latitude) ?? matchedSite?.lat;
        const lon = toNumber(prediction.siteInfo?.longitude) ?? toNumber(prediction.longitude) ?? matchedSite?.lon;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

        const actionCode = String(prediction.actionCode || "OBSERVE").toUpperCase();
        const severity = String(prediction.severity || "NORMAL").toUpperCase();
        return {
          ...prediction,
          __index: index,
          __site: matchedSite || null,
          __lat: lat,
          __lon: lon,
          __actionCode: predictionActionColors[actionCode] ? actionCode : "OBSERVE",
          __severity: severity,
          __mappedToSite: Boolean(matchedSite),
        };
      })
      .filter(Boolean);
  }, [displayPredictions, filteredSites, showPredictions]);

  useEffect(() => {
    if (!useDeckRendering) return;
    setPredictionMarkerCount(showPredictions ? predictionMapItems.length : 0);
    setPredictionApproxCount(0);
  }, [predictionMapItems, showPredictions, useDeckRendering]);

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
      return scaleFactors[roundedZoom];
    }

    if (roundedZoom > 22) return 10;
    if (roundedZoom < 8) return 1500;

    return 400;
  }, []);

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
    return match ? parseInt(match[1]) : 1;
  }, []);

  const extractSector = useCallback((cellName) => {
    if (!cellName) return "A"; // handle null/undefined

    const match = cellName.match(/([A-Z])\d+$/);
    return match ? match[1] : "A";
  }, []);

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

  const getFrequencyBand = useCallback((freq) => {
    if (freq < 1000) return { name: "Low Band", color: "#A78BFA" };
    if (freq < 2000) return { name: "Mid Band", color: "#60A5FA" };
    if (freq < 2500) return { name: "High Mid", color: "#34D399" };
    return { name: "High Band", color: "#FB923C" };
  }, []);

  const createCellInfoWindow = useCallback((cell) => {
    const sector = extractSector(cell.Cell_Name);
    const layer = extractCellLayer(cell.Cell_Name);
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
  }, [extractSector, extractCellLayer, getColorBySector, getFrequencyBand]);

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
        </div>
      </div>
    `;
  }, [getSiteAlarms, getWorstAlarmSeverity, predictionBySite]);

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
    return Boolean(
      siteWorstLookup.get(normalizeKey(site?.SITEID)) ||
      siteWorstLookup.get(normalizeKey(site?.Site_Name)) ||
      site?.cells?.some((cell) => worstCellLookup.has(normalizeKey(cell.Cell_Name)))
    );
  }, [siteWorstLookup, worstCellLookup]);

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
      site?.cells?.some((cell) => normalizePci(cell.PCI) === normalizePci(selectedPci))
    );
  }, [selectedPci]);

  const getSiteMarkerIcon = useCallback((site, selected = false) => {
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
    const shouldHighlight = hasAlarm || hasWorst || hasSelectedPci || hasWorstSite || hasPrediction;
    const fillColor = hasAlarm
      ? severityMarkerColors[alarmSeverity]
      : hasSelectedPci
        ? "#DC2626"
        : hasWorstSite
          ? "#EA580C"
          : hasPrediction
            ? "#7C3AED"
            : pciMode
              ? "#16A34A"
              : selected
                ? "#3B82F6"
                : "#FFFFFF";
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: (shouldHighlight ? (selected || isSource ? 9 : 7) : (selected ? 7 : 5.5)) * siteMarkerScale,
      fillColor,
      fillOpacity: 1,
      strokeColor: isSource ? "#FACC15" : shouldHighlight || selected ? "#FFFFFF" : pciMode ? "#FFFFFF" : "#3B82F6",
      strokeWeight: isSource ? 4 : 2,
    };
  }, [siteHasWorstCell, siteHasWorstSite, siteHasSelectedPci, selectedPci, selectedPciSiteId, showPredictions, showAlarms, predictionBySite, getWorstAlarmSeverity, siteMarkerScale]);

  const getDeckSiteColor = useCallback((site, selected = false) => {
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

    if (hasAlarm) return hexToRgba(severityMarkerColors[alarmSeverity], 255);
    if (hasSelectedPci) return hexToRgba("#DC2626", 255);
    if (hasWorstSite || hasWorst) return hexToRgba("#EA580C", 255);
    if (hasPrediction) return hexToRgba("#7C3AED", 255);
    if (selected) return hexToRgba("#2563EB", 255);
    if (pciMode) return hexToRgba("#16A34A", 245);
    return hexToRgba(getSiteBaseColor(site), 245);
  }, [siteHasSelectedPci, siteHasWorstCell, siteHasWorstSite, showPredictions, showAlarms, predictionBySite, getWorstAlarmSeverity, selectedPci]);

  const getCellOverlayColors = useCallback((cell, layer, sector) => {
    const baseColors = getColorBySector(sector, layer);
    const isWorstCell = worstCellLookup.has(normalizeKey(cell.Cell_Name));
    const isSamePci = selectedPci && normalizePci(cell.PCI) === normalizePci(selectedPci);

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
  }, [getColorBySector, worstCellLookup, selectedPci]);

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

          const tooltip = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 8px 12px; font-family: -apple-system, system-ui; background: white; border-radius: 8px; font-weight: 600; font-size: 13px;">
                <div style="color: #1F2937; margin-bottom: 4px;">${site.Site_Name}</div>
                <div style="color: #6B7280; font-size: 11px; font-weight: 500;">
                  Site ID: ${site.SITEID} • ${site.cells.length} cells
                </div>
              </div>
            `,
            position: { lat: site.lat, lng: site.lon },
            pixelOffset: new window.google.maps.Size(0, -20),
          });
          marker.tooltip = tooltip;
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
  }, [map, zoomLevel, getSiteMarkerIcon, selectedPci, siteHasSelectedPci, createSiteInfoWindow]);

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
    const response = await fetchSiteDetails(selectedFileId, siteQuery);
    setSiteDetails(response?.success ? response.data : null);
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
            pixelOffset: new window.google.maps.Size(0, -16),
          });
        }
        const siteLabels = getSiteMapLabel(object);
        miniTooltipRef.current.setContent(`
          <div style="padding: 10px 12px; font-family: -apple-system, system-ui; background: white; border-radius: 10px; font-weight: 700; font-size: 13px; min-width: 220px;">
            <div style="color: #111827;">${object.Site_Name || object.SITEID}</div>
            <div style="margin-top: 4px; color: #6B7280; font-size: 11px; font-weight: 600;">Site ID: ${object.SITEID} - ${object.cells?.length || 0} cells</div>
            <div style="margin-top: 8px; display: grid; gap: 5px; color: #334155; font-size: 11px; font-weight: 600;">
              <div><span style="color:#64748B;">Tech:</span> ${siteLabels.techLabel}</div>
              <div><span style="color:#64748B;">Band:</span> ${siteLabels.bandLabel}</div>
            </div>
          </div>
        `);
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
        const layer = extractCellLayer(cell.Cell_Name);
        const radius = Math.max(18, baseRadius * getLayerMultiplier(layer) * getBandFrequencyScale(cell));
        return createCellTriangle(cell.lat, cell.lon, cell.AZIMUTH, radius, 65).map((point) => [point.lng, point.lat]);
      },
      getFillColor: (cell) => {
        const layer = extractCellLayer(cell.Cell_Name);
        const sector = extractSector(cell.Cell_Name);
        const colors = getCellOverlayColors(cell, layer, sector);
        return hexToRgba(colors.fill, Math.round((colors.opacity || 0.35) * 255));
      },
      getLineColor: (cell) => {
        const layer = extractCellLayer(cell.Cell_Name);
        const sector = extractSector(cell.Cell_Name);
        return hexToRgba(getCellOverlayColors(cell, layer, sector).stroke, 230);
      },
      getLineWidth: (cell) => {
        const selected =
          selectedCell?.Cell_Name === cell.Cell_Name ||
          (selectedPci && normalizePci(cell.PCI) === normalizePci(selectedPci));
        return selected ? 2.5 : 1.2;
      },
      lineWidthUnits: "pixels",
      updateTriggers: {
        getPolygon: [zoomLevel],
        getFillColor: [selectedPci, worstCells.length],
        getLineColor: [selectedPci, worstCells.length],
        getLineWidth: [selectedCell?.Cell_Name, selectedPci],
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
        if (!infoWindowRef.current || infoWindowRef.current.getMap()) return;
        if (!object) {
          if (miniTooltipRef.current) {
            miniTooltipRef.current.close();
            miniTooltipRef.current = null;
          }
          return;
        }
        const layer = extractCellLayer(object.Cell_Name);
        const sector = extractSector(object.Cell_Name);
        const colors = getCellOverlayColors(object, layer, sector);
        if (!miniTooltipRef.current) {
          miniTooltipRef.current = new window.google.maps.InfoWindow({
            pixelOffset: new window.google.maps.Size(0, -12),
          });
        }
        miniTooltipRef.current.setContent(`
          <div style="padding: 6px 12px; font-family: -apple-system, system-ui; background: white; color: ${colors.stroke}; border-radius: 8px; font-weight: 700; font-size: 12px; border: 2px solid ${colors.fill}; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            ${object.Cell_Name} <span style="color: #9CA3AF;">-</span> ${getCellBandLabel(object)}
          </div>
        `);
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

    deckOverlayRef.current.setProps({
      layers: [
        showCells ? cellLayer : null,
        siteLayer,
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
    selectedSite,
    selectedCell,
    selectedPci,
    selectedPciSiteId,
    showWorstSites,
    showPredictions,
    showAlarms,
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
    extractCellLayer,
    extractSector,
  ]);

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
        const aSelectedPci =
          selectedPci &&
          normalizePci(a.PCI) === normalizePci(selectedPci);
        const bSelectedPci =
          selectedPci &&
          normalizePci(b.PCI) === normalizePci(selectedPci);
        if (aSelectedPci !== bSelectedPci) {
          return aSelectedPci ? 1 : -1;
        }

        const aWorst = worstCellLookup.has(normalizeKey(a.Cell_Name));
        const bWorst = worstCellLookup.has(normalizeKey(b.Cell_Name));
        if (aWorst !== bWorst) {
          return aWorst ? 1 : -1;
        }

        const layerA = extractCellLayer(a.Cell_Name);
        const layerB = extractCellLayer(b.Cell_Name);
        return layerB - layerA;
      });

      sortedCells.forEach((cell) => {
        const cellKey = cell.Cell_ID;
        const layer = extractCellLayer(cell.Cell_Name);
        const sector = extractSector(cell.Cell_Name);
        const layerMultiplier = getLayerMultiplier(layer);
        const frequencyScale = getBandFrequencyScale(cell);
        const radius = Math.max(18, baseRadius * layerMultiplier * frequencyScale);
        const colors = getCellOverlayColors(cell, layer, sector);
        const isSelectedPciCell =
          selectedPci &&
          normalizePci(cell.PCI) === normalizePci(selectedPci);
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
            const pLayer = extractCellLayer(p.cellData.Cell_Name);
            const pSector = extractSector(p.cellData.Cell_Name);
            const pColors = getCellOverlayColors(p.cellData, pLayer, pSector);
            const pIsSelectedPci =
              selectedPci &&
              normalizePci(p.cellData.PCI) === normalizePci(selectedPci);
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
          // Don't show mini tooltip if the main info window is open
          if (infoWindowRef.current && infoWindowRef.current.getMap()) {
            return;
          }

          polygon.setOptions({
            strokeWeight: 2.5,
            fillOpacity: colors.opacity + 0.15,
            zIndex: 9999,
          });

          const tooltip = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 6px 12px; font-family: -apple-system, system-ui; background: white; color: ${colors.stroke}; border-radius: 8px; font-weight: 600; font-size: 12px; border: 2px solid ${colors.fill}; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                ${cell.Cell_Name} <span style="color: #9CA3AF;">•</span> ${cell.AZIMUTH}°
              </div>
            `,
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
  }, [map, showCells, zoomLevel, filteredSites, getBaseRadiusByZoom, extractCellLayer, extractSector, getLayerMultiplier, getCellOverlayColors, getZIndexByLayer, createCellTriangle, createCellInfoWindow]);

  useEffect(() => {
    pciMarkersRef.current.forEach((marker) => marker.setMap(null));
    alarmMarkersRef.current.forEach((marker) => marker.setMap(null));
    pciMarkersRef.current.clear();
    alarmMarkersRef.current.clear();

    if (!map || !window.google || !selectedPci) return;

    const matches = [];
    filteredSites.forEach((site) => {
      site.cells
        .filter((cell) => normalizePci(cell.PCI) === normalizePci(selectedPci))
        .forEach((cell) => matches.push({ site, cell }));
    });

    const coordinateGroups = matches.reduce((groups, match) => {
      const key = `${Number(match.cell.lat).toFixed(6)},${Number(match.cell.lon).toFixed(6)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(match);
      return groups;
    }, new Map());

    coordinateGroups.forEach((group) => {
      group.forEach(({ site, cell }, index) => {
        const hasOverlap = group.length > 1;
        const angle = (360 / Math.max(group.length, 1)) * index;
        const markerPosition = hasOverlap
          ? destinationPoint(cell.lat, cell.lon, angle, 28)
          : { lat: cell.lat, lng: cell.lon };
        const markerKey = `${cell.Cell_ID || cell.Cell_Name}-${markerPosition.lat}-${markerPosition.lng}`;
        const marker = new window.google.maps.Marker({
          position: markerPosition,
          map,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: "#DC2626",
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 2,
          },
          title: `${cell.Cell_Name} - PCI ${cell.PCI}`,
          zIndex: 50000,
        });

        marker.addListener("click", () => {
          setSelectedCell(cell);
          setSelectedSite(site);
          setSelectedPciSiteId(String(site.SITEID || cell.SITEID || ""));
          if (map) {
            map.panTo(markerPosition);
            map.setZoom(Math.max(zoomLevel, 15));
          }
        });

        pciMarkersRef.current.set(markerKey, marker);
      });
    });
  }, [map, filteredSites, selectedPci, zoomLevel, destinationPoint]);

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

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-800 text-lg font-semibold">
            Loading Network Data...
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Fetching cell tower information
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-gray-50">
      <MapHeader
        sidebarOpen={sidebarOpen}
        drawerMode={drawerMode}
        analyticsDrawerOpen={analyticsDrawerOpen}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onOpenFilter={handleOpenFilter}
        onOpenAnalytics={handleOpenAnalytics}
        siteMarkerScale={siteMarkerScale}
        onDecreaseSiteSize={() => setSiteMarkerScale((value) => Math.max(0.6, Number((value - 0.1).toFixed(2))))}
        onIncreaseSiteSize={() => setSiteMarkerScale((value) => Math.min(1.6, Number((value + 0.1).toFixed(2))))}
        onResetSiteSize={() => setSiteMarkerScale(1)}
      />

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
            } absolute bottom-0 left-0 top-0 z-20 w-[420px] max-w-[92vw] transition-transform duration-300 ease-in-out bg-slate-950 shadow-2xl overflow-hidden flex flex-col border-r border-slate-800`}
        >
          {/* Sidebar Header */}
          <div className="bg-slate-950 p-4 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Radio className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">{drawerMode === "filter" ? "Filter" : "Analytics"}</h1>
                  <p className="text-slate-400 text-xs">
                    {drawerMode === "filter" ? "Data layer and site selection" : "KPI, prediction, alarm, and site insights"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-800 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-300" />
                  <span className="text-xs font-medium text-slate-300">Sites</span>
                </div>
                <p className="text-2xl font-bold">{filteredSites.length}</p>
              </div>
              <div className="rounded-lg bg-slate-800 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Signal className="h-4 w-4 text-blue-300" />
                  <span className="text-xs font-medium text-slate-300">Cells</span>
                </div>
                <p className="text-2xl font-bold">{filteredCellCount}</p>
              </div>
              <div className="rounded-lg bg-slate-800 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-300" />
                  <span className="text-xs font-medium text-slate-300">Plotted</span>
                </div>
                <p className="text-2xl font-bold">{filteredCellCount}</p>
              </div>
              <div className="rounded-lg bg-slate-800 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-300" />
                  <span className="text-xs font-medium text-slate-300">No Lat/Lon</span>
                </div>
                <p className="text-2xl font-bold">{missingCoordinateRows}</p>
              </div>
            </div>
          </div>

          {/* Data filter */}
          {drawerMode === "filter" && (
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
              onToggleWorstSites={() => setShowWorstSites(!showWorstSites)}
              showPredictions={showPredictions}
              onTogglePredictions={() => {
                const nextValue = !showPredictions;
                setShowPredictions(nextValue);

                if (nextValue) {
                  setActiveMapPanel("predictions");
                  setShowCells(false);
                }
              }}
              showAlarms={showAlarms}
              onToggleAlarms={() => setShowAlarms(!showAlarms)}
            />
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
                showMetric
              />

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
                  {activeMapPanel === "worstCells" && "Worst Cells: red numbered WC markers show the lowest ranked KPI performers. Orange site markers show poor site health."}
                  {activeMapPanel === "predictions" && "Predictions: purple markers show sites where the system recommends load balance, quality, capacity, or coverage actions."}
                  {activeMapPanel === "alarms" && "Alarms: red/orange/blue markers show open KPI alarms by severity for the selected KPI file."}
                </div>
              </div>

              {activeMapPanel === "worstCells" && (
                <div className="rounded-lg border border-orange-100 bg-orange-50 p-3">
                  <div className="mb-3 rounded-lg bg-white p-2">
                    <MapKpiSelector
                      uploads={uploads}
                      selectedFileId={selectedFileId}
                      onKpiFileChange={handleKpiFileChange}
                      metrics={kpiMetricOptions}
                      selectedMetric={selectedMetric}
                      onMetricChange={setSelectedMetric}
                      showMetric
                      compact
                    />
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
                      <p className="text-xs text-slate-500">Select a KPI metric to load worst cells.</p>
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
                  <LbPredictionControls {...lbPredictionControlProps} />
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                    <div className="rounded-lg bg-white p-2 text-red-700">C {formatNumber(activePredictionSummary?.severityCounts?.CRITICAL)}</div>
                    <div className="rounded-lg bg-white p-2 text-orange-700">M {formatNumber(activePredictionSummary?.severityCounts?.MAJOR)}</div>
                    <div className="rounded-lg bg-white p-2 text-amber-700">m {formatNumber(activePredictionSummary?.severityCounts?.MINOR)}</div>
                    <div className="rounded-lg bg-white p-2 text-emerald-700">N {formatNumber(activePredictionSummary?.severityCounts?.NORMAL)}</div>
                  </div>
                  <div className="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
                    {asArray(displayPredictions).slice(0, 8).map((item, index) => (
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
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-bold uppercase text-slate-500">Sites</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{formatNumber(siteSummary?.siteCount || uniqueSites.length)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-bold uppercase text-slate-500">Cells</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{formatNumber(siteAnalyticsTotals.cells || mapData.length)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-bold uppercase text-slate-500">Bands</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{formatNumber(siteAnalyticsTotals.bands.size)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-bold uppercase text-slate-500">Critical</div>
                <div className="mt-1 text-2xl font-black text-red-700">{formatNumber(statusCounts.CRITICAL)}</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-3 text-sm font-black text-slate-900">Map Analytics</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-blue-50 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase text-blue-600">
                    <Activity className="h-4 w-4" />
                    Coverage
                  </div>
                  <div className="mt-1 text-2xl font-black text-blue-700">
                    {formatNumber(showCells ? deckCells.length : 0)}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {showCells ? "Cells visible" : "Cells hidden"} @ Zoom {zoomLevel}
                  </div>
                </div>

                <div className="rounded-lg bg-purple-50 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase text-purple-600">
                    <Sparkles className="h-4 w-4" />
                    Predictions
                  </div>
                  <div className="mt-1 text-2xl font-black text-purple-700">
                    {formatNumber(showPredictions ? predictionMarkerCount : 0)}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {formatNumber(displayPredictions.length)} recommendation(s)
                  </div>
                </div>
              </div>

              {showPredictions && asArray(displayPredictions).length > 0 && (
                <div className="mt-3 rounded-lg border border-purple-100 bg-purple-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-purple-700">Prediction Layer</span>
                    <span className="text-xs font-black text-purple-700">
                      {formatNumber(predictionMarkerCount)} / {formatNumber(displayPredictions.length)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["Load balance", "LOAD_BALANCE"],
                      ["Quality", "QUALITY_CHECK"],
                      ["Capacity", "CAPACITY_REVIEW"],
                      ["Coverage", "COVERAGE_CHECK"],
                    ].map(([label, action]) => (
                      <div key={action} className="flex items-center gap-2 rounded-lg bg-white px-2 py-1">
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
            </div>

            {selectedPci && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase text-red-600">PCI Source / Neighbours</div>
                    <div className="text-lg font-black text-red-900">PCI {selectedPci}</div>
                    <div className="text-xs text-slate-500">
                      Source {selectedPciSiteId || "-"} - {selectedPciCount} matching cell(s)
                    </div>
                    <div className="text-xs text-slate-500">
                      {pciNeighbours.length} neighbour site(s) with same PCI
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPci("");
                      setSelectedPciSiteId("");
                    }}
                    className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                  >
                    Clear
                  </button>
                </div>
                {pciNeighbours.length > 0 && (
                  <div className="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
                    {pciNeighbours.slice(0, 8).map((site, index) => (
                      <button
                        key={site.SITEID}
                        type="button"
                        onClick={() => handleSiteMarkerClick(site)}
                        className="w-full rounded-lg border border-red-100 bg-white px-3 py-2 text-left hover:bg-red-100"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-bold text-red-900">
                            Neighbour {index + 1}: {site.SITEID}
                          </span>
                          <span className="text-xs font-bold text-red-700">
                            {site.distanceKm == null ? "-" : `${site.distanceKm.toFixed(2)} km`}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          {site.matchingPciCells.length} same-PCI cell(s)
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-slate-600">
                  <MapPin className="h-4 w-4" />
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
                        className="h-4 w-4 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-medium text-slate-600">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-slate-600">
                  <Layers className="h-4 w-4" />
                  Sectors
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {["A", "B", "C", "D"].map((sector) => {
                    const colors = getColorBySector(sector, 1);
                    return (
                      <div key={sector} className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 flex-shrink-0 rounded shadow-sm"
                          style={{
                            backgroundColor: colors.fill,
                            border: `2px solid ${colors.stroke}`,
                          }}
                        />
                        <span className="text-xs font-medium text-slate-600">{sector}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {activeMapPanel === "worstCells" && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                <div className="mb-3 rounded-lg bg-white p-2">
                  <MapKpiSelector
                    uploads={uploads}
                    selectedFileId={selectedFileId}
                    onKpiFileChange={handleKpiFileChange}
                    metrics={kpiMetricOptions}
                    selectedMetric={selectedMetric}
                    onMetricChange={setSelectedMetric}
                    showMetric
                    compact
                  />
                </div>
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-black text-red-900">Worst Cells</div>
                  <div className="rounded-full bg-white px-2 py-1 text-xs font-black text-red-700">{formatNumber(worstCells.length)}</div>
                </div>
                <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
                  {worstCells.slice(0, 18).map((row) => (
                    <button
                      key={`right-worst-${row.rank}-${row.cellName || row.cell}`}
                      type="button"
                      onClick={() => handleWorstCellClick(row)}
                      className="w-full rounded-lg border border-red-100 bg-white p-3 text-left hover:border-red-300 hover:bg-red-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-black text-slate-900">#{row.rank} {row.cellName || row.cell || "Unknown Cell"}</span>
                        <span className="text-xs font-black text-red-700">{row.averageValue ?? "-"}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span className="truncate">{row.site || "Unknown Site"}</span>
                        <span>{row.severity || "NORMAL"}</span>
                      </div>
                    </button>
                  ))}
                  {worstCells.length === 0 && <p className="text-sm text-slate-500">Select a KPI file and metric to load worst cells.</p>}
                </div>
              </div>
            )}

            {activeMapPanel === "predictions" && (
              <div className="rounded-xl border border-purple-100 bg-purple-50 p-3">
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
                <div className="mb-3 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-white p-3">
                    <div className="text-[10px] font-black uppercase text-slate-500">Load Balance</div>
                    <div className="text-lg font-black text-blue-700">{formatNumber(activePredictionSummary?.actionCounts?.LOAD_BALANCE)}</div>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <div className="text-[10px] font-black uppercase text-slate-500">Quality</div>
                    <div className="text-lg font-black text-red-700">{formatNumber(activePredictionSummary?.actionCounts?.QUALITY_CHECK)}</div>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <div className="text-[10px] font-black uppercase text-slate-500">Capacity</div>
                    <div className="text-lg font-black text-purple-700">{formatNumber(activePredictionSummary?.actionCounts?.CAPACITY_REVIEW)}</div>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <div className="text-[10px] font-black uppercase text-slate-500">Coverage</div>
                    <div className="text-lg font-black text-orange-700">{formatNumber(activePredictionSummary?.actionCounts?.COVERAGE_CHECK)}</div>
                  </div>
                </div>
                <LbPredictionControls {...lbPredictionControlProps} compact />
                <div className="max-h-[48vh] space-y-2 overflow-y-auto pr-1">
                  {asArray(displayPredictions).slice(0, 18).map((item, index) => (
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
                      className="w-full rounded-lg border border-purple-100 bg-white p-3 text-left hover:border-purple-300 hover:bg-purple-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-black text-slate-900">{item.site || item.cellName || "Prediction"}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${actionClasses[item.actionCode] || actionClasses.OBSERVE}`}>
                          {String(item.actionCode || "OBSERVE").replaceAll("_", " ")}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-[11px] text-slate-500">{item.reason || item.action || "Review site performance."}</div>
                    </button>
                  ))}
                  {asArray(displayPredictions).length === 0 && <p className="text-sm text-slate-500">No prediction recommendations found for the selected KPI file.</p>}
                </div>
              </div>
            )}

            {activeMapPanel === "alarms" && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                <div className="mb-3 text-sm font-black text-red-900">Alarms</div>
                <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
                  {asArray(alarms).slice(0, 18).map((alarm, index) => (
                    <button
                      key={`right-alarm-${alarm.id || index}`}
                      type="button"
                      className="w-full rounded-lg border border-red-100 bg-white p-3 text-left hover:border-red-300 hover:bg-red-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-black text-slate-900">{alarm.site || alarm.cellName || alarm.metricName || "Alarm"}</span>
                        <span className="text-xs font-black text-red-700">{alarm.severity || "OPEN"}</span>
                      </div>
                      <div className="mt-1 truncate text-[11px] text-slate-500">{alarm.message || alarm.recommendation || alarm.metricName || "Alarm context"}</div>
                    </button>
                  ))}
                  {asArray(alarms).length === 0 && <p className="text-sm text-slate-500">No open alarms found for the selected KPI file.</p>}
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
                      PCI Source / Neighbours
                    </div>
                    <div className="text-lg font-black text-red-900">
                      PCI {selectedPci}
                    </div>
                    <div className="text-xs text-gray-500">
                      Source {selectedPciSiteId || "-"} • {selectedPciCount} matching cell(s)
                    </div>
                    <div className="text-xs text-gray-500">
                      {pciNeighbours.length} neighbour site(s) with same PCI
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
                {pciNeighbours.length > 0 && (
                  <div className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
                    {pciNeighbours.slice(0, 8).map((site, index) => (
                      <button
                        key={site.SITEID}
                        type="button"
                        onClick={() => handleSiteMarkerClick(site)}
                        className="w-full rounded-lg border border-red-100 bg-red-50/70 px-3 py-2 text-left hover:bg-red-100"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-bold text-red-900">
                            Neighbour {index + 1}: {site.SITEID}
                          </span>
                          <span className="text-xs font-bold text-red-700">
                            {site.distanceKm == null ? "-" : `${site.distanceKm.toFixed(2)} km`}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-gray-500">
                          {site.matchingPciCells.length} same-PCI cell(s)
                        </div>
                      </button>
                    ))}
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
                onClick={() => setShowWorstSites(!showWorstSites)}
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
                onClick={() => {
                  const nextValue = !showPredictions;
                  setShowPredictions(nextValue);
                  if (nextValue) {
                    setActiveMapPanel("predictions");
                    setShowCells(false);
                  }
                }}
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

          {/* Selected Cell Panel */}
          {selectedCell && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 bg-white shadow-2xl rounded-2xl p-5 border border-gray-200 max-w-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Antenna className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-gray-900 text-lg">
                      {selectedCell.Cell_Name}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <Building2 className="w-3 h-3" />
                    Site {selectedCell.SITEID} • Layer {extractCellLayer(selectedCell.Cell_Name)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                  <Compass className="w-5 h-5 text-blue-600 mb-2" />
                  <div className="text-xs text-blue-600 font-semibold mb-1">
                    Azimuth
                  </div>
                  <div className="text-xl font-black text-blue-900">
                    {selectedCell.AZIMUTH}°
                  </div>
                </div>
                <div className="bg-violet-50 rounded-xl p-3 border border-violet-200">
                  <Hash className="w-5 h-5 text-violet-600 mb-2" />
                  <div className="text-xs text-violet-600 font-semibold mb-1">
                    PCI
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPci(String(selectedCell.PCI || ""));
                      setSelectedPciSiteId(String(selectedCell.SITEID || ""));
                    }}
                    className="text-xl font-black text-violet-900 underline-offset-4 hover:underline"
                    title="Highlight all cells with this PCI"
                  >
                    {selectedCell.PCI}
                  </button>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                  <Waves className="w-5 h-5 text-emerald-600 mb-2" />
                  <div className="text-xs text-emerald-600 font-semibold mb-1">
                    Freq
                  </div>
                  <div className="text-sm font-black text-emerald-900">
                    {selectedCell.Downlink_Center_Frequency}
                  </div>
                </div>
                <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
                  <TrendingUp className="w-5 h-5 text-orange-600 mb-2" />
                  <div className="text-xs text-orange-600 font-semibold mb-1">
                    Layer
                  </div>
                  <div className="text-xl font-black text-orange-900">
                    {extractCellLayer(selectedCell.Cell_Name)}
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
