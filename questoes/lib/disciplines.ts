import "server-only";

import type { Collection } from "mongodb";
import { getDatabase } from "@/lib/mongodb";

export type DisciplineSubitem = {
  name: string;
  normalizedName: string;
};

export type DisciplineDocument = {
  name: string;
  normalizedName: string;
  subitems: DisciplineSubitem[];
  createdAt: Date;
};

export type DisciplineForMenu = {
  name: string;
  subitems: string[];
};

const defaultOrder = ["Português", "Matemática", "Raciocínio Lógico", "Contagem"];

function normalizeName(name: string) {
  return name.trim().normalize("NFC").toLocaleLowerCase("pt-BR");
}

async function getCollection(): Promise<Collection<DisciplineDocument>> {
  const database = await getDatabase();
  const collection = database.collection<DisciplineDocument>("disciplines");
  await collection.createIndex({ normalizedName: 1 }, { unique: true, name: "unique_discipline_name" });
  return collection;
}

async function seedDefaultsIfEmpty(collection: Collection<DisciplineDocument>) {
  if (await collection.findOne({}, { projection: { _id: 1 } })) return;

  const now = new Date();
  const defaults: DisciplineDocument[] = [
    { name: "Português", normalizedName: normalizeName("Português"), subitems: [], createdAt: now },
    { name: "Matemática", normalizedName: normalizeName("Matemática"), subitems: [], createdAt: now },
    { name: "Raciocínio Lógico", normalizedName: normalizeName("Raciocínio Lógico"), subitems: [], createdAt: now },
    {
      name: "Contagem",
      normalizedName: normalizeName("Contagem"),
      subitems: ["Código de Posturas", "Código de Obras"].map((name) => ({ name, normalizedName: normalizeName(name) })),
      createdAt: now,
    },
  ];

  try {
    await collection.insertMany(defaults, { ordered: false });
  } catch (error) {
    // A concurrent first request may have inserted the defaults already.
    if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error;
  }
}

export async function listDisciplines(): Promise<DisciplineForMenu[]> {
  const collection = await getCollection();
  await seedDefaultsIfEmpty(collection);
  const disciplines = await collection.find({}, { projection: { name: 1, subitems: 1, _id: 0 } }).toArray();

  return disciplines
    .map((discipline) => ({
      name: discipline.name,
      subitems: (discipline.subitems ?? []).map((subitem) => subitem.name),
    }))
    .sort((first, second) => {
      const firstOrder = defaultOrder.indexOf(first.name);
      const secondOrder = defaultOrder.indexOf(second.name);
      const firstPriority = firstOrder === -1 ? defaultOrder.length : firstOrder;
      const secondPriority = secondOrder === -1 ? defaultOrder.length : secondOrder;
      return firstPriority === secondPriority
        ? first.name.localeCompare(second.name, "pt-BR")
        : firstPriority - secondPriority;
    });
}

export async function addDiscipline(name: string, subitemName?: string) {
  const collection = await getCollection();
  await seedDefaultsIfEmpty(collection);
  const normalizedName = normalizeName(name);
  const now = new Date();

  if (!subitemName) {
    const result = await collection.updateOne(
      { normalizedName },
      { $setOnInsert: { name: name.trim(), normalizedName, subitems: [], createdAt: now } },
      { upsert: true },
    );

    return result.upsertedCount > 0;
  }

  const normalizedSubitem = normalizeName(subitemName);
  await collection.updateOne(
    { normalizedName },
    { $setOnInsert: { name: name.trim(), normalizedName, subitems: [], createdAt: now } },
    { upsert: true },
  );

  const result = await collection.updateOne(
    { normalizedName, "subitems.normalizedName": { $ne: normalizedSubitem } },
    { $addToSet: { subitems: { name: subitemName.trim(), normalizedName: normalizedSubitem } } },
  );

  return result.modifiedCount > 0;
}
