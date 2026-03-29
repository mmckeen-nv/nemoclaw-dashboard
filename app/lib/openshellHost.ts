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
  return dockerExecInOpenShell(
    `kubectl -n ${OPENSHELL_NAMESPACE} exec ${podName} -- sh -lc 'echo OPENSHELL_OK && pwd && whoami'`
  )
}

export function getOpenClawDashboardUrl() {
  return OPENCLAW_DASHBOARD_URL
}

export { DOCKER_BIN, OPENSHELL_CONTAINER, OPENSHELL_NAMESPACE }
