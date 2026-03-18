export type RuntimeLogStream = "stdout" | "stderr" | "system";

export type RuntimeLogEntry = {
  id: string;
  timestamp: string;
  stream: RuntimeLogStream;
  message: string;
};

export type RuntimeErrorCode =
  | "docker_unavailable"
  | "workspace_missing"
  | "image_build_failed"
  | "container_start_failed"
  | "port_binding_failed"
  | "log_read_failed";

export type RuntimeFailure = {
  code: RuntimeErrorCode;
  message: string;
  details?: string;
};
