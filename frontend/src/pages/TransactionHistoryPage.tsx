import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import type { TransactionHistoryEntry } from "../types";

const API_URL = import.meta.env.VITE_API_URL;
function TransactionHistoryPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();

  const [transactions, setTransactions] = useState<TransactionHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const userId = currentUser?.accountId ?? currentUser?.id;

  useEffect(() => {
    async function fetchTransactionHistory() {
      if (!userId) {
        setErrorMessage("Unable to load transactions because account ID is missing.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/transactions/${userId}/history`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch transaction history");
        }

        setTransactions(data.transactions || []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to fetch transaction history"
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchTransactionHistory();
  }, [userId]);

  function formatDate(dateValue: string) {
    const date = new Date(dateValue);

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  function formatTime(dateValue: string) {
    const date = new Date(dateValue);

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
  }

  function formatAmount(amount: number) {
    const sign = amount >= 0 ? "+" : "-";
    return `${sign} $${Math.abs(amount).toFixed(2)}`;
  }

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, TransactionHistoryEntry[]> = {};

    transactions.forEach((transaction) => {
      const dateKey = formatDate(transaction.createdAt);

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }

      groups[dateKey].push(transaction);
    });

    return Object.entries(groups);
  }, [transactions]);

  return (
    <main className="transaction-history-page">
      <section className="transaction-history-container">
        <h2 className="transaction-history-title">Transaction History</h2>

        {isLoading && <p>Loading transactions...</p>}

        {errorMessage && <p className="status-message">{errorMessage}</p>}

        {!isLoading && transactions.length === 0 && !errorMessage && (
          <div className="transaction-history-card">
            <p>No transactions yet.</p>
          </div>
        )}

        {!isLoading &&
          groupedTransactions.map(([date, dateTransactions]) => (
            <div className="transaction-date-group" key={date}>
              <h3 className="transaction-date">{date}</h3>

              {dateTransactions.map((transaction, index) => (
                <div
                  className="transaction-history-card"
                  key={`${transaction.transactionType}-${transaction.id}-${index}`}
                >
                  <p className="transaction-history-label">
                    <strong>{transaction.transactionType}</strong>{" "}
                    {transaction.title}
                  </p>

                  <div className="transaction-history-row">
                    <span>{formatTime(transaction.createdAt)}</span>

                    <span className="transaction-history-amount">
                      {formatAmount(transaction.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}

        <button className="back-to-home-btn" onClick={() => navigate("/account")}>
          Back to Account
        </button>
      </section>
    </main>
  );
}

export default TransactionHistoryPage;