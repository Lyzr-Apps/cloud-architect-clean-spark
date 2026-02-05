'use client'

import { useState, useRef, useEffect } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { copyToClipboard } from '@/lib/clipboard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  FiSend,
  FiCopy,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiMenu,
  FiX,
  FiBookmark,
  FiSearch,
  FiRefreshCw,
  FiLoader,
  FiMessageSquare,
  FiCode
} from 'react-icons/fi'

// Agent Configuration
const AGENT_ID = '6984881838c06c33b0302dd8'

// TypeScript Interfaces
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface SavedPrompt {
  id: string
  title: string
  content: string
  category: string
  date: Date
}

interface CodeBlock {
  language: string
  code: string
  startIndex: number
}

// Example Prompts
const EXAMPLE_PROMPTS: SavedPrompt[] = [
  {
    id: 'ex1',
    title: 'Data Analysis Agent',
    content: 'Create a prompt for an agent that analyzes CSV data, identifies trends, and generates visualizations with insights.',
    category: 'data',
    date: new Date(),
  },
  {
    id: 'ex2',
    title: 'API Integration Helper',
    content: 'I need an agent that helps developers integrate third-party APIs by reading documentation and generating code examples.',
    category: 'api',
    date: new Date(),
  },
  {
    id: 'ex3',
    title: 'Content Moderator',
    content: 'Build a prompt for an agent that reviews user-generated content, flags inappropriate material, and categorizes by severity.',
    category: 'workflow',
    date: new Date(),
  },
]

// Code Block Component
function CodeBlock({ code, language, onCopy }: { code: string; language: string; onCopy: () => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const success = await copyToClipboard(code)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      onCopy()
    }
  }

  return (
    <div className="relative my-4 rounded-lg bg-slate-800 border border-slate-700">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <span className="text-xs text-slate-400 font-mono">{language}</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="h-7 text-slate-400 hover:text-slate-100 hover:bg-slate-700"
        >
          {copied ? (
            <>
              <FiCheck className="h-3 w-3 mr-1" />
              <span className="text-xs">Copied!</span>
            </>
          ) : (
            <>
              <FiCopy className="h-3 w-3 mr-1" />
              <span className="text-xs">Copy</span>
            </>
          )}
        </Button>
      </div>
      <ScrollArea className="max-h-[400px]">
        <pre className="p-4 overflow-x-auto">
          <code className="text-sm text-slate-100 font-mono leading-relaxed">{code}</code>
        </pre>
      </ScrollArea>
    </div>
  )
}

// Parse markdown content for code blocks
function parseCodeBlocks(content: string): { text: string; codeBlocks: CodeBlock[] } {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  const codeBlocks: CodeBlock[] = []
  let match
  let lastIndex = 0
  let textWithPlaceholders = ''

  while ((match = codeBlockRegex.exec(content)) !== null) {
    textWithPlaceholders += content.substring(lastIndex, match.index)
    textWithPlaceholders += `[CODE_BLOCK_${codeBlocks.length}]`

    codeBlocks.push({
      language: match[1] || 'text',
      code: match[2].trim(),
      startIndex: match.index,
    })

    lastIndex = match.index + match[0].length
  }

  textWithPlaceholders += content.substring(lastIndex)

  return { text: textWithPlaceholders, codeBlocks }
}

// Message Component
function MessageBubble({ message, onCopyCode }: { message: ChatMessage; onCopyCode: () => void }) {
  const isUser = message.role === 'user'
  const { text, codeBlocks } = parseCodeBlocks(message.content)

  // Split text by code block placeholders
  const parts = text.split(/\[CODE_BLOCK_(\d+)\]/)

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`max-w-[85%] ${isUser ? 'ml-12' : 'mr-12'}`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
              <FiCode className="h-3 w-3 text-white" />
            </div>
            <span className="text-xs text-slate-400 font-medium">Claude Expert</span>
          </div>
        )}

        <div
          className={`rounded-lg px-4 py-3 ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-100 border border-slate-700'
          }`}
        >
          {parts.map((part, idx) => {
            if (idx % 2 === 0) {
              // Text content
              return part.trim() ? (
                <div key={idx} className="whitespace-pre-wrap text-sm leading-relaxed mb-2">
                  {part.trim()}
                </div>
              ) : null
            } else {
              // Code block
              const blockIndex = parseInt(part)
              const codeBlock = codeBlocks[blockIndex]
              return codeBlock ? (
                <CodeBlock
                  key={idx}
                  code={codeBlock.code}
                  language={codeBlock.language}
                  onCopy={onCopyCode}
                />
              ) : null
            }
          })}
        </div>

        {!isUser && (
          <div className="text-xs text-slate-500 mt-1">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  )
}

// Quick Action Chips
function QuickActions({ onAction }: { onAction: (text: string) => void }) {
  const actions = [
    'Make it more specific',
    'Add error handling',
    'Simplify this',
    'Add examples',
  ]

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {actions.map((action) => (
        <Button
          key={action}
          size="sm"
          variant="outline"
          onClick={() => onAction(action)}
          className="h-7 text-xs bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
        >
          {action}
        </Button>
      ))}
    </div>
  )
}

// Prompt Library Sidebar
function PromptLibrary({
  savedPrompts,
  onLoad,
  onClose,
}: {
  savedPrompts: SavedPrompt[]
  onLoad: (prompt: SavedPrompt) => void
  onClose: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = ['all', 'api', 'workflow', 'data', 'technical']

  const filteredPrompts = savedPrompts.filter((prompt) => {
    const matchesSearch =
      prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || selectedCategory === 'all' || prompt.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="h-full flex flex-col bg-slate-900 border-r border-slate-800">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <FiBookmark className="h-4 w-4" />
            Prompt Library
          </h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="lg:hidden h-8 w-8 p-0 text-slate-400 hover:text-slate-100"
          >
            <FiX className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="p-4 border-b border-slate-800">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              className={`cursor-pointer capitalize text-xs ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
              }`}
              onClick={() => setSelectedCategory(category === 'all' ? null : category)}
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {filteredPrompts.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">
              No prompts found
            </div>
          ) : (
            filteredPrompts.map((prompt) => (
              <Card
                key={prompt.id}
                className="bg-slate-800 border-slate-700 hover:bg-slate-750 cursor-pointer transition-colors"
                onClick={() => onLoad(prompt)}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm text-slate-100">{prompt.title}</CardTitle>
                    <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                      {prompt.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <p className="text-xs text-slate-400 line-clamp-2 mb-2">{prompt.content}</p>
                  <p className="text-xs text-slate-600">
                    {prompt.date.toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// Main Component
export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>(EXAMPLE_PROMPTS)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Load saved prompts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('claudeExpertPrompts')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSavedPrompts([
          ...EXAMPLE_PROMPTS,
          ...parsed.map((p: any) => ({ ...p, date: new Date(p.date) })),
        ])
      } catch (e) {
        console.error('Failed to load saved prompts', e)
      }
    }
  }, [])

  const handleSendMessage = async (content?: string) => {
    const messageContent = content || inputValue.trim()
    if (!messageContent || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const result = await callAIAgent(messageContent, AGENT_ID)

      let responseContent = ''

      if (result.success && result.response.status === 'success') {
        responseContent = result.response.result?.response || 'No response received'
      } else {
        responseContent = `Error: ${result.error || result.response.message || 'Unknown error occurred'}`
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleQuickAction = (action: string) => {
    if (messages.length > 0) {
      handleSendMessage(action)
    }
  }

  const handleLoadPrompt = (prompt: SavedPrompt) => {
    setInputValue(prompt.content)
    setSidebarOpen(false)
    inputRef.current?.focus()
  }

  const handleSavePrompt = (content: string) => {
    const title = window.prompt('Enter a title for this prompt:')
    if (!title) return

    const category = window.prompt('Enter a category (api, workflow, data, technical):') || 'general'

    const newPrompt: SavedPrompt = {
      id: Date.now().toString(),
      title,
      content,
      category,
      date: new Date(),
    }

    const userPrompts = savedPrompts.filter((p) => !EXAMPLE_PROMPTS.find((ex) => ex.id === p.id))
    const updatedPrompts = [...userPrompts, newPrompt]

    setSavedPrompts([...EXAMPLE_PROMPTS, ...updatedPrompts])

    localStorage.setItem('claudeExpertPrompts', JSON.stringify(updatedPrompts))
  }

  const handleCopyCode = () => {
    // Feedback handled in CodeBlock component
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-9 w-9 p-0 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            {sidebarOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
          </Button>
          <h1 className="text-xl font-bold text-slate-100 font-mono">
            Claude Expert Prompt Architect
          </h1>
        </div>
        <Badge variant="outline" className="border-blue-600 text-blue-400 hidden sm:flex">
          Powered by Claude
        </Badge>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-full lg:w-80 h-full absolute lg:relative z-10 lg:z-0">
            <PromptLibrary
              savedPrompts={savedPrompts}
              onLoad={handleLoadPrompt}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-slate-950">
          <ScrollArea className="flex-1 p-4 lg:p-6">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-2xl">
                  <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
                    <FiMessageSquare className="h-8 w-8 text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100 mb-3">
                    Welcome to Claude Expert Prompt Architect
                  </h2>
                  <p className="text-slate-400 mb-6">
                    I'll help you create expert-level prompts for your AI agents. Just describe what you need,
                    and I'll craft a structured, effective prompt with explanations and recommendations.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="outline" className="border-slate-700 text-slate-400">
                      Structured Prompts
                    </Badge>
                    <Badge variant="outline" className="border-slate-700 text-slate-400">
                      Code Examples
                    </Badge>
                    <Badge variant="outline" className="border-slate-700 text-slate-400">
                      Best Practices
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} onCopyCode={handleCopyCode} />
                ))}
                {isLoading && (
                  <div className="flex justify-start mb-6">
                    <div className="max-w-[85%] mr-12">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                          <FiCode className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-xs text-slate-400 font-medium">Claude Expert</span>
                      </div>
                      <div className="rounded-lg px-4 py-3 bg-slate-800 border border-slate-700">
                        <div className="flex items-center gap-2 text-slate-400">
                          <FiLoader className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Crafting your prompt...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-slate-800 bg-slate-900 p-4">
            <div className="max-w-4xl mx-auto">
              {messages.length > 0 && <QuickActions onAction={handleQuickAction} />}

              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Textarea
                    ref={inputRef}
                    placeholder="Describe the agent prompt you need... (Enter to send, Shift+Enter for new line)"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    className="min-h-[60px] max-h-[200px] resize-none bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-blue-600 pr-10"
                    rows={2}
                  />
                  {inputValue && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSavePrompt(inputValue)}
                      className="absolute right-2 top-2 h-7 w-7 p-0 text-slate-500 hover:text-slate-300"
                      title="Save to library"
                    >
                      <FiBookmark className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isLoading}
                  className="h-[60px] px-6 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-800 disabled:text-slate-600"
                >
                  {isLoading ? (
                    <FiLoader className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <FiSend className="h-5 w-5 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </div>

              <div className="mt-2 text-xs text-slate-600 flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400">Enter</kbd>
                  to send
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400">Shift + Enter</kbd>
                  for new line
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
