import { getHealth } from '@/repository/health'

getHealth().then(
  (result) => {
    process.stdout.write(`${JSON.stringify(result)}\n`)
  },
  (error: unknown) => {
    process.stdout.write(`${String(error)}\n`)
    process.exitCode = 1
  },
)
