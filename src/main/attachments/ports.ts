import type { AttachmentRejection } from '../../shared/contracts/attachments';
import type { OperationResponse } from '../../shared/contracts/operations';
import type { TransferOwner } from '../storage/transfer/requests';

export interface AssetIntake {
  name: string;
  bytes: Uint8Array;
  mimeType: string;
}
export interface AssetIntakeBatch {
  files: AssetIntake[];
  rejected: AttachmentRejection[];
}
export type AssetIntakeResult = AssetIntake[] | AssetIntakeBatch;
export interface AssetEffects {
  close?: () => Promise<void>;
  owner: (id: number) => TransferOwner | undefined;
  choose: (owner: TransferOwner) => Promise<AssetIntakeResult>;
  dropped?: (paths: string[]) => Promise<AssetIntakeResult>;
  paste: () => Promise<AssetIntakeResult>;
  raster: (bytes: Uint8Array, edge: number) => Promise<OperationResponse<'getAttachmentImage'>>;
  copyPng: (bytes: Uint8Array) => Promise<void>;
  save: (
    owner: TransferOwner,
    name: string,
    bytes: Uint8Array
  ) => Promise<OperationResponse<'saveAttachmentCopy'>>;
}
