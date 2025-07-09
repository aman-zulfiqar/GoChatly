"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MessageCircle, Users, Mail, TestTube, Circle } from "lucide-react"
import ChatRoom from "@/components/chat-room"
import Link from "next/link"

export default function HomePage() {
  const [currentView, setCurrentView] = useState<"home" | "chat">("home")
  const [roomId, setRoomId] = useState("")
  const [userId, setUserId] = useState("")
  const [username, setUsername] = useState("")

  const handleJoinRoom = () => {
    if (roomId.trim() && userId.trim() && username.trim()) {
      setCurrentView("chat")
    }
  }

  const handleLeaveRoom = () => {
    setCurrentView("home")
  }

  if (currentView === "chat") {
    return <ChatRoom roomId={roomId} userId={userId} username={username} onLeave={handleLeaveRoom} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">GoChat Server</h1>
          <p className="text-lg text-gray-600">Real-time chat with email notifications</p>

          {/* Test Connection Button */}
          <div className="mt-4">
            <Link href="/test">
              <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                <TestTube className="w-4 h-4" />
                Test Connection
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-blue-600 mb-2" />
              <CardTitle>Real-Time Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Join chat rooms and send messages instantly via WebSocket connections</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Users className="w-12 h-12 mx-auto text-green-600 mb-2" />
              <CardTitle>Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>See who's online in each room and manage user presence</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Mail className="w-12 h-12 mx-auto text-purple-600 mb-2" />
              <CardTitle>Email Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Get notified via email when you receive messages while offline</CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Server Status */}
        <Card className="max-w-md mx-auto mb-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <Circle className="w-4 h-4" />
              Server Setup Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-orange-700">
              To use this chat application, make sure your Go server is running:
            </CardDescription>
            <div className="mt-3 text-sm text-orange-800 space-y-1">
              <div>1. Navigate to your Go project directory</div>
              <div>
                2. Run: <code className="bg-orange-100 px-1 rounded">docker-compose up</code>
              </div>
              <div>3. Server should be available at localhost:8080</div>
            </div>
          </CardContent>
        </Card>

        {/* Join Room Form */}
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Join a Chat Room</CardTitle>
            <CardDescription>Enter your details to start chatting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                placeholder="Enter your user ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="roomId">Room ID</Label>
              <Input
                id="roomId"
                placeholder="Enter room ID to join"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
            </div>
            <Button
              onClick={handleJoinRoom}
              className="w-full"
              disabled={!roomId.trim() || !userId.trim() || !username.trim()}
            >
              Join Room
            </Button>
          </CardContent>
        </Card>

        {/* Quick Join Options */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600 mb-3">Quick join popular rooms:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {["general", "random", "tech", "gaming"].map((room) => (
              <Button
                key={room}
                variant="outline"
                size="sm"
                onClick={() => {
                  setRoomId(room)
                  if (userId.trim() && username.trim()) {
                    setCurrentView("chat")
                  }
                }}
              >
                #{room}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
