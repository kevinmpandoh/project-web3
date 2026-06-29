"use client";

export async function getGreeting({ data }: { data: { name: string } }) {
  const response = await fetch("/api/example/greeting", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data }),
  });
  if (!response.ok) throw new Error("Greeting request failed");
  return response.json();
}
