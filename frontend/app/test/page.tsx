"use client"

import ConnectionTest from "@/components/connection-test"

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">GoChat Connection Test</h1>
          <p className="text-gray-600">Verify your frontend and backend are properly connected</p>
        </div>
        <ConnectionTest />
      </div>
    </div>
  )
}
