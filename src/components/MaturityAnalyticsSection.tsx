import React from "react";
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
  PieChart
} from "lucide-react";
import {
  ConsolidatedMaturityReport,
  MATURITY_LEVELS,
  SubmissionMaturityResult
} from "@/lib/maturityAnalytics";

export function MaturityAnalyticsSection({
  report
}: {
  report: ConsolidatedMaturityReport;
}) {
  if (!report.hasWeightedQuestions || report.scoredSubmissionsCount === 0) {
    return (
      <div id="analise-maturidade" className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              Análise de Maturidade Baseada em Pesos (IMAPS)
            </h3>
            <p className="text-xs text-slate-500">
              Configure pesos (1 a 5) nas opções de perguntas no Construtor para gerar automaticamente o diagnóstico consolidado ao final desta página.
            </p>
          </div>
        </div>
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
  } = report;

  return (
    <section
      id="analise-maturidade"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden space-y-0"
    >
      {/* Faixa Superior */}
      <div className="h-1.5 w-full bg-gradient-to-r from-indigo-600 via-violet-600 to-emerald-500" />

      {/* Cabeçalho da Análise */}
      <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-200 shrink-0">
            <Award size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                Diagnóstico Automático • Escala 1 a 5
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Baseado em {scoredSubmissionsCount} {scoredSubmissionsCount === 1 ? "envio avaliado" : "envios avaliados"}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              Análise de Maturidade & Diagnóstico Consolidado
            </h3>
          </div>
        </div>

        <div className={`px-4 py-2 rounded-xl border font-bold text-xs sm:text-sm flex items-center gap-2 ${overallLevel.badgeClass}`}>
          <span>Classificação Global:</span>
          <span className="font-extrabold">{overallLevel.name}</span>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        {/* 1. Card Principal de Score Global + Régua de Maturidade */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Bloco Esquerdo: Nota Global */}
          <div className={`lg:col-span-5 rounded-2xl p-6 border ${overallLevel.borderClass} ${overallLevel.bgClass} flex flex-col justify-between space-y-4`}>
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
          <div className="lg:col-span-7 bg-slate-50/70 rounded-2xl p-5 sm:p-6 border border-slate-200/80 flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Compass size={15} className="text-indigo-600" />
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

        {/* 2. Análise Multidimensional por Camadas / Seções */}
        {dimensions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-indigo-600" />
                <h4 className="text-sm sm:text-base font-extrabold text-slate-800">
                  Desempenho por Dimensão / Camada Avaliada
                </h4>
              </div>
              <span className="text-xs text-slate-400">
                Média ponderada por camada (1.0 a 5.0)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dimensions.map(dim => (
                <div
                  key={dim.key}
                  className="bg-slate-50/60 hover:bg-slate-50 rounded-xl p-4 border border-slate-200/80 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
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
        )}

        {/* 3. Diagnóstico Detalhado por Critério: Gargalos vs Pontos Fortes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-indigo-600" />
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
                <PieChart size={18} className="text-indigo-600" />
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
