export interface EmitContext {
  emit: EmitFunction
}

export interface ChowEvent<T = any> {
  type: string
  payload: T
}

export interface EventHandler<T, C> {
  (ctx: C & { event: ChowEvent<T> }): void | Promise<void>
}

export interface ChowEventDef<
  N extends string = string,
  P extends object = object
> {
  name: N
  payload: P
}

export interface EmitFunction {
  <T extends ChowEventDef>(eventName: T['name'], payload: T['payload']): void
}
