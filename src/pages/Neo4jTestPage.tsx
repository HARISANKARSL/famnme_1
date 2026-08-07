/**
 * Neo4j Test Page - Standalone test for Neo4j integration
 *
 * This page bypasses Supabase/treeStore and directly tests Neo4j connection.
 * Access via: http://localhost:5173/neo4j-test
 */

import { UnionBasedTreeCanvas } from '@/components/canvas/UnionBasedTreeCanvas';
import { useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function Neo4jTestPage() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'failed'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Test backend API connection
    fetch(`${API_BASE_URL}/api/health`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then((data) => {
        if (data.status === 'ok') {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('failed');
          setError('Backend server returned error status');
        }
      })
      .catch((err) => {
        setConnectionStatus('failed');
        setError(err.message);
      });
  }, []);

  if (connectionStatus === 'checking') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2F3E8F] mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to Neo4j...</p>
        </div>
      </div>
    );
  }

  if (connectionStatus === 'failed') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="max-w-2xl w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Neo4j Connection Failed</h1>
                <p className="text-gray-600">Unable to connect to Neo4j database</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-mono text-red-800">{error}</p>
            </div>

            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-gray-900 mb-2">Setup Instructions:</h2>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                  <li>Install Neo4j Desktop from <a href="https://neo4j.com/download/" target="_blank" rel="noopener noreferrer" className="text-[#2F3E8F] hover:underline">neo4j.com/download</a></li>
                  <li>Create a new database instance and start it</li>
                  <li>Copy <code className="bg-gray-100 px-1 rounded">.env.example</code> to <code className="bg-gray-100 px-1 rounded">.env</code></li>
                  <li>Update <code className="bg-gray-100 px-1 rounded">.env</code> with your Neo4j credentials</li>
                  <li>Run: <code className="bg-gray-100 px-1 rounded">npm run neo4j:init</code></li>
                  <li><strong>Start BOTH servers:</strong> <code className="bg-gray-100 px-1 rounded">npm run dev:all</code></li>
                </ol>
              </div>

              <div className="bg-[#E8EDFF] border border-[#2F3E8F]/30 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Common Issue:</strong> "Failed to fetch" usually means the backend server isn't running.
                  You need BOTH the frontend (Vite) and backend (Express) servers running.
                  Use <code className="bg-white px-1 rounded">npm run dev:all</code> to start both at once.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Expected .env file:</h3>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`VITE_NEO4J_URI=bolt://localhost:7687
VITE_NEO4J_USER=neo4j
VITE_NEO4J_PASSWORD=your_password_here`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Connection successful - show the tree
  return (
    <div className="h-screen flex flex-col">
      <div className="bg-green-100 border-b border-green-200 px-4 py-2">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
            <span className="text-sm font-medium text-green-800">
              Backend API Connected → Neo4j - Test Mode
            </span>
          </div>
          <a
            href="/"
            className="text-sm text-green-700 hover:text-green-900 underline"
          >
            Back to Dashboard
          </a>
        </div>
      </div>

      <div className="flex-1">
        <UnionBasedTreeCanvas
          treeId="tree-001"
          focusPersonId="person-009"
          onPersonClick={(personId) => console.log('Clicked:', personId)}
        />
      </div>
    </div>
  );
}
