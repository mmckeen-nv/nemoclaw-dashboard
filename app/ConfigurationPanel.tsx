"use client"
import { useState } from 'react'

interface SandboxConfig {
  sandboxId: string
  diskAccess: boolean
  networkAccess: boolean
  gpuEnabled: boolean
  persistentStorage: boolean
  debugMode: boolean
  autoRestart: boolean
  memoryLimit: string
  cpuLimit: string
  ports: string
  volumes: string
}

interface TooltipProps {
  text: string
  children: React.ReactNode
}

function Tooltip({ text, children }: TooltipProps) {
  const [show, setShow] = useState(false)
  
  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {show && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-[var(--background-panel)] border border-[var(--border-subtle)] rounded-sm shadow-lg min-w-[200px] max-w-[350px]">
          <p className="text-xs text-[var(--foreground)]">{text}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--background-panel)]" />
        </div>
      )}
    </div>
  )
}

interface CheckboxWithTooltipProps {
  label: string
  tooltip: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

function CheckboxWithTooltip({
  label,
  tooltip,
  checked,
  onChange,
  disabled = false
}: CheckboxWithTooltipProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <label className="flex items-center gap-3 flex-1 cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="peer sr-only"
          />
          <div className="w-5 h-5 border-2 border-[var(--foreground-dim)] rounded-sm peer-checked:bg-[var(--nvidia-green)] peer-checked:border-[var(--nvidia-green)] transition-colors" />
          <svg
            className="absolute top-1 left-1 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="text-sm text-[var(--foreground)] font-mono">{label}</span>
      </label>
      <Tooltip text={tooltip}>
        <svg className="w-4 h-4 text-[var(--foreground-dim)] hover:text-[var(--nvidia-green)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </Tooltip>
    </div>
  )
}

interface InputWithTooltipProps {
  label: string
  tooltip: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

function InputWithTooltip({
  label,
  tooltip,
  value,
  onChange,
  placeholder,
  disabled = false
}: InputWithTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <label className="text-xs text-[var(--foreground-dim)] uppercase tracking-wider">{label}</label>
        <div
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="cursor-help"
        >
          <svg className="w-3.5 h-3.5 text-[var(--foreground-dim)] hover:text-[var(--nvidia-green)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        {showTooltip && (
          <div className="absolute z-50 left-0 top-full mt-1 px-3 py-2 bg-[var(--background-panel)] border border-[var(--border-subtle)] rounded-sm shadow-lg min-w-[200px] max-w-[350px]">
            <p className="text-xs text-[var(--foreground)]">{tooltip}</p>
            <div className="absolute top-0 left-4 -translate-y-1/2 border-4 border-transparent border-b-[var(--background-panel)]" />
          </div>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-subtle)] rounded-sm text-xs font-mono text-[var(--foreground)] placeholder-[var(--foreground-dim)] focus:outline-none focus:border-[var(--nvidia-green)] transition-colors"
      />
    </div>
  )
}

export interface ConfigurationPanelProps {
  sandboxId: string
  onSave: (config: Partial<SandboxConfig>) => void
  isSaving?: boolean
}

export default function ConfigurationPanel({
  sandboxId,
  onSave,
  isSaving = false
}: ConfigurationPanelProps) {
  const [config, setConfig] = useState<SandboxConfig>({
    sandboxId,
    diskAccess: true,
    networkAccess: true,
    gpuEnabled: true,
    persistentStorage: false,
    debugMode: false,
    autoRestart: true,
    memoryLimit: '4Gi',
    cpuLimit: '2',
    ports: '8080:30051',
    volumes: ''
  })

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save configuration')
      }
      
      await onSave({ ...config })
      
      // Show success feedback
      alert(`Configuration saved for ${sandboxId}!\n\nApplied:\n- Memory: ${config.memoryLimit}\n- CPU: ${config.cpuLimit}\n- GPU: ${config.gpuEnabled ? 'Enabled' : 'Disabled'}\n- Network: ${config.networkAccess ? 'Enabled' : 'Disabled'}\n- Disk: ${config.diskAccess ? 'Enabled' : 'Disabled'}`)
      
    } catch (error) {
      console.error('Failed to save configuration:', error)
      alert(`Error saving configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }
  }

  const tooltips = {
    diskAccess: 'Allows the sandbox to read/write to mounted volumes. Required for data persistence and file operations.',
    networkAccess: 'Enables outbound network connectivity. Required for API calls, downloads, and external service communication.',
    gpuEnabled: 'Grants GPU access for ML workloads. Allocates GPU memory and NVIDIA device drivers to the sandbox.',
    persistentStorage: 'Creates persistent PVC volumes that survive container restarts. Data is stored outside the container.',
    debugMode: 'Enables verbose logging and debug endpoints. Use for development and troubleshooting - increases resource usage.',
    autoRestart: 'Automatically restarts the sandbox if it crashes or becomes unresponsive. Recommended for production workloads.',
    memoryLimit: 'Maximum memory allocation for the sandbox (e.g., "4Gi", "2048Mi"). Prevents memory exhaustion.',
    cpuLimit: 'Maximum CPU cores allocated (e.g., "2", "4.5"). Controls CPU time sharing between sandboxes.',
    ports: 'Port mapping format: HOST:CONTAINER. Example: "8080:30051" maps host port 8080 to container port 30051.',
    volumes: 'Volume mounts in format: HOST_PATH:CONTAINER_PATH:RO|RW. Multiple mounts separated by commas.'
  }

  return (
    <div className="panel p-6 mt-6 border-t-2 border-[var(--nvidia-green)]">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-subtle)]">
        <h4 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">
          {sandboxId} — CONFIGURATION
        </h4>
        <span className="text-[10px] text-[var(--foreground-dim)] font-mono">
          LIVE
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
        {/* Core Settings */}
        <div className="space-y-1">
          <p className="text-xs text-[var(--nvidia-green)] uppercase tracking-wider mb-2">Core Settings</p>
          <CheckboxWithTooltip
            label="Disk Access"
            tooltip={tooltips.diskAccess}
            checked={config.diskAccess}
            onChange={(v) => setConfig({ ...config, diskAccess: v })}
          />
          <CheckboxWithTooltip
            label="Network Access"
            tooltip={tooltips.networkAccess}
            checked={config.networkAccess}
            onChange={(v) => setConfig({ ...config, networkAccess: v })}
          />
          <CheckboxWithTooltip
            label="GPU Enabled"
            tooltip={tooltips.gpuEnabled}
            checked={config.gpuEnabled}
            onChange={(v) => setConfig({ ...config, gpuEnabled: v })}
          />
          <CheckboxWithTooltip
            label="Persistent Storage"
            tooltip={tooltips.persistentStorage}
            checked={config.persistentStorage}
            onChange={(v) => setConfig({ ...config, persistentStorage: v })}
          />
        </div>

        {/* Resource Limits */}
        <div className="space-y-3">
          <p className="text-xs text-[var(--nvidia-green)] uppercase tracking-wider mb-2">Resource Limits</p>
          <InputWithTooltip
            label="Memory Limit"
            tooltip={tooltips.memoryLimit}
            value={config.memoryLimit}
            onChange={(v) => setConfig({ ...config, memoryLimit: v })}
            placeholder="4Gi"
          />
          <InputWithTooltip
            label="CPU Limit"
            tooltip={tooltips.cpuLimit}
            value={config.cpuLimit}
            onChange={(v) => setConfig({ ...config, cpuLimit: v })}
            placeholder="2"
          />
          <InputWithTooltip
            label="Port Mapping"
            tooltip={tooltips.ports}
            value={config.ports}
            onChange={(v) => setConfig({ ...config, ports: v })}
            placeholder="8080:30051"
          />
          <InputWithTooltip
            label="Volumes"
            tooltip={tooltips.volumes}
            value={config.volumes}
            onChange={(v) => setConfig({ ...config, volumes: v })}
            placeholder="/host/path:/container/path:RW"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-6 pt-4 border-t border-[var(--border-subtle)]">
        <div>
          <p className="text-xs text-[var(--nvidia-green)] uppercase tracking-wider mb-2">Advanced</p>
          <CheckboxWithTooltip
            label="Debug Mode"
            tooltip={tooltips.debugMode}
            checked={config.debugMode}
            onChange={(v) => setConfig({ ...config, debugMode: v })}
          />
          <CheckboxWithTooltip
            label="Auto Restart"
            tooltip={tooltips.autoRestart}
            checked={config.autoRestart}
            onChange={(v) => setConfig({ ...config, autoRestart: v })}
          />
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-[var(--border-subtle)]">
        <button
          onClick={() => setConfig({
            sandboxId,
            diskAccess: true,
            networkAccess: true,
            gpuEnabled: true,
            persistentStorage: false,
            debugMode: false,
            autoRestart: true,
            memoryLimit: '4Gi',
            cpuLimit: '2',
            ports: '8080:30051',
            volumes: ''
          })}
          className="px-4 py-2 rounded-sm bg-[var(--background-tertiary)] text-[var(--foreground)] text-xs font-mono uppercase tracking-wider hover:bg-[var(--background-panel)] transition-colors"
        >
          RESET
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 rounded-sm bg-[var(--nvidia-green)] text-white text-xs font-mono uppercase tracking-wider hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isSaving ? 'SAVING...' : 'SAVE CONFIGURATION'}
        </button>
      </div>
    </div>
  )
}
