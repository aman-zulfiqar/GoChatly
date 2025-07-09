"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock, RefreshCw, Wifi, Database } from "lucide-react"

interface TestResult {
  name: string
  status: "pending" | "success" | "error"
  message: string
  details?: string
}

export default function ConnectionTest() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: "Server Health Check", status: "pending", message: "Checking server status..." },
    { name: "CORS Configuration", status: "pending", message: "Testing CORS headers..." },
    { name: "WebSocket Connection", status: "pending", message: "Testing WebSocket connection..." },
    { name: "Message API", status: "pending", message: "Testing message history API..." },
    { name: "Users API", status: "pending", message: "Testing users API..." },
    { name: "Email Queue API", status: "pending", message: "Testing email queue..." },
  ])

  const [isRunning, setIsRunning] = useState(false)

  const updateTest = (index: number, status: TestResult["status"], message: string, details?: string) => {
    setTests((prev) => prev.map((test, i) => (i === index ? { ...test, status, message, details } : test)))
  }

  const runTests = async () => {
    setIsRunning(true)

    // Reset all tests
    setTests((prev) => prev.map((test) => ({ ...test, status: "pending" })))

    // Test 1: Server Health Check
    try {
      const response = await fetch("http://localhost:8080/health")
      if (response.ok) {
        const data = await response.json()
        updateTest(0, "success", "Server is running", `Status: ${data.status}`)
      } else {
        updateTest(0, "error", `Server returned ${response.status}`, response.statusText)
      }
    } catch (error) {
      updateTest(0, "error", "Cannot connect to server", "Make sure Go server is running on localhost:8080")
    }

    await new Promise((resolve) => setTimeout(resolve, 500))

    // Test 2: CORS Configuration
    try {
      const response = await fetch("http://localhost:8080/test")
      if (response.ok) {
        const data = await response.json()
        updateTest(1, "success", "CORS is properly configured", data.cors)
      } else {
        updateTest(1, "error", "CORS test failed", "Check CORS middleware in Go server")
      }
    } catch (error) {
      updateTest(1, "error", "CORS request blocked", "Add CORS middleware to your Go server")
    }

    await new Promise((resolve) => setTimeout(resolve, 500))

    // Test 3: WebSocket Connection
    try {
      const ws = new WebSocket("ws://localhost:8080/ws/test-room/test-user?username=TestUser")

      const wsPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close()
          reject(new Error("WebSocket connection timeout"))
        }, 5000)

        ws.onopen = () => {
          clearTimeout(timeout)
          updateTest(2, "success", "WebSocket connected successfully", "Real-time messaging available")
          ws.close()
          resolve()
        }

        ws.onerror = (error) => {
          clearTimeout(timeout)
          reject(error)
        }
      })

      await wsPromise
    } catch (error) {
      updateTest(2, "error", "WebSocket connection failed", "Check WebSocket upgrader configuration")
    }

    await new Promise((resolve) => setTimeout(resolve, 500))

    // Test 4: Message API
    try {
      const response = await fetch("http://localhost:8080/rooms/test-room/messages?limit=10")
      if (response.ok) {
        const data = await response.json()
        updateTest(
          3,
          "success",
          "Message API working",
          `Can load message history (${Array.isArray(data) ? data.length : 0} messages)`,
        )
      } else {
        updateTest(3, "error", `Message API failed (${response.status})`, response.statusText)
      }
    } catch (error) {
      updateTest(3, "error", "Message API unreachable", "Check message handler route")
    }

    await new Promise((resolve) => setTimeout(resolve, 500))

    // Test 5: Users API
    try {
      const response = await fetch("http://localhost:8080/rooms/test-room/users")
      if (response.ok) {
        const data = await response.json()
        updateTest(4, "success", "Users API working", `Can load room users (${data.count || 0} users)`)
      } else {
        updateTest(4, "error", `Users API failed (${response.status})`, response.statusText)
      }
    } catch (error) {
      updateTest(4, "error", "Users API unreachable", "Check users handler route")
    }

    await new Promise((resolve) => setTimeout(resolve, 500))

    // Test 6: Email Queue API
    try {
      const response = await fetch("http://localhost:8080/queue-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: "test@example.com",
          subject: "Test Email",
          body: "This is a test email from the connection test.",
        }),
      })

      if (response.ok) {
        updateTest(5, "success", "Email queue working", "Can queue email notifications")
      } else {
        updateTest(5, "error", `Email queue failed (${response.status})`, response.statusText)
      }
    } catch (error) {
      updateTest(5, "error", "Email queue unreachable", "Check email handler route")
    }

    setIsRunning(false)
  }

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />
    }
  }

  const getStatusBadge = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800 border-green-300">Passed</Badge>
      case "error":
        return <Badge className="bg-red-100 text-red-800 border-red-300">Failed</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Testing...</Badge>
    }
  }

  const allTestsPassed = tests.every((test) => test.status === "success")
  const hasErrors = tests.some((test) => test.status === "error")

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="w-6 h-6" />
            End-to-End Connection Test
          </CardTitle>
          <CardDescription>Test the complete connection between your frontend and Go backend server</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Button onClick={runTests} disabled={isRunning} className="flex items-center gap-2">
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Run All Tests
                </>
              )}
            </Button>

            {!isRunning && allTestsPassed && (
              <Badge className="bg-green-100 text-green-800 border-green-300">
                ✅ All Tests Passed - Ready to Chat!
              </Badge>
            )}

            {!isRunning && hasErrors && (
              <Badge className="bg-red-100 text-red-800 border-red-300">
                ❌ Some Tests Failed - Check Configuration
              </Badge>
            )}
          </div>

          <div className="space-y-4">
            {tests.map((test, index) => (
              <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                <div className="mt-0.5">{getStatusIcon(test.status)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium">{test.name}</h3>
                    {getStatusBadge(test.status)}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{test.message}</p>
                  {test.details && <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">{test.details}</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. Start Your Go Server</h4>
              <div className="bg-gray-100 p-3 rounded font-mono text-sm">
                cd your-go-project
                <br />
                docker-compose up
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">2. Verify Server is Running</h4>
              <p className="text-sm text-gray-600 mb-2">
                Open <code className="bg-gray-100 px-1 rounded">http://localhost:8080/health</code> in your browser
              </p>
              <p className="text-sm text-gray-600">
                You should see:{" "}
                <code className="bg-gray-100 px-1 rounded">
                  {"{"}"status":"ok"{"}"}
                </code>
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">3. Check Docker Services</h4>
              <div className="bg-gray-100 p-3 rounded font-mono text-sm">docker-compose ps</div>
              <p className="text-sm text-gray-600 mt-2">
                All services should show "Up" status: MongoDB, Redis, MailHog, and your Go server
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">4. Common Issues & Solutions</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  • <strong>CORS Error:</strong> Make sure CORS middleware is added to your Go server
                </li>
                <li>
                  • <strong>WebSocket Error:</strong> Check WebSocket upgrader allows localhost:3000
                </li>
                <li>
                  • <strong>Database Error:</strong> Ensure MongoDB is running in Docker
                </li>
                <li>
                  • <strong>Queue Error:</strong> Ensure Redis is running in Docker
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
