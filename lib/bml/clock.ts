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
