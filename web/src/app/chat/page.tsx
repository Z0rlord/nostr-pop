import { redirect } from "next/navigation";

/** DojoPop Global — MLS group on the self-hosted Cordn coordinator */
const DOJOPOP_GLOBAL_CHAT =
  "/chat-app/chat/efe026b2-5eae-4859-b6ca-0c96307465a9?c=nprofile1qyv8wumn8ghj7un9d3shjtnyda4x7ur0wqhxc6tkv5q3vamnwvaz7tmjv4kxz7fwwpexjmtpdshxuet5qy28wumn8ghj7un9d3shjtnyv9kh2uewd9hszrthwden5te0dehhxtnvdakqqgxedxqn5hqw8eja45ple8sa9k6ex0w63vc8mh8ywn5d5c95u2yztyvu9ryn&m=eyJuYW1lIjoiRG9qb1BvcCBHbG9iYWwiLCJpY29uIjoi8J-liyJ9";

export default function ChatPage() {
  redirect(DOJOPOP_GLOBAL_CHAT);
}
