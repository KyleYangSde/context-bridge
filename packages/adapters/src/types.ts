import type { HandoffDocument } from "@context-bridge/core";

export type ExportRequest = {
  session?: "last" | string;
  hint?: string;
  project_root: string;
};

export type AdapterResult =
  | {
      ok: true;
      handoff: HandoffDocument;
      raw_ref?: string;
    }
  | {
      ok: false;
      code: "unsupported" | "not_found" | "parse_error" | "secrets_blocked";
      message: string;
    };

export interface ProducerAdapter {
  readonly id: string;
  readonly label: string;
  readonly exportable: boolean;
  export(req: ExportRequest): Promise<AdapterResult>;
}
