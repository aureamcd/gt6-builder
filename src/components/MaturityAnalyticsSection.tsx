import React, { useState, useMemo } from "react";
import {
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Target,
  BarChart3,
  Sparkles,
  Compass,
  PieChart,
  Filter,
  Printer,
  RotateCcw
} from "lucide-react";
import { Form } from "@/types/form";
import {
  ConsolidatedMaturityReport,
  DimensionScoreStat,
  MATURITY_LEVELS,
  SubmissionMaturityResult,
  extractRawAnswersMap,
  generateConsolidatedMaturityReport
} from "@/lib/maturityAnalytics";

function ImapsRadarChart({ dimensions }: { dimensions: DimensionScoreStat[] }) {
  // Se houver menos de 3 dimensões, adicionamos eixos de referência das 4 camadas IMAPS para compor o polígono ou exibimos os eixos existentes
  const axes = useMemo(() => {
    if (dimensions.length >= 3) return dimensions;
    const defaultImapsKeys = [
      { key: "TIMAPS", shortLabel: "Técnica (TIMAPS)" },
      { key: "SIMAPS", shortLabel: "Semântica (SIMAPS)" },
      { key: "OIMAPS", shortLabel: "Organizacional (OIMAPS)" },
      { key: "LIMAPS", shortLabel: "Legal (LIMAPS)" }
    ];
    const merged: { key: string; shortLabel: string; averageScore: number; hasData: boolean }[] = [];
    dimensions.forEach(d => {
      merged.push({ key: d.key, shortLabel: d.shortLabel, averageScore: d.averageScore, hasData: true });
    });
    defaultImapsKeys.forEach(def => {
      if (merged.length < 4 && !merged.some(m => m.key === def.key)) {
        merged.push({ key: def.key, shortLabel: def.shortLabel, averageScore: 0, hasData: false });
      }
    });
    return merged;
  }, [dimensions]);

  const width = 460;
  const height = 320;
  const centerX = width / 2;
  const centerY = height / 2 + 4;
  const radius = 84;
  const count = axes.length;

  const getAngle = (index: number) => (Math.PI * 2 * index) / count - Math.PI / 2;

  const getCoordinates = (index: number, value: number) => {
    const angle = getAngle(index);
    const normalized = Math.max(0, Math.min(5, value)) / 5;
    const r = normalized * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle)
    };
  };

  const getLabelCoordinates = (index: number) => {
    const angle = getAngle(index);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const labelRadius = radius + 18;
    let x = centerX + labelRadius * cos;
    let y = centerY + labelRadius * sin;

    // Ajuste vertical extra para o topo e a base
    if (sin < -0.85) y -= 8;
    if (sin > 0.85) y += 6;

    const textAnchor: "start" | "middle" | "end" =
      cos > 0.18 ? "start" : cos < -0.18 ? "end" : "middle";

    return { x, y, textAnchor };
  };

  const splitLabelLines = (text: string): string[] => {
    if (text.length <= 16 || !text.includes(" ")) return [text];
    const words = text.split(" ");
    let line1 = "";
    let line2 = "";
    for (const w of words) {
      if ((line1 + " " + w).trim().length <= 16 || !line1) {
        line1 = (line1 + " " + w).trim();
      } else {
        line2 = (line2 + " " + w).trim();
      }
    }
    return line2 ? [line1, line2] : [line1];
  };

  const dataPoints = axes.map((axis, idx) => getCoordinates(idx, axis.averageScore));
  const polygonPoints = dataPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-[440px] h-auto overflow-visible select-none"
        role="img"
        aria-label="Gráfico Radar de Maturidade IMAPS"
      >
        {/* Polígonos concêntricos para os Níveis 1 a 5 */}
        {[1, 2, 3, 4, 5].map(lvl => {
          const ringPoints = axes
            .map((_, idx) => {
              const pt = getCoordinates(idx, lvl);
              return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
            })
            .join(" ");
          return (
            <polygon
              key={lvl}
              points={ringPoints}
              fill={lvl % 2 === 0 ? "rgba(241, 245, 249, 0.5)" : "none"}
              stroke={lvl === 5 ? "#cbd5e1" : "#e2e8f0"}
              strokeWidth={lvl === 5 ? 1.5 : 1}
              strokeDasharray={lvl < 5 ? "3 2" : undefined}
            />
          );
        })}

        {/* Eixos Radiais */}
        {axes.map((_, idx) => {
          const end = getCoordinates(idx, 5);
          return (
            <line
              key={idx}
              x1={centerX}
              y1={centerY}
              x2={end.x}
              y2={end.y}
              stroke="#cbd5e1"
              strokeWidth={1}
            />
          );
        })}

        {/* Rótulos dos níveis internos (1.0 a 4.0) com halo branco para leitura limpa */}
        {[1, 2, 3, 4].map(lvl => {
          const yPos = centerY - (lvl / 5) * radius;
          return (
            <text
              key={lvl}
              x={centerX + 5}
              y={yPos + 3}
              fontSize="8.5"
              fontWeight="700"
              fill="#94a3b8"
              stroke="#ffffff"
              strokeWidth="2.5"
              style={{ paintOrder: "stroke" }}
            >
              {lvl}.0
            </text>
          );
        })}

        {/* Polígono Preenchido dos Scores */}
        <polygon
          points={polygonPoints}
          fill="rgba(79, 70, 229, 0.18)"
          stroke="#4f46e5"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />

        {/* Vértices e Rótulos Externos */}
        {axes.map((axis, idx) => {
          const pt = dataPoints[idx];
          const labelPos = getLabelCoordinates(idx);
          const hasData = "hasData" in axis ? axis.hasData : true;
          const lines = splitLabelLines(axis.shortLabel);
          const scoreYOffset = lines.length > 1 ? 16 : 8;
          return (
            <g key={axis.key}>
              {hasData && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={4.5}
                  fill="#4f46e5"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              )}
              {lines.map((line, lIdx) => (
                <text
                  key={lIdx}
                  x={labelPos.x}
                  y={labelPos.y - (lines.length > 1 ? 8 : 4) + lIdx * 11}
                  textAnchor={labelPos.textAnchor}
                  dominantBaseline="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill={hasData ? "#1e293b" : "#94a3b8"}
                  stroke="#ffffff"
                  strokeWidth="3"
                  style={{ paintOrder: "stroke" }}
                >
                  {line}
                </text>
              ))}
              {hasData && (
                <text
                  x={labelPos.x}
                  y={labelPos.y + scoreYOffset}
                  textAnchor={labelPos.textAnchor}
                  dominantBaseline="middle"
                  fontSize="10"
                  fontWeight="800"
                  fill="#4f46e5"
                  stroke="#ffffff"
                  strokeWidth="3"
                  style={{ paintOrder: "stroke" }}
                >
                  {axis.averageScore.toFixed(2)} / 5
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function MaturityAnalyticsSection({
  report,
  schema,
  responsesList
}: {
  report: ConsolidatedMaturityReport;
  schema?: Form | null;
  responsesList?: any[];
}) {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>("ALL");
  const [selectedFilterQuestionId, setSelectedFilterQuestionId] = useState<string>("");
  const [selectedFilterValue, setSelectedFilterValue] = useState<string>("");

  // Recalcular relatório quando houver filtro ativo (por envio ou por segmento ex: Unidade/Função)
  const activeReport = useMemo(() => {
    if (!schema || !responsesList) return report;
    if (selectedSubmissionId === "ALL" && (!selectedFilterQuestionId || !selectedFilterValue)) {
      return report;
    }

    // Mapear opções da pergunta filtro para comparar tanto ID quanto texto
    let optionLabelMap = new Map<string, string>();
    if (selectedFilterQuestionId) {
      schema.sections?.forEach(sec => {
        sec.questions?.forEach(q => {
          if (q.id === selectedFilterQuestionId) {
            q.options?.forEach(o => {
              if (o.id && o.label) optionLabelMap.set(o.id, o.label);
            });
          }
        });
      });
    }

    const filteredList = responsesList.filter((resp, idx) => {
      const subId = resp.id || `sub_${idx}`;
      if (selectedSubmissionId !== "ALL" && subId !== selectedSubmissionId) {
        return false;
      }

      if (selectedFilterQuestionId && selectedFilterValue) {
        const rawMap = extractRawAnswersMap(resp);
        const rawVal = rawMap[selectedFilterQuestionId];
        if (rawVal === null || rawVal === undefined || rawVal === "") return false;
        const strVal = String(rawVal).trim();
        const resolved = strVal.startsWith("other:")
          ? strVal.replace("other:", "").trim()
          : (optionLabelMap.get(strVal) || strVal);
        if (resolved.toLowerCase() !== selectedFilterValue.toLowerCase()) {
          return false;
        }
      }

      return true;
    });

    return generateConsolidatedMaturityReport(schema, filteredList);
  }, [report, schema, responsesList, selectedSubmissionId, selectedFilterQuestionId, selectedFilterValue]);

  const hasActiveFilter = selectedSubmissionId !== "ALL" || Boolean(selectedFilterQuestionId && selectedFilterValue);

  if (!report.hasWeightedQuestions || report.scoredSubmissionsCount === 0) {
    return (
      <div id="analise-maturidade" className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              Análise de Respostas & Diagnóstico (IMAPS)
            </h3>
            <p className="text-xs text-slate-500">
              Para ativar também o cálculo de maturidade (escala 1 a 5 e Gráfico Radar), basta atribuir pesos nas opções de perguntas no Construtor.
            </p>
          </div>
        </div>

        {report.qualitativeHighlights.length > 0 && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <PieChart size={18} className="text-indigo-600 shrink-0" />
              <h4 className="text-sm sm:text-base font-extrabold text-slate-800">
                Distribuição de Respostas por Pergunta
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.qualitativeHighlights.map(item => (
                <div
                  key={item.questionId}
                  className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 space-y-3"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {item.sectionTitle}
                    </span>
                    <h5 className="text-xs sm:text-sm font-bold text-slate-800 mt-1.5 leading-snug">
                      {item.label}
                    </h5>
                  </div>
                  <div className="space-y-2">
                    {item.topOptions.map((opt, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700 truncate pr-2">{opt.label}</span>
                          <span className="font-bold text-slate-600 shrink-0">
                            {opt.count} ({opt.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${Math.max(5, opt.percentage)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const {
    overallScore,
    overallPercentage,
    overallLevel,
    dimensions,
    strongestDimension,
    weakestDimension,
    criticalQuestions,
    developingQuestions,
    strongQuestions,
    qualitativeHighlights,
    levelDistribution,
    scoredSubmissionsCount
  } = activeReport;

  const selectedSegmentFilterObj = report.segmentFilters.find(f => f.questionId === selectedFilterQuestionId);

  return (
    <section
      id="analise-maturidade"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden space-y-0 print:shadow-none print:border-slate-300"
    >
      {/* Faixa Superior */}
      <div className="h-1.5 w-full bg-gradient-to-r from-indigo-600 via-violet-600 to-emerald-500" />

      {/* Cabeçalho da Análise */}
      <div className="p-4 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-200 shrink-0">
              <Award size={24} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  Diagnóstico IMAPS • Escala 1 a 5
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Baseado em {scoredSubmissionsCount} {scoredSubmissionsCount === 1 ? "envio avaliado" : "envios avaliados"}
                </span>
              </div>
              <h3 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                Análise de Maturidade & Diagnóstico Consolidado
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className={`px-3.5 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 ${overallLevel.badgeClass}`}>
              <span>Classificação:</span>
              <span className="font-extrabold">{overallLevel.name}</span>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="print:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              title="Imprimir ou Salvar Laudo de Diagnóstico em PDF"
            >
              <Printer size={14} className="text-indigo-600" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros Dinâmicos por Envio ou por Segmento (Unidade, Função, etc.) */}
        {responsesList && responsesList.length > 0 && (
          <div className="print:hidden bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/80 flex flex-wrap items-center gap-2.5 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mr-1">
              <Filter size={14} className="text-indigo-600" />
              <span>Filtrar Diagnóstico:</span>
            </div>

            {/* Filtro por Envio */}
            <select
              value={selectedSubmissionId}
              onChange={(e) => setSelectedSubmissionId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-semibold outline-none focus:border-indigo-500 max-w-full"
            >
              <option value="ALL">Todos os Envios ({responsesList.length})</option>
              {responsesList.map((resp, idx) => {
                const subId = resp.id || `sub_${idx}`;
                const dateStr = resp.submitted_at || resp.created_at
                  ? new Date(resp.submitted_at || resp.created_at).toLocaleDateString("pt-BR")
                  : "";
                return (
                  <option key={subId} value={subId}>
                    Envio #{responsesList.length - idx} {dateStr ? `(${dateStr})` : ""}
                  </option>
                );
              })}
            </select>

            {/* Filtro por Pergunta de Segmentação (Unidade, Cargo, etc.) */}
            {report.segmentFilters.length > 0 && (
              <>
                <select
                  value={selectedFilterQuestionId}
                  onChange={(e) => {
                    setSelectedFilterQuestionId(e.target.value);
                    setSelectedFilterValue("");
                  }}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium outline-none focus:border-indigo-500 max-w-xs truncate"
                >
                  <option value="">Segmentar por critério (ex: Unidade/Função)...</option>
                  {report.segmentFilters.map(f => (
                    <option key={f.questionId} value={f.questionId}>
                      {f.questionLabel}
                    </option>
                  ))}
                </select>

                {selectedSegmentFilterObj && (
                  <select
                    value={selectedFilterValue}
                    onChange={(e) => setSelectedFilterValue(e.target.value)}
                    className="text-xs bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5 text-indigo-800 font-bold outline-none focus:border-indigo-500 max-w-xs truncate"
                  >
                    <option value="">Todas as respostas ({selectedSegmentFilterObj.values.length})</option>
                    {selectedSegmentFilterObj.values.map(v => (
                      <option key={v.value} value={v.value}>
                        {v.value} ({v.count})
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}

            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSubmissionId("ALL");
                  setSelectedFilterQuestionId("");
                  setSelectedFilterValue("");
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ml-auto"
              >
                <RotateCcw size={12} />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-4 sm:p-8 space-y-8">
        {/* 1. Card Principal de Score Global + Régua de Maturidade */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Bloco Esquerdo: Nota Global */}
          <div className={`lg:col-span-5 rounded-2xl p-5 sm:p-6 border ${overallLevel.borderClass} ${overallLevel.bgClass} flex flex-col justify-between space-y-4`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Índice Geral de Maturidade
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-4xl sm:text-5xl font-black tracking-tight ${overallLevel.colorClass}`}>
                    {overallScore.toFixed(2)}
                  </span>
                  <span className="text-sm font-bold text-slate-400">/ 5.00</span>
                </div>
              </div>
              <div className="bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-xl px-3 py-2 text-right shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Aderência
                </span>
                <span className="text-lg font-black text-slate-800">{overallPercentage}%</span>
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="space-y-1.5">
              <div className="w-full h-3 bg-white/80 rounded-full overflow-hidden border border-slate-200/60 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${overallLevel.barColorClass}`}
                  style={{ width: `${Math.max(8, (overallScore / 5) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>1.0 (Ad Hoc)</span>
                <span>3.0 (Essencial)</span>
                <span>5.0 (Contínuo)</span>
              </div>
            </div>

            <div className="bg-white/90 rounded-xl p-3.5 border border-slate-200/70 space-y-1.5">
              <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                {overallLevel.description}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed pt-1 border-t border-slate-100">
                <strong className="text-indigo-700">Diretriz Recomendada:</strong> {overallLevel.recommendation}
              </p>
            </div>
          </div>

          {/* Bloco Direito: Escala de 5 Níveis IMAPS + Destaques Extremos */}
          <div className="lg:col-span-7 bg-slate-50/70 rounded-2xl p-4 sm:p-6 border border-slate-200/80 flex flex-col justify-between space-y-5">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Compass size={15} className="text-indigo-600 shrink-0" />
                  <span>Posicionamento na Escala IMAPS (1 a 5)</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-medium">
                  Faixa atual: {overallLevel.rangeLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {([1, 2, 3, 4, 5] as const).map(lvl => {
                  const info = MATURITY_LEVELS[lvl];
                  const isCurrent = overallLevel.level === lvl;
                  const dist = levelDistribution.find(d => d.levelInfo.level === lvl);
                  return (
                    <div
                      key={lvl}
                      className={`rounded-xl p-3 border transition-all flex flex-col justify-between ${
                        isCurrent
                          ? `${info.bgClass} ${info.borderClass} ring-2 ring-indigo-500/30 shadow-xs`
                          : "bg-white border-slate-200/80 opacity-75"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-[10px] font-black uppercase ${isCurrent ? info.colorClass : "text-slate-400"}`}>
                            Nível {lvl}
                          </span>
                          {isCurrent && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                          )}
                        </div>
                        <p className={`text-xs font-extrabold mt-0.5 ${isCurrent ? "text-slate-900" : "text-slate-700"}`}>
                          {info.shortName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {info.rangeLabel}
                        </p>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Envios:</span>
                        <span className="font-bold text-slate-700">
                          {dist ? `${dist.count} (${dist.percentage}%)` : "0"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Destaques Rápidos: Maior Força vs Principal Gargalo */}
            {strongestDimension && weakestDimension && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-white rounded-xl p-3.5 border border-emerald-200/80 flex items-start gap-3 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingUp size={16} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                      Dimensão Mais Madura
                    </span>
                    <p className="text-xs font-extrabold text-slate-800 truncate">
                      {strongestDimension.label}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Média <strong className="text-emerald-700">{strongestDimension.averageScore.toFixed(2)}</strong> ({strongestDimension.levelInfo.shortName})
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3.5 border border-amber-200/80 flex items-start gap-3 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Target size={16} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                      Dimensão Prioritária (Gargalo)
                    </span>
                    <p className="text-xs font-extrabold text-slate-800 truncate">
                      {weakestDimension.label}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Média <strong className="text-amber-700">{weakestDimension.averageScore.toFixed(2)}</strong> ({weakestDimension.levelInfo.shortName})
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Análise Multidimensional por Camadas / Seções + Gráfico Radar IMAPS */}
        {dimensions.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-indigo-600 shrink-0" />
                <h4 className="text-sm sm:text-base font-extrabold text-slate-800">
                  Desempenho por Dimensão / Camada IMAPS
                </h4>
              </div>
              <span className="text-xs text-slate-400">
                Média ponderada por camada (1.0 a 5.0)
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Gráfico Radar Vetorial (Teia IMAPS) */}
              <div className="lg:col-span-5 bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80 flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Visão em Radar (Eixos de Maturidade)
                </span>
                <ImapsRadarChart dimensions={dimensions} />
              </div>

              {/* Barras Detalhadas por Dimensão */}
              <div className="lg:col-span-7 grid grid-cols-1 gap-3.5">
                {dimensions.map(dim => (
                  <div
                    key={dim.key}
                    className="bg-slate-50/60 hover:bg-slate-50 rounded-xl p-4 border border-slate-200/80 transition-all space-y-2.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                          {dim.label}
                        </h5>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {dim.subtitle}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${dim.levelInfo.badgeClass}`}>
                          {dim.averageScore.toFixed(2)} • {dim.levelInfo.shortName}
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${dim.levelInfo.barColorClass}`}
                        style={{ width: `${Math.max(8, (dim.averageScore / 5) * 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{dim.questionsCount} {dim.questionsCount === 1 ? "critério avaliado" : "critérios avaliados"}</span>
                      <span>Índice de maturidade: <strong className="text-slate-600">{dim.percentage}%</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. Diagnóstico Detalhado por Critério: Gargalos vs Pontos Fortes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-indigo-600 shrink-0" />
              <h4 className="text-sm sm:text-base font-extrabold text-slate-800">
                Diagnóstico por Critério (Gargalos Críticos vs. Forças Consolidadas)
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Coluna 1: Gargalos Críticos (< 2.6) */}
            <div className="bg-red-50/40 rounded-xl p-4 border border-red-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-700 font-bold text-xs sm:text-sm">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>Gargalos Críticos (&lt; 2.6)</span>
                </div>
                <span className="text-xs font-extrabold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  {criticalQuestions.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Critérios em nível Ad Hoc ou Oportunista que demandam intervenção prioritária.
              </p>

              {criticalQuestions.length === 0 ? (
                <div className="bg-white/80 rounded-lg p-3 text-xs text-slate-500 border border-red-100 text-center">
                  Nenhum gargalo crítico identificado abaixo de 2.60.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {criticalQuestions.map(q => (
                    <div key={q.questionId} className="bg-white rounded-lg p-3 border border-red-200/70 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                          {q.sectionTitle}
                        </span>
                        <span className="text-xs font-black text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 shrink-0">
                          {q.averageScore.toFixed(2)} / 5
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 leading-snug">
                        {q.label}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Coluna 2: Em Evolução / Intermediário (2.6 - 3.39) */}
            <div className="bg-amber-50/40 rounded-xl p-4 border border-amber-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-xs sm:text-sm">
                  <Target size={16} className="shrink-0" />
                  <span>Em Estruturação (2.6 – 3.39)</span>
                </div>
                <span className="text-xs font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  {developingQuestions.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Práticas em nível Essencial que já funcionam, mas precisam de padronização e automação.
              </p>

              {developingQuestions.length === 0 ? (
                <div className="bg-white/80 rounded-lg p-3 text-xs text-slate-500 border border-amber-100 text-center">
                  Nenhum critério na faixa intermediária no momento.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {developingQuestions.map(q => (
                    <div key={q.questionId} className="bg-white rounded-lg p-3 border border-amber-200/70 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                          {q.sectionTitle}
                        </span>
                        <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0">
                          {q.averageScore.toFixed(2)} / 5
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 leading-snug">
                        {q.label}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Coluna 3: Pontos Fortes (>= 3.4) */}
            <div className="bg-emerald-50/40 rounded-xl p-4 border border-emerald-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs sm:text-sm">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>Pontos Fortes (&ge; 3.4)</span>
                </div>
                <span className="text-xs font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  {strongQuestions.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Critérios em nível Sustentável ou Contínuo com boa maturidade institucional.
              </p>

              {strongQuestions.length === 0 ? (
                <div className="bg-white/80 rounded-lg p-3 text-xs text-slate-500 border border-emerald-100 text-center">
                  Nenhum critério atingiu pontuação igual ou superior a 3.40 ainda.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {strongQuestions.map(q => (
                    <div key={q.questionId} className="bg-white rounded-lg p-3 border border-emerald-200/70 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                          {q.sectionTitle}
                        </span>
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                          {q.averageScore.toFixed(2)} / 5
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 leading-snug">
                        {q.label}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Análise Complementar (Além dos Pesos): Perfil de Sistemas, Meios e Ferramentas Mapeadas */}
        {qualitativeHighlights.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <PieChart size={18} className="text-indigo-600 shrink-0" />
                <h4 className="text-sm sm:text-base font-extrabold text-slate-800">
                  Mapeamento Complementar de Uso (Perguntas Qualitativas sem Peso)
                </h4>
              </div>
              <span className="text-xs text-slate-400">
                Frequência das opções mais selecionadas pelos respondentes
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {qualitativeHighlights.map(item => (
                <div
                  key={item.questionId}
                  className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 space-y-3"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {item.sectionTitle}
                    </span>
                    <h5 className="text-xs sm:text-sm font-bold text-slate-800 mt-1.5 leading-snug">
                      {item.label}
                    </h5>
                  </div>

                  <div className="space-y-2">
                    {item.topOptions.map((opt, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700 truncate pr-2">{opt.label}</span>
                          <span className="font-bold text-slate-600 shrink-0">
                            {opt.count} ({opt.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${Math.max(5, opt.percentage)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Resumo exibido ao final da página pública/preview para o respondente após enviar o formulário
 */
export function RespondentMaturitySummaryCard({
  result
}: {
  result: SubmissionMaturityResult | null;
}) {
  if (!result || result.averageScore === null || !result.levelInfo) return null;

  const { averageScore, percentage, levelInfo, dimensionScores } = result;

  return (
    <div className="mt-8 pt-8 border-t border-slate-200/80 text-left space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <Award size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
              Resultado Preliminar da Sua Avaliação
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              Diagnóstico de Maturidade (IMAPS)
            </h3>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${levelInfo.badgeClass}`}>
          {levelInfo.name}
        </span>
      </div>

      <div className={`rounded-2xl p-5 border ${levelInfo.borderClass} ${levelInfo.bgClass} space-y-3`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Pontuação Obtida
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-3xl font-black ${levelInfo.colorClass}`}>
                {averageScore.toFixed(2)}
              </span>
              <span className="text-xs font-bold text-slate-400">/ 5.00 ({percentage}% de aderência)</span>
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
          {levelInfo.description}
        </p>
        <p className="text-xs text-slate-600 bg-white/80 p-3 rounded-xl border border-slate-200/60">
          <strong className="text-indigo-700">Próximo passo recomendado:</strong> {levelInfo.recommendation}
        </p>
      </div>

      {dimensionScores.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {dimensionScores.map(dim => (
            <div key={dim.key} className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700 truncate">{dim.label}</span>
                <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded border ${dim.levelInfo.badgeClass}`}>
                  {dim.averageScore.toFixed(2)} • {dim.levelInfo.shortName}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${dim.levelInfo.barColorClass}`}
                  style={{ width: `${Math.max(8, (dim.averageScore / 5) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
