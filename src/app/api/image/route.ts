import { NextResponse } from "next/server";

const allowedHosts = new Set(["www.docsdocs.net", "docsdocs.net"]);

export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get("src");

  if (!source) {
    return NextResponse.json({ error: "Missing image src" }, { status: 400 });
  }

  let url: URL;

  try {
    url = new URL(source);
  } catch {
    return NextResponse.json({ error: "Invalid image src" }, { status: 400 });
  }

  if (
    url.protocol !== "https:" ||
    !allowedHosts.has(url.hostname) ||
    !url.pathname.startsWith("/resuser/img/")
  ) {
    return NextResponse.json({ error: "Image source not allowed" }, { status: 400 });
  }

  const response = await fetch(url, {
    headers: {
      Accept: "image/avif,image/webp,image/*,*/*"
    },
    next: {
      revalidate: 60 * 60 * 24 * 30
    }
  });

  const contentType = response.headers.get("content-type") || "image/jpeg";

  if (!response.ok && !contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Image not found" }, { status: response.status });
  }

  return new NextResponse(response.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
