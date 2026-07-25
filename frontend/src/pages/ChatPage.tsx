import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchConversationMessages,
  getChatWebSocketUrl,
  isChatMessage,
  markConversationRead,
} from "../api/chatAPI";
import { useAppContext } from "../context/AppContext";
import type { ChatConversation, ChatMessage } from "../types";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-SG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function ChatPage() {
  const { conversationId } = useParams();
  const { currentUser } = useAppContext();

  const [conversation, setConversation] =
    useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const userId = Number(currentUser?.accountId ?? currentUser?.id);
  const numericConversationId = Number(conversationId);

  const navigate = useNavigate();

  const hasValidIds =
    Number.isFinite(userId) &&
    userId > 0 &&
    Number.isFinite(numericConversationId) &&
    numericConversationId > 0;

  useEffect(() => {
    if (!hasValidIds) return;

    let cancelled = false;

    async function initialiseChat() {
      try {
        const data = await fetchConversationMessages(
          numericConversationId,
          userId
        );

        if (cancelled) return;

        setConversation(data.conversation);
        setMessages(data.messages);
        setError("");

        void markConversationRead(
          numericConversationId,
          userId
        ).catch(console.error);

        const socket = new WebSocket(
          getChatWebSocketUrl(numericConversationId, userId)
        );

        socketRef.current = socket;

        socket.onmessage = (event) => {
          try {
            const incoming: unknown = JSON.parse(String(event.data));

            if (!isChatMessage(incoming)) {
              const possibleError = incoming as { error?: string };

              if (possibleError.error) {
                setError(possibleError.error);
              }

              return;
            }

            setMessages((currentMessages) =>
              currentMessages.some(
                (message) => message.id === incoming.id
              )
                ? currentMessages
                : [...currentMessages, incoming]
            );

            if (
              incoming.sender_id !== userId &&
              document.visibilityState === "visible"
            ) {
              void markConversationRead(
                numericConversationId,
                userId
              ).catch(console.error);
            }
          } catch {
            setError("Received an invalid chat message.");
          }
        };

        socket.onerror = () => {
          setError(
            "Chat connection failed. Please refresh the page."
          );
        };
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load chat"
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void initialiseChat();

    return () => {
      cancelled = true;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [hasValidIds, numericConversationId, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && hasValidIds) {
        void markConversationRead(
          numericConversationId,
          userId
        ).catch(console.error);
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [hasValidIds, numericConversationId, userId]);

  function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = draft.trim();

    if (!message) return;

    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError("Chat is still connecting. Please try again.");
      return;
    }

    socket.send(
      JSON.stringify({
        message,
      })
    );

    setDraft("");
    setError("");
  }

  if (!hasValidIds) {
    return (
      <main className="chat-page">
        <p>Invalid chat.</p>
      </main>
    );
  }

  return (
    <main className="chat-page">
      {isLoading ? (
        <p>Loading chat...</p>
      ) : (
        <>
          <header className="chat-thread-header">
            <h2>{conversation?.other_username || "Chat"}</h2>
            <p>{conversation?.item_title || ""}</p>
          </header>

          {error && <p className="status-message">{error}</p>}

          <section className="chat-window">
            <div className="chat-messages">
              {messages.length === 0 && (
                <p className="chat-empty-state">
                  No messages yet. Start the chat!
                </p>
              )}

              {messages.map((message, index) => {
                const previousMessage = messages[index - 1];

                const currentDate = formatDate(
                  message.created_at
                );

                const previousDate = previousMessage
                  ? formatDate(previousMessage.created_at)
                  : null;

                const isSentByCurrentUser =
                  message.sender_id === userId;

                return (
                  <div key={message.id}>
                    {currentDate !== previousDate && (
                      <div className="chat-date-divider">
                        {currentDate}
                      </div>
                    )}

                    <div
                      className={`chat-message-row ${
                        isSentByCurrentUser
                          ? "sent"
                          : "received"
                      }`}
                    >
                      <div className="chat-message-bubble">
                        {message.message}
                      </div>

                      <time>
                        {formatTime(message.created_at)}
                      </time>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            <form
              className="chat-input-form"
              onSubmit={handleSend}
            >
              <input
                type="text"
                value={draft}
                maxLength={1000}
                placeholder="Type here..."
                onChange={(event) =>
                  setDraft(event.target.value)
                }
              />

              <button type="submit">Send</button>
            </form>
          </section>

          <button
            type="button"
            className="back-link"
            onClick={() => navigate("/chats")}
            >
            Back to Chats
            </button>
        </>
      )}
    </main>
  );
}

export default ChatPage;