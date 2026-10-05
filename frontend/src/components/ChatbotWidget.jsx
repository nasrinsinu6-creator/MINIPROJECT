/**
 * @file ChatbotWidget.jsx
 * @description Floating AI Chatbot assistant widget component.
 * Provides real-time conversational assistance, automated suggestions for travel queries,
 * chat message history tracking, auto-scroll animation, and direct integration with chatbot backend API.
 */

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react';
import { chatbotService } from '../services/api';

/**
 * Floating interactive Chatbot widget rendered on user dashboard and main app screens.
 */
export default function ChatbotWidget() {

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hello! I am your AI Travel Assistant. Ask me anything about Munnar, Goa, local weather, travel budgets, hotels, or packing lists!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMsg = {
      sender: 'user',
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    const promptText = input;
    setInput('');
    setLoading(true);

    try {
      const res = await chatbotService.sendMessage(promptText);
      const botMsg = {
        sender: 'bot',
        text: res.response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = {
        sender: 'bot',
        text: "Apologies, I am experiencing server connectivity issues. Ask me about common tourist spots such as Goa, Munnar, or Wayanad!",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = async (question) => {
    const userMsg = {
      sender: 'user',
      text: question,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await chatbotService.sendMessage(question);
      const botMsg = {
        sender: 'bot',
        text: res.response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = {
        sender: 'bot',
        text: "Apologies, I am experiencing server connectivity issues.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 font-sans">
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-primary to-secondary text-white shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 animate-float"
          aria-label="Open Travel Chatbot"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {/* Expandable Chat Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[420px] h-[580px] rounded-[32px] bg-white/90 dark:bg-[#111827]/90 backdrop-blur-2xl border border-white/20 dark:border-white/5 shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-secondary p-5 flex items-center justify-between text-white border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/10 rounded-2xl">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide font-grotesk">AuraTravel Copilot</h3>
                <span className="text-[10px] text-sky-100 flex items-center mt-0.5">
                  <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full mr-1.5 animate-pulse"></span>
                  AI Guide Online
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Close Chat"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Conversation History */}
          <div className="flex-grow overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/40">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex items-start ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center mr-2.5 flex-shrink-0 border border-primary/10">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 text-xs shadow-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-br from-primary to-secondary text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-800 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line font-medium">{msg.text}</p>
                  <span
                    className={`text-[8px] block text-right mt-1.5 font-bold ${
                      msg.sender === 'user' ? 'text-sky-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.time}
                  </span>
                </div>
                {msg.sender === 'user' && (
                  <div className="h-8 w-8 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center ml-2.5 flex-shrink-0 border border-secondary/10">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            
            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-start">
                <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center mr-2.5 flex-shrink-0 border border-primary/10">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl rounded-tl-none border border-slate-150 dark:border-slate-800 px-4 py-3 flex space-x-1.5 items-center shadow-sm">
                  <div className="h-2 w-2 bg-slate-350 dark:bg-slate-650 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="h-2 w-2 bg-slate-350 dark:bg-slate-650 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="h-2 w-2 bg-slate-350 dark:bg-slate-650 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestions Tag Bar */}
          <div className="bg-slate-50/50 dark:bg-slate-950/40 px-5 pb-3 pt-1 border-t border-slate-100 dark:border-slate-900 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-2">
            {[
              "Top travel destinations",
              "Munnar best season",
              "Wayanad local food",
              "Emergency hotline numbers"
            ].map((q) => (
              <button
                key={q}
                onClick={() => handleQuickQuestion(q)}
                className="text-[9px] font-bold bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all flex-shrink-0 hover:scale-105"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Form Input */}
          <form
            onSubmit={handleSend}
            className="p-4 border-t border-slate-150 dark:border-slate-850 bg-white dark:bg-slate-900 flex items-center space-x-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about travel guides, budget estimates..."
              className="flex-grow bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:text-white"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-3 rounded-2xl bg-primary text-white hover:bg-primary-dark shadow hover:scale-105 active:scale-95 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:shadow-none disabled:scale-100 transition-all duration-200"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
