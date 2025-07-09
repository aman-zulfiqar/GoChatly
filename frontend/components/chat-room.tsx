"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Send, Users, Circle, Wifi, WifiOff, RefreshCw } from "lucide-react"

interface Message {
  id?: string
  type: string
  room_id?: string
  user_id?: string
  username?: string
  content?: string
  timestamp?: string
  data?: any
}

interface User {
  id: string
  username: string
  online: boolean
}

interface ChatRoomProps {
  roomId: string
  userId: string
  username: string
  onLeave: () => void
}

export default function ChatRoom({ roomId, userId, username, onLeave }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [serverStatus, setServerStatus] = useState<"unknown" | "online" | "offline">("unknown")
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    checkServerStatus()
    connectWebSocket()
    loadMessageHistory()
    loadRoomUsers()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [roomId, userId, username])

  const checkServerStatus = async () => {
    try {
      const response = await fetch("http://localhost:8080/health")
      if (response.ok) {
        setServerStatus("online")
        console.log("✅ Server is online")
      } else {
        setServerStatus("offline")
      }
    } catch (error) {
      setServerStatus("offline")
      console.log("❌ Server is offline")
    }
  }

  const connectWebSocket = () => {
    if (isConnecting || isConnected) return

    setIsConnecting(true)
    const wsUrl = `ws://localhost:8080/ws/${roomId}/${userId}?username=${encodeURIComponent(username)}`

    try {
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        setIsConnected(true)
        setIsConnecting(false)
        setServerStatus("online")
        console.log("✅ WebSocket connected")

        // Add welcome message
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            type: "system",
            content: `🎉 Connected to room #${roomId}`,
            timestamp: new Date().toISOString(),
          },
        ])
      }

      wsRef.current.onmessage = (event) => {
        try {
          const message: Message = JSON.parse(event.data)
          handleWebSocketMessage(message)
        } catch (error) {
          console.error("Error parsing WebSocket message:", error)
        }
      }

      wsRef.current.onclose = (event) => {
        setIsConnected(false)
        setIsConnecting(false)
        console.log("🔌 WebSocket disconnected", event.code, event.reason)

        // Add disconnection message
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            type: "system",
            content: "🔌 Disconnected from server. Attempting to reconnect...",
            timestamp: new Date().toISOString(),
          },
        ])

        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (!isConnected) {
            connectWebSocket()
          }
        }, 3000)
      }

      wsRef.current.onerror = (error) => {
        console.error("❌ WebSocket error:", error)
        setIsConnecting(false)
        setIsConnected(false)
        setServerStatus("offline")

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            type: "system",
            content: "❌ Connection failed. Make sure the Go server is running on localhost:8080",
            timestamp: new Date().toISOString(),
          },
        ])
      }
    } catch (error) {
      console.error("Error creating WebSocket:", error)
      setIsConnecting(false)
      setIsConnected(false)
    }
  }

  const handleWebSocketMessage = (message: Message) => {
    switch (message.type) {
      case "message":
        setMessages((prev) => [
          ...prev,
          {
            ...message,
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
          },
        ])
        break
      case "user_joined":
      case "user_left":
        if (message.data && Array.isArray(message.data)) {
          setUsers(message.data)
        }
        // Add system message
        setMessages((prev) => [
          ...prev,
          {
            ...message,
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            content: `${message.username} ${message.type === "user_joined" ? "joined" : "left"} the room`,
          },
        ])
        break
    }
  }

  const loadMessageHistory = async () => {
    try {
      const response = await fetch(`http://localhost:8080/rooms/${roomId}/messages?limit=50`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data || [])
        console.log("✅ Message history loaded")
      } else {
        console.warn("⚠️ Could not load message history")
      }
    } catch (error) {
      console.warn("⚠️ Server not reachable for message history:", error)
    }
  }

  const loadRoomUsers = async () => {
    try {
      const response = await fetch(`http://localhost:8080/rooms/${roomId}/users`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
        console.log("✅ Room users loaded")
      } else {
        console.warn("⚠️ Could not load room users")
      }
    } catch (error) {
      console.warn("⚠️ Server not reachable for room users:", error)
    }
  }

  const sendMessage = () => {
    if (newMessage.trim() && wsRef.current && isConnected) {
      const message = {
        type: "message",
        content: newMessage.trim(),
      }

      wsRef.current.send(JSON.stringify(message))
      setNewMessage("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleRetryConnection = () => {
    checkServerStatus()
    connectWebSocket()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="sm" onClick={onLeave}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h2 className="font-semibold text-lg">#{roomId}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {isConnected ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-500" />
                    Connected
                  </>
                ) : isConnecting ? (
                  <>
                    <Circle className="w-4 h-4 text-yellow-500 animate-pulse" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-500" />
                    Disconnected
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Server Status */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Server Status:</span>
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  serverStatus === "online" ? "bg-green-500" : serverStatus === "offline" ? "bg-red-500" : "bg-gray-400"
                }`}
              />
              <span className={serverStatus === "online" ? "text-green-600" : "text-red-600"}>
                {serverStatus === "online" ? "Online" : serverStatus === "offline" ? "Offline" : "Unknown"}
              </span>
              <Button variant="ghost" size="sm" onClick={handleRetryConnection} className="h-4 w-4 p-0 ml-1">
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4" />
            <span className="font-medium">Users ({users.length})</span>
          </div>
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                  <div className={`w-2 h-2 rounded-full ${user.online ? "bg-green-500" : "bg-gray-400"}`} />
                  <span className="text-sm">{user.username}</span>
                  {user.id === userId && (
                    <Badge variant="secondary" className="text-xs">
                      You
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id || Date.now()} className="flex flex-col">
                {message.type === "message" ? (
                  <div className={`flex ${message.user_id === userId ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.user_id === userId ? "bg-blue-600 text-white" : "bg-white border border-gray-200"
                      }`}
                    >
                      {message.user_id !== userId && (
                        <div className="text-xs font-medium text-gray-600 mb-1">{message.username}</div>
                      )}
                      <div className="text-sm">{message.content}</div>
                      {message.timestamp && (
                        <div
                          className={`text-xs mt-1 ${message.user_id === userId ? "text-blue-100" : "text-gray-500"}`}
                        >
                          {formatTime(message.timestamp)}
                        </div>
                      )}
                    </div>
                  </div>
                ) : message.type === "system" ? (
                  <div className="text-center my-2">
                    <span className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                      {message.content}
                    </span>
                  </div>
                ) : (
                  <div className="text-center">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{message.content}</span>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex gap-2">
            <Input
              placeholder={isConnected ? "Type a message..." : "Connecting..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!isConnected}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={!newMessage.trim() || !isConnected} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
