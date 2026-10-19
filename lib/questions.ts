import "server-only";

import type { Collection } from "mongodb";
import { getDatabase } from "@/lib/mongodb";

export type Question = {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

export type TopicImport = {
  key: string;
  title: string;
  questions: Question[];
};

export type DisciplineTopicSummary = {
  discipline: string;
  normalizedDiscipline: string;
  normalizedSubitem: string;
  key: string;
  title: string;
  questionCount: number;
};

type QuestionTopicDocument = TopicImport & {
  discipline: string;
  normalizedDiscipline: string;
  subitem: string;
  normalizedSubitem: string;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeName(value: string) {
  return value.trim().normalize("NFC").toLocaleLowerCase("pt-BR");
}

async function getQuestionTopicsCollection(): Promise<Collection<QuestionTopicDocument>> {
  const database = await getDatabase();
  const collection = database.collection<QuestionTopicDocument>("question_topics");
  await collection.createIndex(
    { normalizedDiscipline: 1, normalizedSubitem: 1, key: 1 },
    { unique: true, name: "unique_question_topic_per_discipline" },
  );
  return collection;
}

export async function saveQuestionTopics(
  discipline: string,
  subitem: string,
  topics: TopicImport[],
) {
  const collection = await getQuestionTopicsCollection();
  const now = new Date();

  const result = await collection.bulkWrite(
    topics.map((topic) => ({
      updateOne: {
        filter: {
          normalizedDiscipline: normalizeName(discipline),
          normalizedSubitem: normalizeName(subitem),
          key: topic.key,
        },
        update: {
          $set: {
            discipline,
            normalizedDiscipline: normalizeName(discipline),
            subitem,
            normalizedSubitem: normalizeName(subitem),
            title: topic.title,
            questions: topic.questions,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        upsert: true,
      },
    })),
    { ordered: true },
  );

  return {
    topics: topics.length,
    questions: topics.reduce((total, topic) => total + topic.questions.length, 0),
    created: result.upsertedCount,
    updated: result.modifiedCount,
  };
}

export async function listQuestionTopicSummaries(): Promise<DisciplineTopicSummary[]> {
  const collection = await getQuestionTopicsCollection();
  return collection.aggregate<DisciplineTopicSummary>([
    {
      $project: {
        discipline: 1,
        normalizedDiscipline: 1,
        normalizedSubitem: 1,
        key: 1,
        title: 1,
        questionCount: { $size: { $ifNull: ["$questions", []] } },
        _id: 0,
      },
    },
    { $sort: { title: 1 } },
  ]).toArray();
}

export async function getQuestionTopic(
  discipline: string,
  subitem: string,
  key: string,
) {
  const collection = await getQuestionTopicsCollection();
  const topic = await collection.findOne(
    {
      normalizedDiscipline: normalizeName(discipline),
      normalizedSubitem: normalizeName(subitem),
      key,
    },
    { projection: { _id: 0, key: 1, title: 1, questions: 1 } },
  );

  return topic ? { key: topic.key, title: topic.title, questions: topic.questions } : null;
}
