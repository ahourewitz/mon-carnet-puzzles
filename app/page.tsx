import Collection from "./collection";
import { requireChatGPTUser } from "./chatgpt-auth";
import { readCollection } from "../lib/collection";
export const dynamic="force-dynamic";
export default async function Home() {
  const user=await requireChatGPTUser("/");
  return <Collection initialPuzzles={await readCollection(user.userId)}/>;
}
