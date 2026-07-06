import type { SceneId } from "../../types/index.js";
import type { DramaticQuestion } from "./interfaces.js";

type DramaticQuestionStatus = DramaticQuestion["status"];

export class DramaticQuestionTransitionError extends Error {
  constructor(id: string, from: DramaticQuestionStatus, to: DramaticQuestionStatus) {
    super(`Cannot transition dramatic question ${id} from ${from} to ${to}`);
    this.name = "DramaticQuestionTransitionError";
  }
}

export class DramaticQuestionTracker {
  readonly #questions = new Map<string, DramaticQuestion>();

  raise(id: string, question: string, sceneId: SceneId): DramaticQuestion {
    const dramaticQuestion: DramaticQuestion = {
      id,
      question,
      status: "raised",
      raisedInScene: sceneId,
    };

    this.#questions.set(id, dramaticQuestion);
    return dramaticQuestion;
  }

  partiallyAnswer(id: string, sceneId: SceneId): DramaticQuestion {
    const question = this.requireQuestion(id);
    if (question.status !== "raised") throw new DramaticQuestionTransitionError(id, question.status, "partially_answered");

    return this.update(id, { ...question, status: "partially_answered", answeredInScene: sceneId });
  }

  answer(id: string, sceneId: SceneId): DramaticQuestion {
    const question = this.requireQuestion(id);
    if (question.status === "answered") throw new DramaticQuestionTransitionError(id, question.status, "answered");

    return this.update(id, { ...question, status: "answered", answeredInScene: sceneId });
  }

  getQuestion(id: string): DramaticQuestion | undefined {
    return this.#questions.get(id);
  }

  getOpenQuestions(): DramaticQuestion[] {
    return [...this.#questions.values()].filter((question) => question.status !== "answered");
  }

  getAnsweredQuestions(): DramaticQuestion[] {
    return [...this.#questions.values()].filter((question) => question.status === "answered");
  }

  getQuestionsByScene(sceneId: SceneId): DramaticQuestion[] {
    return [...this.#questions.values()].filter(
      (question) => question.raisedInScene === sceneId || question.answeredInScene === sceneId,
    );
  }

  toMap(): Map<string, DramaticQuestion> {
    return new Map(this.#questions);
  }

  private requireQuestion(id: string): DramaticQuestion {
    const question = this.#questions.get(id);
    if (!question) throw new Error(`Dramatic question ${id} does not exist`);
    return question;
  }

  private update(id: string, question: DramaticQuestion): DramaticQuestion {
    this.#questions.set(id, question);
    return question;
  }
}
