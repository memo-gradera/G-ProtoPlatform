#!/usr/bin/env node
/**
 * Seeds Innovation Hub pilot demo data into BASE44.
 *
 * Usage (from apps/web):
 *   pnpm seed:pilot
 *
 * Requires .env.local with VITE_BASE44_APP_ID, VITE_BASE44_APP_BASE_URL,
 * and BASE44_ACCESS_TOKEN (copy from browser localStorage after login).
 */

import {
  PILOT_IDEAS,
  PILOT_PROTOTYPES,
  PILOT_STATUS_HISTORY,
} from '../demo/pilotSeedData.js';
import {
  loadSeedConfig,
  logSeedConfig,
  assertAccessToken,
  createSeedClient,
} from './lib/seedBase44Client.mjs';

async function listExistingIdeas(client) {
  try {
    return await client.entities.Idea.list('-created_date', 500);
  } catch (error) {
    console.warn('Could not list existing ideas:', error.message);
    return [];
  }
}

async function listExistingPrototypes(client) {
  try {
    return await client.entities.Prototype.list('-created_date', 500);
  } catch (error) {
    console.warn('Could not list existing prototypes:', error.message);
    return [];
  }
}

async function listExistingHistory(client) {
  try {
    return await client.entities.IdeaStatusHistory.list('-changed_at', 1000);
  } catch {
    return [];
  }
}

function stripSeedKey(record) {
  const { seedKey, relatedIdeaSeedKey, ...rest } = record;
  return rest;
}

async function main() {
  const config = loadSeedConfig();
  logSeedConfig(config);
  assertAccessToken(config);

  const client = createSeedClient(config);

  const existingIdeas = await listExistingIdeas(client);
  const existingNames = new Set(existingIdeas.map((i) => i.solution_name));
  const ideaIdBySeedKey = {};

  for (const idea of existingIdeas) {
    const match = PILOT_IDEAS.find((s) => s.solution_name === idea.solution_name);
    if (match) ideaIdBySeedKey[match.seedKey] = idea.id;
  }

  console.log('\nSeeding ideas…');
  for (const seed of PILOT_IDEAS) {
    if (existingNames.has(seed.solution_name)) {
      console.log(`  skip (exists): ${seed.solution_name}`);
      continue;
    }
    const created = await client.entities.Idea.create(stripSeedKey(seed));
    ideaIdBySeedKey[seed.seedKey] = created.id;
    console.log(`  created: ${seed.solution_name}`);
  }

  const existingProtos = await listExistingPrototypes(client);
  const existingProtoNames = new Set(existingProtos.map((p) => p.name));

  console.log('Seeding prototypes…');
  for (const proto of PILOT_PROTOTYPES) {
    if (existingProtoNames.has(proto.name)) {
      console.log(`  skip (exists): ${proto.name}`);
      continue;
    }
    const relatedIdeaId = ideaIdBySeedKey[proto.relatedIdeaSeedKey];
    const payload = stripSeedKey(proto);
    if (relatedIdeaId) {
      payload.related_idea_id = relatedIdeaId;
    }
    await client.entities.Prototype.create(payload);
    console.log(`  created: ${proto.name}`);
  }

  const existingHistory = await listExistingHistory(client);
  const historyKeys = new Set(
    existingHistory.map((h) => `${h.idea_id}:${h.previous_status}:${h.new_status}`),
  );

  console.log('Seeding status history (demo timeline)…');
  for (const entry of PILOT_STATUS_HISTORY) {
    const ideaId = ideaIdBySeedKey[entry.ideaSeedKey];
    if (!ideaId) {
      console.log(`  skip history (idea missing): ${entry.ideaSeedKey}`);
      continue;
    }
    const key = `${ideaId}:${entry.previous_status}:${entry.new_status}`;
    if (historyKeys.has(key)) {
      console.log(`  skip history (exists): ${entry.ideaSeedKey}`);
      continue;
    }
    await client.entities.IdeaStatusHistory.create({
      idea_id: ideaId,
      previous_status: entry.previous_status,
      new_status: entry.new_status,
      changed_by: entry.changed_by,
      changed_at: new Date().toISOString(),
      reason: entry.reason,
      metadata: JSON.stringify(entry.metadata),
    });
    console.log(`  created history: ${entry.ideaSeedKey}`);
  }

  console.log('\nPilot seed complete.');
}

main().catch((error) => {
  console.error('Seed failed:', error.message || error);
  process.exit(1);
});
