import { createHash, randomUUID } from 'node:crypto';

import {
  assetLimits,
  type AssetOwner,
  type Attachment,
  attachmentSchema
} from '../../shared/contracts/attachments';
import type { DrawingScene } from '../../shared/contracts/drawing';
import type { StorageContext } from '../storage/context';
import { StorageError } from '../storage/context';
import { validateBackground } from './background';

export class AssetRepository {
  constructor(readonly context: StorageContext) {}
  list(owner: AssetOwner | { kind: 'draft'; id: string }): Attachment[] {
    const table = owner.kind === 'draft' ? 'draft_assets' : 'content_assets';
    const condition = owner.kind === 'draft' ? 'token = ?' : 'ownerKind = ? AND ownerId = ?';
    const params = owner.kind === 'draft' ? [owner.id] : [owner.kind, owner.id];

    return this.context.db
      .prepare(
        `SELECT json FROM assets JOIN ${table} ON assets.id=assetId WHERE ${condition} ORDER BY position`
      )
      .all(...params)
      .map((row) => attachmentSchema.parse(JSON.parse(String(row['json']))));
  }
  replace(owner: AssetOwner, attachments: Attachment[]): void {
    this.context.db
      .prepare('DELETE FROM content_assets WHERE ownerKind=? AND ownerId=?')
      .run(owner.kind, owner.id);
    attachments.forEach((asset, position) =>
      this.context.db
        .prepare('INSERT INTO content_assets VALUES(?,?,?,?)')
        .run(owner.kind, owner.id, position, asset.id)
    );
  }
  draft(token: string): { token: string; attachments: Attachment[] } {
    if (this.context.db.prepare('SELECT token FROM drafts WHERE token=?').get(token) === undefined)
      throw new StorageError('NOT_FOUND', 'The attachment draft is unavailable.');
    return { token, attachments: this.list({ kind: 'draft', id: token }) };
  }
  begin(source?: AssetOwner) {
    const token = randomUUID();

    this.context.db.prepare('INSERT INTO drafts VALUES(?)').run(token);
    if (source !== undefined)
      this.list(source).forEach((asset, position) =>
        this.context.db
          .prepare('INSERT INTO draft_assets VALUES(?,?,?)')
          .run(token, position, asset.id)
      );
    return this.draft(token);
  }
  discard(token: string): void {
    this.context.db.prepare('DELETE FROM drafts WHERE token=?').run(token);
  }
  remove(token: string, id: string) {
    this.draft(token);
    this.context.db.prepare('DELETE FROM draft_assets WHERE token=? AND assetId=?').run(token, id);
    return this.draft(token);
  }
  add(
    token: string,
    input: {
      name: string;
      mimeType: string;
      kind: Attachment['kind'];
      bytes: Uint8Array;
      width: number | null;
      height: number | null;
      scene?: DrawingScene | undefined;
      replaceAttachmentId?: string | undefined;
    }
  ) {
    const draft = this.draft(token);
    const replace = input.replaceAttachmentId;

    if (replace !== undefined && !draft.attachments.some((asset) => asset.id === replace))
      throw new StorageError('NOT_FOUND', 'The drawing to replace is unavailable.');
    if (draft.attachments.length - (replace === undefined ? 0 : 1) >= assetLimits.count)
      throw new StorageError('INVALID_REQUEST', 'An entry can have up to 8 attachments.');
    const total = Number(
      this.context.db.prepare('SELECT COALESCE(SUM(length(data)),0) AS total FROM assets').get()?.[
        'total'
      ]
    );

    if (total + input.bytes.byteLength > assetLimits.totalBytes)
      throw new StorageError(
        'UNAVAILABLE',
        'Managed attachments exceed 512 MiB. Remove unused content first.'
      );
    const background = input.scene?.backgroundAttachmentId;

    if (background !== undefined) validateBackground(this, background, token);
    const attachment = attachmentSchema.parse({
      id: randomUUID(),
      name: input.name,
      kind: input.kind,
      mimeType: input.mimeType,
      byteLength: input.bytes.byteLength,
      sha256: createHash('sha256').update(input.bytes).digest('hex'),
      width: input.width,
      height: input.height,
      hasScene: input.scene !== undefined
    });

    this.context.db
      .prepare('INSERT INTO assets VALUES(?,?,?,?,?)')
      .run(
        attachment.id,
        JSON.stringify(attachment),
        input.bytes,
        input.scene === undefined ? null : JSON.stringify(input.scene),
        background ?? null
      );
    if (replace !== undefined)
      this.context.db
        .prepare('UPDATE draft_assets SET assetId=? WHERE token=? AND assetId=?')
        .run(attachment.id, token, replace);
    else
      this.context.db
        .prepare('INSERT INTO draft_assets VALUES(?,?,?)')
        .run(
          token,
          Number(
            this.context.db
              .prepare(
                'SELECT COALESCE(MAX(position),-1)+1 AS position FROM draft_assets WHERE token=?'
              )
              .get(token)?.['position']
          ),
          attachment.id
        );
    return { ...this.draft(token), attachment };
  }
  accessible(id: string, token?: string): boolean {
    return (
      this.context.db
        .prepare(
          `WITH RECURSIVE owned(id) AS (
      SELECT assetId FROM content_assets UNION SELECT assetId FROM draft_assets WHERE token=?
      UNION SELECT assets.backgroundId FROM assets JOIN owned ON assets.id=owned.id WHERE backgroundId IS NOT NULL
    ) SELECT id FROM owned WHERE id=? LIMIT 1`
        )
        .get(token ?? '', id) !== undefined
    );
  }
  read(id: string) {
    const row = this.context.db.prepare('SELECT json,data,scene FROM assets WHERE id=?').get(id);

    if (row === undefined || !(row['data'] instanceof Uint8Array))
      throw new StorageError('NOT_FOUND', 'Attachment bytes are missing from storage.');
    const attachment = attachmentSchema.parse(JSON.parse(String(row['json'])));
    const bytes = row['data'];

    if (
      bytes.byteLength !== attachment.byteLength ||
      createHash('sha256').update(bytes).digest('hex') !== attachment.sha256
    )
      throw new StorageError('UNAVAILABLE', 'The attachment is damaged.');
    return {
      attachment,
      bytes,
      scene: row['scene'] === null ? null : (JSON.parse(String(row['scene'])) as DrawingScene)
    };
  }
  retainUndo(token: string, attachments: Attachment[]): void {
    attachments.forEach((asset) =>
      this.context.db
        .prepare('INSERT OR IGNORE INTO asset_undo VALUES(?,?,?)')
        .run(token, asset.id, this.context.now().getTime() + 30_000)
    );
  }
  releaseUndo(token: string): void {
    this.context.db.prepare('DELETE FROM asset_undo WHERE token=?').run(token);
  }
}
