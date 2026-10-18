import { Form, Question } from "@/types/form";

export interface MaturityLevelInfo {
  level: 1 | 2 | 3 | 4 | 5;
  name: string;
  shortName: string;
  rangeLabel: string;
  description: string;
  recommendation: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  barColorClass: string;
  badgeClass: string;
}

export interface QuestionScoreStat {
  questionId: string;
  label: string;
  sectionTitle: string;
  dimensionKey: string;
  dimensionLabel: string;
  averageScore: number;
  minScore: number;
  maxScore: number;
  responsesCount: number;
  levelInfo: MaturityLevelInfo;
}

export interface DimensionScoreStat {
  key: string;
  label: string;
  subtitle: string;
  averageScore: number;
  percentage: number;
  questionsCount: number;
  responsesCount: number;
  levelInfo: MaturityLevelInfo;
}

export interface QualitativeQuestionStat {
  questionId: string;
  label: string;
  sectionTitle: string;
  totalResponses: number;
  topOptions: { label: string; count: number; percentage: number }[];
}

export interface SubmissionMaturityResult {
  submissionId: string;
  averageScore: number | null;
  percentage: number | null;
  scoredAnswersCount: number;
  levelInfo: MaturityLevelInfo | null;
  dimensionScores: { key: string; label: string; averageScore: number; levelInfo: MaturityLevelInfo }[];
}

export interface ConsolidatedMaturityReport {
  hasWeightedQuestions: boolean;
  totalSubmissions: number;
  scoredSubmissionsCount: number;
  overallScore: number;
  overallPercentage: number;
  overallLevel: MaturityLevelInfo;
  dimensions: DimensionScoreStat[];
  strongestDimension: DimensionScoreStat | null;
  weakestDimension: DimensionScoreStat | null;
  questionStats: QuestionScoreStat[];
  criticalQuestions: QuestionScoreStat[];
  developingQuestions: QuestionScoreStat[];
  strongQuestions: QuestionScoreStat[];
  qualitativeHighlights: QualitativeQuestionStat[];
  levelDistribution: { levelInfo: MaturityLevelInfo; count: number; percentage: number }[];
  bySubmission: Map<string, SubmissionMaturityResult>;
}

const IMAPS_DIMENSION_LABELS: Record<string, { label: string; subtitle: string }> = {
  TIMAPS: {
    label: "TIMAPS • Interoperabilidade Técnica",
    subtitle: "Infraestrutura, APIs, integração de sistemas e automação de troca de dados"
  },
  SIMAPS: {
    label: "SIMAPS • Interoperabilidade Semântica",
    subtitle: "Padronização de dados, vocabulários, metadados e compreensão mútua"
  },
  OIMAPS: {
    label: "OIMAPS • Interoperabilidade Organizacional",
    subtitle: "Processos de negócio, fluxos intersetoriais, governança e colaboração"
  },
  LIMAPS: {
    label: "LIMAPS • Interoperabilidade Legal",
    subtitle: "Conformidade normativa, LGPD, acordos formais e respaldo jurídico"
  }
};

export const MATURITY_LEVELS: Record<1 | 2 | 3 | 4 | 5, MaturityLevelInfo> = {
  1: {
    level: 1,
    name: "Nível 1 • Ad Hoc (Inicial)",
    shortName: "Ad Hoc",
    rangeLabel: "1.00 – 1.79",
    description: "Processos de troca de informações manuais, fragmentados ou improvisados, com alta dependência de pessoas e retrabalho.",
    recommendation: "Priorizar o mapeamento dos fluxos críticos, eliminar controles puramente informais e definir padrões mínimos de registro e compartilhamento.",
    colorClass: "text-red-700",
    bgClass: "bg-red-50",
    borderClass: "border-red-200",
    barColorClass: "bg-red-500",
    badgeClass: "bg-red-50 text-red-700 border-red-200"
  },
  2: {
    level: 2,
    name: "Nível 2 • Oportunista (Básico)",
    shortName: "Oportunista",
    rangeLabel: "1.80 – 2.59",
    description: "Existem iniciativas pontuais de integração ou uso de sistemas, mas ainda sem padronização institucional ou integração automática.",
    recommendation: "Reduzir o uso de meios paralelos (planilhas avulsas, mensagens) e formalizar integrações e catálogos de dados entre os sistemas principais.",
    colorClass: "text-orange-700",
    bgClass: "bg-orange-50",
    borderClass: "border-orange-200",
    barColorClass: "bg-orange-500",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200"
  },
  3: {
    level: 3,
    name: "Nível 3 • Essencial (Intermediário)",
    shortName: "Essencial",
    rangeLabel: "2.60 – 3.39",
    description: "Fluxos principais e sistemas estruturantes já operam com regras definidas, porém persistem gargalos de integração entre áreas.",
    recommendation: "Automatizar a troca de dados nos sistemas de maior volume, unificar cadastros-base e estabelecer acordos de nível de serviço internos.",
    colorClass: "text-amber-700",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200",
    barColorClass: "bg-amber-500",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200"
  },
  4: {
    level: 4,
    name: "Nível 4 • Sustentável (Avançado)",
    shortName: "Sustentável",
    rangeLabel: "3.40 – 4.19",
    description: "Governança consolidada, processos bem documentados e sistemas integrados de forma confiável e auditável.",
    recommendation: "Expandir o monitoramento ativo de qualidade de dados, APIs abertas/padronizadas e indicadores contínuos de desempenho.",
    colorClass: "text-indigo-700",
    bgClass: "bg-indigo-50",
    borderClass: "border-indigo-200",
    barColorClass: "bg-indigo-600",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200"
  },
  5: {
    level: 5,
    name: "Nível 5 • Contínuo (Otimizado)",
    shortName: "Contínuo",
    rangeLabel: "4.20 – 5.00",
    description: "Interoperabilidade plena, automatizada e orientada por dados em tempo real, com evolução e governança proativas.",
    recommendation: "Manter ciclos de inovação contínua, compartilhamento seguro interinstitucional e disseminação de boas práticas como referência.",
    colorClass: "text-emerald-700",
    bgClass: "bg-emerald-50",
    borderClass: "border-emerald-200",
    barColorClass: "bg-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200"
  }
};

export function getMaturityLevel(score: number): MaturityLevelInfo {
  if (score < 1.8) return MATURITY_LEVELS[1];
  if (score < 2.6) return MATURITY_LEVELS[2];
  if (score < 3.4) return MATURITY_LEVELS[3];
  if (score < 4.2) return MATURITY_LEVELS[4];
  return MATURITY_LEVELS[5];
}

export function scoreToPercentage(score: number): number {
  return Math.max(0, Math.min(100, Math.round(((score - 1) / 4) * 100)));
}

function resolveDimensionForQuestion(q: Question, sectionTitle: string, sectionTags?: string[] | null): { key: string; label: string; subtitle: string } {
  const tags = (q.tags && q.tags.length > 0 ? q.tags : sectionTags) || [];
  for (const rawTag of tags) {
    const upper = rawTag.trim().toUpperCase();
    if (IMAPS_DIMENSION_LABELS[upper]) {
      return {
        key: upper,
        label: IMAPS_DIMENSION_LABELS[upper].label,
        subtitle: IMAPS_DIMENSION_LABELS[upper].subtitle
      };
    }
  }

  const cleanSec = (sectionTitle || "Geral").trim();
  return {
    key: `SEC_${cleanSec}`,
    label: cleanSec,
    subtitle: "Avaliação consolidada das perguntas desta seção"
  };
}

/**
 * Extrai a nota numérica (1 a 5) de uma resposta para uma determinada pergunta,
 * caso a pergunta possua opções com peso (weight).
 */
export function evaluateQuestionResponseWeight(q: Question, rawVal: any): number | null {
  if (rawVal === null || rawVal === undefined || rawVal === "") return null;
  if (!q.options || q.options.length === 0) return null;

  const weightMap = new Map<string, number>();
  const labelWeightMap = new Map<string, number>();

  q.options.forEach(opt => {
    if (typeof opt.weight === "number" && !isNaN(opt.weight)) {
      weightMap.set(opt.id, opt.weight);
      if (opt.label) {
        labelWeightMap.set(opt.label.trim().toLowerCase(), opt.weight);
      }
    }
  });

  if (weightMap.size === 0) return null;

  const lookupWeight = (val: string): number | null => {
    if (!val || typeof val !== "string") return null;
    if (weightMap.has(val)) return weightMap.get(val)!;
    const lower = val.trim().toLowerCase();
    if (labelWeightMap.has(lower)) return labelWeightMap.get(lower)!;
    return null;
  };

  // Caso 1: Matriz Likert { [rowId]: colOptId }
  if (q.type === "GRID_LIKERT" && typeof rawVal === "object" && !Array.isArray(rawVal)) {
    const rowScores: number[] = [];
    Object.values(rawVal).forEach(colVal => {
      const w = lookupWeight(String(colVal));
      if (w !== null) rowScores.push(w);
    });
    if (rowScores.length === 0) return null;
    return rowScores.reduce((a, b) => a + b, 0) / rowScores.length;
  }

  // Caso 2: Array (ex: CHECKBOX_MULTIPLE)
  if (Array.isArray(rawVal)) {
    const itemScores: number[] = [];
    rawVal.forEach(v => {
      const w = lookupWeight(String(v));
      if (w !== null) itemScores.push(w);
    });
    if (itemScores.length === 0) return null;
    return itemScores.reduce((a, b) => a + b, 0) / itemScores.length;
  }

  // Caso 3: Objeto com { selected: [...] }
  if (typeof rawVal === "object" && Array.isArray(rawVal.selected)) {
    const itemScores: number[] = [];
    rawVal.selected.forEach((v: any) => {
      const w = lookupWeight(String(v));
      if (w !== null) itemScores.push(w);
    });
    if (itemScores.length === 0) return null;
    return itemScores.reduce((a, b) => a + b, 0) / itemScores.length;
  }

  // Caso 4: Valor único (RADIO_SINGLE, DROPDOWN)
  return lookupWeight(String(rawVal));
}

/**
 * Extrai um mapa { [questionId]: rawVal } a partir de um registro de resposta do banco ou estado local
 */
export function extractRawAnswersMap(resp: any): Record<string, any> {
  if (!resp) return {};
  const map: Record<string, any> = {};

  if (Array.isArray(resp.answers)) {
    resp.answers.forEach((a: any) => {
      if (!a || !a.question_id) return;
      const val = a.answer_text !== null && a.answer_text !== undefined && a.answer_text !== ""
        ? a.answer_text
        : a.answer_json;
      map[a.question_id] = val;
    });
    return map;
  }

  if (resp.answers && typeof resp.answers === "object") {
    return resp.answers;
  }

  if (typeof resp === "object" && !("answers" in resp)) {
    return resp;
  }

  return map;
}

/**
 * Calcula o diagnóstico completo consolidado e individual a partir do schema do formulário e lista de respostas
 */
export function generateConsolidatedMaturityReport(
  schema: Form | null,
  responsesList: any[]
): ConsolidatedMaturityReport {
  const bySubmission = new Map<string, SubmissionMaturityResult>();

  if (!schema || !schema.sections) {
    return {
      hasWeightedQuestions: false,
      totalSubmissions: responsesList.length,
      scoredSubmissionsCount: 0,
      overallScore: 0,
      overallPercentage: 0,
      overallLevel: MATURITY_LEVELS[1],
      dimensions: [],
      strongestDimension: null,
      weakestDimension: null,
      questionStats: [],
      criticalQuestions: [],
      developingQuestions: [],
      strongQuestions: [],
      qualitativeHighlights: [],
      levelDistribution: [],
      bySubmission
    };
  }

  // 1. Identificar todas as perguntas que possuem pesos configurados e perguntas qualitativas de escolha
  const weightedQuestions: {
    question: Question;
    sectionTitle: string;
    dimension: { key: string; label: string; subtitle: string };
  }[] = [];

  const qualitativeChoiceQuestions: {
    question: Question;
    sectionTitle: string;
    optionLabelMap: Map<string, string>;
  }[] = [];

  schema.sections.forEach((sec, sIdx) => {
    const secTitle = sec.title || `Seção ${sIdx + 1}`;
    sec.questions?.forEach(q => {
      const hasWeights = q.options?.some(opt => typeof opt.weight === "number" && !isNaN(opt.weight));
      if (hasWeights) {
        weightedQuestions.push({
          question: q,
          sectionTitle: secTitle,
          dimension: resolveDimensionForQuestion(q, secTitle, sec.tags)
        });
      } else if (["CHECKBOX_MULTIPLE", "RADIO_SINGLE", "DROPDOWN"].includes(q.type) && q.options && q.options.length > 0) {
        const optMap = new Map<string, string>();
        q.options.forEach(o => {
          if (o.id && o.label) optMap.set(o.id, o.label);
        });
        qualitativeChoiceQuestions.push({
          question: q,
          sectionTitle: secTitle,
          optionLabelMap: optMap
        });
      }
    });
  });

  const hasWeightedQuestions = weightedQuestions.length > 0;

  // Acumuladores por pergunta e por dimensão
  const questionScoresAccum = new Map<string, number[]>();
  weightedQuestions.forEach(wq => questionScoresAccum.set(wq.question.id, []));

  const dimensionQuestionsSet = new Map<string, Set<string>>();
  const dimensionMetaMap = new Map<string, { label: string; subtitle: string }>();
  const dimensionScoresAccum = new Map<string, number[]>();

  weightedQuestions.forEach(wq => {
    const dKey = wq.dimension.key;
    if (!dimensionMetaMap.has(dKey)) {
      dimensionMetaMap.set(dKey, { label: wq.dimension.label, subtitle: wq.dimension.subtitle });
      dimensionQuestionsSet.set(dKey, new Set());
      dimensionScoresAccum.set(dKey, []);
    }
    dimensionQuestionsSet.get(dKey)!.add(wq.question.id);
  });

  // 2. Processar cada envio
  responsesList.forEach((resp, idx) => {
    const subId = resp.id || `sub_${idx}`;
    const rawMap = extractRawAnswersMap(resp);

    const subScores: number[] = [];
    const subDimAccum = new Map<string, { label: string; scores: number[] }>();

    weightedQuestions.forEach(({ question, dimension }) => {
      const rawVal = rawMap[question.id];
      const score = evaluateQuestionResponseWeight(question, rawVal);
      if (score !== null) {
        subScores.push(score);
        questionScoresAccum.get(question.id)?.push(score);
        dimensionScoresAccum.get(dimension.key)?.push(score);

        if (!subDimAccum.has(dimension.key)) {
          subDimAccum.set(dimension.key, { label: dimension.label, scores: [] });
        }
        subDimAccum.get(dimension.key)!.scores.push(score);
      }
    });

    if (subScores.length > 0) {
      const avg = subScores.reduce((a, b) => a + b, 0) / subScores.length;
      const dimList = Array.from(subDimAccum.entries()).map(([key, val]) => {
        const dAvg = val.scores.reduce((a, b) => a + b, 0) / val.scores.length;
        return {
          key,
          label: val.label,
          averageScore: Number(dAvg.toFixed(2)),
          levelInfo: getMaturityLevel(dAvg)
        };
      });

      bySubmission.set(subId, {
        submissionId: subId,
        averageScore: Number(avg.toFixed(2)),
        percentage: scoreToPercentage(avg),
        scoredAnswersCount: subScores.length,
        levelInfo: getMaturityLevel(avg),
        dimensionScores: dimList
      });
    } else {
      bySubmission.set(subId, {
        submissionId: subId,
        averageScore: null,
        percentage: null,
        scoredAnswersCount: 0,
        levelInfo: null,
        dimensionScores: []
      });
    }
  });

  // 3. Consolidar estatísticas por pergunta
  const questionStats: QuestionScoreStat[] = [];
  weightedQuestions.forEach(({ question, sectionTitle, dimension }) => {
    const scores = questionScoresAccum.get(question.id) || [];
    if (scores.length === 0) return;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    questionStats.push({
      questionId: question.id,
      label: question.label || "Pergunta sem título",
      sectionTitle,
      dimensionKey: dimension.key,
      dimensionLabel: dimension.label,
      averageScore: Number(avg.toFixed(2)),
      minScore: Number(min.toFixed(2)),
      maxScore: Number(max.toFixed(2)),
      responsesCount: scores.length,
      levelInfo: getMaturityLevel(avg)
    });
  });

  // 4. Consolidar estatísticas por dimensão
  const dimensions: DimensionScoreStat[] = [];
  dimensionMetaMap.forEach((meta, key) => {
    const scores = dimensionScoresAccum.get(key) || [];
    if (scores.length === 0) return;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    dimensions.push({
      key,
      label: meta.label,
      subtitle: meta.subtitle,
      averageScore: Number(avg.toFixed(2)),
      percentage: scoreToPercentage(avg),
      questionsCount: dimensionQuestionsSet.get(key)?.size || 0,
      responsesCount: scores.length,
      levelInfo: getMaturityLevel(avg)
    });
  });

  // Ordenar dimensões e perguntas
  const sortedDimensions = [...dimensions].sort((a, b) => b.averageScore - a.averageScore);
  const strongestDimension = sortedDimensions.length > 0 ? sortedDimensions[0] : null;
  const weakestDimension = sortedDimensions.length > 1 ? sortedDimensions[sortedDimensions.length - 1] : (sortedDimensions[0] || null);

  const criticalQuestions = [...questionStats]
    .filter(q => q.averageScore < 2.6)
    .sort((a, b) => a.averageScore - b.averageScore);

  const developingQuestions = [...questionStats]
    .filter(q => q.averageScore >= 2.6 && q.averageScore < 3.4)
    .sort((a, b) => a.averageScore - b.averageScore);

  const strongQuestions = [...questionStats]
    .filter(q => q.averageScore >= 3.4)
    .sort((a, b) => b.averageScore - a.averageScore);

  // 5. Calcular Score Global
  const scoredSubmissions = Array.from(bySubmission.values()).filter(s => s.averageScore !== null);
  const overallScore = scoredSubmissions.length > 0
    ? Number((scoredSubmissions.reduce((acc, s) => acc + (s.averageScore || 0), 0) / scoredSubmissions.length).toFixed(2))
    : 0;
  const overallPercentage = scoredSubmissions.length > 0 ? scoreToPercentage(overallScore) : 0;
  const overallLevel = getMaturityLevel(overallScore || 1);

  // 6. Distribuição por Nível de Maturidade
  const levelCounts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  scoredSubmissions.forEach(s => {
    if (s.levelInfo) {
      levelCounts[s.levelInfo.level] += 1;
    }
  });

  const levelDistribution = ([1, 2, 3, 4, 5] as const).map(lvl => ({
    levelInfo: MATURITY_LEVELS[lvl],
    count: levelCounts[lvl],
    percentage: scoredSubmissions.length > 0 ? Math.round((levelCounts[lvl] / scoredSubmissions.length) * 100) : 0
  }));

  // 7. Destaques Qualitativos (Perguntas de Mapeamento sem peso, ex: Sistemas Utilizados, Meios, Finalidades)
  const qualitativeHighlights: QualitativeQuestionStat[] = [];
  qualitativeChoiceQuestions.forEach(({ question, sectionTitle, optionLabelMap }) => {
    const counts = new Map<string, number>();
    let answeredCount = 0;

    responsesList.forEach(resp => {
      const rawMap = extractRawAnswersMap(resp);
      const val = rawMap[question.id];
      if (val === null || val === undefined || val === "") return;

      const valuesArray = Array.isArray(val)
        ? val
        : typeof val === "object" && Array.isArray(val.selected)
          ? val.selected
          : [val];

      if (valuesArray.length === 0) return;
      answeredCount += 1;

      valuesArray.forEach((item: any) => {
        const str = String(item);
        let label = optionLabelMap.get(str) || str;
        if (str.startsWith("other:")) {
          const custom = str.replace("other:", "").trim();
          label = custom ? `Outro (${custom})` : "Outro";
        }
        counts.set(label, (counts.get(label) || 0) + 1);
      });
    });

    if (answeredCount > 0 && counts.size > 0) {
      const topOptions = Array.from(counts.entries())
        .map(([label, count]) => ({
          label,
          count,
          percentage: Math.round((count / answeredCount) * 100)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      qualitativeHighlights.push({
        questionId: question.id,
        label: question.label || "Pergunta",
        sectionTitle,
        totalResponses: answeredCount,
        topOptions
      });
    }
  });

  return {
    hasWeightedQuestions,
    totalSubmissions: responsesList.length,
    scoredSubmissionsCount: scoredSubmissions.length,
    overallScore,
    overallPercentage,
    overallLevel,
    dimensions,
    strongestDimension,
    weakestDimension,
    questionStats,
    criticalQuestions,
    developingQuestions,
    strongQuestions,
    qualitativeHighlights,
    levelDistribution,
    bySubmission
  };
}
