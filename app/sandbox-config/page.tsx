"use client"

import { useState } from 'react';
import Link from 'next/link';

interface Permission {
  id: string;
  label: string;
  description: string;
  checked: boolean;
}

export default function SandboxConfig() {
  const [sandboxName, setSandboxName] = useState('my-sandbox');
  const [permissions, setPermissions] = useState<Permission[]>([
    { id: 'network', label: 'Network Access', description: 'Allow network connectivity', checked: true },
    { id: 'disk', label: 'Disk Write', description: 'Allow disk write operations', checked: true },
    { id: 'gpu', label: 'GPU Access', description: 'Allow GPU computation', checked: true },
    { id: 'memory', label: 'Memory Access', description: 'Allow memory access', checked: false },
    { id: 'filesystem', label: 'Filesystem Access', description: 'Allow filesystem operations', checked: true },
    { id: 'network-read', label: 'Network Read', description: 'Allow network read operations', checked: true },
  ]);

  const togglePermission = (id: string) => {
    setPermissions(permissions.map(p => 
      p.id === id ? { ...p, checked: !p.checked } : p
    ));
  };

  const saveConfiguration = () => {
    console.log('Saving configuration:', { sandboxName, permissions });
    alert('Configuration saved successfully!');
    // In production, this would call your API endpoint
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-gray-900">Sandbox Configuration</h1>
        <p className="text-lg text-gray-600 mb-8">Configure your sandbox permissions and settings</p>

        {/* Sandbox Name */}
        <div className="mb-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Sandbox Name</h2>
          <input
            type="text"
            value={sandboxName}
            onChange={(e) => setSandboxName(e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent nvidia-input"
            placeholder="Enter sandbox name"
          />
        </div>

        {/* Permissions */}
        <div className="mb-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Permissions</h2>
          <p className="text-sm text-gray-600 mb-6">Configure what operations this sandbox can perform</p>

          <div className="space-y-4">
            {permissions.map((permission) => (
              <div
                key={permission.id}
                className="flex items-start p-4 border border-gray-200 rounded-lg hover:border-green-500 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={permission.checked}
                  onChange={() => togglePermission(permission.id)}
                  className="permission-checkbox mt-1 mr-4"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{permission.label}</h3>
                  <p className="text-sm text-gray-600 mt-1">{permission.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resource Limits */}
        <div className="mb-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Resource Limits</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CPU Cores
              </label>
              <input
                type="number"
                defaultValue={2}
                min={1}
                max={16}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent nvidia-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Memory (GB)
              </label>
              <input
                type="number"
                defaultValue={4}
                min={1}
                max={64}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent nvidia-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Disk Space (GB)
              </label>
              <input
                type="number"
                defaultValue={20}
                min={1}
                max={512}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent nvidia-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GPU Memory (GB)
              </label>
              <input
                type="number"
                defaultValue={8}
                min={0}
                max={80}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent nvidia-input"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={saveConfiguration}
            className="px-6 py-3 bg-gradient-to-r from-[#76B900] to-[#0D47A1] text-white rounded-lg hover:from-[#8acc00] hover:to-[#0F5BC7] transition-all font-medium nvidia-btn"
          >
            Save Configuration
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
