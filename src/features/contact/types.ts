export interface ContactMessageInput {
  name: string;
  email: string;
  phone?: string;
  service: "consulting" | "digital" | "branding" | "other";
  message: string;
}

export interface ContactMessageResult { sent: true }
