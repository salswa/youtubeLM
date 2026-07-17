"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { Unit } from "@/lib/types";

export async function addUnit(courseId: string) {
  await requireUser();
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("units")
    .select("position")
    .eq("course_id", courseId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (last?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("units")
    .insert({ course_id: courseId, title: "New unit", position })
    .select("*")
    .single();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, unit: data as Unit };
}

export async function updateUnit(
  unitId: string,
  input: { title?: string; description?: string },
) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("units")
    .update(input)
    .eq("id", unitId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function deleteUnit(unitId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("units").delete().eq("id", unitId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/** Persist a new ordering of units (array of unit ids in display order). */
export async function reorderUnits(orderedUnitIds: string[]) {
  await requireUser();
  const supabase = await createClient();
  const results = await Promise.all(
    orderedUnitIds.map((id, position) =>
      supabase.from("units").update({ position }).eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false as const, error: failed.error.message };
  return { ok: true as const };
}
