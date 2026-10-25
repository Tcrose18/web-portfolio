export type Pin = {
  id: string;
  kind: string;
  title: string;
  note: string;
  url: string | null;
  src: string | null;
  thumbnail: string | null;
  mimeType: string | null;
  size: number;
  createdAt: string;
  published: boolean;
  category: string;
  color: string;
  photoMode: "color" | "black-and-white";
};

export const colorNames = ["red", "orange", "yellow", "green", "blue", "purple", "pink", "brown", "black", "white", "grey"] as const;
export const colorValues: Record<string, string> = { red: "#a84c44", orange: "#c77b43", yellow: "#d9be58", green: "#6c7956", blue: "#637e98", purple: "#8b769b", pink: "#d4a4af", brown: "#856449", black: "#252622", white: "#ffffff", grey: "#a9aaa3" };
export const categoryNames = ["Inspiration", "Photography", "Design studies", "Images", "Film", "Documents", "Notes", "Links"];
