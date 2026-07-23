export const runtime = "nodejs";

export async function GET() {
  return new Response(
    `document.addEventListener("DOMContentLoaded", function () {
      var form = document.getElementById("payu");
      if (form && form instanceof HTMLFormElement) form.submit();
    });`,
    {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
