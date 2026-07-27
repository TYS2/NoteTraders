import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchConversationMessages,
  getChatWebSocketUrl,
  isChatMessage,
  markConversationRead,
  setConversationPriceOffer,
} from "../api/chatAPI";
import { useAppContext } from "../context/AppContext";
import type {
  ChatConversation,
  ChatMessage,
  Listing,
} from "../types";

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

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`;
}

function upsertMessage(
  currentMessages: ChatMessage[],
  incoming: ChatMessage
) {
  const alreadyExists = currentMessages.some(
    (message) => message.id === incoming.id
  );

  const nextMessages = alreadyExists
    ? currentMessages.map((message) =>
        message.id === incoming.id ? incoming : message
      )
    : [...currentMessages, incoming];

  return [...nextMessages].sort((first, second) => {
    const timeDifference =
      new Date(first.created_at).getTime() -
      new Date(second.created_at).getTime();

    return timeDifference || first.id - second.id;
  });
}

function ChatPage() {
  const { conversationId } = useParams();

  const {
    currentUser,
    message: purchaseMessage,
    purchaseListing,
    setMessage,
  } = useAppContext();

  const [conversation, setConversation] =
    useState<ChatConversation | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isPriceModalOpen, setIsPriceModalOpen] =
    useState(false);

  const [priceInput, setPriceInput] = useState("");
  const [priceError, setPriceError] = useState("");
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  const [buyingOfferId, setBuyingOfferId] = useState<
    number | null
  >(null);

  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const userId = Number(
    currentUser?.accountId ?? currentUser?.id
  );

  const numericConversationId = Number(conversationId);

  const navigate = useNavigate();

  const hasValidIds =
    Number.isFinite(userId) &&
    userId > 0 &&
    Number.isFinite(numericConversationId) &&
    numericConversationId > 0;

  const isSeller = conversation?.seller_id === userId;

  const listingIsAvailable =
    Number(conversation?.item_price ?? 0) > 0;

  useEffect(() => {
    setMessage("");
  }, [setMessage]);

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
          getChatWebSocketUrl(
            numericConversationId,
            userId
          )
        );

        socketRef.current = socket;

        socket.onmessage = (event) => {
          try {
            const incoming: unknown = JSON.parse(
              String(event.data)
            );

            if (!isChatMessage(incoming)) {
              const possibleError = incoming as {
                error?: string;
              };

              if (possibleError.error) {
                setError(possibleError.error);
              }

              return;
            }

            setMessages((currentMessages) =>
              upsertMessage(currentMessages, incoming)
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
            setError(
              "Received an invalid chat message."
            );
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
  }, [
    hasValidIds,
    numericConversationId,
    userId,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (
        document.visibilityState === "visible" &&
        hasValidIds
      ) {
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
  }, [
    hasValidIds,
    numericConversationId,
    userId,
  ]);

  function handleSend(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const message = draft.trim();

    if (!message) return;

    const socket = socketRef.current;

    if (
      !socket ||
      socket.readyState !== WebSocket.OPEN
    ) {
      setError(
        "Chat is still connecting. Please try again."
      );
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

  function openPriceModal(offer?: ChatMessage) {
    if (!conversation) return;

    const defaultPrice =
      offer?.offer_price ?? conversation.item_price;

    setPriceInput(defaultPrice.toFixed(2));
    setPriceError("");
    setError("");
    setIsPriceModalOpen(true);
  }

  function closePriceModal() {
    if (isSavingPrice) return;

    setIsPriceModalOpen(false);
    setPriceInput("");
    setPriceError("");
  }

  async function handleSetPrice(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!conversation || !isSeller) return;

    const price = Number(priceInput);

    if (!Number.isFinite(price) || price <= 0) {
      setPriceError(
        "Price must be more than $0."
      );
      return;
    }

    if (price > conversation.item_price) {
      setPriceError(
        "Special price cannot be higher than the original listing price."
      );
      return;
    }

    setIsSavingPrice(true);

    try {
      const savedOffer =
        await setConversationPriceOffer(
          numericConversationId,
          userId,
          price
        );

      setMessages((currentMessages) =>
        upsertMessage(
          currentMessages,
          savedOffer
        )
      );

      setIsPriceModalOpen(false);
      setPriceInput("");
      setPriceError("");
      setError("");
    } catch (offerError) {
      setPriceError(
        offerError instanceof Error
          ? offerError.message
          : "Failed to set special price"
      );
    } finally {
      setIsSavingPrice(false);
    }
  }

  async function handleBuyOffer(
    offer: ChatMessage
  ) {
    if (
      !conversation ||
      offer.offer_price === null ||
      offer.offer_price === undefined
    ) {
      return;
    }

    const offeredListing: Listing = {
      id: conversation.listing_id,
      title: conversation.item_title,
      description: "",
      price: offer.offer_price,
      seller: conversation.other_username,
      academicLevel: "",
      subject: "",
    };

    setBuyingOfferId(offer.id);
    setError("");

    const success = await purchaseListing(
      offeredListing,
      offer.id
    );

    setBuyingOfferId(null);

    if (success) {
      navigate("/account");
    }
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
            <h2>
              {conversation?.other_username || "Chat"}
            </h2>

            <div className="chat-listing-heading">
              <p>
                {conversation?.item_title || ""}
              </p>

              {isSeller && listingIsAvailable && (
                <button
                  type="button"
                  className="set-price-btn"
                  onClick={() => openPriceModal()}
                >
                  Set Price
                </button>
              )}
            </div>
          </header>

          {(error || purchaseMessage) && (
            <p className="status-message">
              {error || purchaseMessage}
            </p>
          )}

          <section className="chat-window">
            <div className="chat-messages">
              {messages.length === 0 && (
                <p className="chat-empty-state">
                  No messages yet. Start the chat!
                </p>
              )}

              {messages.map(
                (message, index) => {
                  const previousMessage =
                    messages[index - 1];

                  const currentDate = formatDate(
                    message.created_at
                  );

                  const previousDate =
                    previousMessage
                      ? formatDate(
                          previousMessage.created_at
                        )
                      : null;

                  const isSentByCurrentUser =
                    message.sender_id === userId;

                  const isPriceOffer =
                    message.message_type ===
                      "price_offer" &&
                    message.offer_price !== null &&
                    message.offer_price !==
                      undefined;

                  return (
                    <div key={message.id}>
                      {currentDate !==
                        previousDate && (
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
                        <div
                          className={`chat-message-bubble ${
                            isPriceOffer
                              ? "price-offer-bubble"
                              : ""
                          }`}
                        >
                          {isPriceOffer ? (
                            <>
                              <span>
                                Price Offered:
                              </span>

                              <strong>
                                {formatPrice(
                                  message.offer_price!
                                )}
                              </strong>

                              {message.offer_status ===
                                "active" &&
                                isSeller && (
                                  <button
                                    type="button"
                                    className="offer-action-btn"
                                    onClick={() =>
                                      openPriceModal(
                                        message
                                      )
                                    }
                                  >
                                    Edit
                                  </button>
                                )}

                              {message.offer_status ===
                                "active" &&
                                !isSeller && (
                                  <button
                                    type="button"
                                    className="offer-action-btn"
                                    disabled={
                                      buyingOfferId ===
                                      message.id
                                    }
                                    onClick={() =>
                                      void handleBuyOffer(
                                        message
                                      )
                                    }
                                  >
                                    {buyingOfferId ===
                                    message.id
                                      ? "Buying..."
                                      : "Buy"}
                                  </button>
                                )}

                              {message.offer_status ===
                                "accepted" && (
                                  <span className="offer-accepted-label">
                                    Purchased
                                  </span>
                                )}
                            </>
                          ) : (
                            message.message
                          )}
                        </div>

                        <time>
                          {formatTime(
                            message.created_at
                          )}
                        </time>
                      </div>
                    </div>
                  );
                }
              )}

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

              <button type="submit">
                Send
              </button>
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

      {isPriceModalOpen && conversation && (
        <div
          className="price-modal-overlay"
          onMouseDown={closePriceModal}
        >
          <form
            className="price-modal"
            onSubmit={handleSetPrice}
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <label htmlFor="special-price">
              Price:
            </label>

            <div className="price-input-wrapper">
              <span>$</span>

              <input
                id="special-price"
                type="number"
                min="0.01"
                max={conversation.item_price}
                step="0.01"
                value={priceInput}
                autoFocus
                onChange={(event) =>
                  setPriceInput(
                    event.target.value
                  )
                }
              />
            </div>

            {priceError && (
              <p className="price-modal-error">
                {priceError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSavingPrice}
            >
              {isSavingPrice
                ? "Saving..."
                : "Set new price"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}

export default ChatPage;