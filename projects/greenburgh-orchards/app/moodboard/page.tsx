import type { Metadata } from "next";
import { getChatGPTUser, chatGPTSignInPath } from "../chatgpt-auth";
import { isClippingsEditor } from "../clippings-editor";
import Moodboard from "./Moodboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Found Clippings — Greenburgh Orchards" };
export default async function MoodboardPage({ searchParams }: { searchParams: Promise<{ edit?: string; category?: string }> }) {
  const params = await searchParams;
  const user = await getChatGPTUser();
  const editor = await isClippingsEditor();
  return <Moodboard editor={editor} editRequested={params.edit === "1"} signedIn={Boolean(user)} initialCategory={params.category || "All categories"} signInPath={chatGPTSignInPath("/moodboard?edit=1")} />;
}
