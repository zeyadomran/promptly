import type { DatabaseSync } from 'node:sqlite';

export function collectAssets(db: DatabaseSync, now: number): void {
  db.prepare('DELETE FROM asset_undo WHERE expires<=?').run(now);
  db.prepare('DELETE FROM queue_undo WHERE expires<=?').run(now);
  for (;;) {
    const result = db
      .prepare(
        `DELETE FROM assets WHERE id NOT IN (SELECT assetId FROM content_assets)
      AND id NOT IN (SELECT assetId FROM draft_assets) AND id NOT IN (SELECT assetId FROM asset_undo)
      AND id NOT IN (SELECT backgroundId FROM assets WHERE backgroundId IS NOT NULL)`
      )
      .run();

    if (result.changes === 0) return;
  }
}
