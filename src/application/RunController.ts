import { applyCommand, type Action, type Command, type CommandResult, type RunState } from '../domain/run';

function freezeCheckpoint<T extends object>(value: T): T {
  if (!Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) if (child && typeof child === 'object') freezeCheckpoint(child);
  }
  return value;
}

/** Synchronous domain transactions are serialized before presentation starts. Persistence is R04. */
export class RunController {
  private current: RunState;
  private readonly commands: Command[] = [];

  constructor(state: RunState) { this.current = freezeCheckpoint(state); }

  get state(): RunState { return this.current; }
  get journal(): readonly Command[] { return Object.freeze([...this.commands]); }

  dispatch(action: Action): CommandResult {
    return this.submit({ runId: this.current.runId, commandId: `${this.current.runId}/command/${this.current.commandSeq + 1}`, expectedSeq: this.current.commandSeq, action });
  }

  submit(command: Command): CommandResult {
    const result = applyCommand(this.current, command);
    if (result.ok && !result.duplicate) {
      this.current = freezeCheckpoint(result.state);
      this.commands.push(structuredClone(command));
    }
    return result;
  }
}
