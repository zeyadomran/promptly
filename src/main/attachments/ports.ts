import type { OperationResponse } from '../../shared/contracts/operations';
import type { TransferOwner } from '../storage/transfer/requests';

export interface AssetIntake {
  name: string;
  bytes: Uint8Array;
  mimeType: string;
}
export interface AssetEffects {
  close?: () => Promise<void>;
  owner: (id: number) => TransferOwner | undefined;
  choose: (owner: TransferOwner) => Promise<AssetIntake[]>;
  dropped?: (paths: string[]) => Promise<AssetIntake[]>;
  paste: () => Promise<AssetIntake[]>;
  raster: (bytes: Uint8Array, edge: number) => Promise<OperationResponse<'getAttachmentImage'>>;
  copyPng: (bytes: Uint8Array) => Promise<void>;
  save: (
    owner: TransferOwner,
    name: string,
    bytes: Uint8Array
  ) => Promise<OperationResponse<'saveAttachmentCopy'>>;
}
