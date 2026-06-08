export class ActionError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ActionError";
  }
}

/** Narrow an unknown catch value to an ActionError. */
export function isActionError(err: unknown): err is ActionError {
  return err instanceof ActionError;
}

/** Safe message for client-facing error responses. */
export function toActionErrorMessage(err: unknown): string {
  if (err instanceof ActionError) return err.message;
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred";
}
