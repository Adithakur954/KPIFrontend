import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  createThresholdRule,
  deleteThresholdRule,
  evaluateThresholdRule,
  fetchThresholdRules,
  updateThresholdRule,
} from "./thresholdRuleService";

const emptyForm = {
  metricName: "",
  technology: "",
  direction: "LOWER_IS_BAD",
  criticalValue: "",
  majorValue: "",
  minorValue: "",
  warningValue: "",
  enabled: true,
};

const emptyEvaluation = {
  metricName: "",
  technology: "",
  value: "",
};

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildPayload(form) {
  return {
    metricName: form.metricName.trim(),
    technology: form.technology.trim() || null,
    direction: form.direction,
    criticalValue: toNumberOrNull(form.criticalValue),
    majorValue: toNumberOrNull(form.majorValue),
    minorValue: toNumberOrNull(form.minorValue),
    warningValue: toNumberOrNull(form.warningValue),
    enabled: Boolean(form.enabled),
  };
}

function severityClasses(severity) {
  switch (String(severity || "").toUpperCase()) {
    case "CRITICAL":
      return "bg-red-50 text-red-700 border-red-200";
    case "MAJOR":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "MINOR":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "WARNING":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
}

export default function ThresholdRulesPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [evaluation, setEvaluation] = useState(emptyEvaluation);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  const sortedRules = useMemo(() => {
    return [...rules].sort((a, b) => String(a.metricName || "").localeCompare(String(b.metricName || "")));
  }, [rules]);

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    setLoading(true);
    const response = await fetchThresholdRules();
    if (response?.success) {
      setRules(Array.isArray(response.data) ? response.data : []);
    } else {
      showMessage(response?.message || "Failed to load threshold rules.", "error");
    }
    setLoading(false);
  }

  function showMessage(text, type = "success") {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 3000);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(rule) {
    setEditingId(rule.id);
    setForm({
      metricName: rule.metricName || "",
      technology: rule.technology || "",
      direction: rule.direction || "LOWER_IS_BAD",
      criticalValue: rule.criticalValue ?? "",
      majorValue: rule.majorValue ?? "",
      minorValue: rule.minorValue ?? "",
      warningValue: rule.warningValue ?? "",
      enabled: rule.enabled !== false,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.metricName.trim()) {
      showMessage("Metric name is required.", "error");
      return;
    }

    setSaving(true);
    const payload = buildPayload(form);
    const response = editingId
      ? await updateThresholdRule(editingId, payload)
      : await createThresholdRule(payload);

    if (response?.success) {
      showMessage(response.message || "Threshold rule saved.");
      resetForm();
      await loadRules();
    } else {
      showMessage(response?.message || "Failed to save threshold rule.", "error");
    }
    setSaving(false);
  }

  async function handleDelete(rule) {
    const confirmed = window.confirm(`Delete threshold rule for "${rule.metricName}"?`);
    if (!confirmed) return;
    const response = await deleteThresholdRule(rule.id);
    if (response?.success) {
      showMessage(response.message || "Threshold rule deleted.");
      await loadRules();
    } else {
      showMessage(response?.message || "Failed to delete threshold rule.", "error");
    }
  }

  async function handleEvaluate(event) {
    event.preventDefault();
    if (!evaluation.metricName.trim() || evaluation.value === "") {
      showMessage("Metric name and value are required for evaluation.", "error");
      return;
    }
    setEvaluating(true);
    const response = await evaluateThresholdRule(evaluation);
    if (response?.success) {
      setEvaluationResult(response.data);
    } else {
      showMessage(response?.message || "Failed to evaluate threshold.", "error");
      setEvaluationResult(null);
    }
    setEvaluating(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Threshold Rules</h1>
            <p className="mt-1 text-sm text-slate-500">
              Configure KPI severity rules for alarms, rankings, and dashboard health.
            </p>
          </div>
          <button
            type="button"
            onClick={loadRules}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
          >
            <Activity className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {message && (
          <div
            className={`rounded-xl border p-4 text-sm ${
              messageType === "error"
                ? "border-red-100 bg-red-50 text-red-700"
                : "border-emerald-100 bg-emerald-50 text-emerald-700"
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {editingId ? "Edit Rule" : "Add Rule"}
                  </h2>
                  <p className="text-xs text-slate-500">Set severity values for a KPI metric.</p>
                </div>
                {editingId && (
                  <button type="button" onClick={resetForm} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Metric Name</label>
                  <input
                    value={form.metricName}
                    onChange={(e) => setForm((current) => ({ ...current, metricName: e.target.value }))}
                    placeholder="Availability"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Technology</label>
                  <input
                    value={form.technology}
                    onChange={(e) => setForm((current) => ({ ...current, technology: e.target.value }))}
                    placeholder="4G"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Direction</label>
                  <select
                    value={form.direction}
                    onChange={(e) => setForm((current) => ({ ...current, direction: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="LOWER_IS_BAD">Lower is bad</option>
                    <option value="HIGHER_IS_BAD">Higher is bad</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {["criticalValue", "majorValue", "minorValue", "warningValue"].map((field) => (
                    <div key={field}>
                      <label className="mb-1 block text-xs font-medium capitalize text-slate-700">
                        {field.replace("Value", "")}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={form[field]}
                        onChange={(e) => setForm((current) => ({ ...current, [field]: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  ))}
                </div>

                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setForm((current) => ({ ...current, enabled: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Enabled
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingId ? "Update Rule" : "Create Rule"}
                </button>
              </div>
            </form>

            <form onSubmit={handleEvaluate} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Evaluate Severity</h2>
              <p className="mb-4 mt-1 text-xs text-slate-500">Test one KPI value against saved rules.</p>
              <div className="space-y-3">
                <input
                  value={evaluation.metricName}
                  onChange={(e) => setEvaluation((current) => ({ ...current, metricName: e.target.value }))}
                  placeholder="Metric name"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <input
                  value={evaluation.technology}
                  onChange={(e) => setEvaluation((current) => ({ ...current, technology: e.target.value }))}
                  placeholder="Technology"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <input
                  type="number"
                  step="any"
                  value={evaluation.value}
                  onChange={(e) => setEvaluation((current) => ({ ...current, value: e.target.value }))}
                  placeholder="Value"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="submit"
                  disabled={evaluating}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                >
                  {evaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                  Evaluate
                </button>
                {evaluationResult && (
                  <div className={`rounded-xl border p-3 text-sm font-semibold ${severityClasses(evaluationResult.severity)}`}>
                    Severity: {evaluationResult.severity}
                  </div>
                )}
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-semibold text-slate-900">Saved Rules</h2>
              <p className="text-xs text-slate-500">Rules are matched by metric name and optional technology.</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading rules...
              </div>
            ) : sortedRules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">No threshold rules yet</p>
                <p className="mt-1 text-xs text-slate-500">Create your first rule from the form.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Metric</th>
                      <th className="px-4 py-3">Tech</th>
                      <th className="px-4 py-3">Direction</th>
                      <th className="px-4 py-3">Critical</th>
                      <th className="px-4 py-3">Major</th>
                      <th className="px-4 py-3">Minor</th>
                      <th className="px-4 py-3">Warning</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{rule.metricName}</td>
                        <td className="px-4 py-3 text-slate-600">{rule.technology || "All"}</td>
                        <td className="px-4 py-3 text-slate-600">{rule.direction}</td>
                        <td className="px-4 py-3 text-slate-600">{rule.criticalValue ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{rule.majorValue ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{rule.minorValue ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{rule.warningValue ?? "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${
                            rule.enabled ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"
                          }`}>
                            <CheckCircle className="h-3 w-3" />
                            {rule.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(rule)}
                              className="rounded-lg border border-blue-100 bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(rule)}
                              className="rounded-lg border border-red-100 bg-red-50 p-2 text-red-700 hover:bg-red-100"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
