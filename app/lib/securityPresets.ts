export type SecurityPresetId =
  | 'lockdown'
  | 'enterprise'
  | 'medium-spicy'
  | 'spicy'
  | 'ultra-lobster'

export interface OpenShellPolicyShape {
  version: number
  filesystem_policy: {
    include_workdir: boolean
    read_only: string[]
    read_write: string[]
  }
  landlock: {
    compatibility: 'best_effort' | 'hard_requirement'
  }
  process: {
    run_as_user: string
    run_as_group: string
  }
  network_policies: Record<string, {
    name?: string
    endpoints: Array<{
      host: string
      port: number
      protocol?: string
      tls?: string
      enforcement?: string
      access?: string
      rules?: Array<{ allow: { method: string; path: string } }>
    }>
    binaries: Array<{ path: string }>
  }>
}

export interface ExecAllowlistProfile {
  description: string
  paths: string[]
}

export interface SecurityPreset {
  id: SecurityPresetId
  label: string
  danger: 'very-low' | 'low' | 'medium' | 'high' | 'very-high'
  summary: string
  policy: OpenShellPolicyShape
  execAllowlist: ExecAllowlistProfile
}

const commonReadOnly = ['/usr', '/lib', '/etc', '/proc', '/dev/urandom']

export const SECURITY_PRESETS: SecurityPreset[] = [
  {
    id: 'lockdown',
    label: 'Lockdown Mode',
    danger: 'very-low',
    summary: 'Minimal writable paths, hard Landlock requirement, no outbound network policy blocks, and a tiny exec allowlist.',
    policy: {
      version: 1,
      filesystem_policy: {
        include_workdir: false,
        read_only: commonReadOnly,
        read_write: ['/tmp']
      },
      landlock: { compatibility: 'hard_requirement' },
      process: { run_as_user: 'sandbox', run_as_group: 'sandbox' },
      network_policies: {}
    },
    execAllowlist: {
      description: 'Read-only diagnostics only.',
      paths: ['/usr/bin/pwd', '/usr/bin/cat', '/usr/bin/grep', '/usr/bin/find']
    }
  },
  {
    id: 'enterprise',
    label: 'Enterprise Mode',
    danger: 'low',
    summary: 'Tight filesystem, best-effort Landlock, and explicit read-only HTTPS API access for approved binaries.',
    policy: {
      version: 1,
      filesystem_policy: {
        include_workdir: true,
        read_only: commonReadOnly,
        read_write: ['/sandbox', '/tmp', '/dev/null']
      },
      landlock: { compatibility: 'best_effort' },
      process: { run_as_user: 'sandbox', run_as_group: 'sandbox' },
      network_policies: {
        github_rest_api: {
          name: 'github-rest-api',
          endpoints: [
            {
              host: 'api.github.com',
              port: 443,
              protocol: 'rest',
              tls: 'terminate',
              enforcement: 'enforce',
              access: 'read-only'
            }
          ],
          binaries: [{ path: '/usr/bin/git' }, { path: '/usr/bin/curl' }]
        }
      }
    },
    execAllowlist: {
      description: 'Safe shell, file, and git workflow.',
      paths: ['/bin/sh', '/usr/bin/bash', '/usr/bin/env', '/usr/bin/cat', '/usr/bin/grep', '/usr/bin/sed', '/usr/bin/find', '/usr/bin/mkdir', '/usr/bin/cp', '/usr/bin/mv', '/usr/bin/git']
    }
  },
  {
    id: 'medium-spicy',
    label: 'Medium-Spicy',
    danger: 'medium',
    summary: 'Normal workdir access, common web APIs, and a broader developer exec toolchain.',
    policy: {
      version: 1,
      filesystem_policy: {
        include_workdir: true,
        read_only: commonReadOnly,
        read_write: ['/sandbox', '/tmp', '/dev/null']
      },
      landlock: { compatibility: 'best_effort' },
      process: { run_as_user: 'sandbox', run_as_group: 'sandbox' },
      network_policies: {
        github_and_npm: {
          name: 'github-and-npm',
          endpoints: [
            { host: 'api.github.com', port: 443, protocol: 'rest', tls: 'terminate', enforcement: 'enforce', access: 'read-write' },
            { host: 'registry.npmjs.org', port: 443 },
            { host: 'github.com', port: 443 }
          ],
          binaries: [{ path: '/usr/bin/git' }, { path: '/usr/bin/node' }, { path: '/usr/bin/npm' }]
        }
      }
    },
    execAllowlist: {
      description: 'Typical dev shell plus ssh/scp/rsync and Node.',
      paths: ['/bin/sh', '/usr/bin/bash', '/usr/bin/env', '/usr/bin/cat', '/usr/bin/grep', '/usr/bin/sed', '/usr/bin/awk', '/usr/bin/find', '/usr/bin/mkdir', '/usr/bin/cp', '/usr/bin/mv', '/usr/bin/rm', '/usr/bin/git', '/usr/bin/ssh', '/usr/bin/scp', '/usr/bin/rsync', '/usr/bin/node', '/usr/bin/npm']
    }
  },
  {
    id: 'spicy',
    label: 'Spicy',
    danger: 'high',
    summary: 'Wide dev workflow access including Docker/Kubectl and more permissive network routes.',
    policy: {
      version: 1,
      filesystem_policy: {
        include_workdir: true,
        read_only: ['/usr', '/lib', '/etc'],
        read_write: ['/sandbox', '/tmp', '/dev/null']
      },
      landlock: { compatibility: 'best_effort' },
      process: { run_as_user: 'sandbox', run_as_group: 'sandbox' },
      network_policies: {
        dev_ops: {
          name: 'dev-ops',
          endpoints: [
            { host: 'api.github.com', port: 443, protocol: 'rest', tls: 'terminate', enforcement: 'enforce', access: 'full' },
            { host: 'registry.npmjs.org', port: 443 },
            { host: '*.docker.com', port: 443 },
            { host: '*.github.com', port: 443 }
          ],
          binaries: [{ path: '/usr/bin/git' }, { path: '/usr/bin/node' }, { path: '/usr/bin/npm' }, { path: '/usr/bin/docker' }]
        }
      }
    },
    execAllowlist: {
      description: 'Broad engineering toolchain with infra tooling.',
      paths: ['/bin/sh', '/usr/bin/bash', '/usr/bin/env', '/usr/bin/cat', '/usr/bin/grep', '/usr/bin/sed', '/usr/bin/awk', '/usr/bin/find', '/usr/bin/mkdir', '/usr/bin/cp', '/usr/bin/mv', '/usr/bin/rm', '/usr/bin/git', '/usr/bin/ssh', '/usr/bin/scp', '/usr/bin/rsync', '/usr/bin/docker', '/usr/local/bin/kubectl', '/usr/bin/node', '/usr/bin/npm', '/usr/bin/python3']
    }
  },
  {
    id: 'ultra-lobster',
    label: 'Ultra-Lobster',
    danger: 'very-high',
    summary: 'Maximum lab convenience: broad writable scope, permissive network policies, and a near-anything-goes exec toolchain.',
    policy: {
      version: 1,
      filesystem_policy: {
        include_workdir: true,
        read_only: ['/usr', '/lib'],
        read_write: ['/sandbox', '/tmp', '/dev/null', '/var/tmp']
      },
      landlock: { compatibility: 'best_effort' },
      process: { run_as_user: 'sandbox', run_as_group: 'sandbox' },
      network_policies: {
        broad_https: {
          name: 'broad-https',
          endpoints: [
            { host: '*.github.com', port: 443 },
            { host: '*.openai.com', port: 443 },
            { host: '*.anthropic.com', port: 443 },
            { host: '*.npmjs.org', port: 443 },
            { host: '*.docker.com', port: 443 },
            { host: '*', port: 443 }
          ],
          binaries: [
            { path: '/usr/bin/git' },
            { path: '/usr/bin/node' },
            { path: '/usr/bin/npm' },
            { path: '/usr/bin/python3' },
            { path: '/usr/bin/docker' },
            { path: '/usr/bin/ssh' }
          ]
        }
      }
    },
    execAllowlist: {
      description: 'Lab lobster mode: broad shell, infra, and programming runtime access.',
      paths: ['/bin/sh', '/usr/bin/bash', '/usr/bin/env', '/usr/bin/cat', '/usr/bin/grep', '/usr/bin/sed', '/usr/bin/awk', '/usr/bin/find', '/usr/bin/mkdir', '/usr/bin/cp', '/usr/bin/mv', '/usr/bin/rm', '/usr/bin/git', '/usr/bin/ssh', '/usr/bin/scp', '/usr/bin/rsync', '/usr/bin/docker', '/usr/local/bin/kubectl', '/usr/bin/node', '/usr/bin/npm', '/usr/bin/python3']
    }
  }
]

export function getSecurityPreset(id: SecurityPresetId) {
  return SECURITY_PRESETS.find((preset) => preset.id === id)
}
