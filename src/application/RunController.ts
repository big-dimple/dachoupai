import { applyCommand, type Action, type AnyRunState, type Command, type CommandResult, type RunState } from '../domain/run';

export function freezeCheckpoint<T extends object>(value: T): T {
  const pending: object[] = [value], seen = new WeakSet<object>();
  while (pending.length) {
    const current = pending.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);
    if (!Object.isFrozen(current)) Object.freeze(current);
    for (const child of Object.values(current)) if (child && typeof child === 'object') pending.push(child);
  }
  return value;
}

/** Synchronous/headless command adapter. The website uses SavedRun's save-before-publish adapter. */
export class RunController<S extends AnyRunState = RunState> {
  private current: S;
  private readonly commands: Command[] = [];

  constructor(state: S) { this.current = freezeCheckpoint(state); }

  get state(): S { return this.current; }
  get journal(): readonly Command[] { return Object.freeze([...this.commands]); }

  dispatch(action: Action): CommandResult<S> {
    return this.submit({ runId: this.current.runId, commandId: `${this.current.runId}/command/${this.current.commandSeq + 1}`, expectedSeq: this.current.commandSeq, action });
  }

  submit(command: Command): CommandResult<S> {
    // A started run cannot change version; both reducers preserve the supplied schema.
    const result = applyCommand(this.current, command) as CommandResult<S>;
    if (result.ok && !result.duplicate) {
      this.current = freezeCheckpoint(result.state);
      this.commands.push(structuredClone(command));
    }
    return result;
  }
}
