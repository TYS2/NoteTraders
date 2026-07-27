import type {
  ChatConversation,
  ChatMessage,
  ChatSummary,
  ChatThreadResponse,
} from "../types";

const API_URL = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function readJson(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export async function createOrGetConversation(
  userId: number,
  listingId: number
): Promise<ChatConversation> {
  const response = await fetch(`${API_URL}/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      listing_id: listingId,
    }),
  });

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.error || "Failed to open chat");
  }

  return data.conversation ?? data;
}

export async function fetchConversations(
  userId: number
): Promise<ChatSummary[]> {
  const response = await fetch(
    `${API_URL}/conversations?userId=${encodeURIComponent(userId)}`
  );

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.error || "Failed to load chats");
  }

  return data.conversations ?? [];
}

export async function fetchConversationMessages(
  conversationId: number,
  userId: number
): Promise<ChatThreadResponse> {
  const response = await fetch(
    `${API_URL}/conversations/${conversationId}/messages?userId=${encodeURIComponent(
      userId
    )}`
  );

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.error || "Failed to load messages");
  }

  return {
    conversation: data.conversation,
    messages: data.messages ?? [],
  };
}

export async function markConversationRead(
  conversationId: number,
  userId: number
) {
  const response = await fetch(
    `${API_URL}/conversations/${conversationId}/read`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
      }),
    }
  );

  if (!response.ok) {
    const data = await readJson(response);
    throw new Error(data.error || "Failed to mark chat as read");
  }
}

export function getChatWebSocketUrl(
  conversationId: number,
  userId: number
) {
  // http -> ws and https -> wss
  const websocketBaseUrl = API_URL.replace(/^http/, "ws");

  return `${websocketBaseUrl}/ws/chat/${conversationId}?userId=${encodeURIComponent(
    userId
  )}`;
}

export function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;

  const message = value as Partial<ChatMessage>;

  return (
    typeof message.id === "number" &&
    typeof message.conversation_id === "number" &&
    typeof message.sender_id === "number" &&
    typeof message.message === "string" &&
    typeof message.created_at === "string"
  );
}

export async function setConversationPriceOffer(
  conversationId: number,
  sellerId: number,
  price: number
): Promise<ChatMessage> {
  const response = await fetch(
    `${API_URL}/conversations/${conversationId}/price-offer`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        seller_id: sellerId,
        price,
      }),
    }
  );

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(
      data.error || "Failed to set special price"
    );
  }

  return data.message;
}