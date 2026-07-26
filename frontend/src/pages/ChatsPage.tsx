import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchConversations } from "../api/chatAPI";
import { useAppContext } from "../context/AppContext";
import type { ChatSummary } from "../types";

function formatChatTime(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function ChatsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const userId = Number(currentUser?.accountId ?? currentUser?.id);
  const hasValidUserId = Number.isFinite(userId) && userId > 0;

  useEffect(() => {
    if (!hasValidUserId) return;

    let cancelled = false;

    async function loadChats(showLoading: boolean) {
      if (showLoading) setIsLoading(true);

      try {
        const data = await fetchConversations(userId);

        if (!cancelled) {
          setChats(data);
          setError("");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load chats"
          );
        }
      } finally {
        if (!cancelled && showLoading) {
          setIsLoading(false);
        }
      }
    }

    void loadChats(true);

    // Temporary simple refresh method for the list page.
    const intervalId = window.setInterval(() => {
      void loadChats(false);
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [hasValidUserId, userId]);

  if (!hasValidUserId) {
    return (
      <main className="chats-page">
        <p>Unable to load chats because the user ID is missing.</p>
      </main>
    );
  }

  return (
    <main className="chats-page">
      <h2>Chats</h2>

      {error && <p className="status-message">{error}</p>}

      <section className="chat-list-panel">
        {isLoading ? (
          <p className="chat-empty-state">Loading chats...</p>
        ) : chats.length === 0 ? (
          <p className="chat-empty-state">You do not have any chats yet.</p>
        ) : (
          chats.map((chat) => (
            <button
              className={`chat-list-card ${
                chat.unread ? "is-unread" : ""
              }`}
              key={chat.id}
              type="button"
              onClick={() => navigate(`/chats/${chat.id}`)}
            >
              <span className="chat-list-text">
                <strong className="chat-username">
                  {chat.other_username}
                </strong>

                <span className="chat-item-title">
                  {chat.item_title}
                </span>

                <span className="chat-last-message">
                  {chat.last_message || "No messages yet"}
                </span>
              </span>

              <time className="chat-last-time">
                {formatChatTime(chat.last_message_at)}
              </time>
            </button>
          ))
        )}
      </section>
    </main>
  );
}

export default ChatsPage;