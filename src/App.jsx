import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedModel, setSelectedModel] = useState("llama3.2:1b");
  const [chatSessions, setChatSessions] = useState([{ id: 1, messages: [] }]);
  const [currentSessionId, setCurrentSessionId] = useState(1);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);
  const clearChat = () => {
    setMessages([]);
    setChatSessions((prev) =>
      prev.map((session) =>
        session.id === currentSessionId ? { ...session, messages: [] } : session
      )
    );
  };
  const startNewChat = () => {
    const newSessionId = chatSessions.length + 1;
    setChatSessions((prev) => [...prev, { id: newSessionId, messages: [] }]);
    setCurrentSessionId(newSessionId);
    setMessages([]);
  };
  const switchChatSession = (sessionId) => {
    setCurrentSessionId(sessionId);
    const session = chatSessions.find((s) => s.id === sessionId);
    setMessages(session.messages);
  };
  const handleModelChange = (e) => setSelectedModel(e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setChatSessions((prev) =>
      prev.map((session) =>
        session.id === currentSessionId
          ? { ...session, messages: [...session.messages, userMessage] }
          : session
      )
    );
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: [...messages, userMessage],
          stream: true,
        }),
      });

      const reader = response.body.getReader();
      let assistantMessage = { role: "assistant", content: "" };
      setMessages((prev) => [...prev, assistantMessage]);
      setChatSessions((prev) =>
        prev.map((session) =>
          session.id === currentSessionId
            ? { ...session, messages: [...session.messages, assistantMessage] }
            : session
        )
      );

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.trim()) {
            const data = JSON.parse(line);
            assistantMessage.content += data.message.content;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { ...assistantMessage };
              return updated;
            });
            setChatSessions((prev) =>
              prev.map((session) =>
                session.id === currentSessionId
                  ? {
                      ...session,
                      messages: [
                        ...session.messages.slice(0, -1),
                        assistantMessage,
                      ],
                    }
                  : session
              )
            );
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = {
        role: "assistant",
        content: "Error: Could not connect to the AI model.",
      };
      setMessages((prev) => [...prev, errorMessage]);
      setChatSessions((prev) =>
        prev.map((session) =>
          session.id === currentSessionId
            ? { ...session, messages: [...session.messages, errorMessage] }
            : session
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const chatContainer = document.querySelector(".chat-container");
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
  }, [messages]);

  return (
    <div className={`App ${isDarkMode ? "dark" : "light"}`}>
      <div className="background"></div>
      <div className="desktop-container">
        <div className="sidebar neumorphic">
          <h2 className="text-xl font-semibold mb-4">Chat History</h2>
          <button onClick={startNewChat} className="neumorphic-btn w-full mb-4">
            New Chat
          </button>
          <div className="session-list">
            {chatSessions.map((session) => (
              <div
                key={session.id}
                className={`session-item neumorphic-btn ${
                  session.id === currentSessionId ? "active" : ""
                }`}
                onClick={() => switchChatSession(session.id)}
              >
                Chat {session.id}
              </div>
            ))}
          </div>
        </div>
        <div className="main-content">
          <div className="header flex justify-between items-center mb-6">
            <h1 className="text-4xl font-bold">AI Nexus: Local Chat</h1>
            <div className="controls flex gap-4">
              <select
                value={selectedModel}
                onChange={handleModelChange}
                className="neumorphic-input"
              >
                <option value="llama3.2:1b">llama3.2:1b</option>
                <option value="gemma:2b">gemma:2b</option>
              </select>
              <button
                onClick={toggleTheme}
                className="neumorphic-btn"
                title={
                  isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
                }
              >
                {isDarkMode ? "☀️ Light" : "🌙 Dark"}
              </button>
              <button onClick={clearChat} className="neumorphic-btn">
                Clear Chat
              </button>
            </div>
          </div>
          <div className="chat-container neumorphic">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`message ${msg.role} neumorphic-${
                  msg.role === "user" ? "user" : "assistant"
                }`}
              >
                <strong>{msg.role === "user" ? "You" : "AI"}:</strong>{" "}
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="message assistant neumorphic-assistant">
                <strong>AI:</strong>
                <span className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="input-form mt-6">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your query..."
              disabled={isLoading}
              className="neumorphic-input"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="neumorphic-btn"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
