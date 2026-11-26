/**
 * Bring the states, cities and practice_areas tables in line with the
 * constants the public hub pages read (src/lib/constants). Insert-only:
 * existing rows are never changed or removed, so no public URL disappears.
 *
 *   bun run scripts/sync-taxonomy.ts            # dry run, prints what is missing
 *   bun run scripts/sync-taxonomy.ts --apply    # inserts the missing rows
 */
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { cities, practiceAreas, states } from "@/lib/db/schema";
import { MALAYSIAN_STATES } from "@/lib/constants/locations";
import { flattenPracticeAreas } from "@/lib/constants/practice-areas";

const apply = process.argv.includes("--apply");

async function main() {
  const summary = { states: 0, cities: 0, practiceAreas: 0, parentsLinked: 0 };

  const stateIdBySlug = new Map(
    (await db.select({ id: states.id, slug: states.slug }).from(states)).map((row) => [
      row.slug,
      row.id,
    ])
  );
  const existingCities = new Set(
    (await db.select({ stateId: cities.stateId, slug: cities.slug }).from(cities)).map(
      (row) => `${row.stateId}|${row.slug}`
    )
  );

  for (const state of MALAYSIAN_STATES) {
    let stateId = stateIdBySlug.get(state.slug);
    if (!stateId) {
      summary.states++;
      console.log(`+ state ${state.name}`);
      if (apply) {
        const [inserted] = await db
          .insert(states)
          .values({ name: state.name, slug: state.slug, code: state.code })
          .returning({ id: states.id });
        stateId = inserted.id;
      }
    }
    for (const city of state.cities) {
      if (stateId && existingCities.has(`${stateId}|${city.slug}`)) continue;
      summary.cities++;
      console.log(`+ city ${state.name} / ${city.name}`);
      if (apply && stateId) {
        await db
          .insert(cities)
          .values({ stateId, name: city.name, slug: city.slug })
          .onConflictDoNothing();
      }
    }
  }

  const areaIdBySlug = new Map(
    (await db.select({ id: practiceAreas.id, slug: practiceAreas.slug }).from(practiceAreas)).map(
      (row) => [row.slug, row.id]
    )
  );
  const flatAreas = flattenPracticeAreas();

  for (const area of flatAreas) {
    if (areaIdBySlug.has(area.slug)) continue;
    summary.practiceAreas++;
    console.log(`+ practice area ${area.slug}`);
    if (apply) {
      const [inserted] = await db
        .insert(practiceAreas)
        .values({
          name: area.name,
          slug: area.slug,
          description: area.description,
          icon: area.icon,
          level: area.level,
          isUserFacing: area.isUserFacing,
        })
        .returning({ id: practiceAreas.id });
      areaIdBySlug.set(area.slug, inserted.id);
    }
  }

  // Link children to parents only where no parent is set yet.
  for (const area of flatAreas) {
    if (!area.parentSlug) continue;
    const areaId = areaIdBySlug.get(area.slug);
    const parentId = areaIdBySlug.get(area.parentSlug);
    if (!areaId || !parentId) continue;
    if (apply) {
      const updated = await db
        .update(practiceAreas)
        .set({ parentId })
        .where(and(eq(practiceAreas.id, areaId), isNull(practiceAreas.parentId)))
        .returning({ id: practiceAreas.id });
      summary.parentsLinked += updated.length;
    }
  }

  console.log(apply ? "Applied:" : "Dry run, nothing written. Missing:", summary);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
