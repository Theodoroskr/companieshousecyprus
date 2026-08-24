import { listEmailLogs, EmailAPIError } from "@lovable.dev/email-js";

export type EmailLogEntry = {
  timestamp: string;
  recipient: string;
  eventType: string;
  status: string | null;
  messageId: string | null;
  tags: string[];
};

export type EmailLogResult = {
  entries: EmailLogEntry[];
  hasMore: boolean;
  nextCursor: string | null;
  historyStartsAt: string | null;
  error: string | null;
};

export type EmailLogQuery = {
  recipient?: string | undefined;
  eventType?: string | undefined;
  since?: string | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
};

const EMPTY: EmailLogResult = {
  entries: [],
  hasMore: false,
  nextCursor: null,
  historyStartsAt: null,
  error: null,
};

export async function readEmailLogs(query: EmailLogQuery): Promise<EmailLogResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return { ...EMPTY, error: "Email logs are unavailable: the email service is not configured." };
  }

  try {
    const response = await listEmailLogs(
      {
        ...(query.recipient ? { recipient: query.recipient } : {}),
        ...(query.eventType ? { event_type: query.eventType } : {}),
        ...(query.since ? { since: query.since } : {}),
        ...(query.cursor ? { cursor: query.cursor } : {}),
        limit: Math.min(Math.max(query.limit ?? 100, 1), 100),
      },
      { apiKey },
    );

    return {
      entries: response.data.map((event) => ({
        timestamp: event.timestamp,
        recipient: event.recipient,
        eventType: event.event_type,
        status: event.status ?? null,
        messageId: event.message_id ?? null,
        tags: event.tags ?? [],
      })),
      hasMore: response.pagination.has_more,
      nextCursor: response.pagination.next_cursor,
      historyStartsAt: response.history_starts_at ?? null,
      error: null,
    };
  } catch (error) {
    const message =
      error instanceof EmailAPIError
        ? `Email log request failed (${error.code ?? error.status ?? "unknown"}).`
        : "Email log request failed.";
    console.error("readEmailLogs failed", error);
    return { ...EMPTY, error: message };
  }
}
