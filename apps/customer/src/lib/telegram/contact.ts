export interface TelegramContactMessage {
  from?: { id: number };
  chat?: { id: number; type: string };
  contact?: {
    phone_number?: string;
    user_id?: number;
  };
}

export function normalizeTelegramPhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!/^\+?[0-9\s().-]+$/.test(trimmed)) return null;

  const digits = trimmed.replace(/[\s().-]/g, "").replace(/^\+/, "");
  const normalized = `+${digits}`;
  return /^\+[1-9][0-9]{7,14}$/.test(normalized) ? normalized : null;
}

export function getOwnedTelegramContact(
  message: TelegramContactMessage,
): { telegramUserId: string; phoneE164: string } | null {
  const senderId = message.from?.id;
  const chat = message.chat;
  const contact = message.contact;
  if (
    !Number.isSafeInteger(senderId) ||
    !chat ||
    chat.type !== "private" ||
    chat.id !== senderId ||
    contact?.user_id !== senderId ||
    typeof contact.phone_number !== "string"
  ) {
    return null;
  }

  const phoneE164 = normalizeTelegramPhone(contact.phone_number);
  if (!phoneE164) return null;

  return {
    telegramUserId: String(senderId),
    phoneE164,
  };
}
