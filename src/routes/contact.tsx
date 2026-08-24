import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, Clock, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitContactInquiry } from "@/lib/contact.functions";


const TITLE = "Contact Companies House Cyprus — certificates & account pricing";
const DESCRIPTION =
  "Ask about Cyprus Registrar certificates, bulk ordering, apostille and certified translation, or request account pricing for your firm.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = useServerFn(submitContactInquiry);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      company: String(fd.get("company") ?? "").trim(),
      message: String(fd.get("message") ?? "").trim(),
    };

    if (!payload.name) {
      setError("Please enter your name.");
      return;
    }
    if (!payload.email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (payload.message.length < 5) {
      setError("Please add a few details about your request (at least 5 characters).");
      (form.elements.namedItem("message") as HTMLTextAreaElement | null)?.focus();
      return;
    }

    setSending(true);
    setError(null);
    try {
      await send({ data: payload });
      form.reset();
      setSent(true);
    } catch (err) {
      console.error("Contact form submission failed", err);
      setError(
        "We couldn't send your message. Please try again, or email info@companieshousecyprus.com directly.",
      );
    } finally {
      setSending(false);
    }
  }


  return (
    <div className="mx-auto max-w-7xl px-4 py-14">
      <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-copper">Contact</p>
          <h1 className="mt-4 text-4xl font-bold">Talk to our Cyprus registry team</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Questions about a specific entity, an urgent certificate, apostille and certified translation, or volume
            pricing for your firm — we answer within one business day.
          </p>

          {sent ? (
            <div className="mt-10 rounded-xl border bg-card p-10 text-center shadow-panel">
              <CheckCircle2 className="mx-auto size-10 text-olive" />
              <h2 className="mt-4 text-xl font-semibold">Message sent</h2>
              <p className="mt-2 text-sm text-muted-foreground">We'll be in touch within one business day.</p>
              <Button asChild variant="outline" className="mt-6">
                <Link to="/pricing">Meanwhile, see pricing</Link>
              </Button>
            </div>
          ) : (
            <form className="mt-10 rounded-xl border bg-card p-6 shadow-panel" onSubmit={handleSubmit}>

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="text-sm font-medium">Name</span>
                  <input required name="name" className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring" />
                </label>
                <label>
                  <span className="text-sm font-medium">Email</span>
                  <input required type="email" name="email" className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring" />
                </label>
                <label className="sm:col-span-2">
                  <span className="text-sm font-medium">Company / firm</span>
                  <input name="company" className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring" />
                </label>
                <label className="sm:col-span-2">
                  <span className="text-sm font-medium">How can we help?</span>
                  <textarea
                    required
                    minLength={5}
                    name="message"

                    rows={5}
                    placeholder="Which company, which document, and by when?"
                    className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
                  />
                </label>
              </div>
              {error ? (
                <p role="alert" className="mt-4 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" size="lg" className="mt-6" disabled={sending}>
                {sending ? "Sending…" : "Send message"}
              </Button>

            </form>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-6 shadow-panel">
            <h2 className="font-display text-lg font-semibold">Direct lines</h2>
            <ul className="mt-5 space-y-4 text-sm">
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 text-copper" />
                <span>
                  <span className="block font-medium">info@companieshousecyprus.com</span>
                  <span className="text-muted-foreground">Certificates and report orders</span>
                </span>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 text-copper" />
                <span>
                  <a href="tel:+35722398241" className="block font-medium hover:text-copper hover:underline">
                    +357 22 398241
                  </a>
                  <span className="text-muted-foreground">Mon–Fri, 09:00–17:30 EET</span>
                </span>
              </li>
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 text-copper" />
                <span>
                  <span className="block font-medium">Nicosia, Cyprus</span>
                  <span className="text-muted-foreground">Correspondence address on request</span>
                </span>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 size-4 text-copper" />
                <span>
                  <span className="block font-medium">Response within 1 business day</span>
                  <span className="text-muted-foreground">Urgent requests flagged same day</span>
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border bg-sand p-6">
            <h2 className="font-display text-base font-semibold">Looking for a company record?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The register is free to search — you may not need us at all.
            </p>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link to="/search" search={{ q: "", page: 1 }}>Search the register</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
