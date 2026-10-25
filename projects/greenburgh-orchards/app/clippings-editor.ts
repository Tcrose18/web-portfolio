import { env } from "cloudflare:workers";
import { getChatGPTUser, type ChatGPTUser } from "./chatgpt-auth";

export async function getClippingsEditor(): Promise<ChatGPTUser | null> {
  const user = await getChatGPTUser();
  const editorEmail = (env as unknown as { SITE_EDITOR_EMAIL?: string }).SITE_EDITOR_EMAIL?.trim().toLowerCase();
  return user && editorEmail && user.email.trim().toLowerCase() === editorEmail ? user : null;
}

export async function isClippingsEditor(): Promise<boolean> {
  return Boolean(await getClippingsEditor());
}
