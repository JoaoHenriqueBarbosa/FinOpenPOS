import { redirect } from "next/navigation";

export default function Home() {
  if (process.env.BASE_URL && process.env.BASE_URL !== "http://localhost" && !process.env.BASE_PATH) {
    redirect(process.env.BASE_URL);
  }
  redirect("/login");
}
