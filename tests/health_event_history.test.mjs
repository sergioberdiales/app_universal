import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [app, html, migration, allInOne] = await Promise.all([
  readFile(new URL("../app-20260606b.js", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../supabase_health_events.sql", import.meta.url), "utf8"),
  readFile(new URL("../supabase_all_in_one.sql", import.meta.url), "utf8"),
]);

test("the health update schema contains the complete clinical history contract", () => {
  for (const source of [migration, allInOne]) {
    assert.match(source, /create table if not exists public\.health_event_updates/);
    for (const column of ["health_event_id", "clinical_date", "note", "status", "severity", "actions_taken", "created_at", "updated_at"]) {
      assert.match(source, new RegExp(`\\b${column}\\b`));
    }
    assert.match(source, /references public\.health_events\(id\) on delete cascade/);
    assert.match(source, /health_event_updates_own/);
  }
});

test("current status synchronization is atomic and health_events is authoritative", () => {
  for (const source of [migration, allInOne]) {
    assert.match(source, /sync_health_event_status_from_update/);
    assert.match(source, /after insert or update on public\.health_event_updates/);
    assert.match(source, /set status = new\.status/);
    assert.match(source, /when new\.status = 'resolved' then new\.clinical_date else null/);
  }
});

test("detail and update controls are wired without mutating updates from the main form", () => {
  for (const id of ["healthEventDetailModal", "healthUpdateForm", "healthUpdateClinicalDate", "healthUpdateNote", "healthUpdateSyncStatus"]) {
    assert.match(html, new RegExp(`id="${id}"`));
    assert.match(app, new RegExp(`getElementById\\("${id}"\\)`));
  }
  const saveMainStart = app.indexOf("async function handleSaveHealthEvent");
  const saveMainEnd = app.indexOf("async function patchHealthEvent", saveMainStart);
  const saveMain = app.slice(saveMainStart, saveMainEnd);
  assert.doesNotMatch(saveMain, /health_event_updates/);
  assert.match(app, /order: "clinical_date\.desc,created_at\.desc,id\.desc"/);
});

test("resolution and reactivation create history entries with forced status synchronization", () => {
  assert.match(app, /mode === "resolve"/);
  assert.match(app, /healthUpdateStatus\.value = "resolved"/);
  assert.match(app, /mode === "reopen"/);
  assert.match(app, /healthUpdateStatus\.value = "active"/);
  assert.match(app, /La nota clínica es obligatoria/);
});
