import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const DOCKER_BIN = '/Applications/Docker.app/Contents/Resources/bin/docker'
const OPENSHELL_CONTAINER = 'openshell-cluster-openshell'
const OPENSHELL_NAMESPACE = 'agent-sandbox-system'
const OPENCLAW_DASHBOARD_URL = 'http://127.0.0.1:18789/'

export async function dockerExecInOpenShell(command: string) {
  const { stdout, stderr } = await execFileAsync(DOCKER_BIN, [
    'exec',
    OPENSHELL_CONTAINER,
    'sh',
    '-lc',
    command,
  ])
  return { stdout, stderr }
}

export async function probeSandboxShell(podName: string) {
  const attempts = [
    `kubectl -n ${OPENSHELL_NAMESPACE} exec ${podName} -- /bin/sh -lc 'echo OPENSHELL_OK && pwd && whoami'`,
    `kubectl -n ${OPENSHELL_NAMESPACE} exec ${podName} -- /busybox/sh -lc 'echo OPENSHELL_OK && pwd && whoami'`,
    `kubectl -n ${OPENSHELL_NAMESPACE} exec ${podName} -- env`,
  ]

  let lastError: unknown
  for (const command of attempts) {
    try {
      return await dockerExecInOpenShell(command)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Failed to probe sandbox shell')
}

export function getOpenClawDashboardUrl() {
  return OPENCLAW_DASHBOARD_URL
}

export { DOCKER_BIN, OPENSHELL_CONTAINER, OPENSHELL_NAMESPACE }
