/** The `Date` a document's scripts are given: the constructor it stands for, with its prototype and its functions, whose current time is read from `now` at each call, by a date made without arguments, by `Date()` and by `Date.now()`. A date made from given arguments, `Date.parse` and `Date.UTC` are as before, and every date, the runtime's own among them, is an instance of it. */
export function dateOnAir(
  real: DateConstructor,
  now: () => number,
): DateConstructor {
  const nowOnAir = () => now()

  return new Proxy(real, {
    construct(target, args, newTarget) {
      return Reflect.construct(
        target,
        args.length === 0 ? [now()] : args,
        newTarget,
      )
    },
    apply(target) {
      return new target(now()).toString()
    },
    get(target, key) {
      return key === 'now' ? nowOnAir : Reflect.get(target, key)
    },
  })
}
