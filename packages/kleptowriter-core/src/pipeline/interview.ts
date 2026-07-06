import { AgentRole } from "../types/enums.js";
import type { LiteraryAgent } from "../agents/types.js";

export interface InterviewQuestion {
  id: string;
  category: "character" | "plot" | "theme" | "setting" | "tone";
  question: string;
  required: boolean;
}

export interface DepthAssessment {
  agentRole: string;
  score: number;
  concerns: string[];
  approved: boolean;
}

export interface InterviewSummary {
  questionsAsked: InterviewQuestion[];
  assessments: DepthAssessment[];
  overallDepthScore: number;
  gateApproved: boolean;
  summary: string;
}

type InterviewCategory = InterviewQuestion["category"];

const QUESTIONS: InterviewQuestion[] = [
  {
    id: "character-core-wound",
    category: "character",
    question: "Who is the central character, and what unresolved want or wound drives them?",
    required: true,
  },
  {
    id: "character-change",
    category: "character",
    question: "How should the central character change by the end of the story?",
    required: false,
  },
  {
    id: "plot-conflict",
    category: "plot",
    question: "What conflict forces the story into motion, and what happens if it is not resolved?",
    required: true,
  },
  {
    id: "plot-turning-point",
    category: "plot",
    question: "What major reversal or discovery should reshape the story?",
    required: false,
  },
  {
    id: "theme-question",
    category: "theme",
    question: "What human question or argument should the story explore?",
    required: true,
  },
  {
    id: "setting-pressure",
    category: "setting",
    question: "Where and when does the story happen, and how does that world pressure the characters?",
    required: true,
  },
  {
    id: "tone-promise",
    category: "tone",
    question: "What emotional texture should the reader feel most often?",
    required: true,
  },
];

const CATEGORIES = new Set<InterviewCategory>(["character", "plot", "theme", "setting", "tone"]);
const APPROVAL_SCORE = 7;

export class InterviewProtocol {
  constructor(private readonly agents: LiteraryAgent[]) {}

  generateQuestions(category?: string): InterviewQuestion[] {
    if (!category || !CATEGORIES.has(category as InterviewCategory)) {
      return [...QUESTIONS];
    }

    return QUESTIONS.filter((question) => question.category === category);
  }

  assessResponses(answers: Map<string, string>): DepthAssessment[] {
    const questions = this.generateQuestions();
    const required = questions.filter((question) => question.required);
    const missingRequired = required.filter((question) => !this.hasAnswer(answers, question.id));
    const answeredQuestions = questions.filter((question) => this.hasAnswer(answers, question.id));
    const requiredCoverage = (required.length - missingRequired.length) / required.length;
    const answerDepth = answeredQuestions.length === 0
      ? 0
      : answeredQuestions.reduce((sum, question) => sum + this.scoreAnswer(answers.get(question.id) ?? ""), 0) /
        answeredQuestions.length;
    const score = Math.round((requiredCoverage * 5 + answerDepth * 5) * 10) / 10;
    const concerns = this.buildConcerns(missingRequired, answerDepth);

    return this.agents.map((agent) => ({
      agentRole: this.roleName(agent),
      score,
      concerns,
      approved: score >= APPROVAL_SCORE && concerns.length === 0,
    }));
  }

  evaluateGate(summary: InterviewSummary): boolean {
    return (
      summary.assessments.length > 0 &&
      summary.overallDepthScore >= APPROVAL_SCORE &&
      summary.assessments.every((assessment) => assessment.approved)
    );
  }

  runInterview(answers: Map<string, string>): InterviewSummary {
    const questionsAsked = this.generateQuestions();
    const assessments = this.assessResponses(answers);
    const overallDepthScore = assessments.length === 0
      ? 0
      : Math.round(
          (assessments.reduce((sum, assessment) => sum + assessment.score, 0) / assessments.length) * 10,
        ) / 10;
    const summary: InterviewSummary = {
      questionsAsked,
      assessments,
      overallDepthScore,
      gateApproved: false,
      summary: this.summarize(questionsAsked, answers, overallDepthScore),
    };

    summary.gateApproved = this.evaluateGate(summary);
    return summary;
  }

  private hasAnswer(answers: Map<string, string>, questionId: string): boolean {
    return (answers.get(questionId) ?? "").trim().length > 0;
  }

  private scoreAnswer(answer: string): number {
    const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;

    if (wordCount >= 18) return 1;
    if (wordCount >= 10) return 0.75;
    if (wordCount >= 4) return 0.4;
    return wordCount > 0 ? 0.15 : 0;
  }

  private buildConcerns(missingRequired: InterviewQuestion[], answerDepth: number): string[] {
    const concerns = missingRequired.map((question) => `Missing required ${question.category} answer: ${question.id}`);

    if (missingRequired.length === 0 && answerDepth < 0.75) {
      concerns.push("Answers are too shallow for Phase 2 planning.");
    }

    return concerns;
  }

  private roleName(agent: LiteraryAgent): string {
    return AgentRole[agent.role] ?? String(agent.role);
  }

  private summarize(questions: InterviewQuestion[], answers: Map<string, string>, score: number): string {
    const answered = questions.filter((question) => this.hasAnswer(answers, question.id)).length;

    return `${answered}/${questions.length} interview questions answered. Depth score: ${score}/10.`;
  }
}
