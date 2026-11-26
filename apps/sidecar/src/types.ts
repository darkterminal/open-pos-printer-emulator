export type ConnectionStatus = 'closed_by_client' | 'idle_timeout' | 'socket_error' | 'max_size_exceeded';
export type ParseStatus = 'ok' | 'partial' | 'parse_error';

export interface FaultConfig {
  paper_out: boolean;
  cover_open: boolean;
  cutter_error: boolean;
  offline: boolean;
}

export const DEFAULT_FAULT_CONFIG: FaultConfig = {
  paper_out: false,
  cover_open: false,
  cutter_error: false,
  offline: false,
};

export interface JobPayload {
  schema_version: '1.0';
  correlation_id: string;
  external_id: string;
  listener_external_id: string;
  received_at: string;
  completed_at: string;
  source: {
    ip: string;
    port: number | null;
  };
  connection: {
    status: ConnectionStatus;
    bytes_received: number;
  };
  raw: {
    encoding: 'base64';
    data: string;
    sha256: string;
  };
  parse: {
    status: ParseStatus;
    profile: string;
    warnings: string[];
    commands: unknown[];
    render_model: {
      width_dots: number;
      lines: unknown[];
      actions: unknown[];
    };
  };
}
